// --- HELPER MATH FUNCTIONS (Logic preserved from original) ---

export const getKyivDate = () => new Date();

export const formatDur = (m) => m < 60 ? `${m}хв` : `${Math.floor(m/60)}г ${m%60}хв`;

export function getWeightedDuration(startMs, endMs) {
    let weight = 0;
    let currentH = new Date(startMs);
    currentH.setMinutes(0,0,0);
    while(currentH.getTime() < endMs) {
        const h = currentH.getHours();
        const nextHTime = currentH.getTime() + 3600000;
        const segStart = Math.max(startMs, currentH.getTime());
        const segEnd = Math.min(endMs, nextHTime);
        if (segEnd > segStart) {
            const dur = (segEnd - segStart) / 60000;
            const w = (h >= 8 && h < 23) ? 1.0 : 0.3;
            weight += dur * w;
        }
        currentH.setTime(nextHTime);
    }
    return weight;
}

export function addScheduleSegment(db, start, end, type) {
    let current = new Date(start);
    while (current < end) {
        let nextMidnight = new Date(current); 
        nextMidnight.setHours(24, 0, 0, 0);
        let segEnd = new Date(Math.min(end, nextMidnight));
        
        let y = current.getFullYear();
        let m = String(current.getMonth()+1).padStart(2,'0');
        let d = String(current.getDate()).padStart(2,'0');
        let dateKey = `${y}-${m}-${d}`;
        
        let sTime = `${String(current.getHours()).padStart(2,'0')}:${String(current.getMinutes()).padStart(2,'0')}`;
        let eTime = (segEnd.getTime() === nextMidnight.getTime()) ? "24:00" : 
                    `${String(segEnd.getHours()).padStart(2,'0')}:${String(segEnd.getMinutes()).padStart(2,'0')}`;
        
        if (!db[dateKey]) db[dateKey] = [];
        const exists = db[dateKey].some(s => s.start === sTime && s.end === eTime);
        if (!exists) { db[dateKey].push({ start: sTime, end: eTime, type: type }); }
        current = nextMidnight;
    }
}

// Main processing function
export function generateDays(events, attacks, schedule) {
    if (!events.length) return [];
    const days = {};
    const now = getKyivDate();
    let pointerDate = new Date(events[0].date);
    pointerDate.setHours(0,0,0,0);
    let currentState = events[0].type === 'OFF' ? 'ON' : 'OFF'; 
    let eventIdx = 0;
    const endLimit = new Date(); endLimit.setHours(23,59,59);
    let firstLogTime = new Date(events[0].date).getTime();
    let previousStateEnding = null; 

    while (pointerDate <= endLimit) {
        const y = pointerDate.getFullYear();
        const m = String(pointerDate.getMonth()+1).padStart(2,'0');
        const dStr = String(pointerDate.getDate()).padStart(2,'0');
        const k = `${y}-${m}-${dStr}`;
        const dStart = new Date(pointerDate);
        const dEnd = new Date(pointerDate); dEnd.setHours(23,59,59);
        const attackData = attacks.find(a => a.date === k);
        const daySchedule = schedule[k] || [];

        days[k] = { 
            date: dStart, segments: [], scheduleSegments: [],
            totalOn: 0, totalOff: 0, 
            effectiveMinutes: 0, potentialWeight: 0, 
            qualityIndex: 0, 
            attack: attackData, hasData: false, outageCount: 0, maxOn: 0,
            matchMinutes: 0, schedMinutesTotal: 0
        };

        if (daySchedule.length) {
            daySchedule.forEach(slot => {
                    const [sh, sm] = slot.start.split(':').map(Number);
                    const [eh, em] = slot.end.split(':').map(Number);
                    let ehFix = (slot.end === "24:00") ? 24 : eh;
                    const startMins = sh*60 + sm;
                    const endMins = ehFix*60 + em;
                    const width = (endMins - startMins) / 14.4;
                    const left = startMins / 14.4;
                    days[k].scheduleSegments.push({ left, width, type: slot.type, startStr: slot.start, endStr: slot.end });
            });
        }

        let pTime = dStart.getTime();
        let potentialStart = (dStart.getTime() < firstLogTime) ? firstLogTime : dStart.getTime();
        let potentialEnd = (dStart.toDateString() === now.toDateString()) ? now.getTime() : dEnd.getTime();
        let isContinuingOutage = (previousStateEnding === 'OFF' && currentState === 'OFF');

        if (dEnd.getTime() >= new Date(events[0].date).getTime()) {
            days[k].hasData = true;
            days[k].potentialWeight = getWeightedDuration(potentialStart, potentialEnd);

            while (eventIdx < events.length && new Date(events[eventIdx].date) <= dEnd) {
                const ev = events[eventIdx];
                const evDate = new Date(ev.date);
                if (currentState === 'ON' && ev.type === 'OFF' && evDate.getTime() >= dStart.getTime()) {
                    days[k].outageCount++;
                }
                if (evDate.getTime() > pTime) {
                    addSeg(days[k], pTime, evDate.getTime(), currentState, now);
                }
                currentState = ev.type;
                pTime = evDate.getTime();
                eventIdx++;
            }

            if (days[k].segments.length > 0 && days[k].segments[0].type === 'OFF' && !isContinuingOutage) {
                    if (!previousStateEnding) days[k].outageCount++; 
            }

            const isToday = dStart.toDateString() === now.toDateString();
            if (isToday) {
                if (now.getTime() > pTime) addSeg(days[k], pTime, now.getTime(), currentState, now);
                addSeg(days[k], now.getTime(), dEnd.getTime(), 'FUTURE', now);
            } else {
                addSeg(days[k], pTime, dEnd.getTime(), currentState, now);
            }

            previousStateEnding = currentState; 
            let rawIndex = (days[k].potentialWeight > 0) ? (days[k].effectiveMinutes / days[k].potentialWeight) : 0;
            let penalty = Math.min(days[k].outageCount * 0.06, 0.45); 
            days[k].qualityIndex = rawIndex * (1 - penalty);
            
            // Logic for schedule matching (removed for brevity but assumed present in full copy)
            if (daySchedule.length > 0) {
                const TOLERANCE_MINS = 10; 
                days[k].segments.forEach(seg => {
                    if (seg.type === 'FUTURE') return;
                    const rangeParts = seg.range.split(' - ');
                    if(rangeParts.length < 2) return;
                    const [h1, m1] = rangeParts[0].split(':').map(Number);
                    const [h2, m2] = rangeParts[1].split(':').map(Number);
                    const sMin = h1*60 + m1;
                    const eMin = (h2*60 + m2) || 1440; 
                    
                    for (let m = sMin; m < eMin; m++) {
                        days[k].schedMinutesTotal++;
                        let isSchedOff = false;
                        for (let slot of daySchedule) {
                            const [sh, sm] = slot.start.split(':').map(Number);
                            const [eh, em] = slot.end.split(':').map(Number);
                            const slotS = sh*60 + sm;
                            const slotE = (eh === 0 && em === 0) ? 1440 : (eh*60 + em);
                            if (m >= slotS && m < slotE && slot.type === 'black') { isSchedOff = true; break; }
                        }
                        const actualOff = (seg.type === 'OFF');
                        
                        if (isSchedOff && actualOff) { days[k].matchMinutes++; } 
                        else if (isSchedOff && !actualOff) { } 
                        else if (!isSchedOff && !actualOff) { days[k].matchMinutes++; } 
                        else if (!isSchedOff && actualOff) {
                            let nearestDiff = 9999;
                            for (let slot of daySchedule) {
                                if (slot.type !== 'black') continue;
                                const [sh, sm] = slot.start.split(':').map(Number);
                                const [eh, em] = slot.end.split(':').map(Number);
                                const slotS = sh*60 + sm;
                                const slotE = (eh === 0 && em === 0) ? 1440 : (eh*60 + em);
                                nearestDiff = Math.min(nearestDiff, Math.abs(m - slotS), Math.abs(m - slotE));
                            }
                            if (nearestDiff <= TOLERANCE_MINS) days[k].matchMinutes++;
                        }
                    }
                });
            }

        } else {
                previousStateEnding = currentState; 
        }
        pointerDate.setDate(pointerDate.getDate() + 1);
    }
    return Object.values(days).reverse();
}

function addSeg(day, start, end, type, now) {
    const diffMs = end - start;
    const mins = Math.floor(diffMs / 60000);
    if (mins <= 0) return;
    const isCurrent = (Math.abs(end - now.getTime()) < 60000) && type !== 'FUTURE';
    let statusText = '';
    if (type === 'ON') statusText = isCurrent ? 'СВІТЛО Є' : 'СВІТЛО БУЛО';
    else if (type === 'OFF') statusText = isCurrent ? 'СВІТЛА НЕМАЄ' : 'СВІТЛА НЕ БУЛО';
    else statusText = 'МАЙБУТНЄ';

    if (type === 'ON') { 
        day.totalOn += mins; 
        if (mins > day.maxOn) day.maxOn = mins; 
        day.effectiveMinutes += getWeightedDuration(start, end);
    }
    if (type === 'OFF') { day.totalOff += mins; } 

    day.segments.push({
        type, width: mins / 14.4,
        range: `${new Date(start).getHours()}:${String(new Date(start).getMinutes()).padStart(2,'0')} - ${new Date(end).getHours()}:${String(new Date(end).getMinutes()).padStart(2,'0')}`,
        dur: formatDur(mins),
        status: statusText
    });
}