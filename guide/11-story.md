# Chapter 11 — Story & Narrative

This chapter rebuilds the `StoryManager` object. The Story section is the most complex — it has multiple sub-views (Acts, Characters, Locations, Timeline, Items, Quests, Conflicts & Themes), all managed through tabs.

---

## 11.1 StoryTabs

> **File:** `src/components/story/StoryTabs.jsx`

```jsx
import React from 'react';

const TABS = [
  { key: 'list', label: 'Acts & Scenes', icon: 'misc/list' },
  { key: 'characters', label: 'Characters', icon: 'misc/user' },
  { key: 'locations', label: 'Locations', icon: 'misc/location' },
  { key: 'timeline', label: 'Timeline', icon: 'misc/calendar' },
  { key: 'items', label: 'Items', icon: 'misc/package' },
  { key: 'quests', label: 'Quests', icon: 'misc/gameplay' },
  { key: 'other', label: 'Conflicts & Themes', icon: 'misc/more' },
];

/**
 * Tab switcher for story sub-views.
 * Destructures each tab's properties in the map callback.
 */
const StoryTabs = ({ activeTab, onTabChange }) => (
  <div className="story-tabs">
    {TABS.map(({ key, label, icon }) => (
      <button
        key={key}
        className={`story-tab ${activeTab === key ? 'active' : ''}`}
        onClick={() => onTabChange(key)}
      >
        <img src={`/icons/${icon}.svg`} alt="" width="20" height="20" /> {label}
      </button>
    ))}
  </div>
);

export default StoryTabs;
```

---

## 11.2 ActCard

> **File:** `src/components/story/ActCard.jsx`

```jsx
import React, { useState } from 'react';

/**
 * Displays a single act with expandable scenes.
 */
const ActCard = ({ id, title, description = '', scenes = [], order, onEdit, onDelete, onAddScene }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="item-card">
      <div className="item-content" style={{ width: '100%' }}>
        <div className="item-title" style={{ cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
          <strong>Act {order}:</strong> {title}
          <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>{expanded ? '▼' : '▶'}</span>
        </div>
        {description && <div className="item-description">{description}</div>}
        <div className="item-meta">
          <span className="item-tag">{scenes.length} scene{scenes.length !== 1 ? 's' : ''}</span>
        </div>

        {expanded && (
          <div style={{ marginTop: '1rem', paddingLeft: '1rem', borderLeft: '2px solid var(--border-color)' }}>
            {scenes.map(({ id: sceneId, title: sceneTitle, description: sceneDesc }, index) => (
              <div key={sceneId} style={{ marginBottom: '0.5rem' }}>
                <strong>Scene {index + 1}:</strong> {sceneTitle}
                {sceneDesc && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{sceneDesc}</p>}
              </div>
            ))}
            <button className="btn btn-small btn-secondary" onClick={() => onAddScene(id)}>
              + Add Scene
            </button>
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

export default ActCard;
```

---

## 11.3 CharacterCard

> **File:** `src/components/story/CharacterCard.jsx`

```jsx
import React from 'react';

const ROLE_COLORS = {
  protagonist: '#10b981',
  antagonist: '#ef4444',
  supporting: '#3b82f6',
  minor: '#9ca3af',
};

const CharacterCard = ({
  id,
  name,
  role = 'supporting',
  description = '',
  backstory = '',
  classes: charClasses = [],
  onEdit,
  onDelete,
}) => (
  <div className="item-card" style={{ borderLeft: `4px solid ${ROLE_COLORS[role] || '#9ca3af'}` }}>
    <div className="item-content">
      <div className="item-title">
        <img src="/icons/misc/user.svg" alt="" width="20" height="20" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
        {name}
      </div>
      <div className="item-meta">
        <span className="item-tag" style={{ background: ROLE_COLORS[role], color: 'white' }}>{role}</span>
        {charClasses.length > 0 && <span className="item-tag">{charClasses.length} class(es)</span>}
      </div>
      {description && <div className="item-description">{description}</div>}
    </div>
    <div className="item-actions">
      <button className="btn btn-small btn-secondary" onClick={() => onEdit(id)}>Edit</button>
      <button className="btn btn-small btn-danger" onClick={() => onDelete(id)}>Delete</button>
    </div>
  </div>
);

export default CharacterCard;
```

---

## 11.4 LocationCard

> **File:** `src/components/story/LocationCard.jsx`

```jsx
import React from 'react';

const LocationCard = ({ id, name, type = 'exterior', description = '', onEdit, onDelete }) => (
  <div className="item-card">
    <div className="item-content">
      <div className="item-title">
        <img src="/icons/misc/location.svg" alt="" width="20" height="20" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
        {name}
      </div>
      <div className="item-meta">
        <span className="item-tag">{type}</span>
      </div>
      {description && <div className="item-description">{description}</div>}
    </div>
    <div className="item-actions">
      <button className="btn btn-small btn-secondary" onClick={() => onEdit(id)}>Edit</button>
      <button className="btn btn-small btn-danger" onClick={() => onDelete(id)}>Delete</button>
    </div>
  </div>
);

export default LocationCard;
```

---

## 11.5 QuestCard

> **File:** `src/components/story/QuestCard.jsx`

```jsx
import React from 'react';

const TYPE_COLORS = { main: '#E02424', side: '#3b82f6', optional: '#f59e0b', hidden: '#6b7280' };

const QuestCard = ({
  id,
  name,
  type = 'side',
  status = 'available',
  description = '',
  objectives = [],
  rewards = [],
  onEdit,
  onDelete,
}) => (
  <div className="item-card" style={{ borderLeft: `4px solid ${TYPE_COLORS[type] || '#6b7280'}` }}>
    <div className="item-content">
      <div className="item-title">
        <img src="/icons/misc/gameplay.svg" alt="" width="20" height="20" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
        {name}
      </div>
      <div className="item-meta">
        <span className="item-tag" style={{ background: TYPE_COLORS[type], color: 'white' }}>{type}</span>
        <span className="item-tag">{status}</span>
        {objectives.length > 0 && <span className="item-tag">{objectives.length} objective(s)</span>}
        {rewards.length > 0 && <span className="item-tag">{rewards.length} reward(s)</span>}
      </div>
      {description && <div className="item-description">{description}</div>}
    </div>
    <div className="item-actions">
      <button className="btn btn-small btn-secondary" onClick={() => onEdit(id)}>Edit</button>
      <button className="btn btn-small btn-danger" onClick={() => onDelete(id)}>Delete</button>
    </div>
  </div>
);

export default QuestCard;
```

---

## 11.6 StoryPage (main)

> **File:** `src/components/story/StoryPage.jsx`

This ties all sub-views together with tab-based navigation.

```jsx
import React, { useState } from 'react';
import { useAppState, useAppDispatch, ACTIONS } from '../../context/AppContext';
import { generateId } from '../../utils/helpers';
import StoryTabs from './StoryTabs';
import ActCard from './ActCard';
import CharacterCard from './CharacterCard';
import LocationCard from './LocationCard';
import QuestCard from './QuestCard';
import Modal from '../layout/Modal';

const StoryPage = () => {
  // Destructure nested story object from state
  const {
    story: { acts, characters, locations, timeline, conflicts, themes, items: storyItems, quests },
  } = useAppState();
  const dispatch = useAppDispatch();

  const [activeTab, setActiveTab] = useState('list');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);

  // ─── Generic add/edit/delete handlers ────────────
  const closeModal = () => { setModalOpen(false); setModalContent(null); };

  // ─── Acts ────────────────────────────────────────
  const addAct = () => {
    const title = prompt('Act title:');
    if (title) {
      dispatch({
        type: ACTIONS.ADD_ACT,
        payload: { id: generateId(), title, description: '', scenes: [], order: acts.length + 1 },
      });
    }
  };

  const deleteAct = (id) => {
    if (window.confirm('Delete this act and all its scenes?')) {
      dispatch({ type: ACTIONS.DELETE_ACT, payload: id });
    }
  };

  // ─── Characters ──────────────────────────────────
  const addCharacter = () => {
    const name = prompt('Character name:');
    if (name) {
      dispatch({
        type: ACTIONS.ADD_CHARACTER,
        payload: {
          id: generateId(), name, role: 'supporting', description: '',
          backstory: '', classes: [], conflictResolution: {},
        },
      });
    }
  };

  const deleteCharacter = (id) => {
    if (window.confirm('Delete this character?')) {
      dispatch({ type: ACTIONS.DELETE_CHARACTER, payload: id });
    }
  };

  // ─── Locations ───────────────────────────────────
  const addLocation = () => {
    const name = prompt('Location name:');
    if (name) {
      dispatch({
        type: ACTIONS.ADD_LOCATION,
        payload: { id: generateId(), name, type: 'exterior', description: '' },
      });
    }
  };

  const deleteLocation = (id) => {
    if (window.confirm('Delete this location?')) {
      dispatch({ type: ACTIONS.DELETE_LOCATION, payload: id });
    }
  };

  // ─── Quests ──────────────────────────────────────
  const addQuest = () => {
    const name = prompt('Quest name:');
    if (name) {
      dispatch({
        type: ACTIONS.ADD_QUEST,
        payload: { id: generateId(), name, type: 'side', status: 'available', description: '', objectives: [], rewards: [] },
      });
    }
  };

  const deleteQuest = (id) => {
    if (window.confirm('Delete this quest?')) {
      dispatch({ type: ACTIONS.DELETE_QUEST, payload: id });
    }
  };

  // ─── Timeline ────────────────────────────────────
  const addTimelineEvent = () => {
    const title = prompt('Event title:');
    if (title) {
      dispatch({
        type: ACTIONS.ADD_TIMELINE_EVENT,
        payload: { id: generateId(), title, description: '', date: '' },
      });
    }
  };

  // ─── Conflicts ───────────────────────────────────
  const addConflict = () => {
    const name = prompt('Conflict name:');
    if (name) {
      dispatch({
        type: ACTIONS.ADD_CONFLICT,
        payload: { id: generateId(), name, description: '', type: 'external' },
      });
    }
  };

  // ─── Themes ──────────────────────────────────────
  const addTheme = () => {
    const name = prompt('Theme name:');
    if (name) {
      dispatch({
        type: ACTIONS.ADD_THEME,
        payload: { id: generateId(), name, description: '' },
      });
    }
  };

  // ─── Story Items ─────────────────────────────────
  const addStoryItem = () => {
    const name = prompt('Item name:');
    if (name) {
      dispatch({
        type: ACTIONS.ADD_STORY_ITEM,
        payload: {
          id: generateId(), name, type: 'consumable', rarity: 'common',
          description: '', damage: 0, defense: 0, speed: 0, health: 0, mana: 0, effects: '',
        },
      });
    }
  };

  // Placeholder edit handler (opens modal with a simple message for now)
  const handleEdit = (type) => (id) => {
    setModalContent(<p>Edit form for <strong>{type} #{id}</strong> — extend this with a full form component.</p>);
    setModalOpen(true);
  };

  return (
    <section className="content-section active">
      <header className="section-header">
        <h2>Story &amp; Narrative</h2>
        <button className="btn btn-primary" onClick={addAct}>
          <img src="/icons/actions/add.svg" alt="" width="16" height="16" /> Add Act
        </button>
      </header>
      <p className="section-description">Organize your game&apos;s narrative into acts and scenes</p>

      <StoryTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── Acts & Scenes ─────────────────────── */}
      {activeTab === 'list' && (
        <div className="story-container">
          {acts.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No acts yet.</p>}
          {acts.map((act) => (
            <ActCard
              key={act.id}
              {...act}
              onEdit={handleEdit('act')}
              onDelete={deleteAct}
              onAddScene={() => {}}
            />
          ))}
        </div>
      )}

      {/* ── Characters ────────────────────────── */}
      {activeTab === 'characters' && (
        <>
          <div className="story-view-header">
            <button className="btn btn-primary" onClick={addCharacter}>
              <img src="/icons/actions/add.svg" alt="" width="16" height="16" /> Add Character
            </button>
          </div>
          <div className="characters-grid">
            {characters.map((char) => (
              <CharacterCard key={char.id} {...char} onEdit={handleEdit('character')} onDelete={deleteCharacter} />
            ))}
          </div>
        </>
      )}

      {/* ── Locations ─────────────────────────── */}
      {activeTab === 'locations' && (
        <>
          <div className="story-view-header">
            <button className="btn btn-primary" onClick={addLocation}>
              <img src="/icons/actions/add.svg" alt="" width="16" height="16" /> Add Location
            </button>
          </div>
          <div className="locations-grid">
            {locations.map((loc) => (
              <LocationCard key={loc.id} {...loc} onEdit={handleEdit('location')} onDelete={deleteLocation} />
            ))}
          </div>
        </>
      )}

      {/* ── Timeline ──────────────────────────── */}
      {activeTab === 'timeline' && (
        <>
          <div className="story-view-header">
            <button className="btn btn-primary" onClick={addTimelineEvent}>
              <img src="/icons/actions/add.svg" alt="" width="16" height="16" /> Add Event
            </button>
          </div>
          <div className="timeline-container">
            {timeline.map(({ id, title, description: desc, date }) => (
              <div key={id} className="item-card">
                <div className="item-content">
                  <div className="item-title">{title}</div>
                  {desc && <div className="item-description">{desc}</div>}
                  {date && <span className="item-tag">{date}</span>}
                </div>
                <div className="item-actions">
                  <button className="btn btn-small btn-danger" onClick={() => dispatch({ type: ACTIONS.DELETE_TIMELINE_EVENT, payload: id })}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Items ─────────────────────────────── */}
      {activeTab === 'items' && (
        <>
          <div className="story-view-header">
            <button className="btn btn-primary" onClick={addStoryItem}>
              <img src="/icons/actions/add.svg" alt="" width="16" height="16" /> Add Item
            </button>
          </div>
          <div className="items-container">
            {storyItems.map(({ id, name, type, rarity, description: desc }) => (
              <div key={id} className="item-card">
                <div className="item-content">
                  <div className="item-title">{name}</div>
                  <div className="item-meta">
                    <span className="item-tag">{type}</span>
                    <span className="item-tag">{rarity}</span>
                  </div>
                  {desc && <div className="item-description">{desc}</div>}
                </div>
                <div className="item-actions">
                  <button className="btn btn-small btn-danger" onClick={() => dispatch({ type: ACTIONS.DELETE_STORY_ITEM, payload: id })}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Quests ────────────────────────────── */}
      {activeTab === 'quests' && (
        <>
          <div className="story-view-header">
            <button className="btn btn-primary" onClick={addQuest}>
              <img src="/icons/actions/add.svg" alt="" width="16" height="16" /> Add Quest
            </button>
          </div>
          <div className="quests-container">
            {quests.map((q) => (
              <QuestCard key={q.id} {...q} onEdit={handleEdit('quest')} onDelete={deleteQuest} />
            ))}
          </div>
        </>
      )}

      {/* ── Conflicts & Themes ────────────────── */}
      {activeTab === 'other' && (
        <div className="story-other-grid">
          <div className="story-other-section">
            <div className="story-view-header">
              <h3>Conflicts</h3>
              <button className="btn btn-primary btn-small" onClick={addConflict}>
                <img src="/icons/actions/add.svg" alt="" width="16" height="16" /> Add
              </button>
            </div>
            <div className="conflicts-list">
              {conflicts.map(({ id, name, description: desc }) => (
                <div key={id} className="item-card">
                  <div className="item-content">
                    <div className="item-title">{name}</div>
                    {desc && <div className="item-description">{desc}</div>}
                  </div>
                  <div className="item-actions">
                    <button className="btn btn-small btn-danger" onClick={() => dispatch({ type: ACTIONS.DELETE_CONFLICT, payload: id })}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="story-other-section">
            <div className="story-view-header">
              <h3>Themes</h3>
              <button className="btn btn-primary btn-small" onClick={addTheme}>
                <img src="/icons/actions/add.svg" alt="" width="16" height="16" /> Add
              </button>
            </div>
            <div className="themes-list">
              {themes.map(({ id, name, description: desc }) => (
                <div key={id} className="item-card">
                  <div className="item-content">
                    <div className="item-title">{name}</div>
                    {desc && <div className="item-description">{desc}</div>}
                  </div>
                  <div className="item-actions">
                    <button className="btn btn-small btn-danger" onClick={() => dispatch({ type: ACTIONS.DELETE_THEME, payload: id })}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal}>
        {modalContent}
      </Modal>
    </section>
  );
};

export default StoryPage;
```

---

## 11.7 Destructuring Highlights

| Pattern | Location |
|---------|----------|
| `const { story: { acts, characters, ... } } = useAppState()` | StoryPage — nested destructuring |
| `TABS.map(({ key, label, icon }) => ...)` | StoryTabs — destructure in map |
| `scenes.map(({ id: sceneId, title: sceneTitle }) => ...)` | ActCard — rename destructured props |
| `{...act}` spread into ActCard | StoryPage — pass all act props at once |

---

## 11.8 Files Created

| File | Replaces |
|------|----------|
| `src/components/story/StoryPage.jsx` | `StoryManager` object |
| `src/components/story/StoryTabs.jsx` | Story tab buttons in `index.html` |
| `src/components/story/ActCard.jsx` | Act card HTML |
| `src/components/story/CharacterCard.jsx` | Character card HTML |
| `src/components/story/LocationCard.jsx` | Location card HTML |
| `src/components/story/QuestCard.jsx` | Quest card HTML |

---

**Next:** [Chapter 12 — Notes](./12-notes.md)
