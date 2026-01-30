import React, { useEffect, useState, useRef, useMemo } from 'react';
import { sb } from './supabase';
import { generateDays, addScheduleSegment, getKyivDate, formatDur } from './utils';
import './index.css';

// IMPORT COMPONENTS
import { CalendarView } from './components/CalendarView';
import { AnalyticsView } from './components/AnalyticsView';
import { StatsOverview } from './components/StatsOverview';
import { DayCard } from './components/DayCard';

// SVG Icons
const IconList = () => <svg viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>;
const IconBolt = () => <svg viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>;

function App() {
  const [events, setEvents] = useState([]);
  const [attacks, setAttacks] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [view, setView] = useState('list'); 
  const [viewDate, setViewDate] = useState(getKyivDate());
  const [now, setNow] = useState(getKyivDate());
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null });
  const [expandedDay, setExpandedDay] = useState(null);
  const tipTimeoutRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: eventsData } = await sb.from('events').select('*').order('event_time', { ascending: true });
        if(eventsData) setEvents(eventsData.map(e => ({ ...e, date: new Date(e.event_time) })));

        const { data: attacksData } = await sb.from('attacks').select('*');
        if(attacksData) {
            setAttacks(attacksData.map(a => {
                const d = new Date(a.start_time);
                const dateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                return { date: dateKey, duration: a.duration_hours, desc: a.description };
            }));
        }

        const { data: schedData } = await sb.from('schedule').select('*');
        const schedMap = {};
        if (schedData) {
            schedData.forEach(item => {
                addScheduleSegment(schedMap, new Date(item.start_time), new Date(item.end_time), item.type);
            });
        }
        setSchedule(schedMap);
      } catch (e) { console.error(e); }
    };
    loadData();
    
    // Оновлення кожні 30 секунд для синхронізації трекера
    const interval = setInterval(() => setNow(getKyivDate()), 30000);
    return () => clearInterval(interval);
  }, []);

  const allDays = useMemo(() => generateDays(events, attacks, schedule), [events, attacks, schedule, now]); 
  const daysInMonth = allDays.filter(d => d.date.getMonth() === viewDate.getMonth() && d.date.getFullYear() === viewDate.getFullYear());

  // --- LOGIC FUNCTIONS ---
  const toggleView = (targetView) => setView(prev => prev === targetView ? 'list' : targetView);

  const handleToggleDay = (dayId) => setExpandedDay(prev => prev === dayId ? null : dayId);

  const handleTodayClick = () => {
      const today = getKyivDate();
      setViewDate(today);
      setView('list');
      setTimeout(() => {
          const todayEl = document.querySelector('.day-container.today');
          if (todayEl) {
              todayEl.scrollIntoView({behavior: 'smooth', block: 'center'});
              setExpandedDay(todayEl.id);
          }
      }, 100);
  };

  const showTip = (e, s, r, d, isSticky = false) => {
      e.stopPropagation(); 
      if (tipTimeoutRef.current) clearTimeout(tipTimeoutRef.current);
      
      const x = e.pageX; const y = e.pageY;
      const screenW = window.innerWidth;
      const isRight = x > screenW / 2;
      
      setTooltip({ 
          visible: true, 
          x: isRight ? 'auto' : (x + 10), 
          right: isRight ? (screenW - x + 10) : 'auto',
          y: y - 20,
          content: { title: s, range: r, desc: d }
      });

      tipTimeoutRef.current = setTimeout(() => setTooltip(p => ({...p, visible: false})), isSticky ? 3000 : 2500);
  };

  const hideTip = () => {
      if (tipTimeoutRef.current) clearTimeout(tipTimeoutRef.current);
      setTooltip(p => ({...p, visible: false}));
  };

  const handleDayClick = (date) => {
      const targetDate = new Date(date);
      setViewDate(targetDate);
      setView('list');
      setTimeout(() => {
          const el = document.getElementById(targetDate.toISOString());
          if(el) {
              el.scrollIntoView({behavior: 'smooth', block: 'center'});
              setExpandedDay(targetDate.toISOString());
          }
      }, 300);
  };

  // --- DRAWER & GESTURE LOGIC ---
  const drawerLeftRef = useRef(null);
  const drawerRightRef = useRef(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const isTracking = useRef(false);

  const handleTouchStart = (e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    isTracking.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isTracking.current) return;
    const diffX = e.touches[0].clientX - touchStart.current.x;
    const screenW = window.innerWidth;
    
    if (view === 'list') {
        if (diffX < 0 && drawerRightRef.current) { 
             drawerRightRef.current.style.transform = `translateX(${Math.max(0, 100 + (diffX / screenW * 100))}%)`;
             drawerRightRef.current.style.visibility = 'visible';
        }
        if (diffX > 0 && drawerLeftRef.current) { 
             drawerLeftRef.current.style.transform = `translateX(${Math.min(0, -100 + (diffX / screenW * 100))}%)`;
             drawerLeftRef.current.style.visibility = 'visible';
        }
    }
  };

  const handleTouchEnd = (e) => {
    isTracking.current = false;
    const diffX = e.changedTouches[0].clientX - touchStart.current.x;
    const threshold = window.innerWidth * 0.25;

    [drawerLeftRef, drawerRightRef].forEach(ref => {
        if(ref.current) {
            ref.current.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';
            ref.current.style.transform = '';
            ref.current.style.visibility = ''; 
        }
    });

    if (view === 'list') {
        if (diffX < -threshold) setView('calendar');
        if (diffX > threshold) setView('analytics');
    } else {
        if (Math.abs(diffX) > threshold) setView('list');
    }
  };

  const currentStatus = events[events.length - 1];
  const minsSinceLast = currentStatus ? Math.max(0, Math.floor((now - new Date(currentStatus.date)) / 60000)) : 0;

  return (
    <div className={`page ${view !== 'list' ? 'locked' : ''}`}
         onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
         onClick={() => tooltip.visible && hideTip()}>
        
        {/* TOOLTIP */}
        <div id="tooltip" className={tooltip.visible ? 'visible' : ''} style={{ top: tooltip.y, left: tooltip.x, right: tooltip.right }}>
             {tooltip.content && (
                 <>
                    {tooltip.content.title !== 'ГРАФІК' && <IconBolt />}
                    <div>
                        <strong>{tooltip.content.title}</strong><br/>
                        <span style={{opacity:0.8}}>{tooltip.content.range}</span><br/>
                        <span style={{fontSize:'10px', opacity:0.6}}>{tooltip.content.desc}</span>
                    </div>
                 </>
             )}
        </div>

        {/* HEADER */}
        <div className="sticky-container">
            <div className="glass-bar">
                <button className="btn-icon" onClick={() => toggleView('analytics')}><IconList /></button>
                <h1>Моніторинг</h1>
                <div className="view-switcher">
                    <button className={`view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>СПИСОК</button>
                    <button className={`view-btn ${view === 'calendar' ? 'active' : ''}`} onClick={() => toggleView('calendar')}>КАЛЕНДАР</button>
                    <button className="btn-today" onClick={handleTodayClick}>СЬОГОДНІ</button>
                </div>
            </div>
        </div>

        {/* LIST VIEW */}
        <div id="listView">
             <StatsOverview days={allDays} viewDate={viewDate} />

             <div className={`status-card ${currentStatus?.type === 'ON' ? 'good' : 'bad'}`}>
                <div className="status-header-text">{events.length ? (currentStatus.type === 'ON' ? 'СВІТЛО Є' : 'СВІТЛА НЕМАЄ') : 'ЗАВАНТАЖЕННЯ...'}</div>
                <div className="status-main-row">
                    <div className="status-icon-big" style={{color: currentStatus?.type === 'ON' ? 'var(--color-on)' : 'var(--color-off)'}}><IconBolt /></div>
                    <div className="status-time" style={{color: currentStatus?.type === 'ON' ? 'var(--color-on)' : 'var(--color-off)'}}>{formatDur(minsSinceLast)}</div>
                </div>
                <div className="status-label">ЗМІНА: {currentStatus && new Date(currentStatus.date).toLocaleTimeString()}</div>
             </div>

             <div id="daysListContainer">
                {daysInMonth.map(day => (
                    <DayCard 
                        key={day.date.toISOString()}
                        day={day}
                        isToday={day.date.toDateString() === now.toDateString()}
                        isExpanded={expandedDay === day.date.toISOString()}
                        now={now}
                        onToggle={handleToggleDay}
                        onShowTip={showTip}
                        onHideTip={hideTip}
                    />
                ))}
             </div>
        </div>

        {/* DRAWERS */}
        <div ref={drawerRightRef} className={`drawer drawer-right ${view === 'calendar' ? 'open' : ''}`}>
             <div style={{height: 80}}></div>
             <div className="month-nav">
                <button className="nav-btn" onClick={() => setViewDate(d => new Date(d.setMonth(d.getMonth()-1)))}>←</button>
                <div>{viewDate.toLocaleDateString('uk-UA', {month: 'long', year: 'numeric'}).toUpperCase()}</div>
                <button className="nav-btn" onClick={() => setViewDate(d => new Date(d.setMonth(d.getMonth()+1)))}>→</button>
             </div>
             <CalendarView days={daysInMonth} viewDate={viewDate} onDayClick={handleDayClick} />
        </div>

        <div ref={drawerLeftRef} className={`drawer drawer-left ${view === 'analytics' ? 'open' : ''}`}>
            <div style={{height: 90}}></div>
            <AnalyticsView days={allDays} onShowTip={showTip} />
        </div>
    </div>
  );
}

export default App;