# Chapter 6 — Tasks

This chapter rebuilds the `TaskManager` object as React components with full destructuring.

---

## 6.1 TaskFilters

> **File:** `src/components/tasks/TaskFilters.jsx`

```jsx
import React from 'react';

const FILTERS = ['all', 'active', 'completed'];
const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'priority', label: 'Priority' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'title', label: 'Title' },
];

/**
 * Filter and sort controls for the tasks list.
 * Props destructured in the signature.
 */
const TaskFilters = ({ currentFilter, onFilterChange, sortBy, onSortChange }) => (
  <div className="task-controls">
    <div className="filters">
      {FILTERS.map((filter) => (
        <button
          key={filter}
          className={`filter-btn ${currentFilter === filter ? 'active' : ''}`}
          onClick={() => onFilterChange(filter)}
        >
          {filter.charAt(0).toUpperCase() + filter.slice(1)}
        </button>
      ))}
    </div>
    <div className="sort-controls">
      <label htmlFor="taskSortBy">Sort by:</label>
      <select
        id="taskSortBy"
        className="sort-select"
        value={sortBy}
        onChange={({ target: { value } }) => onSortChange(value)}  // ← destructure event
      >
        {SORT_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </div>
  </div>
);

export default TaskFilters;
```

---

## 6.2 TaskCard

> **File:** `src/components/tasks/TaskCard.jsx`

```jsx
import React from 'react';
import { formatDate, isDateBeforeToday } from '../../utils/helpers';
import Icon from '../shared/Icon';

/**
 * Renders a single task.
 * All task properties are destructured directly in the props.
 */
const TaskCard = ({
  id,
  title,
  description,
  priority,
  category,
  dueDate,
  tags = [],
  completed,
  onToggle,
  onEdit,
  onDelete,
}) => {
  const isOverdue = dueDate && isDateBeforeToday(dueDate) && !completed;

  return (
    <div className={`item-card ${completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}`}>
      <input
        type="checkbox"
        className="item-checkbox"
        checked={completed}
        onChange={() => onToggle(id)}
        aria-label={`Mark task as ${completed ? 'incomplete' : 'complete'}`}
      />

      <div className="item-content">
        <div className="item-title">{title}</div>
        {description && <div className="item-description">{description}</div>}
        <div className="item-meta">
          <span className={`item-tag priority-${priority}`}>{priority} priority</span>
          {category && <span className="item-tag">{category}</span>}
          {dueDate && (
            <span className={`item-tag ${isOverdue ? 'overdue-tag' : ''}`}>
              {isOverdue
                ? <Icon path="actions/warning" size="small" />
                : <Icon path="misc/calendar" size="small" />}
              {' '}{formatDate(dueDate)}
            </span>
          )}
          {tags.map((tag) => (
            <span key={tag} className="item-tag tag-badge">#{tag}</span>
          ))}
        </div>
      </div>

      <div className="item-actions">
        <button className="btn btn-small btn-secondary" onClick={() => onEdit(id)}>
          Edit
        </button>
        <button className="btn btn-small btn-danger" onClick={() => onDelete(id)}>
          Delete
        </button>
      </div>
    </div>
  );
};

export default TaskCard;
```

---

## 6.3 TaskForm

> **File:** `src/components/tasks/TaskForm.jsx`

```jsx
import React, { useState } from 'react';
import { generateId } from '../../utils/helpers';

/**
 * Form for adding or editing a task.
 * `task` prop is destructured with defaults for add mode.
 */
const TaskForm = ({ task = null, onSave, onCancel }) => {
  // Destructure existing task or use defaults
  const {
    id: existingId = null,
    title: initTitle = '',
    description: initDesc = '',
    priority: initPriority = 'medium',
    category: initCategory = 'development',
    dueDate: initDueDate = '',
    tags: initTags = [],
    completed: initCompleted = false,
    createdAt: initCreatedAt = null,
  } = task || {};

  const [title, setTitle] = useState(initTitle);
  const [description, setDescription] = useState(initDesc);
  const [priority, setPriority] = useState(initPriority);
  const [category, setCategory] = useState(initCategory);
  const [dueDate, setDueDate] = useState(initDueDate);
  const [tagsStr, setTagsStr] = useState(initTags.join(', '));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: existingId || generateId(),
      title: title.trim(),
      description: description.trim(),
      priority,
      category,
      dueDate,
      tags: tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
      completed: initCompleted,
      createdAt: initCreatedAt || new Date().toISOString(),
    });
  };

  const isEdit = existingId !== null;

  return (
    <form className="modal-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit Task' : 'Add New Task'}</h3>

      <div className="form-group">
        <label htmlFor="taskTitle">Task Title *</label>
        <input
          type="text"
          id="taskTitle"
          required
          value={title}
          onChange={({ target: { value } }) => setTitle(value)}
          placeholder="Enter task title"
        />
      </div>

      <div className="form-group">
        <label htmlFor="taskDescription">Description</label>
        <textarea
          id="taskDescription"
          rows="3"
          value={description}
          onChange={({ target: { value } }) => setDescription(value)}
          placeholder="Add details about the task"
        />
      </div>

      <div className="form-group">
        <label htmlFor="taskPriority">Priority</label>
        <select
          id="taskPriority"
          value={priority}
          onChange={({ target: { value } }) => setPriority(value)}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="taskCategory">Category</label>
        <select
          id="taskCategory"
          value={category}
          onChange={({ target: { value } }) => setCategory(value)}
        >
          <option value="design">Design</option>
          <option value="development">Development</option>
          <option value="testing">Testing</option>
          <option value="documentation">Documentation</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="taskDueDate">Due Date</label>
        <input
          type="date"
          id="taskDueDate"
          value={dueDate}
          onChange={({ target: { value } }) => setDueDate(value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="taskTags">Tags (comma-separated)</label>
        <input
          type="text"
          id="taskTags"
          value={tagsStr}
          onChange={({ target: { value } }) => setTagsStr(value)}
          placeholder="e.g., gameplay, ui, multiplayer"
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {isEdit ? 'Update' : 'Add'} Task
        </button>
      </div>
    </form>
  );
};

export default TaskForm;
```

---

## 6.4 TasksPage

> **File:** `src/components/tasks/TasksPage.jsx`

This is the main page component that ties filters, form, and card list together.

```jsx
import React, { useState, useMemo } from 'react';
import { useAppState, useAppDispatch, ACTIONS } from '../../context/AppContext';
import TaskFilters from './TaskFilters';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import Modal from '../layout/Modal';

const PRIORITY_MAP = { high: 3, medium: 2, low: 1 };

const TasksPage = () => {
  const { tasks } = useAppState();             // ← destructure state
  const dispatch = useAppDispatch();

  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Filter and sort tasks
  const displayedTasks = useMemo(() => {
    let filtered = [...tasks];

    if (filter === 'active') filtered = filtered.filter(({ completed }) => !completed);
    if (filter === 'completed') filtered = filtered.filter(({ completed }) => completed);

    filtered.sort((a, b) => {
      if (sortBy === 'priority') return (PRIORITY_MAP[b.priority] || 0) - (PRIORITY_MAP[a.priority] || 0);
      if (sortBy === 'dueDate') {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return da - db;
      }
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return filtered;
  }, [tasks, filter, sortBy]);

  const handleToggle = (id) => dispatch({ type: ACTIONS.TOGGLE_TASK, payload: id });

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      dispatch({ type: ACTIONS.DELETE_TASK, payload: id });
    }
  };

  const handleEdit = (id) => {
    const task = tasks.find((t) => t.id === id);
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleSave = (taskData) => {
    if (editingTask) {
      dispatch({ type: ACTIONS.UPDATE_TASK, payload: taskData });
    } else {
      dispatch({ type: ACTIONS.ADD_TASK, payload: taskData });
    }
    setModalOpen(false);
    setEditingTask(null);
  };

  const openAddModal = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  return (
    <section className="content-section active">
      <header className="section-header">
        <h2>Tasks</h2>
        <button className="btn btn-primary" onClick={openAddModal}>+ Add Task</button>
      </header>

      <TaskFilters
        currentFilter={filter}
        onFilterChange={setFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <div className="items-container">
        {displayedTasks.map((task) => (
          <TaskCard
            key={task.id}
            {...task}                        {/* ← spread = destructure all props */}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <TaskForm
          task={editingTask}
          onSave={handleSave}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </section>
  );
};

export default TasksPage;
```

---

## 6.5 Destructuring Highlights

| Pattern | Where |
|---------|-------|
| `const { tasks } = useAppState()` | TasksPage — pull only needed state |
| `({ completed }) => !completed` | Filter callback — destructure item inline |
| `const { id: existingId = null, ... } = task \|\| {}` | TaskForm — rename + default |
| `({ target: { value } }) => setTitle(value)` | Form inputs — nested event destructure |
| `{...task}` | TasksPage → TaskCard — spread as destructured props |

---

## 6.6 Files Created

| File | Replaces |
|------|----------|
| `src/components/tasks/TasksPage.jsx` | `TaskManager` object |
| `src/components/tasks/TaskCard.jsx` | Task card HTML in `TaskManager.render()` |
| `src/components/tasks/TaskForm.jsx` | Form HTML in `TaskManager.openAddModal()` |
| `src/components/tasks/TaskFilters.jsx` | Filter/sort controls |

---

**Next:** [Chapter 7 — Assets](./07-assets.md)
