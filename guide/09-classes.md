# Chapter 9 — Classes

This chapter rebuilds the `ClassesManager` object as React components. Classes in Forgeon represent game character/enemy/object definitions with attributes, skills, and formulas.

---

## 9.1 ClassCard

> **File:** `src/components/classes/ClassCard.jsx`

```jsx
import React from 'react';

/**
 * Displays a single class definition.
 * All class properties are destructured from props.
 */
const ClassCard = ({
  id,
  name,
  classType = 'character',
  description = '',
  parentClass = '',
  attributes = [],
  skills = [],
  onEdit,
  onDelete,
}) => {
  const icon = classType === 'character' ? 'misc/user' : 'misc/package';
  const typeLabel = classType === 'character' ? 'Character Class' : 'Instance Class';

  return (
    <div className="item-card class-card">
      <div className="item-content">
        <div className="item-title">
          <img src={`/icons/${icon}.svg`} alt="" width="20" height="20" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
          {name}
        </div>
        <div className="item-meta">
          <span className="item-tag">{typeLabel}</span>
          {parentClass && <span className="item-tag">Extends: {parentClass}</span>}
        </div>
        {description && <div className="item-description">{description}</div>}

        {/* Attributes preview */}
        {attributes.length > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            <small style={{ color: 'var(--text-secondary)' }}>
              Attributes: {attributes.map(({ name: attrName }) => attrName).join(', ')}
            </small>
          </div>
        )}

        {/* Skills preview */}
        {skills.length > 0 && (
          <div>
            <small style={{ color: 'var(--text-secondary)' }}>
              Skills: {skills.map(({ name: skillName }) => skillName).join(', ')}
            </small>
          </div>
        )}
      </div>

      <div className="item-actions">
        <button className="btn btn-small btn-secondary" onClick={() => onEdit(id)}>Edit</button>
        <button className="btn btn-small btn-danger" onClick={() => onDelete(id)}>Delete</button>
      </div>
    </div>
  );
};

export default ClassCard;
```

---

## 9.2 ClassForm

> **File:** `src/components/classes/ClassForm.jsx`

```jsx
import React, { useState } from 'react';
import { generateId } from '../../utils/helpers';

const ClassForm = ({ cls = null, existingClasses = [], onSave, onCancel }) => {
  const {
    id: existingId = null,
    name: initName = '',
    classType: initClassType = 'character',
    description: initDesc = '',
    parentClass: initParent = '',
    attributes: initAttributes = [],
    skills: initSkills = [],
    formulas: initFormulas = [],
    createdAt: initCreatedAt = null,
  } = cls || {};

  const [name, setName] = useState(initName);
  const [classType, setClassType] = useState(initClassType);
  const [description, setDescription] = useState(initDesc);
  const [parentClass, setParentClass] = useState(initParent);
  const [attributes, setAttributes] = useState(initAttributes);
  const [skills, setSkills] = useState(initSkills);

  const addAttribute = () => {
    setAttributes((prev) => [...prev, { name: '', value: 0, min: 0, max: 100 }]);
  };

  const updateAttribute = (index, field, value) => {
    setAttributes((prev) =>
      prev.map((attr, i) => (i === index ? { ...attr, [field]: value } : attr))
    );
  };

  const removeAttribute = (index) => {
    setAttributes((prev) => prev.filter((_, i) => i !== index));
  };

  const addSkill = () => {
    setSkills((prev) => [...prev, { name: '', description: '', damage: 0, cooldown: 0 }]);
  };

  const updateSkill = (index, field, value) => {
    setSkills((prev) =>
      prev.map((skill, i) => (i === index ? { ...skill, [field]: value } : skill))
    );
  };

  const removeSkill = (index) => {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: existingId || generateId(),
      name: name.trim(),
      classType,
      description: description.trim(),
      parentClass,
      attributes,
      skills,
      formulas: initFormulas,
      relatedItems: cls?.relatedItems || [],
      createdAt: initCreatedAt || new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    });
  };

  const isEdit = existingId !== null;

  return (
    <form className="modal-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit Class' : 'Add New Class'}</h3>

      <div className="form-group">
        <label htmlFor="className">Class Name *</label>
        <input
          type="text" id="className" required value={name}
          onChange={({ target: { value } }) => setName(value)}
          placeholder="e.g., Warrior, Potion"
        />
      </div>

      <div className="form-group">
        <label htmlFor="classType">Type</label>
        <select id="classType" value={classType} onChange={({ target: { value } }) => setClassType(value)}>
          <option value="character">Character Class</option>
          <option value="instance">Instance Class</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="classParent">Parent Class</label>
        <select id="classParent" value={parentClass} onChange={({ target: { value } }) => setParentClass(value)}>
          <option value="">None (Base Class)</option>
          {existingClasses
            .filter(({ id }) => id !== existingId)
            .map(({ id, name: clsName }) => (
              <option key={id} value={id}>{clsName}</option>
            ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="classDesc">Description</label>
        <textarea
          id="classDesc" rows="3" value={description}
          onChange={({ target: { value } }) => setDescription(value)}
          placeholder="Describe this class"
        />
      </div>

      {/* Attributes Section */}
      <div className="form-group">
        <label>Attributes</label>
        {attributes.map(({ name: attrName, value: attrVal }, index) => (
          <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="text" placeholder="Name" value={attrName}
              onChange={({ target: { value } }) => updateAttribute(index, 'name', value)}
              style={{ flex: 2 }}
            />
            <input
              type="number" placeholder="Value" value={attrVal}
              onChange={({ target: { value } }) => updateAttribute(index, 'value', Number(value))}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-small btn-danger" onClick={() => removeAttribute(index)}>×</button>
          </div>
        ))}
        <button type="button" className="btn btn-small btn-secondary" onClick={addAttribute}>+ Add Attribute</button>
      </div>

      {/* Skills Section */}
      <div className="form-group">
        <label>Skills</label>
        {skills.map(({ name: skillName, description: skillDesc }, index) => (
          <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="text" placeholder="Skill name" value={skillName}
              onChange={({ target: { value } }) => updateSkill(index, 'name', value)}
              style={{ flex: 2 }}
            />
            <input
              type="text" placeholder="Description" value={skillDesc}
              onChange={({ target: { value } }) => updateSkill(index, 'description', value)}
              style={{ flex: 3 }}
            />
            <button type="button" className="btn btn-small btn-danger" onClick={() => removeSkill(index)}>×</button>
          </div>
        ))}
        <button type="button" className="btn btn-small btn-secondary" onClick={addSkill}>+ Add Skill</button>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{isEdit ? 'Update' : 'Add'} Class</button>
      </div>
    </form>
  );
};

export default ClassForm;
```

---

## 9.3 ClassesPage

> **File:** `src/components/classes/ClassesPage.jsx`

```jsx
import React, { useState, useMemo } from 'react';
import { useAppState, useAppDispatch, ACTIONS } from '../../context/AppContext';
import ClassCard from './ClassCard';
import ClassForm from './ClassForm';
import Modal from '../layout/Modal';

const ClassesPage = () => {
  const { classes } = useAppState();           // ← destructure classes
  const dispatch = useAppDispatch();

  const [filter, setFilter] = useState('all'); // all | character | instance
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const displayed = useMemo(() => {
    if (filter === 'all') return classes;
    return classes.filter(({ classType }) => classType === filter);
  }, [classes, filter]);

  const handleSave = (data) => {
    if (editing) {
      dispatch({ type: ACTIONS.UPDATE_CLASS, payload: data });
    } else {
      dispatch({ type: ACTIONS.ADD_CLASS, payload: data });
    }
    setModalOpen(false);
    setEditing(null);
  };

  const handleEdit = (id) => {
    setEditing(classes.find((c) => c.id === id));
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this class?')) {
      dispatch({ type: ACTIONS.DELETE_CLASS, payload: id });
    }
  };

  return (
    <section className="content-section active">
      <header className="section-header">
        <h2>Classes &amp; Objects</h2>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
          + Add Class
        </button>
      </header>

      <div className="class-filter-bar">
        <label>Show:</label>
        {['all', 'character', 'instance'].map((f) => (
          <button
            key={f}
            className={`class-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All Classes' : f === 'character' ? 'Character Classes' : 'Instance Classes'}
          </button>
        ))}
      </div>

      <p className="section-description">Define your game&apos;s class hierarchy with parent and child relationships</p>

      <div className="classes-container">
        {displayed.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No classes defined yet.</p>}
        {displayed.map((cls) => (
          <ClassCard key={cls.id} {...cls} onEdit={handleEdit} onDelete={handleDelete} />
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <ClassForm
          cls={editing}
          existingClasses={classes}
          onSave={handleSave}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </section>
  );
};

export default ClassesPage;
```

---

## 9.4 Files Created

| File | Replaces |
|------|----------|
| `src/components/classes/ClassesPage.jsx` | `ClassesManager` object |
| `src/components/classes/ClassCard.jsx` | Class card HTML |
| `src/components/classes/ClassForm.jsx` | Class add/edit form + attribute/skill sub-forms |

---

**Next:** [Chapter 10 — Mechanics](./10-mechanics.md)
