import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDate, isDateBeforeToday } from '../../utils/helpers';
import './Dashboard.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function padTwo(n) {
  return String(n).padStart(2, '0');
}

function toDateKey(dateString) {
  if (!dateString) return null;
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString;
  }
  const dt = new Date(dateString);
  if (isNaN(dt)) return null;
  return `${dt.getFullYear()}-${padTwo(dt.getMonth() + 1)}-${padTwo(dt.getDate())}`;
}

function parseDateKey(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export default function Dashboard() {
  const {
    tasks,
    assets,
    milestones,
    notes,
    classes,
    mechanics,
    setSection,
  } = useApp();

  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);

  // ── Statistics ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.completed).length;
    const overdueTasks = tasks.filter(
      (t) => !t.completed && t.dueDate && isDateBeforeToday(t.dueDate),
    ).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const tasksCompletedThisWeek = tasks.filter(
      (t) => t.completed && new Date(t.createdAt) >= sevenDaysAgo,
    ).length;

    const activeNotes = Array.isArray(notes) ? notes.filter((n) => !n.archived).length : 0;

    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      totalAssets: assets.length,
      totalMilestones: milestones.length,
      totalNotes: activeNotes,
      totalClasses: classes.length,
      totalMechanics: mechanics.length,
      completionRate,
      tasksCompletedThisWeek,
    };
  }, [tasks, assets, milestones, notes, classes, mechanics]);

  // ── Calendar data ──────────────────────────────────────────────────────────
  const calendarData = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const todayStr = `${now.getFullYear()}-${padTwo(now.getMonth() + 1)}-${padTwo(now.getDate())}`;

    // Collect reminders by date
    const remindersByDate = {};
    if (Array.isArray(notes)) {
      notes.forEach((note) => {
        if (!note.reminderEnabled || !note.reminderDate || note.archived) return;
        const [year, month] = note.reminderDate.split('-').map(Number);
        if (year === calendarYear && month - 1 === calendarMonth) {
          const key = note.reminderDate;
          if (!remindersByDate[key]) remindersByDate[key] = [];
          remindersByDate[key].push(note);
        }
      });
    }

    // Collect tasks by date
    const tasksByDate = {};
    tasks.forEach((task) => {
      if (!task.dueDate || task.completed) return;
      const key = toDateKey(task.dueDate);
      if (!key) return;
      const [y, m] = key.split('-').map(Number);
      if (y === calendarYear && m - 1 === calendarMonth) {
        if (!tasksByDate[key]) tasksByDate[key] = [];
        tasksByDate[key].push(task);
      }
    });

    // Collect milestones by date
    const milestonesByDate = {};
    milestones.forEach((ms) => {
      if (!ms.dueDate || ms.completed) return;
      const key = toDateKey(ms.dueDate);
      if (!key) return;
      const [y, m] = key.split('-').map(Number);
      if (y === calendarYear && m - 1 === calendarMonth) {
        if (!milestonesByDate[key]) milestonesByDate[key] = [];
        milestonesByDate[key].push(ms);
      }
    });

    return {
      startingDayOfWeek,
      daysInMonth,
      todayStr,
      remindersByDate,
      tasksByDate,
      milestonesByDate,
    };
  }, [calendarYear, calendarMonth, notes, tasks, milestones, now]);

  // ── Calendar navigation ────────────────────────────────────────────────────
  const goToPrevMonth = useCallback(() => {
    setCalendarMonth((m) => {
      if (m === 0) {
        setCalendarYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
    setSelectedDate(null);
  }, []);

  const goToNextMonth = useCallback(() => {
    setCalendarMonth((m) => {
      if (m === 11) {
        setCalendarYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
    setSelectedDate(null);
  }, []);

  // ── Day detail panel ───────────────────────────────────────────────────────
  const selectedDayItems = useMemo(() => {
    if (!selectedDate) return null;
    const reminders = calendarData.remindersByDate[selectedDate] || [];
    const dayTasks = calendarData.tasksByDate[selectedDate] || [];
    const dayMilestones = calendarData.milestonesByDate[selectedDate] || [];

    if (reminders.length === 0 && dayTasks.length === 0 && dayMilestones.length === 0) {
      return null;
    }

    const date = parseDateKey(selectedDate);
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return { reminders, dayTasks, dayMilestones, formattedDate };
  }, [selectedDate, calendarData]);

  // ── Recent tasks ───────────────────────────────────────────────────────────
  const recentTasks = useMemo(
    () =>
      [...tasks]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5),
    [tasks],
  );

  // ── Upcoming milestones ────────────────────────────────────────────────────
  const upcomingMilestones = useMemo(
    () =>
      milestones
        .filter((m) => (m.progress ?? 0) < 100)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5),
    [milestones],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  const {
    startingDayOfWeek,
    daysInMonth,
    todayStr,
    remindersByDate,
    tasksByDate,
    milestonesByDate,
  } = calendarData;

  return (
    <div className="dashboard">
      {/* ── Statistics Overview Cards ──────────────────────────────────────── */}
      <div className="dashboard-stats-grid">
        <button
          type="button"
          className="stat-card dashboard-stat-card"
          onClick={() => setSection('tasks')}
        >
          <span className="dashboard-stat-label">Total Tasks</span>
          <span className="dashboard-stat-value">{stats.totalTasks}</span>
        </button>

        <button
          type="button"
          className="stat-card dashboard-stat-card"
          onClick={() => setSection('tasks')}
        >
          <span className="dashboard-stat-label">Completed</span>
          <span className="dashboard-stat-value success">{stats.completedTasks}</span>
        </button>

        <button
          type="button"
          className="stat-card dashboard-stat-card"
          onClick={() => setSection('tasks')}
        >
          <span className="dashboard-stat-label">Overdue</span>
          <span className="dashboard-stat-value danger">{stats.overdueTasks}</span>
        </button>

        <button
          type="button"
          className="stat-card dashboard-stat-card"
          onClick={() => setSection('assets')}
        >
          <span className="dashboard-stat-label">Assets</span>
          <span className="dashboard-stat-value">{stats.totalAssets}</span>
        </button>

        <button
          type="button"
          className="stat-card dashboard-stat-card"
          onClick={() => setSection('milestones')}
        >
          <span className="dashboard-stat-label">Milestones</span>
          <span className="dashboard-stat-value">{stats.totalMilestones}</span>
        </button>

        <button
          type="button"
          className="stat-card dashboard-stat-card"
          onClick={() => setSection('notes')}
        >
          <span className="dashboard-stat-label">Notes</span>
          <span className="dashboard-stat-value">{stats.totalNotes}</span>
        </button>

        <button
          type="button"
          className="stat-card dashboard-stat-card"
          onClick={() => setSection('classes')}
        >
          <span className="dashboard-stat-label">Classes</span>
          <span className="dashboard-stat-value">{stats.totalClasses}</span>
        </button>

        <button
          type="button"
          className="stat-card dashboard-stat-card"
          onClick={() => setSection('mechanics')}
        >
          <span className="dashboard-stat-label">Mechanics</span>
          <span className="dashboard-stat-value">{stats.totalMechanics}</span>
        </button>
      </div>

      {/* ── Productivity + Calendar Row ───────────────────────────────────── */}
      <div className="dashboard-main-row">
        {/* Productivity Stats */}
        <div className="overview-card dashboard-productivity">
          <h3>Productivity Overview</h3>
          <div className="dashboard-stat-row">
            <span>Completion Rate</span>
            <strong>{stats.completionRate}%</strong>
          </div>
          <div className="dashboard-stat-row">
            <span>Completed This Week</span>
            <strong>{stats.tasksCompletedThisWeek}</strong>
          </div>
          <div className="dashboard-stat-row">
            <span>Overall Progress</span>
            <div className="dashboard-progress-bar">
              <div
                className="dashboard-progress-fill"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="overview-card dashboard-calendar">
          <div className="dashboard-calendar-header">
            <button
              type="button"
              className="btn btn-secondary dashboard-calendar-nav"
              onClick={goToPrevMonth}
              aria-label="Previous month"
            >
              ◀
            </button>
            <h3>
              {MONTH_NAMES[calendarMonth]} {calendarYear}
            </h3>
            <button
              type="button"
              className="btn btn-secondary dashboard-calendar-nav"
              onClick={goToNextMonth}
              aria-label="Next month"
            >
              ▶
            </button>
          </div>

          <div className="calendar-weekdays">
            {WEEKDAYS.map((day) => (
              <div key={day} className="calendar-weekday">
                {day}
              </div>
            ))}
          </div>

          <div className="calendar-days">
            {/* Empty cells before month starts */}
            {Array.from({ length: startingDayOfWeek }, (_, i) => (
              <div key={`empty-${i}`} className="calendar-day empty" />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = `${calendarYear}-${padTwo(calendarMonth + 1)}-${padTwo(day)}`;
              const reminders = remindersByDate[dateStr] || [];
              const dayTasks = tasksByDate[dateStr] || [];
              const dayMilestones = milestonesByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              const hasReminders = reminders.length > 0;
              const hasOverdue = reminders.some(
                (n) =>
                  !n.reminderDismissed &&
                  new Date(`${n.reminderDate}T${n.reminderTime || '00:00'}`) < new Date(),
              );
              const isSelected = dateStr === selectedDate;
              const dotItems = [...dayTasks, ...dayMilestones];

              return (
                <button
                  key={day}
                  type="button"
                  className={[
                    'calendar-day',
                    isToday && 'today',
                    hasReminders && 'has-reminder',
                    hasOverdue && 'overdue',
                    isSelected && 'selected',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setSelectedDate(dateStr)}
                >
                  <span className="day-number">{day}</span>
                  {hasReminders && (
                    <span className="reminder-count">{reminders.length}</span>
                  )}
                  {dotItems.length > 0 && (
                    <div className="calendar-dots">
                      {dotItems.slice(0, 5).map((item) => (
                        <span
                          key={item.id}
                          className={`dot ${Object.hasOwn(item, 'progress') ? 'milestone' : 'task'}`}
                        />
                      ))}
                      {dotItems.length > 5 && (
                        <span className="more">+{dotItems.length - 5}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Day detail panel */}
          {selectedDayItems && (
            <div className="dashboard-day-details">
              <h4>{selectedDayItems.formattedDate}</h4>

              {selectedDayItems.reminders.length > 0 && (
                <div className="day-details-group">
                  <h5>Reminders</h5>
                  {selectedDayItems.reminders.map((note) => {
                    const isDismissed = note.reminderDismissed;
                    const isOverdue =
                      !isDismissed &&
                      new Date(`${note.reminderDate}T${note.reminderTime || '00:00'}`) <
                        new Date();
                    return (
                      <div
                        key={note.id}
                        className={`day-detail-item ${isDismissed ? 'dismissed' : ''} ${isOverdue ? 'overdue' : ''}`}
                      >
                        <span className="day-detail-title">{note.title}</span>
                        <span className="day-detail-time">
                          {note.reminderTime || '00:00'}
                        </span>
                        {isDismissed && (
                          <span className="day-detail-status success">✓ Completed</span>
                        )}
                        {isOverdue && (
                          <span className="day-detail-status danger">⚠ Overdue</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedDayItems.dayTasks.length > 0 && (
                <div className="day-details-group">
                  <h5>Tasks</h5>
                  {selectedDayItems.dayTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      className="day-detail-item clickable"
                      onClick={() => setSection('tasks')}
                    >
                      <span className="day-detail-title">{task.title}</span>
                      <span className="day-detail-time">{formatDate(task.dueDate)}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedDayItems.dayMilestones.length > 0 && (
                <div className="day-details-group">
                  <h5>Milestones</h5>
                  {selectedDayItems.dayMilestones.map((ms) => (
                    <button
                      key={ms.id}
                      type="button"
                      className="day-detail-item clickable"
                      onClick={() => setSection('milestones')}
                    >
                      <span className="day-detail-title">{ms.title}</span>
                      <span className="day-detail-time">{formatDate(ms.dueDate)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Tasks + Upcoming Milestones ────────────────────────────── */}
      <div className="dashboard-bottom-row">
        <div className="overview-card">
          <h3>Recent Tasks</h3>
          {recentTasks.length === 0 ? (
            <p className="dashboard-empty">No tasks yet. Create your first task!</p>
          ) : (
            <ul className="dashboard-list">
              {recentTasks.map((task) => {
                const overdue = !task.completed && task.dueDate && isDateBeforeToday(task.dueDate);
                return (
                  <li key={task.id}>
                    <button
                      type="button"
                      className={`dashboard-list-item ${task.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}`}
                      onClick={() => setSection('tasks')}
                    >
                      <span className="dashboard-list-icon">
                        {task.completed ? '✓' : overdue ? '⚠' : '⏳'}
                      </span>
                      <span className="dashboard-list-title">{task.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="overview-card">
          <h3>Upcoming Milestones</h3>
          {upcomingMilestones.length === 0 ? (
            <p className="dashboard-empty">No upcoming milestones</p>
          ) : (
            <ul className="dashboard-list">
              {upcomingMilestones.map((ms) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dueDate = ms.dueDate ? parseDateKey(toDateKey(ms.dueDate) || '') : null;
                let daysText = '';
                if (dueDate) {
                  const daysUntil = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));
                  daysText =
                    daysUntil > 0
                      ? `${daysUntil} days`
                      : daysUntil === 0
                        ? 'due today'
                        : `${Math.abs(daysUntil)} days overdue`;
                }
                return (
                  <li key={ms.id}>
                    <button
                      type="button"
                      className="dashboard-list-item"
                      onClick={() => setSection('milestones')}
                    >
                      <span className="dashboard-list-icon">🏁</span>
                      <span className="dashboard-list-title">{ms.title}</span>
                      <span className="dashboard-list-meta">
                        {ms.progress ?? 0}% – {daysText}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
