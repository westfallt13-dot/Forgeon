# Forgeon - Code Documentation Guide

## Overview

**Forgeon** is a comprehensive game development planning and management tool built with vanilla JavaScript (ES6+). It provides a centralized workspace for managing game projects including tasks, assets, story/narrative elements, character classes, mechanics, and more.

**Framework:** Vanilla JavaScript (No framework dependencies)  
**Styling:** CSS3 with CSS Variables for light/dark theme support  
**Storage:** LocalStorage + IndexedDB for data persistence  
**Desktop:** Electron wrapper for standalone application  

---

## Architecture Overview

### Core Design Patterns

1. **Manager Objects Pattern**: The application uses a collection of singleton manager objects that encapsulate related functionality
   - Each manager handles a specific domain (tasks, assets, classes, story, etc)
   - Managers use consistent patterns: init(), CRUD methods, and render methods
   - State is centralized in AppState, managers interact with it

2. **Namespaced Storage**: Multi-project support via localStorage namespacing
   - ProjectManager generates namespaced keys: `forgeon_project_{projectId}_{key}`
   - Allows multiple projects without data conflicts
   - Projects are stored globally, project data stored per-namespace

3. **Event-Driven UI**: DOM element event listeners trigger manager methods
   - No data binding framework - manually managed updates
   - onclick handlers call methods that modify state, then call render
   - After significant changes, AppState.save() persists to localStorage

4. **Relationship System**: Cross-cutting relationships between all item types
   - RelationshipManager maintains bidirectional links
   - Items can reference other items via relatedItems arrays
   - ReferenceBy tracking for inverse relationships

---

## File Structure & Major Sections

### 1. ProjectManager (Lines ~15-230)
**Purpose:** Multi-project management and switching  
**Key Methods:**
- `init()` - Load projects on startup
- `createProject(name)` - Create new project
- `switchProject(projectId)` - Switch active project
- `deleteProject(projectId)` - Delete single project
- `deleteAllProjects()` - Bulk delete with double confirmation
- `getCurrentProject()` - Get active project object
- `getStorageKey(key)` - Generate namespaced storage key

**Storage Pattern:**
- Global list: `localStorage['forgeon_projects']` = JSON array of project metadata
- Current project: `localStorage['forgeon_currentProject']` = active project ID
- Project data: `localStorage[forgeon_project_{projectId}_state]` = complete app state

---

### 2. AppState (Lines ~235-430)
**Purpose:** Centralized application state management  
**Key Properties:**
- `currentSection` - Active UI section (dashboard, timeline, classes, etc)
- `tasks[]` - Game development tasks
- `assets[]` - Game assets (graphics, audio, code)
- `milestones[]` - Project milestones
- `notes[]` - Notes with categories and tags (migrated from string to array)
- `classes[]` - Character/enemy class definitions
- `mechanics[]` - Game mechanics
- `story{}` - Story data: acts, characters, locations, timeline, conflicts, themes, items, quests

**Key Methods:**
- `init()` - Load state from localStorage with backward compatibility migrations
- `save()` - Persist state to localStorage
- `toggleTheme()` / `applyTheme()` - Theme management

**Data Migrations Handled:**
- Old single-note string → new note array format
- Old character.classId → new classes array
- Missing story properties → defaults with arrays
- Missing classType property → default 'character'

---

### 3. Utils (Lines ~435-900+)
**Purpose:** Helper/utility functions used throughout the application  
**Key Functions:**
- `generateId()` - Create unique IDs using timestamp + random
- `formatDate(dateString)` - Convert date strings to "Jan 15, 2024" format
- `isDateBeforeToday(dateString)` - Check if date is overdue
- `escapeHtml(text)` - Prevent XSS via HTML escaping
- `parseMarkdown(text)` - Convert basic Markdown to HTML (# ## ### * ** - \n\n)
- `icon(path, size, altText)` - Generate SVG icon HTML
- `renderRelatedItems(items)` - Render related items as chips
- `renderConnections(item)` - Render bidirectional connections (→ ← ↔)
- `renderReferencedBy(itemId, excludeIds)` - Render items referencing this one
- `showToast(message, type)` - Non-blocking notification (replaces alert)
- `showConfirm(message, onConfirm, onCancel)` - Modal confirmation dialog
- `showPrompt(message, defaultValue, onSubmit, onCancel)` - Text input dialog

---

### 4. RelationshipManager (Lines ~1009+)
**Purpose:** Manage cross-cutting relationships between all items  
**Key Concepts:**
- Creates unified view of all items: notes, classes, mechanics, story elements
- Tracks relatedItems (outgoing) and getReferencedBy (incoming) relationships
- Uses direction indicators in UI: → (related), ← (referenced by), ↔ (both)

**Key Methods:**
- `getAllItems()` - Get all items across all sections as normalized objects
- `findItem(id, type)` - Find single item by ID and type
- `findItemById(id)` - Find item by ID only (searches all types)
- `getReferencedBy(itemId)` - Get items that reference this item
- `navigateToItem(itemId, type)` - Switch section and open item editor
- `addRelationship(sourceId, targetId, targetType)` - Create relationship
- `removeRelationship(sourceId, targetId)` - Remove relationship

---

### 5. FileStorage (Lines ~1600+)
**Purpose:** Save/load project data to/from disk  
**Use Case:** Backup, export, multi-device sync  
**Key Methods:**
- `saveProject()` - Save entire project to JSON file
- `loadProject()` - Load project from JSON file
- `exportProject()` - Export project for sharing
- `importProject()` - Import project from file

---

### 6. Navigation (Lines ~1750+)
**Purpose:** Section switching and view management  
**Key Methods:**
- `goToSection(sectionName)` - Switch to different section
- `showSection(sectionName)` - Display section and hide others
- `getCurrentSection()` - Get active section name

**Sections:**
- dashboard
- timeline
- classes
- mechanics
- story
- quests
- assets
- milestones
- notes
- search

---

### 7. Modal (Lines ~1800+)
**Purpose:** Modal dialog management for editing items  
**Key Methods:**
- `open(content, title)` - Open modal with content
- `close()` - Close current modal
- `setContent(content)` - Update modal content
- `setTitle(title)` - Update modal title

---

### 8. Dashboard (Lines ~1950+)
**Purpose:** Dashboard section view and management  
**Key Methods:**
- `render()` - Render dashboard UI with quick stats
- `openTask(taskId)` - Open task for editing
- `openMilestone(milestoneId)` - Open milestone for editing
- `renderStats()` - Display project statistics
- `renderRecentItems()` - Show recently modified items

---

### 9. TaskManager (Lines ~2400+)
**Purpose:** Game development tasks CRUD and management  
**Task Structure:**
```javascript
{
  id: string,
  title: string,
  description: string,
  dueDate: string (YYYY-MM-DD),
  priority: 'low' | 'medium' | 'high',
  completed: boolean,
  assignee: string,
  tags: string[],
  relatedItems: Array<{id: string, type: string}>,
  createdAt: ISO string,
  modifiedAt: ISO string
}
```
**Key Methods:**
- `addTask(taskData)` - Create new task
- `updateTask(taskId, taskData)` - Update task
- `deleteTask(taskId)` - Delete task
- `completeTask(taskId)` - Mark task complete
- `getTasks(filter)` - Get filtered task list
- `renderTasks()` - Render task list view

---

### 10. AssetTracker (Lines ~2700+)
**Purpose:** Track game assets (graphics, audio, code, etc)  
**Asset Structure:**
```javascript
{
  id: string,
  name: string,
  type: 'graphics' | 'audio' | 'code' | 'data' | 'other',
  path: string,
  status: 'not_started' | 'in_progress' | 'complete',
  assignee: string,
  notes: string,
  relatedItems: Array,
  createdAt: ISO string,
  modifiedAt: ISO string
}
```
**Key Methods:**
- `addAsset(assetData)` - Create asset entry
- `updateAsset(assetId, assetData)` - Update asset
- `deleteAsset(assetId)` - Delete asset
- `renderAssets()` - Render asset list

---

### 11. ClassesManager (Lines ~3700+)
**Purpose:** Manage character/enemy class definitions  
**Class Types:** character, instance  
**Class Structure:**
```javascript
{
  id: string,
  name: string,
  classType: 'character' | 'instance',
  description: string,
  attributes: Array<{name: string, value: number}>,
  skills: Array<{name: string, level: number}>,
  formulas: Array<{name: string, expression: string}>,
  relatedItems: Array,
  createdAt: ISO string,
  modifiedAt: ISO string
}
```
**Key Methods:**
- `addClass(classData)` - Create class
- `updateClass(classId, classData)` - Update class
- `deleteClass(classId)` - Delete class
- `renderClasses()` - Render class list

---

### 12. MechanicsManager (Lines ~4850+)
**Purpose:** Define and manage game mechanics  
**Mechanic Structure:**
```javascript
{
  id: string,
  name: string,
  category: string,
  description: string,
  implementation: string,
  relatedItems: Array,
  createdAt: ISO string,
  modifiedAt: ISO string
}
```

---

### 13. MilestonePlanner (Lines ~5550+)
**Purpose:** Track project milestones and phases  
**Milestone Structure:**
```javascript
{
  id: string,
  name: string,
  dueDate: string (YYYY-MM-DD),
  targetDate: string,
  status: 'not_started' | 'in_progress' | 'complete',
  tasks: string[],
  notes: string,
  relatedItems: Array,
  createdAt: ISO string,
  modifiedAt: ISO string
}
```

---

### 14. NotesManager (Lines ~5700+)
**Purpose:** Rich note-taking with categories and organization  
**Note Structure:**
```javascript
{
  id: string,
  title: string,
  content: string,
  category: string ('Ideas', 'To-Do', 'Research', 'Bugs', 'Design', 'Other'),
  tags: string[],
  color: string (hex color),
  pinned: boolean,
  archived: boolean,
  relatedItems: Array,
  createdAt: ISO string,
  modifiedAt: ISO string
}
```

---

### 15. StoryManager (Lines ~6700+)
**Purpose:** Manage story/narrative elements  
**Story Structure:**
```javascript
story: {
  acts: Array<Act>,
  characters: Array<Character>,
  locations: Array<Location>,
  timeline: Array<TimelineEvent>,
  conflicts: Array<Conflict>,
  themes: Array<Theme>,
  items: Array<Item>,
  quests: Array<Quest>,
  backgroundMap: Image,
  connectionWaypoints: Object
}
```

**Act Structure:**
```javascript
{
  id: string,
  name: string,
  summary: string,
  scenes: Array<Scene>,
  relatedItems: Array,
  ...
}
```

**Character Structure:**
```javascript
{
  id: string,
  name: string,
  role: string,
  classes: Array<{classId: string, priority: number}>,
  relationships: Array<{characterId: string, type: string}>,
  conflictResolution: Object,
  relatedItems: Array,
  ...
}
```

**Scene Structure:**
```javascript
{
  id: string,
  title: string,
  summary: string,
  characters: string[],
  location: string,
  conflicts: string[],
  themes: string[],
  sequenceNumber: number
}
```

---

### 16. QuestManager (Lines ~10000+)
**Purpose:** Define quests and quest chains  
**Quest Structure:**
```javascript
{
  id: string,
  name: string,
  giver: string (character ID),
  description: string,
  objectives: Array<{text: string, completed: boolean}>,
  rewards: string,
  relatedItems: Array,
  createdAt: ISO string,
  modifiedAt: ISO string
}
```

---

### 17. StoryMapVisualizer (Lines ~10500+)
**Purpose:** Visual map display for story/character connections  
**Uses Canvas or SVG** to render:
- Character relationships
- Location connections
- Story timeline visualization
- Conflict webs

---

### 18. Search (Lines ~12400+)
**Purpose:** Cross-section search and filtering  
**Key Methods:**
- `search(query)` - Search all items by text
- `filterByType(type)` - Get items of specific type
- `filterByTag(tag)` - Get items with tag
- `advancedSearch(criteria)` - Complex search with multiple filters

---

### 19. DataManager (Lines ~13450+)
**Purpose:** Data utilities and batch operations  
**Key Methods:**
- `bulkUpdate(updates)` - Update multiple items
- `bulkDelete(ids)` - Delete multiple items
- `export()` - Export all data
- `import(data)` - Import data
- `validate()` - Data validation

---

## Naming Conventions

### IDs
- Format: Unique strings combining timestamp + random: `Date.now().toString(36) + Math.random().toString(36).substr(2)`
- Never use sequential numbers (not ID-safe when items deleted)
- All objects have `.id` property

### Event Handlers
- Inline: `onclick="Manager.method(itemId)"`
- Pattern: Method names match: `openTask()`, `deleteTask()`, `editTask()`
- Data flow: Click handler → Manager method → AppState update → render() → save()

### Storage Keys
- Pattern: `forgeon_project_{projectId}_{key}`
- Global keys: `forgeon_projects`, `forgeon_currentProject`
- Generated by: `ProjectManager.getStorageKey(key)`

### CSS Classes
- Component classes: `.task-item`, `.character-card`, `.scene-container`
- State classes: `.active`, `.completed`, `.archived`, `.pinned`
- Utility classes: `.hidden`, `.highlight`, `.selected`
- Icon classes: `.icon`, `.icon-small`, `.icon-large`

### Method Patterns
- All managers follow: `add{Item}()`, `update{Item}()`, `delete{Item}()`, `render()`
- Render methods return HTML strings
- Async operations use callbacks (no Promise/async-await to maintain compatibility)

---

## Data Flow Patterns

### Creating an Item
```
HTML click event → Manager.add{Item}(data) 
→ Generate unique ID 
→ Add timestamps (createdAt, modifiedAt) 
→ Push to AppState.{collection}[] 
→ AppState.save() to localStorage 
→ Dashboard/List render() to update UI 
→ Modal.close() if editing
```

### Updating an Item
```
HTML change event → Manager.update{Item}(id, changes) 
→ Find item in AppState.{collection}[] 
→ Merge changes into item object 
→ Update modifiedAt timestamp 
→ AppState.save() to localStorage 
→ render() method refreshes UI
```

### Deleting an Item
```
HTML click event → Manager.delete{Item}(id) 
→ Show confirmation dialog via Utils.showConfirm() 
→ On confirm: Filter item from AppState.{collection}[] 
→ Remove relationships via RelationshipManager 
→ AppState.save() to localStorage 
→ Modal.close() and render() to update UI
```

---

## Key Patterns & Idioms

### 1. Conditional Rendering
```javascript
if (!items || items.length === 0) {
    return '<p class="empty-state">No items found</p>';
}
```

### 2. Safe Navigation
```javascript
const item = RelationshipManager.findItem(id, type);
if (!item) return '';  // Guard clause for null/undefined
```

### 3. Date Handling
- Store as: ISO strings or YYYY-MM-DD format
- Display: Use `Utils.formatDate(dateString)`
- Check overdue: Use `Utils.isDateBeforeToday(dateString)`

### 4. Theme Support
- CSS Variables defined in stylesheet: `--primary-color`, `--bg-primary`, `--text-primary`, etc
- Apply to elements: `style="color: var(--text-primary)"`
- Theme toggle: `AppState.toggleTheme()` switches 'light' ↔ 'dark'

### 5. Error Handling
```javascript
try {
    const parsed = JSON.parse(savedState);
    // process parsed
} catch (e) {
    console.error('Error message:', e);
    // use defaults
}
```

### 6. HTML Escaping
- Always use: `Utils.escapeHtml(userInput)` before inserting in HTML
- Prevents XSS attacks from user-entered text

### 7. Icon Usage
- Call: `Utils.icon('path/name', 'size', 'alt text')`
- Returns: `<img src="icons/path/name.svg" ...>`
- Sizes: small (16px), medium (20px), large (24px), xlarge (32px)

---

## Common Tasks

### Adding a New Item Type
1. Create manager object: `const {ItemName}Manager = {}`
2. Define item structure with: id, name, timestamps, relatedItems
3. Implement: add, update, delete, render methods
4. Register in RelationshipManager.getAllItems()
5. Add section navigation in Navigation manager
6. Update search in Search manager

### Adding a Relationship Between Items
1. Get source item: `const item = Manager.get{Item}(id)`
2. Add target: `item.relatedItems.push({id: targetId, type: targetType})`
3. Save: `AppState.save()`
4. Display: Use `Utils.renderConnections(item)` or `Utils.renderRelatedItems(item.relatedItems)`

### Creating an Edit Modal
1. Build HTML form with item fields
2. Call: `Modal.open(formHTML, 'Edit Item')`
3. Attach click handler: `onclick="Manager.update{Item}(itemId)"`
4. In handler: Collect form data, update item, close modal
5. Render updated item in list view

### Switching Between Projects
1. Call: `ProjectManager.switchProject(projectId)`
2. Method saves current state before switching
3. Reloads page: `location.reload()`
4. New project state loads via AppState.init()

---

## Performance Considerations

### LocalStorage Limits
- Modern browsers: 5-10MB limit per domain
- Forgeon stores JSON in single localStorage entries
- Large projects may approach limits (many tasks + characters + story)
- Use FileStorage to backup/export large projects

### Rendering Performance
- render() methods can be called frequently
- Avoid expensive DOM queries in loops
- Use HTML string concatenation rather than appendChild in loops
- Consider debouncing for real-time searches

### Searching
- RelationshipManager.getAllItems() iterates all items on search
- O(n) complexity but typically acceptable for game projects
- For 1000+ items, consider indexing in future

---

## Debugging Tips

### Check Saved State
```javascript
// In browser console:
const state = JSON.parse(localStorage['forgeon_project_' + ProjectManager.currentProjectId + '_state']);
console.log(state);
```

### Find an Item
```javascript
// In browser console:
const item = RelationshipManager.findItemById('your-item-id');
console.log(item);
```

### Get All Items of Type
```javascript
// In browser console:
const allItems = RelationshipManager.getAllItems();
const characters = allItems.filter(i => i.type === 'character');
console.log(characters);
```

### Check Current Theme
```javascript
// In browser console:
console.log(AppState.theme);  // 'light' or 'dark'
```

### Reload State from Disk
```javascript
// In browser console:
AppState.init();
Dashboard.render();  // Re-render after loading
```

---

## Future Enhancement Opportunities

1. **Undo/Redo Stack**: Implement action history for user corrections
2. **Collaboration**: WebSocket sync for multi-user editing
3. **Plugin System**: Allow custom managers/extensions
4. **AI Integration**: Enhanced Forger AI with context awareness
5. **Advanced Queries**: SQL-like query language for data
6. **Timeline Visualization**: Animated story timeline
7. **Relationship Graphs**: D3.js visualization of item connections
8. **Character Sheets**: Printable character stats sheets
9. **Version Control**: Track changes over time with diffs
10. **Cloud Sync**: Automatic backup to cloud storage

---

## Version History & Migration Notes

### Migration: Single Note → Note Array (v1.x)
- Old format: `notes: "string content"`
- New format: `notes: [{id, title, content, category, tags, color, pinned, archived, createdAt, modifiedAt}]`
- Handled in: AppState.init() lines ~280-295
- Legacy notes get converted automatically on first load

### Migration: Character.classId → classes[] (v1.x)
- Old format: `character.classId = "id"`
- New format: `character.classes = [{classId: "id", priority: 5}]`
- Allows characters to have multiple classes with priority
- Handled in: AppState.init() lines ~310-315

### Data Validation
- All items must have unique `id` property
- Timestamps must be ISO format strings
- Dates must be YYYY-MM-DD or ISO format
- RelatedItems must be Array<{id, type}>

---

**Last Updated:** 2024  
**Author:** Forgeon Development Team  
**For Support:** Refer to specific manager documentation above or examine manager's render() method for UI patterns
