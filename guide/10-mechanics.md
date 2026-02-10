# Chapter 10 — Mechanics

This chapter rebuilds the `MechanicsManager` object as React components.

---

## 10.1 MechanicCard

> **File:** `src/components/mechanics/MechanicCard.jsx`

```jsx
import React from 'react';

const PRIORITY_EMOJI = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };

/**
 * Displays a single game mechanic.
 * Props are destructured in the signature.
 */
const MechanicCard = ({
  id,
  name,
  category = '',
  description = '',
  implementation = '',
  status = 'not-started',
  priority = 'medium',
  complexity = 'medium',
  onEdit,
  onDelete,
}) => (
  <div className="item-card">
    <div className="item-content">
      <div className="item-title">
        <img src="/icons/navigation/mechanics.svg" alt="" width="20" height="20" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
        {name}
      </div>
      {description && <div className="item-description">{description}</div>}
      <div className="item-meta">
        {category && <span className="item-tag">{category}</span>}
        <span className={`item-tag status-${status}`}>{status}</span>
        <span className="item-tag">{PRIORITY_EMOJI[priority] || '🟡'} {priority}</span>
        <span className="item-tag">Complexity: {complexity}</span>
      </div>
      {implementation && (
        <details style={{ marginTop: '0.5rem' }}>
          <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>Implementation Notes</summary>
          <p style={{ padding: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{implementation}</p>
        </details>
      )}
    </div>
    <div className="item-actions">
      <button className="btn btn-small btn-secondary" onClick={() => onEdit(id)}>Edit</button>
      <button className="btn btn-small btn-danger" onClick={() => onDelete(id)}>Delete</button>
    </div>
  </div>
);

export default MechanicCard;
```

---

## 10.2 MechanicForm

> **File:** `src/components/mechanics/MechanicForm.jsx`

```jsx
import React, { useState } from 'react';
import { generateId } from '../../utils/helpers';

const CATEGORIES = ['movement', 'combat', 'ui', 'gameplay', 'ai', 'physics', 'networking', 'audio', 'graphics', 'other'];
const STATUSES = ['not-started', 'in-progress', 'testing', 'complete'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const COMPLEXITIES = ['simple', 'medium', 'complex'];

const MechanicForm = ({ mechanic = null, onSave, onCancel }) => {
  const {
    id: existingId = null,
    name: initName = '',
    category: initCategory = 'gameplay',
    description: initDesc = '',
    implementation: initImpl = '',
    status: initStatus = 'not-started',
    priority: initPriority = 'medium',
    complexity: initComplexity = 'medium',
    createdAt: initCreatedAt = null,
  } = mechanic || {};

  const [name, setName] = useState(initName);
  const [category, setCategory] = useState(initCategory);
  const [description, setDescription] = useState(initDesc);
  const [implementation, setImplementation] = useState(initImpl);
  const [status, setStatus] = useState(initStatus);
  const [priority, setPriority] = useState(initPriority);
  const [complexity, setComplexity] = useState(initComplexity);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: existingId || generateId(),
      name: name.trim(),
      category,
      description: description.trim(),
      implementation: implementation.trim(),
      status,
      priority,
      complexity,
      relatedItems: mechanic?.relatedItems || [],
      createdAt: initCreatedAt || new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    });
  };

  const isEdit = existingId !== null;

  return (
    <form className="modal-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit Mechanic' : 'Add New Mechanic'}</h3>

      <div className="form-group">
        <label htmlFor="mechName">Name *</label>
        <input type="text" id="mechName" required value={name}
          onChange={({ target: { value } }) => setName(value)}
          placeholder="e.g., Double Jump, Combo System"
        />
      </div>

      <div className="form-group">
        <label htmlFor="mechCategory">Category</label>
        <select id="mechCategory" value={category} onChange={({ target: { value } }) => setCategory(value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="mechStatus">Status</label>
        <select id="mechStatus" value={status} onChange={({ target: { value } }) => setStatus(value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="mechPriority">Priority</label>
        <select id="mechPriority" value={priority} onChange={({ target: { value } }) => setPriority(value)}>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="mechComplexity">Complexity</label>
        <select id="mechComplexity" value={complexity} onChange={({ target: { value } }) => setComplexity(value)}>
          {COMPLEXITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="mechDesc">Description</label>
        <textarea id="mechDesc" rows="3" value={description}
          onChange={({ target: { value } }) => setDescription(value)}
          placeholder="How this mechanic works"
        />
      </div>

      <div className="form-group">
        <label htmlFor="mechImpl">Implementation Notes</label>
        <textarea id="mechImpl" rows="3" value={implementation}
          onChange={({ target: { value } }) => setImplementation(value)}
          placeholder="Technical implementation details"
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{isEdit ? 'Update' : 'Add'} Mechanic</button>
      </div>
    </form>
  );
};

export default MechanicForm;
```

---

## 10.3 MechanicsPage

> **File:** `src/components/mechanics/MechanicsPage.jsx`

```jsx
import React, { useState, useMemo } from 'react';
import { useAppState, useAppDispatch, ACTIONS } from '../../context/AppContext';
import MechanicCard from './MechanicCard';
import MechanicForm from './MechanicForm';
import Modal from '../layout/Modal';

const MechanicsPage = () => {
  const { mechanics } = useAppState();
  const dispatch = useAppDispatch();

  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const displayed = useMemo(() => {
    let result = [...mechanics];
    if (filterCategory) result = result.filter(({ category }) => category === filterCategory);
    if (filterStatus) result = result.filter(({ status }) => status === filterStatus);
    if (filterPriority) result = result.filter(({ priority }) => priority === filterPriority);

    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    result.sort((a, b) => {
      if (sortBy === 'priority') return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
      if (sortBy === 'date') return new Date(b.modifiedAt || b.createdAt) - new Date(a.modifiedAt || a.createdAt);
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [mechanics, filterCategory, filterStatus, filterPriority, sortBy]);

  const handleSave = (data) => {
    if (editing) {
      dispatch({ type: ACTIONS.UPDATE_MECHANIC, payload: data });
    } else {
      dispatch({ type: ACTIONS.ADD_MECHANIC, payload: data });
    }
    setModalOpen(false);
    setEditing(null);
  };

  const handleEdit = (id) => {
    setEditing(mechanics.find((m) => m.id === id));
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this mechanic?')) {
      dispatch({ type: ACTIONS.DELETE_MECHANIC, payload: id });
    }
  };

  const clearFilters = () => {
    setFilterCategory('');
    setFilterStatus('');
    setFilterPriority('');
  };

  return (
    <section className="content-section active">
      <header className="section-header">
        <h2>Game Mechanics</h2>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
          + Add Mechanic
        </button>
      </header>
      <p className="section-description">Document your game&apos;s mechanics and systems</p>

      <div className="mechanics-filters">
        <div className="filter-group">
          <label>Category:</label>
          <select className="filter-select" value={filterCategory}
            onChange={({ target: { value } }) => setFilterCategory(value)}>
            <option value="">All Categories</option>
            {['movement','combat','ui','gameplay','ai','physics','networking','audio','graphics','other'].map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Status:</label>
          <select className="filter-select" value={filterStatus}
            onChange={({ target: { value } }) => setFilterStatus(value)}>
            <option value="">All Statuses</option>
            {['not-started','in-progress','testing','complete'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Priority:</label>
          <select className="filter-select" value={filterPriority}
            onChange={({ target: { value } }) => setFilterPriority(value)}>
            <option value="">All Priorities</option>
            {['critical','high','medium','low'].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Sort By:</label>
          <select className="filter-select" value={sortBy}
            onChange={({ target: { value } }) => setSortBy(value)}>
            <option value="name">Name</option>
            <option value="priority">Priority</option>
            <option value="status">Status</option>
            <option value="date">Modified Date</option>
          </select>
        </div>
        <button className="btn btn-small btn-secondary" onClick={clearFilters}>Clear Filters</button>
      </div>

      <div className="mechanics-container">
        {displayed.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No mechanics found.</p>}
        {displayed.map((m) => (
          <MechanicCard key={m.id} {...m} onEdit={handleEdit} onDelete={handleDelete} />
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <MechanicForm mechanic={editing} onSave={handleSave} onCancel={() => setModalOpen(false)} />
      </Modal>
    </section>
  );
};

export default MechanicsPage;
```

---

## 10.4 Files Created

| File | Replaces |
|------|----------|
| `src/components/mechanics/MechanicsPage.jsx` | `MechanicsManager` object |
| `src/components/mechanics/MechanicCard.jsx` | Mechanic card HTML |
| `src/components/mechanics/MechanicForm.jsx` | Mechanic add/edit form |

---

**Next:** [Chapter 11 — Story](./11-story.md)
