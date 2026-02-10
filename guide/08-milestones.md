# Chapter 8 — Milestones

This chapter rebuilds the `MilestonePlanner` object as React components.

---

## 8.1 MilestoneCard

> **File:** `src/components/milestones/MilestoneCard.jsx`

```jsx
import React from 'react';
import { formatDate, isDateBeforeToday } from '../../utils/helpers';

/**
 * Displays a single milestone with progress tracking.
 * All milestone properties are destructured from props.
 */
const MilestoneCard = ({
  id,
  name,
  description = '',
  dueDate = '',
  status = 'not-started',
  progress = 0,
  tasks = [],
  onEdit,
  onDelete,
}) => {
  const isOverdue = dueDate && isDateBeforeToday(dueDate) && status !== 'complete';

  return (
    <div className={`item-card ${isOverdue ? 'overdue' : ''}`}>
      <div className="item-content">
        <div className="item-title">{name}</div>
        {description && <div className="item-description">{description}</div>}

        {/* Progress bar */}
        <div style={{ margin: '0.5rem 0' }}>
          <div
            style={{
              background: 'var(--bg-tertiary)',
              borderRadius: '4px',
              height: '8px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: status === 'complete' ? 'var(--success-color)' : 'var(--primary-color)',
                transition: 'width 0.3s',
              }}
            />
          </div>
          <small style={{ color: 'var(--text-secondary)' }}>{progress}% complete</small>
        </div>

        <div className="item-meta">
          <span className={`item-tag status-${status}`}>{status}</span>
          {dueDate && (
            <span className={`item-tag ${isOverdue ? 'overdue-tag' : ''}`}>
              {formatDate(dueDate)}
            </span>
          )}
          {tasks.length > 0 && <span className="item-tag">{tasks.length} tasks</span>}
        </div>
      </div>

      <div className="item-actions">
        <button className="btn btn-small btn-secondary" onClick={() => onEdit(id)}>Edit</button>
        <button className="btn btn-small btn-danger" onClick={() => onDelete(id)}>Delete</button>
      </div>
    </div>
  );
};

export default MilestoneCard;
```

---

## 8.2 MilestoneForm

> **File:** `src/components/milestones/MilestoneForm.jsx`

```jsx
import React, { useState } from 'react';
import { generateId } from '../../utils/helpers';

const STATUS_OPTIONS = ['not-started', 'in-progress', 'complete'];

const MilestoneForm = ({ milestone = null, onSave, onCancel }) => {
  const {
    id: existingId = null,
    name: initName = '',
    description: initDesc = '',
    dueDate: initDueDate = '',
    status: initStatus = 'not-started',
    progress: initProgress = 0,
    notes: initNotes = '',
    createdAt: initCreatedAt = null,
  } = milestone || {};

  const [name, setName] = useState(initName);
  const [description, setDescription] = useState(initDesc);
  const [dueDate, setDueDate] = useState(initDueDate);
  const [status, setStatus] = useState(initStatus);
  const [progress, setProgress] = useState(initProgress);
  const [notes, setNotes] = useState(initNotes);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: existingId || generateId(),
      name: name.trim(),
      description: description.trim(),
      dueDate,
      status,
      progress: Number(progress),
      notes: notes.trim(),
      tasks: milestone?.tasks || [],
      createdAt: initCreatedAt || new Date().toISOString(),
    });
  };

  const isEdit = existingId !== null;

  return (
    <form className="modal-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit Milestone' : 'Add New Milestone'}</h3>

      <div className="form-group">
        <label htmlFor="milestoneName">Name *</label>
        <input
          type="text" id="milestoneName" required
          value={name}
          onChange={({ target: { value } }) => setName(value)}
          placeholder="Milestone name"
        />
      </div>

      <div className="form-group">
        <label htmlFor="milestoneDesc">Description</label>
        <textarea
          id="milestoneDesc" rows="3"
          value={description}
          onChange={({ target: { value } }) => setDescription(value)}
          placeholder="Describe this milestone"
        />
      </div>

      <div className="form-group">
        <label htmlFor="milestoneDueDate">Target Date</label>
        <input
          type="date" id="milestoneDueDate"
          value={dueDate}
          onChange={({ target: { value } }) => setDueDate(value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="milestoneStatus">Status</label>
        <select
          id="milestoneStatus" value={status}
          onChange={({ target: { value } }) => setStatus(value)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="milestoneProgress">Progress ({progress}%)</label>
        <input
          type="range" id="milestoneProgress"
          min="0" max="100" step="5"
          value={progress}
          onChange={({ target: { value } }) => setProgress(value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="milestoneNotes">Notes</label>
        <textarea
          id="milestoneNotes" rows="2"
          value={notes}
          onChange={({ target: { value } }) => setNotes(value)}
          placeholder="Additional notes"
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{isEdit ? 'Update' : 'Add'} Milestone</button>
      </div>
    </form>
  );
};

export default MilestoneForm;
```

---

## 8.3 MilestonesPage

> **File:** `src/components/milestones/MilestonesPage.jsx`

```jsx
import React, { useState } from 'react';
import { useAppState, useAppDispatch, ACTIONS } from '../../context/AppContext';
import MilestoneCard from './MilestoneCard';
import MilestoneForm from './MilestoneForm';
import Modal from '../layout/Modal';

const MilestonesPage = () => {
  const { milestones } = useAppState();
  const dispatch = useAppDispatch();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const handleSave = (data) => {
    if (editing) {
      dispatch({ type: ACTIONS.UPDATE_MILESTONE, payload: data });
    } else {
      dispatch({ type: ACTIONS.ADD_MILESTONE, payload: data });
    }
    setModalOpen(false);
    setEditing(null);
  };

  const handleEdit = (id) => {
    setEditing(milestones.find((m) => m.id === id));
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this milestone?')) {
      dispatch({ type: ACTIONS.DELETE_MILESTONE, payload: id });
    }
  };

  return (
    <section className="content-section active">
      <header className="section-header">
        <h2>Milestones</h2>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
          + Add Milestone
        </button>
      </header>

      <div className="milestones-container">
        {milestones.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No milestones yet.</p>}
        {milestones.map((m) => (
          <MilestoneCard key={m.id} {...m} onEdit={handleEdit} onDelete={handleDelete} />
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <MilestoneForm milestone={editing} onSave={handleSave} onCancel={() => setModalOpen(false)} />
      </Modal>
    </section>
  );
};

export default MilestonesPage;
```

---

## 8.4 Files Created

| File | Replaces |
|------|----------|
| `src/components/milestones/MilestonesPage.jsx` | `MilestonePlanner` object |
| `src/components/milestones/MilestoneCard.jsx` | Milestone card HTML |
| `src/components/milestones/MilestoneForm.jsx` | Milestone add/edit form |

---

**Next:** [Chapter 9 — Classes](./09-classes.md)
