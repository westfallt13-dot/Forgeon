# Chapter 3 — State Management

This chapter replaces the vanilla `AppState`, `ProjectManager`, and localStorage persistence with React Context, `useReducer`, and custom hooks.

---

## 3.1 Constants

> **File:** `src/utils/constants.js`

```js
// Default note categories shared across the app
export const DEFAULT_NOTE_CATEGORIES = [
  'Ideas', 'To-Do', 'Research', 'Bugs', 'Design', 'Other'
];

// Empty story structure used when creating a new project
export const EMPTY_STORY = {
  acts: [],
  backgroundMap: null,
  connectionWaypoints: {},
  characters: [],
  locations: [],
  timeline: [],
  conflicts: [],
  themes: [],
  items: [],
  quests: [],
};

// Initial application state — mirrors the original AppState defaults
export const INITIAL_STATE = {
  currentSection: 'dashboard',
  tasks: [],
  assets: [],
  milestones: [],
  notes: [],
  noteCategories: [...DEFAULT_NOTE_CATEGORIES],
  theme: 'light',
  classes: [],
  mechanics: [],
  story: { ...EMPTY_STORY },
};

// Action types used by the reducer
export const ACTIONS = {
  // Bulk
  LOAD_STATE: 'LOAD_STATE',
  RESET_STATE: 'RESET_STATE',

  // Navigation
  SET_SECTION: 'SET_SECTION',

  // Theme
  TOGGLE_THEME: 'TOGGLE_THEME',

  // Tasks
  ADD_TASK: 'ADD_TASK',
  UPDATE_TASK: 'UPDATE_TASK',
  DELETE_TASK: 'DELETE_TASK',
  TOGGLE_TASK: 'TOGGLE_TASK',

  // Assets
  ADD_ASSET: 'ADD_ASSET',
  UPDATE_ASSET: 'UPDATE_ASSET',
  DELETE_ASSET: 'DELETE_ASSET',

  // Milestones
  ADD_MILESTONE: 'ADD_MILESTONE',
  UPDATE_MILESTONE: 'UPDATE_MILESTONE',
  DELETE_MILESTONE: 'DELETE_MILESTONE',

  // Notes
  ADD_NOTE: 'ADD_NOTE',
  UPDATE_NOTE: 'UPDATE_NOTE',
  DELETE_NOTE: 'DELETE_NOTE',

  // Classes
  ADD_CLASS: 'ADD_CLASS',
  UPDATE_CLASS: 'UPDATE_CLASS',
  DELETE_CLASS: 'DELETE_CLASS',

  // Mechanics
  ADD_MECHANIC: 'ADD_MECHANIC',
  UPDATE_MECHANIC: 'UPDATE_MECHANIC',
  DELETE_MECHANIC: 'DELETE_MECHANIC',

  // Story
  SET_STORY: 'SET_STORY',
  ADD_ACT: 'ADD_ACT',
  UPDATE_ACT: 'UPDATE_ACT',
  DELETE_ACT: 'DELETE_ACT',
  ADD_CHARACTER: 'ADD_CHARACTER',
  UPDATE_CHARACTER: 'UPDATE_CHARACTER',
  DELETE_CHARACTER: 'DELETE_CHARACTER',
  ADD_LOCATION: 'ADD_LOCATION',
  UPDATE_LOCATION: 'UPDATE_LOCATION',
  DELETE_LOCATION: 'DELETE_LOCATION',
  ADD_QUEST: 'ADD_QUEST',
  UPDATE_QUEST: 'UPDATE_QUEST',
  DELETE_QUEST: 'DELETE_QUEST',
  ADD_TIMELINE_EVENT: 'ADD_TIMELINE_EVENT',
  UPDATE_TIMELINE_EVENT: 'UPDATE_TIMELINE_EVENT',
  DELETE_TIMELINE_EVENT: 'DELETE_TIMELINE_EVENT',
  ADD_STORY_ITEM: 'ADD_STORY_ITEM',
  UPDATE_STORY_ITEM: 'UPDATE_STORY_ITEM',
  DELETE_STORY_ITEM: 'DELETE_STORY_ITEM',
  ADD_CONFLICT: 'ADD_CONFLICT',
  UPDATE_CONFLICT: 'UPDATE_CONFLICT',
  DELETE_CONFLICT: 'DELETE_CONFLICT',
  ADD_THEME: 'ADD_THEME',
  UPDATE_THEME: 'UPDATE_THEME',
  DELETE_THEME: 'DELETE_THEME',
};
```

---

## 3.2 The Reducer

> **File:** `src/context/appReducer.js`

The reducer is a pure function that returns new state for every action.
Destructuring is used everywhere — in the function signature, inside each case, and for the returned state.

```js
import { ACTIONS, INITIAL_STATE } from '../utils/constants';

/**
 * Main application reducer.
 * Every case destructures the payload and returns a NEW state object
 * (never mutates the existing state).
 */
export default function appReducer(state, action) {
  const { type, payload } = action; // ← destructure action

  switch (type) {
    // ─── Bulk ──────────────────────────────────────
    case ACTIONS.LOAD_STATE:
      return { ...state, ...payload };

    case ACTIONS.RESET_STATE:
      return { ...INITIAL_STATE };

    // ─── Navigation ────────────────────────────────
    case ACTIONS.SET_SECTION:
      return { ...state, currentSection: payload };

    // ─── Theme ─────────────────────────────────────
    case ACTIONS.TOGGLE_THEME:
      return {
        ...state,
        theme: state.theme === 'light' ? 'dark' : 'light',
      };

    // ─── Tasks ─────────────────────────────────────
    case ACTIONS.ADD_TASK:
      return { ...state, tasks: [...state.tasks, payload] };

    case ACTIONS.UPDATE_TASK: {
      const { id, ...updates } = payload; // ← nested destructuring
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      };
    }

    case ACTIONS.DELETE_TASK:
      return { ...state, tasks: state.tasks.filter((t) => t.id !== payload) };

    case ACTIONS.TOGGLE_TASK:
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === payload ? { ...t, completed: !t.completed } : t
        ),
      };

    // ─── Assets ────────────────────────────────────
    case ACTIONS.ADD_ASSET:
      return { ...state, assets: [...state.assets, payload] };

    case ACTIONS.UPDATE_ASSET: {
      const { id, ...updates } = payload;
      return {
        ...state,
        assets: state.assets.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      };
    }

    case ACTIONS.DELETE_ASSET:
      return { ...state, assets: state.assets.filter((a) => a.id !== payload) };

    // ─── Milestones ────────────────────────────────
    case ACTIONS.ADD_MILESTONE:
      return { ...state, milestones: [...state.milestones, payload] };

    case ACTIONS.UPDATE_MILESTONE: {
      const { id, ...updates } = payload;
      return {
        ...state,
        milestones: state.milestones.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      };
    }

    case ACTIONS.DELETE_MILESTONE:
      return {
        ...state,
        milestones: state.milestones.filter((m) => m.id !== payload),
      };

    // ─── Notes ─────────────────────────────────────
    case ACTIONS.ADD_NOTE:
      return { ...state, notes: [...state.notes, payload] };

    case ACTIONS.UPDATE_NOTE: {
      const { id, ...updates } = payload;
      return {
        ...state,
        notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      };
    }

    case ACTIONS.DELETE_NOTE:
      return { ...state, notes: state.notes.filter((n) => n.id !== payload) };

    // ─── Classes ───────────────────────────────────
    case ACTIONS.ADD_CLASS:
      return { ...state, classes: [...state.classes, payload] };

    case ACTIONS.UPDATE_CLASS: {
      const { id, ...updates } = payload;
      return {
        ...state,
        classes: state.classes.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      };
    }

    case ACTIONS.DELETE_CLASS:
      return { ...state, classes: state.classes.filter((c) => c.id !== payload) };

    // ─── Mechanics ─────────────────────────────────
    case ACTIONS.ADD_MECHANIC:
      return { ...state, mechanics: [...state.mechanics, payload] };

    case ACTIONS.UPDATE_MECHANIC: {
      const { id, ...updates } = payload;
      return {
        ...state,
        mechanics: state.mechanics.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      };
    }

    case ACTIONS.DELETE_MECHANIC:
      return {
        ...state,
        mechanics: state.mechanics.filter((m) => m.id !== payload),
      };

    // ─── Story (whole object) ──────────────────────
    case ACTIONS.SET_STORY:
      return { ...state, story: { ...state.story, ...payload } };

    // ─── Story → Acts ──────────────────────────────
    case ACTIONS.ADD_ACT:
      return {
        ...state,
        story: { ...state.story, acts: [...state.story.acts, payload] },
      };

    case ACTIONS.UPDATE_ACT: {
      const { id, ...updates } = payload;
      return {
        ...state,
        story: {
          ...state.story,
          acts: state.story.acts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        },
      };
    }

    case ACTIONS.DELETE_ACT:
      return {
        ...state,
        story: {
          ...state.story,
          acts: state.story.acts.filter((a) => a.id !== payload),
        },
      };

    // ─── Story → Characters ────────────────────────
    case ACTIONS.ADD_CHARACTER:
      return {
        ...state,
        story: {
          ...state.story,
          characters: [...state.story.characters, payload],
        },
      };

    case ACTIONS.UPDATE_CHARACTER: {
      const { id, ...updates } = payload;
      return {
        ...state,
        story: {
          ...state.story,
          characters: state.story.characters.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        },
      };
    }

    case ACTIONS.DELETE_CHARACTER:
      return {
        ...state,
        story: {
          ...state.story,
          characters: state.story.characters.filter((c) => c.id !== payload),
        },
      };

    // ─── Story → Locations ─────────────────────────
    case ACTIONS.ADD_LOCATION:
      return {
        ...state,
        story: {
          ...state.story,
          locations: [...state.story.locations, payload],
        },
      };

    case ACTIONS.UPDATE_LOCATION: {
      const { id, ...updates } = payload;
      return {
        ...state,
        story: {
          ...state.story,
          locations: state.story.locations.map((l) =>
            l.id === id ? { ...l, ...updates } : l
          ),
        },
      };
    }

    case ACTIONS.DELETE_LOCATION:
      return {
        ...state,
        story: {
          ...state.story,
          locations: state.story.locations.filter((l) => l.id !== payload),
        },
      };

    // ─── Story → Quests ────────────────────────────
    case ACTIONS.ADD_QUEST:
      return {
        ...state,
        story: { ...state.story, quests: [...state.story.quests, payload] },
      };

    case ACTIONS.UPDATE_QUEST: {
      const { id, ...updates } = payload;
      return {
        ...state,
        story: {
          ...state.story,
          quests: state.story.quests.map((q) =>
            q.id === id ? { ...q, ...updates } : q
          ),
        },
      };
    }

    case ACTIONS.DELETE_QUEST:
      return {
        ...state,
        story: {
          ...state.story,
          quests: state.story.quests.filter((q) => q.id !== payload),
        },
      };

    // ─── Story → Timeline ──────────────────────────
    case ACTIONS.ADD_TIMELINE_EVENT:
      return {
        ...state,
        story: {
          ...state.story,
          timeline: [...state.story.timeline, payload],
        },
      };

    case ACTIONS.UPDATE_TIMELINE_EVENT: {
      const { id, ...updates } = payload;
      return {
        ...state,
        story: {
          ...state.story,
          timeline: state.story.timeline.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        },
      };
    }

    case ACTIONS.DELETE_TIMELINE_EVENT:
      return {
        ...state,
        story: {
          ...state.story,
          timeline: state.story.timeline.filter((e) => e.id !== payload),
        },
      };

    // ─── Story → Items ─────────────────────────────
    case ACTIONS.ADD_STORY_ITEM:
      return {
        ...state,
        story: { ...state.story, items: [...state.story.items, payload] },
      };

    case ACTIONS.UPDATE_STORY_ITEM: {
      const { id, ...updates } = payload;
      return {
        ...state,
        story: {
          ...state.story,
          items: state.story.items.map((i) =>
            i.id === id ? { ...i, ...updates } : i
          ),
        },
      };
    }

    case ACTIONS.DELETE_STORY_ITEM:
      return {
        ...state,
        story: {
          ...state.story,
          items: state.story.items.filter((i) => i.id !== payload),
        },
      };

    // ─── Story → Conflicts ─────────────────────────
    case ACTIONS.ADD_CONFLICT:
      return {
        ...state,
        story: {
          ...state.story,
          conflicts: [...state.story.conflicts, payload],
        },
      };

    case ACTIONS.UPDATE_CONFLICT: {
      const { id, ...updates } = payload;
      return {
        ...state,
        story: {
          ...state.story,
          conflicts: state.story.conflicts.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        },
      };
    }

    case ACTIONS.DELETE_CONFLICT:
      return {
        ...state,
        story: {
          ...state.story,
          conflicts: state.story.conflicts.filter((c) => c.id !== payload),
        },
      };

    // ─── Story → Themes ────────────────────────────
    case ACTIONS.ADD_THEME:
      return {
        ...state,
        story: { ...state.story, themes: [...state.story.themes, payload] },
      };

    case ACTIONS.UPDATE_THEME: {
      const { id, ...updates } = payload;
      return {
        ...state,
        story: {
          ...state.story,
          themes: state.story.themes.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        },
      };
    }

    case ACTIONS.DELETE_THEME:
      return {
        ...state,
        story: {
          ...state.story,
          themes: state.story.themes.filter((t) => t.id !== payload),
        },
      };

    default:
      console.warn(`Unknown action type: ${type}`);
      return state;
  }
}
```

---

## 3.3 The Context Provider

> **File:** `src/context/AppContext.js`

This replaces the original `AppState` object AND provides the `dispatch` function
that every component uses to trigger state changes.

```jsx
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import appReducer from './appReducer';
import { ACTIONS, INITIAL_STATE } from '../utils/constants';

// ─── Create contexts ───────────────────────────────
const AppStateContext = createContext(null);
const AppDispatchContext = createContext(null);

// ─── Project helpers ───────────────────────────────
function getProjects() {
  try {
    const raw = localStorage.getItem('forgeon_projects');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getCurrentProjectId() {
  const projects = getProjects();
  const saved = localStorage.getItem('forgeon_currentProject');
  if (saved && projects.find(({ id }) => id === saved)) return saved;
  return projects.length > 0 ? projects[0].id : null;
}

function getStorageKey(projectId, key) {
  return `forgeon_project_${projectId}_${key}`;
}

// ─── Load state for a project from localStorage ───
function loadProjectState(projectId) {
  if (!projectId) return INITIAL_STATE;
  const raw = localStorage.getItem(getStorageKey(projectId, 'state'));
  if (!raw) return INITIAL_STATE;

  try {
    const parsed = JSON.parse(raw);
    // Apply the same migrations the original code did
    const {
      tasks = [],
      assets = [],
      milestones = [],
      notes: rawNotes = [],
      noteCategories,
      theme = 'light',
      classes = [],
      mechanics = [],
      story: rawStory = {},
    } = parsed;

    // Migrate old single-note string format
    let notes = rawNotes;
    if (typeof rawNotes === 'string' && rawNotes) {
      notes = [{
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        title: 'Legacy Notes',
        content: rawNotes,
        category: 'Other',
        tags: [],
        color: '',
        pinned: false,
        archived: false,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      }];
    }

    // Ensure story sub-collections exist
    const story = {
      acts: rawStory.acts || [],
      backgroundMap: rawStory.backgroundMap || null,
      connectionWaypoints: rawStory.connectionWaypoints || {},
      characters: (rawStory.characters || []).map((char) => {
        // Migrate old classId → classes array
        if (char.classId && !char.classes) {
          const { classId, ...rest } = char;
          return { ...rest, classes: [{ classId, priority: 5 }], conflictResolution: char.conflictResolution || {} };
        }
        return { ...char, conflictResolution: char.conflictResolution || {} };
      }),
      locations: rawStory.locations || [],
      timeline: rawStory.timeline || [],
      conflicts: rawStory.conflicts || [],
      themes: rawStory.themes || [],
      items: rawStory.items || [],
      quests: rawStory.quests || [],
    };

    // Ensure all classes have classType
    const migratedClasses = classes.map((cls) => ({
      classType: 'character',
      ...cls,
    }));

    return {
      ...INITIAL_STATE,
      tasks,
      assets,
      milestones,
      notes,
      noteCategories: noteCategories || INITIAL_STATE.noteCategories,
      theme,
      classes: migratedClasses,
      mechanics,
      story,
    };
  } catch (e) {
    console.error('Error loading state:', e);
    return INITIAL_STATE;
  }
}

// ─── Provider Component ────────────────────────────
export function AppProvider({ children }) {
  // Load initial project
  const projectId = getCurrentProjectId();
  const initialState = loadProjectState(projectId);

  const [state, dispatch] = useReducer(appReducer, initialState);

  // Persist state to localStorage on every change
  const saveState = useCallback(() => {
    const pid = getCurrentProjectId();
    if (!pid) return;
    const {
      tasks, assets, milestones, notes, noteCategories,
      theme, classes, mechanics, story,
    } = state;
    const toSave = { tasks, assets, milestones, notes, noteCategories, theme, classes, mechanics, story };
    localStorage.setItem(getStorageKey(pid, 'state'), JSON.stringify(toSave));
  }, [state]);

  useEffect(() => {
    saveState();
  }, [saveState]);

  // Apply theme to <body>
  useEffect(() => {
    document.body.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

// ─── Consumer hooks (destructure these in components!) ─
export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (ctx === null) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}

export function useAppDispatch() {
  const ctx = useContext(AppDispatchContext);
  if (ctx === null) throw new Error('useAppDispatch must be used within AppProvider');
  return ctx;
}

// Re-export ACTIONS for convenience
export { ACTIONS };
```

### How Components Use It

```jsx
// In any component — destructure exactly what you need:
import { useAppState, useAppDispatch, ACTIONS } from '../../context/AppContext';

const SomeComponent = () => {
  const { tasks, theme } = useAppState();       // ← object destructuring
  const dispatch = useAppDispatch();

  const handleAdd = (newTask) => {
    dispatch({ type: ACTIONS.ADD_TASK, payload: newTask });
  };

  return <div>...</div>;
};
```

---

## 3.4 Custom Hooks

### `useLocalStorage`

> **File:** `src/hooks/useLocalStorage.js`

```js
import { useState, useEffect } from 'react';

/**
 * A hook that syncs a piece of state with localStorage.
 * Uses array destructuring on the return value — same API as useState.
 */
export default function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue]; // ← array destructuring for callers
}
```

### `useProject`

> **File:** `src/hooks/useProject.js`

This hook encapsulates all project CRUD operations, replacing `ProjectManager`.

```js
import { useCallback } from 'react';
import useLocalStorage from './useLocalStorage';
import { generateId } from '../utils/helpers';

/**
 * Hook that manages multi-project support.
 * Returns an object — callers destructure what they need.
 */
export default function useProject() {
  const [projects, setProjects] = useLocalStorage('forgeon_projects', []);
  const [currentProjectId, setCurrentProjectId] = useLocalStorage('forgeon_currentProject', null);

  // Ensure there is always at least one project
  if (projects.length === 0) {
    const defaultProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'My Game Project',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
    setProjects([defaultProject]);
    setCurrentProjectId(defaultProject.id);
  }

  const currentProject = projects.find(({ id }) => id === currentProjectId) || projects[0];

  const createProject = useCallback((name) => {
    const newProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name || 'Untitled Project',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
    setProjects((prev) => [...prev, newProject]);
    setCurrentProjectId(newProject.id);
    return newProject;
  }, [setProjects, setCurrentProjectId]);

  const switchProject = useCallback((projectId) => {
    setCurrentProjectId(projectId);
    window.location.reload(); // same reload approach as original
  }, [setCurrentProjectId]);

  const renameProject = useCallback((projectId, newName) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, name: newName, lastModified: new Date().toISOString() }
          : p
      )
    );
  }, [setProjects]);

  const deleteProject = useCallback((projectId) => {
    if (projects.length <= 1) return false;
    localStorage.removeItem(`forgeon_project_${projectId}`);
    setProjects((prev) => prev.filter(({ id }) => id !== projectId));
    if (currentProjectId === projectId) {
      const remaining = projects.filter(({ id }) => id !== projectId);
      setCurrentProjectId(remaining[0]?.id);
      window.location.reload();
    }
    return true;
  }, [projects, currentProjectId, setProjects, setCurrentProjectId]);

  // Return object — consumers destructure what they need
  return {
    projects,
    currentProject,
    currentProjectId,
    createProject,
    switchProject,
    renameProject,
    deleteProject,
  };
}
```

### `useRelationships`

> **File:** `src/hooks/useRelationships.js`

```js
import { useMemo } from 'react';
import { useAppState } from '../context/AppContext';

/**
 * Builds a unified list of all items for relationship lookup.
 * Replaces RelationshipManager.getAllItems().
 */
export default function useRelationships() {
  const { tasks, assets, milestones, notes, classes, mechanics, story } = useAppState();

  const allItems = useMemo(() => {
    const items = [];

    notes.forEach(({ id, title, category }) => {
      items.push({ id, type: 'note', name: title, category, section: 'notes' });
    });

    classes.forEach(({ id, name, classType }) => {
      items.push({
        id,
        type: 'class',
        name,
        category: classType === 'character' ? 'Character Class' : 'Instance Class',
        section: 'classes',
      });
    });

    mechanics.forEach(({ id, name, category }) => {
      items.push({ id, type: 'mechanic', name, category, section: 'mechanics' });
    });

    tasks.forEach(({ id, title, category }) => {
      items.push({ id, type: 'task', name: title, category, section: 'tasks' });
    });

    assets.forEach(({ id, name, type: assetType }) => {
      items.push({ id, type: 'asset', name, category: assetType, section: 'assets' });
    });

    milestones.forEach(({ id, name }) => {
      items.push({ id, type: 'milestone', name, category: 'Milestone', section: 'milestones' });
    });

    const { characters = [], locations = [], quests = [], items: storyItems = [] } = story;

    characters.forEach(({ id, name, role }) => {
      items.push({ id, type: 'character', name, category: role || 'Character', section: 'story' });
    });

    locations.forEach(({ id, name, type: locType }) => {
      items.push({ id, type: 'location', name, category: locType || 'Location', section: 'story' });
    });

    quests.forEach(({ id, name, type: questType }) => {
      items.push({ id, type: 'quest', name, category: questType || 'Quest', section: 'story' });
    });

    storyItems.forEach(({ id, name, type: itemType }) => {
      items.push({ id, type: 'storyItem', name, category: itemType || 'Item', section: 'story' });
    });

    return items;
  }, [tasks, assets, milestones, notes, classes, mechanics, story]);

  const findItem = (itemId) => allItems.find(({ id }) => id === itemId);

  return { allItems, findItem };
}
```

---

## 3.5 Summary

| What changed | Destructuring technique |
|-------------|------------------------|
| `const { type, payload } = action` | Object destructuring in reducer |
| `const { id, ...updates } = payload` | Rest/spread destructuring for immutable updates |
| `const { tasks, theme } = useAppState()` | Object destructuring from context |
| `const [value, setValue] = useState(...)` | Array destructuring from hooks |
| `const { projects, createProject } = useProject()` | Object destructuring from custom hook |

---

**Next:** [Chapter 4 — Core Components](./04-core-components.md)
