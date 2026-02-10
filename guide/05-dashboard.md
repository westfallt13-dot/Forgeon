# Chapter 5 — Dashboard

This chapter rebuilds the `Dashboard` object from `script.js` as React components.

---

## 5.1 StatCard

> **File:** `src/components/dashboard/StatCard.jsx`

```jsx
import React from 'react';

/**
 * A single statistic card for the dashboard.
 * All props are destructured in the function signature.
 */
const StatCard = ({ icon, label, value, onClick, className = '' }) => (
  <div
    className={`stat-card ${className}`}
    onClick={onClick}
    style={onClick ? { cursor: 'pointer' } : undefined}
  >
    <img src={`/icons/${icon}.svg`} alt="" className="stat-icon" width="32" height="32" />
    <div className="stat-content">
      <h3 className="stat-label">{label}</h3>
      <p className="stat-value">{value}</p>
    </div>
  </div>
);

export default StatCard;
```

---

## 5.2 RecentTasks

> **File:** `src/components/dashboard/RecentTasks.jsx`

```jsx
import React from 'react';
import { useAppState } from '../../context/AppContext';
import { formatDate } from '../../utils/helpers';

const RecentTasks = () => {
  const { tasks } = useAppState(); // ← destructure tasks from state

  // Get the 5 most recently created tasks
  const recent = [...tasks]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <div className="overview-card">
      <h3>Recent Tasks</h3>
      <ul className="overview-list">
        {recent.length === 0 && <li>No tasks yet</li>}
        {recent.map(({ id, title, priority, dueDate }) => (
          <li key={id}>
            <span>{title}</span>
            <span className={`item-tag priority-${priority}`}>{priority}</span>
            {dueDate && <span className="item-tag">{formatDate(dueDate)}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentTasks;
```

---

## 5.3 UpcomingMilestones

> **File:** `src/components/dashboard/UpcomingMilestones.jsx`

```jsx
import React from 'react';
import { useAppState } from '../../context/AppContext';
import { formatDate } from '../../utils/helpers';

const UpcomingMilestones = () => {
  const { milestones } = useAppState();

  const upcoming = [...milestones]
    .filter(({ status }) => status !== 'complete')   // ← destructure in filter
    .sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate) : Infinity;
      const dateB = b.dueDate ? new Date(b.dueDate) : Infinity;
      return dateA - dateB;
    })
    .slice(0, 5);

  return (
    <div className="overview-card">
      <h3>Upcoming Milestones</h3>
      <ul className="overview-list">
        {upcoming.length === 0 && <li>No upcoming milestones</li>}
        {upcoming.map(({ id, name, dueDate, status }) => (
          <li key={id}>
            <span>{name}</span>
            {dueDate && <span className="item-tag">{formatDate(dueDate)}</span>}
            {status && <span className="item-tag">{status}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UpcomingMilestones;
```

---

## 5.4 ReminderCalendar

> **File:** `src/components/dashboard/ReminderCalendar.jsx`

```jsx
import React, { useState, useMemo } from 'react';
import { useAppState } from '../../context/AppContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ReminderCalendar = () => {
  const { notes } = useAppState();
  const [viewDate, setViewDate] = useState(new Date());

  const { year, month } = useMemo(() => ({   // ← destructure from useMemo
    year: viewDate.getFullYear(),
    month: viewDate.getMonth(),
  }), [viewDate]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  // Collect dates that have reminders
  const reminderDates = useMemo(() => {
    const dates = new Set();
    notes.forEach(({ reminder }) => {         // ← destructure in forEach
      if (reminder) {
        const d = new Date(reminder);
        if (d.getMonth() === month && d.getFullYear() === year) {
          dates.add(d.getDate());
        }
      }
    });
    return dates;
  }, [notes, month, year]);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const monthName = viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Build calendar grid cells
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} className="calendar-day empty" />);
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday =
      d === new Date().getDate() &&
      month === new Date().getMonth() &&
      year === new Date().getFullYear();
    const hasReminder = reminderDates.has(d);
    cells.push(
      <div
        key={d}
        className={`calendar-day ${isToday ? 'today' : ''} ${hasReminder ? 'has-reminder' : ''}`}
      >
        {d}
      </div>
    );
  }

  return (
    <div className="overview-card calendar-card">
      <div className="calendar-header">
        <h3>Reminder Calendar</h3>
        <div className="calendar-nav">
          <button className="btn-icon" onClick={prevMonth} title="Previous Month">
            <img src="/icons/actions/chevron-left.svg" alt="" width="16" height="16" />
          </button>
          <span>{monthName}</span>
          <button className="btn-icon" onClick={nextMonth} title="Next Month">
            <img src="/icons/actions/chevron-right.svg" alt="" width="16" height="16" />
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        {DAYS.map((day) => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}
        {cells}
      </div>
    </div>
  );
};

export default ReminderCalendar;
```

---

## 5.5 Dashboard (main)

> **File:** `src/components/dashboard/Dashboard.jsx`

```jsx
import React, { useMemo } from 'react';
import { useAppState, useAppDispatch, ACTIONS } from '../../context/AppContext';
import StatCard from './StatCard';
import RecentTasks from './RecentTasks';
import UpcomingMilestones from './UpcomingMilestones';
import ReminderCalendar from './ReminderCalendar';

const Dashboard = () => {
  const { tasks, assets, milestones, notes } = useAppState();
  const dispatch = useAppDispatch();

  // ← Destructure computed stats from useMemo
  const { activeTasks, totalAssets, totalMilestones, totalNotes, progress } = useMemo(() => {
    const completed = tasks.filter(({ completed }) => completed).length;
    return {
      activeTasks: tasks.filter(({ completed }) => !completed).length,
      totalAssets: assets.length,
      totalMilestones: milestones.length,
      totalNotes: notes.length,
      progress: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
    };
  }, [tasks, assets, milestones, notes]);

  // Reminder counts
  const { overdue, today, thisWeek } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    let overdue = 0, today = 0, thisWeek = 0;

    notes.forEach(({ reminder }) => {
      if (!reminder) return;
      const d = new Date(reminder);
      if (d < todayStart) overdue++;
      else if (d < new Date(todayStart.getTime() + 86400000)) today++;
      else if (d < weekEnd) thisWeek++;
    });

    return { overdue, today, thisWeek };
  }, [notes]);

  return (
    <section className="content-section active">
      <header className="section-header">
        <h2>Dashboard</h2>
        <p className="section-description">Overview of your game development project</p>
      </header>

      <div className="dashboard-grid">
        <StatCard icon="navigation/tasks" label="Active Tasks" value={activeTasks} />
        <StatCard icon="navigation/assets" label="Total Assets" value={totalAssets} />
        <StatCard icon="navigation/milestones" label="Milestones" value={totalMilestones} />
        <StatCard icon="navigation/notes" label="Notes" value={totalNotes} />
        <StatCard
          icon="misc/clock"
          label="Upcoming Reminders"
          className="reminder-widget"
          onClick={() => dispatch({ type: ACTIONS.SET_SECTION, payload: 'notes' })}
          value={
            <div className="reminder-widget-stats">
              <span className="reminder-stat overdue"><strong>{overdue}</strong> Overdue</span>
              <span className="reminder-stat today"><strong>{today}</strong> Today</span>
              <span className="reminder-stat week"><strong>{thisWeek}</strong> This Week</span>
            </div>
          }
        />
        <StatCard icon="misc/progress" label="Progress" value={`${progress}%`} />
      </div>

      <div className="dashboard-overview">
        <RecentTasks />
        <UpcomingMilestones />
        <ReminderCalendar />
      </div>
    </section>
  );
};

export default Dashboard;
```

---

## 5.6 Files Created

| File | Replaces |
|------|----------|
| `src/components/dashboard/Dashboard.jsx` | `Dashboard` object |
| `src/components/dashboard/StatCard.jsx` | Stat card HTML in `Dashboard.refresh()` |
| `src/components/dashboard/RecentTasks.jsx` | Recent tasks widget |
| `src/components/dashboard/UpcomingMilestones.jsx` | Milestones widget |
| `src/components/dashboard/ReminderCalendar.jsx` | Calendar widget |

---

**Next:** [Chapter 6 — Tasks](./06-tasks.md)
