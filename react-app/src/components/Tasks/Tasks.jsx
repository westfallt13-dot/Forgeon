import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useModal } from '../../context/ModalContext';
import { useToast } from '../../context/ToastContext';
import { generateId, formatDate, isDateBeforeToday } from '../../utils/helpers';
import './Tasks.css';

const PRIORITY_ORDER = { high: 3, medium: 2, low: 1 };

const CATEGORIES = [
  { value: 'design', label: 'Design' },
  { value: 'development', label: 'Development' },
  { value: 'testing', label: 'Testing' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'other', label: 'Other' },
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'priority', label: 'Priority' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'title', label: 'Title' },
];

// ── Task Form (rendered inside the modal) ──────────────────────────────────────

function TaskForm({ taskToEdit, onSubmit, onCancel }) {
  const isEdit = taskToEdit !== null;

  const [title, setTitle] = useState(isEdit ? taskToEdit.title : '');
  const [description, setDescription] = useState(isEdit ? taskToEdit.description : '');
  const [priority, setPriority] = useState(isEdit ? taskToEdit.priority : 'medium');
  const [category, setCategory] = useState(isEdit ? taskToEdit.category : 'development');
  const [dueDate, setDueDate] = useState(isEdit && taskToEdit.dueDate ? taskToEdit.dueDate : '');
  const [tags, setTags] = useState(
    isEdit && taskToEdit.tags ? taskToEdit.tags.join(', ') : ''
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const taskData = {
      title: trimmedTitle,
      description: description.trim(),
      priority,
      category,
      dueDate,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };

    if (isEdit) {
      onSubmit({ ...taskData, id: taskToEdit.id });
    } else {
      onSubmit({
        ...taskData,
        id: generateId(),
        completed: false,
        createdAt: new Date().toISOString(),
        relatedItems: [],
      });
    }
  };

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
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title"
          autoFocus
        />
      </div>

      <div className="form-group">
        <label htmlFor="taskDescription">Description</label>
        <textarea
          id="taskDescription"
          rows="3"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details about the task"
        />
      </div>

      <div className="form-group">
        <label htmlFor="taskPriority">Priority</label>
        <select
          id="taskPriority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
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
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="taskDueDate">Due Date</label>
        <input
          type="date"
          id="taskDueDate"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="taskTags">Tags (comma-separated)</label>
        <input
          type="text"
          id="taskTags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
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
}

// ── Task Card ──────────────────────────────────────────────────────────────────

function TaskCard({ task, onToggle, onEdit, onDelete }) {
  const isOverdue =
    task.dueDate && isDateBeforeToday(task.dueDate) && !task.completed;

  return (
    <div
      className={`task-card${task.completed ? ' completed' : ''}${isOverdue ? ' overdue' : ''}`}
    >
      <input
        type="checkbox"
        className="task-checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        aria-label={`Mark task as ${task.completed ? 'incomplete' : 'complete'}`}
      />

      <div className="task-content">
        <div className="task-title">{task.title}</div>
        {task.description && (
          <div className="task-description">{task.description}</div>
        )}
        <div className="task-meta">
          <span className={`task-badge priority-${task.priority}`}>
            {task.priority}
          </span>
          {task.category && (
            <span className="task-badge task-category">{task.category}</span>
          )}
          {task.dueDate && (
            <span className={`task-badge${isOverdue ? ' overdue-badge' : ''}`}>
              {isOverdue ? '⚠ ' : '📅 '}
              {formatDate(task.dueDate)}
            </span>
          )}
          {task.tags &&
            task.tags.length > 0 &&
            task.tags.map((tag) => (
              <span key={tag} className="task-badge task-tag">
                #{tag}
              </span>
            ))}
        </div>
      </div>

      <div className="task-actions">
        <button
          className="btn btn-small btn-secondary"
          onClick={() => onEdit(task)}
        >
          Edit
        </button>
        <button
          className="btn btn-small btn-danger"
          onClick={() => onDelete(task.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Main Tasks Component ───────────────────────────────────────────────────────

export default function Tasks() {
  const { tasks, addItem, updateItem, deleteItem } = useApp();
  const { openModal, closeModal } = useModal();
  const { showToast, showConfirm } = useToast();

  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // ── Filter & sort ────────────────────────────────────────────────────────────

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Filter
    if (filter === 'active') {
      result = result.filter((t) => !t.completed);
    } else if (filter === 'completed') {
      result = result.filter((t) => t.completed);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'priority') {
        cmp = (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0);
      } else if (sortBy === 'dueDate') {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        cmp = dateA - dateB;
      } else if (sortBy === 'title') {
        cmp = (a.title || '').localeCompare(b.title || '');
      } else {
        cmp = new Date(b.createdAt) - new Date(a.createdAt);
      }
      return sortOrder === 'asc' ? -cmp : cmp;
    });

    return result;
  }, [tasks, filter, sortBy, sortOrder]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleFormSubmit = useCallback(
    (taskData) => {
      const existing = tasks.find((t) => t.id === taskData.id);
      if (existing) {
        const { id, ...updates } = taskData;
        updateItem('tasks', id, updates);
        showToast('Task updated successfully', 'success');
      } else {
        addItem('tasks', taskData);
        showToast('Task added successfully', 'success');
      }
      closeModal();
    },
    [tasks, addItem, updateItem, closeModal, showToast]
  );

  const openTaskModal = useCallback(
    (taskToEdit = null) => {
      openModal(
        <TaskForm
          taskToEdit={taskToEdit}
          onSubmit={handleFormSubmit}
          onCancel={closeModal}
        />
      );
    },
    [openModal, closeModal, handleFormSubmit]
  );

  const handleToggle = useCallback(
    (id) => {
      const task = tasks.find((t) => t.id === id);
      if (task) {
        updateItem('tasks', id, { completed: !task.completed });
      }
    },
    [tasks, updateItem]
  );

  const handleDelete = useCallback(
    (id) => {
      showConfirm('Are you sure you want to delete this task?', () => {
        deleteItem('tasks', id);
        showToast('Task deleted', 'success');
      });
    },
    [deleteItem, showConfirm, showToast]
  );

  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="tasks-section">
      <div className="tasks-toolbar">
        <button className="btn btn-primary" onClick={() => openTaskModal()}>
          + Add Task
        </button>

        <div className="tasks-controls">
          <div className="tasks-filters">
            {['all', 'active', 'completed'].map((f) => (
              <button
                key={f}
                className={`filter-btn${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="tasks-sort">
            <label htmlFor="taskSortBy">Sort by:</label>
            <select
              id="taskSortBy"
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              className="btn btn-small btn-secondary sort-order-btn"
              onClick={toggleSortOrder}
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              aria-label={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      <div className="tasks-list">
        {filteredTasks.length === 0 ? (
          <div className="tasks-empty">
            <p>
              {filter === 'all'
                ? 'No tasks yet. Click "Add Task" to create one!'
                : filter === 'active'
                  ? 'No active tasks. Great job!'
                  : 'No completed tasks yet.'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={handleToggle}
              onEdit={openTaskModal}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
