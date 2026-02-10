# Chapter 12 — Notes

This chapter rebuilds the `NotesManager` object as React components with full CRUD, categories, tags, pinning, and reminders.

---

## 12.1 NoteCard

> **File:** `src/components/notes/NoteCard.jsx`

```jsx
import React from 'react';
import { formatDate } from '../../utils/helpers';

/**
 * Displays a single note card.
 * Destructures all note properties directly from props.
 */
const NoteCard = ({
  id,
  title,
  content = '',
  category = '',
  tags = [],
  color = '',
  pinned = false,
  archived = false,
  reminder = null,
  modifiedAt,
  onEdit,
  onDelete,
  onTogglePin,
}) => (
  <div
    className={`note-card ${pinned ? 'pinned' : ''} ${archived ? 'archived' : ''}`}
    style={color ? { borderTop: `4px solid ${color}` } : undefined}
  >
    <div className="note-card-header">
      <h4 className="note-card-title">{title}</h4>
      <div className="note-card-actions">
        <button
          className="btn-icon"
          onClick={() => onTogglePin(id)}
          title={pinned ? 'Unpin' : 'Pin'}
        >
          <img
            src={`/icons/status/pin.svg`}
            alt=""
            width="16"
            height="16"
            style={pinned ? { filter: 'none', opacity: 1 } : { opacity: 0.4 }}
          />
        </button>
        <button className="btn-icon" onClick={() => onEdit(id)} title="Edit">
          <img src="/icons/actions/edit.svg" alt="" width="16" height="16" />
        </button>
        <button className="btn-icon" onClick={() => onDelete(id)} title="Delete">
          <img src="/icons/actions/trash.svg" alt="" width="16" height="16" />
        </button>
      </div>
    </div>

    {content && (
      <div className="note-card-content">
        {content.length > 200 ? content.substring(0, 200) + '…' : content}
      </div>
    )}

    <div className="note-card-meta">
      {category && <span className="item-tag">{category}</span>}
      {tags.map((tag) => (
        <span key={tag} className="item-tag tag-badge">#{tag}</span>
      ))}
      {reminder && (
        <span className="item-tag" title="Reminder set">
          <img src="/icons/misc/clock.svg" alt="" width="12" height="12" style={{ verticalAlign: 'middle' }} />
          {' '}{formatDate(reminder)}
        </span>
      )}
    </div>

    {modifiedAt && (
      <div className="note-card-date">
        <small style={{ color: 'var(--text-tertiary)' }}>Modified {formatDate(modifiedAt)}</small>
      </div>
    )}
  </div>
);

export default NoteCard;
```

---

## 12.2 NoteForm

> **File:** `src/components/notes/NoteForm.jsx`

```jsx
import React, { useState } from 'react';
import { generateId } from '../../utils/helpers';
import { DEFAULT_NOTE_CATEGORIES } from '../../utils/constants';

const NoteForm = ({ note = null, categories = DEFAULT_NOTE_CATEGORIES, onSave, onCancel }) => {
  const {
    id: existingId = null,
    title: initTitle = '',
    content: initContent = '',
    category: initCategory = 'Ideas',
    tags: initTags = [],
    color: initColor = '',
    pinned: initPinned = false,
    archived: initArchived = false,
    reminder: initReminder = '',
    createdAt: initCreatedAt = null,
  } = note || {};

  const [title, setTitle] = useState(initTitle);
  const [content, setContent] = useState(initContent);
  const [category, setCategory] = useState(initCategory);
  const [tagsStr, setTagsStr] = useState(initTags.join(', '));
  const [color, setColor] = useState(initColor);
  const [reminder, setReminder] = useState(initReminder);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: existingId || generateId(),
      title: title.trim() || 'Untitled Note',
      content: content.trim(),
      category,
      tags: tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
      color,
      pinned: initPinned,
      archived: initArchived,
      reminder: reminder || null,
      createdAt: initCreatedAt || new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    });
  };

  const isEdit = existingId !== null;

  return (
    <form className="modal-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit Note' : 'New Note'}</h3>

      <div className="form-group">
        <label htmlFor="noteTitle">Title</label>
        <input type="text" id="noteTitle" value={title}
          onChange={({ target: { value } }) => setTitle(value)}
          placeholder="Note title"
        />
      </div>

      <div className="form-group">
        <label htmlFor="noteContent">Content</label>
        <textarea id="noteContent" rows="8" value={content}
          onChange={({ target: { value } }) => setContent(value)}
          placeholder="Write your note..."
        />
      </div>

      <div className="form-group">
        <label htmlFor="noteCategory">Category</label>
        <select id="noteCategory" value={category}
          onChange={({ target: { value } }) => setCategory(value)}>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="noteTags">Tags (comma-separated)</label>
        <input type="text" id="noteTags" value={tagsStr}
          onChange={({ target: { value } }) => setTagsStr(value)}
          placeholder="e.g., important, gameplay, review"
        />
      </div>

      <div className="form-group">
        <label htmlFor="noteColor">Accent Color</label>
        <input type="color" id="noteColor" value={color || '#ffffff'}
          onChange={({ target: { value } }) => setColor(value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="noteReminder">Reminder</label>
        <input type="datetime-local" id="noteReminder" value={reminder}
          onChange={({ target: { value } }) => setReminder(value)}
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{isEdit ? 'Update' : 'Create'} Note</button>
      </div>
    </form>
  );
};

export default NoteForm;
```

---

## 12.3 NotesPage

> **File:** `src/components/notes/NotesPage.jsx`

```jsx
import React, { useState, useMemo } from 'react';
import { useAppState, useAppDispatch, ACTIONS } from '../../context/AppContext';
import NoteCard from './NoteCard';
import NoteForm from './NoteForm';
import Modal from '../layout/Modal';

const NotesPage = () => {
  const { notes, noteCategories } = useAppState();
  const dispatch = useAppDispatch();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [sortBy, setSortBy] = useState('modified');
  const [viewMode, setViewMode] = useState('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Collect all unique tags from notes
  const allTags = useMemo(() => {
    const tagSet = new Set();
    notes.forEach(({ tags = [] }) => tags.forEach((t) => tagSet.add(t)));
    return [...tagSet].sort();
  }, [notes]);

  // Filter, search, and sort
  const displayed = useMemo(() => {
    let result = [...notes];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(({ title, content, tags = [] }) =>
        title?.toLowerCase().includes(q) ||
        content?.toLowerCase().includes(q) ||
        tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (filterCategory) {
      result = result.filter(({ category }) => category === filterCategory);
    }

    // Tag filter
    if (filterTag) {
      result = result.filter(({ tags = [] }) => tags.includes(filterTag));
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'pinned') {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
      }
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'created') return new Date(b.createdAt) - new Date(a.createdAt);
      // default: modified
      return new Date(b.modifiedAt || b.createdAt) - new Date(a.modifiedAt || a.createdAt);
    });

    return result;
  }, [notes, searchQuery, filterCategory, filterTag, sortBy]);

  const handleSave = (data) => {
    if (editing) {
      dispatch({ type: ACTIONS.UPDATE_NOTE, payload: data });
    } else {
      dispatch({ type: ACTIONS.ADD_NOTE, payload: data });
    }
    setModalOpen(false);
    setEditing(null);
  };

  const handleEdit = (id) => {
    setEditing(notes.find((n) => n.id === id));
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this note?')) {
      dispatch({ type: ACTIONS.DELETE_NOTE, payload: id });
    }
  };

  const handleTogglePin = (id) => {
    const note = notes.find((n) => n.id === id);
    if (note) {
      dispatch({
        type: ACTIONS.UPDATE_NOTE,
        payload: { id, pinned: !note.pinned },
      });
    }
  };

  return (
    <section className="content-section active">
      <header className="section-header">
        <h2>Notes</h2>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <img src="/icons/actions/add.svg" alt="" width="16" height="16" /> New Note
        </button>
      </header>

      {/* Toolbar */}
      <div className="notes-toolbar">
        <div className="notes-search-bar">
          <input
            type="text" className="search-input"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={({ target: { value } }) => setSearchQuery(value)}
          />
        </div>
        <div className="notes-filters">
          <select className="filter-select" value={filterCategory}
            onChange={({ target: { value } }) => setFilterCategory(value)}>
            <option value="">All Categories</option>
            {noteCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="filter-select" value={filterTag}
            onChange={({ target: { value } }) => setFilterTag(value)}>
            <option value="">All Tags</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="filter-select" value={sortBy}
            onChange={({ target: { value } }) => setSortBy(value)}>
            <option value="modified">Recently Modified</option>
            <option value="created">Recently Created</option>
            <option value="title">Title (A-Z)</option>
            <option value="pinned">Pinned First</option>
          </select>
        </div>
        <div className="notes-view-toggle">
          <button className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')} title="Grid View">
            <img src="/icons/misc/grid.svg" alt="Grid" width="20" height="20" />
          </button>
          <button className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')} title="List View">
            <img src="/icons/misc/list.svg" alt="List" width="20" height="20" />
          </button>
        </div>
      </div>

      {/* Notes grid/list */}
      <div className={viewMode === 'grid' ? 'notes-grid' : 'notes-list'}>
        {displayed.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No notes found.</p>}
        {displayed.map((note) => (
          <NoteCard
            key={note.id}
            {...note}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onTogglePin={handleTogglePin}
          />
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <NoteForm
          note={editing}
          categories={noteCategories}
          onSave={handleSave}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </section>
  );
};

export default NotesPage;
```

---

## 12.4 Files Created

| File | Replaces |
|------|----------|
| `src/components/notes/NotesPage.jsx` | `NotesManager` object |
| `src/components/notes/NoteCard.jsx` | Note card HTML |
| `src/components/notes/NoteForm.jsx` | Note add/edit form |

---

**Next:** [Chapter 13 — Shared Utilities](./13-shared-utilities.md)
