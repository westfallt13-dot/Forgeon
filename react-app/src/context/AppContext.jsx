import { createContext, useContext, useReducer, useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { generateId } from '../utils/helpers';
import {
  saveState,
  loadState,
  removeProjectState,
  getProjects,
  saveProjects,
  getCurrentProjectId,
  setCurrentProjectId,
} from '../utils/storage';

// ── Default state ──────────────────────────────────────────────────────────────

const DEFAULT_STORY = {
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

const DEFAULT_STATE = {
  currentSection: 'dashboard',
  tasks: [],
  assets: [],
  milestones: [],
  notes: [],
  noteCategories: ['Ideas', 'To-Do', 'Research', 'Bugs', 'Design', 'Other'],
  theme: 'light',
  classes: [],
  mechanics: [],
  story: { ...DEFAULT_STORY },
};

// ── Resolve initial project ID at module level (runs once) ─────────────────────

function resolveInitialProjectId() {
  let projects = getProjects();
  let projectId = getCurrentProjectId();

  if (projectId && projects.find((p) => p.id === projectId)) {
    return projectId;
  } else if (projects.length > 0) {
    projectId = projects[0].id;
    setCurrentProjectId(projectId);
    return projectId;
  } else {
    projectId = generateProjectId();
    projects = [
      {
        id: projectId,
        name: 'My Game Project',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
    ];
    saveProjects(projects);
    setCurrentProjectId(projectId);
    return projectId;
  }
}

function resolveInitialState(projectId) {
  const parsed = loadState(projectId);
  if (parsed) return migrateState(parsed);
  return { ...DEFAULT_STATE };
}

// ── Action types ───────────────────────────────────────────────────────────────

const ActionTypes = {
  SET_STATE: 'SET_STATE',
  SET_SECTION: 'SET_SECTION',
  SET_THEME: 'SET_THEME',

  // CRUD for top-level collections
  ADD_ITEM: 'ADD_ITEM',
  UPDATE_ITEM: 'UPDATE_ITEM',
  DELETE_ITEM: 'DELETE_ITEM',
  SET_COLLECTION: 'SET_COLLECTION',

  // Story sub-items
  ADD_STORY_ITEM: 'ADD_STORY_ITEM',
  UPDATE_STORY_ITEM: 'UPDATE_STORY_ITEM',
  DELETE_STORY_ITEM: 'DELETE_STORY_ITEM',
  SET_STORY_FIELD: 'SET_STORY_FIELD',

  // Note categories
  SET_NOTE_CATEGORIES: 'SET_NOTE_CATEGORIES',
};

// ── Reducer ────────────────────────────────────────────────────────────────────

function appReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_STATE:
      return { ...state, ...action.payload };

    case ActionTypes.SET_SECTION:
      return { ...state, currentSection: action.payload };

    case ActionTypes.SET_THEME:
      return { ...state, theme: action.payload };

    // Generic CRUD for top-level arrays (tasks, assets, milestones, notes, classes, mechanics)
    case ActionTypes.ADD_ITEM: {
      const { collection, item } = action.payload;
      return { ...state, [collection]: [...state[collection], item] };
    }
    case ActionTypes.UPDATE_ITEM: {
      const { collection, id, updates } = action.payload;
      return {
        ...state,
        [collection]: state[collection].map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      };
    }
    case ActionTypes.DELETE_ITEM: {
      const { collection, id } = action.payload;
      return {
        ...state,
        [collection]: state[collection].filter((item) => item.id !== id),
      };
    }
    case ActionTypes.SET_COLLECTION: {
      const { collection, items } = action.payload;
      return { ...state, [collection]: items };
    }

    // Story sub-item CRUD
    case ActionTypes.ADD_STORY_ITEM: {
      const { field, item } = action.payload;
      return {
        ...state,
        story: {
          ...state.story,
          [field]: [...(state.story[field] || []), item],
        },
      };
    }
    case ActionTypes.UPDATE_STORY_ITEM: {
      const { field, id, updates } = action.payload;
      return {
        ...state,
        story: {
          ...state.story,
          [field]: (state.story[field] || []).map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        },
      };
    }
    case ActionTypes.DELETE_STORY_ITEM: {
      const { field, id } = action.payload;
      return {
        ...state,
        story: {
          ...state.story,
          [field]: (state.story[field] || []).filter((item) => item.id !== id),
        },
      };
    }
    case ActionTypes.SET_STORY_FIELD: {
      const { field, value } = action.payload;
      return {
        ...state,
        story: { ...state.story, [field]: value },
      };
    }

    case ActionTypes.SET_NOTE_CATEGORIES:
      return { ...state, noteCategories: action.payload };

    default:
      return state;
  }
}

// ── Migrations ─────────────────────────────────────────────────────────────────

function migrateState(parsed) {
  const state = { ...DEFAULT_STATE };

  state.tasks = parsed.tasks || [];
  state.assets = parsed.assets || [];
  state.milestones = parsed.milestones || [];

  // Notes migration: convert old single-note string format
  if (typeof parsed.notes === 'string' && parsed.notes) {
    state.notes = [
      {
        id: generateId(),
        title: 'Legacy Notes',
        content: parsed.notes,
        category: 'Other',
        tags: [],
        color: '',
        pinned: false,
        archived: false,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      },
    ];
  } else {
    state.notes = parsed.notes || [];
  }

  state.noteCategories =
    parsed.noteCategories || ['Ideas', 'To-Do', 'Research', 'Bugs', 'Design', 'Other'];
  state.theme = parsed.theme || 'light';

  // Classes migration: ensure classType property
  state.classes = (parsed.classes || []).map((cls) => ({
    ...cls,
    classType: cls.classType || 'character',
  }));

  state.mechanics = parsed.mechanics || [];

  // Story with fallbacks for missing properties
  const story = parsed.story || {};
  state.story = {
    acts: story.acts || [],
    backgroundMap: story.backgroundMap || null,
    connectionWaypoints: story.connectionWaypoints || {},
    characters: story.characters || [],
    locations: story.locations || [],
    timeline: story.timeline || [],
    conflicts: story.conflicts || [],
    themes: story.themes || [],
    items: story.items || [],
    quests: story.quests || [],
  };

  // Character migration: convert old single classId to classes array
  state.story.characters = state.story.characters.map((char) => {
    const updated = { ...char };
    if (updated.classId && !updated.classes) {
      updated.classes = [{ classId: updated.classId, priority: 5 }];
      delete updated.classId;
    }
    if (!updated.conflictResolution) {
      updated.conflictResolution = {};
    }
    return updated;
  });

  return state;
}

// ── Context ────────────────────────────────────────────────────────────────────

const AppContext = createContext(null);

// ── Helper: generate project ID ────────────────────────────────────────────────

function generateProjectId() {
  return 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function AppProvider({ children }) {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // Resolve project ID and initial state once via lazy initializer
  const [currentProjectId] = useState(resolveInitialProjectId);
  const [state, dispatch] = useReducer(appReducer, currentProjectId, resolveInitialState);

  // ── Apply theme to DOM ───────────────────────────────────────────────────────

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  // ── Debounced auto-save ──────────────────────────────────────────────────────

  const saveTimerRef = useRef(null);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveState(currentProjectId, state);
    }, 300);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, currentProjectId]);

  // ── Section navigation ───────────────────────────────────────────────────────

  const setSection = useCallback(
    (section) => dispatch({ type: ActionTypes.SET_SECTION, payload: section }),
    []
  );

  // ── Theme ────────────────────────────────────────────────────────────────────

  const toggleTheme = useCallback(() => {
    dispatch({
      type: ActionTypes.SET_THEME,
      payload: state.theme === 'light' ? 'dark' : 'light',
    });
  }, [state.theme]);

  // ── Generic CRUD for top-level collections ───────────────────────────────────

  const addItem = useCallback((collection, item) => {
    dispatch({ type: ActionTypes.ADD_ITEM, payload: { collection, item } });
  }, []);

  const updateItem = useCallback((collection, id, updates) => {
    dispatch({ type: ActionTypes.UPDATE_ITEM, payload: { collection, id, updates } });
  }, []);

  const deleteItem = useCallback((collection, id) => {
    dispatch({ type: ActionTypes.DELETE_ITEM, payload: { collection, id } });
  }, []);

  const setCollection = useCallback((collection, items) => {
    dispatch({ type: ActionTypes.SET_COLLECTION, payload: { collection, items } });
  }, []);

  // ── Story sub-item CRUD ──────────────────────────────────────────────────────

  const addStoryItem = useCallback((field, item) => {
    dispatch({ type: ActionTypes.ADD_STORY_ITEM, payload: { field, item } });
  }, []);

  const updateStoryItem = useCallback((field, id, updates) => {
    dispatch({ type: ActionTypes.UPDATE_STORY_ITEM, payload: { field, id, updates } });
  }, []);

  const deleteStoryItem = useCallback((field, id) => {
    dispatch({ type: ActionTypes.DELETE_STORY_ITEM, payload: { field, id } });
  }, []);

  const setStoryField = useCallback((field, value) => {
    dispatch({ type: ActionTypes.SET_STORY_FIELD, payload: { field, value } });
  }, []);

  // ── Note categories ──────────────────────────────────────────────────────────

  const setNoteCategories = useCallback((categories) => {
    dispatch({ type: ActionTypes.SET_NOTE_CATEGORIES, payload: categories });
  }, []);

  // ── Project management ───────────────────────────────────────────────────────

  const createProject = useCallback((name) => {
    const projects = getProjects();
    const project = {
      id: generateProjectId(),
      name: name || 'Untitled Project',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
    projects.push(project);
    saveProjects(projects);
    // Save current state before switching
    saveState(currentProjectId, state);
    setCurrentProjectId(project.id);
    window.location.reload();
    return project;
  }, [currentProjectId, state]);

  const switchProject = useCallback(
    (projectId) => {
      const projects = getProjects();
      if (!projects.find((p) => p.id === projectId)) {
        console.error('Project not found:', projectId);
        return;
      }
      // Save current state before switching
      saveState(currentProjectId, state);
      // Update last modified
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        project.lastModified = new Date().toISOString();
        saveProjects(projects);
      }
      setCurrentProjectId(projectId);
      window.location.reload();
    },
    [currentProjectId, state]
  );

  const deleteProject = useCallback(
    (projectId) => {
      let projects = getProjects();
      if (projects.length <= 1) return false;

      removeProjectState(projectId);
      projects = projects.filter((p) => p.id !== projectId);
      saveProjects(projects);

      if (currentProjectId === projectId) {
        setCurrentProjectId(projects[0].id);
        window.location.reload();
      }
      return true;
    },
    [currentProjectId]
  );

  const renameProject = useCallback((projectId, newName) => {
    const projects = getProjects();
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    project.name = newName;
    project.lastModified = new Date().toISOString();
    saveProjects(projects);
  }, []);

  const deleteAllProjects = useCallback(() => {
    const projects = getProjects();
    projects.forEach((project) => removeProjectState(project.id));
    saveProjects([]);
    // Create fresh default project
    const projectId = generateProjectId();
    const newProjects = [
      {
        id: projectId,
        name: 'My Game Project',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
    ];
    saveProjects(newProjects);
    setCurrentProjectId(projectId);
    window.location.reload();
  }, []);

  // ── Context value ────────────────────────────────────────────────────────────

  const projects = useMemo(() => getProjects(), []);

  const getCurrentProject = useCallback(
    () => projects.find((p) => p.id === currentProjectId),
    [projects, currentProjectId]
  );

  const value = {
    // State
    ...state,
    currentProjectId,
    isElectron,

    // Navigation
    setSection,

    // Theme
    toggleTheme,

    // Generic CRUD
    addItem,
    updateItem,
    deleteItem,
    setCollection,

    // Story CRUD
    addStoryItem,
    updateStoryItem,
    deleteStoryItem,
    setStoryField,

    // Note categories
    setNoteCategories,

    // Projects
    projects,
    createProject,
    switchProject,
    deleteProject,
    renameProject,
    deleteAllProjects,
    getCurrentProject,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * Hook to access the AppContext
 * @returns {Object} The full app context value
 */
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
