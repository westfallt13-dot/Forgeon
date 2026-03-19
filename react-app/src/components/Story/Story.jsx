import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useModal } from '../../context/ModalContext';
import { useToast } from '../../context/ToastContext';
import { generateId } from '../../utils/helpers';
import './Story.css';

// ── Constants ──────────────────────────────────────────────────────────────────

const SUB_TABS = [
  { value: 'acts', label: 'Acts & Scenes' },
  { value: 'characters', label: 'Characters' },
  { value: 'locations', label: 'Locations' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'conflicts-themes', label: 'Conflicts & Themes' },
  { value: 'items', label: 'Items' },
  { value: 'quests', label: 'Quests' },
];

const LOCATION_TYPES = ['city', 'dungeon', 'wilderness', 'building', 'other'];

const CONFLICT_TYPES = [
  'man-vs-man',
  'man-vs-self',
  'man-vs-nature',
  'man-vs-society',
  'man-vs-technology',
];

const ITEM_TYPES = ['weapon', 'armor', 'consumable', 'quest-item', 'key-item', 'material', 'other'];

const RARITY_OPTIONS = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const RARITY_COLORS = {
  common: '#6b7280',
  uncommon: '#10b981',
  rare: '#3b82f6',
  epic: '#8b5cf6',
  legendary: '#f59e0b',
};

const QUEST_TYPES = ['main', 'side', 'fetch', 'escort', 'exploration', 'combat', 'puzzle'];

const QUEST_STATUSES = ['available', 'active', 'completed', 'failed'];

// ── Helper to look up name by id ───────────────────────────────────────────────

function nameById(list, id) {
  const item = (list || []).find((i) => i.id === id);
  return item ? item.name : id;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ACT FORM
// ═══════════════════════════════════════════════════════════════════════════════

function ActForm({ act, onSubmit, onCancel }) {
  const isEdit = !!act;
  const [name, setName] = useState(isEdit ? act.name : '');
  const [summary, setSummary] = useState(isEdit ? act.summary || '' : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), summary: summary.trim() });
  };

  return (
    <form className="story-modal-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit Act' : 'Add Act'}</h3>
      <div className="form-group">
        <label>Name *</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
      </div>
      <div className="form-group">
        <label>Summary</label>
        <textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{isEdit ? 'Save' : 'Add'}</button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SCENE FORM
// ═══════════════════════════════════════════════════════════════════════════════

function SceneForm({ scene, onSubmit, onCancel, characters, locations, conflicts, themes }) {
  const isEdit = !!scene;
  const [title, setTitle] = useState(isEdit ? scene.title : '');
  const [description, setDescription] = useState(isEdit ? scene.description || '' : '');
  const [selectedChars, setSelectedChars] = useState(isEdit ? (scene.characters || []) : []);
  const [locationId, setLocationId] = useState(isEdit ? scene.location || '' : '');
  const [selectedConflicts, setSelectedConflicts] = useState(isEdit ? (scene.conflicts || []) : []);
  const [selectedThemes, setSelectedThemes] = useState(isEdit ? (scene.themes || []) : []);
  const [sequence, setSequence] = useState(isEdit ? (scene.sequence || 0) : 0);

  const toggleInArray = (arr, setArr, val) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      characters: selectedChars,
      location: locationId || null,
      conflicts: selectedConflicts,
      themes: selectedThemes,
      sequence: Number(sequence) || 0,
    });
  };

  return (
    <form className="story-modal-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit Scene' : 'Add Scene'}</h3>
      <div className="form-group">
        <label>Title *</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required />
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Sequence Number</label>
        <input type="number" value={sequence} onChange={(e) => setSequence(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Location</label>
        <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <option value="">— None —</option>
          {(locations || []).map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Characters</label>
        <div className="checkbox-group">
          {(characters || []).map((c) => (
            <label key={c.id} className="checkbox-label">
              <input
                type="checkbox"
                checked={selectedChars.includes(c.id)}
                onChange={() => toggleInArray(selectedChars, setSelectedChars, c.id)}
              />
              {c.name}
            </label>
          ))}
          {(!characters || characters.length === 0) && <span className="text-muted">No characters defined</span>}
        </div>
      </div>
      <div className="form-group">
        <label>Conflicts</label>
        <div className="checkbox-group">
          {(conflicts || []).map((c) => (
            <label key={c.id} className="checkbox-label">
              <input
                type="checkbox"
                checked={selectedConflicts.includes(c.id)}
                onChange={() => toggleInArray(selectedConflicts, setSelectedConflicts, c.id)}
              />
              {c.name}
            </label>
          ))}
          {(!conflicts || conflicts.length === 0) && <span className="text-muted">No conflicts defined</span>}
        </div>
      </div>
      <div className="form-group">
        <label>Themes</label>
        <div className="checkbox-group">
          {(themes || []).map((t) => (
            <label key={t.id} className="checkbox-label">
              <input
                type="checkbox"
                checked={selectedThemes.includes(t.id)}
                onChange={() => toggleInArray(selectedThemes, setSelectedThemes, t.id)}
              />
              {t.name}
            </label>
          ))}
          {(!themes || themes.length === 0) && <span className="text-muted">No themes defined</span>}
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{isEdit ? 'Save' : 'Add'}</button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CHARACTER FORM
// ═══════════════════════════════════════════════════════════════════════════════

function CharacterForm({ character, onSubmit, onCancel, allClasses }) {
  const isEdit = !!character;
  const [name, setName] = useState(isEdit ? character.name : '');
  const [description, setDescription] = useState(isEdit ? character.description || '' : '');
  const [classes, setClasses] = useState(
    isEdit && character.classes?.length ? character.classes.map((c) => ({ ...c })) : []
  );
  const [personalityTraits, setPersonalityTraits] = useState(
    isEdit ? (character.personalityTraits || []).join(', ') : ''
  );
  const [backstory, setBackstory] = useState(isEdit ? character.backstory || '' : '');
  const [goals, setGoals] = useState(isEdit ? (character.goals || []).join(', ') : '');
  const [appearance, setAppearance] = useState(isEdit ? character.appearance || '' : '');

  const addClass = () => setClasses([...classes, { classId: '', priority: 5 }]);
  const removeClass = (idx) => setClasses(classes.filter((_, i) => i !== idx));
  const updateClass = (idx, field, value) =>
    setClasses(classes.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      classes: classes.filter((c) => c.classId),
      personalityTraits: personalityTraits.split(',').map((t) => t.trim()).filter(Boolean),
      backstory: backstory.trim(),
      goals: goals.split(',').map((g) => g.trim()).filter(Boolean),
      appearance: appearance.trim(),
      customAttributes: isEdit ? (character.customAttributes || {}) : {},
      conflictResolution: isEdit ? (character.conflictResolution || {}) : {},
      relatedItems: isEdit ? (character.relatedItems || []) : [],
    });
  };

  return (
    <form className="story-modal-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit Character' : 'Add Character'}</h3>
      <div className="form-group">
        <label>Name *</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Classes</label>
        <div className="dynamic-rows">
          {classes.map((cls, idx) => (
            <div className="dynamic-row" key={idx}>
              <select value={cls.classId} onChange={(e) => updateClass(idx, 'classId', e.target.value)}>
                <option value="">— Select —</option>
                {(allClasses || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                className="narrow-input"
                type="number"
                placeholder="Priority"
                value={cls.priority}
                onChange={(e) => updateClass(idx, 'priority', Number(e.target.value))}
                min={1}
                max={10}
              />
              <button type="button" className="btn-remove-row" onClick={() => removeClass(idx)}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-small btn-secondary" onClick={addClass}>+ Add Class</button>
      </div>
      <div className="form-group">
        <label>Personality Traits (comma-separated)</label>
        <input type="text" value={personalityTraits} onChange={(e) => setPersonalityTraits(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Backstory</label>
        <textarea rows={3} value={backstory} onChange={(e) => setBackstory(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Goals (comma-separated)</label>
        <input type="text" value={goals} onChange={(e) => setGoals(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Appearance</label>
        <textarea rows={2} value={appearance} onChange={(e) => setAppearance(e.target.value)} />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{isEdit ? 'Save' : 'Add'}</button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LOCATION FORM
// ═══════════════════════════════════════════════════════════════════════════════

function LocationForm({ location, onSubmit, onCancel }) {
  const isEdit = !!location;
  const [name, setName] = useState(isEdit ? location.name : '');
  const [type, setType] = useState(isEdit ? location.type || 'other' : 'other');
  const [description, setDescription] = useState(isEdit ? location.description || '' : '');
  const [features, setFeatures] = useState(isEdit ? (location.features || []).join(', ') : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      type,
      description: description.trim(),
      features: features.split(',').map((f) => f.trim()).filter(Boolean),
      relatedItems: isEdit ? (location.relatedItems || []) : [],
    });
  };

  return (
    <form className="story-modal-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit Location' : 'Add Location'}</h3>
      <div className="form-group">
        <label>Name *</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
      </div>
      <div className="form-group">
        <label>Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {LOCATION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Features (comma-separated)</label>
        <input type="text" value={features} onChange={(e) => setFeatures(e.target.value)} />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{isEdit ? 'Save' : 'Add'}</button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TIMELINE EVENT FORM
// ═══════════════════════════════════════════════════════════════════════════════

function TimelineForm({ event, onSubmit, onCancel }) {
  const isEdit = !!event;
  const [eventName, setEventName] = useState(isEdit ? event.event : '');
  const [description, setDescription] = useState(isEdit ? event.description || '' : '');
  const [date, setDate] = useState(isEdit ? event.date || '' : '');
  const [sequenceNumber, setSequenceNumber] = useState(isEdit ? (event.sequenceNumber || 0) : 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!eventName.trim()) return;
    onSubmit({
      event: eventName.trim(),
      description: description.trim(),
      date: date.trim(),
      sequenceNumber: Number(sequenceNumber) || 0,
      relatedItems: isEdit ? (event.relatedItems || []) : [],
    });
  };

  return (
    <form className="story-modal-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit Event' : 'Add Event'}</h3>
      <div className="form-group">
        <label>Event *</label>
        <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} autoFocus required />
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Date</label>
        <input type="text" value={date} onChange={(e) => setDate(e.target.value)} placeholder="e.g. Year 1, Day 5" />
      </div>
      <div className="form-group">
        <label>Sequence Number</label>
        <input type="number" value={sequenceNumber} onChange={(e) => setSequenceNumber(e.target.value)} />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{isEdit ? 'Save' : 'Add'}</button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CONFLICT FORM
// ═══════════════════════════════════════════════════════════════════════════════

function ConflictForm({ conflict, onSubmit, onCancel }) {
  const isEdit = !!conflict;
  const [name, setName] = useState(isEdit ? conflict.name : '');
  const [type, setType] = useState(isEdit ? conflict.type || 'man-vs-man' : 'man-vs-man');
  const [description, setDescription] = useState(isEdit ? conflict.description || '' : '');
  const [resolution, setResolution] = useState(isEdit ? conflict.resolution || '' : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      type,
      description: description.trim(),
      resolution: resolution.trim(),
      relatedItems: isEdit ? (conflict.relatedItems || []) : [],
    });
  };

  return (
    <form className="story-modal-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit Conflict' : 'Add Conflict'}</h3>
      <div className="form-group">
        <label>Name *</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
      </div>
      <div className="form-group">
        <label>Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {CONFLICT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Resolution</label>
        <textarea rows={2} value={resolution} onChange={(e) => setResolution(e.target.value)} />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{isEdit ? 'Save' : 'Add'}</button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  THEME FORM
// ═══════════════════════════════════════════════════════════════════════════════

function ThemeForm({ theme, onSubmit, onCancel }) {
  const isEdit = !!theme;
  const [name, setName] = useState(isEdit ? theme.name : '');
  const [description, setDescription] = useState(isEdit ? theme.description || '' : '');
  const [examples, setExamples] = useState(isEdit ? theme.examples || '' : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      examples: examples.trim(),
      relatedItems: isEdit ? (theme.relatedItems || []) : [],
    });
  };

  return (
    <form className="story-modal-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit Theme' : 'Add Theme'}</h3>
      <div className="form-group">
        <label>Name *</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Examples</label>
        <textarea rows={2} value={examples} onChange={(e) => setExamples(e.target.value)} />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{isEdit ? 'Save' : 'Add'}</button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ITEM FORM
// ═══════════════════════════════════════════════════════════════════════════════

function ItemForm({ item, onSubmit, onCancel }) {
  const isEdit = !!item;
  const [name, setName] = useState(isEdit ? item.name : '');
  const [type, setType] = useState(isEdit ? item.type || 'other' : 'other');
  const [rarity, setRarity] = useState(isEdit ? item.rarity || 'common' : 'common');
  const [description, setDescription] = useState(isEdit ? item.description || '' : '');
  const [effects, setEffects] = useState(isEdit ? item.effects || '' : '');
  const [stats, setStats] = useState(() => {
    if (isEdit && item.stats && Object.keys(item.stats).length > 0) {
      return Object.entries(item.stats).map(([key, value]) => ({ key, value: String(value) }));
    }
    return [{ key: '', value: '' }];
  });

  const addStat = () => setStats([...stats, { key: '', value: '' }]);
  const removeStat = (idx) => setStats(stats.length <= 1 ? stats : stats.filter((_, i) => i !== idx));
  const updateStat = (idx, field, value) =>
    setStats(stats.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const statsObj = {};
    stats.forEach((s) => {
      if (s.key.trim()) {
        const numVal = Number(s.value);
        statsObj[s.key.trim()] = isNaN(numVal) ? s.value : numVal;
      }
    });
    onSubmit({
      name: name.trim(),
      type,
      rarity,
      description: description.trim(),
      stats: statsObj,
      effects: effects.trim(),
      relatedItems: isEdit ? (item.relatedItems || []) : [],
    });
  };

  return (
    <form className="story-modal-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit Item' : 'Add Item'}</h3>
      <div className="form-group">
        <label>Name *</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {ITEM_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Rarity</label>
          <select value={rarity} onChange={(e) => setRarity(e.target.value)}>
            {RARITY_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Stats</label>
        <div className="dynamic-rows">
          {stats.map((s, idx) => (
            <div className="dynamic-row" key={idx}>
              <input placeholder="Stat name" value={s.key} onChange={(e) => updateStat(idx, 'key', e.target.value)} />
              <input placeholder="Value" value={s.value} onChange={(e) => updateStat(idx, 'value', e.target.value)} className="narrow-input" />
              <button type="button" className="btn-remove-row" onClick={() => removeStat(idx)}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-small btn-secondary" onClick={addStat}>+ Add Stat</button>
      </div>
      <div className="form-group">
        <label>Effects</label>
        <textarea rows={2} value={effects} onChange={(e) => setEffects(e.target.value)} />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{isEdit ? 'Save' : 'Add'}</button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  QUEST FORM
// ═══════════════════════════════════════════════════════════════════════════════

function QuestForm({ quest, onSubmit, onCancel }) {
  const isEdit = !!quest;
  const [name, setName] = useState(isEdit ? quest.name : '');
  const [type, setType] = useState(isEdit ? quest.type || 'main' : 'main');
  const [status, setStatus] = useState(isEdit ? quest.status || 'available' : 'available');
  const [description, setDescription] = useState(isEdit ? quest.description || '' : '');
  const [rewards, setRewards] = useState(isEdit ? quest.rewards || '' : '');
  const [prerequisites, setPrerequisites] = useState(isEdit ? quest.prerequisites || '' : '');
  const [objectives, setObjectives] = useState(
    isEdit && quest.objectives?.length ? quest.objectives.map((o) => ({ ...o })) : [{ text: '', completed: false }]
  );

  const addObjective = () => setObjectives([...objectives, { text: '', completed: false }]);
  const removeObjective = (idx) =>
    setObjectives(objectives.length <= 1 ? objectives : objectives.filter((_, i) => i !== idx));
  const updateObjective = (idx, field, value) =>
    setObjectives(objectives.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      type,
      status,
      description: description.trim(),
      rewards: rewards.trim(),
      prerequisites: prerequisites.trim(),
      objectives: objectives.filter((o) => o.text.trim()).map((o) => ({ text: o.text.trim(), completed: o.completed })),
      relatedItems: isEdit ? (quest.relatedItems || []) : [],
    });
  };

  return (
    <form className="story-modal-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit Quest' : 'Add Quest'}</h3>
      <div className="form-group">
        <label>Name *</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {QUEST_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {QUEST_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Objectives</label>
        <div className="dynamic-rows">
          {objectives.map((obj, idx) => (
            <div className="dynamic-row" key={idx}>
              <input
                type="text"
                placeholder="Objective text"
                value={obj.text}
                onChange={(e) => updateObjective(idx, 'text', e.target.value)}
              />
              <button type="button" className="btn-remove-row" onClick={() => removeObjective(idx)}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-small btn-secondary" onClick={addObjective}>+ Add Objective</button>
      </div>
      <div className="form-group">
        <label>Rewards</label>
        <textarea rows={2} value={rewards} onChange={(e) => setRewards(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Prerequisites</label>
        <textarea rows={2} value={prerequisites} onChange={(e) => setPrerequisites(e.target.value)} />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{isEdit ? 'Save' : 'Add'}</button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN STORY COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function Story() {
  const { story, classes, addStoryItem, updateStoryItem, deleteStoryItem, setStoryField } = useApp();
  const { openModal, closeModal } = useModal();
  const { showToast, showConfirm } = useToast();
  const [activeTab, setActiveTab] = useState('acts');
  const [expandedActs, setExpandedActs] = useState({});

  const acts = story.acts || [];
  const characters = story.characters || [];
  const locations = story.locations || [];
  const timeline = story.timeline || [];
  const conflicts = story.conflicts || [];
  const themes = story.themes || [];
  const items = story.items || [];
  const quests = story.quests || [];

  const sortedTimeline = useMemo(
    () => [...timeline].sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0)),
    [timeline]
  );

  const toggleActExpand = (actId) => {
    setExpandedActs((prev) => ({ ...prev, [actId]: !prev[actId] }));
  };

  // ── Acts CRUD ──────────────────────────────────────────────────────────────

  const openActForm = useCallback(
    (act = null) => {
      openModal(
        <ActForm
          act={act}
          onCancel={closeModal}
          onSubmit={(data) => {
            if (act) {
              updateStoryItem('acts', act.id, data);
              showToast('Act updated', 'success');
            } else {
              addStoryItem('acts', { id: generateId(), ...data, scenes: [] });
              showToast('Act added', 'success');
            }
            closeModal();
          }}
        />
      );
    },
    [openModal, closeModal, addStoryItem, updateStoryItem, showToast]
  );

  const deleteAct = useCallback(
    (act) => {
      showConfirm(`Delete act "${act.name}" and all its scenes?`, () => {
        deleteStoryItem('acts', act.id);
        showToast('Act deleted', 'success');
      });
    },
    [deleteStoryItem, showConfirm, showToast]
  );

  // ── Scenes CRUD (nested inside acts) ───────────────────────────────────────

  const openSceneForm = useCallback(
    (actId, scene = null) => {
      openModal(
        <SceneForm
          scene={scene}
          characters={characters}
          locations={locations}
          conflicts={conflicts}
          themes={themes}
          onCancel={closeModal}
          onSubmit={(data) => {
            const act = acts.find((a) => a.id === actId);
            if (!act) return;
            let updatedScenes;
            if (scene) {
              updatedScenes = (act.scenes || []).map((s) =>
                s.id === scene.id ? { ...s, ...data } : s
              );
              showToast('Scene updated', 'success');
            } else {
              updatedScenes = [...(act.scenes || []), { id: generateId(), ...data, relatedItems: [] }];
              showToast('Scene added', 'success');
            }
            updateStoryItem('acts', actId, { scenes: updatedScenes });
            closeModal();
          }}
        />
      );
    },
    [openModal, closeModal, acts, characters, locations, conflicts, themes, updateStoryItem, showToast]
  );

  const deleteScene = useCallback(
    (actId, sceneId) => {
      showConfirm('Delete this scene?', () => {
        const act = acts.find((a) => a.id === actId);
        if (!act) return;
        updateStoryItem('acts', actId, {
          scenes: (act.scenes || []).filter((s) => s.id !== sceneId),
        });
        showToast('Scene deleted', 'success');
      });
    },
    [acts, updateStoryItem, showConfirm, showToast]
  );

  // ── Characters CRUD ────────────────────────────────────────────────────────

  const openCharacterForm = useCallback(
    (char = null) => {
      openModal(
        <CharacterForm
          character={char}
          allClasses={classes}
          onCancel={closeModal}
          onSubmit={(data) => {
            if (char) {
              updateStoryItem('characters', char.id, data);
              showToast('Character updated', 'success');
            } else {
              addStoryItem('characters', { id: generateId(), ...data });
              showToast('Character added', 'success');
            }
            closeModal();
          }}
        />
      );
    },
    [openModal, closeModal, classes, addStoryItem, updateStoryItem, showToast]
  );

  const deleteCharacter = useCallback(
    (char) => {
      showConfirm(`Delete character "${char.name}"?`, () => {
        deleteStoryItem('characters', char.id);
        showToast('Character deleted', 'success');
      });
    },
    [deleteStoryItem, showConfirm, showToast]
  );

  // ── Locations CRUD ─────────────────────────────────────────────────────────

  const openLocationForm = useCallback(
    (loc = null) => {
      openModal(
        <LocationForm
          location={loc}
          onCancel={closeModal}
          onSubmit={(data) => {
            if (loc) {
              updateStoryItem('locations', loc.id, data);
              showToast('Location updated', 'success');
            } else {
              addStoryItem('locations', { id: generateId(), ...data });
              showToast('Location added', 'success');
            }
            closeModal();
          }}
        />
      );
    },
    [openModal, closeModal, addStoryItem, updateStoryItem, showToast]
  );

  const deleteLocation = useCallback(
    (loc) => {
      showConfirm(`Delete location "${loc.name}"?`, () => {
        deleteStoryItem('locations', loc.id);
        showToast('Location deleted', 'success');
      });
    },
    [deleteStoryItem, showConfirm, showToast]
  );

  // ── Timeline CRUD ──────────────────────────────────────────────────────────

  const openTimelineForm = useCallback(
    (evt = null) => {
      openModal(
        <TimelineForm
          event={evt}
          onCancel={closeModal}
          onSubmit={(data) => {
            if (evt) {
              updateStoryItem('timeline', evt.id, data);
              showToast('Event updated', 'success');
            } else {
              addStoryItem('timeline', { id: generateId(), ...data });
              showToast('Event added', 'success');
            }
            closeModal();
          }}
        />
      );
    },
    [openModal, closeModal, addStoryItem, updateStoryItem, showToast]
  );

  const deleteTimelineEvent = useCallback(
    (evt) => {
      showConfirm(`Delete event "${evt.event}"?`, () => {
        deleteStoryItem('timeline', evt.id);
        showToast('Event deleted', 'success');
      });
    },
    [deleteStoryItem, showConfirm, showToast]
  );

  // ── Conflicts CRUD ─────────────────────────────────────────────────────────

  const openConflictForm = useCallback(
    (conflict = null) => {
      openModal(
        <ConflictForm
          conflict={conflict}
          onCancel={closeModal}
          onSubmit={(data) => {
            if (conflict) {
              updateStoryItem('conflicts', conflict.id, data);
              showToast('Conflict updated', 'success');
            } else {
              addStoryItem('conflicts', { id: generateId(), ...data });
              showToast('Conflict added', 'success');
            }
            closeModal();
          }}
        />
      );
    },
    [openModal, closeModal, addStoryItem, updateStoryItem, showToast]
  );

  const deleteConflict = useCallback(
    (conflict) => {
      showConfirm(`Delete conflict "${conflict.name}"?`, () => {
        deleteStoryItem('conflicts', conflict.id);
        showToast('Conflict deleted', 'success');
      });
    },
    [deleteStoryItem, showConfirm, showToast]
  );

  // ── Themes CRUD ────────────────────────────────────────────────────────────

  const openThemeForm = useCallback(
    (theme = null) => {
      openModal(
        <ThemeForm
          theme={theme}
          onCancel={closeModal}
          onSubmit={(data) => {
            if (theme) {
              updateStoryItem('themes', theme.id, data);
              showToast('Theme updated', 'success');
            } else {
              addStoryItem('themes', { id: generateId(), ...data });
              showToast('Theme added', 'success');
            }
            closeModal();
          }}
        />
      );
    },
    [openModal, closeModal, addStoryItem, updateStoryItem, showToast]
  );

  const deleteTheme = useCallback(
    (theme) => {
      showConfirm(`Delete theme "${theme.name}"?`, () => {
        deleteStoryItem('themes', theme.id);
        showToast('Theme deleted', 'success');
      });
    },
    [deleteStoryItem, showConfirm, showToast]
  );

  // ── Items CRUD ─────────────────────────────────────────────────────────────

  const openItemForm = useCallback(
    (item = null) => {
      openModal(
        <ItemForm
          item={item}
          onCancel={closeModal}
          onSubmit={(data) => {
            if (item) {
              updateStoryItem('items', item.id, data);
              showToast('Item updated', 'success');
            } else {
              addStoryItem('items', { id: generateId(), ...data });
              showToast('Item added', 'success');
            }
            closeModal();
          }}
        />
      );
    },
    [openModal, closeModal, addStoryItem, updateStoryItem, showToast]
  );

  const deleteItemEntry = useCallback(
    (item) => {
      showConfirm(`Delete item "${item.name}"?`, () => {
        deleteStoryItem('items', item.id);
        showToast('Item deleted', 'success');
      });
    },
    [deleteStoryItem, showConfirm, showToast]
  );

  // ── Quests CRUD ────────────────────────────────────────────────────────────

  const openQuestForm = useCallback(
    (quest = null) => {
      openModal(
        <QuestForm
          quest={quest}
          onCancel={closeModal}
          onSubmit={(data) => {
            if (quest) {
              updateStoryItem('quests', quest.id, data);
              showToast('Quest updated', 'success');
            } else {
              addStoryItem('quests', { id: generateId(), ...data });
              showToast('Quest added', 'success');
            }
            closeModal();
          }}
        />
      );
    },
    [openModal, closeModal, addStoryItem, updateStoryItem, showToast]
  );

  const deleteQuest = useCallback(
    (quest) => {
      showConfirm(`Delete quest "${quest.name}"?`, () => {
        deleteStoryItem('quests', quest.id);
        showToast('Quest deleted', 'success');
      });
    },
    [deleteStoryItem, showConfirm, showToast]
  );

  const toggleObjective = useCallback(
    (questId, objIndex) => {
      const quest = quests.find((q) => q.id === questId);
      if (!quest) return;
      const updatedObjectives = (quest.objectives || []).map((o, i) =>
        i === objIndex ? { ...o, completed: !o.completed } : o
      );
      updateStoryItem('quests', questId, { objectives: updatedObjectives });
    },
    [quests, updateStoryItem]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="story-section">
      {/* Sub-navigation tabs */}
      <div className="story-tabs">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.value}
            className={`story-tab-btn${activeTab === tab.value ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Acts & Scenes ──────────────────────────────────────────────────── */}
      {activeTab === 'acts' && (
        <div className="story-panel">
          <div className="story-toolbar">
            <button className="btn btn-primary" onClick={() => openActForm()}>+ Add Act</button>
          </div>
          {acts.length === 0 ? (
            <div className="story-empty">No acts yet. Add your first act to start building your story.</div>
          ) : (
            <div className="story-list">
              {acts.map((act) => {
                const isExpanded = expandedActs[act.id] !== false;
                const sortedScenes = [...(act.scenes || [])].sort(
                  (a, b) => (a.sequence || 0) - (b.sequence || 0)
                );
                return (
                  <div key={act.id} className="act-card">
                    <div className="act-header" onClick={() => toggleActExpand(act.id)}>
                      <div className="act-header-info">
                        <span className="act-expand-icon">{isExpanded ? '▼' : '▶'}</span>
                        <strong>{act.name}</strong>
                        <span className="story-badge">{(act.scenes || []).length} scenes</span>
                      </div>
                      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-small btn-secondary" onClick={() => openActForm(act)}>Edit</button>
                        <button className="btn btn-small btn-danger" onClick={() => deleteAct(act)}>Delete</button>
                      </div>
                    </div>
                    {act.summary && <p className="act-summary">{act.summary}</p>}
                    {isExpanded && (
                      <div className="scenes-container">
                        <button className="btn btn-small btn-secondary" onClick={() => openSceneForm(act.id)}>+ Add Scene</button>
                        {sortedScenes.length === 0 ? (
                          <p className="text-muted">No scenes in this act.</p>
                        ) : (
                          <div className="scenes-list">
                            {sortedScenes.map((scene) => (
                              <div key={scene.id} className="scene-card">
                                <div className="scene-header">
                                  <div>
                                    <strong>{scene.title}</strong>
                                    <span className="story-badge">#{scene.sequence || 0}</span>
                                  </div>
                                  <div className="card-actions">
                                    <button className="btn btn-small btn-secondary" onClick={() => openSceneForm(act.id, scene)}>Edit</button>
                                    <button className="btn btn-small btn-danger" onClick={() => deleteScene(act.id, scene.id)}>Delete</button>
                                  </div>
                                </div>
                                {scene.description && <p className="scene-description">{scene.description}</p>}
                                <div className="scene-meta">
                                  {scene.location && (
                                    <span className="story-badge location">📍 {nameById(locations, scene.location)}</span>
                                  )}
                                  {(scene.characters || []).map((cId) => (
                                    <span key={cId} className="story-badge character">👤 {nameById(characters, cId)}</span>
                                  ))}
                                  {(scene.conflicts || []).map((cId) => (
                                    <span key={cId} className="story-badge conflict">⚔ {nameById(conflicts, cId)}</span>
                                  ))}
                                  {(scene.themes || []).map((tId) => (
                                    <span key={tId} className="story-badge theme">🏷 {nameById(themes, tId)}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Characters ─────────────────────────────────────────────────────── */}
      {activeTab === 'characters' && (
        <div className="story-panel">
          <div className="story-toolbar">
            <button className="btn btn-primary" onClick={() => openCharacterForm()}>+ Add Character</button>
          </div>
          {characters.length === 0 ? (
            <div className="story-empty">No characters yet. Add your first character.</div>
          ) : (
            <div className="story-grid">
              {characters.map((char) => (
                <div key={char.id} className="story-card">
                  <div className="story-card-header">
                    <strong>{char.name}</strong>
                    <div className="card-actions">
                      <button className="btn btn-small btn-secondary" onClick={() => openCharacterForm(char)}>Edit</button>
                      <button className="btn btn-small btn-danger" onClick={() => deleteCharacter(char)}>Delete</button>
                    </div>
                  </div>
                  {char.description && <p className="story-card-desc">{char.description}</p>}
                  {char.classes && char.classes.length > 0 && (
                    <div className="detail-badges">
                      {char.classes.map((cls, i) => (
                        <span key={i} className="story-badge">
                          {nameById(classes, cls.classId)} (P{cls.priority})
                        </span>
                      ))}
                    </div>
                  )}
                  {char.personalityTraits && char.personalityTraits.length > 0 && (
                    <div className="detail-badges">
                      {char.personalityTraits.map((t, i) => (
                        <span key={i} className="story-badge trait">{t}</span>
                      ))}
                    </div>
                  )}
                  {char.backstory && (
                    <p className="story-card-truncated">{char.backstory}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Locations ──────────────────────────────────────────────────────── */}
      {activeTab === 'locations' && (
        <div className="story-panel">
          <div className="story-toolbar">
            <button className="btn btn-primary" onClick={() => openLocationForm()}>+ Add Location</button>
          </div>
          {locations.length === 0 ? (
            <div className="story-empty">No locations yet. Add your first location.</div>
          ) : (
            <div className="story-grid">
              {locations.map((loc) => (
                <div key={loc.id} className="story-card">
                  <div className="story-card-header">
                    <div>
                      <strong>{loc.name}</strong>
                      <span className="story-badge type">{loc.type}</span>
                    </div>
                    <div className="card-actions">
                      <button className="btn btn-small btn-secondary" onClick={() => openLocationForm(loc)}>Edit</button>
                      <button className="btn btn-small btn-danger" onClick={() => deleteLocation(loc)}>Delete</button>
                    </div>
                  </div>
                  {loc.description && <p className="story-card-desc">{loc.description}</p>}
                  {loc.features && loc.features.length > 0 && (
                    <div className="detail-badges">
                      {loc.features.map((f, i) => (
                        <span key={i} className="story-badge">{f}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Timeline ───────────────────────────────────────────────────────── */}
      {activeTab === 'timeline' && (
        <div className="story-panel">
          <div className="story-toolbar">
            <button className="btn btn-primary" onClick={() => openTimelineForm()}>+ Add Event</button>
          </div>
          {sortedTimeline.length === 0 ? (
            <div className="story-empty">No timeline events yet. Add your first event.</div>
          ) : (
            <div className="story-list">
              {sortedTimeline.map((evt) => (
                <div key={evt.id} className="story-card timeline-card">
                  <div className="timeline-marker">{evt.sequenceNumber || 0}</div>
                  <div className="timeline-content">
                    <div className="story-card-header">
                      <strong>{evt.event}</strong>
                      <div className="card-actions">
                        <button className="btn btn-small btn-secondary" onClick={() => openTimelineForm(evt)}>Edit</button>
                        <button className="btn btn-small btn-danger" onClick={() => deleteTimelineEvent(evt)}>Delete</button>
                      </div>
                    </div>
                    {evt.description && <p className="story-card-desc">{evt.description}</p>}
                    {evt.date && <span className="story-badge">📅 {evt.date}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Conflicts & Themes ─────────────────────────────────────────────── */}
      {activeTab === 'conflicts-themes' && (
        <div className="story-panel">
          <div className="conflicts-themes-grid">
            {/* Conflicts column */}
            <div className="ct-column">
              <div className="story-toolbar">
                <h4>Conflicts</h4>
                <button className="btn btn-primary btn-small" onClick={() => openConflictForm()}>+ Add</button>
              </div>
              {conflicts.length === 0 ? (
                <div className="story-empty">No conflicts yet.</div>
              ) : (
                <div className="story-list">
                  {conflicts.map((c) => (
                    <div key={c.id} className="story-card">
                      <div className="story-card-header">
                        <div>
                          <strong>{c.name}</strong>
                          <span className="story-badge type">{c.type}</span>
                        </div>
                        <div className="card-actions">
                          <button className="btn btn-small btn-secondary" onClick={() => openConflictForm(c)}>Edit</button>
                          <button className="btn btn-small btn-danger" onClick={() => deleteConflict(c)}>Delete</button>
                        </div>
                      </div>
                      {c.description && <p className="story-card-desc">{c.description}</p>}
                      {c.resolution && (
                        <p className="story-card-resolution"><em>Resolution:</em> {c.resolution}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Themes column */}
            <div className="ct-column">
              <div className="story-toolbar">
                <h4>Themes</h4>
                <button className="btn btn-primary btn-small" onClick={() => openThemeForm()}>+ Add</button>
              </div>
              {themes.length === 0 ? (
                <div className="story-empty">No themes yet.</div>
              ) : (
                <div className="story-list">
                  {themes.map((t) => (
                    <div key={t.id} className="story-card">
                      <div className="story-card-header">
                        <strong>{t.name}</strong>
                        <div className="card-actions">
                          <button className="btn btn-small btn-secondary" onClick={() => openThemeForm(t)}>Edit</button>
                          <button className="btn btn-small btn-danger" onClick={() => deleteTheme(t)}>Delete</button>
                        </div>
                      </div>
                      {t.description && <p className="story-card-desc">{t.description}</p>}
                      {t.examples && <p className="story-card-examples"><em>Examples:</em> {t.examples}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Items ──────────────────────────────────────────────────────────── */}
      {activeTab === 'items' && (
        <div className="story-panel">
          <div className="story-toolbar">
            <button className="btn btn-primary" onClick={() => openItemForm()}>+ Add Item</button>
          </div>
          {items.length === 0 ? (
            <div className="story-empty">No items yet. Add your first game item.</div>
          ) : (
            <div className="story-grid">
              {items.map((item) => (
                <div key={item.id} className="story-card">
                  <div className="story-card-header">
                    <div>
                      <strong>{item.name}</strong>
                      <span className="story-badge type">{item.type}</span>
                      <span
                        className="story-badge rarity"
                        style={{ background: RARITY_COLORS[item.rarity] || RARITY_COLORS.common, color: '#fff' }}
                      >
                        {item.rarity}
                      </span>
                    </div>
                    <div className="card-actions">
                      <button className="btn btn-small btn-secondary" onClick={() => openItemForm(item)}>Edit</button>
                      <button className="btn btn-small btn-danger" onClick={() => deleteItemEntry(item)}>Delete</button>
                    </div>
                  </div>
                  {item.description && <p className="story-card-desc">{item.description}</p>}
                  {item.stats && Object.keys(item.stats).length > 0 && (
                    <div className="detail-badges">
                      {Object.entries(item.stats).map(([k, v]) => (
                        <span key={k} className="story-badge stat">{k}: {v}</span>
                      ))}
                    </div>
                  )}
                  {item.effects && <p className="story-card-effects"><em>Effects:</em> {item.effects}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Quests ─────────────────────────────────────────────────────────── */}
      {activeTab === 'quests' && (
        <div className="story-panel">
          <div className="story-toolbar">
            <button className="btn btn-primary" onClick={() => openQuestForm()}>+ Add Quest</button>
          </div>
          {quests.length === 0 ? (
            <div className="story-empty">No quests yet. Add your first quest.</div>
          ) : (
            <div className="story-list">
              {quests.map((quest) => (
                <div key={quest.id} className="story-card">
                  <div className="story-card-header">
                    <div>
                      <strong>{quest.name}</strong>
                      <span className="story-badge type">{quest.type}</span>
                      <span className={`story-badge status status-${quest.status}`}>{quest.status}</span>
                    </div>
                    <div className="card-actions">
                      <button className="btn btn-small btn-secondary" onClick={() => openQuestForm(quest)}>Edit</button>
                      <button className="btn btn-small btn-danger" onClick={() => deleteQuest(quest)}>Delete</button>
                    </div>
                  </div>
                  {quest.description && <p className="story-card-desc">{quest.description}</p>}
                  {quest.objectives && quest.objectives.length > 0 && (
                    <div className="quest-objectives">
                      {quest.objectives.map((obj, idx) => (
                        <label key={idx} className="quest-objective">
                          <input
                            type="checkbox"
                            checked={obj.completed}
                            onChange={() => toggleObjective(quest.id, idx)}
                          />
                          <span className={obj.completed ? 'completed' : ''}>{obj.text}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {quest.rewards && <p className="story-card-meta"><em>Rewards:</em> {quest.rewards}</p>}
                  {quest.prerequisites && <p className="story-card-meta"><em>Prerequisites:</em> {quest.prerequisites}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
