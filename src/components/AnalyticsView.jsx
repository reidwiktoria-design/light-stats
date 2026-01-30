import React, { useMemo } from 'react';
import { TrendChart } from './TrendChart';

export function AnalyticsView({ days, onShowTip }) {
    const validDays = days.filter(d => d.hasData).slice(0, 7);

    // --- 1. REAL FEEL CALC ---
    const realFeelScore = useMemo(() => {
        let avgIndex = 0;
        let totalW = 0;
        validDays.forEach(d => {
            const w = d.potentialWeight; 
            avgIndex += d.qualityIndex * w;
            totalW += w;
        });
        return totalW > 0 ? (avgIndex / totalW) * 100 : 0;
    }, [validDays]);

    let scoreColor = 'var(--color-neutral)';
    if(realFeelScore > 50) scoreColor = 'var(--color-on)';
    if(realFeelScore < 30) scoreColor = 'var(--color-off)';

    // --- 2. HEATMAP CALC ---
    const heatmapData = useMemo(() => {
        const hourlyCounts = new Array(24).fill(0);
        if (!validDays.length) return hourlyCounts;
        
        validDays.forEach(day => {
            day.segments.forEach(seg => {
                if (seg.type !== 'ON') return;
                const [h1, m1] = seg.range.split(' - ')[0].split(':').map(Number);
                const [h2, m2] = seg.range.split(' - ')[1].split(':').map(Number);
                let sMin = h1*60 + m1;
                let eMin = h2*60 + m2;
                if (eMin < sMin) eMin = 1440; 
                
                for (let m = sMin; m < eMin; m++) {
                    const h = Math.floor(m / 60);
                    if (h >= 0 && h < 24) hourlyCounts[h]++; 
                }
            });
        });
        return hourlyCounts.map(count => {
            const totalPossible = validDays.length * 60;
            return totalPossible > 0 ? Math.round((count / totalPossible) * 100) : 0;
        });
    }, [validDays]);

    // --- 3. STABILITY BUCKETS ---
    const buckets = useMemo(() => {
        const b = { short: 0, medium: 0, long: 0 };
        validDays.forEach(d => {
            d.segments.forEach(s => {
                if(s.type === 'ON') {
                    const mins = Math.round(s.width * 14.4);
                    if (mins < 60) b.short++;
                    else if (mins < 240) b.medium++;
                    else b.long++;
                }
            });
        });
        return b;
    }, [validDays]);
    
    const maxVal = Math.max(buckets.short, buckets.medium, buckets.long, 1);
    const getH = (val) => (val / maxVal) * 100;

    // Helper for interactions
    const handleInteract = (e, title, range, desc) => {
        onShowTip(e, title, range, desc, true);
    };

    // --- RENDER ---
    return (
        <div style={{paddingBottom: 40}}>
            
            {/* 1. REAL FEEL BLOCK */}
            <div className="chart-container">
                <div className="chart-header">REAL FEEL (ОСТАННІ 7 ДНІВ)</div>
                <div style={{display: 'flex', gap: 15, alignItems: 'center'}}>
                    <div>
                        <div style={{fontSize:36, fontWeight:800, color: scoreColor}}>{realFeelScore.toFixed(0)}%</div>
                        <div style={{fontSize:10, color:'var(--text-muted)', fontWeight:700}}>ЯКІСТЬ ЖИТТЯ</div>
                    </div>
                    <div style={{height:30, width:1, background:'var(--border-subtle)'}}></div>
                    <div style={{flex:1}}>
                         <div style={{fontSize:10, marginBottom:4, color:'var(--text-muted)'}}>ОЦІНКА ВРАХОВУЄ:</div>
                         <div style={{display:'flex', flexWrap:'wrap', gap:4}}>
                            {['Фрагментацію', 'Час доби', 'Стабільність'].map(t => (
                                <span key={t} style={{fontSize:9, background:'var(--bg-body)', padding:'3px 6px', borderRadius:4}}>{t}</span>
                            ))}
                         </div>
                    </div>
                </div>
            </div>

            {/* 2. TREND CHART (NEW) */}
            <TrendChart days={days} />

            {/* 3. HEATMAP BLOCK */}
            <div className="chart-container">
                <div className="chart-header">ЦИКЛ СВІТЛА (HEATMAP)</div>
                <div style={{fontSize:10, color:'var(--text-muted)', marginBottom:10}}>Ймовірність наявності світла в конкретну годину:</div>
                <div id="heatmap" style={{display:'flex', alignItems:'flex-end', height:60, gap:2, paddingTop:10}}>
                    {heatmapData.map((pct, h) => {
                        let bg = 'var(--color-future)';
                        if (pct > 0) bg = `rgba(37, 78, 219, ${0.2 + (pct/100) * 0.8})`;
                        const label = `${h}:00 - ${h+1}:00`;
                        const desc = `Ймовірність: ${pct}%`;
                        return (
                            <div key={h} 
                                 style={{flex:1, background:bg, height:`${Math.max(4, pct)}%`, borderRadius:2, position:'relative'}}
                                 onMouseEnter={(e) => handleInteract(e, label, desc, 'Середнє за 7 днів')}
                                 onClick={(e) => handleInteract(e, label, desc, 'Середнє за 7 днів')}
                            ></div>
                        );
                    })}
                </div>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:9, color:'var(--text-muted)', marginTop:4, fontFamily:'JetBrains Mono'}}>
                    <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
                </div>
            </div>

            {/* 4. STABILITY BLOCK */}
            <div className="chart-container">
                <div className="chart-header">СТРУКТУРА ВКЛЮЧЕНЬ</div>
                <div style={{fontSize:11, color:'var(--text-muted)', marginBottom:10}}>Розподіл за тривалістю (короткі / середні / довгі):</div>
                <div className="bar-chart">
                    {[
                        { k: 'short', val: buckets.short, label: 'Короткі', sub: '< 1г', col: 'var(--color-off)', desc: 'Нестабільно' },
                        { k: 'medium', val: buckets.medium, label: 'Середні', sub: '1-4г', col: 'var(--accent)', desc: 'Норма' },
                        { k: 'long', val: buckets.long, label: 'Довгі', sub: '> 4г', col: 'var(--color-on)', desc: 'Чудово' }
                    ].map(b => (
                        <div key={b.k} className="bar-col"
                             onMouseEnter={(e) => handleInteract(e, b.label.toUpperCase(), b.sub, b.desc)}
                             onClick={(e) => handleInteract(e, b.label.toUpperCase(), b.sub, b.desc)}
                        >
                            <div className="bar-track"><div className="bar-fill" style={{height:`${getH(b.val)}%`, background: b.col}}></div></div>
                            <div className="bar-val">{b.val}</div>
                            <div className="bar-label">{b.label}<br/>{b.sub}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}