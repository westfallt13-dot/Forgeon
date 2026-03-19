import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useModal } from '../../context/ModalContext';
import { useToast } from '../../context/ToastContext';
import { generateId } from '../../utils/helpers';
import './Classes.css';

// ── Constants ──────────────────────────────────────────────────────────────────

const CLASS_TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'character', label: 'Character' },
  { value: 'instance', label: 'Instance' },
];

const EMPTY_ATTRIBUTE = { name: '', value: 10, minValue: '', maxValue: '' };
const EMPTY_SKILL = { name: '', bonus: '', category: '' };
const EMPTY_FORMULA = { name: '', expression: '' };

// ── Class Form (rendered inside the modal) ─────────────────────────────────────

function ClassForm({ classToEdit, onSubmit, onCancel, allClasses }) {
  const isEdit = classToEdit !== null;

  const [name, setName] = useState(isEdit ? classToEdit.name : '');
  const [classType, setClassType] = useState(isEdit ? classToEdit.classType : 'character');
  const [description, setDescription] = useState(isEdit ? classToEdit.description || '' : '');
  const [parentId, setParentId] = useState(isEdit ? classToEdit.parentId || '' : '');

  const [attributes, setAttributes] = useState(
    isEdit && classToEdit.attributes?.length > 0
      ? classToEdit.attributes.map((a) => ({ ...a }))
      : [{ ...EMPTY_ATTRIBUTE }]
  );
  const [skills, setSkills] = useState(
    isEdit && classToEdit.skills?.length > 0
      ? classToEdit.skills.map((s) => ({ ...s }))
      : [{ ...EMPTY_SKILL }]
  );
  const [formulas, setFormulas] = useState(
    isEdit && classToEdit.formulas?.length > 0
      ? classToEdit.formulas.map((f) => ({ ...f }))
      : [{ ...EMPTY_FORMULA }]
  );

  // Parent class options: exclude the class being edited
  const parentOptions = allClasses.filter((c) => !isEdit || c.id !== classToEdit.id);

  // ── Dynamic row helpers ──────────────────────────────────────────────────────

  const updateRow = (setter, index, field, value) => {
    setter((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addRow = (setter, template) => {
    setter((prev) => [...prev, { ...template }]);
  };

  const removeRow = (setter, index) => {
    setter((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const cleanAttributes = attributes
      .filter((a) => a.name.trim())
      .map((a) => ({
        name: a.name.trim(),
        value: Number(a.value) || 0,
        minValue: a.minValue !== '' ? Number(a.minValue) : undefined,
        maxValue: a.maxValue !== '' ? Number(a.maxValue) : undefined,
      }));

    const cleanSkills = skills
      .filter((s) => s.name.trim())
      .map((s) => ({
        name: s.name.trim(),
        bonus: s.bonus !== '' ? Number(s.bonus) : 0,
        category: s.category.trim(),
      }));

    const cleanFormulas = formulas
      .filter((f) => f.name.trim() && f.expression.trim())
      .map((f) => ({
        name: f.name.trim(),
        expression: f.expression.trim(),
      }));

    onSubmit({
      id: isEdit ? classToEdit.id : generateId(),
      name: trimmedName,
      classType,
      description: description.trim(),
      parentId: parentId || null,
      attributes: cleanAttributes,
      skills: cleanSkills,
      formulas: cleanFormulas,
      progression: isEdit ? classToEdit.progression || [] : [],
      relatedItems: isEdit ? classToEdit.relatedItems || [] : [],
      createdAt: isEdit ? classToEdit.createdAt : new Date().toISOString(),
    });
  };

  return (
    <form className="modal-form class-modal-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit Class' : 'Add New Class'}</h3>

      {/* Name */}
      <div className="form-group">
        <label htmlFor="className">Class Name *</label>
        <input
          type="text"
          id="className"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Warrior, Mage"
          autoFocus
        />
      </div>

      {/* Class Type (radio) */}
      <div className="form-group">
        <label>Class Type *</label>
        <div className="class-type-radios">
          <label className="radio-label">
            <input
              type="radio"
              name="classType"
              value="character"
              checked={classType === 'character'}
              onChange={(e) => setClassType(e.target.value)}
            />
            <span>Character Class (RPG)</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="classType"
              value="instance"
              checked={classType === 'instance'}
              onChange={(e) => setClassType(e.target.value)}
            />
            <span>Instance Class (OOP)</span>
          </label>
        </div>
        <small className="form-hint">
          Character: RPG classes (Warrior, Mage). Instance: Object hierarchy (Person, NPC, Enemy)
        </small>
      </div>

      {/* Description */}
      <div className="form-group">
        <label htmlFor="classDescription">Description</label>
        <textarea
          id="classDescription"
          rows="2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe this class..."
        />
      </div>

      {/* Parent class dropdown (for inheritance) */}
      <div className="form-group">
        <label htmlFor="classParent">Parent Class</label>
        <select id="classParent" value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">None (Root Class)</option>
          {parentOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* ── Attributes ──────────────────────────────────────────────────────── */}
      <div className="form-group">
        <label>{classType === 'instance' ? 'Fields' : 'Attributes'}</label>
        <div className="dynamic-rows">
          {attributes.map((attr, i) => (
            <div key={i} className="dynamic-row attr-row">
              <input
                type="text"
                placeholder={classType === 'instance' ? 'Field name' : 'Attribute name'}
                value={attr.name}
                onChange={(e) => updateRow(setAttributes, i, 'name', e.target.value)}
              />
              <input
                type={classType === 'instance' ? 'text' : 'number'}
                placeholder={classType === 'instance' ? 'Default value' : 'Value'}
                value={attr.value}
                onChange={(e) => updateRow(setAttributes, i, 'value', e.target.value)}
                className="narrow-input"
              />
              <input
                type="number"
                placeholder="Min"
                value={attr.minValue}
                onChange={(e) => updateRow(setAttributes, i, 'minValue', e.target.value)}
                className="narrow-input"
              />
              <input
                type="number"
                placeholder="Max"
                value={attr.maxValue}
                onChange={(e) => updateRow(setAttributes, i, 'maxValue', e.target.value)}
                className="narrow-input"
              />
              <button
                type="button"
                className="btn-remove-row"
                onClick={() => removeRow(setAttributes, i)}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-small btn-secondary"
          onClick={() => addRow(setAttributes, EMPTY_ATTRIBUTE)}
        >
          + Add {classType === 'instance' ? 'Field' : 'Attribute'}
        </button>
      </div>

      {/* ── Skills ──────────────────────────────────────────────────────────── */}
      <div className="form-group">
        <label>{classType === 'instance' ? 'Methods' : 'Skills'}</label>
        <div className="dynamic-rows">
          {skills.map((skill, i) => (
            <div key={i} className="dynamic-row skill-row">
              <input
                type="text"
                placeholder={classType === 'instance' ? 'Method name' : 'Skill name'}
                value={skill.name}
                onChange={(e) => updateRow(setSkills, i, 'name', e.target.value)}
              />
              <input
                type={classType === 'instance' ? 'text' : 'number'}
                placeholder={classType === 'instance' ? 'Parameters' : 'Bonus/Level'}
                value={skill.bonus}
                onChange={(e) => updateRow(setSkills, i, 'bonus', e.target.value)}
                className="narrow-input"
              />
              <input
                type="text"
                placeholder={classType === 'instance' ? 'Return type' : 'Category'}
                value={skill.category}
                onChange={(e) => updateRow(setSkills, i, 'category', e.target.value)}
              />
              <button
                type="button"
                className="btn-remove-row"
                onClick={() => removeRow(setSkills, i)}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-small btn-secondary"
          onClick={() => addRow(setSkills, EMPTY_SKILL)}
        >
          + Add {classType === 'instance' ? 'Method' : 'Skill'}
        </button>
      </div>

      {/* ── Formulas ────────────────────────────────────────────────────────── */}
      <div className="form-group">
        <label>{classType === 'instance' ? 'Computed Properties' : 'Formulas'}</label>
        <div className="dynamic-rows">
          {formulas.map((formula, i) => (
            <div key={i} className="dynamic-row formula-row">
              <input
                type="text"
                placeholder={classType === 'instance' ? 'Property name' : 'Stat name (e.g., Max HP)'}
                value={formula.name}
                onChange={(e) => updateRow(setFormulas, i, 'name', e.target.value)}
              />
              <span className="formula-equals">=</span>
              <input
                type="text"
                placeholder={
                  classType === 'instance'
                    ? 'Expression'
                    : 'Formula (e.g., strength * 10 + level * 5)'
                }
                value={formula.expression}
                onChange={(e) => updateRow(setFormulas, i, 'expression', e.target.value)}
              />
              <button
                type="button"
                className="btn-remove-row"
                onClick={() => removeRow(setFormulas, i)}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-small btn-secondary"
          onClick={() => addRow(setFormulas, EMPTY_FORMULA)}
        >
          + Add {classType === 'instance' ? 'Computed Property' : 'Formula'}
        </button>
      </div>

      {/* ── Form actions ────────────────────────────────────────────────────── */}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {isEdit ? 'Update' : 'Add'} Class
        </button>
      </div>
    </form>
  );
}

// ── Class Card ─────────────────────────────────────────────────────────────────

function ClassCard({ classObj, parentName, onEdit, onDelete }) {
  return (
    <div className="class-card">
      <div className="class-card-header">
        <div className="class-card-info">
          <div className="class-card-title">
            <strong>{classObj.name}</strong>
            <span className={`class-type-badge ${classObj.classType}`}>
              {classObj.classType === 'character' ? 'Character' : 'Instance'}
            </span>
            {classObj.parentId ? (
              <span className="class-badge child">Child Class</span>
            ) : (
              <span className="class-badge root">Root Class</span>
            )}
          </div>
          {classObj.description && (
            <div className="class-card-description">{classObj.description}</div>
          )}
          {parentName && (
            <div className="class-parent-info">
              Inherits from: <strong>{parentName}</strong>
            </div>
          )}
        </div>
        <div className="class-card-actions">
          <button className="btn btn-small btn-secondary" onClick={() => onEdit(classObj)}>
            Edit
          </button>
          <button className="btn btn-small btn-danger" onClick={() => onDelete(classObj.id)}>
            Delete
          </button>
        </div>
      </div>

      <div className="class-card-details">
        {/* Attributes */}
        {classObj.attributes?.length > 0 && (
          <div className="class-detail-section">
            <strong className="detail-label">
              {classObj.classType === 'instance' ? 'Fields' : 'Attributes'}:
            </strong>
            <div className="detail-badges">
              {classObj.attributes.map((attr, i) => (
                <span key={i} className="attribute-badge">
                  {attr.name}: {attr.value}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {classObj.skills?.length > 0 && (
          <div className="class-detail-section">
            <strong className="detail-label">
              {classObj.classType === 'instance' ? 'Methods' : 'Skills'} ({classObj.skills.length}):
            </strong>
            <div className="detail-badges">
              {classObj.skills.map((skill, i) => (
                <span key={i} className="skill-badge">
                  <span className="skill-badge-name">{skill.name}</span>
                  {skill.bonus !== 0 && skill.bonus !== '' && (
                    <span className="skill-badge-bonus">
                      {classObj.classType === 'instance' ? skill.bonus : `+${skill.bonus}`}
                    </span>
                  )}
                  {skill.category && (
                    <span className="skill-badge-category">{skill.category}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Formulas */}
        {classObj.formulas?.length > 0 && (
          <div className="class-detail-section">
            <strong className="detail-label">
              {classObj.classType === 'instance' ? 'Computed' : 'Formulas'}:
            </strong>
            <ul className="formulas-list">
              {classObj.formulas.map((formula, i) => (
                <li key={i}>
                  <code>
                    {formula.name} = {formula.expression}
                  </code>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Classes Component ─────────────────────────────────────────────────────

export default function Classes() {
  const { classes, addItem, updateItem, deleteItem } = useApp();
  const { openModal, closeModal } = useModal();
  const { showToast, showConfirm } = useToast();

  const [typeFilter, setTypeFilter] = useState('all');

  // Build a lookup map for parent names
  const parentNameMap = useMemo(() => {
    const map = {};
    classes.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [classes]);

  // ── Filter ───────────────────────────────────────────────────────────────────

  const filteredClasses = useMemo(() => {
    if (typeFilter === 'all') return [...classes];
    return classes.filter((c) => c.classType === typeFilter);
  }, [classes, typeFilter]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleFormSubmit = useCallback(
    (formData) => {
      const existing = classes.find((c) => c.id === formData.id);
      if (existing) {
        const { id, ...updates } = formData;
        updateItem('classes', id, updates);
        showToast('Class updated successfully', 'success');
      } else {
        addItem('classes', formData);
        showToast('Class added successfully', 'success');
      }
      closeModal();
    },
    [classes, addItem, updateItem, closeModal, showToast]
  );

  const openClassModal = useCallback(
    (classToEdit = null) => {
      openModal(
        <ClassForm
          classToEdit={classToEdit}
          onSubmit={handleFormSubmit}
          onCancel={closeModal}
          allClasses={classes}
        />
      );
    },
    [openModal, closeModal, handleFormSubmit, classes]
  );

  const handleDelete = useCallback(
    (id) => {
      const cls = classes.find((c) => c.id === id);
      const children = classes.filter((c) => c.parentId === id);
      const childWarning =
        children.length > 0
          ? ` This class has ${children.length} child class(es) that will become root classes.`
          : '';

      showConfirm(
        `Are you sure you want to delete "${cls?.name || 'this class'}"?${childWarning}`,
        () => {
          // Unparent any child classes
          children.forEach((child) => {
            updateItem('classes', child.id, { parentId: null });
          });
          deleteItem('classes', id);
          showToast('Class deleted', 'success');
        }
      );
    },
    [classes, deleteItem, updateItem, showConfirm, showToast]
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="classes-section">
      <div className="classes-toolbar">
        <button className="btn btn-primary" onClick={() => openClassModal()}>
          + Add Class
        </button>

        <div className="classes-filters">
          {CLASS_TYPE_FILTERS.map((t) => (
            <button
              key={t.value}
              className={`filter-btn${typeFilter === t.value ? ' active' : ''}`}
              onClick={() => setTypeFilter(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="classes-list">
        {filteredClasses.length === 0 ? (
          <div className="classes-empty">
            <p>
              {classes.length === 0
                ? 'No classes yet. Click "Add Class" to create one!'
                : 'No classes match the selected filter.'}
            </p>
          </div>
        ) : (
          filteredClasses.map((cls) => (
            <ClassCard
              key={cls.id}
              classObj={cls}
              parentName={cls.parentId ? parentNameMap[cls.parentId] : null}
              onEdit={openClassModal}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
