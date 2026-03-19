import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useModal } from '../../context/ModalContext';
import { useToast } from '../../context/ToastContext';
import { generateId } from '../../utils/helpers';
import './Mechanics.css';

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'combat', label: 'Combat' },
  { value: 'movement', label: 'Movement' },
  { value: 'progression', label: 'Progression' },
  { value: 'economy', label: 'Economy' },
  { value: 'social', label: 'Social' },
  { value: 'ui', label: 'UI' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_COLORS = {
  combat: '#ef4444',
  movement: '#3b82f6',
  progression: '#8b5cf6',
  economy: '#f59e0b',
  social: '#10b981',
  ui: '#6366f1',
  other: '#6b7280',
};

const STATUSES = [
  { value: 'concept', label: 'Concept' },
  { value: 'in-development', label: 'In Development' },
  { value: 'testing', label: 'Testing' },
  { value: 'complete', label: 'Complete' },
];

const COMPLEXITIES = [
  { value: 'simple', label: 'Simple' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'complex', label: 'Complex' },
];

const TEST_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
];

const STATUS_ORDER = { concept: 0, 'in-development': 1, testing: 2, complete: 3 };
const COMPLEXITY_ORDER = { simple: 0, moderate: 1, complex: 2 };

// ── Mechanic Form (rendered inside modal) ──────────────────────────────────────

function MechanicForm({ mechanicToEdit, onSubmit, onCancel }) {
  const isEdit = mechanicToEdit !== null;

  const [name, setName] = useState(isEdit ? mechanicToEdit.name : '');
  const [category, setCategory] = useState(isEdit ? mechanicToEdit.category : 'combat');
  const [description, setDescription] = useState(isEdit ? mechanicToEdit.description : '');
  const [rules, setRules] = useState(isEdit ? mechanicToEdit.rules : '');
  const [status, setStatus] = useState(isEdit ? mechanicToEdit.status : 'concept');
  const [complexity, setComplexity] = useState(isEdit ? mechanicToEdit.complexity : 'simple');
  const [tests, setTests] = useState(
    isEdit && mechanicToEdit.tests?.length ? mechanicToEdit.tests : []
  );
  const [prototypes, setPrototypes] = useState(
    isEdit && mechanicToEdit.prototypes?.length ? mechanicToEdit.prototypes : []
  );

  const handleAddTest = () => {
    setTests((prev) => [...prev, { name: '', description: '', status: 'pending' }]);
  };

  const handleRemoveTest = (index) => {
    setTests((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTestChange = (index, field, value) => {
    setTests((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const handleAddPrototype = () => {
    setPrototypes((prev) => [...prev, { name: '', description: '', code: '' }]);
  };

  const handleRemovePrototype = (index) => {
    setPrototypes((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePrototypeChange = (index, field, value) => {
    setPrototypes((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const cleanedTests = tests
      .filter((t) => t.name.trim())
      .map((t) => ({ name: t.name.trim(), description: t.description.trim(), status: t.status }));

    const cleanedPrototypes = prototypes
      .filter((p) => p.name.trim())
      .map((p) => ({
        name: p.name.trim(),
        description: p.description.trim(),
        code: p.code.trim(),
      }));

    onSubmit({
      id: isEdit ? mechanicToEdit.id : generateId(),
      name: trimmedName,
      category,
      description: description.trim(),
      rules: rules.trim(),
      status,
      complexity,
      tests: cleanedTests,
      prototypes: cleanedPrototypes,
      relatedItems: isEdit ? mechanicToEdit.relatedItems || [] : [],
      createdAt: isEdit ? mechanicToEdit.createdAt : new Date().toISOString(),
    });
  };

  return (
    <form className="modal-form mechanic-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit Mechanic' : 'Add New Mechanic'}</h3>

      <div className="form-group">
        <label htmlFor="mechanic-name">Name *</label>
        <input
          id="mechanic-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Jump System, Combat"
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="mechanic-category">Category</label>
          <select id="mechanic-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="mechanic-status">Status</label>
          <select id="mechanic-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="mechanic-complexity">Complexity</label>
          <select
            id="mechanic-complexity"
            value={complexity}
            onChange={(e) => setComplexity(e.target.value)}
          >
            {COMPLEXITIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="mechanic-description">Description</label>
        <textarea
          id="mechanic-description"
          rows="3"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe how this mechanic works..."
        />
      </div>

      <div className="form-group">
        <label htmlFor="mechanic-rules">Rules</label>
        <textarea
          id="mechanic-rules"
          rows="4"
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          placeholder="Detailed rules text..."
        />
      </div>

      {/* Dynamic Tests */}
      <div className="form-group">
        <label>Tests</label>
        <div className="dynamic-rows">
          {tests.map((test, i) => (
            <div className="dynamic-row" key={i}>
              <input
                type="text"
                value={test.name}
                onChange={(e) => handleTestChange(i, 'name', e.target.value)}
                placeholder="Test name"
              />
              <input
                type="text"
                value={test.description}
                onChange={(e) => handleTestChange(i, 'description', e.target.value)}
                placeholder="Test description"
              />
              <select
                value={test.status}
                onChange={(e) => handleTestChange(i, 'status', e.target.value)}
              >
                {TEST_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-danger btn-small"
                onClick={() => handleRemoveTest(i)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-secondary btn-small" onClick={handleAddTest}>
          + Add Test
        </button>
      </div>

      {/* Dynamic Prototypes */}
      <div className="form-group">
        <label>Prototypes</label>
        <div className="dynamic-rows">
          {prototypes.map((proto, i) => (
            <div className="dynamic-row prototype-row" key={i}>
              <input
                type="text"
                value={proto.name}
                onChange={(e) => handlePrototypeChange(i, 'name', e.target.value)}
                placeholder="Prototype name"
              />
              <input
                type="text"
                value={proto.description}
                onChange={(e) => handlePrototypeChange(i, 'description', e.target.value)}
                placeholder="Description"
              />
              <textarea
                rows="2"
                value={proto.code}
                onChange={(e) => handlePrototypeChange(i, 'code', e.target.value)}
                placeholder="Pseudocode / implementation"
              />
              <button
                type="button"
                className="btn btn-danger btn-small"
                onClick={() => handleRemovePrototype(i)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-secondary btn-small" onClick={handleAddPrototype}>
          + Add Prototype
        </button>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {isEdit ? 'Update' : 'Add'} Mechanic
        </button>
      </div>
    </form>
  );
}

// ── Mechanic Card ──────────────────────────────────────────────────────────────

function MechanicCard({ mechanic, onEdit, onDelete }) {
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const catColor = CATEGORY_COLORS[mechanic.category] || CATEGORY_COLORS.other;

  const testSummary = useMemo(() => {
    const tests = mechanic.tests || [];
    return {
      pass: tests.filter((t) => t.status === 'pass').length,
      fail: tests.filter((t) => t.status === 'fail').length,
      pending: tests.filter((t) => t.status === 'pending').length,
      total: tests.length,
    };
  }, [mechanic.tests]);

  const statusLabel =
    STATUSES.find((s) => s.value === mechanic.status)?.label || mechanic.status;
  const complexityLabel =
    COMPLEXITIES.find((c) => c.value === mechanic.complexity)?.label || mechanic.complexity;
  const categoryLabel =
    CATEGORIES.find((c) => c.value === mechanic.category)?.label || mechanic.category;

  const shouldTruncateRules = mechanic.rules && mechanic.rules.length > 120;

  return (
    <div className="mechanic-card">
      <div className="mechanic-card-header">
        <div className="mechanic-card-title-row">
          <h4 className="mechanic-card-name">{mechanic.name}</h4>
          <div className="mechanic-card-badges">
            <span
              className="mechanic-badge category-badge"
              style={{ backgroundColor: catColor }}
            >
              {categoryLabel}
            </span>
            <span className={`mechanic-badge status-badge status-${mechanic.status}`}>
              {statusLabel}
            </span>
            <span className={`mechanic-badge complexity-badge complexity-${mechanic.complexity}`}>
              {complexityLabel}
            </span>
          </div>
        </div>
        <div className="mechanic-card-actions">
          <button className="btn btn-small btn-secondary" onClick={() => onEdit(mechanic)}>
            Edit
          </button>
          <button className="btn btn-small btn-danger" onClick={() => onDelete(mechanic)}>
            Delete
          </button>
        </div>
      </div>

      {mechanic.description && (
        <p className="mechanic-card-description">{mechanic.description}</p>
      )}

      {mechanic.rules && (
        <div className="mechanic-card-rules">
          <strong>Rules:</strong>
          <p>
            {shouldTruncateRules && !rulesExpanded
              ? mechanic.rules.slice(0, 120) + '…'
              : mechanic.rules}
          </p>
          {shouldTruncateRules && (
            <button
              className="btn-link"
              onClick={() => setRulesExpanded((prev) => !prev)}
            >
              {rulesExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {testSummary.total > 0 && (
        <div className="mechanic-card-tests">
          <span className="test-count test-pass">✓ {testSummary.pass} pass</span>
          <span className="test-count test-fail">✗ {testSummary.fail} fail</span>
          <span className="test-count test-pending">◌ {testSummary.pending} pending</span>
        </div>
      )}
    </div>
  );
}

// ── Main Mechanics Component ───────────────────────────────────────────────────

export default function Mechanics() {
  const { mechanics, addItem, updateItem, deleteItem } = useApp();
  const { openModal, closeModal } = useModal();
  const { showToast, showConfirm } = useToast();

  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');

  // Filter and sort mechanics
  const filteredMechanics = useMemo(() => {
    let result = [...mechanics];

    if (categoryFilter) {
      result = result.filter((m) => m.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'status':
          return (
            (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
          );
        case 'complexity':
          return (
            (COMPLEXITY_ORDER[a.complexity] ?? 99) -
            (COMPLEXITY_ORDER[b.complexity] ?? 99)
          );
        case 'name':
        default:
          return (a.name || '').localeCompare(b.name || '');
      }
    });

    return result;
  }, [mechanics, categoryFilter, searchQuery, sortBy]);

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  const handleFormSubmit = useCallback(
    (formData) => {
      const existing = mechanics.find((m) => m.id === formData.id);
      if (existing) {
        updateItem('mechanics', formData.id, formData);
        showToast('Mechanic updated', 'success');
      } else {
        addItem('mechanics', formData);
        showToast('Mechanic added', 'success');
      }
      closeModal();
    },
    [mechanics, addItem, updateItem, closeModal, showToast]
  );

  const openMechanicModal = useCallback(
    (mechanicToEdit = null) => {
      openModal(
        <MechanicForm
          mechanicToEdit={mechanicToEdit}
          onSubmit={handleFormSubmit}
          onCancel={closeModal}
        />
      );
    },
    [openModal, closeModal, handleFormSubmit]
  );

  const handleDelete = useCallback(
    (mechanic) => {
      showConfirm(`Delete "${mechanic.name}"? This cannot be undone.`, () => {
        deleteItem('mechanics', mechanic.id);
        showToast('Mechanic deleted', 'success');
      });
    },
    [deleteItem, showToast, showConfirm]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mechanics-section">
      {/* Toolbar */}
      <div className="mechanics-toolbar">
        <button className="btn btn-primary" onClick={() => openMechanicModal()}>
          + Add Mechanic
        </button>
      </div>

      {/* Filter / Sort Bar */}
      <div className="mechanics-filters">
        <select
          className="filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <input
          className="filter-search"
          type="text"
          placeholder="Search mechanics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select
          className="filter-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name">Sort by Name</option>
          <option value="status">Sort by Status</option>
          <option value="complexity">Sort by Complexity</option>
        </select>
      </div>

      {/* Cards or Empty State */}
      {filteredMechanics.length === 0 ? (
        <div className="mechanics-empty">
          <p>
            {mechanics.length === 0
              ? 'No mechanics yet. Click "Add Mechanic" to get started.'
              : 'No mechanics match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="mechanics-grid">
          {filteredMechanics.map((m) => (
            <MechanicCard
              key={m.id}
              mechanic={m}
              onEdit={openMechanicModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
