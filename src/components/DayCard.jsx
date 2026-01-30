import React, { memo } from 'react';
import { formatDur } from '../utils';
import { TimelineBlock } from './TimelineBlock';

export const DayCard = memo(({ day, isToday, isExpanded, now, onToggle, onShowTip, onHideTip }) => {
    const dayId = day.date.toISOString();
    const weekDays = ["Нд","Пн","Вт","Ср","Чт","Пт","Сб"];
    const detailSegments = day.segments.filter(s => s.type !== 'FUTURE');

    return (
        <div id={dayId} 
             className={`day-container ${isToday ? 'today' : ''} ${isExpanded ? 'expanded' : ''}`} 
             onClick={() => onToggle(dayId)}
        >
            <div className="day-header">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="day-date">{day.date.getDate()}.{String(day.date.getMonth()+1).padStart(2,'0')}</span>
                    {isToday && <span className="today-badge">СЬОГОДНІ</span>}
                </div>
                <div className="day-name">
                    {weekDays[day.date.getDay()]} <span className="chevron">▼</span>
                </div>
            </div>

            {day.attack && (
                <div className="attack-badge">
                    <span>{day.attack.desc} ({day.attack.duration}г)</span>
                </div>
            )}

            <TimelineBlock 
                segments={day.segments}
                scheduleSegments={day.scheduleSegments}
                isToday={isToday}
                now={now}
                onShowTip={onShowTip}
                onHideTip={onHideTip}
            />

            <div className="day-stats-grid">
                <div className="stat-box">
                    <div className="stat-label">СВІТЛО БУЛО</div>
                    <div className="stat-value" style={{color:'var(--color-on)'}}>{formatDur(day.totalOn)}</div>
                </div>
                <div className="stat-box">
                    <div className="stat-label">СВІТЛА НЕМАЄ</div>
                    <div className="stat-value" style={{color:'var(--color-off)'}}>{formatDur(day.totalOff)}</div>
                </div>
            </div>

            <div className="day-details">
                {detailSegments.map((s, i) => (
                    <div key={i} className="detail-row" style={{background: s.type === 'ON' ? 'var(--color-row-on)' : 'var(--color-row-off)'}}>
                        <span>{s.range}</span><span>{s.dur}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});