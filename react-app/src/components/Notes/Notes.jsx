import { useState, useCallback, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useModal } from '../../context/ModalContext';
import { useToast } from '../../context/ToastContext';
import { generateId, parseMarkdown } from '../../utils/helpers';
import './Notes.css';

// ── Preset colors for note cards ───────────────────────────────────────────────

const PRESET_COLORS = [
  { value: '#ffffff', label: 'White' },
  { value: '#FFB3B3', label: 'Red' },
  { value: '#FFD9B3', label: 'Orange' },
  { value: '#FFFAB3', label: 'Yellow' },
  { value: '#B3FFB3', label: 'Green' },
  { value: '#B3D9FF', label: 'Blue' },
  { value: '#D5B3FF', label: 'Purple' },
  { value: '#FFB3E6', label: 'Pink' },
];

const SORT_OPTIONS = [
  { value: 'modified', label: 'Last Modified' },
  { value: 'created', label: 'Date Created' },
  { value: 'title', label: 'Title (A-Z)' },
  { value: 'category', label: 'Category' },
];

// ── Note Form (rendered inside modal) ──────────────────────────────────────────

function NoteForm({ noteToEdit, categories, onSubmit, onCancel }) {
  const isEdit = noteToEdit !== null;

  const [title, setTitle] = useState(isEdit ? noteToEdit.title : '');
  const [category, setCategory] = useState(isEdit ? noteToEdit.category : categories[0] || 'Other');
  const [content, setContent] = useState(isEdit ? noteToEdit.content || '' : '');
  const [tagsInput, setTagsInput] = useState(isEdit ? (noteToEdit.tags || []).join(', ') : '');
  const [color, setColor] = useState(isEdit ? noteToEdit.color || '#ffffff' : '#ffffff');
  const [pinned, setPinned] = useState(isEdit ? noteToEdit.pinned : false);
  const [checklist, setChecklist] = useState(
    isEdit && noteToEdit.checklist ? noteToEdit.checklist.map((c) => ({ ...c })) : []
  );
  const [reminderEnabled, setReminderEnabled] = useState(isEdit ? noteToEdit.reminderEnabled || false : false);
  const [reminderDate, setReminderDate] = useState(isEdit ? noteToEdit.reminderDate || '' : '');
  const [reminderTime, setReminderTime] = useState(isEdit ? noteToEdit.reminderTime || '' : '');

  const handleAddChecklistItem = () => {
    setChecklist((prev) => [...prev, { text: '', completed: false }]);
  };

  const handleRemoveChecklistItem = (index) => {
    setChecklist((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChecklistTextChange = (index, text) => {
    setChecklist((prev) => prev.map((item, i) => (i === index ? { ...item, text } : item)));
  };

  const handleChecklistToggle = (index) => {
    setChecklist((prev) =>
      prev.map((item, i) => (i === index ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t);

    const filteredChecklist = checklist.filter((item) => item.text.trim());

    const noteData = {
      id: isEdit ? noteToEdit.id : generateId(),
      title: title.trim(),
      content,
      category,
      tags,
      color,
      pinned,
      archived: isEdit ? noteToEdit.archived || false : false,
      createdAt: isEdit ? noteToEdit.createdAt : new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      checklist: filteredChecklist.length > 0 ? filteredChecklist : null,
      drawing: isEdit ? noteToEdit.drawing || null : null,
      reminderEnabled,
      reminderDate: reminderEnabled ? reminderDate : '',
      reminderTime: reminderEnabled ? reminderTime : '',
      reminderDismissed: isEdit ? noteToEdit.reminderDismissed || false : false,
      relatedItems: isEdit ? noteToEdit.relatedItems || [] : [],
    };

    onSubmit(noteData, isEdit);
  };

  return (
    <form className="note-modal-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit Note' : 'New Note'}</h3>

      <div className="form-group">
        <label htmlFor="noteTitle">Title *</label>
        <input
          id="noteTitle"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter note title"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="noteCategory">Category</label>
          <select id="noteCategory" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="noteTags">Tags (comma-separated)</label>
          <input
            id="noteTags"
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="tag1, tag2, tag3"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="noteContent">Content</label>
        <textarea
          id="noteContent"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note here... Supports markdown!"
        />
      </div>

      <div className="form-group">
        <label>Color</label>
        <div className="note-color-picker">
          {PRESET_COLORS.map((c) => (
            <div
              key={c.value}
              className={`note-color-option${color === c.value ? ' selected' : ''}`}
              style={{ backgroundColor: c.value }}
              title={c.label}
              onClick={() => setColor(c.value)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setColor(c.value)}
            >
              {color === c.value ? '✓' : ''}
            </div>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Checklist</label>
        <div className="checklist-editor">
          {checklist.map((item, index) => (
            <div key={index} className="checklist-item-row">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => handleChecklistToggle(index)}
              />
              <input
                type="text"
                value={item.text}
                onChange={(e) => handleChecklistTextChange(index, e.target.value)}
                placeholder="Item text"
              />
              <button
                type="button"
                className="btn-remove-checklist"
                onClick={() => handleRemoveChecklistItem(index)}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn-add-checklist" onClick={handleAddChecklistItem}>
          + Add Checklist Item
        </button>
      </div>

      <div className="form-group">
        <label className="reminder-toggle">
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
          />
          <span>Set Reminder</span>
        </label>
        {reminderEnabled && (
          <div className="reminder-fields">
            <div className="form-group">
              <label htmlFor="noteReminderDate">Date</label>
              <input
                id="noteReminderDate"
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="noteReminderTime">Time</label>
              <input
                id="noteReminderTime"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="reminder-toggle">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          <span>Pin this note</span>
        </label>
      </div>

      <div className="note-form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {isEdit ? 'Update' : 'Create'} Note
        </button>
      </div>
    </form>
  );
}

// ── Note Card Component ────────────────────────────────────────────────────────

function NoteCard({ note, onEdit, onPin, onDuplicate, onArchive, onDelete }) {
  const contentPreview = useMemo(() => {
    if (!note.content) return '';
    const truncated = note.content.length > 200 ? note.content.substring(0, 200) + '…' : note.content;
    return parseMarkdown(truncated);
  }, [note.content]);

  const checklistProgress = useMemo(() => {
    if (!note.checklist || note.checklist.length === 0) return null;
    const completed = note.checklist.filter((i) => i.completed).length;
    const total = note.checklist.length;
    const pct = total > 0 ? (completed / total) * 100 : 0;
    return { completed, total, pct };
  }, [note.checklist]);

  const reminderInfo = useMemo(() => {
    if (!note.reminderEnabled || !note.reminderDate || note.reminderDismissed) return null;
    const dt = new Date(`${note.reminderDate}T${note.reminderTime || '00:00'}`);
    const isOverdue = dt < new Date();
    return { isOverdue, label: isOverdue ? 'Overdue' : note.reminderDate };
  }, [note.reminderEnabled, note.reminderDate, note.reminderTime, note.reminderDismissed]);

  const formattedDate = useMemo(() => {
    const d = new Date(note.modifiedAt || note.createdAt);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }, [note.modifiedAt, note.createdAt]);

  const cardStyle = note.color && note.color !== '#ffffff' ? { backgroundColor: note.color } : {};

  return (
    <div className={`note-card${note.pinned ? ' pinned' : ''}`} style={cardStyle}>
      {note.pinned && <div className="note-pin-indicator" title="Pinned">📌</div>}

      <div className="note-card-header">
        <h3 className="note-card-title">{note.title}</h3>
        <div className="note-card-actions">
          <button className="note-action-btn" onClick={() => onEdit(note)} title="Edit">✏️</button>
          <button className="note-action-btn" onClick={() => onPin(note.id)} title={note.pinned ? 'Unpin' : 'Pin'}>
            {note.pinned ? '📌' : '📍'}
          </button>
          <button className="note-action-btn" onClick={() => onDuplicate(note.id)} title="Duplicate">📋</button>
          <button className="note-action-btn" onClick={() => onArchive(note.id)} title={note.archived ? 'Unarchive' : 'Archive'}>
            📦
          </button>
          <button className="note-action-btn danger" onClick={() => onDelete(note.id)} title="Delete">🗑️</button>
        </div>
      </div>

      {contentPreview && (
        <div className="note-card-preview" dangerouslySetInnerHTML={{ __html: contentPreview }} />
      )}

      {checklistProgress && (
        <div className="note-checklist-progress">
          <span>{checklistProgress.completed}/{checklistProgress.total} completed</span>
          <div className="checklist-bar">
            <div className="checklist-bar-fill" style={{ width: `${checklistProgress.pct}%` }} />
          </div>
        </div>
      )}

      {reminderInfo && (
        <div className={`note-reminder-indicator${reminderInfo.isOverdue ? ' overdue' : ''}`}>
          ⏰ {reminderInfo.label}
        </div>
      )}

      <div className="note-card-meta">
        <span className="note-category-badge">{note.category}</span>
        {note.tags && note.tags.length > 0 && (
          <div className="note-tags">
            {note.tags.map((tag) => (
              <span key={tag} className="note-tag-chip">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="note-card-footer">
        <span className="note-card-date">{formattedDate}</span>
      </div>
    </div>
  );
}

// ── Main Notes Component ───────────────────────────────────────────────────────

export default function Notes() {
  const { notes, noteCategories, addItem, updateItem, deleteItem } = useApp();
  const { openModal, closeModal } = useModal();
  const { showToast, showConfirm } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('modified');
  const [showArchived, setShowArchived] = useState(false);

  // ── Filtered & sorted notes ────────────────────────────────────────────────

  const filteredNotes = useMemo(() => {
    let result = notes.filter((n) => (showArchived ? true : !n.archived));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.content && n.content.toLowerCase().includes(q)) ||
          (n.tags && n.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    if (categoryFilter) {
      result = result.filter((n) => n.category === categoryFilter);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'modified':
        default:
          return new Date(b.modifiedAt) - new Date(a.modifiedAt);
      }
    });

    // Pinned notes always first
    result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

    return result;
  }, [notes, searchQuery, categoryFilter, sortBy, showArchived]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleFormSubmit = useCallback(
    (noteData, isEdit) => {
      if (isEdit) {
        updateItem('notes', noteData.id, noteData);
        showToast('Note updated!', 'success');
      } else {
        addItem('notes', noteData);
        showToast('Note created!', 'success');
      }
      closeModal();
    },
    [addItem, updateItem, closeModal, showToast]
  );

  const openNoteModal = useCallback(
    (noteToEdit = null) => {
      openModal(
        <NoteForm
          noteToEdit={noteToEdit}
          categories={noteCategories}
          onSubmit={handleFormSubmit}
          onCancel={closeModal}
        />
      );
    },
    [openModal, closeModal, handleFormSubmit, noteCategories]
  );

  const handlePin = useCallback(
    (id) => {
      const note = notes.find((n) => n.id === id);
      if (note) {
        updateItem('notes', id, { pinned: !note.pinned, modifiedAt: new Date().toISOString() });
        showToast(note.pinned ? 'Note unpinned' : 'Note pinned', 'success');
      }
    },
    [notes, updateItem, showToast]
  );

  const handleDuplicate = useCallback(
    (id) => {
      const note = notes.find((n) => n.id === id);
      if (note) {
        const duplicate = {
          ...note,
          id: generateId(),
          title: note.title + ' (Copy)',
          pinned: false,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
        };
        addItem('notes', duplicate);
        showToast('Note duplicated!', 'success');
      }
    },
    [notes, addItem, showToast]
  );

  const handleArchive = useCallback(
    (id) => {
      const note = notes.find((n) => n.id === id);
      if (note) {
        updateItem('notes', id, { archived: !note.archived, modifiedAt: new Date().toISOString() });
        showToast(note.archived ? 'Note unarchived' : 'Note archived', 'success');
      }
    },
    [notes, updateItem, showToast]
  );

  const handleDelete = useCallback(
    (id) => {
      showConfirm('Permanently delete this note? This cannot be undone.', () => {
        deleteItem('notes', id);
        showToast('Note deleted', 'success');
      });
    },
    [deleteItem, showToast, showConfirm]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="notes-section">
      <div className="notes-toolbar">
        <button className="btn btn-primary" onClick={() => openNoteModal()}>
          + Add Note
        </button>
      </div>

      <div className="notes-filter-bar">
        <input
          type="text"
          placeholder="Search notes…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {noteCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <label>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show Archived
        </label>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="notes-empty">
          <div className="notes-empty-icon">📝</div>
          <h3>No notes found</h3>
          <p>{notes.length === 0 ? 'Create your first note to get started!' : 'Try adjusting your filters.'}</p>
        </div>
      ) : (
        <div className="notes-grid">
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={openNoteModal}
              onPin={handlePin}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
