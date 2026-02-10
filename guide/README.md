# Forgeon — React Migration Guide

A comprehensive, copy-paste-ready guide for rebuilding the **Forgeon Game Development Planner** using **React.js** and modern **ES6+ destructuring** techniques.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18 + |
| npm | 9 + |
| A code editor (VS Code recommended) | — |

You should be comfortable with basic HTML, CSS, and JavaScript before starting.

---

## Table of Contents

| # | Chapter | What You Will Build |
|---|---------|---------------------|
| 01 | [Project Setup](./01-project-setup.md) | Create React App, install dependencies, configure folder structure |
| 02 | [Project Structure](./02-project-structure.md) | Complete file and folder layout for the new app |
| 03 | [State Management](./03-state-management.md) | React Context + `useReducer` replacing `AppState` & `ProjectManager` |
| 04 | [Core Components](./04-core-components.md) | App shell, Sidebar, Navigation, ThemeToggle, Modal |
| 05 | [Dashboard](./05-dashboard.md) | Dashboard section with stat cards, recent items, calendar |
| 06 | [Tasks](./06-tasks.md) | Task manager with filtering, sorting, CRUD |
| 07 | [Assets](./07-assets.md) | Asset tracker with file storage and category filters |
| 08 | [Milestones](./08-milestones.md) | Milestone planner with progress tracking |
| 09 | [Classes](./09-classes.md) | Class/Object definitions with attributes and skills |
| 10 | [Mechanics](./10-mechanics.md) | Game mechanics documentation system |
| 11 | [Story](./11-story.md) | Story & Narrative manager (acts, characters, locations, quests, etc.) |
| 12 | [Notes](./12-notes.md) | Notes manager with categories, tags, reminders |
| 13 | [Shared Utilities](./13-shared-utilities.md) | Custom hooks, utility functions, RelationshipManager |
| 14 | [Styling](./14-styling.md) | CSS variable theme system, component styles |
| 15 | [Electron Integration](./15-electron-integration.md) | Wrapping the React build in Electron for desktop |

---

## Key Concepts Used Throughout

### Destructuring

Every chapter uses ES6+ destructuring extensively:

```jsx
// Object destructuring — props
const TaskCard = ({ title, priority, dueDate, onDelete }) => { ... };

// Object destructuring — state
const { tasks, assets, notes } = useAppState();

// Array destructuring — useState / useReducer
const [filter, setFilter] = useState('all');
const [state, dispatch] = useReducer(reducer, initialState);

// Nested destructuring
const { story: { acts, characters, locations } } = useAppState();

// Destructuring in function parameters
const handleSubmit = ({ target: { value } }) => { ... };

// Destructuring with defaults
const { priority = 'medium', tags = [] } = task;
```

### React Patterns

- **Functional components only** — no class components
- **React Context** for global state (replaces the vanilla `AppState` singleton)
- **`useReducer`** for complex state logic (replaces imperative mutation)
- **Custom hooks** (`useLocalStorage`, `useProject`, etc.)
- **Component composition** — small, focused components
- **Controlled forms** — all form state managed via React

---

## How to Use This Guide

1. Follow each chapter **in order** — later chapters depend on earlier ones.
2. Each chapter shows the **exact file path** where code should be placed.
3. Code blocks are **complete files** — you can copy-paste them directly.
4. After each chapter, the app should build without errors (`npm start`).

> **Tip:** If you want to compare your progress, each chapter ends with a summary of what files were created or changed.

---

## Quick Start

```bash
npx create-react-app forgeon-react
cd forgeon-react
npm install jszip react-router-dom
```

Then follow the chapters starting with [01 — Project Setup](./01-project-setup.md).
