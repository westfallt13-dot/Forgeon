import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useModal } from '../../context/ModalContext';
import { useToast } from '../../context/ToastContext';
import { generateId, formatDate, isDateBeforeToday } from '../../utils/helpers';
import './Milestones.css';

// ── Milestone Form (rendered inside the modal) ─────────────────────────────────

function MilestoneForm({ milestoneToEdit, onSubmit, onCancel }) {
  const isEdit = milestoneToEdit !== null;

  const [title, setTitle] = useState(isEdit ? milestoneToEdit.title : '');
  const [description, setDescription] = useState(isEdit ? milestoneToEdit.description : '');
  const [dueDate, setDueDate] = useState(isEdit && milestoneToEdit.dueDate ? milestoneToEdit.dueDate : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const milestoneData = {
      title: trimmedTitle,
      description: description.trim(),
      dueDate,
    };

    if (isEdit) {
      onSubmit({ ...milestoneData, id: milestoneToEdit.id });
    } else {
      onSubmit({
        ...milestoneData,
        id: generateId(),
        completed: false,
        createdAt: new Date().toISOString(),
      });
    }
  };

  return (
    <form className="modal-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit Milestone' : 'Add New Milestone'}</h3>

      <div className="form-group">
        <label htmlFor="milestoneTitle">Title *</label>
        <input
          type="text"
          id="milestoneTitle"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter milestone title"
          autoFocus
        />
      </div>

      <div className="form-group">
        <label htmlFor="milestoneDescription">Description</label>
        <textarea
          id="milestoneDescription"
          rows="3"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe this milestone"
        />
      </div>

      <div className="form-group">
        <label htmlFor="milestoneDueDate">Due Date</label>
        <input
          type="date"
          id="milestoneDueDate"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {isEdit ? 'Update' : 'Add'} Milestone
        </button>
      </div>
    </form>
  );
}

// ── Milestone Card ─────────────────────────────────────────────────────────────

function MilestoneCard({ milestone, onToggle, onEdit, onDelete }) {
  const isOverdue =
    milestone.dueDate && isDateBeforeToday(milestone.dueDate) && !milestone.completed;

  return (
    <div
      className={`milestone-card${milestone.completed ? ' completed' : ''}${isOverdue ? ' overdue' : ''}`}
    >
      <input
        type="checkbox"
        className="milestone-checkbox"
        checked={milestone.completed}
        onChange={() => onToggle(milestone.id)}
        aria-label={`Mark milestone as ${milestone.completed ? 'incomplete' : 'complete'}`}
      />

      <div className="milestone-content">
        <div className="milestone-title">{milestone.title}</div>
        {milestone.description && (
          <div className="milestone-description">{milestone.description}</div>
        )}
        <div className="milestone-meta">
          {milestone.dueDate && (
            <span className={`milestone-badge${isOverdue ? ' overdue-badge' : ''}`}>
              {isOverdue ? '⚠ ' : '📅 '}
              {formatDate(milestone.dueDate)}
            </span>
          )}
          <span className={`milestone-badge status-${milestone.completed ? 'complete' : 'incomplete'}`}>
            {milestone.completed ? '✓ Complete' : '○ Incomplete'}
          </span>
        </div>
      </div>

      <div className="milestone-actions">
        <button
          className="btn btn-small btn-secondary"
          onClick={() => onEdit(milestone)}
        >
          Edit
        </button>
        <button
          className="btn btn-small btn-danger"
          onClick={() => onDelete(milestone.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Main Milestones Component ──────────────────────────────────────────────────

export default function Milestones() {
  const { milestones, addItem, updateItem, deleteItem } = useApp();
  const { openModal, closeModal } = useModal();
  const { showToast, showConfirm } = useToast();

  const [filter, setFilter] = useState('all');

  // ── Sort by due date (soonest first), then filter ────────────────────────────

  const filteredMilestones = useMemo(() => {
    let result = [...milestones];

    if (filter === 'active') {
      result = result.filter((m) => !m.completed);
    } else if (filter === 'completed') {
      result = result.filter((m) => m.completed);
    }

    result.sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return dateA - dateB;
    });

    return result;
  }, [milestones, filter]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleFormSubmit = useCallback(
    (milestoneData) => {
      const existing = milestones.find((m) => m.id === milestoneData.id);
      if (existing) {
        const { id, ...updates } = milestoneData;
        updateItem('milestones', id, updates);
        showToast('Milestone updated successfully', 'success');
      } else {
        addItem('milestones', milestoneData);
        showToast('Milestone added successfully', 'success');
      }
      closeModal();
    },
    [milestones, addItem, updateItem, closeModal, showToast]
  );

  const openMilestoneModal = useCallback(
    (milestoneToEdit = null) => {
      openModal(
        <MilestoneForm
          milestoneToEdit={milestoneToEdit}
          onSubmit={handleFormSubmit}
          onCancel={closeModal}
        />
      );
    },
    [openModal, closeModal, handleFormSubmit]
  );

  const handleToggle = useCallback(
    (id) => {
      const milestone = milestones.find((m) => m.id === id);
      if (milestone) {
        updateItem('milestones', id, { completed: !milestone.completed });
        showToast(
          milestone.completed ? 'Milestone marked incomplete' : 'Milestone completed!',
          'success'
        );
      }
    },
    [milestones, updateItem, showToast]
  );

  const handleDelete = useCallback(
    (id) => {
      showConfirm('Are you sure you want to delete this milestone?', () => {
        deleteItem('milestones', id);
        showToast('Milestone deleted', 'success');
      });
    },
    [deleteItem, showConfirm, showToast]
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="milestones-section">
      <div className="milestones-toolbar">
        <button className="btn btn-primary" onClick={() => openMilestoneModal()}>
          + Add Milestone
        </button>

        <div className="milestones-controls">
          <div className="milestones-filters">
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
        </div>
      </div>

      <div className="milestones-list">
        {filteredMilestones.length === 0 ? (
          <div className="milestones-empty">
            <p>
              {filter === 'all'
                ? 'No milestones yet. Click "Add Milestone" to create one!'
                : filter === 'active'
                  ? 'No active milestones. Great progress!'
                  : 'No completed milestones yet.'}
            </p>
          </div>
        ) : (
          filteredMilestones.map((milestone) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              onToggle={handleToggle}
              onEdit={openMilestoneModal}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
