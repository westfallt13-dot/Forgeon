# Chapter 4 — Core Components

This chapter builds the app shell: the root `App` component, Sidebar, ThemeToggle, ProjectSelector, Modal, and GlobalSearch.

---

## 4.1 App Component

> **File:** `src/App.js`

This replaces the `<div class="app-container">` from `index.html` and the `Navigation` object from `script.js`.

```jsx
import React from 'react';
import { useAppState } from './context/AppContext';
import Sidebar from './components/layout/Sidebar';
import GlobalSearch from './components/layout/GlobalSearch';
import Dashboard from './components/dashboard/Dashboard';
import TasksPage from './components/tasks/TasksPage';
import AssetsPage from './components/assets/AssetsPage';
import MilestonesPage from './components/milestones/MilestonesPage';
import ClassesPage from './components/classes/ClassesPage';
import MechanicsPage from './components/mechanics/MechanicsPage';
import StoryPage from './components/story/StoryPage';
import NotesPage from './components/notes/NotesPage';
import Toast from './components/shared/Toast';

/**
 * Root application component.
 * Destructures `currentSection` from global state to pick the active page.
 */
const App = () => {
  const { currentSection } = useAppState(); // ← object destructuring

  // Map section names to components
  const sections = {
    dashboard: Dashboard,
    tasks: TasksPage,
    assets: AssetsPage,
    milestones: MilestonesPage,
    classes: ClassesPage,
    mechanics: MechanicsPage,
    story: StoryPage,
    notes: NotesPage,
  };

  const ActiveSection = sections[currentSection] || Dashboard;

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content" role="main">
        <GlobalSearch />
        <ActiveSection />
      </main>
      <Toast />
    </div>
  );
};

export default App;
```

---

## 4.2 Sidebar

> **File:** `src/components/layout/Sidebar.jsx`

Replaces the `<aside class="sidebar">` from `index.html`.

```jsx
import React from 'react';
import { useAppState, useAppDispatch, ACTIONS } from '../../context/AppContext';
import ThemeToggle from './ThemeToggle';
import ProjectSelector from './ProjectSelector';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'navigation/dashboard' },
  { key: 'tasks', label: 'Tasks', icon: 'navigation/tasks' },
  { key: 'assets', label: 'Assets', icon: 'navigation/assets' },
  { key: 'milestones', label: 'Milestones', icon: 'navigation/milestones' },
  { key: 'classes', label: 'Classes', icon: 'navigation/classes' },
  { key: 'mechanics', label: 'Mechanics', icon: 'navigation/mechanics' },
  { key: 'story', label: 'Story', icon: 'navigation/story' },
  { key: 'notes', label: 'Notes', icon: 'navigation/notes' },
];

const Sidebar = () => {
  const { currentSection } = useAppState();
  const dispatch = useAppDispatch();

  const navigate = (section) => {
    dispatch({ type: ACTIONS.SET_SECTION, payload: section });
  };

  return (
    <aside className="sidebar" role="navigation" aria-label="Main navigation">
      <div className="sidebar-header">
        <img
          src="/icons/application/forgeon-banner.png"
          alt="Forgeon"
          className="app-logo"
        />
        <ThemeToggle />
      </div>

      <ProjectSelector />

      <nav className="nav-menu">
        <ul className="nav-list">
          {NAV_ITEMS.map(({ key, label, icon }) => (
            <li key={key}>
              <button
                className={`nav-item ${currentSection === key ? 'active' : ''}`}
                onClick={() => navigate(key)}
                aria-current={currentSection === key ? 'page' : undefined}
              >
                <img
                  src={`/icons/${icon}.svg`}
                  alt=""
                  className="nav-icon"
                  width="20"
                  height="20"
                />
                <span className="nav-text">{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
```

**Destructuring highlight:** The `NAV_ITEMS.map(({ key, label, icon }) => ...)` destructures each item directly in the callback.

---

## 4.3 Theme Toggle

> **File:** `src/components/layout/ThemeToggle.jsx`

```jsx
import React from 'react';
import { useAppState, useAppDispatch, ACTIONS } from '../../context/AppContext';

const ThemeToggle = () => {
  const { theme } = useAppState();        // ← destructure theme
  const dispatch = useAppDispatch();

  const toggle = () => dispatch({ type: ACTIONS.TOGGLE_THEME });

  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Toggle dark mode">
      <img
        src={`/icons/theme/${theme === 'light' ? 'moon' : 'sun'}.svg`}
        alt=""
        className="theme-icon"
        width="24"
        height="24"
      />
    </button>
  );
};

export default ThemeToggle;
```

---

## 4.4 Project Selector

> **File:** `src/components/layout/ProjectSelector.jsx`

Replaces the `<div class="project-selector-container">` and the project modal.

```jsx
import React, { useState } from 'react';
import useProject from '../../hooks/useProject';

const ProjectSelector = () => {
  const {
    projects,
    currentProject,
    currentProjectId,
    createProject,
    switchProject,
    renameProject,
    deleteProject,
  } = useProject(); // ← destructure everything from the hook

  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');

  const handleSwitch = ({ target: { value } }) => {  // ← destructure event
    switchProject(value);
  };

  const handleCreate = () => {
    const name = prompt('Enter project name:', 'New Project');
    if (name) createProject(name);
  };

  const handleRename = () => {
    if (newName.trim()) {
      renameProject(currentProjectId, newName.trim());
      setShowModal(false);
    }
  };

  return (
    <>
      <div className="project-selector-container">
        <select
          className="project-selector"
          value={currentProjectId || ''}
          onChange={handleSwitch}
          aria-label="Select project"
        >
          {projects.map(({ id, name }) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <button
          className="project-menu-btn"
          onClick={() => {
            setNewName(currentProject?.name || '');
            setShowModal(true);
          }}
          title="Project Menu"
        >
          <img src="/icons/navigation/settings.svg" alt="" width="20" height="20" />
        </button>
      </div>

      {showModal && (
        <div className="project-modal active" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="project-modal-content">
            <div className="project-modal-header">
              <h2>Project Management</h2>
              <button className="project-modal-close" onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>
            <div className="project-modal-body">
              <div className="project-section">
                <h3>Current Project</h3>
                <div className="current-project-info">
                  <input
                    type="text"
                    className="project-name-input"
                    value={newName}
                    onChange={({ target: { value } }) => setNewName(value)}
                    placeholder="Project Name"
                  />
                  <button className="btn btn-sm btn-primary" onClick={handleRename}>
                    Rename
                  </button>
                </div>
              </div>

              <div className="project-section">
                <h3>Actions</h3>
                <button className="btn btn-primary" onClick={handleCreate}>
                  + New Project
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => deleteProject(currentProjectId)}
                >
                  Delete Current Project
                </button>
              </div>

              <div className="project-section">
                <h3>All Projects</h3>
                <div className="project-list">
                  {projects.map(({ id, name, lastModified }) => {
                    const isCurrent = id === currentProjectId;
                    return (
                      <div key={id} className={`project-list-item ${isCurrent ? 'current' : ''}`}>
                        <div className="project-list-item-info">
                          <div className="project-list-item-name">
                            {name} {isCurrent && '(Current)'}
                          </div>
                          <div className="project-list-item-date">
                            Last modified: {new Date(lastModified).toLocaleDateString()}
                          </div>
                        </div>
                        {!isCurrent && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => switchProject(id)}
                          >
                            Switch
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectSelector;
```

---

## 4.5 Modal

> **File:** `src/components/layout/Modal.jsx`

A reusable modal component that replaces the vanilla `Modal` object.

```jsx
import React, { useEffect, useCallback } from 'react';

/**
 * Reusable modal component.
 * Props are destructured directly in the parameter list.
 */
const Modal = ({ isOpen, onClose, children, title = '' }) => {
  // Close on Escape key
  const handleKeyDown = useCallback(
    ({ key }) => {                         // ← destructure event
      if (key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay active"
      role="dialog"
      aria-modal="true"
      onClick={({ target, currentTarget }) => {  // ← destructure event
        if (target === currentTarget) onClose();
      }}
    >
      <div className="modal-content">
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          &times;
        </button>
        <div className="modal-body">
          {title && <h3>{title}</h3>}
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
```

### Usage Pattern

```jsx
const [showModal, setShowModal] = useState(false);

<Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Task">
  <TaskForm onSave={handleSave} />
</Modal>
```

---

## 4.6 Global Search

> **File:** `src/components/layout/GlobalSearch.jsx`

Replaces the `Search` object from `script.js`.

```jsx
import React, { useState, useMemo } from 'react';
import useRelationships from '../../hooks/useRelationships';
import { useAppDispatch, ACTIONS } from '../../context/AppContext';

const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const dispatch = useAppDispatch();
  const { allItems } = useRelationships();

  // Filter items based on query
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    return allItems.filter(({ name, category }) =>
      name?.toLowerCase().includes(lower) || category?.toLowerCase().includes(lower)
    );
  }, [query, allItems]);

  const navigateTo = ({ section }) => {   // ← destructure the item
    dispatch({ type: ACTIONS.SET_SECTION, payload: section });
    setQuery('');
  };

  return (
    <div className="global-search">
      <div className="search-container">
        <div className="search-input-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Search across all sections..."
            value={query}
            onChange={({ target: { value } }) => setQuery(value)}
            aria-label="Search"
          />
          {query && (
            <button
              className="search-clear-btn"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="search-results" style={{ display: 'block' }}>
          {results.map(({ id, name, category, section, type }) => (
            <div
              key={id}
              className="search-result-item"
              onClick={() => navigateTo({ section })}
              style={{ cursor: 'pointer', padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}
            >
              <strong>{name}</strong>
              <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>
                {category} · {type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
```

---

## 4.7 Shared Icon Component

> **File:** `src/components/shared/Icon.jsx`

```jsx
import React from 'react';

const SIZES = { small: 16, medium: 20, large: 24, xlarge: 32 };

/**
 * Renders an SVG icon from the /icons directory.
 * All props are destructured in the parameter list.
 */
const Icon = ({ path, size = 'medium', alt = '', className = '' }) => {
  const dimension = SIZES[size] || 20;
  return (
    <img
      src={`/icons/${path}.svg`}
      alt={alt}
      className={`icon ${size} ${className}`}
      width={dimension}
      height={dimension}
    />
  );
};

export default Icon;
```

---

## 4.8 Toast Notification

> **File:** `src/components/shared/Toast.jsx`

```jsx
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

// Create a context so any component can trigger a toast
const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && <ToastDisplay {...toast} />}
    </ToastContext.Provider>
  );
}

const COLORS = {
  success: 'linear-gradient(135deg, #10b981, #059669)',
  error: 'linear-gradient(135deg, #ef4444, #dc2626)',
  warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
  info: 'linear-gradient(135deg, #3b82f6, #2563eb)',
};

const ToastDisplay = ({ message, type }) => (
  <div
    style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: COLORS[type] || COLORS.info,
      color: 'white',
      padding: '1rem 2rem',
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      zIndex: 99999,
      fontSize: '1rem',
      fontWeight: 600,
      maxWidth: '400px',
      textAlign: 'center',
      animation: 'fadeInOut 2s ease-in-out',
    }}
  >
    {message}
  </div>
);

// Default export for backward-compatible usage
const Toast = () => null; // Placeholder — use ToastProvider + useToast instead
export default Toast;
```

To integrate the ToastProvider, wrap it in `src/index.js`:

```jsx
import { ToastProvider } from './components/shared/Toast';

// Inside the render:
<ToastProvider>
  <AppProvider>
    <App />
  </AppProvider>
</ToastProvider>
```

---

## 4.9 Confirm Dialog

> **File:** `src/components/shared/ConfirmDialog.jsx`

```jsx
import React from 'react';

/**
 * Confirmation dialog component.
 * Props destructured directly in parameters.
 */
const ConfirmDialog = ({ message, onConfirm, onCancel, isOpen }) => {
  if (!isOpen) return null;

  return (
    <div
      className="confirm-overlay"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 99999,
      }}
      onClick={({ target, currentTarget }) => {
        if (target === currentTarget) onCancel();
      }}
    >
      <div
        style={{
          background: 'var(--bg-primary)', borderRadius: '12px', padding: '2rem',
          maxWidth: '500px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', whiteSpace: 'pre-line' }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
```

---

## 4.10 Files Created in This Chapter

| File | Replaces |
|------|----------|
| `src/App.js` | `index.html` body + `Navigation` object |
| `src/components/layout/Sidebar.jsx` | `<aside>` in `index.html` |
| `src/components/layout/ThemeToggle.jsx` | Theme toggle in `AppState` |
| `src/components/layout/ProjectSelector.jsx` | `ProjectManager` UI |
| `src/components/layout/Modal.jsx` | `Modal` object in `script.js` |
| `src/components/layout/GlobalSearch.jsx` | `Search` object in `script.js` |
| `src/components/shared/Icon.jsx` | `Utils.icon()` |
| `src/components/shared/Toast.jsx` | `Utils.showToast()` |
| `src/components/shared/ConfirmDialog.jsx` | `Utils.showConfirm()` |

---

**Next:** [Chapter 5 — Dashboard](./05-dashboard.md)
