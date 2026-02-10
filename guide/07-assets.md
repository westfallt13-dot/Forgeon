# Chapter 7 — Assets

This chapter rebuilds the `AssetTracker` object as React components.

---

## 7.1 AssetCard

> **File:** `src/components/assets/AssetCard.jsx`

```jsx
import React from 'react';

const TYPE_ICONS = {
  image: 'asset/image',
  audio: 'asset/audio',
  video: 'asset/video',
  model: 'asset/model',
  document: 'asset/document',
  script: 'asset/script',
  other: 'asset/other',
};

/**
 * Displays a single asset.
 * Asset properties are destructured in the parameter list.
 */
const AssetCard = ({
  id,
  name,
  type = 'other',
  status = 'pending',
  assignee = '',
  notes = '',
  onEdit,
  onDelete,
}) => {
  const iconPath = TYPE_ICONS[type] || TYPE_ICONS.other;

  return (
    <div className="item-card">
      <img src={`/icons/${iconPath}.svg`} alt="" width="32" height="32" className="stat-icon" />
      <div className="item-content">
        <div className="item-title">{name}</div>
        {notes && <div className="item-description">{notes}</div>}
        <div className="item-meta">
          <span className="item-tag">{type}</span>
          <span className={`item-tag status-${status}`}>{status}</span>
          {assignee && <span className="item-tag">{assignee}</span>}
        </div>
      </div>
      <div className="item-actions">
        <button className="btn btn-small btn-secondary" onClick={() => onEdit(id)}>Edit</button>
        <button className="btn btn-small btn-danger" onClick={() => onDelete(id)}>Delete</button>
      </div>
    </div>
  );
};

export default AssetCard;
```

---

## 7.2 AssetForm

> **File:** `src/components/assets/AssetForm.jsx`

```jsx
import React, { useState } from 'react';
import { generateId } from '../../utils/helpers';

const ASSET_TYPES = ['image', 'audio', 'video', 'model', 'document', 'script', 'other'];
const STATUS_OPTIONS = ['pending', 'in-progress', 'review', 'complete'];

const AssetForm = ({ asset = null, onSave, onCancel }) => {
  const {
    id: existingId = null,
    name: initName = '',
    type: initType = 'other',
    status: initStatus = 'pending',
    assignee: initAssignee = '',
    notes: initNotes = '',
    path: initPath = '',
    createdAt: initCreatedAt = null,
  } = asset || {};

  const [name, setName] = useState(initName);
  const [type, setType] = useState(initType);
  const [status, setStatus] = useState(initStatus);
  const [assignee, setAssignee] = useState(initAssignee);
  const [notes, setNotes] = useState(initNotes);
  const [path, setPath] = useState(initPath);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: existingId || generateId(),
      name: name.trim(),
      type,
      status,
      assignee: assignee.trim(),
      notes: notes.trim(),
      path: path.trim(),
      createdAt: initCreatedAt || new Date().toISOString(),
    });
  };

  const isEdit = existingId !== null;

  return (
    <form className="modal-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit Asset' : 'Add New Asset'}</h3>

      <div className="form-group">
        <label htmlFor="assetName">Asset Name *</label>
        <input
          type="text" id="assetName" required
          value={name}
          onChange={({ target: { value } }) => setName(value)}
          placeholder="Enter asset name"
        />
      </div>

      <div className="form-group">
        <label htmlFor="assetType">Type</label>
        <select id="assetType" value={type} onChange={({ target: { value } }) => setType(value)}>
          {ASSET_TYPES.map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="assetStatus">Status</label>
        <select id="assetStatus" value={status} onChange={({ target: { value } }) => setStatus(value)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="assetPath">File Path</label>
        <input
          type="text" id="assetPath"
          value={path}
          onChange={({ target: { value } }) => setPath(value)}
          placeholder="e.g., assets/sprites/player.png"
        />
      </div>

      <div className="form-group">
        <label htmlFor="assetAssignee">Assignee</label>
        <input
          type="text" id="assetAssignee"
          value={assignee}
          onChange={({ target: { value } }) => setAssignee(value)}
          placeholder="Who is responsible"
        />
      </div>

      <div className="form-group">
        <label htmlFor="assetNotes">Notes</label>
        <textarea
          id="assetNotes" rows="3"
          value={notes}
          onChange={({ target: { value } }) => setNotes(value)}
          placeholder="Additional notes"
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{isEdit ? 'Update' : 'Add'} Asset</button>
      </div>
    </form>
  );
};

export default AssetForm;
```

---

## 7.3 AssetsPage

> **File:** `src/components/assets/AssetsPage.jsx`

```jsx
import React, { useState, useMemo } from 'react';
import { useAppState, useAppDispatch, ACTIONS } from '../../context/AppContext';
import AssetCard from './AssetCard';
import AssetForm from './AssetForm';
import Modal from '../layout/Modal';

const FILTER_TYPES = ['all', 'image', 'audio', 'video', 'model', 'document', 'script', 'other'];

const AssetsPage = () => {
  const { assets } = useAppState();
  const dispatch = useAppDispatch();

  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  const displayed = useMemo(() => {
    if (filter === 'all') return assets;
    return assets.filter(({ type }) => type === filter);   // ← destructure in filter
  }, [assets, filter]);

  const handleSave = (assetData) => {
    if (editingAsset) {
      dispatch({ type: ACTIONS.UPDATE_ASSET, payload: assetData });
    } else {
      dispatch({ type: ACTIONS.ADD_ASSET, payload: assetData });
    }
    setModalOpen(false);
    setEditingAsset(null);
  };

  const handleEdit = (id) => {
    setEditingAsset(assets.find((a) => a.id === id));
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this asset?')) {
      dispatch({ type: ACTIONS.DELETE_ASSET, payload: id });
    }
  };

  return (
    <section className="content-section active">
      <header className="section-header">
        <h2>Assets</h2>
        <button className="btn btn-primary" onClick={() => { setEditingAsset(null); setModalOpen(true); }}>
          + Add Asset
        </button>
      </header>

      <div className="filters">
        {FILTER_TYPES.map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1) + 's'}
          </button>
        ))}
      </div>

      <div className="items-container">
        {displayed.map((asset) => (
          <AssetCard key={asset.id} {...asset} onEdit={handleEdit} onDelete={handleDelete} />
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <AssetForm asset={editingAsset} onSave={handleSave} onCancel={() => setModalOpen(false)} />
      </Modal>
    </section>
  );
};

export default AssetsPage;
```

---

## 7.4 Files Created

| File | Replaces |
|------|----------|
| `src/components/assets/AssetsPage.jsx` | `AssetTracker` object |
| `src/components/assets/AssetCard.jsx` | Asset card HTML in `AssetTracker.render()` |
| `src/components/assets/AssetForm.jsx` | Form HTML in `AssetTracker.openAddModal()` |

---

**Next:** [Chapter 8 — Milestones](./08-milestones.md)
