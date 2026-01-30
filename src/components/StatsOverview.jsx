import React from 'react';
import { formatDur } from '../utils';

export function StatsOverview({ days, viewDate }) {
    const now = new Date();
    // Логіка фільтрації "завершених днів" для порівняння
    const completedDays = days.filter(d => d.hasData && d.date.toDateString() !== now.toDateString() && d.segments.every(s => s.type !== 'FUTURE'));
    
    if (completedDays.length < 2) return null;

    const currentPeriod = completedDays.slice(0, 7);
    const prevPeriod = completedDays.slice(7, 14);

    const calcW = (p) => {
        let s = 0, w = 0;
        p.forEach(d => { s += d.qualityIndex * d.potentialWeight; w += d.potentialWeight; });
        return w > 0 ? s/w : 0;
    };
    
    const wNow = calcW(currentPeriod);
    const wPrev = calcW(prevPeriod);
    let trend = wPrev ? ((wNow - wPrev) / wPrev) * 100 : 0;
    let trendText = 'СТАБІЛЬНО';
    let trendClass = 'trend-neutral'; // Стиль треба додати або використати inline
    if (Math.abs(trend) >= 5) {
        trendText = trend > 0 ? 'КРАЩЕ' : 'ГІРШЕ';
        trendClass = trend > 0 ? 'good' : 'bad';
    }

    // Точність
    const daysWithSched = days.filter(d => d.hasData && d.schedMinutesTotal > 0).slice(0, 7);
    let accuracy = 0;
    if (daysWithSched.length) {
        let m = 0, t = 0;
        daysWithSched.forEach(d => { m += d.matchMinutes; t += d.schedMinutesTotal; });
        accuracy = t > 0 ? (m/t)*100 : 0;
    }

    // Best/Worst Month logic
    const monthDays = days.filter(d => d.date.getMonth() === viewDate.getMonth());
    const best = monthDays.reduce((p,c) => (c.totalOn > (p?.totalOn||0)) ? c : p, null);
    const worst = monthDays.reduce((p,c) => (c.totalOff > (p?.totalOff||0) && c.hasData) ? c : p, null);

    return (
        <div className="stats-overview">
             <div className="stat-card-mini full-width">
                 <div className="stat-split">
                     <div className="scm-label">ДИНАМІКА (7 ДНІВ)</div>
                     <div className="scm-value" style={{color: trendClass === 'good' ? 'var(--color-on)' : (trendClass === 'bad' ? 'var(--color-off)' : 'inherit')}}>
                         {trendText} {Math.abs(trend) >= 5 && `${Math.abs(trend).toFixed(1)}%`}
                     </div>
                     <div className="scm-sub">індекс якості</div>
                 </div>
                 <div className="stat-split">
                     <div className="scm-label">ТОЧНІСТЬ ГРАФІКА</div>
                     <div className="scm-value" style={{color: accuracy > 80 ? 'var(--color-on)' : 'var(--color-off)'}}>{accuracy.toFixed(0)}%</div>
                     <div className="scm-sub">строгий (10хв)</div>
                 </div>
             </div>
             {best && (
                 <div className="stat-card-mini">
                     <div className="scm-label">НАЙКРАЩИЙ</div>
                     <div className="scm-value" style={{color:'var(--color-on)'}}>{formatDur(best.totalOn)}</div>
                     <div className="scm-sub">{best.date.getDate()}.{String(best.date.getMonth()+1).padStart(2,'0')}</div>
                 </div>
             )}
             {worst && (
                 <div className="stat-card-mini">
                     <div className="scm-label">НАЙГІРШИЙ</div>
                     <div className="scm-value" style={{color:'var(--color-off)'}}>{formatDur(worst.totalOff)}</div>
                     <div className="scm-sub">{worst.date.getDate()}.{String(worst.date.getMonth()+1).padStart(2,'0')}</div>
                 </div>
             )}
        </div>
    );
}