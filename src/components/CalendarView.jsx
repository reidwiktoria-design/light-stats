import React from 'react';
import { getKyivDate } from '../utils';

export function CalendarView({ days, viewDate, onDayClick }) {
    const now = getKyivDate();
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const last = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    
    // Розрахунок порожніх клітинок на початку місяця
    let offset = first.getDay(); 
    if (offset === 0) offset = 7; 
    offset--;

    const daysArray = [];
    // Порожні дні
    for (let i = 0; i < offset; i++) {
        daysArray.push({ type: 'empty', key: `empty-${i}` });
    }
    // Реальні дні
    for (let i = 1; i <= last.getDate(); i++) {
        const dateKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth()+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        const dayData = days.find(d => d.date.getDate() === i);
        daysArray.push({ type: 'day', val: i, data: dayData, key: `day-${i}` });
    }

    // SVG шлях для кілець
    const trackPath = 'd="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"';
    const warnSvg = <svg style={{width:'10px',height:'10px',fill:'var(--color-off)'}} viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>;

    return (
        <div id="calendarGrid">
            {["ПН","ВТ","СР","ЧТ","ПТ","СБ","НД"].map(d => (
                <div key={d} className="cal-weekday">{d}</div>
            ))}

            {daysArray.map(item => {
                if (item.type === 'empty') return <div key={item.key} className="cal-day empty"></div>;

                const { val, data } = item;
                const hasData = data && data.hasData;
                const isToday = (now.getDate() === val && now.getMonth() === viewDate.getMonth());
                
                // Логіка кілець
                let svgContent = null;
                if (hasData) {
                    const total = 1440;
                    let pctOn = (data.totalOn / total) * 100;
                    let pctOff = (data.totalOff / total) * 100;
                    
                    if (pctOn + pctOff > 100) {
                        const scale = 100 / (pctOn + pctOff);
                        pctOn *= scale; pctOff *= scale;
                    }
                    
                    const dashOn = `${pctOn} 100`;
                    const dashOff = `${pctOff} 100`;
                    const offsetOff = -pctOn;

                    svgContent = (
                        <svg className="ring-container" viewBox="0 0 36 36">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                  fill="none" stroke="var(--border-subtle)" strokeWidth="4" opacity="0.5" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                  fill="none" stroke="var(--color-on)" strokeWidth="4" strokeDasharray={dashOn} strokeLinecap="round" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                  fill="none" stroke="var(--color-off)" strokeWidth="4" strokeDasharray={dashOff} strokeDashoffset={offsetOff} strokeLinecap="round" />
                        </svg>
                    );
                } else {
                    svgContent = (
                        <svg className="ring-container" viewBox="0 0 36 36">
                             <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                   fill="none" stroke="var(--border-subtle)" strokeWidth="4" opacity="0.3" />
                        </svg>
                    );
                }

                return (
                    <div key={item.key} 
                         className={`cal-day ${!hasData ? 'empty-data' : ''} ${isToday ? 'cal-today' : ''}`}
                         onClick={() => hasData && onDayClick(data.date)}>
                        {svgContent}
                        <div className="cal-inner">{val}</div>
                        {data?.attack && <div className="cal-attack-dot">{warnSvg}</div>}
                    </div>
                );
            })}
        </div>
    );
}