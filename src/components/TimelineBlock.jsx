import React, { memo } from 'react';

export const TimelineBlock = memo(({ segments, scheduleSegments, isToday, now, onShowTip, onHideTip }) => {
    const nowPercent = isToday ? (now.getHours() * 60 + now.getMinutes()) / 14.4 : 0;

    return (
        <div className="timeline-block">
            {/* Основний трек (Факт) */}
            <div className="timeline-track">
                {isToday && (
                    <div className="now-marker" style={{ left: `${nowPercent}%` }}></div>
                )}
                
                {segments.map((s, i) => (
                    <div key={i} 
                         className={`segment ${s.type.toLowerCase()} ${s.type === 'FUTURE' ? 'future' : ''}`} 
                         style={{ width: `${s.width}%` }}
                         onMouseEnter={(e) => s.type !== 'FUTURE' && onShowTip(e, s.status, s.range, s.dur)}
                         onMouseLeave={onHideTip}
                         onClick={(e) => s.type !== 'FUTURE' && onShowTip(e, s.status, s.range, s.dur, true)}
                    ></div>
                ))}
            </div>

            {/* Трек графіка (Лінії знизу) */}
            <div className="schedule-track">
                {scheduleSegments.map((s, i) => (
                    <div key={i} 
                         className={`sched-seg ${s.type === 'black' ? 'sched-red' : 'sched-green'}`}
                         style={{ left: `${s.left}%`, width: `${s.width}%` }}
                         onMouseEnter={(e) => onShowTip(e, 'ГРАФІК', `${s.startStr} - ${s.endStr}`, s.type === 'black' ? 'Відключення' : 'Можливе світло')}
                         onMouseLeave={onHideTip}
                         onClick={(e) => onShowTip(e, 'ГРАФІК', `${s.startStr} - ${s.endStr}`, s.type === 'black' ? 'Відключення' : 'Можливе світло', true)}
                    ></div>
                ))}
            </div>
        </div>
    );
});