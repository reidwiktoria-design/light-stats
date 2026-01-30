import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function TrendChart({ days }) {
    // 1. Підготовка даних: беремо останні 30 днів і розвертаємо у хронологічному порядку
    const data = days
        .filter(d => d.hasData)
        .slice(0, 30)
        .reverse()
        .map(d => ({
            date: `${d.date.getDate()}.${String(d.date.getMonth()+1).padStart(2,'0')}`,
            hours: parseFloat((d.totalOff / 60).toFixed(1)), // Переводимо хвилини в години
            fullDate: d.date.toLocaleDateString()
        }));

    if (data.length < 2) return null;

    // Кастомний тултіп, щоб виглядало в нашому стилі
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace'
                }}>
                    <div style={{fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4}}>{payload[0].payload.fullDate}</div>
                    <div style={{color: 'var(--color-off)', fontWeight: 800}}>
                        {payload[0].value} год
                    </div>
                    <div style={{fontSize: 9, opacity: 0.6}}>без світла</div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="chart-container">
            <div className="chart-header">ДИНАМІКА (30 ДНІВ)</div>
            <div style={{ width: '100%', height: 200, fontSize: 10, marginLeft: -20 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorOff" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-off)" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="var(--color-off)" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                        <XAxis 
                            dataKey="date" 
                            tick={{fill: 'var(--text-muted)'}} 
                            axisLine={false}
                            tickLine={false}
                            interval="preserveStartEnd"
                            minTickGap={30}
                        />
                        <YAxis 
                            tick={{fill: 'var(--text-muted)'}} 
                            axisLine={false}
                            tickLine={false}
                            unit="г"
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Area 
                            type="monotone" 
                            dataKey="hours" 
                            stroke="var(--color-off)" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorOff)" 
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}