# Chapter 2 — Project Structure

This chapter maps every file in the new React project and explains what each one replaces from the original vanilla codebase.

---

## 2.1 Complete File Tree

Below is the full file tree for the completed React rebuild. Files marked with ★ are the most important.

```
src/
├── App.js                              ★ Root component (replaces <body> in index.html)
├── index.js                            ★ Entry point
│
├── context/
│   ├── AppContext.js                   ★ Global state (replaces AppState + ProjectManager)
│   └── appReducer.js                  ★ Reducer actions (replaces imperative mutations)
│
├── hooks/
│   ├── useLocalStorage.js              Custom hook for localStorage persistence
│   ├── useProject.js                   Project switching / CRUD hook
│   └── useRelationships.js             Relationship lookup hook
│
├── utils/
│   ├── helpers.js                      Pure functions (replaces Utils object)
│   ├── fileStorage.js                  IndexedDB wrapper (replaces FileStorage object)
│   └── constants.js                    Shared enums and defaults
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx                ★ Sidebar navigation (replaces <aside> in index.html)
│   │   ├── ThemeToggle.jsx             Dark / light toggle
│   │   ├── ProjectSelector.jsx         Project dropdown + management
│   │   ├── GlobalSearch.jsx            Cross-section search bar
│   │   └── Modal.jsx                  ★ Reusable modal (replaces Modal object)
│   │
│   ├── dashboard/
│   │   ├── Dashboard.jsx              ★ Dashboard section (replaces Dashboard object)
│   │   ├── StatCard.jsx                Individual stat card
│   │   ├── RecentTasks.jsx             Recent tasks widget
│   │   ├── UpcomingMilestones.jsx      Milestones widget
│   │   └── ReminderCalendar.jsx        Calendar widget
│   │
│   ├── tasks/
│   │   ├── TasksPage.jsx              ★ Tasks section (replaces TaskManager)
│   │   ├── TaskCard.jsx                Single task card
│   │   ├── TaskForm.jsx                Add / edit task form
│   │   └── TaskFilters.jsx             Filter + sort controls
│   │
│   ├── assets/
│   │   ├── AssetsPage.jsx             ★ Assets section (replaces AssetTracker)
│   │   ├── AssetCard.jsx               Single asset card
│   │   └── AssetForm.jsx               Add / edit asset form
│   │
│   ├── milestones/
│   │   ├── MilestonesPage.jsx         ★ Milestones section (replaces MilestonePlanner)
│   │   ├── MilestoneCard.jsx           Single milestone card
│   │   └── MilestoneForm.jsx           Add / edit milestone form
│   │
│   ├── classes/
│   │   ├── ClassesPage.jsx            ★ Classes section (replaces ClassesManager)
│   │   ├── ClassCard.jsx               Single class card
│   │   └── ClassForm.jsx               Add / edit class form
│   │
│   ├── mechanics/
│   │   ├── MechanicsPage.jsx          ★ Mechanics section (replaces MechanicsManager)
│   │   ├── MechanicCard.jsx            Single mechanic card
│   │   └── MechanicForm.jsx            Add / edit mechanic form
│   │
│   ├── story/
│   │   ├── StoryPage.jsx             ★ Story section (replaces StoryManager)
│   │   ├── ActCard.jsx                 Single act display
│   │   ├── CharacterCard.jsx           Character card
│   │   ├── LocationCard.jsx            Location card
│   │   ├── QuestCard.jsx               Quest card
│   │   └── StoryTabs.jsx              Tab switcher for story views
│   │
│   ├── notes/
│   │   ├── NotesPage.jsx             ★ Notes section (replaces NotesManager)
│   │   ├── NoteCard.jsx                Single note card
│   │   └── NoteForm.jsx                Add / edit note form
│   │
│   └── shared/
│       ├── Icon.jsx                    Reusable icon component
│       ├── Toast.jsx                   Toast notification
│       ├── ConfirmDialog.jsx           Confirmation dialog
│       ├── RelatedItems.jsx            Related items chip list
│       └── FilterBar.jsx              Reusable filter button bar
│
└── styles/
    ├── index.css                      ★ Global styles + CSS variables (replaces style.css)
    ├── sidebar.css                     Sidebar styles
    ├── dashboard.css                   Dashboard styles
    ├── tasks.css                       Tasks styles
    ├── modal.css                       Modal styles
    ├── notes.css                       Notes styles
    └── story.css                       Story styles
```

---

## 2.2 Mapping: Original → React

| Original File / Object | React Replacement |
|------------------------|-------------------|
| `index.html` (entire `<body>`) | `App.js` + layout components |
| `AppState` object | `context/AppContext.js` + `appReducer.js` |
| `ProjectManager` object | `hooks/useProject.js` |
| `Utils` object | `utils/helpers.js` |
| `FileStorage` object | `utils/fileStorage.js` |
| `Navigation` object | React Router (`react-router-dom`) |
| `Modal` object | `components/layout/Modal.jsx` |
| `Dashboard` object | `components/dashboard/Dashboard.jsx` |
| `TaskManager` object | `components/tasks/TasksPage.jsx` |
| `AssetTracker` object | `components/assets/AssetsPage.jsx` |
| `MilestonePlanner` object | `components/milestones/MilestonesPage.jsx` |
| `ClassesManager` object | `components/classes/ClassesPage.jsx` |
| `MechanicsManager` object | `components/mechanics/MechanicsPage.jsx` |
| `StoryManager` object | `components/story/StoryPage.jsx` |
| `NotesManager` object | `components/notes/NotesPage.jsx` |
| `RelationshipManager` object | `hooks/useRelationships.js` |
| `Search` object | `components/layout/GlobalSearch.jsx` |
| `style.css` | `styles/index.css` + module CSS files |

---

## 2.3 Why This Structure?

1. **Feature folders** — each section (tasks, assets, etc.) lives in its own folder so related components stay together.
2. **Shared components** — reusable UI pieces live in `components/shared/`.
3. **Separation of concerns** — state (`context/`), side-effects (`hooks/`), pure functions (`utils/`), and UI (`components/`) are clearly separated.
4. **Scalable** — adding a new section means creating one new folder under `components/` and one route.

---

**Next:** [Chapter 3 — State Management](./03-state-management.md)
