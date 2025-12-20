/* =================================
   Forgeon - Main Application
   Game Development Planning Tool
   ================================= */

// ============================================
// Electron Integration
// ============================================
// Detects whether the app is running in Electron (desktop) or browser mode
// Allows conditional logic for platform-specific features (file system access, etc)
const isElectron = typeof window.electronAPI !== 'undefined';

console.log(`Running in ${isElectron ? 'Electron' : 'Browser'} mode`);

// ============================================
// Project Manager
// ============================================
// Manages multiple game projects, project switching, creation, deletion, and persistence
// Uses localStorage with project IDs as namespaces to support multi-project workflows
const ProjectManager = {
    currentProjectId: null,  // The ID of the currently active project
    projects: [],            // Array of all available projects with metadata
    
    /**
     * Initializes the project system on app startup
     * Loads previously saved projects from localStorage
     * Sets the current active project or creates a default one
     */
    init() {
        // Load project list from global localStorage
        const savedProjects = localStorage.getItem('forgeon_projects');
        if (savedProjects) {
            this.projects = JSON.parse(savedProjects);
        }
        
        // Load current project ID
        const currentId = localStorage.getItem('forgeon_currentProject');
        
        if (currentId && this.projects.find(p => p.id === currentId)) {
            this.currentProjectId = currentId;
        } else if (this.projects.length > 0) {
            // Default to first project if current ID is invalid
            this.currentProjectId = this.projects[0].id;
            localStorage.setItem('forgeon_currentProject', this.currentProjectId);
        } else {
            // Create default project if none exist
            this.createProject('My Game Project');
        }
        
        this.updateUI();
    },
    
    /**
     * Creates a new game project
     * @param {string} name - The name of the new project
     * @returns {Object} The newly created project object
     */
    createProject(name) {
        const project = {
            id: this.generateProjectId(),
            name: name || 'Untitled Project',
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };
        
        this.projects.push(project);
        this.saveProjectList();
        this.switchProject(project.id);
        return project;
    },
    
    /**
     * Switches the active project to a different one
     * Saves current project data before switching
     * @param {string} projectId - The ID of the project to switch to
     */
    switchProject(projectId) {
        if (!this.projects.find(p => p.id === projectId)) {
            console.error('Project not found:', projectId);
            return;
        }
        
        // Save current project data before switching
        if (this.currentProjectId) {
            AppState.save();
        }
        
        // Switch to new project
        this.currentProjectId = projectId;
        localStorage.setItem('forgeon_currentProject', projectId);
        
        // Update last modified timestamp
        const project = this.projects.find(p => p.id === projectId);
        if (project) {
            project.lastModified = new Date().toISOString();
            this.saveProjectList();
        }
        
        // Reload page to load new project data
        location.reload();
    },
    
    /**
     * Deletes a project after user confirmation
     * Cannot delete the only remaining project
     * @param {string} projectId - The ID of the project to delete
     */
    deleteProject(projectId) {
        if (this.projects.length === 1) {
            Utils.showToast('Cannot delete the only project. Create a new project first.', 'warning');
            return;
        }
        
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;
        
        Utils.showConfirm(
            `Delete project "${project.name}"? This cannot be undone!`,
            () => {
                // Remove project data from localStorage
                localStorage.removeItem(`forgeon_project_${projectId}`);
                
                // Remove from project list
                this.projects = this.projects.filter(p => p.id !== projectId);
                this.saveProjectList();
                
                // If deleting current project, switch to another
                if (this.currentProjectId === projectId) {
                    this.switchProject(this.projects[0].id);
                } else {
                    this.updateUI();
                }
            }
        );
    },
    
    /**
     * Deletes all projects with double confirmation
     * Creates a fresh default project after deletion
     */
    deleteAllProjects() {
        Utils.showConfirm(
            '⚠️ DELETE ALL PROJECTS?\n\nThis will permanently delete ALL projects and their data. This cannot be undone!\n\nAre you absolutely sure?',
            () => {
                Utils.showConfirm(
                    'FINAL WARNING: All your game projects will be lost forever. Continue?',
                    () => {
                        // Delete all project data
                        this.projects.forEach(project => {
                            localStorage.removeItem(`forgeon_project_${project.id}`);
                        });
                        
                        // Clear project list
                        this.projects = [];
                        this.saveProjectList();
                        
                        // Create a fresh default project
                        this.createProject('My Game Project');
                    }
                );
            }
        );
    },
    
    /**
     * Renames an existing project
     * @param {string} projectId - The ID of the project to rename
     * @param {string} newName - The new name for the project
     */
    renameProject(projectId, newName) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;
        
        project.name = newName;
        project.lastModified = new Date().toISOString();
        this.saveProjectList();
        this.updateUI();
    },
    
    /**
     * Gets the currently active project object
     * @returns {Object} The current project object
     */
    getCurrentProject() {
        return this.projects.find(p => p.id === this.currentProjectId);
    },
    
    /**
     * Gets a namespaced localStorage key for the current project
     * Allows multiple projects to store data without conflicts
     * @param {string} key - The base key to namespace
     * @returns {string} The namespaced key for localStorage
     */
    getStorageKey(key) {
        return `forgeon_project_${this.currentProjectId}_${key}`;
    },
    
    /**
     * Persists the project list to localStorage
     */
    saveProjectList() {
        localStorage.setItem('forgeon_projects', JSON.stringify(this.projects));
    },
    
    /**
     * Generates a unique project ID
     * @returns {string} A unique project identifier
     */
    generateProjectId() {
        return 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    /**
     * Updates the project UI elements (dropdown selector, name display, etc)
     */
    updateUI() {
        const selector = document.getElementById('projectSelector');
        const nameDisplay = document.getElementById('currentProjectName');
        
        if (selector) {
            selector.innerHTML = this.projects.map(p => 
                `<option value="${p.id}" ${p.id === this.currentProjectId ? 'selected' : ''}>${p.name}</option>`
            ).join('');
        }
        
        const currentProject = this.getCurrentProject();
        if (nameDisplay && currentProject) {
            nameDisplay.textContent = currentProject.name;
        }
    }
};

// ============================================
// Data Store & State Management
// ============================================
// Central application state object that manages all game project data
// Handles loading/saving from localStorage, theme management, and data structure initialization
// All changes to application state should go through this object for consistency
const AppState = {
    // ===== Core State Properties =====
    currentSection: 'dashboard',  // Active UI section (dashboard, timeline, classes, etc)
    tasks: [],                    // Array of game development tasks
    assets: [],                   // Array of game assets (graphics, audio, code, etc)
    milestones: [],               // Array of project milestones with completion tracking
    notes: [],                    // Array of note objects with categories, tags, and content
    noteCategories: ['Ideas', 'To-Do', 'Research', 'Bugs', 'Design', 'Other'],  // Default note categories
    theme: 'light',               // Current theme (light or dark)
    classes: [],                  // Array of character/enemy class definitions
    mechanics: [],                // Array of game mechanics
    story: {                      // Comprehensive story/narrative data structure
        acts: [],                 // Story acts for narrative structure
        backgroundMap: null,      // Visual background image for story map
        connectionWaypoints: {},  // Custom waypoints for story connections
        characters: [],           // All story characters
        locations: [],            // Story locations/settings
        timeline: [],             // Historical/narrative timeline
        conflicts: [],            // Story conflicts and tensions
        themes: [],               // Thematic elements
        items: [],                // Story items and artifacts
        quests: []                // Quest definitions
    },
    
    /**
     * Initializes application state on startup
     * Loads saved data from localStorage for the current project
     * Performs data migrations for backward compatibility
     * Applies the saved theme
     */
    init() {
        const storageKey = ProjectManager.getStorageKey('state');
        console.log('Loading state from:', storageKey);
        const savedState = localStorage.getItem(storageKey);
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                console.log('Loaded state:', {
                    tasks: parsed.tasks?.length || 0,
                    assets: parsed.assets?.length || 0,
                    notes: parsed.notes?.length || 0,
                    classes: parsed.classes?.length || 0
                });
                
                // Load main collections
                this.tasks = parsed.tasks || [];
                this.assets = parsed.assets || [];
                this.milestones = parsed.milestones || [];
                
                // ===== Notes Migration =====
                // Convert old single-note string format to new array-based system
                if (typeof parsed.notes === 'string' && parsed.notes) {
                    this.notes = [{
                        id: Utils.generateId(),
                        title: 'Legacy Notes',
                        content: parsed.notes,
                        category: 'Other',
                        tags: [],
                        color: '',
                        pinned: false,
                        archived: false,
                        createdAt: new Date().toISOString(),
                        modifiedAt: new Date().toISOString()
                    }];
                } else {
                    this.notes = parsed.notes || [];
                }
                this.noteCategories = parsed.noteCategories || ['Ideas', 'To-Do', 'Research', 'Bugs', 'Design', 'Other'];
                
                // Load theme setting
                this.theme = parsed.theme || 'light';
                
                // ===== Classes Migration =====
                this.classes = parsed.classes || [];
                // Ensure all classes have classType property (for backward compatibility)
                this.classes.forEach(cls => {
                    if (!cls.classType) {
                        cls.classType = 'character'; // Default to character class
                    }
                });
                
                // Load game mechanics
                this.mechanics = parsed.mechanics || [];
                
                // ===== Story/Narrative Data =====
                this.story = parsed.story || { 
                    acts: [], 
                    backgroundMap: null, 
                    connectionWaypoints: {}, 
                    characters: [], 
                    locations: [], 
                    timeline: [], 
                    conflicts: [], 
                    themes: [], 
                    items: [], 
                    quests: [] 
                };
                
                // Ensure all story properties exist (handle missing properties in old saves)
                if (!this.story.backgroundMap) this.story.backgroundMap = null;
                if (!this.story.connectionWaypoints) this.story.connectionWaypoints = {};
                if (!this.story.characters) this.story.characters = [];
                if (!this.story.items) this.story.items = [];
                if (!this.story.quests) this.story.quests = [];
                
                // ===== Character Migration =====
                // Convert old single classId to new classes array format
                this.story.characters.forEach(char => {
                    if (char.classId && !char.classes) {
                        char.classes = [{ classId: char.classId, priority: 5 }];
                        delete char.classId;
                    }
                    // Ensure conflict resolution data exists
                    if (!char.conflictResolution) {
                        char.conflictResolution = {};
                    }
                });
                
                // Ensure all story collections exist
                if (!this.story.locations) this.story.locations = [];
                if (!this.story.timeline) this.story.timeline = [];
                if (!this.story.conflicts) this.story.conflicts = [];
                if (!this.story.themes) this.story.themes = [];
                
            } catch (e) {
                console.error('Error loading saved state:', e);
            }
        } else {
            console.log('No saved state found for key:', storageKey);
        }
        
        // Apply the loaded/default theme to the UI
        this.applyTheme();
    },
    
    /**
     * Persists all application state to localStorage
     * Called after major changes to ensure data is not lost
     * Saves all tasks, assets, notes, classes, mechanics, and story data
     */
    save() {
        const storageKey = ProjectManager.getStorageKey('state');
        const stateToSave = {
            tasks: this.tasks,
            assets: this.assets,
            milestones: this.milestones,
            notes: this.notes,
            noteCategories: this.noteCategories,
            theme: this.theme,
            classes: this.classes,
            mechanics: this.mechanics,
            story: this.story
        };
        console.log('Saving state to:', storageKey, {
            tasks: this.tasks.length,
            assets: this.assets.length,
            notes: this.notes.length,
            classes: this.classes.length
        });
        localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    },
    
    /**
     * Toggles between light and dark theme
     * Updates the saved theme preference
     */
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        this.save();
    },
    
    /**
     * Applies the current theme to the UI
     * Sets the data-theme attribute on the document body
     * Updates the theme toggle button icon
     */
    applyTheme() {
        document.body.setAttribute('data-theme', this.theme);
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.src = this.theme === 'light' ? 'icons/theme/moon.svg' : 'icons/theme/sun.svg';
        }
    }
};

// ============================================
// Utility Functions
// ============================================
// Collection of helper functions used throughout the application
// Provides common functionality for ID generation, date formatting, UI notifications, etc
const Utils = {
    /**
     * Generates a unique ID for new items
     * Uses timestamp and random string to ensure uniqueness
     * @returns {string} A unique identifier
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    /**
     * Formats a date string for human-readable display
     * @param {string} dateString - ISO format date string
     * @returns {string} Formatted date (e.g. "Jan 15, 2024")
     */
    formatDate(dateString) {
        if (!dateString) return '';
        // Handle date-only strings (YYYY-MM-DD) to avoid timezone issues
        if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateString.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        }
        // Handle full datetime strings
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    },
    
    /**
     * Checks if a given date is before today (ignores time component)
     * Useful for identifying overdue items
     * @param {string} dateString - Date in YYYY-MM-DD format or ISO datetime string
     * @returns {boolean} True if date is before today
     */
    isDateBeforeToday(dateString) {
        if (!dateString) return false;
        let d;
        // Handle date-only strings (YYYY-MM-DD) to avoid timezone issues
        if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateString.split('-').map(Number);
            d = new Date(year, month - 1, day);
        } else {
            d = new Date(dateString);
        }
        if (isNaN(d)) return false;
        
        // Reset times to midnight for proper date comparison
        const today = new Date();
        today.setHours(0,0,0,0);
        d.setHours(0,0,0,0);
        return d < today;
    },
    
    /**
     * Escapes HTML special characters to prevent XSS attacks
     * Converts user input to safe text for display in HTML
     * @param {string} text - Raw text that may contain HTML characters
     * @returns {string} HTML-escaped safe text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Converts basic Markdown syntax to HTML
     * Supports headers (#, ##, ###), bold (**), italic (*), lists, and paragraphs
     * @param {string} text - Markdown-formatted text
     * @returns {string} HTML version of the markdown
     */
    parseMarkdown(text) {
        let html = this.escapeHtml(text);
        
        // Headers (h1, h2, h3)
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Bold and Italic
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        // Lists (lines starting with -)
        html = html.replace(/^\- (.+)$/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Paragraphs (double newlines)
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';
        
        return html;
    },
    
    /**
     * Generates HTML for an SVG icon with specified size
     * All icons are stored in the /icons directory
     * @param {string} path - Path to icon relative to /icons (e.g., "misc/link")
     * @param {string} size - Size preset: 'small'(16px), 'medium'(20px), 'large'(24px), 'xlarge'(32px)
     * @param {string} altText - Alt text for accessibility
     * @returns {string} HTML img tag for the icon
     */
    icon(path, size = 'medium', altText = '') {
        const sizes = {
            small: 16,
            medium: 20,
            large: 24,
            xlarge: 32
        };
        const dimension = sizes[size] || 20;
        return `<img src="icons/${path}.svg" alt="${altText}" class="icon ${size}" width="${dimension}" height="${dimension}">`;
    },
    
    /**
     * Renders a list of related items as clickable chips
     * Each chip displays the item's icon, name, and category
     * @param {Array} relatedItems - Array of related item objects {id, type}
     * @returns {string} HTML string for the related items section
     */
    renderRelatedItems(relatedItems) {
        if (!relatedItems || relatedItems.length === 0) {
            return '';
        }
        
        let html = '<div class="related-items-section"><div class="related-items-header"><h4><img src="icons/misc/link.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Related Items</h4></div><div class="related-items-list">';
        
        relatedItems.forEach(rel => {
            const item = RelationshipManager.findItem(rel.id, rel.type);
            if (item) {
                html += `
                    <div class="related-item-chip" onclick="RelationshipManager.navigateToItem('${item.id}', '${item.type}')">
                        <span class="chip-icon">${item.icon}</span>
                        <span class="chip-name">${this.escapeHtml(item.name)}</span>
                        <span class="chip-type">${this.escapeHtml(item.category)}</span>
                    </div>
                `;
            }
        });
        
        html += '</div></div>';
        return html;
    },

    /**
     * Renders a consolidated view of all connections (both outgoing and incoming relationships)
     * Shows direction indicators: → (outgoing), ← (incoming), ↔ (both)
     * Deduplicates items that are both related and referenced
     * @param {Object|string} item - Item object or item ID to get connections for
     * @returns {string} HTML for the connections section or empty string if no connections
     */
    renderConnections(item) {
        let itemObj = item;
        if (!itemObj || !itemObj.id) {
            // If caller passed an id instead of object, resolve it
            const id = item; // maybe an id
            itemObj = RelationshipManager.findItemById(id) || {};
        }

        const outgoing = itemObj.relatedItems || [];
        const incoming = RelationshipManager.getReferencedBy(itemObj.id) || [];

        const map = {};

        outgoing.forEach(rel => {
            const id = rel.id;
            const type = rel.type;
            const found = RelationshipManager.findItem(id, type);
            if (!found) return;
            map[id] = map[id] || { item: found, outgoing: false, incoming: false };
            map[id].outgoing = true;
        });

        incoming.forEach(ref => {
            const id = ref.id;
            const type = ref.type;
            const found = RelationshipManager.findItem(id, type);
            if (!found) return;
            map[id] = map[id] || { item: found, outgoing: false, incoming: false };
            map[id].incoming = true;
        });

        const entries = Object.values(map);
        if (entries.length === 0) return '';

        const chips = entries.map(e => {
            let dirIcon = '';
            if (e.outgoing && e.incoming) dirIcon = '↔';
            else if (e.outgoing) dirIcon = '→';
            else if (e.incoming) dirIcon = '←';
            return `
                <div class="related-item-chip" onclick="RelationshipManager.navigateToItem('${e.item.id}', '${e.item.type}')">
                    <span class="chip-icon">${e.item.icon || ''}</span>
                    <span class="chip-name">${this.escapeHtml(e.item.name)} ${dirIcon ? `<span class="chip-dir">${dirIcon}</span>` : ''}</span>
                    <span class="chip-type">${this.escapeHtml(e.item.category)}</span>
                </div>
            `;
        }).join('');

        return `<div class="related-items-section"><div class="related-items-header"><h4><img src="icons/misc/link.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Related Items</h4></div><div class="related-items-list">${chips}</div></div>`;
    },
    /**
     * Renders items that reference the given item (inverse relationships)
     * Shows items that point TO this item
     * Optionally excludes specified IDs to avoid duplicates with renderConnections()
     * @param {string} itemId - The ID of the item to find references for
     * @param {Array} excludeIds - Array of IDs to exclude from the results
     * @returns {string} HTML for the referenced-by section
     */
    renderReferencedBy(itemId, excludeIds = []) {
        let references = RelationshipManager.getReferencedBy(itemId) || [];
        // Filter out excluded IDs to prevent duplicate chips
        if (excludeIds && excludeIds.length > 0) {
            references = references.filter(r => !excludeIds.includes(r.id));
        }

        if (references.length === 0) {
            return '';
        }

        let html = '<div class="referenced-by-section"><h4><img src="icons/status/pin.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Referenced By</h4><div class="referenced-by-list">';

        references.forEach(item => {
            html += `
                <div class="related-item-chip" onclick="RelationshipManager.navigateToItem('${item.id}', '${item.type}')">
                    <span class="chip-icon">${item.icon}</span>
                    <span class="chip-name">${this.escapeHtml(item.name)}</span>
                    <span class="chip-type">${this.escapeHtml(item.category)}</span>
                </div>
            `;
        });

        html += '</div></div>';
        return html;
    },
    
    /**
     * Displays a temporary toast notification (non-blocking alternative to alert)
     * Auto-dismisses after 2 seconds with fade animation
     * Appears in center of screen with colored background based on type
     * @param {string} message - The message to display
     * @param {string} type - Notification type: 'success', 'error', 'warning', 'info'
     */
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        const colors = {
            success: 'linear-gradient(135deg, #10b981, #059669)',  // Green
            error: 'linear-gradient(135deg, #ef4444, #dc2626)',    // Red
            warning: 'linear-gradient(135deg, #f59e0b, #d97706)',  // Orange
            info: 'linear-gradient(135deg, #3b82f6, #2563eb)'      // Blue
        };
        
        // Style the toast container
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${colors[type] || colors.info};
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            z-index: 99999;
            font-size: 1rem;
            font-weight: 600;
            animation: fadeInOut 2s ease-in-out;
            max-width: 400px;
            text-align: center;
        `;
        toast.textContent = message;
        
        // Inject animation styles if not already present
        if (!document.getElementById('toastAnimation')) {
            const style = document.createElement('style');
            style.id = 'toastAnimation';
            style.textContent = `
                @keyframes fadeInOut {
                    0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                    10%, 90% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Display and auto-remove
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    },
    
    /**
     * Displays a modal confirmation dialog (non-blocking alternative to confirm())
     * User can confirm or cancel the action, or dismiss by clicking overlay
     * Automatically blurs focused elements to prevent input issues
     * @param {string} message - The confirmation message to display
     * @param {Function} onConfirm - Callback function executed when user confirms
     * @param {Function} onCancel - Optional callback executed when user cancels or dismisses
     */
    showConfirm(message, onConfirm, onCancel = null) {
        // Blur any focused element to prevent focus-related issues
        if (document.activeElement) {
            document.activeElement.blur();
        }
        
        // Create overlay backdrop (dark semi-transparent background)
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            animation: fadeIn 0.2s ease-out;
        `;
        
        // Create dialog box
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: var(--bg-primary);
            border-radius: 12px;
            padding: 2rem;
            max-width: 500px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            animation: slideInUp 0.3s ease-out;
        `;
        
        // Message text
        const messageText = document.createElement('div');
        messageText.style.cssText = `
            color: var(--text-primary);
            font-size: 1rem;
            margin-bottom: 1.5rem;
            white-space: pre-line;
            line-height: 1.6;
        `;
        messageText.textContent = message;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
        `;
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.style.cssText = `min-width: 100px;`;
        
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Confirm';
        confirmBtn.className = 'btn btn-danger';
        confirmBtn.style.cssText = `min-width: 100px;`;
        
        const cleanup = () => {
            overlay.remove();
        };
        
        cancelBtn.onclick = () => {
            cleanup();
            if (onCancel) onCancel();
        };
        
        confirmBtn.onclick = () => {
            cleanup();
            if (onConfirm) onConfirm();
        };
        
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                cleanup();
                if (onCancel) onCancel();
            }
        };
        
        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(confirmBtn);
        dialog.appendChild(messageText);
        dialog.appendChild(buttonContainer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Focus confirm button
        setTimeout(() => confirmBtn.focus(), 100);
    },
    
    // Non-blocking prompt dialog (replaces prompt())
    showPrompt(message, defaultValue = '', onSubmit, onCancel = null) {
        // Blur any focused element to prevent focus issues
        if (document.activeElement) {
            document.activeElement.blur();
        }
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            animation: fadeIn 0.2s ease-out;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: var(--bg-primary);
            border-radius: 12px;
            padding: 2rem;
            max-width: 500px;
            min-width: 400px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            animation: slideInUp 0.3s ease-out;
        `;
        
        const messageText = document.createElement('div');
        messageText.style.cssText = `
            color: var(--text-primary);
            font-size: 1rem;
            margin-bottom: 1rem;
            white-space: pre-line;
            line-height: 1.6;
        `;
        messageText.textContent = message;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = defaultValue;
        input.style.cssText = `
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            font-size: 1rem;
            margin-bottom: 1.5rem;
            box-sizing: border-box;
        `;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
        `;
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.style.cssText = `min-width: 100px;`;
        
        const submitBtn = document.createElement('button');
        submitBtn.textContent = 'OK';
        submitBtn.className = 'btn btn-primary';
        submitBtn.style.cssText = `min-width: 100px;`;
        
        const cleanup = () => {
            overlay.remove();
        };
        
        const submit = () => {
            const value = input.value.trim();
            if (value) {
                cleanup();
                if (onSubmit) onSubmit(value);
            }
        };
        
        cancelBtn.onclick = () => {
            cleanup();
            if (onCancel) onCancel();
        };
        
        submitBtn.onclick = submit;
        
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cleanup();
                if (onCancel) onCancel();
            }
        };
        
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                cleanup();
                if (onCancel) onCancel();
            }
        };
        
        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(submitBtn);
        dialog.appendChild(messageText);
        dialog.appendChild(input);
        dialog.appendChild(buttonContainer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Focus input and select all text
        setTimeout(() => {
            input.focus();
            input.select();
        }, 100);
    },
    
    // Notification toast
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: ${colors[type] || colors.success};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 99999;
            animation: slideInRight 0.3s ease;
            font-weight: 500;
            max-width: 300px;
        `;
        
        if (!document.getElementById('notificationAnimation')) {
            const style = document.createElement('style');
            style.id = 'notificationAnimation';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(400px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};

// ============================================
// Universal Relationship Manager
// ============================================
// ============================================
// Relationship Manager
// ============================================
// Manages cross-cutting relationships between all items in the application
// Allows linking between notes, classes, mechanics, characters, locations, quests, etc
// Provides search and navigation capabilities for related items across sections
// Critical for maintaining data consistency when items reference each other
const RelationshipManager = {
    /**
     * Retrieves all items across all sections in a normalized format
     * Creates a unified view of all application data for relationship lookup
     * Each item includes id, type, name, category, icon, section, and data reference
     * @returns {Array} Array of all items with their metadata
     */
    getAllItems() {
        const items = [];
        
        // ===== Notes =====
        // Add all notes as relationship targets
        AppState.notes.forEach(note => {
            items.push({
                id: note.id,
                type: 'note',
                name: note.title,
                category: note.category,
                icon: '📝',
                section: 'notes',
                data: note
            });
        });
        
        // ===== Classes =====
        // Add character and instance class definitions
        AppState.classes.forEach(cls => {
            items.push({
                id: cls.id,
                type: 'class',
                name: cls.name,
                category: cls.classType === 'character' ? 'Character Class' : 'Instance Class',
                icon: cls.classType === 'character' ? '👤' : '📦',
                section: 'classes',
                data: cls
            });
        });
        
        // ===== Mechanics =====
        // Add game mechanics
        AppState.mechanics.forEach(mechanic => {
            items.push({
                id: mechanic.id,
                type: 'mechanic',
                name: mechanic.name,
                category: mechanic.category,
                icon: '<img src="icons/navigation/mechanics.svg" alt="" width="14" height="14" style="vertical-align: middle;">',
                section: 'mechanics',
                data: mechanic
            });
        });
        
        // ===== Story - Acts & Scenes =====
        // Add all acts and their contained scenes
        AppState.story.acts.forEach(act => {
            // Normalize act relationships to include all scene relationships
            const actRelatedItems = [];
            
            // Add direct act relationships if they exist
            if (act.relatedItems && Array.isArray(act.relatedItems)) {
                actRelatedItems.push(...act.relatedItems);
            }
            
            // Add all scenes as relationships and their content
            if (act.scenes && Array.isArray(act.scenes)) {
                act.scenes.forEach(scene => {
                    // Add the scene itself
                    actRelatedItems.push({ id: scene.id, type: 'scene' });
                    
                    // Add scene's characters
                    if (scene.characters && Array.isArray(scene.characters)) {
                        scene.characters.forEach(charId => {
                            if (!actRelatedItems.find(r => r.id === charId && r.type === 'character')) {
                                actRelatedItems.push({ id: charId, type: 'character' });
                            }
                        });
                    }
                    
                    // Add scene's location
                    if (scene.location) {
                        if (!actRelatedItems.find(r => r.id === scene.location && r.type === 'location')) {
                            actRelatedItems.push({ id: scene.location, type: 'location' });
                        }
                    }
                    
                    // Add scene's conflicts
                    if (scene.conflicts && Array.isArray(scene.conflicts)) {
                        scene.conflicts.forEach(conflictId => {
                            if (!actRelatedItems.find(r => r.id === conflictId && r.type === 'conflict')) {
                                actRelatedItems.push({ id: conflictId, type: 'conflict' });
                            }
                        });
                    }
                    
                    // Add scene's themes
                    if (scene.themes && Array.isArray(scene.themes)) {
                        scene.themes.forEach(themeId => {
                            if (!actRelatedItems.find(r => r.id === themeId && r.type === 'theme')) {
                                actRelatedItems.push({ id: themeId, type: 'theme' });
                            }
                        });
                    }
                });
            }
            
            // Create a copy of act data with normalized relatedItems
            const normalizedAct = {
                ...act,
                relatedItems: actRelatedItems
            };
            
            items.push({
                id: act.id,
                type: 'act',
                name: act.title,
                category: 'Story Act',
                icon: '📖',
                section: 'story',
                data: normalizedAct
            });
        });
        
        // Story - Scenes
        AppState.story.acts.forEach(act => {
            act.scenes.forEach(scene => {
                // Normalize scene relationships into relatedItems format
                const sceneRelatedItems = [];
                
                // Add characters
                if (scene.characters && Array.isArray(scene.characters)) {
                    scene.characters.forEach(charId => {
                        sceneRelatedItems.push({ id: charId, type: 'character' });
                    });
                }
                
                // Add location
                if (scene.location) {
                    sceneRelatedItems.push({ id: scene.location, type: 'location' });
                }
                
                // Add conflicts if they exist
                if (scene.conflicts && Array.isArray(scene.conflicts)) {
                    scene.conflicts.forEach(conflictId => {
                        sceneRelatedItems.push({ id: conflictId, type: 'conflict' });
                    });
                }
                
                // Add themes if they exist
                if (scene.themes && Array.isArray(scene.themes)) {
                    scene.themes.forEach(themeId => {
                        sceneRelatedItems.push({ id: themeId, type: 'theme' });
                    });
                }
                
                // Create a copy of scene data with normalized relatedItems
                const normalizedScene = {
                    ...scene,
                    relatedItems: sceneRelatedItems
                };
                
                items.push({
                    id: scene.id,
                    type: 'scene',
                    name: scene.title,
                    category: `Act ${act.actNumber} Scene`,
                    icon: '🎬',
                    section: 'story',
                    data: normalizedScene,
                    actId: act.id,
                    actTitle: act.title
                });
            });
        });
        
        // Story - Characters
        AppState.story.characters.forEach(character => {
            items.push({
                id: character.id,
                type: 'character',
                name: character.name,
                category: 'Story Character',
                icon: '<img src="icons/misc/user.svg" alt="" width="14" height="14" style="vertical-align: middle;">',
                section: 'story',
                data: character
            });
        });
        
        // Story - Locations
        AppState.story.locations.forEach(location => {
            items.push({
                id: location.id,
                type: 'location',
                name: location.name,
                category: 'Location',
                icon: '<img src="icons/story/location.svg" alt="" width="14" height="14" style="vertical-align: middle;">',
                section: 'story',
                data: location
            });
        });
        
        // Story - Timeline Events
        AppState.story.timeline.forEach(event => {
            items.push({
                id: event.id,
                type: 'timeline',
                name: event.title,
                category: 'Timeline Event',
                icon: '<img src="icons/misc/calendar.svg" alt="" width="14" height="14" style="vertical-align: middle;">',
                section: 'story',
                data: event
            });
        });
        
        // Story - Conflicts
        AppState.story.conflicts.forEach(conflict => {
            items.push({
                id: conflict.id,
                type: 'conflict',
                name: conflict.title,
                category: 'Conflict',
                icon: '⚡',
                section: 'story',
                data: conflict
            });
        });
        
        // Story - Themes
        AppState.story.themes.forEach(theme => {
            items.push({
                id: theme.id,
                type: 'theme',
                name: theme.title,
                category: 'Theme',
                icon: '<img src="icons/misc/thought-bubble.svg" alt="" width="14" height="14" style="vertical-align: middle;">',
                section: 'story',
                data: theme
            });
        });
        
        // Story - Items
        if (AppState.story.items) {
            AppState.story.items.forEach(item => {
                items.push({
                    id: item.id,
                    type: 'item',
                    name: item.name,
                    category: 'Game Item',
                    icon: '📦',
                    section: 'story',
                    data: item
                });
            });
        }
        
        // Story - Quests
        if (AppState.story.quests) {
            AppState.story.quests.forEach(quest => {
                items.push({
                    id: quest.id,
                    type: 'quest',
                    name: quest.title,
                    category: `${quest.type.charAt(0).toUpperCase() + quest.type.slice(1)} Quest`,
                    icon: '<img src="icons/misc/gameplay.svg" alt="" width="14" height="14" style="vertical-align: middle;">',
                    section: 'story',
                    data: quest
                });
            });
        }
        
        // Assets
        if (AppState.assets) {
            AppState.assets.forEach(asset => {
                items.push({
                    id: asset.id,
                    type: 'asset',
                    name: asset.name,
                    category: `${asset.type.charAt(0).toUpperCase() + asset.type.slice(1)} Asset`,
                    icon: '🎨',
                    section: 'assets',
                    data: asset
                });
            });
        }
        
        return items;
    },
    
    // Find an item by ID and type
    findItem(id, type) {
        return this.getAllItems().find(item => item.id === id && item.type === type);
    },
    
    // Find an item by ID only (searches all types)
    findItemById(id) {
        return this.getAllItems().find(item => item.id === id);
    },
    
    // Get all items that reference this item (reverse relationships)
    getReferencedBy(itemId) {
        const references = [];
        const allItems = this.getAllItems();
        
        allItems.forEach(item => {
            // Check universal relatedItems array
            if (item.data.relatedItems && Array.isArray(item.data.relatedItems)) {
                if (item.data.relatedItems.some(rel => rel.id === itemId)) {
                    references.push(item);
                    return; // Found via relatedItems, no need to check other fields
                }
            }
            
            // Check character-specific class references
            if (item.type === 'character' && item.data.classes && Array.isArray(item.data.classes)) {
                if (item.data.classes.some(cls => cls.classId === itemId)) {
                    references.push(item);
                    return;
                }
            }
            
            // Check mechanic-specific class references
            if (item.type === 'mechanic' && item.data.relatedClasses && Array.isArray(item.data.relatedClasses)) {
                if (item.data.relatedClasses.includes(itemId)) {
                    references.push(item);
                    return;
                }
            }
            
            // Check timeline event location/character references
            if (item.type === 'timeline') {
                if (item.data.locationId === itemId || 
                    (item.data.characterIds && item.data.characterIds.includes(itemId))) {
                    references.push(item);
                    return;
                }
            }
            
            // Check scene references (location, characters, conflicts, themes)
            if (item.type === 'scene') {
                if (item.data.location === itemId ||
                    (item.data.characters && item.data.characters.includes(itemId)) ||
                    (item.data.conflicts && item.data.conflicts.includes(itemId)) ||
                    (item.data.themes && item.data.themes.includes(itemId))) {
                    references.push(item);
                    return;
                }
            }
        });
        
        return references;
    },
    
    // Navigate to an item (switches section and scrolls/focuses on item)
    navigateToItem(itemId, itemType) {
        const item = this.findItem(itemId, itemType);
        if (!item) {
            console.warn('Item not found:', itemId, itemType);
            return;
        }
        
        // Switch to the appropriate section
        Navigation.switchSection(item.section);
        
        // Wait for section to render, then scroll to item
        setTimeout(() => {
            const element = document.querySelector(`[data-id="${itemId}"]`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('highlight-flash');
                setTimeout(() => element.classList.remove('highlight-flash'), 2000);
            }
        }, 100);
    },
    
    // Open relationship selector modal (secondary overlay)
    openRelationshipSelector(currentItem, onSave, excludeTypes = []) {
        const allItems = this.getAllItems().filter(item => 
            !(item.id === currentItem.id && item.type === currentItem.type) &&
            !excludeTypes.includes(item.type)
        );
        
        // Group items by type
        const grouped = {};
        allItems.forEach(item => {
            if (!grouped[item.type]) {
                grouped[item.type] = [];
            }
            grouped[item.type].push(item);
        });
        
        const currentRelations = currentItem.data.relatedItems || [];
        
        let html = `
            <div class="relationship-selector-overlay" id="relationshipSelectorOverlay">
                <div class="relationship-selector-modal">
                    <h3>Link Related Items</h3>
                    <p class="modal-description">Select items from across your project that relate to "${Utils.escapeHtml(currentItem.name)}"</p>
                    
                    <div class="relationship-search">
                        <input type="text" id="relationshipSearch" placeholder="Search items..." class="search-input">
                    </div>
                    
                    <div class="relationship-groups" id="relationshipGroups">
        `;
        
        const typeLabels = {
            note: '📝 Notes',
            class: '👤 Classes',
            mechanic: '<img src="icons/navigation/mechanics.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Mechanics',
            act: '📖 Acts',
            scene: '🎬 Scenes',
            character: '<img src="icons/misc/user.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Characters',
            location: '<img src="icons/story/location.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Locations',
            timeline: '<img src="icons/misc/calendar.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Timeline',
            conflict: '⚡ Conflicts',
            theme: '🎨 Themes'
        };
        
        Object.entries(grouped).forEach(([type, items]) => {
            html += `
                <div class="relationship-group" data-type="${type}">
                    <h4 class="relationship-group-title">${typeLabels[type] || type} (${items.length})</h4>
                    <div class="relationship-items">
            `;
            
            items.forEach(item => {
                const isSelected = currentRelations.some(rel => rel.id === item.id && rel.type === item.type);
                const searchText = `${item.name?.toLowerCase() || ''} ${item.category?.toLowerCase() || ''}`;
                html += `
                    <label class="relationship-item ${isSelected ? 'selected' : ''}" data-search="${searchText}">
                        <input type="checkbox" value="${item.id}" data-type="${item.type}" ${isSelected ? 'checked' : ''}>
                        <span class="item-icon">${item.icon}</span>
                        <span class="item-info">
                            <span class="item-name">${Utils.escapeHtml(item.name || 'Unnamed')}</span>
                            <span class="item-category">${Utils.escapeHtml(item.category || '')}</span>
                        </span>
                    </label>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" id="cancelRelationships">Cancel</button>
                    <button type="button" class="btn btn-primary" id="saveRelationships">Save Relationships</button>
                </div>
                </div>
            </div>
        `;
        
        // Append to body instead of using Modal
        document.body.insertAdjacentHTML('beforeend', html);
        
        // Search functionality
        document.getElementById('relationshipSearch').addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            document.querySelectorAll('.relationship-item').forEach(item => {
                const searchText = item.getAttribute('data-search');
                item.style.display = searchText.includes(query) ? 'flex' : 'none';
            });
        });
        
        // Toggle selection styling
        document.querySelectorAll('.relationship-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                e.target.closest('.relationship-item').classList.toggle('selected', e.target.checked);
            });
        });
        
        // Close overlay on background click
        document.getElementById('relationshipSelectorOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'relationshipSelectorOverlay') {
                this.closeRelationshipSelector();
            }
        });
        
        document.getElementById('cancelRelationships').addEventListener('click', () => {
            this.closeRelationshipSelector();
        });
        
        document.getElementById('saveRelationships').addEventListener('click', () => {
            const selected = [];
            document.querySelectorAll('.relationship-item input[type="checkbox"]:checked').forEach(checkbox => {
                selected.push({
                    id: checkbox.value,
                    type: checkbox.getAttribute('data-type')
                });
            });
            
            onSave(selected);
            this.closeRelationshipSelector();
        });
    },
    
    closeRelationshipSelector() {
        const overlay = document.getElementById('relationshipSelectorOverlay');
        if (overlay) {
            overlay.remove();
        }
    },
    
    // Refresh all sections to update "Referenced By" displays when relationships change
    refreshAllSections() {
        // Only refresh sections that are already initialized and have render methods
        try {
            if (typeof NotesManager !== 'undefined' && NotesManager.render) {
                NotesManager.render();
            }
            if (typeof ClassesManager !== 'undefined' && ClassesManager.render) {
                ClassesManager.render();
            }
            if (typeof MechanicsManager !== 'undefined' && MechanicsManager.render) {
                MechanicsManager.render();
            }
            if (typeof StoryManager !== 'undefined' && StoryManager.render) {
                StoryManager.render();
            }
        } catch (error) {
            console.warn('Error refreshing sections:', error);
        }
    },
    
    // Clean up orphaned relationships - remove references to items that no longer exist
    cleanupOrphanedRelationships() {
        const allItems = this.getAllItems();
        const validItemIds = new Set(allItems.map(item => item.id));
        let changesMade = false;
        
        // Check each item's relatedItems array
        allItems.forEach(item => {
            if (item.data.relatedItems && Array.isArray(item.data.relatedItems)) {
                const originalLength = item.data.relatedItems.length;
                
                // Filter out relationships to items that no longer exist
                item.data.relatedItems = item.data.relatedItems.filter(rel => {
                    return validItemIds.has(rel.id);
                });
                
                if (item.data.relatedItems.length !== originalLength) {
                    changesMade = true;
                    console.log(`Cleaned up orphaned relationships in ${item.type} "${item.name}"`);
                }
            }
        });
        
        // Save changes if any were made
        if (changesMade) {
            AppState.save();
        }
        
        return changesMade;
    },
    
    // Show detailed confirmation dialog with list of affected items before deletion
    confirmDeleteWithImpact(itemId, itemName, itemType, onConfirm) {
        const referencedBy = this.getReferencedBy(itemId);
        
        let message;
        if (referencedBy.length === 0) {
            message = `Are you sure you want to delete "${itemName}"?`;
        } else {
            // Group references by type
            const groupedRefs = {};
            referencedBy.forEach(ref => {
                if (!groupedRefs[ref.type]) {
                    groupedRefs[ref.type] = [];
                }
                groupedRefs[ref.type].push(ref.name);
            });
            
            // Build detailed message
            message = `⚠️ WARNING: "${itemName}" is referenced by ${referencedBy.length} item(s):\n\n`;
            
            Object.keys(groupedRefs).forEach(type => {
                const typeName = type.charAt(0).toUpperCase() + type.slice(1) + (groupedRefs[type].length > 1 ? 's' : '');
                message += `${typeName}:\n`;
                groupedRefs[type].forEach(name => {
                    message += `  • ${name}\n`;
                });
                message += '\n';
            });
            
            message += `\nDeleting "${itemName}" will remove all these references.\n\nAre you sure you want to continue?`;
        }
        
        Utils.showConfirm(message, onConfirm);
    },
    
    // Synchronize relationships bidirectionally
    // When Item A removes Item B from its relationships, also remove A from B's relationships
    syncRelationships(updatedItem, oldRelatedItems, newRelatedItems) {
        // Find removed relationships
        const removed = oldRelatedItems.filter(oldRel => 
            !newRelatedItems.some(newRel => newRel.id === oldRel.id && newRel.type === oldRel.type)
        );
        
        // Find added relationships
        const added = newRelatedItems.filter(newRel => 
            !oldRelatedItems.some(oldRel => oldRel.id === newRel.id && oldRel.type === newRel.type)
        );
        
        // For each removed relationship, remove the reverse reference
        removed.forEach(rel => {
            const targetItem = this.findItem(rel.id, rel.type);
            if (targetItem && targetItem.data.relatedItems) {
                targetItem.data.relatedItems = targetItem.data.relatedItems.filter(
                    item => !(item.id === updatedItem.id && item.type === updatedItem.type)
                );
                console.log(`Removed reverse reference from ${targetItem.type} "${targetItem.name}"`);
            }
        });
        
        // For each added relationship, add the reverse reference if it doesn't exist
        added.forEach(rel => {
            const targetItem = this.findItem(rel.id, rel.type);
            if (targetItem) {
                if (!targetItem.data.relatedItems) {
                    targetItem.data.relatedItems = [];
                }
                
                // Check if reverse reference already exists
                const alreadyLinked = targetItem.data.relatedItems.some(
                    item => item.id === updatedItem.id && item.type === updatedItem.type
                );
                
                if (!alreadyLinked) {
                    targetItem.data.relatedItems.push({
                        id: updatedItem.id,
                        type: updatedItem.type
                    });
                    console.log(`Added reverse reference to ${targetItem.type} "${targetItem.name}"`);
                }
            }
        });
        
        // Save all changes
        AppState.save();
    },
    
    // Navigate to a specific item by ID and type
    navigateToItem(itemId, itemType) {
        // Map item types to their corresponding sections
        const sectionMap = {
            'note': 'notes',
            'class': 'classes',
            'mechanic': 'mechanics',
            'character': 'story',
            'location': 'story',
            'timeline': 'story',
            'conflict': 'story',
            'theme': 'story',
            'act': 'story',
            'scene': 'story'
        };
        
        const section = sectionMap[itemType];
        if (!section) {
            console.warn(`Unknown item type: ${itemType}`);
            return;
        }
        
        // Navigate to the section
        Navigation.switchSection(section);
        
        // Wait for section to render, then scroll to and highlight the item
        setTimeout(() => {
            this.highlightItem(itemId, itemType);
        }, 100);
    },
    
    // Highlight and scroll to a specific item
    highlightItem(itemId, itemType) {
        // Find the element containing this item
        let targetElement = null;
        
        // Try different selectors based on item type
        const selectors = [
            `[data-id="${itemId}"]`,
            `[data-note-id="${itemId}"]`,
            `[data-class-id="${itemId}"]`,
            `[data-mechanic-id="${itemId}"]`,
            `[data-character-id="${itemId}"]`,
            `[data-location-id="${itemId}"]`,
            `[data-act-id="${itemId}"]`,
            `[data-scene-id="${itemId}"]`
        ];
        
        for (const selector of selectors) {
            targetElement = document.querySelector(selector);
            if (targetElement) break;
        }
        
        if (!targetElement) {
            console.warn(`Could not find element for ${itemType} with ID: ${itemId}`);
            return;
        }
        
        // Scroll to the element
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add highlight animation
        targetElement.classList.add('highlight-flash');
        setTimeout(() => {
            targetElement.classList.remove('highlight-flash');
        }, 2000);
    },
    
    // Make relationship chips clickable
    makeChipsClickable(container) {
        const chips = container.querySelectorAll('.relationship-chip[data-id], .character-tag[data-id]');
        chips.forEach(chip => {
            const itemId = chip.getAttribute('data-id');
            const itemType = chip.getAttribute('data-type');
            
            if (itemId && itemType) {
                chip.style.cursor = 'pointer';
                chip.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.navigateToItem(itemId, itemType);
                });
            }
        });
    }
};

// ============================================
// File Storage (IndexedDB)
// ============================================
const FileStorage = {
    dbName: 'ForgeonDB',
    dbVersion: 1,
    db: null,
    
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object store for files if it doesn't exist
                if (!db.objectStoreNames.contains('files')) {
                    const objectStore = db.createObjectStore('files', { keyPath: 'id' });
                    objectStore.createIndex('assetId', 'assetId', { unique: false });
                    console.log('Created files object store');
                }
            };
        });
    },
    
    async saveFile(assetId, file) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readwrite');
            const objectStore = transaction.objectStore('files');
            
            const fileData = {
                id: assetId,
                assetId: assetId,
                file: file,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                uploadDate: new Date().toISOString()
            };
            
            const request = objectStore.put(fileData);
            
            request.onsuccess = () => resolve(fileData);
            request.onerror = () => reject(request.error);
        });
    },
    
    async getFile(assetId) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readonly');
            const objectStore = transaction.objectStore('files');
            const request = objectStore.get(assetId);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    async deleteFile(assetId) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readwrite');
            const objectStore = transaction.objectStore('files');
            const request = objectStore.delete(assetId);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
    
    async createThumbnail(file) {
        if (!file.type.startsWith('image/')) return null;
        
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Create thumbnail (max 200x200)
                    const maxSize = 200;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > maxSize) {
                            height *= maxSize / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width *= maxSize / height;
                            height = maxSize;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    },
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
};

// ============================================
// Navigation System
// ============================================
// Handles switching between different application sections (dashboard, tasks, story, etc)
// Manages active state of navigation buttons and visibility of content sections
// Updates AppState.currentSection to track which view user is currently viewing
const Navigation = {
    /**
     * Initializes navigation system
     * Attaches click listeners to all navigation buttons
     * Each button should have data-section attribute specifying target section
     */
    init() {
        const navButtons = document.querySelectorAll('.nav-item');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.getAttribute('data-section');
                this.switchSection(section);
            });
        });
    },
    
    /**
     * Switches to a different application section
     * Updates navigation UI to highlight active section
     * Shows/hides content areas accordingly
     * Refreshes data for the new section
     * @param {string} sectionName - The name of the section to switch to
     *                                (dashboard, notes, timeline, classes, mechanics, story, quests, assets, milestones)
     */
    switchSection(sectionName) {
        // ===== Update Navigation Button States =====
        // Remove active state from all buttons
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('active');
            btn.removeAttribute('aria-current');
        });
        
        // Highlight the active navigation button
        const activeBtn = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.setAttribute('aria-current', 'page');
        }
        
        // ===== Update Content Section Visibility =====
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show the selected section
        const activeSection = document.getElementById(sectionName);
        if (activeSection) {
            activeSection.classList.add('active');
        }
        
        // Update state tracking
        AppState.currentSection = sectionName;
        
        // ===== Refresh Section Data =====
        // Call appropriate manager's render method to refresh displayed data
        if (sectionName === 'dashboard') Dashboard.refresh();
        if (sectionName === 'notes') NotesManager.render();
       
    }
};

// ============================================
// Modal System
// ============================================
// Manages modal dialogs for editing items
// Provides consistent UI for create/edit workflows
// Prevents accidental data loss with unsaved changes warning
// Keyboard support (ESC to close with confirmation)
const Modal = {
    overlay: null,  // Dark background overlay element
    body: null,     // Modal content container
    
    /**
     * Initializes modal system
     * Attaches event listeners for close button and keyboard shortcuts
     * Sets up ESC key handling and click-outside prevention
     */
    init() {
        this.overlay = document.getElementById('modalOverlay');
        this.body = document.getElementById('modalBody');
        
        // Close button listener
        document.getElementById('modalClose').addEventListener('click', () => this.confirmClose());
        
        // Prevent accidental closes - user must explicitly Save or Cancel
        // Click outside modal does nothing (user must use buttons)
        this.overlay.addEventListener('click', (e) => {
            // Intentionally empty - don't close on background click
        });
        
        // ESC key shows confirmation to prevent accidental loss of unsaved changes
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
                this.confirmClose();
            }
        });
    },
    
    /**
     * Confirms whether user wants to close modal without saving
     * Shows warning if form contains unsaved input
     * Silently closes if no form content present
     */
    confirmClose() {
        // Check if modal contains any form inputs
        const hasContent = this.body.querySelector('input, textarea, select');
        if (hasContent) {
            // Ask user to confirm - unsaved changes would be lost
            Utils.showConfirm('Are you sure you want to close? Any unsaved changes will be lost.', () => {
                this.close();
            });
        } else {
            // No form inputs, safe to close silently
            this.close();
        }
    },
    
    /**
     * Opens modal dialog with specified content
     * Sets up overlay and displays content in modal body
     * Clears previous content and resets state
     * @param {string} content - HTML content to display in modal
     */
    open(content) {
        // Ensure clean state before opening
        this.overlay.style.display = '';
        document.body.style.pointerEvents = '';
        
        // Insert content into modal
        this.body.innerHTML = content;
        
        // Show modal with CSS class
        this.overlay.classList.add('active');
        this.overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    },
    
    close() {
        // Blur any focused element to prevent focus issues
        if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
        }
        
        // Force remove active class and ensure display is none
        this.overlay.classList.remove('active');
        this.overlay.setAttribute('aria-hidden', 'true');
        this.overlay.style.display = 'none';
        document.body.style.overflow = '';
        document.body.style.pointerEvents = '';
        this.body.innerHTML = '';
    },
    
    // Emergency cleanup function to force-close modal if it gets stuck
    forceClose() {
        try {
            if (this.overlay) {
                this.overlay.classList.remove('active');
                this.overlay.style.display = 'none';
                this.overlay.setAttribute('aria-hidden', 'true');
            }
            if (this.body) {
                this.body.innerHTML = '';
            }
            document.body.style.overflow = '';
            document.body.style.pointerEvents = '';
            console.log('Modal force-closed');
        } catch (e) {
            console.error('Error force-closing modal:', e);
        }
    }
};

// Global safety mechanism: Detect and fix stuck overlays
setInterval(() => {
    // Check if modal overlay exists but is not visible
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay && !modalOverlay.classList.contains('active') && modalOverlay.style.display !== 'none') {
        modalOverlay.style.display = 'none';
    }
    
    // Ensure body is never permanently blocked
    if (document.body.style.pointerEvents === 'none' && !modalOverlay?.classList.contains('active')) {
        document.body.style.pointerEvents = '';
    }
}, 1000);

// ============================================
// Dashboard
// ============================================
// Main overview page showing project status, statistics, and quick actions
// Displays task progress, asset counts, milestone status, productivity metrics
// Includes calendar view for task scheduling and deadline visualization
// Provides quick access to recent items and upcoming milestones
const Dashboard = {
    /**
     * Initializes dashboard calendar navigation
     * Attaches listeners to previous/next month buttons
     * Updates calendar display when user navigates months
     */
    init() {
        // Calendar navigation controls
        document.getElementById('calendarPrevMonth')?.addEventListener('click', () => {
            // Go to previous month (handles year wraparound)
            this.currentCalendarMonth--;
            if (this.currentCalendarMonth < 0) {
                this.currentCalendarMonth = 11;
                this.currentCalendarYear--;
            }
            this.updateReminderCalendar();
        });
        
        document.getElementById('calendarNextMonth')?.addEventListener('click', () => {
            // Go to next month (handles year wraparound)
            this.currentCalendarMonth++;
            if (this.currentCalendarMonth > 11) {
                this.currentCalendarMonth = 0;
                this.currentCalendarYear++;
            }
            this.updateReminderCalendar();
        });
    },
    
    /**
     * Updates all dashboard statistics
     * Alias for refresh() for consistency
     */
    updateStats() {
        this.refresh();
    },
    
    /**
     * Refreshes dashboard display with current project data
     * Updates task counts, asset counts, progress metrics
     * Recalculates statistics and displays recent items
     * Called when switching to dashboard or after data changes
     */
    refresh() {
        // ===== Task Statistics =====
        // Count active and overdue tasks
        const activeTasks = AppState.tasks.filter(t => !t.completed).length;
        const overdueTasks = AppState.tasks.filter(t => !t.completed && t.dueDate && Utils.isDateBeforeToday(t.dueDate)).length;
        
        // Display task count with overdue indicator if needed
        document.getElementById('activeTasks').textContent = activeTasks;
        if (overdueTasks > 0) {
            document.getElementById('activeTasks').innerHTML = `${activeTasks} <span style="color: var(--danger-color); font-size: 0.8em;">(${overdueTasks} overdue)</span>`;
        }
        
        // ===== Asset & Milestone Counts =====
        document.getElementById('totalAssets').textContent = AppState.assets.length;
        document.getElementById('totalMilestones').textContent = AppState.milestones.length;
        document.getElementById('totalNotes').textContent = Array.isArray(AppState.notes) ? AppState.notes.filter(n => !n.archived).length : 0;
        
        // ===== Reminder & Calendar Stats =====
        
        // Update reminder stats
        this.updateReminderStats();
        
        // Calculate overall progress
        const totalTasks = AppState.tasks.length;
        const completedTasks = AppState.tasks.filter(t => t.completed).length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        document.getElementById('overallProgress').textContent = `${progress}%`;
        
        // Update productivity stats
        this.updateProductivityStats();
        
        // Recent tasks
        this.updateRecentTasks();
        
        // Upcoming milestones
        this.updateUpcomingMilestones();
    },
    
    updateReminderStats() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(today);
        endOfToday.setDate(endOfToday.getDate() + 1);
        const endOfWeek = new Date(today);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        
        let overdue = 0, todayCount = 0, weekCount = 0;
        
        AppState.notes.forEach(note => {
            if (!note.reminderEnabled || !note.reminderDate || note.reminderDismissed || note.archived) {
                return;
            }
            const reminderDateTime = new Date(`${note.reminderDate}T${note.reminderTime || '00:00'}`);
            
            if (reminderDateTime < now) {
                overdue++;
            } else if (reminderDateTime >= today && reminderDateTime < endOfToday) {
                todayCount++;
            } else if (reminderDateTime >= endOfToday && reminderDateTime < endOfWeek) {
                weekCount++;
            }
        });
        
        document.getElementById('remindersOverdue').textContent = overdue;
        document.getElementById('remindersToday').textContent = todayCount;
        document.getElementById('remindersWeek').textContent = weekCount;
        
        // Show/hide widget based on whether there are any reminders
        const widget = document.getElementById('reminderWidget');
        if (widget) {
            widget.style.display = (overdue + todayCount + weekCount) > 0 ? 'flex' : 'none';
        }
        
        // Update calendar
        this.updateReminderCalendar();
    },
    
    currentCalendarMonth: new Date().getMonth(),
    currentCalendarYear: new Date().getFullYear(),
    
    updateReminderCalendar() {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        document.getElementById('calendarMonthYear').textContent = 
            `${monthNames[this.currentCalendarMonth]} ${this.currentCalendarYear}`;
        
        const firstDay = new Date(this.currentCalendarYear, this.currentCalendarMonth, 1);
        const lastDay = new Date(this.currentCalendarYear, this.currentCalendarMonth + 1, 0);
        const startingDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        
        // Get reminders for this month
        const remindersByDate = {};
        AppState.notes.forEach(note => {
            if (!note.reminderEnabled || !note.reminderDate || note.archived) return;
            const [year, month, day] = note.reminderDate.split('-').map(Number);
            if (year === this.currentCalendarYear && month - 1 === this.currentCalendarMonth) {
                const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                if (!remindersByDate[dateKey]) remindersByDate[dateKey] = [];
                remindersByDate[dateKey].push(note);
            }
        });

        // Get tasks due in this month (for dot indicators)
        const tasksByDate = {};
        AppState.tasks.forEach(task => {
            if (!task.dueDate || task.completed) return;
            // Support date-only and datetime formats
            const dateOnly = (typeof task.dueDate === 'string' && task.dueDate.match(/^\d{4}-\d{2}-\d{2}$/));
            let y,m,d;
            if (dateOnly) {
                [y,m,d] = task.dueDate.split('-').map(Number);
            } else {
                const dt = new Date(task.dueDate);
                if (isNaN(dt)) return;
                y = dt.getFullYear(); m = dt.getMonth() + 1; d = dt.getDate();
            }
            if (y === this.currentCalendarYear && m - 1 === this.currentCalendarMonth) {
                const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                if (!tasksByDate[dateKey]) tasksByDate[dateKey] = [];
                tasksByDate[dateKey].push(task);
            }
        });

        // Get milestones due in this month (for dot indicators)
        const milestonesByDate = {};
        AppState.milestones.forEach(milestone => {
            if (!milestone.dueDate || milestone.completed) return;
            const dateOnly = (typeof milestone.dueDate === 'string' && milestone.dueDate.match(/^\d{4}-\d{2}-\d{2}$/));
            let y,m,d;
            if (dateOnly) {
                [y,m,d] = milestone.dueDate.split('-').map(Number);
            } else {
                const dt = new Date(milestone.dueDate);
                if (isNaN(dt)) return;
                y = dt.getFullYear(); m = dt.getMonth() + 1; d = dt.getDate();
            }
            if (y === this.currentCalendarYear && m - 1 === this.currentCalendarMonth) {
                const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                if (!milestonesByDate[dateKey]) milestonesByDate[dateKey] = [];
                milestonesByDate[dateKey].push(milestone);
            }
        });
        
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        let calendarHtml = '<div class="calendar-weekdays">';
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
            calendarHtml += `<div class="calendar-weekday">${day}</div>`;
        });
        calendarHtml += '</div><div class="calendar-days">';
        
        // Empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            calendarHtml += '<div class="calendar-day empty"></div>';
        }
        
        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${this.currentCalendarYear}-${String(this.currentCalendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const reminders = remindersByDate[dateStr] || [];
            const tasksForDay = tasksByDate[dateStr] || [];
            const milestonesForDay = milestonesByDate[dateStr] || [];
            const isToday = dateStr === todayStr;
            const hasReminders = reminders.length > 0;
            const hasOverdue = reminders.some(n => !n.reminderDismissed && new Date(`${n.reminderDate}T${n.reminderTime || '00:00'}`) < new Date());
            
            calendarHtml += `
                <div class="calendar-day ${isToday ? 'today' : ''} ${hasReminders ? 'has-reminder' : ''} ${hasOverdue ? 'overdue' : ''}" 
                     onclick="Dashboard.showDayReminders('${dateStr}')">
                    <span class="day-number">${day}</span>
                    ${hasReminders ? `<span class="reminder-count">${reminders.length}</span>` : ''}
                    ${ (tasksForDay.length + milestonesForDay.length) > 0 ? `<div class="calendar-dots">${([...tasksForDay, ...milestonesForDay].slice(0,5)).map(item => `<span class="dot ${item.hasOwnProperty('progress') ? 'milestone' : 'task'}"></span>`).join('')}${(tasksForDay.length + milestonesForDay.length)>5?`<span class="more">+${(tasksForDay.length + milestonesForDay.length)-5}</span>`:''}</div>` : ''}
                </div>
            `;
        }
        
        calendarHtml += '</div>';
        document.getElementById('calendarGrid').innerHTML = calendarHtml;
    },
    
    showDayReminders(dateStr) {
        const reminders = AppState.notes.filter(note => 
            note.reminderEnabled && note.reminderDate === dateStr && !note.archived
        );
        
        // Also collect tasks and milestones for this day so users can see everything
        const tasksOnDay = AppState.tasks.filter(task => {
            if (!task.dueDate || task.completed) return false;
            const dateOnly = (typeof task.dueDate === 'string' && task.dueDate.match(/^\d{4}-\d{2}-\d{2}$/));
            if (dateOnly) return task.dueDate === dateStr;
            const dt = new Date(task.dueDate);
            if (isNaN(dt)) return false;
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
            return key === dateStr;
        });

        const milestonesOnDay = AppState.milestones.filter(m => {
            const d = m.dueDate || m.targetDate;
            if (!d || m.completed) return false;
            const dateOnly = (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/));
            if (dateOnly) return d === dateStr;
            const dt = new Date(d);
            if (isNaN(dt)) return false;
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
            return key === dateStr;
        });

        if (reminders.length === 0 && tasksOnDay.length === 0 && milestonesOnDay.length === 0) return;
        
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const formattedDate = date.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        const remindersHtml = reminders.map(note => {
            const isDismissed = note.reminderDismissed;
            const isOverdue = !isDismissed && new Date(`${note.reminderDate}T${note.reminderTime || '00:00'}`) < new Date();
            
            return `
                <div class="day-reminder-item ${isDismissed ? 'dismissed' : ''} ${isOverdue ? 'overdue' : ''}">
                    <div class="day-reminder-header">
                        <h4>${Utils.escapeHtml(note.title)}</h4>
                        <span class="reminder-time">${note.reminderTime || '00:00'}</span>
                    </div>
                    ${note.category ? `<div class="reminder-category">${Utils.escapeHtml(note.category)}</div>` : ''}
                    ${isDismissed ? '<div class="reminder-status">✓ Completed</div>' : isOverdue ? '<div class="reminder-status overdue">⚠ Overdue</div>' : ''}
                    <div class="day-reminder-actions">
                        <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); NotesManager.openNoteModal(AppState.notes.find(n => n.id === '${note.id}'))">Edit Note</button>
                        ${!isDismissed ? `
                            <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); Dashboard.quickEditReminder('${note.id}')">Change Time</button>
                            <button class="btn btn-small btn-primary" onclick="event.stopPropagation(); NotesManager.markReminderComplete('${note.id}'); Modal.close(); Dashboard.refresh()">Mark Complete</button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        const tasksHtml = tasksOnDay.map(task => {
            return `
                <div class="day-reminder-item">
                    <div class="day-reminder-header">
                        <h4>${Utils.escapeHtml(task.title)}</h4>
                        <span class="reminder-time">${task.dueDate}</span>
                    </div>
                    <div class="day-reminder-actions">
                        <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); Dashboard.openTask('${task.id}')">Edit Task</button>
                    </div>
                </div>
            `;
        }).join('');

        const milestonesHtml = milestonesOnDay.map(ms => {
            return `
                <div class="day-reminder-item">
                    <div class="day-reminder-header">
                        <h4>${Utils.escapeHtml(ms.title)}</h4>
                        <span class="reminder-time">${ms.dueDate || ms.targetDate || ''}</span>
                    </div>
                    <div class="day-reminder-actions">
                        <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); Dashboard.openMilestone('${ms.id}')">Open Milestone</button>
                    </div>
                </div>
            `;
        }).join('');
        
        const modalHtml = `
            <div class="day-reminders-modal">
                <h3>Reminders for ${formattedDate}</h3>
                <div class="day-reminders-list">
                    ${remindersHtml}
                    ${tasksHtml ? `<h4 style="margin-top: 0.75rem;">Tasks</h4>${tasksHtml}` : ''}
                    ${milestonesHtml ? `<h4 style="margin-top: 0.75rem;">Milestones</h4>${milestonesHtml}` : ''}
                </div>
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="Modal.close()">Close</button>
                </div>
            </div>
        `;
        
        Modal.open(modalHtml);
    },
    
    quickEditReminder(noteId) {
        const note = AppState.notes.find(n => n.id === noteId);
        if (!note) return;
        
        const formHtml = `
            <form class="modal-form" id="quickReminderForm">
                <h3>Edit Reminder</h3>
                <p><strong>${Utils.escapeHtml(note.title)}</strong></p>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="quickReminderDate">Date</label>
                        <input type="date" id="quickReminderDate" value="${note.reminderDate}" required>
                    </div>
                    <div class="form-group">
                        <label for="quickReminderTime">Time</label>
                        <input type="time" id="quickReminderTime" value="${note.reminderTime || '00:00'}" required>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Reminder</button>
                </div>
            </form>
        `;
        
        Modal.open(formHtml);
        
        document.getElementById('quickReminderForm').addEventListener('submit', (e) => {
            e.preventDefault();
            note.reminderDate = document.getElementById('quickReminderDate').value;
            note.reminderTime = document.getElementById('quickReminderTime').value;
            note.modifiedAt = new Date().toISOString();
            AppState.save();
            Modal.close();
            this.refresh();
            NotesManager.render();
        });
    },
    
    updateProductivityStats() {
        const statsContainer = document.getElementById('productivityStats');
        if (!statsContainer) return;
        
        // Calculate completion rate (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentTasks = AppState.tasks.filter(t => new Date(t.createdAt) >= sevenDaysAgo);
        const recentCompleted = recentTasks.filter(t => t.completed).length;
        const weeklyCompletionRate = recentTasks.length > 0 ? Math.round((recentCompleted / recentTasks.length) * 100) : 0;
        
        // Task breakdown by priority
        const highPriority = AppState.tasks.filter(t => t.priority === 'high' && !t.completed).length;
        const mediumPriority = AppState.tasks.filter(t => t.priority === 'medium' && !t.completed).length;
        const lowPriority = AppState.tasks.filter(t => t.priority === 'low' && !t.completed).length;
        
        // Task breakdown by category
        const categories = {};
        AppState.tasks.filter(t => !t.completed).forEach(task => {
            const cat = task.category || 'other';
            categories[cat] = (categories[cat] || 0) + 1;
        });
        
        statsContainer.innerHTML = `
            <h3>Productivity Overview</h3>
            <div class="stat-row">
                <span>Weekly Completion Rate:</span>
                <strong>${weeklyCompletionRate}%</strong>
            </div>
            <div class="stat-row">
                <span>Tasks Created (7 days):</span>
                <strong>${recentTasks.length}</strong>
            </div>
            <div class="stat-row">
                <span>High Priority Tasks:</span>
                <strong style="color: var(--danger-color);">${highPriority}</strong>
            </div>
            ${Object.keys(categories).length > 0 ? `
                <div class="category-breakdown">
                    <strong>By Category:</strong>
                    ${Object.entries(categories).map(([cat, count]) => 
                        `<div class="category-item"><span>${cat}:</span> <span>${count}</span></div>`
                    ).join('')}
                </div>
            ` : ''}
        `;
    },
    
    updateRecentTasks() {
        const list = document.getElementById('recentTasksList');
        const recentTasks = AppState.tasks
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
        
        list.innerHTML = '';
        if (recentTasks.length === 0) {
            list.innerHTML = '<li style="opacity: 0.6;">No tasks yet. Create your first task!</li>';
            return;
        }
        
        recentTasks.forEach(task => {
            const li = document.createElement('li');
            const isOverdue = task.dueDate && Utils.isDateBeforeToday(task.dueDate);
            const statusIcon = task.completed ? Utils.icon('actions/success', 'small') : (isOverdue ? Utils.icon('actions/warning', 'small') : Utils.icon('misc/hourglass', 'small'));
            li.innerHTML = `${statusIcon} ${Utils.escapeHtml(task.title)}`;
            if (task.completed) {
                li.style.opacity = '0.6';
            }
            li.style.cursor = 'pointer';
            li.onclick = () => {
                Navigation.switchSection('tasks');
                TaskManager.render();
            };
            list.appendChild(li);
        });
    },
    
    updateUpcomingMilestones() {
        const list = document.getElementById('upcomingMilestonesList');
        const upcoming = AppState.milestones
            .filter(m => m.progress < 100)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 5);
        
        list.innerHTML = '';
        if (upcoming.length === 0) {
            list.innerHTML = '<li style="opacity: 0.6;">No upcoming milestones</li>';
            return;
        }
        
        upcoming.forEach(milestone => {
            const li = document.createElement('li');
            const daysUntil = Math.ceil((new Date(milestone.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
            const daysText = daysUntil > 0 ? `${daysUntil} days` : `${Math.abs(daysUntil)} days overdue`;
            li.innerHTML = `${Utils.icon('navigation/milestones', 'small')} ${Utils.escapeHtml(milestone.title)} <span style="opacity: 0.7; font-size: 0.9em;">(${milestone.progress}% - ${daysText})</span>`;
            li.style.cursor = 'pointer';
            li.onclick = () => {
                Navigation.switchSection('milestones');
                MilestonePlanner.render();
            };
            list.appendChild(li);
        });
    },

    // Open task for editing
    openTask(taskId) {
        const task = AppState.tasks.find(t => t.id === taskId);
        if (!task) return;
        Modal.close();
        Navigation.switchSection('tasks');
        TaskManager.render();
        setTimeout(() => TaskManager.openAddModal(task), 50);
    },

    // Open milestone for editing
    openMilestone(milestoneId) {
        const milestone = AppState.milestones.find(m => m.id === milestoneId);
        if (!milestone) return;
        Modal.close();
        Navigation.switchSection('milestones');
        MilestonePlanner.render();
        setTimeout(() => MilestonePlanner.openAddModal(milestone), 50);
    }
};

// ============================================
// Task Manager
// ============================================
// Manages game development tasks/to-do items
// Supports filtering by status, sorting by various criteria
// Tracks task completion, due dates, priorities, and related items
// Provides create/edit/delete workflows for task management
const TaskManager = {
    currentFilter: 'all',  // Filter: all, active, completed
    sortBy: 'createdAt',   // Sort field: createdAt, dueDate, priority, title
    sortOrder: 'desc',     // Sort direction: asc, desc
    
    /**
     * Initializes task manager
     * Attaches event listeners to UI controls
     */
    init() {

        document.getElementById('addTaskBtn').addEventListener('click', () => this.openAddModal());
        
        // Filter buttons
        document.querySelectorAll('#tasks .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#tasks .filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.getAttribute('data-filter');
                this.render();
            });
        });
        
        // Sort dropdown
        const sortDropdown = document.getElementById('taskSortBy');
        if (sortDropdown) {
            sortDropdown.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.render();
            });
        }
        
        this.render();
    },
    
    openAddModal(taskToEdit = null) {
        const isEdit = taskToEdit !== null;
        const formHtml = `
            <form class="modal-form" id="taskForm">
                <h3>${isEdit ? 'Edit Task' : 'Add New Task'}</h3>
                
                <div class="form-group">
                    <label for="taskTitle">Task Title *</label>
                    <input type="text" id="taskTitle" required value="${isEdit ? Utils.escapeHtml(taskToEdit.title) : ''}" placeholder="Enter task title">
                </div>
                
                <div class="form-group">
                    <label for="taskDescription">Description</label>
                    <textarea id="taskDescription" rows="3" placeholder="Add details about the task">${isEdit ? Utils.escapeHtml(taskToEdit.description) : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="taskPriority">Priority</label>
                    <select id="taskPriority">
                        <option value="low" ${isEdit && taskToEdit.priority === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${isEdit && taskToEdit.priority === 'medium' ? 'selected' : 'selected'}>Medium</option>
                        <option value="high" ${isEdit && taskToEdit.priority === 'high' ? 'selected' : ''}>High</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="taskCategory">Category</label>
                    <select id="taskCategory">
                        <option value="design" ${isEdit && taskToEdit.category === 'design' ? 'selected' : ''}>Design</option>
                        <option value="development" ${isEdit && taskToEdit.category === 'development' ? 'selected' : 'selected'}>Development</option>
                        <option value="testing" ${isEdit && taskToEdit.category === 'testing' ? 'selected' : ''}>Testing</option>
                        <option value="documentation" ${isEdit && taskToEdit.category === 'documentation' ? 'selected' : ''}>Documentation</option>
                        <option value="other" ${isEdit && taskToEdit.category === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="taskDueDate">Due Date</label>
                    <input type="date" id="taskDueDate" value="${isEdit && taskToEdit.dueDate ? taskToEdit.dueDate : ''}">
                </div>
                
                <div class="form-group">
                    <label for="taskTags">Tags (comma-separated)</label>
                    <input type="text" id="taskTags" placeholder="e.g., gameplay, ui, multiplayer" value="${isEdit && taskToEdit.tags ? taskToEdit.tags.join(', ') : ''}">
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Task</button>
                </div>
            </form>
        `;
        
        Modal.open(formHtml);
        
        // Form submission
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const taskData = {
                id: isEdit ? taskToEdit.id : Utils.generateId(),
                title: document.getElementById('taskTitle').value.trim(),
                description: document.getElementById('taskDescription').value.trim(),
                priority: document.getElementById('taskPriority').value,
                category: document.getElementById('taskCategory').value,
                dueDate: document.getElementById('taskDueDate').value,
                tags: document.getElementById('taskTags').value.split(',').map(t => t.trim()).filter(t => t),
                completed: isEdit ? taskToEdit.completed : false,
                createdAt: isEdit ? taskToEdit.createdAt : new Date().toISOString()
            };
            
            if (isEdit) {
                const index = AppState.tasks.findIndex(t => t.id === taskToEdit.id);
                AppState.tasks[index] = taskData;
            } else {
                AppState.tasks.push(taskData);
            }
            
            AppState.save();
            this.render();
            Dashboard.refresh();
            Modal.close();
        });
        
        // Cancel button
        document.getElementById('cancelBtn').addEventListener('click', () => Modal.close());
    },
    
    toggleComplete(taskId) {
        const task = AppState.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            AppState.save();
            this.render();
            Dashboard.refresh();
        }
    },
    
    deleteTask(taskId) {
        Utils.showConfirm('Are you sure you want to delete this task?', () => {
            AppState.tasks = AppState.tasks.filter(t => t.id !== taskId);
            AppState.save();
            this.render();
            Dashboard.refresh();
        });
    },
    
    render() {
        const container = document.getElementById('tasksList');
        let tasksToShow = [...AppState.tasks];
        
        // Apply filter
        if (this.currentFilter === 'active') {
            tasksToShow = tasksToShow.filter(t => !t.completed);
        } else if (this.currentFilter === 'completed') {
            tasksToShow = tasksToShow.filter(t => t.completed);
        }
        
        // Apply sorting
        tasksToShow.sort((a, b) => {
            let comparison = 0;
            if (this.sortBy === 'priority') {
                const priorities = { high: 3, medium: 2, low: 1 };
                comparison = (priorities[b.priority] || 0) - (priorities[a.priority] || 0);
            } else if (this.sortBy === 'dueDate') {
                const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                comparison = dateA - dateB;
            } else if (this.sortBy === 'title') {
                comparison = a.title.localeCompare(b.title);
            } else {
                comparison = new Date(b.createdAt) - new Date(a.createdAt);
            }
            return this.sortOrder === 'asc' ? -comparison : comparison;
        });
        
        if (tasksToShow.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = tasksToShow.map(task => {
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
            return `
            <div class="item-card ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}">
                <input type="checkbox" 
                       class="item-checkbox" 
                       ${task.completed ? 'checked' : ''}
                       onchange="TaskManager.toggleComplete('${task.id}')"
                       aria-label="Mark task as ${task.completed ? 'incomplete' : 'complete'}">
                
                <div class="item-content">
                    <div class="item-title">${Utils.escapeHtml(task.title)}</div>
                    ${task.description ? `<div class="item-description">${Utils.escapeHtml(task.description)}</div>` : ''}
                    <div class="item-meta">
                        <span class="item-tag priority-${task.priority}">${task.priority} priority</span>
                        ${task.category ? `<span class="item-tag">${task.category}</span>` : ''}
                        ${task.dueDate ? `<span class="item-tag ${isOverdue ? 'overdue-tag' : ''}">${isOverdue ? Utils.icon('actions/warning', 'small') + ' ' : Utils.icon('misc/calendar', 'small') + ' '}${Utils.formatDate(task.dueDate)}</span>` : ''}
                        ${task.tags && task.tags.length > 0 ? task.tags.map(tag => `<span class="item-tag tag-badge">#${tag}</span>`).join('') : ''}
                    </div>
                </div>
                
                <div class="item-actions">
                    <button class="btn btn-small btn-secondary" onclick="TaskManager.openAddModal(AppState.tasks.find(t => t.id === '${task.id}'))">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="TaskManager.deleteTask('${task.id}')">Delete</button>
                </div>
            </div>
        `}).join('');
    }
};

// ============================================
// Asset Tracker
// ============================================
// Manages game assets (graphics, audio, code, data files, etc)
// Tracks asset types, completion status, file paths, and related items
// Provides organization by category and progress visualization
// Supports asset export and bulk operations
const AssetTracker = {
    currentFilter: 'all',   // Filter by asset type or status
    filesToRemove: [],      // Queue of files to remove
    selectedFiles: [],      // Currently selected assets
    
    /**
     * Initializes asset tracker
     * Attaches event listeners to asset management buttons and filters
     */
    init() {
        document.getElementById('addAssetBtn').addEventListener('click', () => this.openAddModal());
        document.getElementById('exportAssetsBtn').addEventListener('click', () => this.openExportModal());
        
        // Filter buttons
        document.querySelectorAll('#assets .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#assets .filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.getAttribute('data-filter');
                this.render();
            });
        });
        
        this.render();
    },
    
    renderLinkSelector(items, type, label, relatedItems = []) {
        if (items.length === 0) return '';
        
        const linkedIds = relatedItems ? relatedItems.filter(l => l.type === type).map(l => l.id) : [];
        
        return `
            <div class="link-section">
                <label>${label}</label>
                <div class="checkbox-group">
                    ${items.map(item => `
                        <label class="checkbox-label">
                            <input type="checkbox" name="linked_${type}" value="${item.id}" 
                                ${linkedIds.includes(item.id) ? 'checked' : ''}>
                            <span>${Utils.escapeHtml(item.name || item.title)}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    },
    
    updateSelectedFilesDisplay() {
        const container = document.getElementById('selectedFilesContainer');
        if (!container) return;
        
        if (this.selectedFiles.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = `
            <div class="current-files">
                <strong>Selected files (${this.selectedFiles.length}):</strong>
                <ul class="file-list">
                    ${this.selectedFiles.map((file, idx) => `
                        <li>
                            <span>${file.name} (${FileStorage.formatFileSize(file.size)})</span>
                            <button type="button" class="btn-remove-selected-file" data-file-index="${idx}">✕</button>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
        
        // Add remove handlers for selected files
        container.querySelectorAll('.btn-remove-selected-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fileIndex = parseInt(e.target.getAttribute('data-file-index'));
                this.selectedFiles.splice(fileIndex, 1);
                this.updateSelectedFilesDisplay();
            });
        });
    },
    
    openAddModal(assetToEdit = null) {
        const isEdit = assetToEdit !== null;
        
        // Get all available items for linking
        const characters = AppState.story?.characters || [];
        const locations = AppState.story?.locations || [];
        const items = AppState.story?.items || [];
        const quests = AppState.story?.quests || [];
        
        const formHtml = `
            <form class="modal-form" id="assetForm">
                <h3>${isEdit ? 'Edit Asset' : 'Add New Asset'}</h3>
                
                <div class="form-group">
                    <label for="assetName">Asset Name *</label>
                    <input type="text" id="assetName" required value="${isEdit ? Utils.escapeHtml(assetToEdit.name) : ''}" placeholder="Enter asset name">
                </div>
                
                <div class="form-group">
                    <label for="assetType">Type</label>
                    <select id="assetType">
                        <option value="image" ${isEdit && assetToEdit.type === 'image' ? 'selected' : ''}>Image</option>
                        <option value="audio" ${isEdit && assetToEdit.type === 'audio' ? 'selected' : ''}>Audio</option>
                        <option value="video" ${isEdit && assetToEdit.type === 'video' ? 'selected' : ''}>Video</option>
                        <option value="model" ${isEdit && assetToEdit.type === 'model' ? 'selected' : ''}>3D Model</option>
                        <option value="document" ${isEdit && assetToEdit.type === 'document' ? 'selected' : ''}>Document</option>
                        <option value="script" ${isEdit && assetToEdit.type === 'script' ? 'selected' : ''}>Script</option>
                        <option value="other" ${isEdit && assetToEdit.type === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="assetStatus">Status</label>
                    <select id="assetStatus">
                        <option value="pending" ${isEdit && assetToEdit.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="in-progress" ${isEdit && assetToEdit.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                        <option value="completed" ${isEdit && assetToEdit.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Link to Story Elements</label>
                    <div class="linked-items-section">
                        ${this.renderLinkSelector(characters, 'character', 'Characters', isEdit ? assetToEdit.relatedItems : [])}
                        ${this.renderLinkSelector(locations, 'location', 'Locations', isEdit ? assetToEdit.relatedItems : [])}
                        ${this.renderLinkSelector(items, 'item', 'Items', isEdit ? assetToEdit.relatedItems : [])}
                        ${this.renderLinkSelector(quests, 'quest', 'Quests', isEdit ? assetToEdit.relatedItems : [])}
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="assetFiles">Upload Files (Multiple)</label>
                    <input type="file" id="assetFiles" accept="image/*,audio/*,video/*,.pdf,.txt,.glb,.gltf,.fbx" multiple>
                    <small class="form-hint">Max file size per file: 50MB. You can select multiple files.</small>
                    
                    <div id="selectedFilesContainer" style="margin-top: 12px;"></div>
                    
                    ${isEdit && assetToEdit.files && assetToEdit.files.length > 0 ? `
                        <div class="current-files" style="margin-top: 12px;">
                            <strong>Current files (${assetToEdit.files.length}):</strong>
                            <ul class="file-list" id="currentFilesList">
                                ${assetToEdit.files.map((f, idx) => `
                                    <li data-file-id="${f.id}">
                                        <span>${f.fileName || 'File ' + (idx + 1)} (${FileStorage.formatFileSize(f.fileSize || 0)})</span>
                                        <button type="button" class="btn-remove-file" data-file-id="${f.id}">✕</button>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
                
                <div class="form-group">
                    <label for="assetDescription">Description</label>
                    <textarea id="assetDescription" rows="3" placeholder="Add notes or description">${isEdit && assetToEdit.description ? Utils.escapeHtml(assetToEdit.description) : ''}</textarea>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancelAssetBtn">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Asset</button>
                </div>
            </form>
        `;
        
        Modal.open(formHtml);
        
        // Handle file removal
        this.filesToRemove = [];
        this.selectedFiles = []; // Track newly selected files
        
        // Handle file input change - show selected files
        const fileInput = document.getElementById('assetFiles');
        const selectedFilesContainer = document.getElementById('selectedFilesContainer');
        
        fileInput.addEventListener('change', (e) => {
            const newFiles = Array.from(e.target.files);
            
            // Validate and add files
            for (const file of newFiles) {
                if (file.size > 50 * 1024 * 1024) {
                    Utils.showToast(`File "${file.name}" is too large! Maximum 50MB per file.`, 'error');
                    continue;
                }
                
                // Check if file already added
                if (this.selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                    Utils.showToast(`File "${file.name}" already added.`, 'warning');
                    continue;
                }
                
                this.selectedFiles.push(file);
            }
            
            // Clear file input so same file can be added again if removed
            fileInput.value = '';
            
            // Update display
            this.updateSelectedFilesDisplay();
        });
        
        // Handle removal of existing files
        document.querySelectorAll('.btn-remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fileId = e.target.getAttribute('data-file-id');
                this.filesToRemove.push(fileId);
                e.target.closest('li').remove();
                
                // Update file count
                const currentFilesList = document.getElementById('currentFilesList');
                if (currentFilesList) {
                    const remainingCount = currentFilesList.querySelectorAll('li').length;
                    const countLabel = currentFilesList.previousElementSibling;
                    if (countLabel) {
                        countLabel.textContent = `Current files (${remainingCount}):`;
                    }
                }
            });
        });
        
        document.getElementById('assetForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Use the tracked selected files instead of file input
            const newFiles = this.selectedFiles || [];
            
            // Collect linked items (use relatedItems for consistency with other items)
            const relatedItems = [];
            ['character', 'location', 'item', 'quest'].forEach(type => {
                const checkboxes = document.querySelectorAll(`input[name="linked_${type}"]:checked`);
                checkboxes.forEach(cb => {
                    relatedItems.push({ id: cb.value, type: type });
                });
            });
            
            // Start with existing files if editing
            let existingFiles = isEdit && assetToEdit.files ? [...assetToEdit.files] : [];
            
            // Remove files marked for deletion
            existingFiles = existingFiles.filter(f => !this.filesToRemove.includes(f.id));
            
            const assetData = {
                id: isEdit ? assetToEdit.id : Utils.generateId(),
                name: document.getElementById('assetName').value.trim(),
                type: document.getElementById('assetType').value,
                status: document.getElementById('assetStatus').value,
                description: document.getElementById('assetDescription').value.trim(),
                relatedItems: relatedItems,  // Changed from linkedItems to relatedItems
                files: existingFiles,
                createdAt: isEdit ? assetToEdit.createdAt : new Date().toISOString()
            };
            
            try {
                // Delete removed files from storage
                for (const fileId of this.filesToRemove) {
                    await FileStorage.deleteFile(fileId);
                }
                
                // Save new files to IndexedDB
                for (const file of newFiles) {
                    const fileId = Utils.generateId();
                    await FileStorage.saveFile(fileId, file);
                    
                    const fileData = {
                        id: fileId,
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size,
                        uploadedAt: new Date().toISOString()
                    };
                    
                    // Generate thumbnail for first image
                    if (file.type.startsWith('image/') && !assetData.files.some(f => f.thumbnail)) {
                        fileData.thumbnail = await FileStorage.createThumbnail(file);
                    }
                    
                    assetData.files.push(fileData);
                }
                
                // Sync bidirectional relationships
                const oldRelatedItems = isEdit ? (assetToEdit.relatedItems || []) : [];
                RelationshipManager.syncRelationships(
                    { id: assetData.id, type: 'asset', name: assetData.name },
                    oldRelatedItems,
                    relatedItems
                );
                
                if (isEdit) {
                    const index = AppState.assets.findIndex(a => a.id === assetToEdit.id);
                    AppState.assets[index] = assetData;
                } else {
                    AppState.assets.push(assetData);
                }
                
                AppState.save();
                this.render();
                Dashboard.refresh();
                Modal.close();
                
                NotesManager.showNotification(isEdit ? 'Asset updated!' : 'Asset added!');
            } catch (error) {
                console.error('Error saving asset:', error);
                Utils.showToast('Error saving file. Please try again.', 'error');
            }
        });
        
        document.getElementById('cancelAssetBtn').addEventListener('click', () => Modal.close());
    },
    
    async deleteAsset(assetId) {
        const asset = AppState.assets.find(a => a.id === assetId);
        const fileCount = asset && asset.files ? asset.files.length : (asset && asset.hasFile ? 1 : 0);
        
        Utils.showConfirm(`Are you sure you want to delete this asset? This will also delete ${fileCount > 0 ? fileCount + ' file(s)' : 'any uploaded files'}.`, async () => {
            // Delete all files from IndexedDB
            try {
                if (asset && asset.files) {
                    for (const file of asset.files) {
                        await FileStorage.deleteFile(file.id);
                    }
                } else if (asset && asset.hasFile) {
                    // Legacy single file support
                    await FileStorage.deleteFile(assetId);
                }
            } catch (error) {
                console.error('Error deleting files:', error);
            }
            
            // Delete asset from state
            AppState.assets = AppState.assets.filter(a => a.id !== assetId);
            AppState.save();
            this.render();
            Dashboard.refresh();
        });
    },
    
    async downloadAllFiles(assetId) {
        const asset = AppState.assets.find(a => a.id === assetId);
        if (!asset || !asset.files || asset.files.length === 0) return;
        
        try {
            for (const fileData of asset.files) {
                const storedFile = await FileStorage.getFile(fileData.id);
                if (storedFile) {
                    const url = URL.createObjectURL(storedFile.file);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileData.fileName;
                    a.click();
                    URL.revokeObjectURL(url);
                    
                    // Small delay between downloads
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            Utils.showToast(`Downloaded ${asset.files.length} file(s)`, 'success');
        } catch (error) {
            console.error('Error downloading files:', error);
            Utils.showToast('Error downloading files', 'error');
        }
    },
    
    openExportModal() {
        const characters = AppState.story?.characters || [];
        const locations = AppState.story?.locations || [];
        const items = AppState.story?.items || [];
        const quests = AppState.story?.quests || [];
        
        const formHtml = `
            <div class="modal-form">
                <h3>Export Assets</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">Choose how you'd like to export your assets:</p>
                
                <div class="form-group">
                    <label>Export Options</label>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <button class="btn btn-primary" id="exportAllAssetsBtn" style="width: 100%;">
                            Export All Assets
                        </button>
                        
                        <button class="btn btn-secondary" id="exportByTypeBtn" style="width: 100%;">
                            Export by Asset Type
                        </button>
                        
                        <button class="btn btn-secondary" id="exportByStoryElementBtn" style="width: 100%;">
                            Export by Story Element
                        </button>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancelExportBtn">Cancel</button>
                </div>
            </div>
        `;
        
        Modal.open(formHtml);
        
        document.getElementById('exportAllAssetsBtn').addEventListener('click', () => {
            Modal.close();
            this.exportAllAssets();
        });
        
        document.getElementById('exportByTypeBtn').addEventListener('click', () => {
            Modal.close();
            this.openExportByTypeModal();
        });
        
        document.getElementById('exportByStoryElementBtn').addEventListener('click', () => {
            Modal.close();
            this.openExportByStoryElementModal();
        });
        
        document.getElementById('cancelExportBtn').addEventListener('click', () => Modal.close());
    },
    
    async exportAllAssets() {
        const assets = AppState.assets;
        if (assets.length === 0) {
            Utils.showToast('No assets to export', 'warning');
            return;
        }
        
        let totalFiles = 0;
        for (const asset of assets) {
            if (asset.files && asset.files.length > 0) {
                for (const fileData of asset.files) {
                    const storedFile = await FileStorage.getFile(fileData.id);
                    if (storedFile) {
                        const url = URL.createObjectURL(storedFile.file);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${asset.name}_${fileData.fileName}`;
                        a.click();
                        URL.revokeObjectURL(url);
                        totalFiles++;
                        await new Promise(resolve => setTimeout(resolve, 150));
                    }
                }
            }
        }
        
        Utils.showToast(`Exported ${totalFiles} file(s) from ${assets.length} asset(s)`, 'success');
    },
    
    openExportByTypeModal() {
        const types = ['image', 'audio', 'video', 'model', 'document', 'script', 'other'];
        
        const formHtml = `
            <div class="modal-form">
                <h3>Export by Asset Type</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">Select asset types to export:</p>
                
                <div class="form-group">
                    <div class="checkbox-group">
                        ${types.map(type => {
                            const count = AppState.assets.filter(a => a.type === type).length;
                            return `
                                <label class="checkbox-label">
                                    <input type="checkbox" name="export_type" value="${type}" ${count > 0 ? '' : 'disabled'}>
                                    <span>${type.charAt(0).toUpperCase() + type.slice(1)} (${count})</span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancelExportBtn">Cancel</button>
                    <button type="button" class="btn btn-primary" id="confirmExportBtn">Export Selected</button>
                </div>
            </div>
        `;
        
        Modal.open(formHtml);
        
        document.getElementById('confirmExportBtn').addEventListener('click', async () => {
            const selectedTypes = Array.from(document.querySelectorAll('input[name="export_type"]:checked'))
                .map(cb => cb.value);
            
            if (selectedTypes.length === 0) {
                Utils.showToast('Please select at least one type', 'warning');
                return;
            }
            
            Modal.close();
            await this.exportAssetsByType(selectedTypes);
        });
        
        document.getElementById('cancelExportBtn').addEventListener('click', () => Modal.close());
    },
    
    async exportAssetsByType(types) {
        const assets = AppState.assets.filter(a => types.includes(a.type));
        
        let totalFiles = 0;
        for (const asset of assets) {
            if (asset.files && asset.files.length > 0) {
                for (const fileData of asset.files) {
                    const storedFile = await FileStorage.getFile(fileData.id);
                    if (storedFile) {
                        const url = URL.createObjectURL(storedFile.file);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${asset.type}_${asset.name}_${fileData.fileName}`;
                        a.click();
                        URL.revokeObjectURL(url);
                        totalFiles++;
                        await new Promise(resolve => setTimeout(resolve, 150));
                    }
                }
            }
        }
        
        Utils.showToast(`Exported ${totalFiles} file(s) from ${assets.length} asset(s)`, 'success');
    },
    
    openExportByStoryElementModal() {
        const characters = AppState.story?.characters || [];
        const locations = AppState.story?.locations || [];
        const items = AppState.story?.items || [];
        const quests = AppState.story?.quests || [];
        
        const formHtml = `
            <div class="modal-form">
                <h3>Export by Story Element</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">Select story elements to export their linked assets:</p>
                
                <div class="form-group">
                    <div class="linked-items-section" style="max-height: 400px; overflow-y: auto;">
                        ${characters.length > 0 ? `
                            <div class="link-section">
                                <h5>👤 Characters</h5>
                                <div class="checkbox-group">
                                    ${characters.map(char => {
                                        const assetCount = AppState.assets.filter(a => 
                                            a.relatedItems && a.relatedItems.some(l => l.type === 'character' && l.id === char.id)
                                        ).length;
                                        return `
                                            <label class="checkbox-label">
                                                <input type="checkbox" name="export_element" value="character:${char.id}" ${assetCount > 0 ? '' : 'disabled'}>
                                                <span>${Utils.escapeHtml(char.name)} (${assetCount} asset${assetCount !== 1 ? 's' : ''})</span>
                                            </label>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${locations.length > 0 ? `
                            <div class="link-section">
                                <h5>📍 Locations</h5>
                                <div class="checkbox-group">
                                    ${locations.map(loc => {
                                        const assetCount = AppState.assets.filter(a => 
                                            a.relatedItems && a.relatedItems.some(l => l.type === 'location' && l.id === loc.id)
                                        ).length;
                                        return `
                                            <label class="checkbox-label">
                                                <input type="checkbox" name="export_element" value="location:${loc.id}" ${assetCount > 0 ? '' : 'disabled'}>
                                                <span>${Utils.escapeHtml(loc.name)} (${assetCount} asset${assetCount !== 1 ? 's' : ''})</span>
                                            </label>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${items.length > 0 ? `
                            <div class="link-section">
                                <h5>📦 Items</h5>
                                <div class="checkbox-group">
                                    ${items.map(item => {
                                        const assetCount = AppState.assets.filter(a => 
                                            a.relatedItems && a.relatedItems.some(l => l.type === 'item' && l.id === item.id)
                                        ).length;
                                        return `
                                            <label class="checkbox-label">
                                                <input type="checkbox" name="export_element" value="item:${item.id}" ${assetCount > 0 ? '' : 'disabled'}>
                                                <span>${Utils.escapeHtml(item.name)} (${assetCount} asset${assetCount !== 1 ? 's' : ''})</span>
                                            </label>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${quests.length > 0 ? `
                            <div class="link-section">
                                <h5>🎯 Quests</h5>
                                <div class="checkbox-group">
                                    ${quests.map(quest => {
                                        const assetCount = AppState.assets.filter(a => 
                                            a.relatedItems && a.relatedItems.some(l => l.type === 'quest' && l.id === quest.id)
                                        ).length;
                                        return `
                                            <label class="checkbox-label">
                                                <input type="checkbox" name="export_element" value="quest:${quest.id}" ${assetCount > 0 ? '' : 'disabled'}>
                                                <span>${Utils.escapeHtml(quest.title)} (${assetCount} asset${assetCount !== 1 ? 's' : ''})</span>
                                            </label>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancelExportBtn">Cancel</button>
                    <button type="button" class="btn btn-primary" id="confirmExportBtn">Export Selected</button>
                </div>
            </div>
        `;
        
        Modal.open(formHtml);
        
        document.getElementById('confirmExportBtn').addEventListener('click', async () => {
            const selectedElements = Array.from(document.querySelectorAll('input[name="export_element"]:checked'))
                .map(cb => cb.value);
            
            if (selectedElements.length === 0) {
                Utils.showToast('Please select at least one story element', 'warning');
                return;
            }
            
            Modal.close();
            await this.exportAssetsByStoryElements(selectedElements);
        });
        
        document.getElementById('cancelExportBtn').addEventListener('click', () => Modal.close());
    },
    
    async exportAssetsByStoryElements(elements) {
        const elementMap = {};
        
        // Parse selections
        elements.forEach(elem => {
            const [type, id] = elem.split(':');
            if (!elementMap[type]) elementMap[type] = [];
            elementMap[type].push(id);
        });
        
        // Find matching assets
        const matchingAssets = AppState.assets.filter(asset => {
            if (!asset.relatedItems) return false;
            return asset.relatedItems.some(link => {
                return elementMap[link.type] && elementMap[link.type].includes(link.id);
            });
        });
        
        if (matchingAssets.length === 0) {
            Utils.showToast('No assets found for selected story elements', 'warning');
            return;
        }
        
        let totalFiles = 0;
        for (const asset of matchingAssets) {
            if (asset.files && asset.files.length > 0) {
                for (const fileData of asset.files) {
                    const storedFile = await FileStorage.getFile(fileData.id);
                    if (storedFile) {
                        const url = URL.createObjectURL(storedFile.file);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${asset.name}_${fileData.fileName}`;
                        a.click();
                        URL.revokeObjectURL(url);
                        totalFiles++;
                        await new Promise(resolve => setTimeout(resolve, 150));
                    }
                }
            }
        }
        
        Utils.showToast(`Exported ${totalFiles} file(s) from ${matchingAssets.length} asset(s)`, 'success');
    },
    
    render() {
        const container = document.getElementById('assetsList');
        let assetsToShow = AppState.assets;
        
        // Apply filter
        if (this.currentFilter !== 'all') {
            assetsToShow = assetsToShow.filter(a => a.type === this.currentFilter);
        }
        
        if (assetsToShow.length === 0) {
            container.innerHTML = '<div class="empty-state">No assets yet. Add your first asset!</div>';
            return;
        }
        
        const typeIcons = {
            image: Utils.icon('asset/sprite', 'large'),
            audio: Utils.icon('asset/audio', 'large'),
            video: Utils.icon('asset/video', 'large'),
            model: Utils.icon('asset/model', 'large'),
            document: Utils.icon('asset/file', 'large'),
            script: Utils.icon('asset/file', 'large'),
            other: Utils.icon('asset/file', 'large')
        };
        
        container.innerHTML = assetsToShow.map(asset => {
            // Get thumbnail - use first file's thumbnail or legacy thumbnail
            const thumbnail = asset.files && asset.files.length > 0 && asset.files[0].thumbnail
                ? asset.files[0].thumbnail
                : asset.thumbnail;
            
            const fileCount = asset.files ? asset.files.length : (asset.hasFile ? 1 : 0);
            const totalSize = asset.files 
                ? asset.files.reduce((sum, f) => sum + (f.fileSize || 0), 0)
                : (asset.fileSize || 0);
            
            // Get linked items summary (resolve items so we can show proper icons)
            const linkedSummary = asset.relatedItems && asset.relatedItems.length > 0
                ? asset.relatedItems.map(link => {
                    const item = RelationshipManager.findItem(link.id, link.type);
                    if (item) {
                        return item.icon || (link.type === 'character' ? '👤' : 
                                             link.type === 'location' ? '📍' : 
                                             link.type === 'item' ? '📦' :
                                             link.type === 'quest' ? '🎯' : '🔗');
                    }
                    // fallback if item can't be resolved
                    return link.type === 'character' ? '👤' : 
                           link.type === 'location' ? '📍' : 
                           link.type === 'item' ? '📦' :
                           link.type === 'quest' ? '🎯' : '🔗';
                }).join(' ')
                : '';
            
            return `
                <div class="item-card asset-card">
                    ${thumbnail ? `
                        <div class="asset-thumbnail" onclick="AssetTracker.previewAsset('${asset.id}')">
                            <img src="${thumbnail}" alt="${Utils.escapeHtml(asset.name)}">
                            ${fileCount > 1 ? `<div class="file-count-badge">${fileCount} files</div>` : ''}
                        </div>
                    ` : `
                        <div class="asset-icon" onclick="${fileCount > 0 ? `AssetTracker.previewAsset('${asset.id}')` : ''}">${typeIcons[asset.type] || Utils.icon('misc/package', 'small')}</div>
                    `}
                    
                    <div class="item-content">
                        <div class="item-title">${Utils.escapeHtml(asset.name)}</div>
                        ${asset.description ? `<div class="item-description">${Utils.escapeHtml(asset.description)}</div>` : ''}
                        ${linkedSummary ? `<div class="linked-items-badge">Linked to: ${linkedSummary}</div>` : ''}
                        <div class="item-meta">
                            <span class="item-tag status-${asset.status}">${asset.status}</span>
                            <span class="item-tag">${asset.type}</span>
                            ${totalSize > 0 ? `<span class="item-tag">${Utils.icon('asset/file', 'small')} ${FileStorage.formatFileSize(totalSize)}</span>` : ''}
                            ${fileCount > 0 ? `<span class="item-tag">${fileCount} file${fileCount > 1 ? 's' : ''}</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="item-actions">
                        ${fileCount > 0 ? `<button class="btn btn-small btn-success" onclick="AssetTracker.previewAsset('${asset.id}')" title="Preview/Play">${Utils.icon('status/review', 'small')} View</button>` : ''}
                        ${fileCount > 0 ? `<button class="btn btn-small btn-secondary" onclick="AssetTracker.downloadAllFiles('${asset.id}')" title="Download All">${Utils.icon('actions/download', 'small')}</button>` : ''}
                        <button class="btn btn-small btn-secondary" onclick="AssetTracker.openAddModal(AppState.assets.find(a => a.id === '${asset.id}'))">Edit</button>
                        <button class="btn btn-small btn-danger" onclick="AssetTracker.deleteAsset('${asset.id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    async previewAsset(assetId) {
        const asset = AppState.assets.find(a => a.id === assetId);
        
        // Handle both new multi-file format and legacy single-file format
        const hasFiles = asset && asset.files && asset.files.length > 0;
        const hasLegacyFile = asset && asset.hasFile;
        
        if (!hasFiles && !hasLegacyFile) {
            Utils.showNotification('No files to preview', 'info');
            return;
        }
        
        try {
            const fileURLs = [];
            let previewHtml = '';
            
            // Multi-file asset
            if (hasFiles) {
                previewHtml = `
                    <div class="preview-container">
                        <h3>${Utils.escapeHtml(asset.name)}</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 1rem;">${asset.files.length} file(s)</p>
                        <div class="file-gallery" style="display: flex; flex-direction: column; gap: 1.5rem; max-height: 70vh; overflow-y: auto;">
                `;
                
                for (const fileData of asset.files) {
                    const storedFile = await FileStorage.getFile(fileData.id);
                    if (!storedFile) {
                        console.warn('File not found in storage:', fileData.id, fileData.fileName);
                        continue;
                    }
                    
                    const file = storedFile.file;
                    const fileURL = URL.createObjectURL(file);
                    fileURLs.push(fileURL);
                    
                    previewHtml += `
                        <div class="gallery-item" style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
                            <h4 style="margin: 0 0 0.75rem 0; color: var(--text-primary);">${Utils.escapeHtml(fileData.fileName)}</h4>
                    `;
                    
                    // Generate preview based on file type
                    if (file.type.startsWith('image/')) {
                        previewHtml += `
                            <div class="image-preview" style="text-align: center;">
                                <img src="${fileURL}" alt="${Utils.escapeHtml(fileData.fileName)}" style="max-width: 100%; max-height: 400px; border-radius: 4px;">
                            </div>
                        `;
                    } else if (file.type.startsWith('audio/')) {
                        previewHtml += `
                            <div class="audio-preview">
                                <audio controls style="width: 100%;">
                                    <source src="${fileURL}" type="${file.type}">
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                        `;
                    } else if (file.type.startsWith('video/')) {
                        previewHtml += `
                            <div class="video-preview" style="text-align: center;">
                                <video controls style="max-width: 100%; max-height: 400px; border-radius: 4px;">
                                    <source src="${fileURL}" type="${file.type}">
                                    Your browser does not support the video element.
                                </video>
                            </div>
                        `;
                    } else if (file.type === 'application/pdf') {
                        previewHtml += `
                            <div class="pdf-preview">
                                <iframe src="${fileURL}" style="width: 100%; height: 400px; border: none; border-radius: 4px;"></iframe>
                            </div>
                        `;
                    } else if (this.isTextDocument(file.type, fileData.fileName)) {
                        // Text-based documents and scripts for multi-file assets
                        const reader = new FileReader();
                        const textContent = await new Promise((resolve) => {
                            reader.onload = (e) => resolve(e.target.result);
                            reader.onerror = () => resolve(null);
                            reader.readAsText(file);
                        });
                        
                        if (textContent) {
                            const extension = fileData.fileName.split('.').pop().toLowerCase();
                            const language = this.getLanguageForFile(extension);
                            
                            previewHtml += `
                                <div class="document-preview" style="max-height: 400px; overflow: auto;">
                                    <pre style="background: var(--bg-tertiary); padding: 1rem; border-radius: 4px; margin: 0; font-family: 'Courier New', monospace; line-height: 1.5; font-size: 0.85rem;"><code class="language-${language}">${Utils.escapeHtml(textContent)}</code></pre>
                                </div>
                                <div class="preview-info" style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);">
                                    <p><strong>Lines:</strong> ${textContent.split('\n').length}</p>
                                </div>
                            `;
                        } else {
                            previewHtml += `
                                <div class="file-info">
                                    <p style="color: var(--text-secondary);">Could not read file contents.</p>
                                </div>
                            `;
                        }
                    } else {
                        previewHtml += `
                            <div class="file-info">
                                <p style="color: var(--text-secondary);">Preview not available for this file type.</p>
                            </div>
                        `;
                    }
                    
                    previewHtml += `
                            <div class="preview-info" style="margin-top: 0.75rem; font-size: 0.85rem; color: var(--text-secondary);">
                                <p><strong>Type:</strong> ${file.type || 'Unknown'}</p>
                                <p><strong>Size:</strong> ${FileStorage.formatFileSize(file.size)}</p>
                            </div>
                        </div>
                    `;
                }
                
                previewHtml += `
                        </div>
                    </div>
                `;
            }
            // Legacy single-file asset
            else if (hasLegacyFile) {
                const fileData = await FileStorage.getFile(assetId);
                if (!fileData) {
                    Utils.showToast('File not found', 'error');
                    return;
                }
                
                const file = fileData.file;
                const fileURL = URL.createObjectURL(file);
                fileURLs.push(fileURL);
                
                // Generate preview based on file type
                if (file.type.startsWith('image/')) {
                    previewHtml = `
                        <div class="preview-container">
                            <h3>${Utils.escapeHtml(asset.name)}</h3>
                            <div class="image-preview">
                                <img src="${fileURL}" alt="${Utils.escapeHtml(asset.name)}" style="max-width: 100%; max-height: 70vh;">
                            </div>
                            <div class="preview-info">
                                <p><strong>Type:</strong> ${file.type}</p>
                                <p><strong>Size:</strong> ${FileStorage.formatFileSize(file.size)}</p>
                            </div>
                        </div>
                    `;
                } else if (file.type.startsWith('audio/')) {
                    previewHtml = `
                        <div class="preview-container">
                            <h3>${Utils.icon('misc/music-note', 'small')} ${Utils.escapeHtml(asset.name)}</h3>
                            <div class="audio-preview">
                                <audio controls autoplay style="width: 100%; margin: 2rem 0;">
                                    <source src="${fileURL}" type="${file.type}">
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                            <div class="preview-info">
                                <p><strong>Type:</strong> ${file.type}</p>
                                <p><strong>Size:</strong> ${FileStorage.formatFileSize(file.size)}</p>
                            </div>
                        </div>
                    `;
                } else if (file.type.startsWith('video/')) {
                    previewHtml = `
                        <div class="preview-container">
                            <h3>${Utils.icon('misc/video', 'small')} ${Utils.escapeHtml(asset.name)}</h3>
                            <div class="video-preview">
                                <video controls style="max-width: 100%; max-height: 60vh;">
                                    <source src="${fileURL}" type="${file.type}">
                                    Your browser does not support the video element.
                                </video>
                            </div>
                            <div class="preview-info">
                                <p><strong>Type:</strong> ${file.type}</p>
                                <p><strong>Size:</strong> ${FileStorage.formatFileSize(file.size)}</p>
                            </div>
                        </div>
                    `;
                } else if (file.type === 'application/pdf') {
                    previewHtml = `
                        <div class="preview-container">
                            <h3>${Utils.icon('misc/document', 'small')} ${Utils.escapeHtml(asset.name)}</h3>
                            <div class="pdf-preview">
                                <iframe src="${fileURL}" style="width: 100%; height: 70vh; border: none;"></iframe>
                            </div>
                            <div class="preview-info">
                                <p><strong>Size:</strong> ${FileStorage.formatFileSize(file.size)}</p>
                            </div>
                        </div>
                    `;
                } else if (this.isTextDocument(file.type, asset.fileName)) {
                    // Text-based documents and scripts
                    const reader = new FileReader();
                    await new Promise((resolve) => {
                        reader.onload = async (e) => {
                            const content = e.target.result;
                            const extension = asset.fileName.split('.').pop().toLowerCase();
                            const language = this.getLanguageForFile(extension);
                            
                            previewHtml = `
                                <div class="preview-container">
                                    <h3>${Utils.icon('misc/document', 'small')} ${Utils.escapeHtml(asset.name)}</h3>
                                    <div class="document-preview-controls">
                                        <button class="zoom-btn" onclick="AssetTracker.zoomDocument(-0.1)" title="Zoom Out">
                                            <img src="icons/actions/zoom-out.svg" alt="Zoom Out" width="20" height="20">
                                        </button>
                                        <span class="zoom-level">100%</span>
                                        <button class="zoom-btn" onclick="AssetTracker.zoomDocument(0.1)" title="Zoom In">
                                            <img src="icons/actions/zoom-in.svg" alt="Zoom In" width="20" height="20">
                                        </button>
                                        <button class="zoom-btn" onclick="AssetTracker.resetZoom()" title="Reset Zoom">
                                            <img src="icons/actions/reset.svg" alt="Reset" width="20" height="20">
                                        </button>
                                    </div>
                                    <div class="document-preview" id="documentPreview">
                                        <pre style="background: var(--bg-secondary); padding: 1.5rem; border-radius: 8px; overflow: auto; max-height: 60vh; font-family: 'Courier New', monospace; line-height: 1.5; transition: font-size 0.2s ease;" id="documentPreviewContent"><code class="language-${language}">${Utils.escapeHtml(content)}</code></pre>
                                    </div>
                                    <div class="preview-info">
                                        <p><strong>Type:</strong> ${extension.toUpperCase()} ${language ? `(${language})` : ''}</p>
                                        <p><strong>Size:</strong> ${FileStorage.formatFileSize(file.size)}</p>
                                        <p><strong>Lines:</strong> ${content.split('\n').length}</p>
                                    </div>
                                </div>
                            `;
                            resolve();
                        };
                        reader.readAsText(file);
                    });
                } else {
                    previewHtml = `
                        <div class="preview-container">
                            <h3>${Utils.icon('misc/package', 'small')} ${Utils.escapeHtml(asset.name)}</h3>
                            <div class="file-info">
                                <p>Preview not available for this file type.</p>
                                <p><strong>Type:</strong> ${file.type || 'Unknown'}</p>
                                <p><strong>Size:</strong> ${FileStorage.formatFileSize(file.size)}</p>
                                <button class="btn btn-primary" onclick="AssetTracker.downloadAsset('${assetId}')">${Utils.icon('actions/download', 'small')} Download File</button>
                            </div>
                        </div>
                    `;
                }
            }
            
            Modal.open(previewHtml);
            
            // Cleanup URLs when modal closes
            const originalClose = Modal.close.bind(Modal);
            Modal.close = function() {
                try {
                    fileURLs.forEach(url => URL.revokeObjectURL(url));
                } catch (e) {
                    console.error('Error revoking URLs:', e);
                } finally {
                    // Always restore original close function
                    Modal.close = originalClose;
                    originalClose();
                }
            };
            
        } catch (error) {
            console.error('Error previewing asset:', error);
            Utils.showNotification('Error loading file preview: ' + error.message, 'error');
        }
    },
    
    isTextDocument(mimeType, fileName) {
        if (!fileName) return false;
        const extension = fileName.split('.').pop().toLowerCase();
        const textExtensions = [
            'txt', 'md', 'json', 'xml', 'csv', 'log',
            'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'sass',
            'c', 'cpp', 'h', 'hpp', 'cs', 'java', 'py', 'rb', 'php',
            'go', 'rs', 'rust', 'swift', 'kt', 'sh', 'bat', 'ps1', 'cmd',
            'sql', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf',
            'gd', 'gdscript', 'lua', 'pl', 'r', 'dart', 'vim', 'vue',
            'asm', 's', 'makefile', 'dockerfile', 'gitignore'
        ];
        return textExtensions.includes(extension) || 
               mimeType?.startsWith('text/') || 
               mimeType === 'application/json' ||
               mimeType === 'application/xml';
    },
    
    getLanguageForFile(extension) {
        const languageMap = {
            'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
            'html': 'html', 'htm': 'html', 'xml': 'xml',
            'css': 'css', 'scss': 'scss', 'sass': 'sass',
            'json': 'json', 'md': 'markdown',
            'py': 'python', 'rb': 'ruby', 'php': 'php',
            'java': 'java', 'c': 'c', 'cpp': 'cpp', 'cs': 'csharp',
            'go': 'go', 'rs': 'rust', 'rust': 'rust', 'swift': 'swift', 'kt': 'kotlin',
            'sh': 'bash', 'bat': 'batch', 'cmd': 'batch', 'ps1': 'powershell',
            'sql': 'sql', 'yaml': 'yaml', 'yml': 'yaml',
            'gd': 'gdscript', 'gdscript': 'gdscript', 'lua': 'lua',
            'pl': 'perl', 'r': 'r', 'dart': 'dart', 'vue': 'vue',
            'dockerfile': 'dockerfile', 'makefile': 'makefile'
        };
        return languageMap[extension.toLowerCase()] || 'plaintext';
    },
    
    zoomDocument(delta) {
        const preview = document.querySelector('#documentPreviewContent');
        const zoomLevel = document.querySelector('.zoom-level');
        if (!preview || !zoomLevel) return;
        
        // Get current font size or default to 0.9rem (14.4px)
        const currentFontSize = parseFloat(window.getComputedStyle(preview).fontSize);
        const baseFontSize = 14.4; // 0.9rem at 16px base
        
        // Calculate current scale
        const currentScale = currentFontSize / baseFontSize;
        
        // Calculate new scale (min 0.5, max 3.0)
        const newScale = Math.max(0.5, Math.min(3.0, currentScale + delta));
        
        // Apply new font size
        preview.style.fontSize = `${baseFontSize * newScale}px`;
        zoomLevel.textContent = `${Math.round(newScale * 100)}%`;
    },
    
    resetZoom() {
        const preview = document.querySelector('#documentPreviewContent');
        const zoomLevel = document.querySelector('.zoom-level');
        if (!preview || !zoomLevel) return;
        
        preview.style.fontSize = '0.9rem';
        zoomLevel.textContent = '100%';
    },
    
    async downloadAsset(assetId) {
        const asset = AppState.assets.find(a => a.id === assetId);
        if (!asset || !asset.hasFile) return;
        
        try {
            const fileData = await FileStorage.getFile(assetId);
            if (!fileData) {
                alert('File not found');
                return;
            }
            
            const file = fileData.file;
            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.href = url;
            a.download = asset.fileName || asset.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            NotesManager.showNotification('Download started!');
        } catch (error) {
            console.error('Error downloading asset:', error);
            alert('Error downloading file');
        }
    }
};

// ============================================
// Classes Manager
// ============================================
// Manages character and instance class definitions
// Supports two class types: character classes (archetypes) and instance classes (individual instantiations)
// Includes class comparison tool and game balance testing utilities
// Tracks class attributes, skills, and formulas for game mechanics
const ClassesManager = {
    currentFilter: 'all', // Filter: 'all', 'character', 'instance'
    
    /**
     * Initializes classes manager
     * Attaches listeners to add/edit buttons and filtering controls
     * Includes advanced tools like comparison and balance testing
     */
    init() {
        document.getElementById('addClassBtn').addEventListener('click', () => this.openAddModal());
        document.getElementById('compareClassesBtn')?.addEventListener('click', () => this.openComparisonTool());
        document.getElementById('balanceTestBtn')?.addEventListener('click', () => this.openBalanceTester());
        
        // Class type filter listeners
        document.getElementById('classFilterAll')?.addEventListener('click', () => this.setFilter('all'));
        document.getElementById('classFilterCharacter')?.addEventListener('click', () => this.setFilter('character'));
        document.getElementById('classFilterInstance')?.addEventListener('click', () => this.setFilter('instance'));
        
        this.render();
    },
    
    /**
     * Sets the current filter for class display
     * Filters classes by type (character, instance) or shows all
     * @param {string} filterType - Filter type: 'all', 'character', 'instance'
     */
    setFilter(filterType) {
        this.currentFilter = filterType;
        
        // Update button states
        document.querySelectorAll('.class-filter-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`classFilter${filterType.charAt(0).toUpperCase() + filterType.slice(1)}`)?.classList.add('active');
        
        this.render();
    },
    
    getFilteredClasses() {
        if (this.currentFilter === 'all') {
            return AppState.classes;
        }
        return AppState.classes.filter(cls => cls.classType === this.currentFilter);
    },
    
    renderAttributeInputs(attributes) {
        if (!attributes || attributes.length === 0) {
            return `
                <div class="attribute-input">
                    <input type="text" class="attr-name" placeholder="Attribute name (e.g., Strength)" value="">
                    <input type="number" class="attr-value" placeholder="Base value" value="10">
                    <button type="button" class="btn-icon-small remove-item">✕</button>
                </div>
            `;
        }
        return attributes.map(attr => `
            <div class="attribute-input">
                <input type="text" class="attr-name" placeholder="Attribute name" value="${Utils.escapeHtml(attr.name)}">
                <input type="number" class="attr-value" placeholder="Base value" value="${attr.value}">
                <button type="button" class="btn-icon-small remove-item">✕</button>
            </div>
        `).join('');
    },
    
    renderSkillInputs(skills) {
        if (!skills || skills.length === 0) {
            return `
                <div class="skill-input">
                    <input type="text" class="skill-name" placeholder="Skill name" value="">
                    <input type="number" class="skill-level" placeholder="Unlock level" value="1" min="1" title="Level when this skill is unlocked">
                    <input type="number" class="skill-power" placeholder="Power value" value="10" min="0" step="1" title="Power rating for balance testing">
                    <input type="text" class="skill-requires" placeholder="Required skills (comma-separated)" value="">
                    <textarea class="skill-description" placeholder="Description" rows="2"></textarea>
                    <button type="button" class="btn-icon-small remove-item">✕</button>
                </div>
            `;
        }
        return skills.map(skill => `
            <div class="skill-input">
                <input type="text" class="skill-name" placeholder="Skill name" value="${Utils.escapeHtml(skill.name)}">
                <input type="number" class="skill-level" placeholder="Unlock level" value="${skill.unlockLevel || 1}" min="1" title="Level when this skill is unlocked">
                <input type="number" class="skill-power" placeholder="Power value" value="${skill.power || 10}" min="0" step="1" title="Power rating for balance testing">
                <input type="text" class="skill-requires" placeholder="Required skills" value="${skill.requires ? skill.requires.join(', ') : ''}">
                <textarea class="skill-description" placeholder="Description" rows="2">${skill.description ? Utils.escapeHtml(skill.description) : ''}</textarea>
                <button type="button" class="btn-icon-small remove-item">✕</button>
            </div>
        `).join('');
    },
    
    renderFormulaInputs(formulas) {
        if (!formulas || formulas.length === 0) {
            return `
                <div class="formula-input">
                    <input type="text" class="formula-name" placeholder="Stat name (e.g., Max HP)" value="">
                    <input type="text" class="formula-expression" placeholder="Formula (e.g., strength * 10 + level * 5)" value="">
                    <button type="button" class="btn-icon-small remove-item">✕</button>
                </div>
            `;
        }
        return formulas.map(formula => `
            <div class="formula-input">
                <input type="text" class="formula-name" placeholder="Stat name" value="${Utils.escapeHtml(formula.name)}">
                <input type="text" class="formula-expression" placeholder="Formula" value="${Utils.escapeHtml(formula.expression)}">
                <button type="button" class="btn-icon-small remove-item">✕</button>
            </div>
        `).join('');
    },
    
    openAddModal(classToEdit = null) {
        const isEdit = classToEdit !== null;
        
        // Get list of potential parent classes (exclude current class if editing)
        const parentOptions = AppState.classes
            .filter(c => !isEdit || c.id !== classToEdit.id)
            .map(c => `<option value="${c.id}">${Utils.escapeHtml(c.name)}</option>`)
            .join('');
        
        const formHtml = `
            <form class="modal-form" id="classForm" style="max-width: 900px;">
                <h3>${isEdit ? 'Edit Class' : 'Add New Class'}</h3>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="className">Class Name *</label>
                        <input type="text" id="className" required value="${isEdit ? Utils.escapeHtml(classToEdit.name) : ''}" placeholder="e.g., Warrior, Mage">
                    </div>
                    
                    <div class="form-group">
                        <label for="classType">Class Type *</label>
                        <select id="classType" required>
                            <option value="character" ${isEdit && classToEdit.classType === 'character' ? 'selected' : ''}>Character Class (RPG)</option>
                            <option value="instance" ${isEdit && classToEdit.classType === 'instance' ? 'selected' : ''}>Instance Class (OOP)</option>
                        </select>
                        <small class="form-hint">Character: RPG classes (Warrior, Mage). Instance: Object hierarchy (Person, NPC, Enemy)</small>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="classParent">Parent Class</label>
                        <select id="classParent">
                            <option value="">None (Root Class)</option>
                            ${parentOptions}
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="classDescription">Description</label>
                    <textarea id="classDescription" rows="2" placeholder="Describe this class...">${isEdit && classToEdit.description ? Utils.escapeHtml(classToEdit.description) : ''}</textarea>
                </div>
                
                <div class="class-tabs-container">
                    <div class="class-tabs">
                        <button type="button" class="class-tab active" data-tab="attributes">Attributes</button>
                        <button type="button" class="class-tab" data-tab="skills">Skills</button>
                        <button type="button" class="class-tab" data-tab="formulas">Formulas</button>
                        <button type="button" class="class-tab" data-tab="properties">Properties</button>
                    </div>
                    
                    <div class="class-tab-content active" id="attributesTab">
                        <div class="form-group">
                            <label>Base Attributes</label>
                            <div id="attributesList" class="attributes-grid">
                                ${this.renderAttributeInputs(isEdit ? classToEdit.attributes : null)}
                            </div>
                            <button type="button" class="btn btn-small btn-secondary" id="addAttributeBtn">+ Add Attribute</button>
                        </div>
                    </div>
                    
                    <div class="class-tab-content" id="skillsTab">
                        <div class="form-group">
                            <label>Skills & Abilities</label>
                            <div id="skillsList">
                                ${this.renderSkillInputs(isEdit ? classToEdit.skills : null)}
                            </div>
                            <button type="button" class="btn btn-small btn-secondary" id="addSkillBtn">+ Add Skill</button>
                        </div>
                    </div>
                    
                    <div class="class-tab-content" id="formulasTab">
                        <div class="form-group">
                            <label>Derived Stats Formulas</label>
                            <small class="form-hint">Use attribute names in formulas (e.g., strength * 10 + level * 5)</small>
                            <div id="formulasList">
                                ${this.renderFormulaInputs(isEdit ? classToEdit.formulas : null)}
                            </div>
                            <button type="button" class="btn btn-small btn-secondary" id="addFormulaBtn">+ Add Formula</button>
                        </div>
                    </div>
                    
                    <div class="class-tab-content" id="propertiesTab">
                        <div class="form-group">
                            <label for="classProperties">Custom Properties (one per line)</label>
                            <textarea id="classProperties" rows="5" placeholder="health: 100&#10;speed: 5.0&#10;name: string">${isEdit && classToEdit.properties ? classToEdit.properties.join('\n') : ''}</textarea>
                            <small class="form-hint">Format: propertyName: value or propertyName: type</small>
                        </div>
                    </div>
                </div>
                
                <div class="form-group" style="margin-top: 1.5rem;">
                    <button type="button" class="btn btn-secondary" id="manageClassRelations" style="width: 100%;">
                        <img src="icons/misc/link.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Manage Related Items
                    </button>
                    <div id="classRelatedItemsPreview"></div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancelClassBtn">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Class</button>
                </div>
            </form>
        `;
        
        Modal.open(formHtml);
        
        // Set parent if editing
        if (isEdit && classToEdit.parentId) {
            document.getElementById('classParent').value = classToEdit.parentId;
        }
        
        // Tab switching
        document.querySelectorAll('.class-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.class-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.class-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');
            });
        });
        
        // Add attribute button
        document.getElementById('addAttributeBtn').addEventListener('click', () => {
            const attributesList = document.getElementById('attributesList');
            const newAttr = document.createElement('div');
            newAttr.className = 'attribute-input';
            newAttr.innerHTML = `
                <input type="text" class="attr-name" placeholder="Attribute name (e.g., Strength)" value="">
                <input type="number" class="attr-value" placeholder="Base value" value="10">
                <button type="button" class="btn-icon-small remove-item">✕</button>
            `;
            attributesList.appendChild(newAttr);
        });
        
        // Add skill button
        document.getElementById('addSkillBtn').addEventListener('click', () => {
            const skillsList = document.getElementById('skillsList');
            const newSkill = document.createElement('div');
            newSkill.className = 'skill-input';
            newSkill.innerHTML = `
                <input type="text" class="skill-name" placeholder="Skill name" value="">
                <input type="number" class="skill-level" placeholder="Unlock level" value="1" min="1">
                <input type="text" class="skill-requires" placeholder="Required skills (comma-separated)" value="">
                <textarea class="skill-description" placeholder="Description" rows="2"></textarea>
                <button type="button" class="btn-icon-small remove-item">✕</button>
            `;
            skillsList.appendChild(newSkill);
        });
        
        // Add formula button
        document.getElementById('addFormulaBtn').addEventListener('click', () => {
            const formulasList = document.getElementById('formulasList');
            const newFormula = document.createElement('div');
            newFormula.className = 'formula-input';
            newFormula.innerHTML = `
                <input type="text" class="formula-name" placeholder="Stat name (e.g., Max HP)" value="">
                <input type="text" class="formula-expression" placeholder="Formula (e.g., strength * 10)" value="">
                <button type="button" class="btn-icon-small remove-item">✕</button>
            `;
            formulasList.appendChild(newFormula);
        });
        
        // Remove item handlers (delegation)
        document.getElementById('classForm').addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item')) {
                const parent = e.target.closest('.attribute-input, .skill-input, .formula-input');
                if (parent) parent.remove();
            }
        });
        
        // Relationship management
        let tempRelatedItems = isEdit && classToEdit.relatedItems ? [...classToEdit.relatedItems] : [];
        
        // Display existing related items
        const updateRelatedItemsPreview = () => {
            const preview = document.getElementById('classRelatedItemsPreview');
            if (tempRelatedItems.length > 0) {
                preview.innerHTML = `
                    <div style="margin-top: 0.75rem;">
                        <small style="color: var(--text-secondary); font-weight: 600;">Related Items:</small>
                        <div style="margin-top: 0.5rem;">
                            ${Utils.renderConnections(classToEdit)}
                        </div>
                    </div>
                `;
            } else {
                preview.innerHTML = '';
            }
        };
        
        updateRelatedItemsPreview();
        
        document.getElementById('manageClassRelations').addEventListener('click', () => {
            const currentItem = {
                id: isEdit ? classToEdit.id : 'temp-class-' + Date.now(),
                type: 'class',
                name: document.getElementById('className').value.trim() || 'Untitled Class',
                data: { relatedItems: tempRelatedItems }
            };
            
            RelationshipManager.openRelationshipSelector(currentItem, (selectedItems) => {
                tempRelatedItems = selectedItems;
                updateRelatedItemsPreview();
            });
        });
        
        document.getElementById('classForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Collect attributes
            const attributeInputs = document.querySelectorAll('.attribute-input');
            const attributes = Array.from(attributeInputs).map(input => {
                const name = input.querySelector('.attr-name').value.trim();
                const value = parseFloat(input.querySelector('.attr-value').value) || 0;
                return name ? { name, value } : null;
            }).filter(a => a);
            
            // Collect skills
            const skillInputs = document.querySelectorAll('.skill-input');
            const skills = Array.from(skillInputs).map(input => {
                const name = input.querySelector('.skill-name').value.trim();
                const unlockLevel = parseInt(input.querySelector('.skill-level').value) || 1;
                const power = parseFloat(input.querySelector('.skill-power')?.value) || 10;
                const requiresText = input.querySelector('.skill-requires').value.trim();
                const requires = requiresText ? requiresText.split(',').map(s => s.trim()).filter(s => s) : [];
                const description = input.querySelector('.skill-description').value.trim();
                return name ? { name, unlockLevel, power, requires, description } : null;
            }).filter(s => s);
            
            // Collect formulas
            const formulaInputs = document.querySelectorAll('.formula-input');
            const formulas = Array.from(formulaInputs).map(input => {
                const name = input.querySelector('.formula-name').value.trim();
                const expression = input.querySelector('.formula-expression').value.trim();
                return name && expression ? { name, expression } : null;
            }).filter(f => f);
            
            const propertiesText = document.getElementById('classProperties').value.trim();
            const properties = propertiesText ? propertiesText.split('\n').map(p => p.trim()).filter(p => p) : [];
            
            const classData = {
                id: isEdit ? classToEdit.id : Utils.generateId(),
                name: document.getElementById('className').value.trim(),
                classType: document.getElementById('classType').value,
                parentId: document.getElementById('classParent').value || null,
                attributes: attributes,
                skills: skills,
                formulas: formulas,
                properties: properties,
                description: document.getElementById('classDescription').value.trim(),
                relatedItems: tempRelatedItems,
                createdAt: isEdit ? classToEdit.createdAt : new Date().toISOString()
            };
            
            // Sync bidirectional relationships
            const oldRelatedItems = isEdit && classToEdit.relatedItems ? classToEdit.relatedItems : [];
            RelationshipManager.syncRelationships(
                { id: classData.id, type: 'class' },
                oldRelatedItems,
                classData.relatedItems
            );
            
            if (isEdit) {
                const index = AppState.classes.findIndex(c => c.id === classToEdit.id);
                AppState.classes[index] = classData;
            } else {
                AppState.classes.push(classData);
            }
            
            AppState.save();
            this.render();
            
            // Refresh other sections if relationships changed to update "Referenced By" displays
            RelationshipManager.refreshAllSections();
            
            Modal.close();
        });
        
        document.getElementById('cancelClassBtn').addEventListener('click', () => Modal.close());
    },
    
    deleteClass(classId) {
        const classToDelete = AppState.classes.find(c => c.id === classId);
        const children = AppState.classes.filter(c => c.parentId === classId);
        
        // Check for references and show detailed confirmation
        RelationshipManager.confirmDeleteWithImpact(classId, classToDelete.name, 'class', () => {
            // Additional warning about child classes
            if (children.length > 0) {
                Utils.showConfirm(
                    `This class has ${children.length} child class(es). They will become root classes.\n\nContinue?`,
                    () => {
                        this.performDeleteClass(classId, children);
                    }
                );
            } else {
                this.performDeleteClass(classId, children);
            }
        });
    },
    
    performDeleteClass(classId, children) {
        // Remove parent reference from children
        children.forEach(child => {
            child.parentId = null;
        });
        
        // Delete the class
        AppState.classes = AppState.classes.filter(c => c.id !== classId);
        AppState.save();
        
        // Clean up any orphaned relationships to this deleted class
        RelationshipManager.cleanupOrphanedRelationships();
        
        this.render();
        
        // Refresh other sections to remove references to deleted class
        RelationshipManager.refreshAllSections();
    },
    
    render() {
        const container = document.getElementById('classesList');
        const filteredClasses = this.getFilteredClasses();
        
        if (filteredClasses.length === 0) {
            const message = this.currentFilter === 'all' 
                ? 'No classes yet. Create your first class!'
                : `No ${this.currentFilter} classes yet.`;
            container.innerHTML = `<div class="empty-state">${message}</div>`;
            return;
        }
        
        // Build hierarchy (only for filtered classes)
        const rootClasses = filteredClasses.filter(c => !c.parentId);
        
        const renderClassHierarchy = (classObj, depth = 0) => {
            // Only show children that match the current filter
            const children = filteredClasses.filter(c => c.parentId === classObj.id);
            const indent = depth * 2;
            
            const classTypeBadge = classObj.classType === 'character' 
                ? '<span class="class-type-badge character">🎭 Character</span>'
                : '<span class="class-type-badge instance"><img src="icons/navigation/mechanics.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Instance</span>';
            
            let html = `
                <div class="class-item ${BulkOperations.enabled ? 'bulk-mode' : ''}" style="margin-left: ${indent}rem;" data-id="${classObj.id}">
                    ${BulkOperations.enabled ? `
                        <div class="bulk-checkbox">
                            <input type="checkbox" 
                                   ${BulkOperations.hasItem(classObj.id, 'class') ? 'checked' : ''}
                                   onchange="BulkOperations.toggleItem('${classObj.id}', 'class'); event.stopPropagation();" />
                        </div>
                    ` : ''}
                    <div class="class-header">
                        <div class="class-info">
                            <div class="class-name">
                                ${depth > 0 ? '<span class="inheritance-arrow">↳</span>' : ''}
                                <strong>${Utils.escapeHtml(classObj.name)}</strong>
                                ${classTypeBadge}
                                ${classObj.parentId ? '<span class="class-badge">Child Class</span>' : '<span class="class-badge root">Root Class</span>'}
                            </div>
                            ${classObj.description ? `<div class="class-description">${Utils.escapeHtml(classObj.description)}</div>` : ''}
                        </div>
                        <div class="class-actions">
                            <button class="btn btn-small btn-accent" onclick="ClassesManager.openClassProgressionEditor(AppState.classes.find(c => c.id === '${classObj.id}'))"><img src="icons/misc/chart.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Progression</button>
                            <button class="btn btn-small btn-secondary" onclick="ClassesManager.openAddModal(AppState.classes.find(c => c.id === '${classObj.id}'))">Edit</button>
                            <button class="btn btn-small btn-secondary" onclick="TemplateManager.saveAsTemplate(AppState.classes.find(c => c.id === '${classObj.id}'), 'class')" title="Save as reusable template"><img src="icons/actions/save.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Template</button>
                            <button class="btn btn-small btn-danger" onclick="ClassesManager.deleteClass('${classObj.id}')">Delete</button>
                        </div>
                    </div>
                    <div class="class-details">
                        ${classObj.attributes && classObj.attributes.length > 0 ? `
                            <div class="class-section">
                                <strong><img src="icons/misc/chart.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Attributes:</strong>
                                <div class="attributes-display">
                                    ${classObj.attributes.map(attr => `
                                        <span class="attribute-badge">${Utils.escapeHtml(attr.name)}: ${attr.value}</span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${classObj.skills && classObj.skills.length > 0 ? `
                            <div class="class-section">
                                <strong><img src="icons/misc/combat.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Skills (${classObj.skills.length}):</strong>
                                <div class="skills-display">
                                    ${classObj.skills.map(skill => `
                                        <div class="skill-badge">
                                            <span class="skill-name">${Utils.escapeHtml(skill.name)}</span>
                                            <span class="skill-level">Lv${skill.unlockLevel}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${classObj.formulas && classObj.formulas.length > 0 ? `
                            <div class="class-section">
                                <strong><img src="icons/misc/calculator.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Formulas:</strong>
                                <ul class="formulas-list">
                                    ${classObj.formulas.map(formula => `
                                        <li><code>${Utils.escapeHtml(formula.name)} = ${Utils.escapeHtml(formula.expression)}</code></li>
                                    `).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        
                        ${classObj.properties && classObj.properties.length > 0 ? `
                            <div class="class-section">
                                <strong><img src="icons/navigation/mechanics.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Properties:</strong>
                                <ul class="properties-list">
                                    ${classObj.properties.map(prop => `<li><code>${Utils.escapeHtml(prop)}</code></li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        
                        ${Utils.renderConnections(classObj)}
                    </div>
                </div>
            `;
            
            // Recursively render children
            if (children.length > 0) {
                children.forEach(child => {
                    html += renderClassHierarchy(child, depth + 1);
                });
            }
            
            return html;
        };
        
        let html = '<div class="classes-hierarchy">';
        rootClasses.forEach(rootClass => {
            html += renderClassHierarchy(rootClass);
        });
        html += '</div>';
        
        container.innerHTML = html;
        
        // Make relationship chips clickable
        RelationshipManager.makeChipsClickable(container);
    },
    
    openComparisonTool() {
        if (AppState.classes.length < 2) {
            alert('You need at least 2 classes to compare. Create more classes first.');
            return;
        }
        
        const comparisonHTML = `
            <div class="class-comparison-tool">
                <h2><img src="icons/misc/scales-balance.svg" alt="" width="16" height="16" style="vertical-align: middle;"> Class Comparison Tool</h2>
                <p>Select classes to compare side-by-side</p>
                
                <div class="comparison-selector">
                    <div class="form-group">
                        <label>Select Classes to Compare (2-4)</label>
                        <div class="class-checkboxes">
                            ${AppState.classes.map(cls => {
                                const typeIcon = cls.classType === 'character' ? '🎭' : '<img src="icons/navigation/mechanics.svg" alt="" width="14" height="14" style="vertical-align: middle;">';
                                const typeName = cls.classType === 'character' ? 'Character' : 'Instance';
                                return `
                                <label class="checkbox-label">
                                    <input type="checkbox" class="compare-class-checkbox" value="${cls.id}" data-class-name="${Utils.escapeHtml(cls.name)}">
                                    <span>${typeIcon} ${Utils.escapeHtml(cls.name)} <small>(${typeName})</small></span>
                                </label>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    <button class="btn btn-primary" id="generateComparisonBtn">Generate Comparison</button>
                </div>
                
                <div id="comparisonResults" class="comparison-results"></div>
            </div>
        `;
        
        Modal.open(comparisonHTML);
        
        document.getElementById('generateComparisonBtn').addEventListener('click', () => {
            const selectedCheckboxes = document.querySelectorAll('.compare-class-checkbox:checked');
            const selectedClassIds = Array.from(selectedCheckboxes).map(cb => cb.value);
            
            if (selectedClassIds.length < 2) {
                alert('Please select at least 2 classes to compare.');
                return;
            }
            
            if (selectedClassIds.length > 4) {
                alert('Please select no more than 4 classes to compare.');
                return;
            }
            
            this.renderComparison(selectedClassIds);
        });
    },
    
    renderComparison(classIds) {
        const classes = classIds.map(id => AppState.classes.find(c => c.id === id)).filter(c => c);
        const resultsContainer = document.getElementById('comparisonResults');
        
        if (classes.length === 0) return;
        
        // Collect all unique attributes and skills
        const allAttributes = new Set();
        const allSkills = new Set();
        const allFormulas = new Set();
        
        classes.forEach(cls => {
            if (cls.attributes) cls.attributes.forEach(attr => allAttributes.add(attr.name));
            if (cls.skills) cls.skills.forEach(skill => allSkills.add(skill.name));
            if (cls.formulas) cls.formulas.forEach(formula => allFormulas.add(formula.name));
        });
        
        let html = '<div class="comparison-tables">';
        
        // Attributes Comparison Table
        if (allAttributes.size > 0) {
            html += `
                <div class="comparison-section">
                    <h3><img src="icons/misc/chart-line-up.svg" alt="" width="16" height="16" style="vertical-align: middle;"> Attributes Comparison</h3>
                    <table class="comparison-table">
                        <thead>
                            <tr>
                                <th>Attribute</th>
                                ${classes.map(cls => {
                                    const typeIcon = cls.classType === 'character' ? '🎭' : '<img src="icons/navigation/mechanics.svg" alt="" width="14" height="14" style="vertical-align: middle;">';
                                    return `<th>${typeIcon} ${Utils.escapeHtml(cls.name)}</th>`;
                                }).join('')}
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            allAttributes.forEach(attrName => {
                html += '<tr>';
                html += `<td class="attr-name">${Utils.escapeHtml(attrName)}</td>`;
                classes.forEach(cls => {
                    const attr = cls.attributes?.find(a => a.name === attrName);
                    if (attr) {
                        html += `<td class="attr-value">${attr.value}</td>`;
                    } else {
                        html += '<td class="attr-missing">—</td>';
                    }
                });
                html += '</tr>';
            });
            
            html += '</tbody></table></div>';
        }
        
        // Skills Comparison Table
        if (allSkills.size > 0) {
            html += `
                <div class="comparison-section">
                    <h3><img src="icons/misc/combat.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Skills Comparison</h3>
                    <table class="comparison-table">
                        <thead>
                            <tr>
                                <th>Skill</th>
                                ${classes.map(cls => {
                                    const typeIcon = cls.classType === 'character' ? '🎭' : '<img src="icons/navigation/mechanics.svg" alt="" width="14" height="14" style="vertical-align: middle;">';
                                    return `<th>${typeIcon} ${Utils.escapeHtml(cls.name)}</th>`;
                                }).join('')}
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            allSkills.forEach(skillName => {
                html += '<tr>';
                html += `<td class="skill-name">${Utils.escapeHtml(skillName)}</td>`;
                classes.forEach(cls => {
                    const skill = cls.skills?.find(s => s.name === skillName);
                    if (skill) {
                        html += `<td class="skill-available">✓ Lv${skill.unlockLevel}</td>`;
                    } else {
                        html += '<td class="skill-missing">✗</td>';
                    }
                });
                html += '</tr>';
            });
            
            html += '</tbody></table></div>';
        }
        
        // Formulas Comparison Table
        if (allFormulas.size > 0) {
            html += `
                <div class="comparison-section">
                    <h3><img src="icons/misc/calculator.svg" alt="" width="16" height="16" style="vertical-align: middle;"> Derived Stats Comparison</h3>
                    <table class="comparison-table">
                        <thead>
                            <tr>
                                <th>Stat</th>
                                ${classes.map(cls => {
                                    const typeIcon = cls.classType === 'character' ? '🎭' : '<img src="icons/navigation/mechanics.svg" alt="" width="14" height="14" style="vertical-align: middle;">';
                                    return `<th>${typeIcon} ${Utils.escapeHtml(cls.name)}</th>`;
                                }).join('')}
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            allFormulas.forEach(formulaName => {
                html += '<tr>';
                html += `<td class="formula-name">${Utils.escapeHtml(formulaName)}</td>`;
                classes.forEach(cls => {
                    const formula = cls.formulas?.find(f => f.name === formulaName);
                    if (formula) {
                        html += `<td class="formula-value"><code>${Utils.escapeHtml(formula.expression)}</code></td>`;
                    } else {
                        html += '<td class="formula-missing">—</td>';
                    }
                });
                html += '</tr>';
            });
            
            html += '</tbody></table></div>';
        }
        
        // Summary Stats
        html += `
            <div class="comparison-section">
                <h3><img src="icons/misc/checklist.svg" alt="" width="16" height="16" style="vertical-align: middle;"> Summary</h3>
                <div class="comparison-summary">
                    ${classes.map(cls => {
                        const typeIcon = cls.classType === 'character' ? '🎭' : '<img src="icons/navigation/mechanics.svg" alt="" width="14" height="14" style="vertical-align: middle;">';
                        const typeName = cls.classType === 'character' ? 'Character Class' : 'Instance Class';
                        return `
                        <div class="summary-card">
                            <h4>${typeIcon} ${Utils.escapeHtml(cls.name)}</h4>
                            <div class="summary-stats">
                                <div class="summary-stat">
                                    <span class="stat-label">Type:</span>
                                    <span class="stat-value">${typeName}</span>
                                </div>
                                <div class="summary-stat">
                                    <span class="stat-label">Attributes:</span>
                                    <span class="stat-value">${cls.attributes?.length || 0}</span>
                                </div>
                                <div class="summary-stat">
                                    <span class="stat-label">Skills:</span>
                                    <span class="stat-value">${cls.skills?.length || 0}</span>
                                </div>
                                <div class="summary-stat">
                                    <span class="stat-label">Formulas:</span>
                                    <span class="stat-value">${cls.formulas?.length || 0}</span>
                                </div>
                                <div class="summary-stat">
                                    <span class="stat-label">Parent:</span>
                                    <span class="stat-value">${cls.parentId ? AppState.classes.find(c => c.id === cls.parentId)?.name || 'Unknown' : 'None'}</span>
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        html += '</div>';
        
        resultsContainer.innerHTML = html;
    },
    
    openClassProgressionEditor(classObj) {
        if (!classObj) return;
        
        // Initialize progression data if it doesn't exist
        if (!classObj.levelProgression) {
            classObj.levelProgression = [];
            // Create default progression for levels 1-20
            for (let level = 1; level <= 20; level++) {
                const levelData = { level, attributes: {}, abilities: '' };
                
                // Initialize with base attributes from class
                if (classObj.attributes) {
                    classObj.attributes.forEach(attr => {
                        levelData.attributes[attr.name] = attr.value || 0;
                    });
                }
                
                classObj.levelProgression.push(levelData);
            }
        }
        
        const modalHTML = `
            <div class="class-progression-editor">
                <div class="spreadsheet-header">
                    <h2><img src="icons/misc/chart.svg" alt="" width="16" height="16" style="vertical-align: middle;"> ${Utils.escapeHtml(classObj.name)} - Level Progression</h2>
                    <p>Define attributes and abilities for each level</p>
                </div>
                
                <div class="spreadsheet-controls">
                    <button class="btn btn-secondary" id="addProgressionAttrBtn">+ Add Attribute Column</button>
                    <button class="btn btn-primary" id="saveClassProgressionBtn"><img src="icons/actions/save.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Save Changes</button>
                    <button class="btn btn-accent" id="exportClassProgressionBtn"><img src="icons/actions/download.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Export CSV</button>
                </div>
                
                <div class="spreadsheet-table-container">
                    <table class="progression-table" id="classProgressionTable">
                        <thead>
                            <tr>
                                <th class="sticky-col">Level</th>
                                ${Object.keys(classObj.levelProgression[0].attributes || {}).map(attr => 
                                    `<th class="attr-col">${Utils.escapeHtml(attr)}</th>`
                                ).join('')}
                                <th class="abilities-col">Abilities Unlocked</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${classObj.levelProgression.map((levelData, index) => `
                                <tr data-level="${levelData.level}">
                                    <td class="sticky-col level-cell">${levelData.level}</td>
                                    ${Object.keys(classObj.levelProgression[0].attributes || {}).map(attr => 
                                        `<td><input type="number" class="stat-input" data-attr="${Utils.escapeHtml(attr)}" value="${levelData.attributes[attr] || 0}"></td>`
                                    ).join('')}
                                    <td><input type="text" class="abilities-input" value="${Utils.escapeHtml(levelData.abilities || '')}" placeholder="e.g., Fireball, Shield Bash"></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="spreadsheet-hints">
                    <h4><img src="icons/misc/lightbulb.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Tips:</h4>
                    <ul>
                        <li>Define how attributes grow with each level</li>
                        <li>List abilities unlocked at each level (comma-separated)</li>
                        <li>Characters with this class will inherit these values</li>
                        <li>Multi-class characters merge progression from all their classes</li>
                    </ul>
                </div>
            </div>
        `;
        
        Modal.open(modalHTML);
        
        // Add attribute column
        document.getElementById('addProgressionAttrBtn').addEventListener('click', () => {
            const attrName = prompt('Enter attribute name:');
            if (!attrName || attrName.trim() === '') return;
            
            const trimmedName = attrName.trim();
            
            // Check if attribute already exists
            if (classObj.levelProgression[0].attributes[trimmedName] !== undefined) {
                alert('Attribute already exists!');
                return;
            }
            
            // Add attribute to all levels
            classObj.levelProgression.forEach(levelData => {
                levelData.attributes[trimmedName] = 0;
            });
            
            // Refresh the table
            this.openClassProgressionEditor(classObj);
        });
        
        // Save progression
        document.getElementById('saveClassProgressionBtn').addEventListener('click', () => {
            const rows = document.querySelectorAll('#classProgressionTable tbody tr');
            
            rows.forEach((row, index) => {
                const level = parseInt(row.dataset.level);
                const levelData = classObj.levelProgression.find(l => l.level === level);
                
                if (levelData) {
                    // Update attributes
                    row.querySelectorAll('.stat-input').forEach(input => {
                        const attrName = input.dataset.attr;
                        levelData.attributes[attrName] = parseFloat(input.value) || 0;
                    });
                    
                    // Update abilities
                    const abilitiesInput = row.querySelector('.abilities-input');
                    levelData.abilities = abilitiesInput.value.trim();
                }
            });
            
            AppState.save();
            alert('Class progression saved successfully!');
            Modal.close();
            this.render();
        });
        
        // Export CSV
        document.getElementById('exportClassProgressionBtn').addEventListener('click', () => {
            this.exportClassProgressionCSV(classObj);
        });
    },
    
    exportClassProgressionCSV(classObj) {
        if (!classObj.levelProgression || classObj.levelProgression.length === 0) {
            alert('No progression data to export!');
            return;
        }
        
        // Build CSV
        const attrNames = Object.keys(classObj.levelProgression[0].attributes || {});
        let csv = 'Level,' + attrNames.join(',') + ',Abilities\n';
        
        classObj.levelProgression.forEach(levelData => {
            csv += levelData.level + ',';
            csv += attrNames.map(attr => levelData.attributes[attr] || 0).join(',') + ',';
            csv += '"' + (levelData.abilities || '') + '"\n';
        });
        
        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${classObj.name}_progression.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },
    
    openBalanceTester() {
        if (AppState.classes.length === 0) {
            alert('No classes to test. Create some classes first!');
            return;
        }
        
        const balanceHTML = `
            <div class="balance-tester">
                <h2><img src="icons/misc/scales-balance.svg" alt="" width="16" height="16" style="vertical-align: middle;"> Class Balance Tester</h2>
                <p>Analyze and compare class power levels</p>
                
                <div class="balance-controls">
                    <div class="form-group">
                        <label>Filter by Type:</label>
                        <select id="balanceFilterType">
                            <option value="all">All Classes</option>
                            <option value="character">Character Classes Only</option>
                            <option value="instance">Instance Classes Only</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" id="runBalanceTestBtn">Run Balance Test</button>
                </div>
                
                <div id="balanceResults" class="balance-results"></div>
            </div>
        `;
        
        Modal.open(balanceHTML);
        
        document.getElementById('runBalanceTestBtn').addEventListener('click', () => {
            const filterType = document.getElementById('balanceFilterType').value;
            this.runBalanceTest(filterType);
        });
        
        // Auto-run on open
        this.runBalanceTest('all');
    },
    
    calculateClassPower(classObj) {
        let powerScore = 0;
        
        // Attribute power (sum of all attribute values)
        const attributePower = classObj.attributes?.reduce((sum, attr) => sum + (parseInt(attr.value) || 0), 0) || 0;
        powerScore += attributePower;
        
        // Skills power (use user-defined power values)
        const skillsPower = classObj.skills?.reduce((sum, skill) => {
            // Use the user-defined power value, or default to 10 if not set
            const skillPower = parseFloat(skill.power) || 10;
            return sum + skillPower;
        }, 0) || 0;
        powerScore += skillsPower;
        
        // Formulas power (complexity bonus)
        const formulasPower = (classObj.formulas?.length || 0) * 15;
        powerScore += formulasPower;
        
        // Properties power
        const propertiesPower = (classObj.properties?.length || 0) * 5;
        powerScore += propertiesPower;
        
        return {
            total: powerScore,
            breakdown: {
                attributes: attributePower,
                skills: skillsPower,
                formulas: formulasPower,
                properties: propertiesPower
            }
        };
    },
    
    runBalanceTest(filterType) {
        const resultsContainer = document.getElementById('balanceResults');
        
        // Filter classes by type
        let classesToTest = AppState.classes;
        if (filterType === 'character') {
            classesToTest = AppState.classes.filter(c => c.classType === 'character');
        } else if (filterType === 'instance') {
            classesToTest = AppState.classes.filter(c => c.classType === 'instance');
        }
        
        if (classesToTest.length === 0) {
            resultsContainer.innerHTML = '<div class="empty-state">No classes match the selected filter.</div>';
            return;
        }
        
        // Calculate power for each class
        const classesWithPower = classesToTest.map(cls => ({
            ...cls,
            power: this.calculateClassPower(cls)
        }));
        
        // Sort by total power
        classesWithPower.sort((a, b) => b.power.total - a.power.total);
        
        // Calculate average power
        const avgPower = classesWithPower.reduce((sum, cls) => sum + cls.power.total, 0) / classesWithPower.length;
        const maxPower = classesWithPower[0].power.total;
        const minPower = classesWithPower[classesWithPower.length - 1].power.total;
        
        let html = `
            <div class="balance-overview">
                <h3><img src="icons/misc/chart-line-up.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Power Level Overview</h3>
                <div class="balance-stats-grid">
                    <div class="balance-stat-card">
                        <div class="stat-icon"><img src="icons/misc/chart-line-up.svg" alt="" width="14" height="14" style="vertical-align: middle;"></div>
                        <div class="stat-content">
                            <div class="stat-label">Average Power</div>
                            <div class="stat-value">${avgPower.toFixed(1)}</div>
                        </div>
                    </div>
                    <div class="balance-stat-card">
                        <div class="stat-icon">🔝</div>
                        <div class="stat-content">
                            <div class="stat-label">Highest Power</div>
                            <div class="stat-value">${maxPower}</div>
                        </div>
                    </div>
                    <div class="balance-stat-card">
                        <div class="stat-icon"><img src="icons/misc/chart-line-down.svg" alt="" width="14" height="14" style="vertical-align: middle;"></div>
                        <div class="stat-content">
                            <div class="stat-label">Lowest Power</div>
                            <div class="stat-value">${minPower}</div>
                        </div>
                    </div>
                    <div class="balance-stat-card">
                        <div class="stat-icon">📏</div>
                        <div class="stat-content">
                            <div class="stat-label">Power Range</div>
                            <div class="stat-value">${maxPower - minPower}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="balance-classes-section">
                <h3><img src="icons/misc/gameplay.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Class Power Ratings</h3>
                <div class="balance-classes-list">
        `;
        
        classesWithPower.forEach((cls, index) => {
            const powerPercent = (cls.power.total / maxPower) * 100;
            const deviation = ((cls.power.total - avgPower) / avgPower) * 100;
            
            let balanceStatus = '';
            let balanceClass = '';
            let balanceIcon = '';
            
            if (Math.abs(deviation) <= 10) {
                balanceStatus = 'Balanced';
                balanceClass = 'balanced';
                balanceIcon = '✓';
            } else if (deviation > 10) {
                balanceStatus = 'Overpowered';
                balanceClass = 'overpowered';
                balanceIcon = '⚠️';
            } else {
                balanceStatus = 'Underpowered';
                balanceClass = 'underpowered';
                balanceIcon = '⚠️';
            }
            
            const typeIcon = cls.classType === 'character' ? '🎭' : '<img src="icons/navigation/mechanics.svg" alt="" width="14" height="14" style="vertical-align: middle;">';
            const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            
            html += `
                <div class="balance-class-card ${balanceClass}">
                    <div class="balance-class-header">
                        <div class="balance-class-title">
                            <span class="balance-rank">${rankEmoji} #${index + 1}</span>
                            <strong>${typeIcon} ${Utils.escapeHtml(cls.name)}</strong>
                            <span class="balance-badge ${balanceClass}">${balanceIcon} ${balanceStatus}</span>
                        </div>
                        <div class="balance-power-score">
                            <span class="power-label">Power:</span>
                            <span class="power-value">${cls.power.total}</span>
                        </div>
                    </div>
                    
                    <div class="balance-power-bar">
                        <div class="power-bar-fill" style="width: ${powerPercent}%"></div>
                    </div>
                    
                    <div class="balance-breakdown">
                        <div class="breakdown-item">
                            <span class="breakdown-label">Attributes:</span>
                            <span class="breakdown-value">${cls.power.breakdown.attributes}</span>
                        </div>
                        <div class="breakdown-item">
                            <span class="breakdown-label">Skills:</span>
                            <span class="breakdown-value">${cls.power.breakdown.skills}</span>
                        </div>
                        <div class="breakdown-item">
                            <span class="breakdown-label">Formulas:</span>
                            <span class="breakdown-value">${cls.power.breakdown.formulas}</span>
                        </div>
                        <div class="breakdown-item">
                            <span class="breakdown-label">Properties:</span>
                            <span class="breakdown-value">${cls.power.breakdown.properties}</span>
                        </div>
                    </div>
                    
                    <div class="balance-deviation">
                        ${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}% from average
                    </div>
                    
                    ${this.getBalanceSuggestions(cls, deviation)}
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
            
            <div class="balance-tips">
                <h4><img src="icons/misc/lightbulb.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Balance Tips</h4>
                <ul>
                    <li><strong>Balanced classes</strong> are within ±10% of average power</li>
                    <li><strong>Attributes</strong> contribute their total value to power</li>
                    <li><strong>Skills</strong> use the power value you set for each skill (default: 10)</li>
                    <li><strong>Formulas</strong> add 15 power each (complexity bonus)</li>
                    <li><strong>Properties</strong> add 5 power each</li>
                    <li>Consider class roles - some classes should be stronger in specific areas</li>
                    <li>Adjust individual skill power values to fine-tune balance</li>
                </ul>
            </div>
        `;
        
        resultsContainer.innerHTML = html;
    },
    
    getBalanceSuggestions(cls, deviation) {
        if (Math.abs(deviation) <= 10) {
            return '<div class="balance-suggestions balanced"><strong>✓ Well Balanced!</strong> This class is within acceptable power range.</div>';
        }
        
        let suggestions = [];
        
        if (deviation > 10) {
            suggestions.push('This class is overpowered. Consider:');
            if (cls.power.breakdown.attributes > 100) {
                suggestions.push('• Reducing some attribute values');
            }
            if (cls.power.breakdown.skills > 200) {
                suggestions.push('• Reducing the power values of some skills');
            }
            if (cls.skills?.length > 10) {
                suggestions.push('• Removing some skills');
            }
        } else {
            suggestions.push('This class is underpowered. Consider:');
            if (cls.power.breakdown.attributes < 50) {
                suggestions.push('• Increasing attribute values');
            }
            if (cls.power.breakdown.skills < 50) {
                suggestions.push('• Increasing skill power values or adding more skills');
            }
            if ((cls.skills?.length || 0) < 5) {
                suggestions.push('• Adding more skills');
            }
            if ((cls.formulas?.length || 0) < 2) {
                suggestions.push('• Adding derived stat formulas');
            }
        }
        
        return `
            <div class="balance-suggestions">
                <strong><img src="icons/misc/lightbulb.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Suggestions:</strong>
                <ul>
                    ${suggestions.map(s => `<li>${s}</li>`).join('')}
                </ul>
            </div>
        `;
    }
};

// ============================================
// Game Mechanics Manager
// ============================================
// Manages game mechanics definitions and rules
// Supports categorization, status tracking, priority levels, and complexity ratings
// Allows mechanics to be linked to classes, tasks, and other game elements
// Provides filtering and organization tools for large mechanic libraries
const MechanicsManager = {
    filters: {
        category: '',   // Filter by category/type
        status: '',     // Filter by status
        priority: '',   // Filter by priority
        complexity: ''  // Filter by complexity level
    },
    sortBy: 'name',  // Sort field
    
    /**
     * Initializes mechanics manager
     * Attaches listeners to add button and filter controls
     */
    init() {
        document.getElementById('addMechanicBtn').addEventListener('click', () => this.openAddModal());
        
        // Filter event listeners
        document.getElementById('mechanicsFilterCategory').addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.render();
        });
        document.getElementById('mechanicsFilterStatus').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.render();
        });
        document.getElementById('mechanicsFilterPriority').addEventListener('change', (e) => {
            this.filters.priority = e.target.value;
            this.render();
        });
        document.getElementById('mechanicsFilterComplexity').addEventListener('change', (e) => {
            this.filters.complexity = e.target.value;
            this.render();
        });
        document.getElementById('mechanicsSortBy').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.render();
        });
        document.getElementById('mechanicsClearFilters').addEventListener('click', () => {
            this.filters = { category: '', status: '', priority: '', complexity: '' };
            this.sortBy = 'name';
            document.getElementById('mechanicsFilterCategory').value = '';
            document.getElementById('mechanicsFilterStatus').value = '';
            document.getElementById('mechanicsFilterPriority').value = '';
            document.getElementById('mechanicsFilterComplexity').value = '';
            document.getElementById('mechanicsSortBy').value = 'name';
            this.render();
        });
        
        this.render();
    },
    
    filterAndSortMechanics(mechanics) {
        // Apply filters
        let filtered = mechanics.filter(m => {
            if (this.filters.category && m.category !== this.filters.category) return false;
            if (this.filters.status && m.status !== this.filters.status) return false;
            if (this.filters.priority && m.priority !== this.filters.priority) return false;
            if (this.filters.complexity && m.complexity !== this.filters.complexity) return false;
            return true;
        });
        
        // Apply sorting
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const complexityOrder = { complex: 0, medium: 1, simple: 2 };
        const statusOrder = { 'in-progress': 0, 'not-started': 1, 'testing': 2, 'complete': 3 };
        
        filtered.sort((a, b) => {
            switch (this.sortBy) {
                case 'priority':
                    return priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium'];
                case 'complexity':
                    return complexityOrder[a.complexity || 'medium'] - complexityOrder[b.complexity || 'medium'];
                case 'date':
                    return new Date(b.modifiedAt || b.createdAt) - new Date(a.modifiedAt || a.createdAt);
                case 'status':
                    return statusOrder[a.status || 'not-started'] - statusOrder[b.status || 'not-started'];
                case 'name':
                default:
                    return a.name.localeCompare(b.name);
            }
        });
        
        return filtered;
    },
    
    openAddModal(mechanicToEdit = null) {
        const isEdit = mechanicToEdit !== null;
        
        const formHtml = `
            <form class="modal-form" id="mechanicForm">
                <h3>${isEdit ? 'Edit Mechanic' : 'Add New Mechanic'}</h3>
                
                <div class="form-group">
                    <label for="mechanicName">Mechanic Name *</label>
                    <input type="text" id="mechanicName" required value="${isEdit ? Utils.escapeHtml(mechanicToEdit.name) : ''}" placeholder="e.g., Jump System, Combat">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="mechanicCategory">Category</label>
                        <select id="mechanicCategory">
                            <option value="movement" ${isEdit && mechanicToEdit.category === 'movement' ? 'selected' : ''}>Movement</option>
                            <option value="combat" ${isEdit && mechanicToEdit.category === 'combat' ? 'selected' : ''}>Combat</option>
                            <option value="ui" ${isEdit && mechanicToEdit.category === 'ui' ? 'selected' : ''}>UI/UX</option>
                            <option value="gameplay" ${isEdit && mechanicToEdit.category === 'gameplay' ? 'selected' : ''}>Gameplay</option>
                            <option value="ai" ${isEdit && mechanicToEdit.category === 'ai' ? 'selected' : ''}>AI</option>
                            <option value="physics" ${isEdit && mechanicToEdit.category === 'physics' ? 'selected' : ''}>Physics</option>
                            <option value="networking" ${isEdit && mechanicToEdit.category === 'networking' ? 'selected' : ''}>Networking</option>
                            <option value="audio" ${isEdit && mechanicToEdit.category === 'audio' ? 'selected' : ''}>Audio</option>
                            <option value="graphics" ${isEdit && mechanicToEdit.category === 'graphics' ? 'selected' : ''}>Graphics</option>
                            <option value="other" ${isEdit && mechanicToEdit.category === 'other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="mechanicStatus">Implementation Status</label>
                        <select id="mechanicStatus">
                            <option value="not-started" ${isEdit && mechanicToEdit.status === 'not-started' ? 'selected' : ''}>Not Started</option>
                            <option value="in-progress" ${isEdit && mechanicToEdit.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                            <option value="testing" ${isEdit && mechanicToEdit.status === 'testing' ? 'selected' : ''}>Testing</option>
                            <option value="complete" ${isEdit && mechanicToEdit.status === 'complete' ? 'selected' : ''}>Complete</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="mechanicPriority">Priority</label>
                        <select id="mechanicPriority">
                            <option value="critical" ${isEdit && mechanicToEdit.priority === 'critical' ? 'selected' : ''}>🔴 Critical</option>
                            <option value="high" ${isEdit && mechanicToEdit.priority === 'high' ? 'selected' : ''}>🟠 High</option>
                            <option value="medium" ${isEdit && mechanicToEdit.priority === 'medium' ? 'selected' : ''}>🟡 Medium</option>
                            <option value="low" ${isEdit && mechanicToEdit.priority === 'low' ? 'selected' : ''}>🟢 Low</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="mechanicComplexity">Complexity</label>
                        <select id="mechanicComplexity">
                            <option value="simple" ${isEdit && mechanicToEdit.complexity === 'simple' ? 'selected' : ''}>Simple</option>
                            <option value="medium" ${isEdit && mechanicToEdit.complexity === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="complex" ${isEdit && mechanicToEdit.complexity === 'complex' ? 'selected' : ''}>Complex</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="mechanicDescription">Description *</label>
                    <textarea id="mechanicDescription" rows="4" required placeholder="Describe how this mechanic works...">${isEdit && mechanicToEdit.description ? Utils.escapeHtml(mechanicToEdit.description) : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="mechanicImplementation">Implementation Notes</label>
                    <textarea id="mechanicImplementation" rows="4" placeholder="Technical details, code snippets, algorithms...">${isEdit && mechanicToEdit.implementation ? Utils.escapeHtml(mechanicToEdit.implementation) : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="mechanicDependencies">Dependencies (other mechanics this relies on)</label>
                    <select id="mechanicDependencies" multiple size="6">
                        ${(() => {
                            const availableMechanics = AppState.mechanics.filter(m => !isEdit || m.id !== mechanicToEdit?.id);
                            
                            if (availableMechanics.length === 0) {
                                return '<option disabled>No other mechanics available</option>';
                            }
                            
                            // Group by category
                            const categories = {
                                movement: { label: '🏃 Movement', items: [] },
                                combat: { label: '⚔️ Combat', items: [] },
                                ui: { label: '🎨 UI/UX', items: [] },
                                gameplay: { label: '🎮 Gameplay', items: [] },
                                ai: { label: '🤖 AI', items: [] },
                                physics: { label: '⚙️ Physics', items: [] },
                                networking: { label: '🌐 Networking', items: [] },
                                audio: { label: '🔊 Audio', items: [] },
                                graphics: { label: '🖼️ Graphics', items: [] },
                                other: { label: '📦 Other', items: [] }
                            };
                            
                            availableMechanics.forEach(m => {
                                const category = categories[m.category] || categories.other;
                                category.items.push(m);
                            });
                            
                            let html = '';
                            Object.entries(categories).forEach(([key, cat]) => {
                                if (cat.items.length > 0) {
                                    html += `<optgroup label="${cat.label}">`;
                                    cat.items.forEach(m => {
                                        html += `<option value="${m.id}" ${isEdit && mechanicToEdit.dependencies?.includes(m.id) ? 'selected' : ''}>
                                            ${Utils.escapeHtml(m.name)}
                                        </option>`;
                                    });
                                    html += '</optgroup>';
                                }
                            });
                            
                            return html;
                        })()}
                    </select>
                    <small class="form-hint">Hold Ctrl/Cmd to select multiple. Mechanics grouped by category for easier selection.</small>
                </div>
                
                <div class="form-group">
                    <label for="mechanicCodeRefs">Code References (file paths or function names)</label>
                    <textarea id="mechanicCodeRefs" rows="2" placeholder="e.g., src/player/movement.js, handleJump()">${isEdit && mechanicToEdit.codeReferences ? Utils.escapeHtml(mechanicToEdit.codeReferences) : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="mechanicTags">Tags (comma-separated)</label>
                    <input type="text" id="mechanicTags" placeholder="e.g., core, multiplayer, physics" value="${isEdit && mechanicToEdit.tags ? mechanicToEdit.tags.join(', ') : ''}">
                </div>
                
                <div class="form-group">
                    <label>Related Items</label>
                    <div id="mechanicRelatedItemsContainer">
                        ${(() => {
                            if (isEdit && mechanicToEdit.relatedItems && mechanicToEdit.relatedItems.length > 0) {
                                return mechanicToEdit.relatedItems.map(rel => {
                                    const item = RelationshipManager.findItemById(rel.id);
                                    if (!item) return '';
                                    return `<span class="relationship-chip" data-id="${rel.id}" data-type="${rel.type}">
                                        <span class="chip-type">${rel.type}</span>
                                        ${Utils.escapeHtml(item.name)}
                                        <button type="button" class="chip-remove" onclick="this.parentElement.remove()">×</button>
                                    </span>`;
                                }).join('');
                            }
                            return '<p class="empty-state-small">No related items yet</p>';
                        })()}
                    </div>
                    <button type="button" class="btn btn-small btn-secondary" id="manageMechanicRelatedBtn"><img src="icons/misc/link.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Manage Related Items</button>
                </div>
                
                ${isEdit ? `
                <div class="form-group">
                    <label>Testing & Prototypes</label>
                    <div style="display: flex; gap: 10px;">
                        <button type="button" class="btn btn-small btn-secondary" id="manageTestsBtn">📝 Manage Tests</button>
                        <button type="button" class="btn btn-small btn-secondary" id="managePrototypesBtn">🎮 Manage Prototypes</button>
                    </div>
                </div>
                ` : ''}
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancelMechanicBtn">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Mechanic</button>
                </div>
            </form>
        `;
        
        Modal.open(formHtml);
        
        // Manage related items button
        document.getElementById('manageMechanicRelatedBtn').addEventListener('click', () => {
            const currentRelated = [];
            document.querySelectorAll('#mechanicRelatedItemsContainer .relationship-chip').forEach(chip => {
                currentRelated.push({
                    id: chip.getAttribute('data-id'),
                    type: chip.getAttribute('data-type')
                });
            });
            
            const currentItem = {
                id: isEdit ? mechanicToEdit.id : 'temp-mechanic-' + Date.now(),
                type: 'mechanic',
                name: document.getElementById('mechanicName').value.trim() || 'Untitled Mechanic',
                data: { relatedItems: currentRelated }
            };
            
            RelationshipManager.openRelationshipSelector(currentItem, (selected) => {
                const container = document.getElementById('mechanicRelatedItemsContainer');
                if (selected.length === 0) {
                    container.innerHTML = '<p class="empty-state-small">No related items yet</p>';
                } else {
                    container.innerHTML = selected.map(rel => {
                        const item = RelationshipManager.findItemById(rel.id);
                        if (!item) return '';
                        return `<span class="relationship-chip" data-id="${rel.id}" data-type="${rel.type}">
                            <span class="chip-type">${rel.type}</span>
                            ${Utils.escapeHtml(item.name)}
                            <button type="button" class="chip-remove" onclick="this.parentElement.remove()">×</button>
                        </span>`;
                    }).join('');
                }
            });
        });
        
        // Manage tests button
        document.getElementById('manageTestsBtn')?.addEventListener('click', () => {
            this.openTestsModal(mechanicToEdit);
        });
        
        // Manage prototypes button
        document.getElementById('managePrototypesBtn')?.addEventListener('click', () => {
            this.openPrototypesModal(mechanicToEdit);
        });
        
        document.getElementById('mechanicForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const tags = document.getElementById('mechanicTags').value
                .split(',')
                .map(c => c.trim())
                .filter(c => c);
            
            const dependencies = Array.from(document.getElementById('mechanicDependencies').selectedOptions)
                .map(option => option.value);
            
            // Collect related items
            const relatedItems = [];
            document.querySelectorAll('#mechanicRelatedItemsContainer .relationship-chip').forEach(chip => {
                relatedItems.push({
                    id: chip.getAttribute('data-id'),
                    type: chip.getAttribute('data-type')
                });
            });
            
            const mechanicData = {
                id: isEdit ? mechanicToEdit.id : Utils.generateId(),
                name: document.getElementById('mechanicName').value.trim(),
                category: document.getElementById('mechanicCategory').value,
                status: document.getElementById('mechanicStatus').value,
                priority: document.getElementById('mechanicPriority').value,
                complexity: document.getElementById('mechanicComplexity').value,
                description: document.getElementById('mechanicDescription').value.trim(),
                implementation: document.getElementById('mechanicImplementation').value.trim(),
                dependencies: dependencies,
                codeReferences: document.getElementById('mechanicCodeRefs').value.trim(),
                tags: tags,
                relatedItems: relatedItems,
                tests: isEdit ? mechanicToEdit.tests : [],
                prototypes: isEdit ? mechanicToEdit.prototypes : [],
                createdAt: isEdit ? mechanicToEdit.createdAt : new Date().toISOString(),
                modifiedAt: new Date().toISOString()
            };
            
            // Sync relationships
            const oldRelatedItems = isEdit ? (mechanicToEdit.relatedItems || []) : [];
            RelationshipManager.syncRelationships(
                { id: mechanicData.id, type: 'mechanic', name: mechanicData.name },
                oldRelatedItems,
                relatedItems
            );
            
            if (isEdit) {
                const index = AppState.mechanics.findIndex(m => m.id === mechanicToEdit.id);
                AppState.mechanics[index] = mechanicData;
            } else {
                AppState.mechanics.push(mechanicData);
            }
            
            AppState.save();
            this.render();
            
            // Refresh other sections
            RelationshipManager.refreshAllSections();
            
            Modal.close();
        });
        
        document.getElementById('cancelMechanicBtn').addEventListener('click', () => Modal.close());
    },
    
    openTestsModal(mechanic) {
        if (!mechanic.tests) mechanic.tests = [];
        
        const modalHTML = `
            <div class="tests-modal">
                <h2>📝 Test Cases - ${Utils.escapeHtml(mechanic.name)}</h2>
                <p>Define test cases to ensure this mechanic works correctly</p>
                
                <div class="tests-list" id="testsList">
                    ${mechanic.tests.length > 0 ? mechanic.tests.map((test, index) => `
                        <div class="test-item ${test.passed ? 'passed' : ''}">
                            <input type="checkbox" class="test-checkbox" data-index="${index}" ${test.passed ? 'checked' : ''}>
                            <input type="text" class="test-description" value="${Utils.escapeHtml(test.description)}" placeholder="Test description">
                            <button class="btn-icon-small remove-test" data-index="${index}">✕</button>
                        </div>
                    `).join('') : '<p class="empty-state-small">No test cases yet</p>'}
                </div>
                
                <button class="btn btn-secondary" id="addTestBtn">+ Add Test Case</button>
                
                <div class="modal-actions">
                    <button class="btn btn-primary" id="saveTestsBtn">Save Tests</button>
                    <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                </div>
            </div>
        `;
        
        Modal.open(modalHTML);
        
        // Add test
        document.getElementById('addTestBtn').addEventListener('click', () => {
            const list = document.getElementById('testsList');
            const empty = list.querySelector('.empty-state-small');
            if (empty) empty.remove();
            
            const newIndex = mechanic.tests.length;
            const testItem = document.createElement('div');
            testItem.className = 'test-item';
            testItem.innerHTML = `
                <input type="checkbox" class="test-checkbox" data-index="${newIndex}">
                <input type="text" class="test-description" value="" placeholder="Test description">
                <button class="btn-icon-small remove-test" data-index="${newIndex}">✕</button>
            `;
            list.appendChild(testItem);
        });
        
        // Remove test
        document.getElementById('testsList').addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-test')) {
                e.target.closest('.test-item').remove();
                const list = document.getElementById('testsList');
                if (list.children.length === 0) {
                    list.innerHTML = '<p class="empty-state-small">No test cases yet</p>';
                }
            }
        });
        
        // Save tests
        document.getElementById('saveTestsBtn').addEventListener('click', () => {
            mechanic.tests = [];
            document.querySelectorAll('.test-item').forEach(item => {
                const description = item.querySelector('.test-description').value.trim();
                const passed = item.querySelector('.test-checkbox').checked;
                if (description) {
                    mechanic.tests.push({ description, passed });
                }
            });
            AppState.save();
            alert('Test cases saved!');
            Modal.close();
        });
    },
    
    openPrototypesModal(mechanic) {
        if (!mechanic.prototypes) mechanic.prototypes = [];
        
        const modalHTML = `
            <div class="prototypes-modal">
                <h2>🎮 Prototypes & Demos - ${Utils.escapeHtml(mechanic.name)}</h2>
                <p>Track prototypes and demo builds for testing this mechanic</p>
                
                <div class="prototypes-list" id="prototypesList">
                    ${mechanic.prototypes.length > 0 ? mechanic.prototypes.map((proto, index) => `
                        <div class="prototype-item">
                            <div class="prototype-header">
                                <input type="text" class="prototype-name" value="${Utils.escapeHtml(proto.name)}" placeholder="Prototype name">
                                <button class="btn-icon-small remove-prototype" data-index="${index}">✕</button>
                            </div>
                            <input type="text" class="prototype-link" value="${Utils.escapeHtml(proto.link || '')}" placeholder="File path or URL">
                            <textarea class="prototype-notes" rows="2" placeholder="Notes about this prototype">${Utils.escapeHtml(proto.notes || '')}</textarea>
                        </div>
                    `).join('') : '<p class="empty-state-small">No prototypes yet</p>'}
                </div>
                
                <button class="btn btn-secondary" id="addPrototypeBtn">+ Add Prototype</button>
                
                <div class="modal-actions">
                    <button class="btn btn-primary" id="savePrototypesBtn">Save Prototypes</button>
                    <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                </div>
            </div>
        `;
        
        Modal.open(modalHTML);
        
        // Add prototype
        document.getElementById('addPrototypeBtn').addEventListener('click', () => {
            const list = document.getElementById('prototypesList');
            const empty = list.querySelector('.empty-state-small');
            if (empty) empty.remove();
            
            const newIndex = mechanic.prototypes.length;
            const protoItem = document.createElement('div');
            protoItem.className = 'prototype-item';
            protoItem.innerHTML = `
                <div class="prototype-header">
                    <input type="text" class="prototype-name" value="" placeholder="Prototype name">
                    <button class="btn-icon-small remove-prototype" data-index="${newIndex}">✕</button>
                </div>
                <input type="text" class="prototype-link" value="" placeholder="File path or URL">
                <textarea class="prototype-notes" rows="2" placeholder="Notes about this prototype"></textarea>
            `;
            list.appendChild(protoItem);
        });
        
        // Remove prototype
        document.getElementById('prototypesList').addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-prototype')) {
                e.target.closest('.prototype-item').remove();
                const list = document.getElementById('prototypesList');
                if (list.children.length === 0) {
                    list.innerHTML = '<p class="empty-state-small">No prototypes yet</p>';
                }
            }
        });
        
        // Save prototypes
        document.getElementById('savePrototypesBtn').addEventListener('click', () => {
            mechanic.prototypes = [];
            document.querySelectorAll('.prototype-item').forEach(item => {
                const name = item.querySelector('.prototype-name').value.trim();
                const link = item.querySelector('.prototype-link').value.trim();
                const notes = item.querySelector('.prototype-notes').value.trim();
                if (name) {
                    mechanic.prototypes.push({ name, link, notes });
                }
            });
            AppState.save();
            alert('Prototypes saved!');
            Modal.close();
        });
    },
    
    deleteMechanic(mechanicId) {
        const mechanicToDelete = AppState.mechanics.find(m => m.id === mechanicId);
        
        RelationshipManager.confirmDeleteWithImpact(mechanicId, mechanicToDelete.name, 'mechanic', () => {
            AppState.mechanics = AppState.mechanics.filter(m => m.id !== mechanicId);
            AppState.save();
            
            // Clean up any orphaned relationships
            RelationshipManager.cleanupOrphanedRelationships();
            
            this.render();
            
            // Refresh other sections
            RelationshipManager.refreshAllSections();
        });
    },
    
    render() {
        const container = document.getElementById('mechanicsList');
        
        if (AppState.mechanics.length === 0) {
            container.innerHTML = '<div class="empty-state">No mechanics yet. Document your first game mechanic!</div>';
            return;
        }
        
        // Apply filters and sorting
        const filteredMechanics = this.filterAndSortMechanics(AppState.mechanics);
        
        if (filteredMechanics.length === 0) {
            container.innerHTML = '<div class="empty-state">No mechanics match the current filters.</div>';
            return;
        }
        
        // Group by category
        const categories = {
            movement: [],
            combat: [],
            ui: [],
            gameplay: [],
            ai: [],
            physics: [],
            networking: [],
            audio: [],
            graphics: [],
            other: []
        };
        
        filteredMechanics.forEach(mechanic => {
            if (categories[mechanic.category]) {
                categories[mechanic.category].push(mechanic);
            } else {
                categories.other.push(mechanic);
            }
        });
        
        const categoryNames = {
            movement: '🏃 Movement',
            combat: '<img src="icons/misc/combat.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Combat',
            ui: '<img src="icons/misc/ui.svg" alt="" width="14" height="14" style="vertical-align: middle;"> UI/UX',
            gameplay: '🎮 Gameplay',
            ai: '🤖 AI',
            physics: '<img src="icons/misc/physics.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Physics',
            networking: '🌐 Networking',
            audio: '🔊 Audio',
            graphics: '🎨 Graphics',
            other: '📦 Other'
        };
        
        const priorityLabels = {
            critical: '🔴 Critical',
            high: '🟠 High',
            medium: '🟡 Medium',
            low: '🟢 Low'
        };
        
        const statusLabels = {
            'not-started': 'Not Started',
            'in-progress': 'In Progress',
            'testing': 'Testing',
            'complete': 'Complete'
        };
        
        let html = '';
        
        Object.keys(categories).forEach(category => {
            if (categories[category].length > 0) {
                html += `
                    <div class="mechanics-category">
                        <h3 class="category-title">${categoryNames[category]} (${categories[category].length})</h3>
                        <div class="mechanics-grid">
                `;
                
                categories[category].forEach(mechanic => {
                    const dependencyNames = mechanic.dependencies?.map(depId => {
                        const dep = AppState.mechanics.find(m => m.id === depId);
                        return dep ? dep.name : null;
                    }).filter(n => n);
                    
                    const testsPassed = mechanic.tests?.filter(t => t.passed).length || 0;
                    const testsTotal = mechanic.tests?.length || 0;
                    
                    html += `
                        <div class="mechanic-card ${BulkOperations.enabled ? 'bulk-mode' : ''}" data-id="${mechanic.id}">
                            ${BulkOperations.enabled ? `
                                <div class="bulk-checkbox">
                                    <input type="checkbox" 
                                           ${BulkOperations.hasItem(mechanic.id, 'mechanic') ? 'checked' : ''}
                                           onchange="BulkOperations.toggleItem('${mechanic.id}', 'mechanic'); event.stopPropagation();" />
                                </div>
                            ` : ''}
                            <div class="mechanic-header">
                                <div class="mechanic-title-row">
                                    <h4 class="mechanic-name">${Utils.escapeHtml(mechanic.name)}</h4>
                                    <span class="mechanic-priority priority-${mechanic.priority || 'medium'}">${priorityLabels[mechanic.priority || 'medium']}</span>
                                </div>
                                <div class="mechanic-badges">
                                    <span class="mechanic-status status-${mechanic.status || 'not-started'}">${statusLabels[mechanic.status || 'not-started']}</span>
                                    ${mechanic.complexity ? `<span class="complexity-badge complexity-${mechanic.complexity}">${mechanic.complexity}</span>` : ''}
                                </div>
                            </div>
                            
                            <div class="mechanic-description">${Utils.escapeHtml(mechanic.description)}</div>
                            
                            ${mechanic.tags && mechanic.tags.length > 0 ? `
                                <div class="mechanic-tags">
                                    ${mechanic.tags.map(tag => `<span class="mechanic-tag">${Utils.escapeHtml(tag)}</span>`).join(' ')}
                                </div>
                            ` : ''}
                            
                            ${dependencyNames && dependencyNames.length > 0 ? `
                                <div class="mechanic-dependencies">
                                    <strong><img src="icons/status/pin.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Depends on:</strong> ${dependencyNames.map(name => `<span class="dependency-tag">${Utils.escapeHtml(name)}</span>`).join(' ')}
                                </div>
                            ` : ''}
                            
                            ${mechanic.implementation ? `
                                <details class="mechanic-implementation">
                                    <summary>💻 Implementation Notes</summary>
                                    <pre>${Utils.escapeHtml(mechanic.implementation)}</pre>
                                </details>
                            ` : ''}
                            
                            ${mechanic.codeReferences ? `
                                <div class="mechanic-code-refs">
                                    <strong><img src="icons/misc/folder.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Code:</strong> <code>${Utils.escapeHtml(mechanic.codeReferences)}</code>
                                </div>
                            ` : ''}
                            
                            ${Utils.renderConnections(mechanic)}
                            
                            <div class="mechanic-footer">
                                <div class="mechanic-stats">
                                    ${testsTotal > 0 ? `<span class="mechanic-stat">📝 Tests: ${testsPassed}/${testsTotal}</span>` : ''}
                                    ${mechanic.prototypes?.length > 0 ? `<span class="mechanic-stat">🎮 Prototypes: ${mechanic.prototypes.length}</span>` : ''}
                                </div>
                                <div class="mechanic-actions">
                                    <button class="btn btn-small btn-secondary" onclick="MechanicsManager.openAddModal(AppState.mechanics.find(m => m.id === '${mechanic.id}'))">Edit</button>
                                    <button class="btn btn-small btn-secondary" onclick="TemplateManager.saveAsTemplate(AppState.mechanics.find(m => m.id === '${mechanic.id}'), 'mechanic')" title="Save as reusable template"><img src="icons/actions/save.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Template</button>
                                    <button class="btn btn-small btn-danger" onclick="MechanicsManager.deleteMechanic('${mechanic.id}')">Delete</button>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            }
        });
        
        container.innerHTML = html;
        
        // Make relationship chips clickable
        RelationshipManager.makeChipsClickable(container);
    }
};

// ============================================
// Milestone Planner
// ============================================
// Manages project milestones and major deliverables
// Tracks milestone progress, due dates, and task relationships
// Provides progress visualization and deadline tracking
// Supports milestone phases and sequential tracking
const MilestonePlanner = {
    /**
     * Initializes milestone planner
     * Attaches listeners to add milestone button
     */
    init() {
        document.getElementById('addMilestoneBtn').addEventListener('click', () => this.openAddModal());
        this.render();
    },
    
    /**
     * Opens modal for creating or editing a milestone
     * @param {Object} milestoneToEdit - Optional milestone object for editing
     */
    openAddModal(milestoneToEdit = null) {
        const isEdit = milestoneToEdit !== null;
        const formHtml = `
            <form class="modal-form" id="milestoneForm">
                <h3>${isEdit ? 'Edit Milestone' : 'Add New Milestone'}</h3>
                
                <div class="form-group">
                    <label for="milestoneTitle">Title *</label>
                    <input type="text" id="milestoneTitle" required value="${isEdit ? Utils.escapeHtml(milestoneToEdit.title) : ''}">
                </div>
                
                <div class="form-group">
                    <label for="milestoneDescription">Description</label>
                    <textarea id="milestoneDescription">${isEdit ? Utils.escapeHtml(milestoneToEdit.description) : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="milestoneDueDate">Due Date</label>
                    <input type="date" id="milestoneDueDate" value="${isEdit ? milestoneToEdit.dueDate : ''}">
                </div>
                
                <div class="form-group">
                    <label for="milestoneProgress">Progress (%)</label>
                    <input type="number" id="milestoneProgress" min="0" max="100" value="${isEdit ? milestoneToEdit.progress : 0}">
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Milestone</button>
                </div>
            </form>
        `;
        
        Modal.open(formHtml);
        
        document.getElementById('milestoneForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const milestoneData = {
                id: isEdit ? milestoneToEdit.id : Utils.generateId(),
                title: document.getElementById('milestoneTitle').value.trim(),
                description: document.getElementById('milestoneDescription').value.trim(),
                dueDate: document.getElementById('milestoneDueDate').value,
                progress: parseInt(document.getElementById('milestoneProgress').value),
                createdAt: isEdit ? milestoneToEdit.createdAt : new Date().toISOString()
            };
            
            if (isEdit) {
                const index = AppState.milestones.findIndex(m => m.id === milestoneToEdit.id);
                AppState.milestones[index] = milestoneData;
            } else {
                AppState.milestones.push(milestoneData);
            }
            
            AppState.save();
            this.render();
            Dashboard.refresh();
            Modal.close();
        });
    },
    
    deleteMilestone(milestoneId) {
        Utils.showConfirm('Are you sure you want to delete this milestone?', () => {
            AppState.milestones = AppState.milestones.filter(m => m.id !== milestoneId);
            AppState.save();
            this.render();
            Dashboard.refresh();
        });
    },
    
    render() {
        const container = document.getElementById('milestonesList');
        
        if (AppState.milestones.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        // Sort by due date
        const sortedMilestones = [...AppState.milestones].sort((a, b) => 
            new Date(a.dueDate) - new Date(b.dueDate)
        );
        
        container.innerHTML = sortedMilestones.map(milestone => `
            <div class="milestone-card">
                <div class="milestone-header">
                    <div>
                        <div class="milestone-title">${Utils.escapeHtml(milestone.title)}</div>
                        <div class="milestone-date">Due: ${Utils.formatDate(milestone.dueDate)}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-small btn-secondary" onclick="MilestonePlanner.openAddModal(AppState.milestones.find(m => m.id === '${milestone.id}'))">Edit</button>
                        <button class="btn btn-small btn-danger" onclick="MilestonePlanner.deleteMilestone('${milestone.id}')">Delete</button>
                    </div>
                </div>
                
                ${milestone.description ? `<div class="milestone-description">${Utils.escapeHtml(milestone.description)}</div>` : ''}
                
                <div class="progress-bar-container">
                    <div class="progress-label">
                        <span>Progress</span>
                        <span><strong>${milestone.progress}%</strong></span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${milestone.progress}%"></div>
                    </div>
                </div>
            </div>
        `).join('');
    }
};

// ============================================
// Notes Manager
// ============================================
// Manages rich note-taking with categories and tags
// Supports note organization by category, color coding, and flexible tagging
// Provides search, filter, and sort capabilities
// Includes archive feature and related item linking
// Can display notes in grid or list view
const NotesManager = {
    currentView: 'grid',  // Display mode: 'grid' or 'list'
    currentFilter: {      // Active filters
        search: '',       // Text search
        category: '',     // Filter by category
        tag: '',          // Filter by tag
        sort: 'modified'  // Sort: modified, created, title, category
    },
    noteColors: ['', '#FFB3B3', '#B3D9FF', '#B3FFB3', '#FFE5B3', '#FFB3FF', '#E0E0E0'],  // Color palette for notes
    
    /**
     * Initializes notes manager
     * Attaches listeners to search, filter, and sort controls
     * Sets up view toggle between grid and list
     */
    init() {
        document.getElementById('addNoteBtn').addEventListener('click', () => this.openNoteModal());
        
        // Search input listener
        document.getElementById('notesSearchInput').addEventListener('input', (e) => {
            this.currentFilter.search = e.target.value.toLowerCase();
            this.render();
        });
        
        // Category filter
        document.getElementById('notesCategoryFilter').addEventListener('change', (e) => {
            this.currentFilter.category = e.target.value;
            this.render();
        });
        
        // Tag filter
        document.getElementById('notesTagFilter').addEventListener('change', (e) => {
            this.currentFilter.tag = e.target.value;
            this.render();
        });
        
        // Sort option
        document.getElementById('notesSortFilter').addEventListener('change', (e) => {
            this.currentFilter.sort = e.target.value;
            this.render();
        });
        
        // View toggle
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentView = btn.dataset.view;
                this.render();
            });
        });
        
        this.render();
    },
    
    openNoteModal(noteToEdit = null) {
        const isEdit = noteToEdit !== null;
        
        // Build category options
        const categoryOptions = AppState.noteCategories.map(cat => 
            `<option value="${Utils.escapeHtml(cat)}" ${isEdit && noteToEdit.category === cat ? 'selected' : ''}>${Utils.escapeHtml(cat)}</option>`
        ).join('');
        
        const formHtml = `
            <form class="modal-form note-modal-form" id="noteForm">
                <h3>${isEdit ? 'Edit Note' : 'New Note'}</h3>
                
                <div class="form-group">
                    <label for="noteTitle">Title *</label>
                    <input type="text" id="noteTitle" required value="${isEdit ? Utils.escapeHtml(noteToEdit.title) : ''}" placeholder="Enter note title">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="noteCategory">Category</label>
                        <select id="noteCategory">
                            ${categoryOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="noteTags">Tags (comma-separated)</label>
                        <input type="text" id="noteTags" placeholder="tag1, tag2, tag3" value="${isEdit ? noteToEdit.tags.join(', ') : ''}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Note Type</label>
                    <div class="note-type-tabs">
                        <button type="button" class="note-type-tab ${(!isEdit || (!noteToEdit.checklist && !noteToEdit.drawing)) ? 'active' : ''}" data-type="text">
                            <img src="icons/misc/document.svg" alt="" width="16" height="16"> Text
                        </button>
                        <button type="button" class="note-type-tab ${(isEdit && noteToEdit.checklist) ? 'active' : ''}" data-type="checklist">
                            <img src="icons/misc/checklist.svg" alt="" width="16" height="16"> Checklist
                        </button>
                        <button type="button" class="note-type-tab ${(isEdit && noteToEdit.drawing) ? 'active' : ''}" data-type="drawing">
                            <img src="icons/misc/sketch.svg" alt="" width="16" height="16"> Sketch
                        </button>
                    </div>
                </div>
                
                <div class="form-group note-content-text" style="display: ${(!isEdit || (!noteToEdit.checklist && !noteToEdit.drawing)) ? 'block' : 'none'}">
                    <label for="noteContent">Content</label>
                    <textarea id="noteContent" rows="15" placeholder="Write your note here... Supports markdown!">${isEdit && !noteToEdit.checklist && !noteToEdit.drawing ? Utils.escapeHtml(noteToEdit.content) : ''}</textarea>
                </div>
                
                <div class="form-group note-content-checklist" style="display: ${(isEdit && noteToEdit.checklist) ? 'block' : 'none'}">
                    <label>Checklist Items</label>
                    <div id="checklistItems" class="checklist-editor">
                        ${isEdit && noteToEdit.checklist ? noteToEdit.checklist.map((item, index) => `
                            <div class="checklist-item-edit" data-index="${index}">
                                <input type="checkbox" ${item.checked ? 'checked' : ''} disabled>
                                <input type="text" value="${Utils.escapeHtml(item.text)}" placeholder="Item text">
                                <button type="button" class="btn-icon remove-checklist-item" title="Remove">
                                    <img src="icons/actions/delete.svg" alt="" width="16" height="16">
                                </button>
                            </div>
                        `).join('') : ''}
                    </div>
                    <button type="button" class="btn btn-small" id="addChecklistItem">
                        <img src="icons/actions/add.svg" alt="" width="14" height="14"> Add Item
                    </button>
                </div>
                
                <div class="form-group note-content-drawing" style="display: ${(isEdit && noteToEdit.drawing) ? 'block' : 'none'}">
                    <label>Sketch Canvas</label>
                    <div class="drawing-tools">
                        <button type="button" class="drawing-tool active" data-tool="pen" title="Pen">
                            <img src="icons/misc/pen.svg" alt="" width="16" height="16">
                        </button>
                        <button type="button" class="drawing-tool" data-tool="eraser" title="Eraser">
                            <img src="icons/misc/eraser.svg" alt="" width="16" height="16">
                        </button>
                        <input type="color" id="drawingColor" value="#000000" title="Color">
                        <input type="range" id="drawingSize" min="1" max="20" value="3" title="Brush Size">
                        <button type="button" class="btn btn-small" id="clearCanvas" title="Clear Canvas">
                            <img src="icons/actions/delete.svg" alt="" width="14" height="14"> Clear
                        </button>
                    </div>
                    <canvas id="drawingCanvas" width="600" height="400"></canvas>
                </div>
                
                <div class="form-group">
                    <label>Color</label>
                    <div class="color-picker">
                        ${this.noteColors.map(color => `
                            <div class="color-option ${isEdit && noteToEdit.color === color ? 'selected' : ''} ${!color ? 'no-color' : ''}" 
                                 data-color="${color}" 
                                 style="background-color: ${color || '#ffffff'}; ${!color ? 'border: 2px solid #ccc;' : ''}">
                                ${(isEdit && noteToEdit.color === color) || (!isEdit && !color) ? '✓' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="notePinned" ${isEdit && noteToEdit.pinned ? 'checked' : ''}>
                        <span>Pin this note</span>
                    </label>
                </div>
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="noteReminderEnabled" ${isEdit && noteToEdit.reminderEnabled ? 'checked' : ''}>
                        <span>
                            <img src="icons/misc/clock.svg" alt="" width="16" height="16" style="vertical-align: middle; margin-right: 4px;">
                            Set Reminder
                        </span>
                    </label>
                </div>
                
                <div class="form-row reminder-inputs" style="display: ${isEdit && noteToEdit.reminderEnabled ? 'flex' : 'none'}">
                    <div class="form-group">
                        <label for="noteReminderDate">Date</label>
                        <input type="date" id="noteReminderDate" value="${isEdit && noteToEdit.reminderDate ? noteToEdit.reminderDate : ''}">
                    </div>
                    <div class="form-group">
                        <label for="noteReminderTime">Time</label>
                        <input type="time" id="noteReminderTime" value="${isEdit && noteToEdit.reminderTime ? noteToEdit.reminderTime : ''}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label><img src="icons/misc/link.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Related Items</label>
                    <button type="button" class="btn btn-secondary" id="manageNoteRelations" style="width: 100%;">
                        Manage Related Items <span id="relationCount">${isEdit && noteToEdit.relatedItems ? `(${noteToEdit.relatedItems.length})` : '(0)'}</span>
                    </button>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancelNoteBtn">Cancel</button>
                    ${isEdit ? '<button type="button" class="btn btn-danger" id="archiveNoteBtn">Archive</button>' : ''}
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'} Note</button>
                </div>
            </form>
        `;
        
        Modal.open(formHtml);
        
        // Auto-resize textarea
        const textarea = document.getElementById('noteContent');
        if (textarea) {
            const autoResize = () => {
                textarea.style.height = 'auto';
                textarea.style.height = Math.max(300, textarea.scrollHeight) + 'px';
            };
            
            textarea.addEventListener('input', autoResize);
            // Initial resize
            setTimeout(autoResize, 10);
        }
        
        // Note type tabs
        document.querySelectorAll('.note-type-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.note-type-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const type = tab.dataset.type;
                document.querySelector('.note-content-text').style.display = type === 'text' ? 'block' : 'none';
                document.querySelector('.note-content-checklist').style.display = type === 'checklist' ? 'block' : 'none';
                document.querySelector('.note-content-drawing').style.display = type === 'drawing' ? 'block' : 'none';
                
                if (type === 'drawing') {
                    setTimeout(() => this.initDrawingCanvas(isEdit ? noteToEdit : null), 50);
                }
            });
        });
        
        // Add checklist item
        document.getElementById('addChecklistItem')?.addEventListener('click', () => {
            const container = document.getElementById('checklistItems');
            const index = container.children.length;
            const itemHtml = `
                <div class="checklist-item-edit" data-index="${index}">
                    <input type="checkbox" disabled>
                    <input type="text" placeholder="Item text">
                    <button type="button" class="btn-icon remove-checklist-item" title="Remove">
                        <img src="icons/actions/delete.svg" alt="" width="16" height="16">
                    </button>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', itemHtml);
            this.setupChecklistItemRemoval();
        });
        
        // Setup removal for existing checklist items
        this.setupChecklistItemRemoval();
        
        // Color picker functionality
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.color-option').forEach(o => {
                    o.classList.remove('selected');
                    o.textContent = '';
                });
                option.classList.add('selected');
                option.textContent = '✓';
            });
        });
        
        // Reminder toggle functionality
        document.getElementById('noteReminderEnabled')?.addEventListener('change', (e) => {
            const reminderInputs = document.querySelector('.reminder-inputs');
            reminderInputs.style.display = e.target.checked ? 'flex' : 'none';
        });
        
        // Store related items temporarily
        let tempRelatedItems = (isEdit && noteToEdit.relatedItems) ? [...noteToEdit.relatedItems] : [];
        
        // Manage Related Items button
        document.getElementById('manageNoteRelations')?.addEventListener('click', () => {
            const currentItem = {
                id: isEdit ? noteToEdit.id : 'temp-' + Utils.generateId(),
                type: 'note',
                name: document.getElementById('noteTitle').value.trim() || 'Untitled Note',
                data: { relatedItems: tempRelatedItems }
            };
            
            RelationshipManager.openRelationshipSelector(currentItem, (selectedItems) => {
                tempRelatedItems = selectedItems;
                document.getElementById('relationCount').textContent = `(${selectedItems.length})`;
            });
        });
        
        // Archive button
        if (isEdit) {
            document.getElementById('archiveNoteBtn').addEventListener('click', () => {
                Utils.showConfirm('Archive this note? You can view archived notes later.', () => {
                    noteToEdit.archived = true;
                    noteToEdit.modifiedAt = new Date().toISOString();
                    AppState.save();
                    this.render();
                    Modal.close();
                    this.showNotification('Note archived');
                });
            });
        }
        
        document.getElementById('noteForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const tags = document.getElementById('noteTags').value
                .split(',')
                .map(t => t.trim())
                .filter(t => t);
            
            const selectedColor = document.querySelector('.color-option.selected');
            const color = selectedColor ? selectedColor.dataset.color : '';
            
            const activeType = document.querySelector('.note-type-tab.active').dataset.type;
            
            const noteData = {
                id: isEdit ? noteToEdit.id : Utils.generateId(),
                title: document.getElementById('noteTitle').value.trim(),
                category: document.getElementById('noteCategory').value,
                tags: tags,
                color: color,
                pinned: document.getElementById('notePinned').checked,
                archived: isEdit ? noteToEdit.archived : false,
                createdAt: isEdit ? noteToEdit.createdAt : new Date().toISOString(),
                modifiedAt: new Date().toISOString(),
                reminderEnabled: document.getElementById('noteReminderEnabled')?.checked || false,
                reminderDate: document.getElementById('noteReminderDate')?.value || '',
                reminderTime: document.getElementById('noteReminderTime')?.value || '',
                reminderDismissed: isEdit ? (noteToEdit.reminderDismissed || false) : false,
                relatedItems: tempRelatedItems || []
            };
            
            // Handle content based on type
            if (activeType === 'checklist') {
                const items = [];
                document.querySelectorAll('.checklist-item-edit').forEach(itemEl => {
                    const text = itemEl.querySelector('input[type="text"]').value.trim();
                    if (text) {
                        items.push({
                            text: text,
                            checked: itemEl.querySelector('input[type="checkbox"]').checked
                        });
                    }
                });
                noteData.checklist = items;
                noteData.content = '';
                noteData.drawing = null;
            } else if (activeType === 'drawing') {
                const canvas = document.getElementById('drawingCanvas');
                noteData.drawing = canvas ? canvas.toDataURL() : null;
                noteData.content = '';
                noteData.checklist = null;
            } else {
                noteData.content = document.getElementById('noteContent').value.trim();
                noteData.checklist = null;
                noteData.drawing = null;
            }
            
            // Sync bidirectional relationships
            const oldRelatedItems = isEdit && noteToEdit.relatedItems ? noteToEdit.relatedItems : [];
            RelationshipManager.syncRelationships(
                { id: noteData.id, type: 'note' },
                oldRelatedItems,
                noteData.relatedItems
            );
            
            if (isEdit) {
                const index = AppState.notes.findIndex(n => n.id === noteToEdit.id);
                AppState.notes[index] = noteData;
            } else {
                AppState.notes.push(noteData);
            }
            
            AppState.save();
            this.render();
            
            // Refresh other sections if relationships changed to update "Referenced By" displays
            RelationshipManager.refreshAllSections();
            
            Modal.close();
            this.showNotification(isEdit ? 'Note updated!' : 'Note created!');
        });
        
        document.getElementById('cancelNoteBtn').addEventListener('click', () => Modal.close());
    },
    
    setupChecklistItemRemoval() {
        document.querySelectorAll('.remove-checklist-item').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));  // Remove old listeners
        });
        document.querySelectorAll('.remove-checklist-item').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.checklist-item-edit').remove();
            });
        });
    },
    
    initDrawingCanvas(noteToEdit = null) {
        const canvas = document.getElementById('drawingCanvas');
        if (!canvas) return;
        
        // Set canvas resolution to match display size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        let currentTool = 'pen';
        let currentColor = '#000000';
        let currentSize = 3;
        
        // Load existing drawing if editing
        if (noteToEdit && noteToEdit.drawing) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = noteToEdit.drawing;
        } else {
            // Clear canvas with white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Drawing tools
        document.querySelectorAll('.drawing-tool').forEach(tool => {
            tool.addEventListener('click', () => {
                document.querySelectorAll('.drawing-tool').forEach(t => t.classList.remove('active'));
                tool.classList.add('active');
                currentTool = tool.dataset.tool;
            });
        });
        
        document.getElementById('drawingColor')?.addEventListener('change', (e) => {
            currentColor = e.target.value;
        });
        
        document.getElementById('drawingSize')?.addEventListener('input', (e) => {
            currentSize = parseInt(e.target.value);
        });
        
        document.getElementById('clearCanvas')?.addEventListener('click', () => {
            Utils.showConfirm('Clear the entire canvas?', () => {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            });
        });
        
        // Drawing events
        const getCanvasCoords = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        };
        
        const startDrawing = (e) => {
            isDrawing = true;
            const coords = getCanvasCoords(e);
            
            ctx.beginPath();
            ctx.moveTo(coords.x, coords.y);
        };
        
        const draw = (e) => {
            if (!isDrawing) return;
            
            const coords = getCanvasCoords(e);
            
            if (currentTool === 'pen') {
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = currentSize;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            } else if (currentTool === 'eraser') {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = currentSize * 3;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            }
            
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
        };
        
        const stopDrawing = () => {
            if (isDrawing) {
                ctx.closePath();
                isDrawing = false;
            }
        };
        
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
    },
    
    toggleChecklistItem(noteId, itemIndex) {
        const note = AppState.notes.find(n => n.id === noteId);
        if (note && note.checklist && note.checklist[itemIndex]) {
            note.checklist[itemIndex].checked = !note.checklist[itemIndex].checked;
            note.modifiedAt = new Date().toISOString();
            AppState.save();
            this.render();
        }
    },
    
    deleteNote(noteId) {
        Utils.showConfirm('Permanently delete this note? This cannot be undone.', () => {
            AppState.notes = AppState.notes.filter(n => n.id !== noteId);
            AppState.save();
            
            // Clean up any orphaned relationships to this deleted note
            RelationshipManager.cleanupOrphanedRelationships();
            
            this.render();
            
            // Refresh other sections to remove references to deleted note
            RelationshipManager.refreshAllSections();
            
            this.showNotification('Note deleted');
        });
    },
    
    togglePin(noteId) {
        const note = AppState.notes.find(n => n.id === noteId);
        if (note) {
            note.pinned = !note.pinned;
            note.modifiedAt = new Date().toISOString();
            AppState.save();
            this.render();
        }
    },
    
    checkReminders() {
        const now = new Date();
        const dueReminders = AppState.notes.filter(note => {
            if (!note.reminderEnabled || !note.reminderDate || note.reminderDismissed || note.archived) {
                return false;
            }
            const reminderDateTime = new Date(`${note.reminderDate}T${note.reminderTime || '00:00'}`);
            return reminderDateTime <= now;
        });
        
        if (dueReminders.length > 0) {
            // Show the first due reminder
            this.showReminderPopup(dueReminders[0]);
        }
    },
    
    showReminderPopup(note) {
        const reminderDateTime = new Date(`${note.reminderDate}T${note.reminderTime || '00:00'}`);
        const formattedDate = Utils.formatDate(note.reminderDate);
        const formattedTime = note.reminderTime || '00:00';
        
        let contentPreview = '';
        if (note.checklist) {
            const checkedCount = note.checklist.filter(item => item.checked).length;
            contentPreview = `Checklist: ${checkedCount}/${note.checklist.length} completed`;
        } else if (note.drawing) {
            contentPreview = 'Sketch note';
        } else {
            contentPreview = note.content.substring(0, 200) + (note.content.length > 200 ? '...' : '');
        }
        
        const popupHtml = `
            <div class="reminder-popup-overlay">
                <div class="reminder-popup">
                    <div class="reminder-popup-header">
                        <img src="icons/misc/clock.svg" alt="" width="24" height="24">
                        <h3>Reminder</h3>
                    </div>
                    <div class="reminder-popup-content">
                        <h4>${Utils.escapeHtml(note.title)}</h4>
                        <div class="reminder-popup-time">
                            <strong>Due:</strong> ${formattedDate} at ${formattedTime}
                        </div>
                        ${note.category ? `<div class="reminder-popup-category">${Utils.escapeHtml(note.category)}</div>` : ''}
                        <div class="reminder-popup-preview">${Utils.escapeHtml(contentPreview)}</div>
                    </div>
                    <div class="reminder-popup-actions">
                        <button class="btn btn-secondary" onclick="NotesManager.snoozeReminder('${note.id}', 15)">Snooze 15min</button>
                        <button class="btn btn-secondary" onclick="NotesManager.snoozeReminder('${note.id}', 60)">Snooze 1hr</button>
                        <button class="btn btn-secondary" onclick="NotesManager.snoozeReminder('${note.id}', 1440)">Snooze 1 day</button>
                        <button class="btn btn-primary" onclick="NotesManager.markReminderComplete('${note.id}')">Mark Complete</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', popupHtml);
    },
    
    snoozeReminder(noteId, minutes) {
        const note = AppState.notes.find(n => n.id === noteId);
        if (note) {
            const now = new Date();
            const snoozeUntil = new Date(now.getTime() + minutes * 60000);
            note.reminderDate = snoozeUntil.toISOString().split('T')[0];
            note.reminderTime = snoozeUntil.toTimeString().substring(0, 5);
            AppState.save();
            this.closeReminderPopup();
            this.render();
            this.showNotification(`Reminder snoozed for ${minutes >= 1440 ? Math.floor(minutes/1440) + ' day(s)' : minutes >= 60 ? Math.floor(minutes/60) + ' hour(s)' : minutes + ' minutes'}`);
        }
    },
    
    markReminderComplete(noteId) {
        const note = AppState.notes.find(n => n.id === noteId);
        if (note) {
            note.reminderDismissed = true;
            note.modifiedAt = new Date().toISOString();
            AppState.save();
            this.closeReminderPopup();
            this.render();
            Dashboard.updateStats();
            this.showNotification('Reminder marked as complete');
        }
    },
    
    closeReminderPopup() {
        const popup = document.querySelector('.reminder-popup-overlay');
        if (popup) {
            popup.remove();
        }
    },
    
    duplicateNote(noteId) {
        const note = AppState.notes.find(n => n.id === noteId);
        if (note) {
            const duplicate = {
                ...note,
                id: Utils.generateId(),
                title: note.title + ' (Copy)',
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString()
            };
            AppState.notes.push(duplicate);
            AppState.save();
            this.render();
            this.showNotification('Note duplicated!');
        }
    },
    
    exportNote(noteId) {
        const note = AppState.notes.find(n => n.id === noteId);
        if (note) {
            const content = `# ${note.title}\n\n${note.content}`;
            const blob = new Blob([content], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${note.title.replace(/[^a-z0-9]/gi, '_')}.md`;
            a.click();
            URL.revokeObjectURL(url);
            this.showNotification('Note exported!');
        }
    },
    
    getFilteredNotes() {
        let filtered = AppState.notes.filter(note => !note.archived);
        
        // Search filter
        if (this.currentFilter.search) {
            filtered = filtered.filter(note => 
                note.title.toLowerCase().includes(this.currentFilter.search) ||
                note.content.toLowerCase().includes(this.currentFilter.search) ||
                note.tags.some(tag => tag.toLowerCase().includes(this.currentFilter.search))
            );
        }
        
        // Category filter
        if (this.currentFilter.category) {
            filtered = filtered.filter(note => note.category === this.currentFilter.category);
        }
        
        // Tag filter
        if (this.currentFilter.tag) {
            filtered = filtered.filter(note => note.tags.includes(this.currentFilter.tag));
        }
        
        // Sort
        filtered.sort((a, b) => {
            switch (this.currentFilter.sort) {
                case 'pinned':
                    if (a.pinned && !b.pinned) return -1;
                    if (!a.pinned && b.pinned) return 1;
                    return new Date(b.modifiedAt) - new Date(a.modifiedAt);
                case 'created':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'modified':
                default:
                    return new Date(b.modifiedAt) - new Date(a.modifiedAt);
            }
        });
        
        // Always put pinned notes first
        return filtered.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return 0;
        });
    },
    
    render() {
        const container = document.getElementById('notesContainer');
        const notes = this.getFilteredNotes();
        
        // Update category filter
        const categoryFilter = document.getElementById('notesCategoryFilter');
        const currentCategoryValue = categoryFilter.value;
        categoryFilter.innerHTML = '<option value="">All Categories</option>' + 
            AppState.noteCategories.map(cat => `<option value="${Utils.escapeHtml(cat)}">${Utils.escapeHtml(cat)}</option>`).join('');
        categoryFilter.value = currentCategoryValue;
        
        // Update tag filter
        const allTags = [...new Set(AppState.notes.flatMap(n => n.tags))].sort();
        const tagFilter = document.getElementById('notesTagFilter');
        const currentTagValue = tagFilter.value;
        tagFilter.innerHTML = '<option value="">All Tags</option>' + 
            allTags.map(tag => `<option value="${Utils.escapeHtml(tag)}">${Utils.escapeHtml(tag)}</option>`).join('');
        tagFilter.value = currentTagValue;
        
        if (notes.length === 0) {
            container.innerHTML = '<div class="empty-state">No notes found. Create your first note!</div>';
            container.className = 'notes-grid';
            return;
        }
        
        container.className = this.currentView === 'grid' ? 'notes-grid' : 'notes-list';
        
        const notesHtml = notes.map(note => {
            let preview, wordCount, contentDisplay, noteIcon = '';
            
            if (note.checklist) {
                const checkedCount = note.checklist.filter(item => item.checked).length;
                const totalCount = note.checklist.length;
                preview = `Checklist: ${checkedCount}/${totalCount} completed`;
                wordCount = totalCount;
                noteIcon = '<img src="icons/misc/checklist.svg" alt="" width="16" height="16" style="vertical-align: middle; margin-right: 4px;">';
                contentDisplay = `
                    <div class="note-card-checklist" onclick="event.stopPropagation()">
                        ${note.checklist.slice(0, 5).map((item, index) => `
                            <div class="checklist-item">
                                <input type="checkbox" 
                                       ${item.checked ? 'checked' : ''} 
                                       onchange="NotesManager.toggleChecklistItem('${note.id}', ${index})">
                                <span class="${item.checked ? 'checked' : ''}">${Utils.escapeHtml(item.text)}</span>
                            </div>
                        `).join('')}
                        ${note.checklist.length > 5 ? `<div class="checklist-more">+${note.checklist.length - 5} more...</div>` : ''}
                    </div>
                `;
            } else if (note.drawing) {
                preview = 'Sketch';
                wordCount = 0;
                noteIcon = '<img src="icons/misc/sketch.svg" alt="" width="16" height="16" style="vertical-align: middle; margin-right: 4px;">';
                contentDisplay = `
                    <div class="note-card-drawing">
                        <img src="${note.drawing}" alt="Sketch" style="max-width: 100%; border-radius: 4px;">
                    </div>
                `;
            } else {
                preview = note.content.substring(0, 150);
                wordCount = note.content.split(/\s+/).filter(w => w).length;
                contentDisplay = `<div class="note-card-preview">${Utils.escapeHtml(preview)}${note.content.length > 150 ? '...' : ''}</div>`;
            }
            
            // Check reminder status
            let reminderBadge = '';
            if (note.reminderEnabled && note.reminderDate && !note.reminderDismissed) {
                const reminderDateTime = new Date(`${note.reminderDate}T${note.reminderTime || '00:00'}`);
                const now = new Date();
                const isOverdue = reminderDateTime < now;
                const reminderClass = isOverdue ? 'reminder-overdue' : 'reminder-upcoming';
                const reminderText = isOverdue ? 'Overdue' : Utils.formatDate(note.reminderDate);
                reminderBadge = `
                    <div class="note-reminder-badge ${reminderClass}">
                        <img src="icons/misc/clock.svg" alt="" width="14" height="14">
                        <span>${reminderText}</span>
                    </div>
                `;
            }
            
            return `
                <div class="note-card ${note.pinned ? 'pinned' : ''}" 
                     style="${note.color ? `background-color: ${note.color};` : ''}"
                     onclick="NotesManager.openNoteModal(AppState.notes.find(n => n.id === '${note.id}'))">
                    ${note.pinned ? '<div class="pin-indicator">' + Utils.icon('status/pinned', 'small') + '</div>' : ''}
                    ${reminderBadge}
                    <div class="note-card-header">
                        <h3 class="note-card-title">
                            ${noteIcon}
                            ${Utils.escapeHtml(note.title)}
                        </h3>
                        <div class="note-card-actions" onclick="event.stopPropagation()">
                            <button class="note-action-btn" onclick="NotesManager.togglePin('${note.id}')" title="${note.pinned ? 'Unpin' : 'Pin'}">
                                <img src="icons/status/${note.pinned ? 'pinned' : 'pin'}.svg" alt="" width="16" height="16">
                            </button>
                            <button class="note-action-btn" onclick="NotesManager.exportNote('${note.id}')" title="Export">
                                <img src="icons/actions/download.svg" alt="" width="16" height="16">
                            </button>
                            <button class="note-action-btn" onclick="NotesManager.duplicateNote('${note.id}')" title="Duplicate">
                                <img src="icons/actions/copy.svg" alt="" width="16" height="16">
                            </button>
                            <button class="note-action-btn danger" onclick="NotesManager.deleteNote('${note.id}')" title="Delete">
                                <img src="icons/actions/delete.svg" alt="Delete" width="16" height="16">
                            </button>
                        </div>
                    </div>
                    ${contentDisplay}
                    <div class="note-card-meta">
                        <span class="note-category">${Utils.escapeHtml(note.category)}</span>
                        ${note.tags.length > 0 ? `
                            <div class="note-tags">
                                ${note.tags.map(tag => `<span class="note-tag">#${Utils.escapeHtml(tag)}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                    ${note.relatedItems && note.relatedItems.length > 0 ? `
                        <div class="note-card-relations" onclick="event.stopPropagation()">
                            <span class="relations-label"><img src="icons/misc/link.svg" alt="" width="14" height="14" style="vertical-align: middle;"></span>
                            ${note.relatedItems.slice(0, 3).map(rel => {
                                const item = RelationshipManager.findItem(rel.id, rel.type);
                                return item ? `<span class="relation-chip" onclick="RelationshipManager.navigateToItem('${item.id}', '${item.type}')" title="${Utils.escapeHtml(item.name)}">${item.icon}</span>` : '';
                            }).join('')}
                            ${note.relatedItems.length > 3 ? `<span class="relation-more">+${note.relatedItems.length - 3}</span>` : ''}
                        </div>
                    ` : ''}
                    <div class="note-card-footer">
                        <span class="note-date">${Utils.formatDate(note.modifiedAt)}</span>
                        <span class="note-stats">${note.checklist ? wordCount + ' items' : note.drawing ? 'Sketch' : wordCount + ' words'}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = notesHtml;
        
        // Make relationship chips clickable (notes already have onclick handlers)
        // But we still need to attach event listeners to the chips
        const chips = container.querySelectorAll('.relation-chip');
        chips.forEach(chip => {
            chip.style.cursor = 'pointer';
        });
    },
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: var(--success-color);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
};

// ============================================
// Story/Narrative Manager
// ============================================
// Manages comprehensive story and narrative elements
// Tracks acts, scenes, characters, locations, timeline, conflicts, and themes
// Supports character relationships, role assignments, and narrative flow
// Includes visual story mapping and connection visualization
// Manages all story-related data with rich editing capabilities
const StoryManager = {
    currentView: 'list',  // Current tab view
    
    /**
     * Initializes story manager
     * Attaches listeners to add buttons for all story elements
     * Sets up filters and tab switching for different story views
     */
    init() {
        // Add buttons for various story elements
        document.getElementById('addActBtn').addEventListener('click', () => this.openAddActModal());
        document.getElementById('addCharacterBtn')?.addEventListener('click', () => this.openAddCharacterModal());
        document.getElementById('addLocationBtn')?.addEventListener('click', () => this.openAddLocationModal());
        document.getElementById('addTimelineEventBtn')?.addEventListener('click', () => this.openAddTimelineEventModal());
        document.getElementById('addConflictBtn')?.addEventListener('click', () => this.openAddConflictModal());
        document.getElementById('addThemeBtn')?.addEventListener('click', () => this.openAddThemeModal());
        document.getElementById('addStoryItemBtn')?.addEventListener('click', () => this.openAddItemModal());
        
        // Filters for different story elements
        document.getElementById('characterRoleFilter')?.addEventListener('change', () => this.renderCharacters());
        document.getElementById('locationTypeFilter')?.addEventListener('change', () => this.renderLocations());
        document.getElementById('timelineShowScenes')?.addEventListener('change', () => this.renderTimeline());
        document.getElementById('itemsSearchInput')?.addEventListener('input', (e) => this.filterItems(e.target.value));
        
        // Story view tabs - switch between acts, characters, locations, etc
        document.querySelectorAll('.story-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.story-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentView = tab.dataset.view;
                this.switchView(this.currentView);
            });
        });
        
        this.render();
    },
    
    switchView(view) {
        document.querySelectorAll('.story-view').forEach(v => v.classList.remove('active'));
        const viewMap = {
            'list': 'storyListView',
            'map': 'storyMapView',
            'characters': 'storyCharactersView',
            'locations': 'storyLocationsView',
            'timeline': 'storyTimelineView',
            'items': 'storyItemsView',
            'quests': 'storyQuestsView',
            'other': 'storyOtherView'
        };
        document.getElementById(viewMap[view])?.classList.add('active');
        
        // Render the appropriate content
        switch(view) {
            case 'list':
                this.render();
                break;
            case 'map':
                // setTimeout(() => StoryMap.initializeMap(), 100); // DISABLED - Story Map feature commented out
                break;
            case 'characters':
                this.renderCharacters();
                break;
            case 'locations':
                this.renderLocations();
                break;
            case 'timeline':
                this.renderTimeline();
                break;
            case 'items':
                this.renderItems();
                break;
            case 'quests':
                QuestManager.init();
                break;
            case 'other':
                this.renderConflictsAndThemes();
                break;
        }
    },
    
    openAddActModal(actToEdit = null) {
        const isEdit = actToEdit !== null;
        
        const formHtml = `
            <form class="modal-form" id="actForm">
                <h3>${isEdit ? 'Edit Act' : 'Add New Act'}</h3>
                
                <div class="form-group">
                    <label for="actTitle">Act Title *</label>
                    <input type="text" id="actTitle" required value="${isEdit ? Utils.escapeHtml(actToEdit.title) : ''}" placeholder="e.g., Act 1: The Beginning">
                </div>
                
                <div class="form-group">
                    <label for="actDescription">Description</label>
                    <textarea id="actDescription" rows="4" placeholder="Describe what happens in this act...">${isEdit && actToEdit.description ? Utils.escapeHtml(actToEdit.description) : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>Related Items</label>
                    <div id="actRelatedItemsContainer">
                        ${(() => {
                            if (isEdit && actToEdit.relatedItems && actToEdit.relatedItems.length > 0) {
                                return actToEdit.relatedItems.map(rel => {
                                    const item = RelationshipManager.findItemById(rel.id);
                                    if (!item) return '';
                                    return `<span class="relationship-chip" data-id="${rel.id}" data-type="${rel.type}">
                                        <span class="chip-type">${rel.type}</span>
                                        ${Utils.escapeHtml(item.name)}
                                        <button type="button" class="chip-remove" onclick="this.parentElement.remove()">×</button>
                                    </span>`;
                                }).join('');
                            }
                            return '<p class="empty-state-small">No related items yet</p>';
                        })()}
                    </div>
                    <button type="button" class="btn btn-small btn-secondary" id="manageActRelatedBtn"><img src="icons/misc/link.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Manage Related Items</button>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancelActBtn">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Act</button>
                </div>
            </form>
        `;
        
        Modal.open(formHtml);
        
        // Manage related items button
        document.getElementById('manageActRelatedBtn').addEventListener('click', () => {
            const currentRelated = [];
            document.querySelectorAll('#actRelatedItemsContainer .relationship-chip').forEach(chip => {
                currentRelated.push({
                    id: chip.getAttribute('data-id'),
                    type: chip.getAttribute('data-type')
                });
            });
            
            const currentItem = {
                id: isEdit ? actToEdit.id : 'temp-act-' + Date.now(),
                type: 'act',
                name: document.getElementById('actTitle').value.trim() || 'Untitled Act',
                data: { relatedItems: currentRelated }
            };
            
            RelationshipManager.openRelationshipSelector(currentItem, (selected) => {
                const container = document.getElementById('actRelatedItemsContainer');
                if (selected.length === 0) {
                    container.innerHTML = '<p class="empty-state-small">No related items yet</p>';
                } else {
                    container.innerHTML = selected.map(rel => {
                        const item = RelationshipManager.findItemById(rel.id);
                        if (!item) return '';
                        return `<span class="relationship-chip" data-id="${rel.id}" data-type="${rel.type}">
                            <span class="chip-type">${rel.type}</span>
                            ${Utils.escapeHtml(item.name)}
                            <button type="button" class="chip-remove" onclick="this.parentElement.remove()">×</button>
                        </span>`;
                    }).join('');
                }
            });
        });
        
        document.getElementById('actForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Collect related items
            const relatedItems = [];
            document.querySelectorAll('#actRelatedItemsContainer .relationship-chip').forEach(chip => {
                relatedItems.push({
                    id: chip.getAttribute('data-id'),
                    type: chip.getAttribute('data-type')
                });
            });
            
            const actData = {
                id: isEdit ? actToEdit.id : Utils.generateId(),
                title: document.getElementById('actTitle').value.trim(),
                description: document.getElementById('actDescription').value.trim(),
                relatedItems: relatedItems,
                scenes: isEdit ? actToEdit.scenes : [],
                createdAt: isEdit ? actToEdit.createdAt : new Date().toISOString()
            };
            
            // Sync relationships
            const oldRelatedItems = isEdit ? (actToEdit.relatedItems || []) : [];
            RelationshipManager.syncRelationships(
                { id: actData.id, type: 'act', name: actData.title },
                oldRelatedItems,
                relatedItems
            );
            
            if (isEdit) {
                const index = AppState.story.acts.findIndex(a => a.id === actToEdit.id);
                AppState.story.acts[index] = actData;
            } else {
                AppState.story.acts.push(actData);
            }
            
            AppState.save();
            this.render();
            
            // Refresh other sections
            RelationshipManager.refreshAllSections();
            
            Modal.close();
        });
        
        document.getElementById('cancelActBtn').addEventListener('click', () => Modal.close());
    },
    
    openAddSceneModal(actId, sceneToEdit = null) {
        const act = AppState.story.acts.find(a => a.id === actId);
        if (!act) return;
        
        const isEdit = sceneToEdit !== null;
        
        const formHtml = `
            <form class="modal-form" id="sceneForm">
                <h3>${isEdit ? 'Edit Scene' : 'Add New Scene'} (${Utils.escapeHtml(act.title)})</h3>
                
                <div class="form-group">
                    <label for="sceneTitle">Scene Title *</label>
                    <input type="text" id="sceneTitle" required value="${isEdit ? Utils.escapeHtml(sceneToEdit.title) : ''}" placeholder="e.g., Opening Cutscene">
                </div>
                
                <div class="form-group">
                    <label for="sceneDescription">Description</label>
                    <textarea id="sceneDescription" rows="4" placeholder="What happens in this scene...">${isEdit && sceneToEdit.description ? Utils.escapeHtml(sceneToEdit.description) : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="sceneDialogue">Dialogue/Notes</label>
                    <textarea id="sceneDialogue" rows="6" placeholder="Character dialogue, important beats, decisions...">${isEdit && sceneToEdit.dialogue ? Utils.escapeHtml(sceneToEdit.dialogue) : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>Locations (in chronological order)</label>
                    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
                        <button type="button" class="btn btn-secondary" id="addLocationToSceneBtn" style="display: flex; align-items: center; gap: 6px;">
                            <span>+</span>
                            <span>Add Location</span>
                        </button>
                        <small style="color: var(--text-secondary);">Click to select existing or create new</small>
                    </div>
                    <div id="sceneLocationsList" style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;">
                        ${isEdit && sceneToEdit.locationIds && sceneToEdit.locationIds.length > 0 ? 
                            sceneToEdit.locationIds.map((locId, index) => {
                                const loc = AppState.story.locations.find(l => l.id === locId);
                                return loc ? `
                                    <div class="location-order-item" data-location-id="${locId}">
                                        <span class="location-order-number">${index + 1}.</span>
                                        <span class="location-order-name">${Utils.escapeHtml(loc.name)}</span>
                                        <button type="button" class="btn-icon-small move-up" title="Move Up" ${index === 0 ? 'disabled' : ''}>↑</button>
                                        <button type="button" class="btn-icon-small move-down" title="Move Down" ${index === sceneToEdit.locationIds.length - 1 ? 'disabled' : ''}>↓</button>
                                        <button type="button" class="btn-icon-small remove-location" title="Remove">✕</button>
                                    </div>
                                ` : '';
                            }).join('') : 
                            '<p class="empty-state-small">No locations added yet</p>'
                        }
                    </div>
                    <small>Add locations in the order they appear in this scene</small>
                </div>
                
                <div class="form-group">
                    <label>Characters in this Scene</label>
                    <div style="display: flex; gap: 8px; align-items: flex-start; margin-bottom: 8px;">
                        <button type="button" class="btn btn-icon" id="quickAddCharacterBtn" title="Quick Add Character" style="margin-left: auto;">+</button>
                    </div>
                    <div class="character-checkboxes" id="sceneCharactersList">
                        ${AppState.story.characters.length === 0 ? 
                            '<p class="empty-state-small">No characters created yet.</p>' :
                            AppState.story.characters.map(char => `
                                <label class="checkbox-label">
                                    <input type="checkbox" value="${char.id}" 
                                           ${isEdit && sceneToEdit.characterIds && sceneToEdit.characterIds.includes(char.id) ? 'checked' : ''}>
                                    <span>${Utils.escapeHtml(char.name)} (${char.role})</span>
                                </label>
                            `).join('')
                        }
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Conflicts in this Scene</label>
                    <div style="display: flex; gap: 8px; align-items: flex-start; margin-bottom: 8px;">
                        <button type="button" class="btn btn-icon" id="quickAddConflictBtn" title="Quick Create Conflict" style="margin-left: auto;">+</button>
                    </div>
                    <div class="character-checkboxes" id="sceneConflictsList">
                        ${AppState.story.conflicts.length === 0 ? 
                            '<p class="empty-state-small">No conflicts created yet.</p>' :
                            AppState.story.conflicts.map(conflict => `
                                <label class="checkbox-label">
                                    <input type="checkbox" value="${conflict.id}" 
                                           ${isEdit && sceneToEdit.conflictIds && sceneToEdit.conflictIds.includes(conflict.id) ? 'checked' : ''}>
                                    <span>${Utils.escapeHtml(conflict.name)} (${conflict.type})</span>
                                </label>
                            `).join('')
                        }
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Themes in this Scene</label>
                    <div style="display: flex; gap: 8px; align-items: flex-start; margin-bottom: 8px;">
                        <button type="button" class="btn btn-icon" id="quickAddThemeBtn" title="Quick Create Theme" style="margin-left: auto;">+</button>
                    </div>
                    <div class="character-checkboxes" id="sceneThemesList">
                        ${AppState.story.themes.length === 0 ? 
                            '<p class="empty-state-small">No themes created yet.</p>' :
                            AppState.story.themes.map(theme => `
                                <label class="checkbox-label">
                                    <input type="checkbox" value="${theme.id}" 
                                           ${isEdit && sceneToEdit.themeIds && sceneToEdit.themeIds.includes(theme.id) ? 'checked' : ''}>
                                    <span>${Utils.escapeHtml(theme.name)}</span>
                                </label>
                            `).join('')
                        }
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Related Items</label>
                    <div id="sceneRelatedItemsContainer">
                        ${(() => {
                            if (isEdit && sceneToEdit.relatedItems && sceneToEdit.relatedItems.length > 0) {
                                return sceneToEdit.relatedItems.map(rel => {
                                    const item = RelationshipManager.findItemById(rel.id);
                                    if (!item) return '';
                                    return `<span class="relationship-chip" data-id="${rel.id}" data-type="${rel.type}">
                                        <span class="chip-type">${rel.type}</span>
                                        ${Utils.escapeHtml(item.name)}
                                        <button type="button" class="chip-remove" onclick="this.parentElement.remove()">×</button>
                                    </span>`;
                                }).join('');
                            }
                            return '<p class="empty-state-small">No related items yet</p>';
                        })()}
                    </div>
                    <button type="button" class="btn btn-small btn-secondary" id="manageSceneRelatedBtn"><img src="icons/misc/link.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Manage Related Items</button>
                    <small class="form-hint">Link to notes, mechanics, etc. (Characters/Locations/Conflicts/Themes are handled above)</small>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancelSceneBtn">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Scene</button>
                </div>
            </form>
        `;
        
        Modal.open(formHtml);
        
        // Manage related items button
        document.getElementById('manageSceneRelatedBtn')?.addEventListener('click', () => {
            const currentRelated = [];
            document.querySelectorAll('#sceneRelatedItemsContainer .relationship-chip').forEach(chip => {
                currentRelated.push({
                    id: chip.getAttribute('data-id'),
                    type: chip.getAttribute('data-type')
                });
            });
            
            const currentItem = {
                id: isEdit ? sceneToEdit.id : 'temp-scene-' + Date.now(),
                type: 'scene',
                name: document.getElementById('sceneTitle').value.trim() || 'Untitled Scene',
                data: { relatedItems: currentRelated }
            };
            
            // Exclude character, location, conflict, theme since those are handled separately
            RelationshipManager.openRelationshipSelector(currentItem, (selected) => {
                const container = document.getElementById('sceneRelatedItemsContainer');
                if (selected.length === 0) {
                    container.innerHTML = '<p class="empty-state-small">No related items yet</p>';
                } else {
                    container.innerHTML = selected.map(rel => {
                        const item = RelationshipManager.findItemById(rel.id);
                        if (!item) return '';
                        return `<span class="relationship-chip" data-id="${rel.id}" data-type="${rel.type}">
                            <span class="chip-type">${rel.type}</span>
                            ${Utils.escapeHtml(item.name)}
                            <button type="button" class="chip-remove" onclick="this.parentElement.remove()">×</button>
                        </span>`;
                    }).join('');
                }
            }, ['character', 'location', 'conflict', 'theme']);
        });
        
        // Location list management
        const updateLocationsList = () => {
            const locationsList = document.getElementById('sceneLocationsList');
            const items = locationsList.querySelectorAll('.location-order-item');
            items.forEach((item, index) => {
                item.querySelector('.location-order-number').textContent = `${index + 1}.`;
                const moveUpBtn = item.querySelector('.move-up');
                const moveDownBtn = item.querySelector('.move-down');
                moveUpBtn.disabled = index === 0;
                moveDownBtn.disabled = index === items.length - 1;
            });
            
            if (items.length === 0) {
                locationsList.innerHTML = '<p class="empty-state-small">No locations added yet</p>';
            }
        };
        
        document.getElementById('addLocationToSceneBtn')?.addEventListener('click', () => {
            console.log('Add Location button clicked');
            
            // Instead of opening a new modal, create an inline overlay within the current modal
            const modalBody = document.getElementById('modalBody');
            const existingLocations = AppState.story.locations || [];
            
            // Create an overlay div within the modal
            const overlayDiv = document.createElement('div');
            overlayDiv.id = 'locationSelectionOverlay';
            overlayDiv.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                background: var(--bg-primary);
                z-index: 10;
                overflow-y: auto;
                padding: 24px;
                min-height: 100%;
            `;
            
            const overlayContent = `
                <div style="max-width: 600px; margin: 0 auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0;">Add Location to Scene</h3>
                        <button type="button" id="closeLocationOverlay" class="btn btn-icon" style="font-size: 20px;">×</button>
                    </div>
                    
                    ${existingLocations.length > 0 ? `
                        <div style="margin-bottom: 24px;">
                            <h4 style="margin-bottom: 12px; font-size: 14px;">Select Existing Location</h4>
                            <div id="existingLocationsList" style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; padding: 8px; background: var(--bg-secondary); border-radius: 6px;">
                                ${existingLocations.map(loc => `
                                    <button type="button" class="location-select-btn" data-location-id="${loc.id}" style="padding: 10px; text-align: left; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                                        <div style="font-weight: 500;">${Utils.escapeHtml(loc.name)}</div>
                                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${loc.type}</div>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin: 16px 0; color: var(--text-secondary); font-size: 13px;">
                            — OR —
                        </div>
                    ` : ''}
                    
                    <div>
                        <h4 style="margin-bottom: 12px; font-size: 14px;">Create New Location</h4>
                        <form id="quickLocationFormInline">
                            <div class="form-group">
                                <label for="quickLocNameInline">Location Name *</label>
                                <input type="text" id="quickLocNameInline" required placeholder="e.g., The Old Library">
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="quickLocTypeInline">Type *</label>
                                    <select id="quickLocTypeInline" required>
                                        <option value="interior">Interior</option>
                                        <option value="exterior">Exterior</option>
                                        <option value="world">World/Region</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="quickLocDescriptionInline">Quick Description (Optional)</label>
                                <textarea id="quickLocDescriptionInline" rows="2" placeholder="Brief description..."></textarea>
                            </div>
                            
                            <button type="submit" class="btn btn-primary">Create & Add</button>
                        </form>
                    </div>
                </div>
            `;
            
            overlayDiv.innerHTML = overlayContent;
            modalBody.style.position = 'relative';
            modalBody.appendChild(overlayDiv);
            
            // Close overlay function
            const closeOverlay = () => {
                overlayDiv.remove();
            };
            
            document.getElementById('closeLocationOverlay').addEventListener('click', closeOverlay);
            
            // Handle existing location selection
            document.querySelectorAll('.location-select-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const locationId = btn.getAttribute('data-location-id');
                    const location = AppState.story.locations.find(l => l.id === locationId);
                    
                    if (location) {
                        const locationsList = document.getElementById('sceneLocationsList');
                        const existing = locationsList.querySelector(`[data-location-id="${locationId}"]`);
                        
                        if (existing) {
                            alert('This location has already been added to this scene.');
                            return;
                        }
                        
                        const existingEmpty = locationsList.querySelector('.empty-state-small');
                        if (existingEmpty) existingEmpty.remove();
                        
                        const items = locationsList.querySelectorAll('.location-order-item');
                        const index = items.length;
                        
                        const itemHtml = `
                            <div class="location-order-item" data-location-id="${locationId}">
                                <span class="location-order-number">${index + 1}.</span>
                                <span class="location-order-name">${Utils.escapeHtml(location.name)}</span>
                                <button type="button" class="btn-icon-small move-up" title="Move Up">↑</button>
                                <button type="button" class="btn-icon-small move-down" title="Move Down">↓</button>
                                <button type="button" class="btn-icon-small remove-location" title="Remove">✕</button>
                            </div>
                        `;
                        locationsList.insertAdjacentHTML('beforeend', itemHtml);
                        updateLocationsList();
                        closeOverlay();
                    }
                });
                
                // Add hover effect
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = 'var(--bg-hover)';
                    btn.style.borderColor = 'var(--primary-color)';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.background = 'var(--bg-primary)';
                    btn.style.borderColor = 'var(--border-color)';
                });
            });
            
            // Handle new location creation
            document.getElementById('quickLocationFormInline').addEventListener('submit', (e) => {
                e.preventDefault();
                
                const locationData = {
                    id: Utils.generateId(),
                    name: document.getElementById('quickLocNameInline').value.trim(),
                    type: document.getElementById('quickLocTypeInline').value,
                    description: document.getElementById('quickLocDescriptionInline').value.trim(),
                    significance: '',
                    assetIds: [],
                    relatedItems: [],
                    createdAt: new Date().toISOString()
                };
                
                AppState.story.locations.push(locationData);
                AppState.save();
                this.renderLocations();
                
                // Add to scene
                const locationsList = document.getElementById('sceneLocationsList');
                const existingEmpty = locationsList.querySelector('.empty-state-small');
                if (existingEmpty) existingEmpty.remove();
                
                const items = locationsList.querySelectorAll('.location-order-item');
                const index = items.length;
                
                const itemHtml = `
                    <div class="location-order-item" data-location-id="${locationData.id}">
                        <span class="location-order-number">${index + 1}.</span>
                        <span class="location-order-name">${Utils.escapeHtml(locationData.name)}</span>
                        <button type="button" class="btn-icon-small move-up" title="Move Up">↑</button>
                        <button type="button" class="btn-icon-small move-down" title="Move Down">↓</button>
                        <button type="button" class="btn-icon-small remove-location" title="Remove">✕</button>
                    </div>
                `;
                locationsList.insertAdjacentHTML('beforeend', itemHtml);
                updateLocationsList();
                closeOverlay();
            });
        });
        
        document.getElementById('sceneLocationsList')?.addEventListener('click', (e) => {
            const item = e.target.closest('.location-order-item');
            if (!item) return;
            
            if (e.target.classList.contains('move-up')) {
                const prev = item.previousElementSibling;
                if (prev && prev.classList.contains('location-order-item')) {
                    item.parentNode.insertBefore(item, prev);
                    updateLocationsList();
                }
            } else if (e.target.classList.contains('move-down')) {
                const next = item.nextElementSibling;
                if (next && next.classList.contains('location-order-item')) {
                    item.parentNode.insertBefore(next, item);
                    updateLocationsList();
                }
            } else if (e.target.classList.contains('remove-location')) {
                item.remove();
                updateLocationsList();
            }
        });
        
        // Quick-add handlers
        document.getElementById('quickAddCharacterBtn')?.addEventListener('click', () => {
            this.openQuickAddCharacterModal((newCharacter) => {
                const charactersList = document.getElementById('sceneCharactersList');
                if (charactersList) {
                    const existingEmpty = charactersList.querySelector('.empty-state-small');
                    if (existingEmpty) existingEmpty.remove();
                    
                    const checkboxHtml = `
                        <label class="checkbox-label">
                            <input type="checkbox" value="${newCharacter.id}" checked>
                            <span>${Utils.escapeHtml(newCharacter.name)} (${newCharacter.role})</span>
                        </label>
                    `;
                    charactersList.insertAdjacentHTML('beforeend', checkboxHtml);
                }
            });
        });
        

        
        document.getElementById('quickAddConflictBtn')?.addEventListener('click', () => {
            this.openQuickAddConflictModal((newConflict) => {
                const conflictsList = document.getElementById('sceneConflictsList');
                if (conflictsList) {
                    const existingEmpty = conflictsList.querySelector('.empty-state-small');
                    if (existingEmpty) existingEmpty.remove();
                    
                    const checkboxHtml = `
                        <label class="checkbox-label">
                            <input type="checkbox" value="${newConflict.id}" checked>
                            <span>${Utils.escapeHtml(newConflict.name)} (${newConflict.type})</span>
                        </label>
                    `;
                    conflictsList.insertAdjacentHTML('beforeend', checkboxHtml);
                }
            });
        });
        
        document.getElementById('quickAddThemeBtn')?.addEventListener('click', () => {
            this.openQuickAddThemeModal((newTheme) => {
                const themesList = document.getElementById('sceneThemesList');
                if (themesList) {
                    const existingEmpty = themesList.querySelector('.empty-state-small');
                    if (existingEmpty) existingEmpty.remove();
                    
                    const checkboxHtml = `
                        <label class="checkbox-label">
                            <input type="checkbox" value="${newTheme.id}" checked>
                            <span>${Utils.escapeHtml(newTheme.title)}</span>
                        </label>
                    `;
                    themesList.insertAdjacentHTML('beforeend', checkboxHtml);
                }
            });
        });
        
        document.getElementById('sceneForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const characterCheckboxes = document.querySelectorAll('#sceneCharactersList input[type="checkbox"]:checked');
            const characterIds = Array.from(characterCheckboxes).map(cb => cb.value);
            
            const conflictCheckboxes = document.querySelectorAll('#sceneConflictsList input[type="checkbox"]:checked');
            const conflictIds = Array.from(conflictCheckboxes).map(cb => cb.value);
            
            const themeCheckboxes = document.querySelectorAll('#sceneThemesList input[type="checkbox"]:checked');
            const themeIds = Array.from(themeCheckboxes).map(cb => cb.value);
            
            const locationItems = document.querySelectorAll('#sceneLocationsList .location-order-item');
            const locationIds = Array.from(locationItems).map(item => item.dataset.locationId);
            
            // Collect related items
            const relatedItems = [];
            document.querySelectorAll('#sceneRelatedItemsContainer .relationship-chip').forEach(chip => {
                relatedItems.push({
                    id: chip.getAttribute('data-id'),
                    type: chip.getAttribute('data-type')
                });
            });
            
            const sceneData = {
                id: isEdit ? sceneToEdit.id : Utils.generateId(),
                title: document.getElementById('sceneTitle').value.trim(),
                description: document.getElementById('sceneDescription').value.trim(),
                dialogue: document.getElementById('sceneDialogue').value.trim(),
                locationIds: locationIds,
                characterIds: characterIds,
                conflictIds: conflictIds,
                themeIds: themeIds,
                relatedItems: relatedItems,
                // Keep legacy fields for backward compatibility
                locationId: locationIds.length > 0 ? locationIds[0] : '',
                location: locationIds.length > 0 ? 
                    AppState.story.locations.find(l => l.id === locationIds[0])?.name || '' : '',
                characters: characterIds.map(id => AppState.story.characters.find(c => c.id === id)?.name || ''),
                createdAt: isEdit ? sceneToEdit.createdAt : new Date().toISOString()
            };
            
            // Sync relationships
            const oldRelatedItems = isEdit && sceneToEdit.relatedItems ? sceneToEdit.relatedItems : [];
            RelationshipManager.syncRelationships(sceneData, oldRelatedItems, relatedItems);
            
            if (isEdit) {
                const sceneIndex = act.scenes.findIndex(s => s.id === sceneToEdit.id);
                act.scenes[sceneIndex] = sceneData;
            } else {
                act.scenes.push(sceneData);
            }
            
            AppState.save();
            this.render();
            
            // Refresh other sections that might be affected
            RelationshipManager.refreshAllSections();
            
            Modal.close();
        });
        
        document.getElementById('cancelSceneBtn').addEventListener('click', () => Modal.close());
    },
    
    deleteAct(actId) {
        const act = AppState.story.acts.find(a => a.id === actId);
        
        // Check if any scenes in the act are referenced
        let hasReferences = false;
        let referencedScenes = [];
        
        act.scenes.forEach(scene => {
            const refs = RelationshipManager.getReferencedBy(scene.id);
            if (refs.length > 0) {
                hasReferences = true;
                referencedScenes.push({ scene: scene, refs: refs });
            }
        });
        
        // Build confirmation message
        let confirmMsg = `Are you sure you want to delete "${act.title}"?\n\nThis will also delete all ${act.scenes.length} scene(s) in this act.`;
        
        if (hasReferences) {
            confirmMsg += '\n\n⚠️ WARNING: Some scenes are referenced by other items:';
            referencedScenes.forEach(({ scene, refs }) => {
                confirmMsg += `\n  • "${scene.title}" is referenced by ${refs.length} item(s)`;
            });
        }
        
        Utils.showConfirm(confirmMsg, () => {
            // Delete all scenes in the act first
            act.scenes.forEach(scene => {
                // This will trigger cleanup for each scene
                RelationshipManager.cleanupOrphanedRelationships();
            });
            
            AppState.story.acts = AppState.story.acts.filter(a => a.id !== actId);
            AppState.save();
            
            // Final cleanup
            RelationshipManager.cleanupOrphanedRelationships();
            
            this.render();
            
            // Refresh other sections
            RelationshipManager.refreshAllSections();
        });
    },
    
    deleteScene(actId, sceneId) {
        const act = AppState.story.acts.find(a => a.id === actId);
        if (!act) return;
        
        const sceneToDelete = act.scenes.find(s => s.id === sceneId);
        
        RelationshipManager.confirmDeleteWithImpact(sceneId, sceneToDelete.title, 'scene', () => {
            act.scenes = act.scenes.filter(s => s.id !== sceneId);
            AppState.save();
            
            // Clean up any orphaned relationships
            RelationshipManager.cleanupOrphanedRelationships();
            
            this.render();
            
            // Refresh other sections
            RelationshipManager.refreshAllSections();
        });
    },
    
    moveScene(actId, sceneId, direction) {
        const act = AppState.story.acts.find(a => a.id === actId);
        if (!act) return;
        
        const sceneIndex = act.scenes.findIndex(s => s.id === sceneId);
        if (sceneIndex === -1) return;
        
        if (direction === 'up' && sceneIndex > 0) {
            [act.scenes[sceneIndex], act.scenes[sceneIndex - 1]] = [act.scenes[sceneIndex - 1], act.scenes[sceneIndex]];
        } else if (direction === 'down' && sceneIndex < act.scenes.length - 1) {
            [act.scenes[sceneIndex], act.scenes[sceneIndex + 1]] = [act.scenes[sceneIndex + 1], act.scenes[sceneIndex]];
        }
        
        AppState.save();
        this.render();
    },
    
    render() {
        const container = document.getElementById('storyList');
        
        if (!AppState.story.acts || AppState.story.acts.length === 0) {
            container.innerHTML = '<div class="empty-state">No acts yet. Start building your story!</div>';
            return;
        }
        
        let html = '<div class="story-acts">';
        
        AppState.story.acts.forEach((act, actIndex) => {
            html += `
                <div class="act-container">
                    <div class="act-header">
                        <div class="act-info">
                            <h3 class="act-title">${Utils.escapeHtml(act.title)}</h3>
                            ${act.description ? `<p class="act-description">${Utils.escapeHtml(act.description)}</p>` : ''}
                            <span class="scene-count">${act.scenes.length} scene${act.scenes.length !== 1 ? 's' : ''}</span>
                            ${Utils.renderConnections(act)}
                        </div>
                        <div class="act-actions">
                            <button class="btn btn-small btn-primary" onclick="StoryManager.openAddSceneModal('${act.id}')">+ Add Scene</button>
                            <button class="btn btn-small btn-secondary" onclick="StoryManager.openAddActModal(AppState.story.acts.find(a => a.id === '${act.id}'))">Edit</button>
                            <button class="btn btn-small btn-danger" onclick="StoryManager.deleteAct('${act.id}')">Delete</button>
                        </div>
                    </div>
                    
                    ${act.scenes.length > 0 ? `
                        <div class="scenes-list">
                            ${act.scenes.map((scene, sceneIndex) => `
                                <div class="scene-card">
                                    <div class="scene-header">
                                        <div class="scene-order">Scene ${sceneIndex + 1}</div>
                                        <h4 class="scene-title">${Utils.escapeHtml(scene.title)}</h4>
                                        <div class="scene-actions">
                                            ${sceneIndex > 0 ? `<button class="btn btn-icon" onclick="StoryManager.moveScene('${act.id}', '${scene.id}', 'up')" title="Move Up">▲</button>` : ''}
                                            ${sceneIndex < act.scenes.length - 1 ? `<button class="btn btn-icon" onclick="StoryManager.moveScene('${act.id}', '${scene.id}', 'down')" title="Move Down">▼</button>` : ''}
                                            <button class="btn btn-small btn-secondary" onclick="StoryManager.openAddSceneModal('${act.id}', AppState.story.acts.find(a => a.id === '${act.id}').scenes.find(s => s.id === '${scene.id}'))">Edit</button>
                                            <button class="btn btn-small btn-danger" onclick="StoryManager.deleteScene('${act.id}', '${scene.id}')">Delete</button>
                                        </div>
                                    </div>
                                    ${scene.description ? `<p class="scene-description">${Utils.escapeHtml(scene.description)}</p>` : ''}
                                    ${scene.locationIds && scene.locationIds.length > 0 ? `<div class="scene-meta"><strong>${Utils.icon('story/location', 'small')} Location${scene.locationIds.length > 1 ? 's' : ''}:</strong> ${scene.locationIds.map(locId => {
                                        const loc = AppState.story.locations.find(l => l.id === locId);
                                        return loc ? `<span class="character-tag">${Utils.escapeHtml(loc.name)}</span>` : `<span class="character-tag" style="opacity: 0.5;">[Deleted Location]</span>`;
                                    }).join(' → ')}</div>` : ''}
                                    ${scene.characterIds && scene.characterIds.length > 0 ? `<div class="scene-meta"><strong>${Utils.icon('story/characters', 'small')} Characters:</strong> ${scene.characterIds.map(charId => {
                                        const char = AppState.story.characters.find(c => c.id === charId);
                                        return char ? `<span class="character-tag">${Utils.escapeHtml(char.name)}</span>` : '';
                                    }).filter(c => c).join(' ')}</div>` : ''}
                                    ${scene.conflictIds && scene.conflictIds.length > 0 ? `<div class="scene-meta"><strong><img src="icons/misc/combat.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Conflicts:</strong> ${scene.conflictIds.map(conflictId => {
                                        const conflict = AppState.story.conflicts.find(c => c.id === conflictId);
                                        return conflict ? `<span class="character-tag">${Utils.escapeHtml(conflict.name)}</span>` : '';
                                    }).filter(c => c).join(' ')}</div>` : ''}
                                    ${scene.themeIds && scene.themeIds.length > 0 ? `<div class="scene-meta"><strong>🎭 Themes:</strong> ${scene.themeIds.map(themeId => {
                                        const theme = AppState.story.themes.find(t => t.id === themeId);
                                        return theme ? `<span class="character-tag">${Utils.escapeHtml(theme.name)}</span>` : '';
                                    }).filter(t => t).join(' ')}</div>` : ''}
                                    ${Utils.renderConnections(scene)}
                                    ${scene.dialogue ? `
                                        <details class="scene-dialogue">
                                            <summary>Dialogue/Notes</summary>
                                            <pre>${Utils.escapeHtml(scene.dialogue)}</pre>
                                        </details>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : '<div class="empty-scenes">No scenes yet in this act.</div>'}
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
        // Make relationship chips clickable
        RelationshipManager.makeChipsClickable(container);
    },
    
    // ========== CHARACTERS ==========
    renderCustomAttributeInputs(customAttributes) {
        if (!customAttributes || customAttributes.length === 0) {
            return '<p class="empty-state-small">No custom attributes. Add to override class defaults.</p>';
        }
        return customAttributes.map(attr => `
            <div class="custom-attr-input">
                <input type="text" class="custom-attr-name" placeholder="Attribute name" value="${Utils.escapeHtml(attr.name)}">
                <input type="number" class="custom-attr-growth" placeholder="Growth per level" value="${attr.growthPerLevel}" step="0.1">
                <button type="button" class="btn-icon-small remove-custom-attr">✕</button>
            </div>
        `).join('');
    },
    
    renderCharacterSkillsSelection(classes, unlockedSkills) {
        if (!classes || classes.length === 0) {
            return '<p class="empty-state-small">Select at least one class to see available skills</p>';
        }
        
        // Collect all skills from all selected classes
        const allSkills = new Map();
        classes.forEach(classRef => {
            const classData = AppState.classes.find(c => c.id === classRef.classId);
            if (classData?.skills) {
                classData.skills.forEach(skill => {
                    if (!allSkills.has(skill.name)) {
                        allSkills.set(skill.name, {
                            ...skill,
                            className: classData.name
                        });
                    }
                });
            }
        });
        
        if (allSkills.size === 0) {
            return '<p class="empty-state-small">Selected classes have no skills defined</p>';
        }
        
        return Array.from(allSkills.values()).map(skill => `
            <label class="checkbox-label">
                <input type="checkbox" class="skill-checkbox" value="${Utils.escapeHtml(skill.name)}" 
                       ${unlockedSkills && unlockedSkills.includes(skill.name) ? 'checked' : ''}>
                <span>${Utils.escapeHtml(skill.name)} <small>(Lv${skill.unlockLevel}, ${Utils.escapeHtml(skill.className)})</small></span>
            </label>
        `).join('');
    },
    
    getInheritedClassData(character, level) {
        if (!character.classes || character.classes.length === 0) {
            return { attributes: {}, availableAbilities: [] };
        }
        
        const inherited = { attributes: {}, availableAbilities: [] };
        
        // Merge data from all classes
        character.classes.forEach(classRef => {
            const classData = AppState.classes.find(c => c.id === classRef.classId);
            if (!classData || !classData.levelProgression) return;
            
            const levelData = classData.levelProgression.find(l => l.level === level);
            if (!levelData) return;
            
            // Merge attributes based on conflict resolution
            Object.entries(levelData.attributes || {}).forEach(([attrName, value]) => {
                const resolution = character.conflictResolution?.[attrName] || 'priority';
                
                if (!inherited.attributes[attrName]) {
                    inherited.attributes[attrName] = { value: value, sources: [{ className: classData.name, value, priority: classRef.priority }] };
                } else {
                    inherited.attributes[attrName].sources.push({ className: classData.name, value, priority: classRef.priority });
                    
                    // Apply resolution rule
                    if (resolution === 'sum') {
                        inherited.attributes[attrName].value += value;
                    } else if (resolution === 'max') {
                        inherited.attributes[attrName].value = Math.max(inherited.attributes[attrName].value, value);
                    } else if (resolution === 'priority') {
                        // Higher priority wins
                        const currentPriority = inherited.attributes[attrName].sources[0].priority;
                        if (classRef.priority > currentPriority) {
                            inherited.attributes[attrName].value = value;
                        }
                    }
                }
            });
            
            // Collect available abilities at this level
            if (levelData.abilities) {
                const abilities = levelData.abilities.split(',').map(a => a.trim()).filter(a => a);
                abilities.forEach(ability => {
                    inherited.availableAbilities.push({
                        name: ability,
                        className: classData.name,
                        classId: classData.id
                    });
                });
            }
        });
        
        return inherited;
    },
    
    openAbilitySelectionModal(character, level) {
        const inherited = this.getInheritedClassData(character, level);
        const levelData = character.levelSpreadsheet.find(l => l.level === level);
        
        if (!levelData) return;
        if (!levelData.selectedAbilities) levelData.selectedAbilities = [];
        
        const modalHTML = `
            <div class="ability-selection-modal">
                <h2><img src="icons/misc/combat.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Select Abilities - Level ${level}</h2>
                <p>Choose which abilities ${Utils.escapeHtml(character.name)} has learned</p>
                
                ${inherited.availableAbilities.length > 0 ? `
                    <div class="ability-selection-list">
                        ${inherited.availableAbilities.map(ability => {
                            const isSelected = levelData.selectedAbilities.some(a => a.name === ability.name && a.classId === ability.classId);
                            return `
                            <label class="ability-option ${isSelected ? 'selected' : ''}">
                                <input type="checkbox" class="ability-checkbox" 
                                       data-ability="${Utils.escapeHtml(ability.name)}"
                                       data-class-id="${ability.classId}"
                                       ${isSelected ? 'checked' : ''}>
                                <div class="ability-info">
                                    <span class="ability-name">${Utils.escapeHtml(ability.name)}</span>
                                    <span class="ability-source">from ${Utils.escapeHtml(ability.className)}</span>
                                </div>
                            </label>
                            `;
                        }).join('')}
                    </div>
                ` : '<p class="empty-state-small">No abilities inherited from classes</p>'}
                
                <div style="margin-top: 16px;">
                    <h4 style="margin-bottom: 8px;">Custom Abilities</h4>
                    <div id="customAbilitiesList">
                        ${levelData.selectedAbilities.filter(a => a.isCustom).map((ability, index) => `
                            <div class="custom-ability-item" style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                                <input type="text" class="custom-ability-name" value="${Utils.escapeHtml(ability.name)}" style="flex: 1;" placeholder="Ability name">
                                <button type="button" class="btn-icon-small remove-custom-ability" data-index="${index}">✕</button>
                            </div>
                        `).join('')}
                    </div>
                    <button type="button" class="btn btn-small btn-secondary" id="addCustomAbilityBtn">+ Add Custom Ability</button>
                </div>
                
                <div class="modal-actions" style="margin-top: 20px;">
                    <button type="button" class="btn btn-primary" id="saveAbilitySelectionBtn">Save Selection</button>
                    <button type="button" class="btn btn-secondary" id="cancelAbilitySelectionBtn">Cancel</button>
                </div>
            </div>
        `;
        
        Modal.open(modalHTML);
        
        // Handle checkbox changes
        document.querySelectorAll('.ability-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const option = e.target.closest('.ability-option');
                if (e.target.checked) {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
            });
        });
        
        // Add custom ability button
        document.getElementById('addCustomAbilityBtn')?.addEventListener('click', () => {
            const customList = document.getElementById('customAbilitiesList');
            const index = customList.querySelectorAll('.custom-ability-item').length;
            const itemHtml = `
                <div class="custom-ability-item" style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                    <input type="text" class="custom-ability-name" value="" style="flex: 1;" placeholder="Ability name">
                    <button type="button" class="btn-icon-small remove-custom-ability" data-index="${index}">✕</button>
                </div>
            `;
            customList.insertAdjacentHTML('beforeend', itemHtml);
            
            // Attach remove handler to new button
            customList.querySelector(`.remove-custom-ability[data-index="${index}"]`).addEventListener('click', (e) => {
                e.target.closest('.custom-ability-item').remove();
            });
        });
        
        // Remove custom ability handlers
        document.querySelectorAll('.remove-custom-ability').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.custom-ability-item').remove();
            });
        });
        
        // Cancel button - return to spreadsheet
        document.getElementById('cancelAbilitySelectionBtn')?.addEventListener('click', () => {
            this.openSpreadsheetEditor(character);
        });
        
        // Save button
        document.getElementById('saveAbilitySelectionBtn').addEventListener('click', () => {
            levelData.selectedAbilities = [];
            
            // Save inherited abilities
            document.querySelectorAll('.ability-checkbox:checked').forEach(checkbox => {
                levelData.selectedAbilities.push({
                    name: checkbox.dataset.ability,
                    classId: checkbox.dataset.classId,
                    isCustom: false
                });
            });
            
            // Save custom abilities
            document.querySelectorAll('.custom-ability-name').forEach(input => {
                const name = input.value.trim();
                if (name) {
                    levelData.selectedAbilities.push({
                        name: name,
                        classId: null,
                        isCustom: true
                    });
                }
            });
            
            AppState.save();
            alert(`Abilities saved for level ${level}!`);
            Modal.close();
            
            // Refresh the spreadsheet to update count
            this.openSpreadsheetEditor(character);
        });
    },
    
    openSpreadsheetEditor(character) {
        const minLevel = character.minLevel || 1;
        const maxLevel = character.maxLevel || 20;
        
        // Initialize spreadsheet data if it doesn't exist or inherit from classes
        if (!character.levelSpreadsheet) {
            character.levelSpreadsheet = [];
        }
        
        // Ensure all levels exist and inherit from class progressions
        for (let level = minLevel; level <= maxLevel; level++) {
            let levelData = character.levelSpreadsheet.find(l => l.level === level);
            
            if (!levelData) {
                const inherited = this.getInheritedClassData(character, level);
                
                levelData = {
                    level: level,
                    stats: {},
                    abilities: '',
                    selectedAbilities: [] // Track which abilities the character actually has
                };
                
                // Initialize with inherited attributes
                Object.entries(inherited.attributes).forEach(([attrName, data]) => {
                    levelData.stats[attrName] = data.value;
                });
                
                character.levelSpreadsheet.push(levelData);
            } else {
                // Update existing level data with inherited attributes (if not manually overridden)
                const inherited = this.getInheritedClassData(character, level);
                Object.entries(inherited.attributes).forEach(([attrName, data]) => {
                    if (levelData.stats[attrName] === undefined) {
                        levelData.stats[attrName] = data.value;
                    }
                });
            }
        }
        
        // Sort by level
        character.levelSpreadsheet.sort((a, b) => a.level - b.level);
        
        // Get all unique attribute names from class progressions
        const allAttributes = new Set();
        character.classes?.forEach(classRef => {
            const classData = AppState.classes.find(c => c.id === classRef.classId);
            if (classData?.levelProgression && classData.levelProgression.length > 0) {
                Object.keys(classData.levelProgression[0].attributes || {}).forEach(attr => allAttributes.add(attr));
            }
        });
        
        const classAttributes = Array.from(allAttributes);
        
        const classNames = character.classes?.map(c => {
            const cls = AppState.classes.find(cl => cl.id === c.classId);
            return cls ? cls.name : null;
        }).filter(n => n).join(' + ') || 'No Class';
        
        // Build editable spreadsheet HTML
        let spreadsheetHTML = `
            <div class="character-spreadsheet">
                <div class="spreadsheet-header">
                    <h2><img src="icons/misc/chart-line-up.svg" alt="" width="16" height="16" style="vertical-align: middle;"> ${Utils.escapeHtml(character.name)} - Level Progression</h2>
                    <p>Classes: ${Utils.escapeHtml(classNames)} | Levels ${minLevel}-${maxLevel}</p>
                </div>
                
                <div class="spreadsheet-controls">
                    <button class="btn btn-secondary" id="addStatColumnBtn">+ Add Stat Column</button>
                    <button class="btn btn-accent" id="saveSpreadsheetBtn"><img src="icons/actions/save.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Save Changes</button>
                    <button class="btn btn-secondary" id="exportSpreadsheetCSVBtn"><img src="icons/actions/download.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Export CSV</button>
                    <button class="btn btn-secondary" onclick="Modal.close()">Close</button>
                </div>
                
                <div class="spreadsheet-table-container">
                    <table class="spreadsheet-table editable" id="characterSpreadsheetTable">
                        <thead>
                            <tr>
                                <th>Level</th>
                                ${classAttributes.map(attr => `<th class="stat-header" data-stat="${Utils.escapeHtml(attr)}">${Utils.escapeHtml(attr)} <small>(inherited)</small></th>`).join('')}
                                <th>Abilities (Select Below)</th>
                            </tr>
                        </thead>
                        <tbody id="spreadsheetBody">
        `;
        
        // Generate editable rows for each level
        character.levelSpreadsheet.forEach(levelData => {
            const inherited = this.getInheritedClassData(character, levelData.level);
            
            spreadsheetHTML += `<tr data-level="${levelData.level}">`;
            spreadsheetHTML += `<td class="level-cell">${levelData.level}</td>`;
            
            // Attribute columns (inherited from class progressions)
            classAttributes.forEach(attr => {
                const value = levelData.stats[attr] !== undefined ? levelData.stats[attr] : (inherited.attributes[attr]?.value || 0);
                const isInherited = inherited.attributes[attr];
                spreadsheetHTML += `<td>
                    <input type="number" class="stat-input ${isInherited ? 'inherited-stat' : ''}" 
                           data-stat="${Utils.escapeHtml(attr)}" 
                           value="${value}" 
                           step="0.1" 
                           placeholder="0"
                           title="${isInherited ? 'Inherited from: ' + inherited.attributes[attr].sources.map(s => s.className).join(', ') : 'Custom value'}">
                </td>`;
            });
            
            // Abilities column - show available abilities
            const availableAbilities = inherited.availableAbilities;
            const selectedAbilities = levelData.selectedAbilities || [];
            
            spreadsheetHTML += `<td class="abilities-cell">
                <button class="btn btn-small btn-secondary ability-select-btn" data-level="${levelData.level}">
                    <img src="icons/navigation/mechanics.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Select Abilities (${selectedAbilities.length}/${availableAbilities.length})
                </button>
            </td>`;
            
            spreadsheetHTML += '</tr>';
        });
        
        spreadsheetHTML += `
                        </tbody>
                    </table>
                </div>
                
                <div class="spreadsheet-hints">
                    <p><strong><img src="icons/misc/lightbulb.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Tips:</strong></p>
                    <ul>
                        <li><strong>Attributes inherit automatically</strong> from your class progression spreadsheets</li>
                        <li>Green-highlighted values are inherited (can be overridden by typing new values)</li>
                        <li>Click "Select Abilities" to choose which inherited abilities this character has at each level</li>
                        <li>Multi-class characters merge attributes based on conflict resolution rules</li>
                        <li>Use "Add Stat Column" to track custom stats not defined in classes</li>
                    </ul>
                </div>
            </div>
        `;
        
        Modal.open(spreadsheetHTML);
        
        // Wait for modal to render before attaching event listeners
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // Add stat column handler
                const addStatBtn = document.getElementById('addStatColumnBtn');
                if (addStatBtn) {
                    addStatBtn.addEventListener('click', () => {
                        const statName = prompt('Enter stat/attribute name:');
                        if (!statName) return;
                        
                        // Add header
                        const thead = document.querySelector('#characterSpreadsheetTable thead tr');
                        const abilitiesHeader = thead.querySelector('th:last-child');
                        const newHeader = document.createElement('th');
                        newHeader.className = 'stat-header';
                        newHeader.dataset.stat = statName;
                        newHeader.textContent = statName;
                        thead.insertBefore(newHeader, abilitiesHeader);
                        
                        // Add input to each row
                        const rows = document.querySelectorAll('#spreadsheetBody tr');
                        rows.forEach(row => {
                            const abilitiesCell = row.querySelector('td:last-child');
                            const newCell = document.createElement('td');
                            newCell.innerHTML = `<input type="number" class="stat-input" data-stat="${Utils.escapeHtml(statName)}" value="" step="0.1" placeholder="0">`;
                            row.insertBefore(newCell, abilitiesCell);
                        });
                    });
                }
                
                // Ability selection button handlers
                document.querySelectorAll('.ability-select-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const level = parseInt(btn.dataset.level);
                        this.openAbilitySelectionModal(character, level);
                    });
                });
                
                // Save spreadsheet handler
                const saveBtn = document.getElementById('saveSpreadsheetBtn');
                if (saveBtn) {
                    saveBtn.addEventListener('click', () => {
                        const rows = document.querySelectorAll('#spreadsheetBody tr');
                        
                        rows.forEach(row => {
                            const level = parseInt(row.dataset.level);
                            const levelData = character.levelSpreadsheet.find(l => l.level === level);
                            
                            if (levelData) {
                                // Collect all stat inputs
                                row.querySelectorAll('.stat-input').forEach(input => {
                                    const statName = input.dataset.stat;
                                    const value = parseFloat(input.value) || 0;
                                    levelData.stats[statName] = value;
                                });
                            }
                        });
                        
                        // Find and update character in AppState
                        const charIndex = AppState.story.characters.findIndex(c => c.id === character.id);
                        if (charIndex !== -1) {
                            AppState.story.characters[charIndex].levelSpreadsheet = character.levelSpreadsheet;
                            AppState.save();
                            alert('✅ Spreadsheet saved successfully!');
                        }
                    });
                }
                
                // Export CSV handler
                const exportBtn = document.getElementById('exportSpreadsheetCSVBtn');
                if (exportBtn) {
                    exportBtn.addEventListener('click', () => {
                        this.exportSpreadsheetCSV(character);
                    });
                }
            });
        });
    },
    
    exportSpreadsheetCSV(character) {
        if (!character || !character.levelSpreadsheet || character.levelSpreadsheet.length === 0) {
            alert('No spreadsheet data to export.');
            return;
        }
        
        // Get all unique stat columns
        const allStats = new Set();
        character.levelSpreadsheet.forEach(levelData => {
            Object.keys(levelData.stats).forEach(stat => allStats.add(stat));
        });
        const statColumns = Array.from(allStats);
        
        // Build CSV
        let csv = 'Level,' + statColumns.join(',') + ',Abilities\n';
        
        // Data rows
        character.levelSpreadsheet.forEach(levelData => {
            csv += levelData.level + ',';
            csv += statColumns.map(stat => levelData.stats[stat] || 0).join(',') + ',';
            csv += '"' + (levelData.abilities || '') + '"\n';
        });
        
        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${character.name}_progression.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },
    
    collectMultiClassData() {
        const selectedClasses = [];
        document.querySelectorAll('.class-checkbox:checked').forEach(checkbox => {
            const classId = checkbox.value;
            const priorityInput = checkbox.closest('.multi-class-option').querySelector('.class-priority');
            const priority = parseInt(priorityInput.value) || 5;
            selectedClasses.push({ classId, priority });
        });
        return selectedClasses;
    },
    
    getMergedClassData(character) {
        if (!character.classes || character.classes.length === 0) {
            return { attributes: [], skills: [], formulas: [], properties: [] };
        }
        
        // Sort by priority (highest first)
        const sortedClasses = [...character.classes].sort((a, b) => b.priority - a.priority);
        
        const merged = {
            attributes: new Map(),
            skills: new Map(),
            formulas: new Map(),
            properties: []
        };
        
        sortedClasses.forEach(classRef => {
            const classData = AppState.classes.find(c => c.id === classRef.classId);
            if (!classData) return;
            
            // Merge attributes (higher priority wins for conflicts, sum for non-conflicts)
            classData.attributes?.forEach(attr => {
                const resolution = character.conflictResolution?.[attr.name];
                if (resolution === 'sum' || !merged.attributes.has(attr.name)) {
                    const existing = merged.attributes.get(attr.name) || 0;
                    merged.attributes.set(attr.name, existing + (parseInt(attr.value) || 0));
                } else if (resolution === 'max') {
                    const existing = merged.attributes.get(attr.name) || 0;
                    merged.attributes.set(attr.name, Math.max(existing, parseInt(attr.value) || 0));
                } else if (resolution === 'avg') {
                    // Average is handled in a second pass
                } else if (!merged.attributes.has(attr.name)) {
                    // Default: highest priority wins
                    merged.attributes.set(attr.name, parseInt(attr.value) || 0);
                }
            });
            
            // Merge skills (union of all skills)
            classData.skills?.forEach(skill => {
                if (!merged.skills.has(skill.name)) {
                    merged.skills.set(skill.name, skill);
                } else {
                    // If skill exists, take earliest unlock level
                    const existing = merged.skills.get(skill.name);
                    if (skill.unlockLevel < existing.unlockLevel) {
                        merged.skills.set(skill.name, skill);
                    }
                }
            });
            
            // Merge formulas (higher priority wins)
            classData.formulas?.forEach(formula => {
                if (!merged.formulas.has(formula.name)) {
                    merged.formulas.set(formula.name, formula);
                }
            });
            
            // Merge properties (union)
            if (classData.properties) {
                merged.properties.push(...classData.properties);
            }
        });
        
        return {
            attributes: Array.from(merged.attributes, ([name, value]) => ({ name, value })),
            skills: Array.from(merged.skills.values()),
            formulas: Array.from(merged.formulas.values()),
            properties: [...new Set(merged.properties)]
        };
    },
    
    openConflictResolutionModal(character) {
        if (!character.classes || character.classes.length < 2) {
            alert('Character needs at least 2 classes to configure conflict resolution.');
            return;
        }
        
        // Find attribute conflicts
        const attributeConflicts = new Map();
        character.classes.forEach(classRef => {
            const classData = AppState.classes.find(c => c.id === classRef.classId);
            if (!classData?.attributes) return;
            
            classData.attributes.forEach(attr => {
                if (!attributeConflicts.has(attr.name)) {
                    attributeConflicts.set(attr.name, []);
                }
                attributeConflicts.get(attr.name).push({
                    className: classData.name,
                    value: attr.value,
                    priority: classRef.priority
                });
            });
        });
        
        // Filter to only actual conflicts (appears in multiple classes)
        const conflicts = Array.from(attributeConflicts.entries())
            .filter(([name, sources]) => sources.length > 1);
        
        if (conflicts.length === 0) {
            alert('No attribute conflicts detected! All attributes are unique across selected classes.');
            return;
        }
        
        const modalHTML = `
            <div class="conflict-resolution-modal">
                <h2><img src="icons/navigation/mechanics.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Conflict Resolution</h2>
                <p>Configure how to handle attributes that appear in multiple classes</p>
                
                <div class="conflicts-list">
                    ${conflicts.map(([attrName, sources]) => `
                        <div class="conflict-item">
                            <h4>${Utils.escapeHtml(attrName)}</h4>
                            <div class="conflict-sources">
                                ${sources.map(s => `
                                    <div class="conflict-source">
                                        <strong>${Utils.escapeHtml(s.className)}</strong>: ${s.value}
                                        <span class="priority-badge">Priority: ${s.priority}</span>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="form-group">
                                <label>Resolution Method:</label>
                                <select class="conflict-resolution-select" data-attr="${Utils.escapeHtml(attrName)}">
                                    <option value="priority" ${!character.conflictResolution?.[attrName] || character.conflictResolution[attrName] === 'priority' ? 'selected' : ''}>
                                        Use Highest Priority (Default)
                                    </option>
                                    <option value="sum" ${character.conflictResolution?.[attrName] === 'sum' ? 'selected' : ''}>
                                        Sum All Values
                                    </option>
                                    <option value="max" ${character.conflictResolution?.[attrName] === 'max' ? 'selected' : ''}>
                                        Use Maximum Value
                                    </option>
                                    <option value="avg" ${character.conflictResolution?.[attrName] === 'avg' ? 'selected' : ''}>
                                        Average All Values
                                    </option>
                                </select>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="btn btn-primary" id="saveConflictResolutionBtn">Save Resolution Rules</button>
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                </div>
            </div>
        `;
        
        Modal.open(modalHTML);
        
        document.getElementById('saveConflictResolutionBtn').addEventListener('click', () => {
            const resolutions = {};
            document.querySelectorAll('.conflict-resolution-select').forEach(select => {
                const attrName = select.dataset.attr;
                resolutions[attrName] = select.value;
            });
            
            // Update character's conflict resolution
            character.conflictResolution = resolutions;
            
            alert('Conflict resolution rules saved! These will be applied when merging class data.');
            Modal.close();
        });
    },
    
    openAddCharacterModal(characterToEdit = null) {
        const isEdit = characterToEdit !== null;
        
        const formHtml = `
            <form class="modal-form character-form" id="characterForm" style="max-width: 900px;">
                <h3>${isEdit ? 'Edit Character' : 'Add New Character'}</h3>
                
                <div class="character-modal-tabs">
                    <button type="button" class="char-modal-tab active" data-tab="info">Character Info</button>
                    <button type="button" class="char-modal-tab" data-tab="stats">Stats & Progression</button>
                    <button type="button" class="char-modal-tab" data-tab="assets">Assets</button>
                </div>
                
                <div class="char-modal-tab-content active" id="infoTab">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="charName">Name *</label>
                            <input type="text" id="charName" required value="${isEdit ? Utils.escapeHtml(characterToEdit.name) : ''}" placeholder="Character name">
                        </div>
                        <div class="form-group">
                            <label for="charRole">Role *</label>
                            <select id="charRole" required>
                                <option value="protagonist" ${isEdit && characterToEdit.role === 'protagonist' ? 'selected' : ''}>Protagonist</option>
                                <option value="antagonist" ${isEdit && characterToEdit.role === 'antagonist' ? 'selected' : ''}>Antagonist</option>
                                <option value="supporting" ${isEdit && characterToEdit.role === 'supporting' ? 'selected' : ''}>Supporting</option>
                                <option value="minor" ${isEdit && characterToEdit.role === 'minor' ? 'selected' : ''}>Minor</option>
                            </select>
                        </div>
                    </div>
                
                <div class="form-group">
                    <label for="charDescription">Physical Description</label>
                    <textarea id="charDescription" rows="3" placeholder="Appearance, age, distinguishing features...">${isEdit && characterToEdit.description ? Utils.escapeHtml(characterToEdit.description) : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="charPersonality">Personality & Traits</label>
                    <textarea id="charPersonality" rows="3" placeholder="Personality traits, mannerisms, speech patterns...">${isEdit && characterToEdit.personality ? Utils.escapeHtml(characterToEdit.personality) : ''}</textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="charGoals">Goals & Motivations</label>
                        <textarea id="charGoals" rows="3" placeholder="What does this character want?">${isEdit && characterToEdit.goals ? Utils.escapeHtml(characterToEdit.goals) : ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="charFears">Fears & Weaknesses</label>
                        <textarea id="charFears" rows="3" placeholder="What holds them back?">${isEdit && characterToEdit.fears ? Utils.escapeHtml(characterToEdit.fears) : ''}</textarea>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="charBackstory">Backstory</label>
                    <textarea id="charBackstory" rows="4" placeholder="Character history, important past events...">${isEdit && characterToEdit.backstory ? Utils.escapeHtml(characterToEdit.backstory) : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="charArc">Character Arc</label>
                    <textarea id="charArc" rows="3" placeholder="How does this character change throughout the story?">${isEdit && characterToEdit.arc ? Utils.escapeHtml(characterToEdit.arc) : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="charRelationships">Key Relationships</label>
                    <textarea id="charRelationships" rows="3" placeholder="Relationships with other characters...">${isEdit && characterToEdit.relationships ? Utils.escapeHtml(characterToEdit.relationships) : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>Related Items</label>
                    <div id="characterRelatedItemsContainer">
                        ${(() => {
                            // Show all related items including assets that link to this character
                            const allRelatedItems = [];
                            const seenIds = new Set();
                            
                            // Add direct relationships (character -> other items)
                            if (isEdit && characterToEdit.relatedItems) {
                                characterToEdit.relatedItems.filter(rel => rel.type !== 'class').forEach(rel => {
                                    const key = `${rel.type}:${rel.id}`;
                                    if (!seenIds.has(key)) {
                                        seenIds.add(key);
                                        allRelatedItems.push(rel);
                                    }
                                });
                            }
                            
                            // Add reverse relationships ONLY from assets (not bidirectional synced items)
                            if (isEdit) {
                                // Find assets that reference this character
                                AppState.assets.forEach(asset => {
                                    if (asset.relatedItems && asset.relatedItems.some(rel => rel.id === characterToEdit.id && rel.type === 'character')) {
                                        const key = `asset:${asset.id}`;
                                        if (!seenIds.has(key)) {
                                            seenIds.add(key);
                                            allRelatedItems.push({ id: asset.id, type: 'asset' });
                                        }
                                    }
                                });
                            }
                            
                            if (allRelatedItems.length > 0) {
                                return allRelatedItems.map(rel => {
                                    const item = RelationshipManager.findItemById(rel.id);
                                    if (!item) return '';
                                    return `<span class="relationship-chip" data-id="${rel.id}" data-type="${rel.type}">
                                        <span class="chip-type">${rel.type}</span>
                                        ${Utils.escapeHtml(item.name)}
                                        <button type="button" class="chip-remove" onclick="this.parentElement.remove()">×</button>
                                    </span>`;
                                }).join('');
                            }
                            return '<p class="empty-state-small">No related items yet</p>';
                        })()}
                    </div>
                    <button type="button" class="btn btn-small btn-secondary" id="manageCharacterRelatedBtn"><img src="icons/misc/link.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Manage Related Items</button>
                    <small class="form-hint">Link to notes, mechanics, locations, assets, etc. (Classes are linked in Stats tab)</small>
                </div>
                </div>
                
                <div class="char-modal-tab-content" id="statsTab">
                    <div class="form-group">
                        <label>Classes (Multi-Class Support)</label>
                        <small class="form-hint">Select multiple classes for hybrid characters. Conflicts are resolved with custom rules.</small>
                        <div class="multi-class-selector">
                            ${AppState.classes.length > 0 ? AppState.classes.map(cls => {
                                const isSelected = isEdit && characterToEdit.classes?.some(c => c.classId === cls.id);
                                const classData = isEdit && characterToEdit.classes?.find(c => c.classId === cls.id);
                                const typeIcon = cls.classType === 'character' ? '🎭' : '<img src="icons/navigation/mechanics.svg" alt="" width="14" height="14" style="vertical-align: middle;">';
                                return `
                                <label class="multi-class-option ${isSelected ? 'selected' : ''}">
                                    <input type="checkbox" class="class-checkbox" value="${cls.id}" ${isSelected ? 'checked' : ''}>
                                    <span class="class-name">${typeIcon} ${Utils.escapeHtml(cls.name)}</span>
                                    <input type="number" class="class-priority" placeholder="Priority" min="1" max="10" 
                                        value="${isSelected && classData ? classData.priority : ''}" 
                                        title="Higher priority = takes precedence in conflicts (1-10)">
                                </label>
                                `;
                            }).join('') : '<p class="empty-state-small">No classes available. Create classes first.</p>'}
                        </div>
                        <button type="button" class="btn btn-small btn-secondary" id="configureConflictsBtn"><img src="icons/navigation/mechanics.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Configure Conflict Resolution</button>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="charMinLevel">Min Level</label>
                            <input type="number" id="charMinLevel" min="1" value="${isEdit && characterToEdit.minLevel ? characterToEdit.minLevel : 1}">
                        </div>
                        <div class="form-group">
                            <label for="charMaxLevel">Max Level</label>
                            <input type="number" id="charMaxLevel" min="1" value="${isEdit && characterToEdit.maxLevel ? characterToEdit.maxLevel : 20}">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Custom Attribute Modifiers</label>
                        <small class="form-hint">Override base class attributes with custom growth rates (edit specific level values in the Level Progression Spreadsheet)</small>
                        <div id="customAttributesList">
                            ${this.renderCustomAttributeInputs(isEdit ? characterToEdit.customAttributes : null)}
                        </div>
                        <button type="button" class="btn btn-small btn-secondary" id="addCustomAttrBtn">+ Add Custom Attribute</button>
                    </div>
                    
                    <div class="form-group">
                        <label>Unlocked Skills</label>
                        <small class="form-hint">Select which skills this character has unlocked from their classes</small>
                        <div id="characterSkillsList">
                            ${this.renderCharacterSkillsSelection(isEdit ? characterToEdit.classes : null, isEdit ? characterToEdit.unlockedSkills : null)}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <button type="button" class="btn btn-accent" id="manageSpreadsheetBtn" ${!isEdit ? 'disabled' : ''}>
                            <img src="icons/misc/chart-line-up.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Manage Level Progression Spreadsheet
                        </button>
                        <small class="form-hint">Edit stats and abilities for each level (save character first)</small>
                    </div>
                </div>
                
                <div class="char-modal-tab-content" id="assetsTab">
                    <div class="form-group">
                        <label>Linked Assets</label>
                        <div class="asset-links-container" id="characterAssetLinks">
                            ${AppState.assets.length === 0 ? 
                                '<p class="empty-state-small">No assets available. Add assets in the Assets section.</p>' :
                                AppState.assets.map(asset => `
                                    <label class="checkbox-label">
                                        <input type="checkbox" value="${asset.id}" 
                                               ${isEdit && characterToEdit.assetIds && characterToEdit.assetIds.includes(asset.id) ? 'checked' : ''}>
                                        <span>
                                            ${asset.type === 'audio' ? '🔊' : asset.type === 'image' ? '🖼️' : asset.type === 'video' ? '🎬' : asset.type === 'model' ? '🎨' : '📄'}
                                            ${Utils.escapeHtml(asset.name)}
                                            <small>(${asset.type})</small>
                                        </span>
                                    </label>
                                `).join('')
                            }
                        </div>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    ${isEdit ? '<button type="button" class="btn btn-danger" id="deleteCharacterBtn">Delete</button>' : ''}
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Character</button>
                </div>
            </form>
        `;
        
        Modal.open(formHtml);
        
        // Manage related items button
        document.getElementById('manageCharacterRelatedBtn').addEventListener('click', () => {
            const currentRelated = [];
            document.querySelectorAll('#characterRelatedItemsContainer .relationship-chip').forEach(chip => {
                currentRelated.push({
                    id: chip.getAttribute('data-id'),
                    type: chip.getAttribute('data-type')
                });
            });
            
            const currentItem = {
                id: isEdit ? characterToEdit.id : 'temp-char-' + Date.now(),
                type: 'character',
                name: document.getElementById('charName').value.trim() || 'Untitled Character',
                data: { relatedItems: currentRelated }
            };
            
            // Exclude classes from the selector since they're handled separately
            RelationshipManager.openRelationshipSelector(currentItem, (selected) => {
                // Filter out any classes that might have been selected
                const nonClassItems = selected.filter(rel => rel.type !== 'class');
                
                const container = document.getElementById('characterRelatedItemsContainer');
                if (nonClassItems.length === 0) {
                    container.innerHTML = '<p class="empty-state-small">No related items yet</p>';
                } else {
                    container.innerHTML = nonClassItems.map(rel => {
                        const item = RelationshipManager.findItemById(rel.id);
                        if (!item) return '';
                        return `<span class="relationship-chip" data-id="${rel.id}" data-type="${rel.type}">
                            <span class="chip-type">${rel.type}</span>
                            ${Utils.escapeHtml(item.name)}
                            <button type="button" class="chip-remove" onclick="this.parentElement.remove()">×</button>
                        </span>`;
                    }).join('');
                }
            }, ['class']); // Exclude classes from selector
        });
        
        // Tab switching
        document.querySelectorAll('.char-modal-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.char-modal-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.char-modal-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');
            });
        });
        
        // Multi-class selection change - update skills list
        const updateSkillsList = () => {
            const classes = this.collectMultiClassData();
            const skillsList = document.getElementById('characterSkillsList');
            skillsList.innerHTML = this.renderCharacterSkillsSelection(classes, null);
        };
        
        document.querySelectorAll('.class-checkbox')?.forEach(checkbox => {
            checkbox.addEventListener('change', updateSkillsList);
        });
        
        // Add custom attribute
        document.getElementById('addCustomAttrBtn')?.addEventListener('click', () => {
            const list = document.getElementById('customAttributesList');
            const existingEmpty = list.querySelector('.empty-state-small');
            if (existingEmpty) existingEmpty.remove();
            
            const newAttr = document.createElement('div');
            newAttr.className = 'custom-attr-input';
            newAttr.innerHTML = `
                <input type="text" class="custom-attr-name" placeholder="Attribute name (e.g., Strength)">
                <input type="number" class="custom-attr-growth" placeholder="Growth per level" value="1" step="0.1">
                <button type="button" class="btn-icon-small remove-custom-attr">✕</button>
            `;
            list.appendChild(newAttr);
        });
        
        // Remove custom attribute handler
        document.getElementById('customAttributesList')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-custom-attr')) {
                const parent = e.target.closest('.custom-attr-input');
                if (parent) {
                    parent.remove();
                    const list = document.getElementById('customAttributesList');
                    if (list.children.length === 0) {
                        list.innerHTML = '<p class="empty-state-small">No custom attributes. Add to override class defaults.</p>';
                    }
                }
            }
        });
        
        // Configure conflicts button
        document.getElementById('configureConflictsBtn')?.addEventListener('click', () => {
            // Create temporary character object with current form data
            const tempCharacter = {
                classes: this.collectMultiClassData(),
                conflictResolution: isEdit ? characterToEdit.conflictResolution : {}
            };
            
            if (tempCharacter.classes.length < 2) {
                alert('Select at least 2 classes to configure conflict resolution.');
                return;
            }
            
            this.openConflictResolutionModal(tempCharacter);
        });
        
        // Multi-class checkbox change handler - show/hide priority
        document.querySelectorAll('.class-checkbox')?.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const option = e.target.closest('.multi-class-option');
                if (e.target.checked) {
                    option.classList.add('selected');
                    option.querySelector('.class-priority').value = option.querySelector('.class-priority').value || 5;
                } else {
                    option.classList.remove('selected');
                }
            });
        });
        
        // Manage spreadsheet
        document.getElementById('manageSpreadsheetBtn')?.addEventListener('click', () => {
            if (isEdit) {
                this.openSpreadsheetEditor(characterToEdit);
            }
        });
        
        if (isEdit) {
            document.getElementById('deleteCharacterBtn').addEventListener('click', () => {
                RelationshipManager.confirmDeleteWithImpact(characterToEdit.id, characterToEdit.name, 'character', () => {
                    AppState.story.characters = AppState.story.characters.filter(c => c.id !== characterToEdit.id);
                    AppState.save();
                    
                    // Clean up any orphaned relationships
                    RelationshipManager.cleanupOrphanedRelationships();
                    
                    this.renderCharacters();
                    Modal.close();
                    
                    // Refresh other sections
                    RelationshipManager.refreshAllSections();
                });
            });
        }
        
        document.getElementById('characterForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const assetCheckboxes = document.querySelectorAll('#characterAssetLinks input[type="checkbox"]:checked');
            const assetIds = Array.from(assetCheckboxes).map(cb => cb.value);
            
            // Collect custom attributes
            const customAttrInputs = document.querySelectorAll('.custom-attr-input');
            const customAttributes = Array.from(customAttrInputs).map(input => {
                const name = input.querySelector('.custom-attr-name')?.value.trim();
                const growthPerLevel = parseFloat(input.querySelector('.custom-attr-growth')?.value) || 0;
                return name ? { name, growthPerLevel } : null;
            }).filter(a => a);
            
            // Collect unlocked skills
            const skillCheckboxes = document.querySelectorAll('.skill-checkbox:checked');
            const unlockedSkills = Array.from(skillCheckboxes).map(cb => cb.value);
            
            // Collect non-class related items from the form
            const nonClassRelatedItems = [];
            document.querySelectorAll('#characterRelatedItemsContainer .relationship-chip').forEach(chip => {
                nonClassRelatedItems.push({
                    id: chip.getAttribute('data-id'),
                    type: chip.getAttribute('data-type')
                });
            });
            
            const characterData = {
                id: isEdit ? characterToEdit.id : Utils.generateId(),
                name: document.getElementById('charName').value.trim(),
                role: document.getElementById('charRole').value,
                description: document.getElementById('charDescription').value.trim(),
                personality: document.getElementById('charPersonality').value.trim(),
                goals: document.getElementById('charGoals').value.trim(),
                fears: document.getElementById('charFears').value.trim(),
                backstory: document.getElementById('charBackstory').value.trim(),
                arc: document.getElementById('charArc').value.trim(),
                relationships: document.getElementById('charRelationships').value.trim(),
                assetIds: assetIds,
                classes: this.collectMultiClassData(),
                minLevel: parseInt(document.getElementById('charMinLevel')?.value) || 1,
                maxLevel: parseInt(document.getElementById('charMaxLevel')?.value) || 20,
                customAttributes: customAttributes,
                unlockedSkills: unlockedSkills,
                conflictResolution: isEdit ? characterToEdit.conflictResolution : {},
                createdAt: isEdit ? characterToEdit.createdAt : new Date().toISOString(),
                modifiedAt: new Date().toISOString()
            };
            
            // Merge class-based relationships with other related items
            // Classes come from the Stats tab, other relationships from Info tab
            const classRelatedItems = characterData.classes.map(cls => ({
                id: cls.classId,
                type: 'class'
            }));
            
            const oldRelatedItems = isEdit ? (characterToEdit.relatedItems || []) : [];
            const newRelatedItems = [...classRelatedItems, ...nonClassRelatedItems];
            characterData.relatedItems = newRelatedItems;
            
            // Add map position if creating from map toolbox
            if (!isEdit && this.tempMapPosition) {
                characterData.mapPosition = this.tempMapPosition;
                this.tempMapPosition = null; // Clear temporary position
            } else if (isEdit && characterToEdit.mapPosition) {
                characterData.mapPosition = characterToEdit.mapPosition; // Preserve existing position
            }
            
            if (isEdit) {
                const index = AppState.story.characters.findIndex(c => c.id === characterToEdit.id);
                AppState.story.characters[index] = characterData;
            } else {
                AppState.story.characters.push(characterData);
            }
            
            // Sync relationships before saving
            RelationshipManager.syncRelationships(
                { id: characterData.id, type: 'character', name: characterData.name },
                oldRelatedItems,
                newRelatedItems
            );
            
            AppState.save();
            this.renderCharacters();
            
            // Refresh all sections to update "Referenced By"
            RelationshipManager.refreshAllSections();
            
            // Refresh story map nodes if map is loaded
            /* DISABLED - Story Map feature commented out
            if (typeof StoryMap !== 'undefined' && StoryMap.loadMapNodes) {
                StoryMap.loadMapNodes(); // Already calls buildQuestConnections
                StoryMap.render();
            }
            */
            
            Modal.close();
        });
    },
    
    openQuickAddCharacterModal(onSuccess) {
        const formHtml = `
            <form class="modal-form" id="quickCharacterForm">
                <h3>Quick Add Character</h3>
                <p style="color: var(--text-secondary); font-size: 13px; margin: -8px 0 16px;">Create a character quickly. You can add more details later in the Characters tab.</p>
                
                <div class="form-group">
                    <label for="quickCharName">Character Name *</label>
                    <input type="text" id="quickCharName" required placeholder="e.g., Sarah Chen">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="quickCharRole">Role *</label>
                        <select id="quickCharRole" required>
                            <option value="protagonist">Protagonist</option>
                            <option value="antagonist">Antagonist</option>
                            <option value="supporting">Supporting</option>
                            <option value="minor">Minor</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="quickCharDescription">Quick Description (Optional)</label>
                    <textarea id="quickCharDescription" rows="2" placeholder="Brief description..."></textarea>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancelQuickCharBtn">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Character</button>
                </div>
            </form>
        `;
        
        Modal.open(formHtml);
        
        document.getElementById('quickCharacterForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const characterData = {
                id: Utils.generateId(),
                name: document.getElementById('quickCharName').value.trim(),
                role: document.getElementById('quickCharRole').value,
                description: document.getElementById('quickCharDescription').value.trim(),
                personality: '',
                goals: '',
                fears: '',
                backstory: '',
                arc: '',
                relationships: '',
                assetIds: [],
                relatedItems: [],
                createdAt: new Date().toISOString()
            };
            
            AppState.story.characters.push(characterData);
            AppState.save();
            this.renderCharacters();
            Modal.close();
            
            if (onSuccess) onSuccess(characterData);
        });
        
        document.getElementById('cancelQuickCharBtn').addEventListener('click', () => Modal.close());
    },
    
    openQuickAddLocationModal(onSuccess) {
        const formHtml = `
            <form class="modal-form" id="quickLocationForm">
                <h3>Quick Add Location</h3>
                <p style="color: var(--text-secondary); font-size: 13px; margin: -8px 0 16px;">Create a location quickly. You can add more details later in the Locations tab.</p>
                
                <div class="form-group">
                    <label for="quickLocName">Location Name *</label>
                    <input type="text" id="quickLocName" required placeholder="e.g., The Old Library">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="quickLocType">Type *</label>
                        <select id="quickLocType" required>
                            <option value="interior">Interior</option>
                            <option value="exterior">Exterior</option>
                            <option value="world">World/Region</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="quickLocDescription">Quick Description (Optional)</label>
                    <textarea id="quickLocDescription" rows="2" placeholder="Brief description..."></textarea>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancelQuickLocBtn">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Location</button>
                </div>
            </form>
        `;
        
        Modal.open(formHtml);
        
        document.getElementById('quickLocationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const locationData = {
                id: Utils.generateId(),
                name: document.getElementById('quickLocName').value.trim(),
                type: document.getElementById('quickLocType').value,
                description: document.getElementById('quickLocDescription').value.trim(),
                significance: '',
                assetIds: [],
                relatedItems: [],
                createdAt: new Date().toISOString()
            };
            
            AppState.story.locations.push(locationData);
            AppState.save();
            this.renderLocations();
            Modal.close();
            
            if (onSuccess) onSuccess(locationData);
        });
        
        document.getElementById('cancelQuickLocBtn').addEventListener('click', () => Modal.close());
    },
    
    openAddLocationToSceneModal(onSuccess) {
        const existingLocations = AppState.story.locations || [];
        
        const formHtml = `
            <div class="modal-form">
                <h3>Add Location to Scene</h3>
                
                ${existingLocations.length > 0 ? `
                    <div style="margin-bottom: 24px;">
                        <h4 style="margin-bottom: 12px; font-size: 14px;">Select Existing Location</h4>
                        <div id="existingLocationsList" style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; padding: 8px; background: var(--bg-secondary); border-radius: 6px;">
                            ${existingLocations.map(loc => `
                                <button type="button" class="location-select-btn" data-location-id="${loc.id}" style="padding: 10px; text-align: left; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                                    <div style="font-weight: 500;">${Utils.escapeHtml(loc.name)}</div>
                                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${loc.type}</div>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin: 16px 0; color: var(--text-secondary); font-size: 13px;">
                        — OR —
                    </div>
                ` : ''}
                
                <div>
                    <h4 style="margin-bottom: 12px; font-size: 14px;">Create New Location</h4>
                    <form id="quickLocationForm">
                        <div class="form-group">
                            <label for="quickLocName">Location Name *</label>
                            <input type="text" id="quickLocName" required placeholder="e.g., The Old Library">
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="quickLocType">Type *</label>
                                <select id="quickLocType" required>
                                    <option value="interior">Interior</option>
                                    <option value="exterior">Exterior</option>
                                    <option value="world">World/Region</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="quickLocDescription">Quick Description (Optional)</label>
                            <textarea id="quickLocDescription" rows="2" placeholder="Brief description..."></textarea>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" id="cancelLocationBtn">Cancel</button>
                            <button type="submit" class="btn btn-primary">Create & Add</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        Modal.open(formHtml);
        
        // Wait for modal to render, then attach event listeners
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                console.log('Attaching location modal event listeners...');
                
                // Handle existing location selection
                const locationButtons = document.querySelectorAll('.location-select-btn');
                console.log('Found location buttons:', locationButtons.length);
                
                locationButtons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const locationId = btn.getAttribute('data-location-id');
                        console.log('Location selected:', locationId);
                        
                        // Execute callback BEFORE closing modal
                        if (onSuccess) {
                            onSuccess(locationId);
                        } else {
                            console.error('onSuccess callback is not defined');
                        }
                        
                        // Close modal after callback completes
                        Modal.close();
                    });
                    
                    // Add hover effect
                    btn.addEventListener('mouseenter', (e) => {
                        e.target.closest('button').style.background = 'var(--bg-hover)';
                        e.target.closest('button').style.borderColor = 'var(--primary-color)';
                    });
                    btn.addEventListener('mouseleave', (e) => {
                        e.target.closest('button').style.background = 'var(--bg-primary)';
                        e.target.closest('button').style.borderColor = 'var(--border-color)';
                    });
                });
                
                // Handle new location creation
                const form = document.getElementById('quickLocationForm');
                if (form) {
                    console.log('Form found, attaching submit handler');
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        console.log('Form submitted');
                        
                        const locationData = {
                            id: Utils.generateId(),
                            name: document.getElementById('quickLocName').value.trim(),
                            type: document.getElementById('quickLocType').value,
                            description: document.getElementById('quickLocDescription').value.trim(),
                            significance: '',
                            assetIds: [],
                            relatedItems: [],
                            createdAt: new Date().toISOString()
                        };
                        
                        console.log('Creating new location:', locationData.name);
                        AppState.story.locations.push(locationData);
                        AppState.save();
                        StoryManager.renderLocations();
                        
                        // Execute callback BEFORE closing modal
                        if (onSuccess) {
                            onSuccess(locationData.id);
                        } else {
                            console.error('onSuccess callback is not defined');
                        }
                        
                        // Close modal after callback completes
                        Modal.close();
                    });
                } else {
                    console.error('quickLocationForm not found');
                }
                
                const cancelBtn = document.getElementById('cancelLocationBtn');
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => Modal.close());
                } else {
                    console.error('cancelLocationBtn not found');
                }
            });
        });
    },
    
    openQuickAddConflictModal(onSuccess) {
        const formHtml = `
            <form class="modal-form" id="quickConflictForm">
                <h3>Quick Add Conflict</h3>
                <p style="color: var(--text-secondary); font-size: 13px; margin: -8px 0 16px;">Create a conflict quickly. You can add more details later in the Conflicts & Themes tab.</p>
                
                <div class="form-group">
                    <label for="quickConflictName">Conflict Name *</label>
                    <input type="text" id="quickConflictName" required placeholder="e.g., Finding the Truth">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="quickConflictType">Type *</label>
                        <select id="quickConflictType" required>
                            <option value="internal">Internal (Character vs Self)</option>
                            <option value="external">External (Character vs World)</option>
                            <option value="interpersonal">Interpersonal (Character vs Character)</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="quickConflictDescription">Quick Description (Optional)</label>
                    <textarea id="quickConflictDescription" rows="2" placeholder="Brief description..."></textarea>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancelQuickConflictBtn">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Conflict</button>
                </div>
            </form>
        `;
        
        Modal.open(formHtml);
        
        document.getElementById('quickConflictForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const conflictData = {
                id: Utils.generateId(),
                name: document.getElementById('quickConflictName').value.trim(),
                type: document.getElementById('quickConflictType').value,
                description: document.getElementById('quickConflictDescription').value.trim(),
                resolution: '',
                relatedItems: [],
                createdAt: new Date().toISOString()
            };
            
            AppState.story.conflicts.push(conflictData);
            AppState.save();
            this.renderConflictsAndThemes();
            Modal.close();
            
            if (onSuccess) onSuccess(conflictData);
        });
        
        document.getElementById('cancelQuickConflictBtn').addEventListener('click', () => Modal.close());
    },
    
    openQuickAddThemeModal(onSuccess) {
        const formHtml = `
            <form class="modal-form" id="quickThemeForm">
                <h3>Quick Add Theme</h3>
                <p style="color: var(--text-secondary); font-size: 13px; margin: -8px 0 16px;">Create a theme quickly. You can add more details later in the Conflicts & Themes tab.</p>
                
                <div class="form-group">
                    <label for="quickThemeName">Theme Name *</label>
                    <input type="text" id="quickThemeName" required placeholder="e.g., Redemption">
                </div>
                
                <div class="form-group">
                    <label for="quickThemeDescription">Quick Description (Optional)</label>
                    <textarea id="quickThemeDescription" rows="2" placeholder="How this theme appears in your story..."></textarea>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancelQuickThemeBtn">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Theme</button>
                </div>
            </form>
        `;
        
        Modal.open(formHtml);
        
        document.getElementById('quickThemeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const themeData = {
                id: Utils.generateId(),
                title: document.getElementById('quickThemeName').value.trim(),
                description: document.getElementById('quickThemeDescription').value.trim(),
                examples: '',
                relatedItems: [],
                createdAt: new Date().toISOString()
            };
            
            AppState.story.themes.push(themeData);
            AppState.save();
            this.renderConflictsAndThemes();
            Modal.close();
            
            if (onSuccess) onSuccess(themeData);
        });
        
        document.getElementById('cancelQuickThemeBtn').addEventListener('click', () => Modal.close());
    },
    
    renderCharacters() {
        const container = document.getElementById('charactersList');
        const filter = document.getElementById('characterRoleFilter')?.value || '';
        
        let characters = AppState.story.characters;
        if (filter) {
            characters = characters.filter(c => c.role === filter);
        }
        
        if (characters.length === 0) {
            container.innerHTML = '<div class="empty-state">No characters yet. Create your first character!</div>';
            return;
        }
        
        const roleColors = {
            protagonist: 'var(--primary-color)',
            antagonist: 'var(--danger-color)',
            supporting: 'var(--text-secondary)',
            minor: 'var(--text-secondary)'
        };
        
        const roleLabels = {
            protagonist: 'Protagonist',
            antagonist: 'Antagonist',
            supporting: 'Supporting',
            minor: 'Minor'
        };
        
        const html = characters.map(char => {
            const linkedAssets = char.assetIds ? AppState.assets.filter(a => char.assetIds.includes(a.id)) : [];
            
            // Get class names for display
            let classesDisplay = '';
            if (char.classes && char.classes.length > 0) {
                const classNames = char.classes
                    .sort((a, b) => b.priority - a.priority)
                    .map(c => {
                        const classData = AppState.classes.find(cls => cls.id === c.classId);
                        return classData ? `${classData.name} (${c.priority})` : null;
                    })
                    .filter(n => n);
                
                if (classNames.length > 0) {
                    classesDisplay = `<div class="character-classes"><strong>Classes:</strong> ${classNames.join(' + ')}</div>`;
                }
            }
            
            return `
            <div class="character-card" onclick="StoryManager.openAddCharacterModal(AppState.story.characters.find(c => c.id === '${char.id}'))">
                <div class="character-card-header">
                    <h4>${Utils.escapeHtml(char.name)}</h4>
                    <span class="character-role" style="background: ${roleColors[char.role]};">${roleLabels[char.role]}</span>
                </div>
                ${char.description ? `<p class="character-description">${Utils.escapeHtml(char.description.substring(0, 150))}${char.description.length > 150 ? '...' : ''}</p>` : ''}
                ${classesDisplay}
                ${linkedAssets.length > 0 ? `
                    <div class="linked-assets">
                        <strong>Assets:</strong> 
                        ${linkedAssets.map(a => `
                            ${a.type === 'audio' ? '🔊' : a.type === 'image' ? '🖼️' : a.type === 'video' ? '🎬' : a.type === 'model' ? '🎨' : '📄'}
                        `).join(' ')}
                        <span class="asset-count">${linkedAssets.length}</span>
                    </div>
                ` : ''}
                ${Utils.renderConnections(char)}
                <div class="character-card-footer">
                    ${char.goals ? '<span class="character-tag"><img src="icons/misc/gameplay.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Goals</span>' : ''}
                    ${char.fears ? '<span class="character-tag">⚠️ Fears</span>' : ''}
                    ${char.arc ? '<span class="character-tag"><img src="icons/misc/chart-line-up.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Arc</span>' : ''}
                    ${char.relationships ? '<span class="character-tag">❤️ Relationships</span>' : ''}
                </div>
            </div>
        `;
        }).join('');
        
        container.innerHTML = html;
        
        // Make relationship chips clickable
        RelationshipManager.makeChipsClickable(container);
    },
    
    // ========== LOCATIONS ==========
    openAddLocationModal(locationToEdit = null) {
        const isEdit = locationToEdit !== null;
        
        const formHtml = `
            <form class="modal-form" id="locationForm">
                <h3>${isEdit ? 'Edit Location' : 'Add New Location'}</h3>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="locName">Name *</label>
                        <input type="text" id="locName" required value="${isEdit ? Utils.escapeHtml(locationToEdit.name) : ''}" placeholder="Location name">
                    </div>
                    <div class="form-group">
                        <label for="locType">Type</label>
                        <select id="locType">
                            <option value="interior" ${isEdit && locationToEdit.type === 'interior' ? 'selected' : ''}>Interior</option>
                            <option value="exterior" ${isEdit && locationToEdit.type === 'exterior' ? 'selected' : ''}>Exterior</option>
                            <option value="world" ${isEdit && locationToEdit.type === 'world' ? 'selected' : ''}>World/Region</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="locDescription">Description</label>
                    <textarea id="locDescription" rows="4" placeholder="Describe the location's appearance, atmosphere...">${isEdit && locationToEdit.description ? Utils.escapeHtml(locationToEdit.description) : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="locSignificance">Significance</label>
                    <textarea id="locSignificance" rows="3" placeholder="Why is this location important to the story?">${isEdit && locationToEdit.significance ? Utils.escapeHtml(locationToEdit.significance) : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="locConnectedScenes">Connected Scenes (comma-separated)</label>
                    <input type="text" id="locConnectedScenes" placeholder="Scene IDs or names" value="${isEdit && locationToEdit.connectedScenes ? locationToEdit.connectedScenes.join(', ') : ''}">
                </div>
                
                <div class="form-group">
                    <label>Linked Assets</label>
                    <div class="asset-links-container" id="locationAssetLinks">
                        ${AppState.assets.length === 0 ? 
                            '<p class="empty-state-small">No assets available. Add assets in the Assets section.</p>' :
                            AppState.assets.map(asset => `
                                <label class="checkbox-label">
                                    <input type="checkbox" value="${asset.id}" 
                                           ${isEdit && locationToEdit.assetIds && locationToEdit.assetIds.includes(asset.id) ? 'checked' : ''}>
                                    <span>
                                        ${asset.type === 'audio' ? '🔊' : asset.type === 'image' ? '🖼️' : asset.type === 'video' ? '🎬' : asset.type === 'model' ? '🎨' : '📄'}
                                        ${Utils.escapeHtml(asset.name)}
                                        <small>(${asset.type})</small>
                                    </span>
                                </label>
                            `).join('')
                        }
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Related Items</label>
                    <div id="locationRelatedItemsContainer">
                        ${(() => {
                            // Show all related items including assets that link to this location
                            const allRelatedItems = [];
                            const seenIds = new Set();
                            
                            // Add direct relationships
                            if (isEdit && locationToEdit.relatedItems) {
                                locationToEdit.relatedItems.forEach(rel => {
                                    const key = `${rel.type}:${rel.id}`;
                                    if (!seenIds.has(key)) {
                                        seenIds.add(key);
                                        allRelatedItems.push(rel);
                                    }
                                });
                            }
                            
                            // Add reverse relationships ONLY from assets (not bidirectional synced items)
                            if (isEdit) {
                                // Find assets that reference this location
                                AppState.assets.forEach(asset => {
                                    if (asset.relatedItems && asset.relatedItems.some(rel => rel.id === locationToEdit.id && rel.type === 'location')) {
                                        const key = `asset:${asset.id}`;
                                        if (!seenIds.has(key)) {
                                            seenIds.add(key);
                                            allRelatedItems.push({ id: asset.id, type: 'asset' });
                                        }
                                    }
                                });
                            }
                            
                            if (allRelatedItems.length > 0) {
                                return allRelatedItems.map(rel => {
                                    const item = RelationshipManager.findItemById(rel.id);
                                    if (!item) return '';
                                    return `<span class="relationship-chip" data-id="${rel.id}" data-type="${rel.type}">
                                        <span class="chip-type">${rel.type}</span>
                                        ${Utils.escapeHtml(item.name)}
                                        <button type="button" class="chip-remove" onclick="this.parentElement.remove()">×</button>
                                    </span>`;
                                }).join('');
                            }
                            return '<p class="empty-state-small">No related items yet</p>';
                        })()}
                    </div>
                    <button type="button" class="btn btn-small btn-secondary" id="manageLocationRelatedBtn"><img src="icons/misc/link.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Manage Related Items</button>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    ${isEdit ? '<button type="button" class="btn btn-danger" id="deleteLocationBtn">Delete</button>' : ''}
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Location</button>
                </div>
            </form>
        `;
        
        Modal.open(formHtml);
        
        // Manage related items button
        document.getElementById('manageLocationRelatedBtn').addEventListener('click', () => {
            const currentRelated = [];
            document.querySelectorAll('#locationRelatedItemsContainer .relationship-chip').forEach(chip => {
                currentRelated.push({
                    id: chip.getAttribute('data-id'),
                    type: chip.getAttribute('data-type')
                });
            });
            
            const currentItem = {
                id: isEdit ? locationToEdit.id : 'temp-location-' + Date.now(),
                type: 'location',
                name: document.getElementById('locName').value.trim() || 'Untitled Location',
                data: { relatedItems: currentRelated }
            };
            
            RelationshipManager.openRelationshipSelector(currentItem, (selected) => {
                const container = document.getElementById('locationRelatedItemsContainer');
                if (selected.length === 0) {
                    container.innerHTML = '<p class="empty-state-small">No related items yet</p>';
                } else {
                    container.innerHTML = selected.map(rel => {
                        const item = RelationshipManager.findItemById(rel.id);
                        if (!item) return '';
                        return `<span class="relationship-chip" data-id="${rel.id}" data-type="${rel.type}">
                            <span class="chip-type">${rel.type}</span>
                            ${Utils.escapeHtml(item.name)}
                            <button type="button" class="chip-remove" onclick="this.parentElement.remove()">×</button>
                        </span>`;
                    }).join('');
                }
            });
        });
        
        if (isEdit) {
            document.getElementById('deleteLocationBtn').addEventListener('click', () => {
                RelationshipManager.confirmDeleteWithImpact(locationToEdit.id, locationToEdit.name, 'location', () => {
                    AppState.story.locations = AppState.story.locations.filter(l => l.id !== locationToEdit.id);
                    AppState.save();
                    
                    // Clean up any orphaned relationships
                    RelationshipManager.cleanupOrphanedRelationships();
                    
                    this.renderLocations();
                    Modal.close();
                    
                    // Refresh other sections
                    RelationshipManager.refreshAllSections();
                });
            });
        }
        
        document.getElementById('locationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const connectedScenes = document.getElementById('locConnectedScenes').value
                .split(',')
                .map(s => s.trim())
                .filter(s => s);
            
            const assetCheckboxes = document.querySelectorAll('#locationAssetLinks input[type="checkbox"]:checked');
            const assetIds = Array.from(assetCheckboxes).map(cb => cb.value);
            
            // Collect related items
            const relatedItems = [];
            document.querySelectorAll('#locationRelatedItemsContainer .relationship-chip').forEach(chip => {
                relatedItems.push({
                    id: chip.getAttribute('data-id'),
                    type: chip.getAttribute('data-type')
                });
            });
            
            const locationData = {
                id: isEdit ? locationToEdit.id : Utils.generateId(),
                name: document.getElementById('locName').value.trim(),
                type: document.getElementById('locType').value,
                description: document.getElementById('locDescription').value.trim(),
                significance: document.getElementById('locSignificance').value.trim(),
                connectedScenes: connectedScenes,
                assetIds: assetIds,
                relatedItems: relatedItems,
                createdAt: isEdit ? locationToEdit.createdAt : new Date().toISOString(),
                modifiedAt: new Date().toISOString()
            };
            
            // Add map position if creating from map toolbox
            if (!isEdit && this.tempMapPosition) {
                locationData.mapPosition = this.tempMapPosition;
                this.tempMapPosition = null; // Clear temporary position
            } else if (isEdit && locationToEdit.mapPosition) {
                locationData.mapPosition = locationToEdit.mapPosition; // Preserve existing position
            }
            
            // Sync relationships
            const oldRelatedItems = isEdit ? (locationToEdit.relatedItems || []) : [];
            RelationshipManager.syncRelationships(
                { id: locationData.id, type: 'location', name: locationData.name },
                oldRelatedItems,
                relatedItems
            );
            
            if (isEdit) {
                const index = AppState.story.locations.findIndex(l => l.id === locationToEdit.id);
                AppState.story.locations[index] = locationData;
            } else {
                AppState.story.locations.push(locationData);
            }
            
            AppState.save();
            this.renderLocations();
            
            // Refresh other sections
            RelationshipManager.refreshAllSections();
            
            // Refresh story map nodes if map is loaded
            if (typeof StoryMap !== 'undefined' && StoryMap.loadMapNodes) {
                StoryMap.loadMapNodes(); // Already calls buildQuestConnections
                StoryMap.render();
            }
            
            Modal.close();
        });
    },
    
    renderLocations() {
        const container = document.getElementById('locationsList');
        const filter = document.getElementById('locationTypeFilter')?.value || '';
        
        let locations = AppState.story.locations;
        if (filter) {
            locations = locations.filter(l => l.type === filter);
        }
        
        if (locations.length === 0) {
            container.innerHTML = '<div class="empty-state">No locations yet. Create your first location!</div>';
            return;
        }
        
        const typeIcons = {
            interior: '<img src="icons/story/location.svg" alt="Interior" width="16" height="16" style="vertical-align: middle;">',
            exterior: '<img src="icons/story/location.svg" alt="Exterior" width="16" height="16" style="vertical-align: middle;">',
            world: '<img src="icons/story/location.svg" alt="World" width="16" height="16" style="vertical-align: middle;">'
        };
        
        const html = locations.map(loc => {
            const linkedAssets = loc.assetIds ? AppState.assets.filter(a => loc.assetIds.includes(a.id)) : [];
            return `
            <div class="location-card" onclick="StoryManager.openAddLocationModal(AppState.story.locations.find(l => l.id === '${loc.id}'))">
                <div class="location-card-header">
                    <h4>${typeIcons[loc.type] || typeIcons['interior']} ${Utils.escapeHtml(loc.name)}</h4>
                </div>
                ${loc.description ? `<p class="location-description">${Utils.escapeHtml(loc.description.substring(0, 120))}${loc.description.length > 120 ? '...' : ''}</p>` : ''}
                ${linkedAssets.length > 0 ? `
                    <div class="linked-assets">
                        <strong>Assets:</strong> 
                        ${linkedAssets.map(a => `
                            ${a.type === 'audio' ? '🔊' : a.type === 'image' ? '🖼️' : a.type === 'video' ? '🎬' : a.type === 'model' ? '🎨' : '📄'}
                        `).join(' ')}
                        <span class="asset-count">${linkedAssets.length}</span>
                    </div>
                ` : ''}
                ${loc.connectedScenes && loc.connectedScenes.length > 0 ? `<div class="location-scenes"><img src="icons/story/location.svg" alt="" width="14" height="14" style="vertical-align: middle;"> ${loc.connectedScenes.length} connected scene(s)</div>` : ''}
                ${Utils.renderConnections(loc)}
            </div>
        `;
        }).join('');
        
        container.innerHTML = html;
        
        // Make relationship chips clickable
        RelationshipManager.makeChipsClickable(container);
    },
    
    // ========== TIMELINE ==========
    openAddTimelineEventModal(eventToEdit = null) {
        const isEdit = eventToEdit !== null;
        
        const formHtml = `
            <form class="modal-form" id="timelineEventForm">
                <h3>${isEdit ? 'Edit Timeline Event' : 'Add Timeline Event'}</h3>
                
                <div class="form-group">
                    <label for="eventTitle">Event Title *</label>
                    <input type="text" id="eventTitle" required value="${isEdit ? Utils.escapeHtml(eventToEdit.title) : ''}" placeholder="What happens?">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="eventTime">Time/Period</label>
                        <input type="text" id="eventTime" value="${isEdit ? Utils.escapeHtml(eventToEdit.time) : ''}" placeholder="e.g., Day 1, Year 2020, Chapter 3">
                    </div>
                    <div class="form-group">
                        <label for="eventLocation">Location</label>
                        <input type="text" id="eventLocation" value="${isEdit ? Utils.escapeHtml(eventToEdit.location) : ''}" placeholder="Where does it happen?">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="eventDescription">Description</label>
                    <textarea id="eventDescription" rows="4" placeholder="Describe the event...">${isEdit && eventToEdit.description ? Utils.escapeHtml(eventToEdit.description) : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="eventCharacters">Characters Involved (comma-separated)</label>
                    <input type="text" id="eventCharacters" placeholder="Character names" value="${isEdit && eventToEdit.characters ? eventToEdit.characters.join(', ') : ''}">
                </div>
                
                <div class="form-group">
                    <label>Related Items</label>
                    <div id="timelineRelatedItemsContainer">
                        ${(() => {
                            if (isEdit && eventToEdit.relatedItems && eventToEdit.relatedItems.length > 0) {
                                return eventToEdit.relatedItems.map(rel => {
                                    const item = RelationshipManager.findItemById(rel.id);
                                    if (!item) return '';
                                    return `<span class="relationship-chip" data-id="${rel.id}" data-type="${rel.type}">
                                        <span class="chip-type">${rel.type}</span>
                                        ${Utils.escapeHtml(item.name)}
                                        <button type="button" class="chip-remove" onclick="this.parentElement.remove()">×</button>
                                    </span>`;
                                }).join('');
                            }
                            return '<p class="empty-state-small">No related items yet</p>';
                        })()}
                    </div>
                    <button type="button" class="btn btn-small btn-secondary" id="manageTimelineRelatedBtn"><img src="icons/misc/link.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Manage Related Items</button>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    ${isEdit ? '<button type="button" class="btn btn-danger" id="deleteEventBtn">Delete</button>' : ''}
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Event</button>
                </div>
            </form>
        `;
        
        Modal.open(formHtml);
        
        // Manage related items button
        document.getElementById('manageTimelineRelatedBtn').addEventListener('click', () => {
            const currentRelated = [];
            document.querySelectorAll('#timelineRelatedItemsContainer .relationship-chip').forEach(chip => {
                currentRelated.push({
                    id: chip.getAttribute('data-id'),
                    type: chip.getAttribute('data-type')
                });
            });
            
            const currentItem = {
                id: isEdit ? eventToEdit.id : 'temp-timeline-' + Date.now(),
                type: 'timeline',
                name: document.getElementById('eventTitle').value.trim() || 'Untitled Event',
                data: { relatedItems: currentRelated }
            };
            
            RelationshipManager.openRelationshipSelector(currentItem, (selected) => {
                const container = document.getElementById('timelineRelatedItemsContainer');
                if (selected.length === 0) {
                    container.innerHTML = '<p class="empty-state-small">No related items yet</p>';
                } else {
                    container.innerHTML = selected.map(rel => {
                        const item = RelationshipManager.findItemById(rel.id);
                        if (!item) return '';
                        return `<span class="relationship-chip" data-id="${rel.id}" data-type="${rel.type}">
                            <span class="chip-type">${rel.type}</span>
                            ${Utils.escapeHtml(item.name)}
                            <button type="button" class="chip-remove" onclick="this.parentElement.remove()">×</button>
                        </span>`;
                    }).join('');
                }
            });
        });
        
        if (isEdit) {
            document.getElementById('deleteEventBtn').addEventListener('click', () => {
                RelationshipManager.confirmDeleteWithImpact(eventToEdit.id, eventToEdit.title, 'timeline', () => {
                    AppState.story.timeline = AppState.story.timeline.filter(e => e.id !== eventToEdit.id);
                    AppState.save();
                    
                    // Clean up any orphaned relationships
                    RelationshipManager.cleanupOrphanedRelationships();
                    
                    this.renderTimeline();
                    Modal.close();
                    
                    // Refresh other sections
                    RelationshipManager.refreshAllSections();
                });
            });
        }
        
        document.getElementById('timelineEventForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const characters = document.getElementById('eventCharacters').value
                .split(',')
                .map(c => c.trim())
                .filter(c => c);
            
            // Collect related items
            const relatedItems = [];
            document.querySelectorAll('#timelineRelatedItemsContainer .relationship-chip').forEach(chip => {
                relatedItems.push({
                    id: chip.getAttribute('data-id'),
                    type: chip.getAttribute('data-type')
                });
            });
            
            const eventData = {
                id: isEdit ? eventToEdit.id : Utils.generateId(),
                title: document.getElementById('eventTitle').value.trim(),
                time: document.getElementById('eventTime').value.trim(),
                location: document.getElementById('eventLocation').value.trim(),
                description: document.getElementById('eventDescription').value.trim(),
                characters: characters,
                relatedItems: relatedItems,
                createdAt: isEdit ? eventToEdit.createdAt : new Date().toISOString(),
                modifiedAt: new Date().toISOString()
            };
            
            // Sync relationships
            const oldRelatedItems = isEdit ? (eventToEdit.relatedItems || []) : [];
            RelationshipManager.syncRelationships(
                { id: eventData.id, type: 'timeline', name: eventData.title },
                oldRelatedItems,
                relatedItems
            );
            
            if (isEdit) {
                const index = AppState.story.timeline.findIndex(e => e.id === eventToEdit.id);
                AppState.story.timeline[index] = eventData;
            } else {
                AppState.story.timeline.push(eventData);
            }
            
            AppState.save();
            this.renderTimeline();
            
            // Refresh other sections
            RelationshipManager.refreshAllSections();
            
            Modal.close();
        });
    },
    
    renderTimeline() {
        const container = document.getElementById('timelineContainer');
        const showScenes = document.getElementById('timelineShowScenes')?.checked ?? true;
        
        let events = [];
        
        // Add scenes in story order (following the red thread/connections)
        if (showScenes) {
            AppState.story.acts.forEach((act, actIndex) => {
                act.scenes.forEach((scene, sceneIndex) => {
                    // Get character names from IDs
                    const characterNames = scene.characterIds ? 
                        scene.characterIds.map(id => {
                            const char = AppState.story.characters.find(c => c.id === id);
                            return char ? char.name : '';
                        }).filter(n => n) : [];
                    
                    // Get location names from IDs (ordered)
                    const locationNames = scene.locationIds && scene.locationIds.length > 0 ? 
                        scene.locationIds.map(id => {
                            const loc = AppState.story.locations.find(l => l.id === id);
                            return loc ? loc.name : '';
                        }).filter(n => n) : 
                        // Fallback to legacy single location
                        (scene.locationId ? 
                            [AppState.story.locations.find(l => l.id === scene.locationId)?.name || scene.location] : 
                            (scene.location ? [scene.location] : []));
                    
                    // Get conflict names from IDs
                    const conflictNames = scene.conflictIds ? 
                        scene.conflictIds.map(id => {
                            const conflict = AppState.story.conflicts.find(c => c.id === id);
                            return conflict ? conflict.name : '';
                        }).filter(n => n) : [];
                    
                    // Get theme names from IDs
                    const themeNames = scene.themeIds ? 
                        scene.themeIds.map(id => {
                            const theme = AppState.story.themes.find(t => t.id === id);
                            return theme ? theme.name : '';
                        }).filter(n => n) : [];
                    
                    events.push({
                        id: `scene-${scene.id}`,
                        sceneId: scene.id,
                        actId: act.id,
                        actIndex: actIndex,
                        sceneIndex: sceneIndex,
                        title: scene.title,
                        time: `${act.title} - Scene ${sceneIndex + 1}`,
                        locations: locationNames,
                        description: scene.description || '',
                        characters: characterNames,
                        conflicts: conflictNames,
                        themes: themeNames,
                        isScene: true,
                        order: actIndex * 1000 + sceneIndex  // For sorting
                    });
                });
            });
        }
        
        // Add custom timeline events (intersperse them based on time/order if needed)
        AppState.story.timeline.forEach(event => {
            events.push({
                ...event,
                order: event.order || 999999  // Custom events go at the end unless ordered
            });
        });
        
        // Sort events by order (following the red thread)
        events.sort((a, b) => a.order - b.order);
        
        if (events.length === 0) {
            container.innerHTML = '<div class="empty-state">No timeline events yet. Add your first event!</div>';
            return;
        }
        
        const html = `
            <div class="timeline">
                <div class="timeline-legend">
                    <span class="timeline-legend-item">
                        <span class="timeline-marker" style="background: var(--primary-color);"></span> Story Scenes (Red Thread Order)
                    </span>
                    <span class="timeline-legend-item">
                        <span class="timeline-marker" style="background: var(--text-secondary);"></span> Custom Events
                    </span>
                </div>
                ${events.map((event, index) => `
                    <div class="timeline-event ${event.isScene ? 'timeline-scene' : ''}" 
                         ${!event.isScene ? `onclick="StoryManager.openAddTimelineEventModal(AppState.story.timeline.find(e => e.id === '${event.id}'))"` : ''}>
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <div class="timeline-header">
                                <h4>
                                    ${event.isScene ? `� ` : '<img src="icons/status/pin.svg" alt="" width="14" height="14" style="vertical-align: middle;"> '}
                                    ${Utils.escapeHtml(event.title)}
                                </h4>
                                ${event.time ? `<span class="timeline-time">${Utils.escapeHtml(event.time)}</span>` : ''}
                            </div>
                            ${event.locations && event.locations.length > 0 ? `
                                <div class="timeline-location">
                                    <img src="icons/story/location.svg" alt="" width="14" height="14" style="vertical-align: middle;"> ${event.locations.map((loc, idx) => {
                                        if (event.locations.length === 1) {
                                            return Utils.escapeHtml(loc);
                                        } else {
                                            return `<span style="color: var(--primary-color); font-weight: 600;">${idx + 1}.</span> ${Utils.escapeHtml(loc)}`;
                                        }
                                    }).join(' → ')}
                                </div>
                            ` : event.location ? `<div class="timeline-location"><img src="icons/story/location.svg" alt="" width="14" height="14" style="vertical-align: middle;"> ${Utils.escapeHtml(event.location)}</div>` : ''}
                            ${event.description ? `<p class="timeline-description">${Utils.escapeHtml(event.description)}</p>` : ''}
                            ${event.characters && event.characters.length > 0 ? `
                                <div class="timeline-characters">
                                    <img src="icons/misc/user.svg" alt="" width="14" height="14" style="vertical-align: middle;"> ${event.characters.map(c => Utils.escapeHtml(c)).join(', ')}
                                </div>
                            ` : ''}
                            ${event.conflicts && event.conflicts.length > 0 ? `
                                <div class="timeline-conflicts">
                                    <img src="icons/misc/combat.svg" alt="" width="14" height="14" style="vertical-align: middle;"> ${event.conflicts.map(c => Utils.escapeHtml(c)).join(', ')}
                                </div>
                            ` : ''}
                            ${event.themes && event.themes.length > 0 ? `
                                <div class="timeline-themes">
                                    <img src="icons/misc/lightbulb.svg" alt="" width="14" height="14" style="vertical-align: middle;"> ${event.themes.map(t => Utils.escapeHtml(t)).join(', ')}
                                </div>
                            ` : ''}
                            ${Utils.renderConnections(event)}
                            ${event.isScene ? `<div class="timeline-scene-note">From ${Utils.escapeHtml(event.time)}</div>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = html;
        
        // Make relationship chips clickable
        RelationshipManager.makeChipsClickable(container);
    },
    
    // ========== CONFLICTS & THEMES ==========
    openAddConflictModal(conflictToEdit = null) {
        const isEdit = conflictToEdit !== null;
        
        const formHtml = `
            <form class="modal-form" id="conflictForm">
                <h3>${isEdit ? 'Edit Conflict' : 'Add Conflict'}</h3>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="conflictTitle">Conflict *</label>
                        <input type="text" id="conflictTitle" required value="${isEdit ? Utils.escapeHtml(conflictToEdit.title) : ''}" placeholder="What is the conflict?">
                    </div>
                    <div class="form-group">
                        <label for="conflictType">Type</label>
                        <select id="conflictType">
                            <option value="internal" ${isEdit && conflictToEdit.type === 'internal' ? 'selected' : ''}>Internal</option>
                            <option value="external" ${isEdit && conflictToEdit.type === 'external' ? 'selected' : ''}>External</option>
                            <option value="interpersonal" ${isEdit && conflictToEdit.type === 'interpersonal' ? 'selected' : ''}>Interpersonal</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="conflictDescription">Description</label>
                    <textarea id="conflictDescription" rows="3" placeholder="Describe the conflict...">${isEdit && conflictToEdit.description ? Utils.escapeHtml(conflictToEdit.description) : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="conflictResolution">Resolution</label>
                    <textarea id="conflictResolution" rows="3" placeholder="How is this conflict resolved?">${isEdit && conflictToEdit.resolution ? Utils.escapeHtml(conflictToEdit.resolution) : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>Related Items</label>
                    <div id="conflictRelatedItemsContainer">
                        ${(() => {
                            if (isEdit && conflictToEdit.relatedItems && conflictToEdit.relatedItems.length > 0) {
                                return conflictToEdit.relatedItems.map(rel => {
                                    const item = RelationshipManager.findItemById(rel.id);
                                    if (!item) return '';
                                    return `<span class="relationship-chip" data-id="${rel.id}" data-type="${rel.type}">
                                        <span class="chip-type">${rel.type}</span>
                                        ${Utils.escapeHtml(item.name)}
                                        <button type="button" class="chip-remove" onclick="this.parentElement.remove()">×</button>
                                    </span>`;
                                }).join('');
                            }
                            return '<p class="empty-state-small">No related items yet</p>';
                        })()}
                    </div>
                    <button type="button" class="btn btn-small btn-secondary" id="manageConflictRelatedBtn"><img src="icons/misc/link.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Manage Related Items</button>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    ${isEdit ? '<button type="button" class="btn btn-danger" id="deleteConflictBtn">Delete</button>' : ''}
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Conflict</button>
                </div>
            </form>
        `;
        
        Modal.open(formHtml);
        
        // Manage related items button
        document.getElementById('manageConflictRelatedBtn').addEventListener('click', () => {
            const currentRelated = [];
            document.querySelectorAll('#conflictRelatedItemsContainer .relationship-chip').forEach(chip => {
                currentRelated.push({
                    id: chip.getAttribute('data-id'),
                    type: chip.getAttribute('data-type')
                });
            });
            
            const currentItem = {
                id: isEdit ? conflictToEdit.id : 'temp-conflict-' + Date.now(),
                type: 'conflict',
                name: document.getElementById('conflictTitle').value.trim() || 'Untitled Conflict',
                data: { relatedItems: currentRelated }
            };
            
            RelationshipManager.openRelationshipSelector(currentItem, (selected) => {
                const container = document.getElementById('conflictRelatedItemsContainer');
                if (selected.length === 0) {
                    container.innerHTML = '<p class="empty-state-small">No related items yet</p>';
                } else {
                    container.innerHTML = selected.map(rel => {
                        const item = RelationshipManager.findItemById(rel.id);
                        if (!item) return '';
                        return `<span class="relationship-chip" data-id="${rel.id}" data-type="${rel.type}">
                            <span class="chip-type">${rel.type}</span>
                            ${Utils.escapeHtml(item.name)}
                            <button type="button" class="chip-remove" onclick="this.parentElement.remove()">×</button>
                        </span>`;
                    }).join('');
                }
            });
        });
        
        if (isEdit) {
            document.getElementById('deleteConflictBtn').addEventListener('click', () => {
                RelationshipManager.confirmDeleteWithImpact(conflictToEdit.id, conflictToEdit.title, 'conflict', () => {
                    AppState.story.conflicts = AppState.story.conflicts.filter(c => c.id !== conflictToEdit.id);
                    AppState.save();
                    
                    // Clean up any orphaned relationships
                    RelationshipManager.cleanupOrphanedRelationships();
                    
                    this.renderConflictsAndThemes();
                    Modal.close();
                    
                    // Refresh other sections
                    RelationshipManager.refreshAllSections();
                });
            });
        }
        
        document.getElementById('conflictForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Collect related items
            const relatedItems = [];
            document.querySelectorAll('#conflictRelatedItemsContainer .relationship-chip').forEach(chip => {
                relatedItems.push({
                    id: chip.getAttribute('data-id'),
                    type: chip.getAttribute('data-type')
                });
            });
            
            const conflictData = {
                id: isEdit ? conflictToEdit.id : Utils.generateId(),
                title: document.getElementById('conflictTitle').value.trim(),
                type: document.getElementById('conflictType').value,
                description: document.getElementById('conflictDescription').value.trim(),
                resolution: document.getElementById('conflictResolution').value.trim(),
                relatedItems: relatedItems,
                createdAt: isEdit ? conflictToEdit.createdAt : new Date().toISOString()
            };
            
            // Sync relationships
            const oldRelatedItems = isEdit ? (conflictToEdit.relatedItems || []) : [];
            RelationshipManager.syncRelationships(
                { id: conflictData.id, type: 'conflict', name: conflictData.title },
                oldRelatedItems,
                relatedItems
            );
            
            if (isEdit) {
                const index = AppState.story.conflicts.findIndex(c => c.id === conflictToEdit.id);
                AppState.story.conflicts[index] = conflictData;
            } else {
                AppState.story.conflicts.push(conflictData);
            }
            
            AppState.save();
            this.renderConflictsAndThemes();
            
            // Refresh other sections
            RelationshipManager.refreshAllSections();
            
            Modal.close();
        });
    },
    
    openAddThemeModal(themeToEdit = null) {
        const isEdit = themeToEdit !== null;
        
        const formHtml = `
            <form class="modal-form" id="themeForm">
                <h3>${isEdit ? 'Edit Theme' : 'Add Theme'}</h3>
                
                <div class="form-group">
                    <label for="themeTitle">Theme *</label>
                    <input type="text" id="themeTitle" required value="${isEdit ? Utils.escapeHtml(themeToEdit.title) : ''}" placeholder="e.g., Redemption, Power, Identity">
                </div>
                
                <div class="form-group">
                    <label for="themeDescription">Description</label>
                    <textarea id="themeDescription" rows="3" placeholder="How is this theme explored in your story?">${isEdit && themeToEdit.description ? Utils.escapeHtml(themeToEdit.description) : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="themeExamples">Examples & Symbols</label>
                    <textarea id="themeExamples" rows="3" placeholder="Specific scenes, characters, or symbols that represent this theme...">${isEdit && themeToEdit.examples ? Utils.escapeHtml(themeToEdit.examples) : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>Related Items</label>
                    <div id="themeRelatedItemsContainer">
                        ${(() => {
                            if (isEdit && themeToEdit.relatedItems && themeToEdit.relatedItems.length > 0) {
                                return themeToEdit.relatedItems.map(rel => {
                                    const item = RelationshipManager.findItemById(rel.id);
                                    if (!item) return '';
                                    return `<span class="relationship-chip" data-id="${rel.id}" data-type="${rel.type}">
                                        <span class="chip-type">${rel.type}</span>
                                        ${Utils.escapeHtml(item.name)}
                                        <button type="button" class="chip-remove" onclick="this.parentElement.remove()">×</button>
                                    </span>`;
                                }).join('');
                            }
                            return '<p class="empty-state-small">No related items yet</p>';
                        })()}
                    </div>
                    <button type="button" class="btn btn-small btn-secondary" id="manageThemeRelatedBtn"><img src="icons/misc/link.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Manage Related Items</button>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    ${isEdit ? '<button type="button" class="btn btn-danger" id="deleteThemeBtn">Delete</button>' : ''}
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Theme</button>
                </div>
            </form>
        `;
        
        Modal.open(formHtml);
        
        // Manage related items button
        document.getElementById('manageThemeRelatedBtn').addEventListener('click', () => {
            const currentRelated = [];
            document.querySelectorAll('#themeRelatedItemsContainer .relationship-chip').forEach(chip => {
                currentRelated.push({
                    id: chip.getAttribute('data-id'),
                    type: chip.getAttribute('data-type')
                });
            });
            
            const currentItem = {
                id: isEdit ? themeToEdit.id : 'temp-theme-' + Date.now(),
                type: 'theme',
                name: document.getElementById('themeTitle').value.trim() || 'Untitled Theme',
                data: { relatedItems: currentRelated }
            };
            
            RelationshipManager.openRelationshipSelector(currentItem, (selected) => {
                const container = document.getElementById('themeRelatedItemsContainer');
                if (selected.length === 0) {
                    container.innerHTML = '<p class="empty-state-small">No related items yet</p>';
                } else {
                    container.innerHTML = selected.map(rel => {
                        const item = RelationshipManager.findItemById(rel.id);
                        if (!item) return '';
                        return `<span class="relationship-chip" data-id="${rel.id}" data-type="${rel.type}">
                            <span class="chip-type">${rel.type}</span>
                            ${Utils.escapeHtml(item.name)}
                            <button type="button" class="chip-remove" onclick="this.parentElement.remove()">×</button>
                        </span>`;
                    }).join('');
                }
            });
        });
        
        if (isEdit) {
            document.getElementById('deleteThemeBtn').addEventListener('click', () => {
                RelationshipManager.confirmDeleteWithImpact(themeToEdit.id, themeToEdit.title, 'theme', () => {
                    AppState.story.themes = AppState.story.themes.filter(t => t.id !== themeToEdit.id);
                    AppState.save();
                    
                    // Clean up any orphaned relationships
                    RelationshipManager.cleanupOrphanedRelationships();
                    
                    this.renderConflictsAndThemes();
                    Modal.close();
                    
                    // Refresh other sections
                    RelationshipManager.refreshAllSections();
                });
            });
        }
        
        document.getElementById('themeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Collect related items
            const relatedItems = [];
            document.querySelectorAll('#themeRelatedItemsContainer .relationship-chip').forEach(chip => {
                relatedItems.push({
                    id: chip.getAttribute('data-id'),
                    type: chip.getAttribute('data-type')
                });
            });
            
            const themeData = {
                id: isEdit ? themeToEdit.id : Utils.generateId(),
                title: document.getElementById('themeTitle').value.trim(),
                description: document.getElementById('themeDescription').value.trim(),
                examples: document.getElementById('themeExamples').value.trim(),
                relatedItems: relatedItems,
                createdAt: isEdit ? themeToEdit.createdAt : new Date().toISOString()
            };
            
            // Sync relationships
            const oldRelatedItems = isEdit ? (themeToEdit.relatedItems || []) : [];
            RelationshipManager.syncRelationships(
                { id: themeData.id, type: 'theme', name: themeData.title },
                oldRelatedItems,
                relatedItems
            );
            
            if (isEdit) {
                const index = AppState.story.themes.findIndex(t => t.id === themeToEdit.id);
                AppState.story.themes[index] = themeData;
            } else {
                AppState.story.themes.push(themeData);
            }
            
            AppState.save();
            this.renderConflictsAndThemes();
            
            // Refresh other sections
            RelationshipManager.refreshAllSections();
            
            Modal.close();
        });
    },
    
    renderConflictsAndThemes() {
        const conflictsContainer = document.getElementById('conflictsList');
        const themesContainer = document.getElementById('themesList');
        
        // Render Conflicts
        if (AppState.story.conflicts.length === 0) {
            conflictsContainer.innerHTML = '<div class="empty-state-small">No conflicts added yet.</div>';
        } else {
            const conflictTypeIcons = {
                internal: '🧠',
                external: '<img src="icons/misc/combat.svg" alt="" width="14" height="14" style="vertical-align: middle;">',
                interpersonal: '<img src="icons/misc/user.svg" alt="" width="14" height="14" style="vertical-align: middle;">'
            };
            
            conflictsContainer.innerHTML = AppState.story.conflicts.map(conflict => `
                <div class="conflict-item" onclick="StoryManager.openAddConflictModal(AppState.story.conflicts.find(c => c.id === '${conflict.id}'))">
                    <div class="conflict-header">
                        <h4>${conflictTypeIcons[conflict.type]} ${Utils.escapeHtml(conflict.title)}</h4>
                    </div>
                    ${conflict.description ? `<p>${Utils.escapeHtml(conflict.description)}</p>` : ''}
                    ${conflict.resolution ? `<div class="conflict-resolution">✓ ${Utils.escapeHtml(conflict.resolution.substring(0, 100))}${conflict.resolution.length > 100 ? '...' : ''}</div>` : ''}
                    ${Utils.renderConnections(conflict)}
                </div>
            `).join('');
        }
        
        // Render Themes
        if (AppState.story.themes.length === 0) {
            themesContainer.innerHTML = '<div class="empty-state-small">No themes added yet.</div>';
        } else {
            themesContainer.innerHTML = AppState.story.themes.map(theme => `
                <div class="theme-item" onclick="StoryManager.openAddThemeModal(AppState.story.themes.find(t => t.id === '${theme.id}'))">
                    <h4><img src="icons/misc/lightbulb.svg" alt="" width="14" height="14" style="vertical-align: middle;"> ${Utils.escapeHtml(theme.title)}</h4>
                    ${theme.description ? `<p>${Utils.escapeHtml(theme.description)}</p>` : ''}
                    ${theme.examples ? `<div class="theme-examples"><img src="icons/status/pin.svg" alt="" width="14" height="14" style="vertical-align: middle;"> ${Utils.escapeHtml(theme.examples.substring(0, 100))}${theme.examples.length > 100 ? '...' : ''}</div>` : ''}
                    ${Utils.renderConnections(theme)}
                </div>
            `).join('');
        }
        
        // Make relationship chips clickable
        RelationshipManager.makeChipsClickable(conflictsContainer);
        RelationshipManager.makeChipsClickable(themesContainer);
    },

    // Items Management
    openAddItemModal(itemToEdit = null) {
        const isEdit = !!itemToEdit;
        const content = `
            <h3>${isEdit ? '<img src="icons/actions/pencil.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Edit Item' : '<img src="icons/actions/add.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Add New Item'}</h3>
            <form id="addItemForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="itemName">Item Name *</label>
                        <input type="text" id="itemName" value="${isEdit ? Utils.escapeHtml(itemToEdit.name) : ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="itemType">Type *</label>
                        <select id="itemType" required>
                            <option value="weapon" ${isEdit && itemToEdit.type === 'weapon' ? 'selected' : ''}>Weapon</option>
                            <option value="armor" ${isEdit && itemToEdit.type === 'armor' ? 'selected' : ''}>Armor</option>
                            <option value="consumable" ${isEdit && itemToEdit.type === 'consumable' ? 'selected' : ''}>Consumable</option>
                            <option value="key" ${isEdit && itemToEdit.type === 'key' ? 'selected' : ''}>Key Item</option>
                            <option value="quest" ${isEdit && itemToEdit.type === 'quest' ? 'selected' : ''}>Quest Item</option>
                            <option value="other" ${isEdit && itemToEdit.type === 'other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="itemRarity">Rarity</label>
                        <select id="itemRarity">
                            <option value="common" ${isEdit && itemToEdit.rarity === 'common' ? 'selected' : ''}>Common</option>
                            <option value="uncommon" ${isEdit && itemToEdit.rarity === 'uncommon' ? 'selected' : ''}>Uncommon</option>
                            <option value="rare" ${isEdit && itemToEdit.rarity === 'rare' ? 'selected' : ''}>Rare</option>
                            <option value="epic" ${isEdit && itemToEdit.rarity === 'epic' ? 'selected' : ''}>Epic</option>
                            <option value="legendary" ${isEdit && itemToEdit.rarity === 'legendary' ? 'selected' : ''}>Legendary</option>
                            <option value="mythic" ${isEdit && itemToEdit.rarity === 'mythic' ? 'selected' : ''}>Mythic</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-section">
                    <h4><img src="icons/misc/chart-line-up.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Stats & Effects</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="itemDamage">Damage/Power</label>
                            <input type="number" id="itemDamage" value="${isEdit ? (itemToEdit.stats?.damage || 0) : 0}" step="0.1">
                        </div>
                        <div class="form-group">
                            <label for="itemDefense">Defense</label>
                            <input type="number" id="itemDefense" value="${isEdit ? (itemToEdit.stats?.defense || 0) : 0}" step="0.1">
                        </div>
                        <div class="form-group">
                            <label for="itemSpeed">Speed</label>
                            <input type="number" id="itemSpeed" value="${isEdit ? (itemToEdit.stats?.speed || 0) : 0}" step="0.1">
                        </div>
                        <div class="form-group">
                            <label for="itemHealth">Health</label>
                            <input type="number" id="itemHealth" value="${isEdit ? (itemToEdit.stats?.health || 0) : 0}" step="0.1">
                        </div>
                        <div class="form-group">
                            <label for="itemEnergy">Mana/Energy</label>
                            <input type="number" id="itemEnergy" value="${isEdit ? (itemToEdit.stats?.energy || 0) : 0}" step="0.1">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="itemEffects">Special Effects</label>
                        <textarea id="itemEffects" rows="2" placeholder="e.g., +10% critical strike, Restores 50 HP over 5 seconds">${isEdit ? Utils.escapeHtml(itemToEdit.effects || '') : ''}</textarea>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="itemDescription">Description</label>
                    <textarea id="itemDescription" rows="3" placeholder="Describe this item...">${isEdit ? Utils.escapeHtml(itemToEdit.description || '') : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label><img src="icons/misc/link.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Related Items (Characters, Locations, Mechanics, Assets, etc.)</label>
                    <div id="itemRelatedItemsContainer" class="relationships-container">
                        ${(() => {
                            // Show all related items including assets that link to this item
                            const allRelatedItems = [];
                            const seenIds = new Set();
                            
                            // Add direct relationships
                            if (isEdit && itemToEdit.relatedItems) {
                                itemToEdit.relatedItems.forEach(rel => {
                                    const key = `${rel.type}:${rel.id}`;
                                    if (!seenIds.has(key)) {
                                        seenIds.add(key);
                                        allRelatedItems.push(rel);
                                    }
                                });
                            }
                            
                            // Add reverse relationships ONLY from assets (not bidirectional synced items)
                            if (isEdit) {
                                // Find assets that reference this item
                                AppState.assets.forEach(asset => {
                                    if (asset.relatedItems && asset.relatedItems.some(rel => rel.id === itemToEdit.id && rel.type === 'item')) {
                                        const key = `asset:${asset.id}`;
                                        if (!seenIds.has(key)) {
                                            seenIds.add(key);
                                            allRelatedItems.push({ id: asset.id, type: 'asset' });
                                        }
                                    }
                                });
                            }
                            
                            if (allRelatedItems.length > 0) {
                                return allRelatedItems.map(rel => {
                                    const item = RelationshipManager.findItemById(rel.id);
                                    if (!item) return '';
                                    return `<span class="relationship-chip" data-id="${rel.id}" data-type="${rel.type}">
                                        <span class="chip-type">${rel.type}</span>
                                        ${Utils.escapeHtml(item.name)}
                                        <button type="button" class="chip-remove" onclick="this.parentElement.remove()">×</button>
                                    </span>`;
                                }).join('');
                            }
                            return '<p class="empty-state-small">No related items yet</p>';
                        })()}
                    </div>
                    <button type="button" class="btn btn-secondary" id="selectItemRelatedBtn">+ Add Relationships</button>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Item'}</button>
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    ${isEdit ? `<button type="button" class="btn btn-danger" id="deleteItemBtn">Delete Item</button>` : ''}
                </div>
            </form>
        `;
        
        Modal.open(content);
        
        // Handle delete
        if (isEdit) {
            document.getElementById('deleteItemBtn').addEventListener('click', () => {
                Utils.showConfirm('Are you sure you want to delete this item?', () => {
                    const index = AppState.story.items.findIndex(i => i.id === itemToEdit.id);
                    if (index !== -1) {
                        // Clean up relationships
                        RelationshipManager.syncRelationships(
                            { id: itemToEdit.id, type: 'item', name: itemToEdit.name },
                            itemToEdit.relatedItems || [],
                            []
                        );
                        AppState.story.items.splice(index, 1);
                        AppState.save();
                        this.renderItems();
                        RelationshipManager.refreshAllSections();
                        Modal.close();
                    }
                });
            });
        }
        
        // Handle relationship selection
        document.getElementById('selectItemRelatedBtn').addEventListener('click', () => {
            const currentRelated = [];
            document.querySelectorAll('#itemRelatedItemsContainer .relationship-chip').forEach(chip => {
                currentRelated.push({
                    id: chip.getAttribute('data-id'),
                    type: chip.getAttribute('data-type')
                });
            });
            
            const currentItem = {
                id: isEdit ? itemToEdit.id : 'temp-item-' + Date.now(),
                type: 'item',
                name: document.getElementById('itemName').value.trim() || 'Untitled Item',
                data: { relatedItems: currentRelated }
            };
            
            RelationshipManager.openRelationshipSelector(currentItem, (selected) => {
                const container = document.getElementById('itemRelatedItemsContainer');
                if (selected.length === 0) {
                    container.innerHTML = '<p class="empty-state-small">No related items yet</p>';
                } else {
                    container.innerHTML = selected.map(rel => {
                        const item = RelationshipManager.findItemById(rel.id);
                        if (!item) return '';
                        return `<span class="relationship-chip" data-id="${rel.id}" data-type="${rel.type}">
                            <span class="chip-type">${rel.type}</span>
                            ${Utils.escapeHtml(item.name)}
                            <button type="button" class="chip-remove" onclick="this.parentElement.remove()">×</button>
                        </span>`;
                    }).join('');
                }
            });
        });
        
        // Handle form submission
        document.getElementById('addItemForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Collect related items
            const relatedItems = [];
            document.querySelectorAll('#itemRelatedItemsContainer .relationship-chip').forEach(chip => {
                relatedItems.push({
                    id: chip.getAttribute('data-id'),
                    type: chip.getAttribute('data-type')
                });
            });
            
            const itemData = {
                id: isEdit ? itemToEdit.id : Utils.generateId(),
                name: document.getElementById('itemName').value.trim(),
                type: document.getElementById('itemType').value,
                rarity: document.getElementById('itemRarity').value,
                stats: {
                    damage: parseFloat(document.getElementById('itemDamage').value) || 0,
                    defense: parseFloat(document.getElementById('itemDefense').value) || 0,
                    speed: parseFloat(document.getElementById('itemSpeed').value) || 0,
                    health: parseFloat(document.getElementById('itemHealth').value) || 0,
                    energy: parseFloat(document.getElementById('itemEnergy').value) || 0
                },
                effects: document.getElementById('itemEffects').value.trim(),
                description: document.getElementById('itemDescription').value.trim(),
                relatedItems: relatedItems,
                createdAt: isEdit ? itemToEdit.createdAt : new Date().toISOString()
            };
            
            // Sync relationships
            const oldRelatedItems = isEdit ? (itemToEdit.relatedItems || []) : [];
            RelationshipManager.syncRelationships(
                { id: itemData.id, type: 'item', name: itemData.name },
                oldRelatedItems,
                relatedItems
            );
            
            if (!AppState.story.items) {
                AppState.story.items = [];
            }
            
            if (isEdit) {
                const index = AppState.story.items.findIndex(i => i.id === itemToEdit.id);
                AppState.story.items[index] = itemData;
            } else {
                AppState.story.items.push(itemData);
            }
            
            AppState.save();
            this.renderItems();
            
            // Refresh other sections
            RelationshipManager.refreshAllSections();
            
            Modal.close();
        });
    },

    renderItems() {
        const tbody = document.getElementById('itemsTableBody');
        if (!AppState.story.items || AppState.story.items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="12" class="empty-state">
                        No items added yet. Click "Add Item" to create your first item.
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = AppState.story.items.map(item => {
            const stats = item.stats || {};
            return `
                <tr data-item-id="${item.id}">
                    <td class="col-actions">
                        <button class="btn btn-small btn-icon" onclick="StoryManager.openAddItemModal(AppState.story.items.find(i => i.id === '${item.id}'))" title="Edit">
                            <img src="icons/actions/pencil.svg" alt="" width="14" height="14" style="vertical-align: middle;">
                        </button>
                    </td>
                    <td class="col-name">${Utils.escapeHtml(item.name)}</td>
                    <td class="col-type">
                        <span class="item-type-badge item-type-${item.type}">${item.type}</span>
                    </td>
                    <td class="col-rarity">
                        <span class="item-rarity-badge item-rarity-${item.rarity}">${item.rarity}</span>
                    </td>
                    <td class="col-stat">
                        <span class="item-stat ${stats.damage > 0 ? 'positive' : stats.damage < 0 ? 'negative' : ''}">
                            ${stats.damage > 0 ? '+' : ''}${stats.damage || 0}
                        </span>
                    </td>
                    <td class="col-stat">
                        <span class="item-stat ${stats.defense > 0 ? 'positive' : stats.defense < 0 ? 'negative' : ''}">
                            ${stats.defense > 0 ? '+' : ''}${stats.defense || 0}
                        </span>
                    </td>
                    <td class="col-stat">
                        <span class="item-stat ${stats.speed > 0 ? 'positive' : stats.speed < 0 ? 'negative' : ''}">
                            ${stats.speed > 0 ? '+' : ''}${stats.speed || 0}
                        </span>
                    </td>
                    <td class="col-stat">
                        <span class="item-stat ${stats.health > 0 ? 'positive' : stats.health < 0 ? 'negative' : ''}">
                            ${stats.health > 0 ? '+' : ''}${stats.health || 0}
                        </span>
                    </td>
                    <td class="col-stat">
                        <span class="item-stat ${stats.energy > 0 ? 'positive' : stats.energy < 0 ? 'negative' : ''}">
                            ${stats.energy > 0 ? '+' : ''}${stats.energy || 0}
                        </span>
                    </td>
                    <td class="col-effects">${Utils.escapeHtml(item.effects || '—')}</td>
                    <td class="col-relationships">
                        ${item.relatedItems && item.relatedItems.length > 0
                            ? item.relatedItems.map(rel => {
                                const relItem = RelationshipManager.findItemById(rel.id);
                                if (!relItem) return '';
                                return `<span class="relationship-chip-small clickable" data-id="${rel.id}" data-type="${rel.type}">
                                    <span class="chip-type">${rel.type}</span>
                                    ${Utils.escapeHtml(relItem.name)}
                                </span>`;
                            }).join('')
                            : '—'}
                    </td>
                    <td class="col-description">${Utils.escapeHtml(item.description || '—')}</td>
                </tr>
            `;
        }).join('');
        
        // Make relationship chips clickable
        RelationshipManager.makeChipsClickable(tbody);
    },

    filterItems(searchTerm) {
        const rows = document.querySelectorAll('#itemsTableBody tr[data-item-id]');
        const term = searchTerm.toLowerCase();
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    }
};

// ============================================
// Quest Manager
// ============================================
// Manages quest definitions, objectives, and quest chains
// Supports quest types (main, side, optional) and status tracking
// Tracks quest givers, rewards, and related story elements
// Provides search, filtering, and quest organization tools
// Links quests to characters and story progression
const QuestManager = {
    /**
     * Initializes quest manager
     * Ensures quests array exists and attaches listeners to quest controls
     */
    init() {
        // Initialize quests array if it doesn't exist (for new projects)
        if (!AppState.story.quests) {
            AppState.story.quests = [];
        }
        
        // Add Quest button
        document.getElementById('addQuestBtn')?.addEventListener('click', () => {
            this.openAddModal();
        });
        
        // Search/filter listeners
        document.getElementById('questsSearchInput')?.addEventListener('input', (e) => {
            this.filterQuests(e.target.value);
        });
        
        // Quest type filter
        document.getElementById('questTypeFilter')?.addEventListener('change', () => {
            this.renderQuests();
        });
        
        // Quest status filter
        document.getElementById('questStatusFilter')?.addEventListener('change', () => {
            this.renderQuests();
        });
        
        // Initial render
        this.renderQuests();
    },
    
    openAddModal(questToEdit = null) {
        const isEdit = !!questToEdit;
        const title = isEdit ? 'Edit Quest' : 'Add New Quest';
        
        // Get all available items for relationships
        const allItems = RelationshipManager.getAllItems();
        
        const modalHTML = `
            <div class="quest-modal">
                <h2>${title}</h2>
                <form id="questForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="questTitle">Quest Title *</label>
                            <input type="text" id="questTitle" value="${isEdit ? Utils.escapeHtml(questToEdit.title) : ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="questType">Type</label>
                            <select id="questType">
                                <option value="main" ${isEdit && questToEdit.type === 'main' ? 'selected' : ''}>Main Quest</option>
                                <option value="side" ${isEdit && questToEdit.type === 'side' ? 'selected' : ''}>Side Quest</option>
                                <option value="optional" ${isEdit && questToEdit.type === 'optional' ? 'selected' : ''}>Optional</option>
                                <option value="hidden" ${isEdit && questToEdit.type === 'hidden' ? 'selected' : ''}>Hidden</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="questStatus">Status</label>
                            <select id="questStatus">
                                <option value="locked" ${isEdit && questToEdit.status === 'locked' ? 'selected' : ''}>Locked</option>
                                <option value="available" ${isEdit && questToEdit.status === 'available' ? 'selected' : 'selected'}>Available</option>
                                <option value="active" ${isEdit && questToEdit.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="completed" ${isEdit && questToEdit.status === 'completed' ? 'selected' : ''}>Completed</option>
                                <option value="failed" ${isEdit && questToEdit.status === 'failed' ? 'selected' : ''}>Failed</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="questDescription">Description</label>
                        <textarea id="questDescription" rows="3">${isEdit ? Utils.escapeHtml(questToEdit.description || '') : ''}</textarea>
                    </div>
                    
                    <div class="form-section">
                        <h3><img src="icons/misc/checklist.svg" alt="" width="16" height="16" style="vertical-align: middle;"> Objectives</h3>
                        <div id="questObjectivesList"></div>
                        <button type="button" class="btn btn-secondary btn-small" id="addObjectiveBtn">
                            <img src="icons/actions/add.svg" alt="" width="14" height="14"> Add Objective
                        </button>
                    </div>
                    
                    <div class="form-row form-row-2col">
                        <div class="form-group">
                            <label for="questRewardExp">Reward - Experience</label>
                            <input type="number" id="questRewardExp" min="0" value="${isEdit ? questToEdit.rewards?.experience || 0 : 0}">
                        </div>
                        <div class="form-group">
                            <label for="questRewardCurrency">Reward - Currency</label>
                            <input type="number" id="questRewardCurrency" min="0" value="${isEdit ? questToEdit.rewards?.currency || 0 : 0}">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label><img src="icons/misc/link.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Related Items</label>
                        <button type="button" class="btn btn-small btn-secondary" id="manageQuestRelatedBtn">
                            <img src="icons/misc/link.svg" alt="" width="14" height="14"> Manage Related Items
                        </button>
                        <div id="questRelatedItemsDisplay" class="related-items-preview"></div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            <img src="icons/actions/save.svg" alt="" width="16" height="16"> ${isEdit ? 'Update' : 'Create'} Quest
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        
        Modal.open(modalHTML);
        
        // Initialize objectives
        let objectives = isEdit ? [...(questToEdit.objectives || [])] : [];
        
        // Initialize related items - include assets that link to this quest
        let relatedItems = [];
        const seenIds = new Set();
        
        if (isEdit) {
            // Add direct relationships
            if (questToEdit.relatedItems) {
                questToEdit.relatedItems.forEach(rel => {
                    const key = `${rel.type}:${rel.id}`;
                    if (!seenIds.has(key)) {
                        seenIds.add(key);
                        relatedItems.push(rel);
                    }
                });
            }
            
            // Add reverse relationships ONLY from assets (not bidirectional synced items)
            AppState.assets.forEach(asset => {
                if (asset.relatedItems && asset.relatedItems.some(rel => rel.id === questToEdit.id && rel.type === 'quest')) {
                    const key = `asset:${asset.id}`;
                    if (!seenIds.has(key)) {
                        seenIds.add(key);
                        relatedItems.push({ id: asset.id, type: 'asset' });
                    }
                }
            });
        }
        
        const renderObjectives = () => {
            const list = document.getElementById('questObjectivesList');
            if (!list) return;
            
            if (objectives.length === 0) {
                list.innerHTML = '<p class="empty-state-small">No objectives yet. Add objectives for this quest.</p>';
                return;
            }
            
            list.innerHTML = objectives.map((obj, index) => `
                <div class="objective-item">
                    <div class="objective-content">
                        <span class="objective-number">${index + 1}.</span>
                        <span class="objective-text">${Utils.escapeHtml(obj.description)}</span>
                        ${obj.required ? '<span class="badge badge-required">Required</span>' : '<span class="badge badge-optional">Optional</span>'}
                    </div>
                    <button type="button" class="btn btn-icon" data-remove-objective="${index}">
                        <img src="icons/actions/delete.svg" alt="" width="14" height="14">
                    </button>
                </div>
            `).join('');
            
            // Attach delete handlers
            list.querySelectorAll('[data-remove-objective]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.removeObjective);
                    Utils.showConfirm('Remove this objective?', () => {
                        objectives.splice(index, 1);
                        this.tempObjectives = objectives;
                        renderObjectives();
                    });
                });
            });
        };
        
        const renderRelatedItems = () => {
            const display = document.getElementById('questRelatedItemsDisplay');
            if (!display) return;
            
            if (relatedItems.length === 0) {
                display.innerHTML = '<p class="empty-state-small">No related items</p>';
                return;
            }
            
            display.innerHTML = relatedItems.map(rel => {
                const item = RelationshipManager.getItemById(rel.type, rel.id);
                return `
                    <span class="relationship-chip-small">
                        <span class="chip-type">${rel.type}</span>
                        ${item ? Utils.escapeHtml(item.name) : 'Unknown'}
                    </span>
                `;
            }).join('');
        };
        
        // Store in temp variable for access in modal
        this.tempObjectives = objectives;
        this.tempRelatedItems = relatedItems;
        
        // Wait for modal to be rendered, then attach event listeners
        setTimeout(() => {
            renderObjectives();
            renderRelatedItems();
            
            // Add objective button
            const addObjectiveBtn = document.getElementById('addObjectiveBtn');
            if (addObjectiveBtn) {
                addObjectiveBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    Utils.showPrompt('Objective description:', '', (description) => {
                        if (description && description.trim()) {
                            Utils.showConfirm('Is this objective required?', () => {
                                // Required
                                objectives.push({
                                    id: `obj_${Date.now()}`,
                                    description: description.trim(),
                                    required: true,
                                    completed: false
                                });
                                this.tempObjectives = objectives;
                                renderObjectives();
                            }, () => {
                                // Optional
                                objectives.push({
                                    id: `obj_${Date.now()}`,
                                    description: description.trim(),
                                    required: false,
                                    completed: false
                                });
                                this.tempObjectives = objectives;
                                renderObjectives();
                            });
                        }
                    });
                });
            }
            
            // Manage relationships button
            const manageRelatedBtn = document.getElementById('manageQuestRelatedBtn');
            if (manageRelatedBtn) {
                manageRelatedBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    RelationshipManager.openRelationshipModal(
                        { id: isEdit ? questToEdit.id : 'new', type: 'quest', name: document.getElementById('questTitle')?.value || 'New Quest' },
                        relatedItems,
                        (updatedRelations) => {
                            relatedItems = updatedRelations;
                            this.tempRelatedItems = relatedItems;
                            renderRelatedItems();
                        }
                    );
                });
            }
        }, 50);
        
        // Form submission
        document.getElementById('questForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const questData = {
                id: isEdit ? questToEdit.id : `quest_${Date.now()}`,
                title: document.getElementById('questTitle').value.trim(),
                description: document.getElementById('questDescription').value.trim(),
                type: document.getElementById('questType').value,
                status: document.getElementById('questStatus').value,
                objectives: objectives,
                rewards: {
                    experience: parseInt(document.getElementById('questRewardExp').value) || 0,
                    currency: parseInt(document.getElementById('questRewardCurrency').value) || 0,
                    items: [] // Can be extended later
                },
                prerequisites: {
                    quests: [], // Can be extended later
                    level: 0,
                    items: []
                },
                relatedItems: relatedItems,
                createdAt: isEdit ? questToEdit.createdAt : new Date().toISOString()
            };
            
            // Add map position if creating from map toolbox
            if (!isEdit && this.tempMapPosition) {
                questData.mapPosition = this.tempMapPosition;
                this.tempMapPosition = null; // Clear temporary position
            } else if (isEdit && questToEdit.mapPosition) {
                questData.mapPosition = questToEdit.mapPosition; // Preserve existing position
            }
            
            // Sync relationships
            const oldRelatedItems = isEdit ? (questToEdit.relatedItems || []) : [];
            RelationshipManager.syncRelationships(
                { id: questData.id, type: 'quest', name: questData.title },
                oldRelatedItems,
                relatedItems
            );
            
            if (!AppState.story.quests) {
                AppState.story.quests = [];
            }
            
            if (isEdit) {
                const index = AppState.story.quests.findIndex(q => q.id === questToEdit.id);
                AppState.story.quests[index] = questData;
            } else {
                AppState.story.quests.push(questData);
            }
            
            AppState.save();
            this.renderQuests();
            RelationshipManager.refreshAllSections();
            
            // Refresh story map nodes if map is loaded
            /* DISABLED - Story Map feature commented out
            if (typeof StoryMap !== 'undefined' && StoryMap.loadMapNodes) {
                StoryMap.loadMapNodes(); // Already calls buildQuestConnections
                StoryMap.render();
            }
            */
            
            Modal.close();
            Utils.showNotification(isEdit ? 'Quest updated successfully' : 'Quest created successfully', 'success');
        });
    },
    
    removeObjective(index) {
        if (this.tempObjectives) {
            Utils.showConfirm('Remove this objective?', () => {
                this.tempObjectives.splice(index, 1);
                const list = document.getElementById('questObjectivesList');
                if (this.tempObjectives.length === 0) {
                    list.innerHTML = '<p class="empty-state-small">No objectives yet. Add objectives for this quest.</p>';
                } else {
                    list.innerHTML = this.tempObjectives.map((obj, i) => `
                        <div class="objective-item">
                            <div class="objective-content">
                                <span class="objective-number">${i + 1}.</span>
                                <span class="objective-text">${Utils.escapeHtml(obj.description)}</span>
                                ${obj.required ? '<span class="badge badge-required">Required</span>' : '<span class="badge badge-optional">Optional</span>'}
                            </div>
                            <button type="button" class="btn btn-icon" onclick="QuestManager.removeObjective(${i})">
                                <img src="icons/actions/delete.svg" alt="" width="14" height="14">
                            </button>
                        </div>
                    `).join('');
                }
            });
        }
    },
    
    renderQuests() {
        const container = document.getElementById('questsContainer');
        
        if (!AppState.story.quests || AppState.story.quests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <img src="icons/misc/gameplay.svg" alt="" width="64" height="64" style="opacity: 0.3;">
                    <p>No quests yet</p>
                    <button class="btn btn-primary" onclick="QuestManager.openAddModal()">
                        <img src="icons/actions/add.svg" alt="" width="16" height="16"> Create Your First Quest
                    </button>
                </div>
            `;
            return;
        }
        
        // Get filter values
        const typeFilter = document.getElementById('questTypeFilter')?.value || '';
        const statusFilter = document.getElementById('questStatusFilter')?.value || '';
        const searchTerm = document.getElementById('questsSearchInput')?.value.toLowerCase() || '';
        
        // Filter quests
        let filteredQuests = AppState.story.quests.filter(quest => {
            if (typeFilter && quest.type !== typeFilter) return false;
            if (statusFilter && quest.status !== statusFilter) return false;
            if (searchTerm) {
                const searchableText = `${quest.title} ${quest.description}`.toLowerCase();
                if (!searchableText.includes(searchTerm)) return false;
            }
            return true;
        });
        
        // Group by status
        const statusGroups = {
            locked: [],
            available: [],
            active: [],
            completed: [],
            failed: []
        };
        
        filteredQuests.forEach(quest => {
            statusGroups[quest.status].push(quest);
        });
        
        const statusConfig = {
            locked: { label: 'Locked', icon: 'icons/status/blocked.svg', color: '#6b7280' },
            available: { label: 'Available', icon: 'icons/misc/star.svg', color: '#3b82f6' },
            active: { label: 'Active', icon: 'icons/actions/play.svg', color: '#10b981' },
            completed: { label: 'Completed', icon: 'icons/actions/success.svg', color: '#8b5cf6' },
            failed: { label: 'Failed', icon: 'icons/actions/error.svg', color: '#ef4444' }
        };
        
        container.innerHTML = `
            <div class="quests-board">
                ${Object.entries(statusGroups).map(([status, quests]) => {
                    const config = statusConfig[status];
                    return `
                        <div class="quest-column">
                            <div class="quest-column-header" style="border-color: ${config.color}">
                                <img src="${config.icon}" alt="" width="16" height="16">
                                <h3>${config.label}</h3>
                                <span class="quest-count">${quests.length}</span>
                            </div>
                            <div class="quest-column-body">
                                ${quests.length === 0 ? '<p class="empty-state-small">No quests</p>' : 
                                    quests.map(quest => this.renderQuestCard(quest, config.color)).join('')
                                }
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },
    
    renderQuestCard(quest, statusColor) {
        const typeLabels = {
            main: 'Main',
            side: 'Side',
            optional: 'Optional',
            hidden: 'Hidden'
        };
        
        const completedObjectives = quest.objectives?.filter(obj => obj.completed).length || 0;
        const totalObjectives = quest.objectives?.length || 0;
        const progress = totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0;
        
        return `
            <div class="quest-card" data-quest-id="${quest.id}" style="border-left-color: ${statusColor}">
                <div class="quest-card-header">
                    <h4 class="quest-title">${Utils.escapeHtml(quest.title)}</h4>
                    <span class="quest-type-badge badge-${quest.type}">${typeLabels[quest.type]}</span>
                </div>
                
                ${quest.description ? `<p class="quest-description">${Utils.escapeHtml(quest.description)}</p>` : ''}
                
                ${totalObjectives > 0 ? `
                    <div class="quest-objectives">
                        <div class="quest-progress">
                            <span class="progress-text">${completedObjectives}/${totalObjectives} objectives</span>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress}%; background-color: ${statusColor}"></div>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                ${quest.rewards && (quest.rewards.experience > 0 || quest.rewards.currency > 0) ? `
                    <div class="quest-rewards">
                        <span class="reward-label">Rewards:</span>
                        ${quest.rewards.experience > 0 ? `<span class="reward-item">✨ ${quest.rewards.experience} XP</span>` : ''}
                        ${quest.rewards.currency > 0 ? `<span class="reward-item">💰 ${quest.rewards.currency}</span>` : ''}
                    </div>
                ` : ''}
                
                ${quest.relatedItems && quest.relatedItems.length > 0 ? `
                    <div class="quest-relationships">
                        <img src="icons/misc/link.svg" alt="" width="12" height="12" style="vertical-align: middle;">
                        <span>${quest.relatedItems.length} related item(s)</span>
                    </div>
                ` : ''}
                
                <div class="quest-card-actions">
                    <button class="btn btn-icon" onclick="QuestManager.openAddModal(AppState.story.quests.find(q => q.id === '${quest.id}'))" title="Edit">
                        <img src="icons/actions/pencil.svg" alt="" width="14" height="14">
                    </button>
                    <button class="btn btn-icon" onclick="QuestManager.deleteQuest('${quest.id}')" title="Delete">
                        <img src="icons/actions/delete.svg" alt="" width="14" height="14">
                    </button>
                </div>
            </div>
        `;
    },
    
    deleteQuest(questId) {
        const quest = AppState.story.quests.find(q => q.id === questId);
        if (!quest) return;
        
        RelationshipManager.confirmDeleteWithImpact(questId, quest.title, 'quest', () => {
            // Remove from array
            AppState.story.quests = AppState.story.quests.filter(q => q.id !== questId);
            AppState.save();
            
            // Clean up any orphaned relationships
            RelationshipManager.cleanupOrphanedRelationships();
            
            this.renderQuests();
            RelationshipManager.refreshAllSections();
            Utils.showNotification('Quest deleted', 'success');
        });
    },
    
    filterQuests(searchTerm) {
        this.renderQuests();
    }
};

// ============================================
// Story Map Visualization
// ============================================
/* STORY MAP FEATURE DISABLED - COMMENTED OUT FOR RELEASE
const StoryMap = {
    canvas: null,
    ctx: null,
    scenes: [],
    nodes: [],  // All node types: quests, characters, locations, items
    connections: [],
    selectedScene: null,
    selectedNode: null,
    selectedQuestForConnection: null,  // Track quest when creating manual connections
    nodeVisibility: { quests: true, characters: true, locations: true, scenes: true },  // Toggle node visibility
    draggedScene: null,
    draggedNode: null,
    draggedWaypoint: null,  // Track waypoint being dragged
    isDragging: false,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    panStart: null,
    currentActFilter: '',
    showAllConnections: true,
    showQuestPaths: true,
    backgroundImage: null,  // Loaded Image object
    toolboxOpen: false,
    colors: {
        connection: '#E02424',
        selectedConnection: '#FF4444',
        sceneDefault: '#ffffff',
        sceneBorder: '#E02424',
        sceneSelected: '#FFE5E5',
        questNode: '#10b981',
        questConnection: '#059669',
        characterNode: '#3b82f6',
        locationNode: '#f59e0b',
        itemNode: '#8b5cf6'
    },
    
    init() {
        // Map controls
        document.getElementById('mapZoomIn')?.addEventListener('click', () => this.zoom(0.2));
        document.getElementById('mapZoomOut')?.addEventListener('click', () => this.zoom(-0.2));
        document.getElementById('mapResetZoom')?.addEventListener('click', () => this.resetView());
        document.getElementById('mapExport')?.addEventListener('click', () => this.exportAsImage());
        document.getElementById('showAllConnections')?.addEventListener('change', (e) => {
            this.showAllConnections = e.target.checked;
            this.render();
        });
        document.getElementById('actFilterSelect')?.addEventListener('change', (e) => {
            this.currentActFilter = e.target.value;
            this.render();
        });
        
        // Background map controls
        document.getElementById('mapUploadBackground')?.addEventListener('click', () => {
            document.getElementById('mapBackgroundInput').click();
        });
        document.getElementById('mapBackgroundInput')?.addEventListener('change', (e) => {
            this.uploadBackgroundImage(e.target.files[0]);
        });
        document.getElementById('mapClearBackground')?.addEventListener('click', () => {
            this.clearBackgroundImage();
        });
        document.getElementById('mapOpacitySlider')?.addEventListener('input', (e) => {
            const opacity = parseInt(e.target.value) / 100;
            document.getElementById('mapOpacityValue').textContent = e.target.value + '%';
            if (AppState.story.backgroundMap) {
                AppState.story.backgroundMap.opacity = opacity;
                AppState.save();
                this.render();
            }
        });
        
        // Map toolbox buttons
        document.getElementById('addQuestToMapBtn')?.addEventListener('click', () => {
            this.addQuestToMap();
        });
        document.getElementById('addCharacterToMapBtn')?.addEventListener('click', () => {
            this.addCharacterToMap();
        });
        document.getElementById('addLocationToMapBtn')?.addEventListener('click', () => {
            this.addLocationToMap();
        });
        
        // Visibility toggles
        document.getElementById('toggleQuestsVisibility')?.addEventListener('change', (e) => {
            this.nodeVisibility.quests = e.target.checked;
            this.render();
        });
        document.getElementById('toggleCharactersVisibility')?.addEventListener('change', (e) => {
            this.nodeVisibility.characters = e.target.checked;
            this.render();
        });
        document.getElementById('toggleLocationsVisibility')?.addEventListener('change', (e) => {
            this.nodeVisibility.locations = e.target.checked;
            this.render();
        });
        document.getElementById('toggleScenesVisibility')?.addEventListener('change', (e) => {
            this.nodeVisibility.scenes = e.target.checked;
            this.render();
        });
        
        // Auto-layout button
        document.getElementById('autoLayoutBtn')?.addEventListener('click', () => {
            this.autoLayout();
        });
        
        // Prevent toolbox scroll from affecting canvas
        const toolbox = document.querySelector('.story-map-toolbox');
        if (toolbox) {
            // Track if mouse is over toolbox
            let isOverToolbox = false;
            
            toolbox.addEventListener('mouseenter', () => {
                isOverToolbox = true;
            });
            
            toolbox.addEventListener('mouseleave', () => {
                isOverToolbox = false;
            });
            
            // Prevent wheel events on toolbox from reaching canvas
            toolbox.addEventListener('wheel', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                // Manually handle scroll
                toolbox.scrollTop += e.deltaY;
            });
            
            // Also prevent wheel events at container level if over toolbox
            const container = document.getElementById('storyMapContainer');
            if (container) {
                container.addEventListener('wheel', (e) => {
                    if (isOverToolbox) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                }, { passive: false });
            }
        }
    },
    
    initializeMap() {
        this.canvas = document.getElementById('storyMapCanvas');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        const container = document.getElementById('storyMapContainer');
        
        // Set canvas size
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load scenes from AppState
        this.loadScenes();
        
        // Render
        this.render();
    },
    
    loadScenes() {
        this.scenes = [];
        this.connections = [];
        
        if (!AppState.story || !AppState.story.acts) return;
        
        // Load background image if available
        this.loadBackgroundImage();
        
        // Update act filter dropdown
        const actFilter = document.getElementById('actFilterSelect');
        if (actFilter) {
            actFilter.innerHTML = '<option value="">All Acts</option>' +
                AppState.story.acts.map(act => 
                    `<option value="${act.id}">${Utils.escapeHtml(act.title)}</option>`
                ).join('');
        }
        
        // Convert scenes to map nodes
        let yOffset = 100;
        AppState.story.acts.forEach((act, actIndex) => {
            const actColor = this.getActColor(actIndex);
            let xOffset = 100;
            
            act.scenes.forEach((scene, sceneIndex) => {
                // Initialize position if not set (smaller spacing for pins)
                if (!scene.mapPosition) {
                    scene.mapPosition = { x: xOffset, y: yOffset };
                    xOffset += 80;  // Reduced spacing for compact pins
                }
                
                this.scenes.push({
                    id: scene.id,
                    actId: act.id,
                    actIndex: actIndex,  // Track act number
                    actTitle: act.title,
                    actColor: actColor,
                    title: scene.title,
                    description: scene.description || '',
                    location: scene.location || '',
                    characters: scene.characters || [],
                    x: scene.mapPosition.x,
                    y: scene.mapPosition.y,
                    width: 30,   // Smaller hitbox for pins
                    height: 35,  // Taller to include label area
                    sceneIndex: sceneIndex,
                    nextSceneId: sceneIndex < act.scenes.length - 1 ? act.scenes[sceneIndex + 1].id : null
                });
            });
            
            yOffset += 120;  // Reduced spacing between acts for compact pins
        });
        
        // Build connections
        this.scenes.forEach(scene => {
            if (scene.nextSceneId) {
                const conn = {
                    from: scene.id,
                    to: scene.nextSceneId,
                    actId: scene.actId,
                    color: scene.actColor,
                    waypoints: [],
                    type: 'scene'
                };
                
                // Load waypoints from AppState if they exist
                const waypointKey = `${conn.from}_${conn.to}`;
                if (AppState.story.connectionWaypoints && AppState.story.connectionWaypoints[waypointKey]) {
                    conn.waypoints = [...AppState.story.connectionWaypoints[waypointKey]];
                }
                
                this.connections.push(conn);
            }
        });
        
        // Load other node types (quests, characters, locations)
        this.loadMapNodes();
    },
    
    loadMapNodes() {
        this.nodes = [];
        
        // Load Quests
        if (AppState.story.quests) {
            AppState.story.quests.forEach((quest, index) => {
                if (!quest.mapPosition) {
                    // Default position if not set
                    quest.mapPosition = { x: 400 + (index * 100), y: 150 };
                }
                
                this.nodes.push({
                    id: quest.id,
                    type: 'quest',
                    title: quest.title,
                    description: quest.description || '',
                    data: quest,
                    x: quest.mapPosition.x,
                    y: quest.mapPosition.y,
                    width: 40,
                    height: 40,
                    color: this.colors.questNode
                });
            });
        }
        
        // Load Characters
        if (AppState.story.characters) {
            AppState.story.characters.forEach((character, index) => {
                if (!character.mapPosition) {
                    character.mapPosition = { x: 400 + (index * 100), y: 300 };
                }
                
                this.nodes.push({
                    id: character.id,
                    type: 'character',
                    title: character.name,
                    description: character.description || '',
                    data: character,
                    x: character.mapPosition.x,
                    y: character.mapPosition.y,
                    width: 40,
                    height: 40,
                    color: this.colors.characterNode
                });
            });
        }
        
        // Load Locations
        if (AppState.story.locations) {
            AppState.story.locations.forEach((location, index) => {
                if (!location.mapPosition) {
                    location.mapPosition = { x: 400 + (index * 100), y: 450 };
                }
                
                this.nodes.push({
                    id: location.id,
                    type: 'location',
                    title: location.name,
                    description: location.description || '',
                    data: location,
                    x: location.mapPosition.x,
                    y: location.mapPosition.y,
                    width: 40,
                    height: 40,
                    color: this.colors.locationNode
                });
            });
        }
        
        // Build quest path connections
        this.buildQuestConnections();
    },
    
    buildQuestConnections() {
        if (!AppState.story.quests) return;
        
        // Remove existing quest connections before rebuilding
        this.connections = this.connections.filter(conn => conn.type !== 'quest');
        
        AppState.story.quests.forEach(quest => {
            // Connect quest to related items
            if (quest.relatedItems && quest.relatedItems.length > 0) {
                quest.relatedItems.forEach(rel => {
                    // Find the target node
                    const targetNode = this.nodes.find(n => n.id === rel.id && n.type === rel.type);
                    const targetScene = this.scenes.find(s => s.id === rel.id);
                    
                    if (targetNode || targetScene) {
                        const conn = {
                            from: quest.id,
                            to: rel.id,
                            color: this.colors.questConnection,
                            waypoints: [],
                            type: 'quest',
                            dashed: true
                        };
                        
                        // Load waypoints from AppState if they exist
                        const waypointKey = `${conn.from}_${conn.to}`;
                        if (AppState.story.connectionWaypoints && AppState.story.connectionWaypoints[waypointKey]) {
                            conn.waypoints = [...AppState.story.connectionWaypoints[waypointKey]];
                        }
                        
                        this.connections.push(conn);
                    }
                });
            }
        });
    },
    
    createQuestConnection(questNode, targetNode) {
        // Find the quest in AppState
        const quest = AppState.story.quests.find(q => q.id === questNode.id);
        if (!quest) return;
        
        // Check if connection already exists
        if (!quest.relatedItems) quest.relatedItems = [];
        const exists = quest.relatedItems.some(rel => rel.id === targetNode.id && rel.type === targetNode.type);
        
        if (exists) {
            Utils.showNotification('Connection already exists', 'warning');
            return;
        }
        
        // Add relationship
        quest.relatedItems.push({
            id: targetNode.id,
            type: targetNode.type
        });
        
        // Sync relationships
        RelationshipManager.syncRelationships(
            { id: quest.id, type: 'quest', name: quest.title },
            [],
            quest.relatedItems
        );
        
        AppState.save();
        
        // Rebuild connections and render (loadMapNodes already calls buildQuestConnections)
        this.loadMapNodes();
        this.render();
        
        Utils.showNotification(`Connected quest "${quest.title}" to ${targetNode.type} "${targetNode.name}"`, 'success');
    },
    
    showNodeContextMenu(node, event) {
        // Remove any existing context menu
        const existing = document.querySelector('.map-context-menu');
        if (existing) existing.remove();
        
        const rect = this.canvas.getBoundingClientRect();
        const menu = document.createElement('div');
        menu.className = 'map-context-menu';
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
        
        let menuHTML = `<div class="context-menu-title">${node.name}</div>`;
        
        // Quest-specific options
        if (node.type === 'quest') {
            const quest = AppState.story.quests.find(q => q.id === node.id);
            if (quest) {
                menuHTML += `
                    <button class="context-menu-item" data-action="status-locked">🔒 Mark Locked</button>
                    <button class="context-menu-item" data-action="status-available">📋 Mark Available</button>
                    <button class="context-menu-item" data-action="status-active">⚡ Mark Active</button>
                    <button class="context-menu-item" data-action="status-completed">✅ Mark Completed</button>
                    <button class="context-menu-item" data-action="status-failed">❌ Mark Failed</button>
                    <div class="context-menu-divider"></div>
                `;
            }
        }
        
        // Common options
        menuHTML += `
            <button class="context-menu-item" data-action="edit">✏️ Edit</button>
            <button class="context-menu-item" data-action="delete">🗑️ Delete</button>
            <button class="context-menu-item" data-action="zoom">🔍 Zoom to Node</button>
        `;
        
        menu.innerHTML = menuHTML;
        document.body.appendChild(menu);
        
        // Handle menu actions
        menu.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                this.handleContextMenuAction(node, action);
                menu.remove();
            });
        });
        
        // Close menu on outside click
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 10);
    },
    
    handleContextMenuAction(node, action) {
        if (action.startsWith('status-')) {
            // Quest status change
            const newStatus = action.replace('status-', '');
            const quest = AppState.story.quests.find(q => q.id === node.id);
            if (quest) {
                quest.status = newStatus;
                AppState.save();
                this.loadMapNodes();
                this.render();
                Utils.showNotification(`Quest status changed to ${newStatus}`, 'success');
                if (QuestManager.renderQuests) QuestManager.renderQuests();
            }
        } else if (action === 'edit') {
            // Open edit modal
            if (node.type === 'quest') {
                const quest = AppState.story.quests.find(q => q.id === node.id);
                if (quest && QuestManager.openAddModal) QuestManager.openAddModal(quest);
            } else if (node.type === 'character') {
                const character = AppState.story.characters.find(c => c.id === node.id);
                if (character && StoryManager.openAddCharacterModal) StoryManager.openAddCharacterModal(character);
            } else if (node.type === 'location') {
                const location = AppState.story.locations.find(l => l.id === node.id);
                if (location && StoryManager.openAddLocationModal) StoryManager.openAddLocationModal(location);
            }
        } else if (action === 'delete') {
            // Delete node
            if (node.type === 'quest') {
                QuestManager.deleteQuest(node.id);
            } else if (node.type === 'character') {
                const character = AppState.story.characters.find(c => c.id === node.id);
                if (character) {
                    RelationshipManager.confirmDeleteWithImpact(node.id, node.name, 'character', () => {
                        AppState.story.characters = AppState.story.characters.filter(c => c.id !== node.id);
                        AppState.save();
                        RelationshipManager.cleanupOrphanedRelationships();
                        this.loadMapNodes(); // Already calls buildQuestConnections
                        this.render();
                        if (StoryManager.renderCharacters) StoryManager.renderCharacters();
                    });
                }
            } else if (node.type === 'location') {
                const location = AppState.story.locations.find(l => l.id === node.id);
                if (location) {
                    RelationshipManager.confirmDeleteWithImpact(node.id, node.name, 'location', () => {
                        AppState.story.locations = AppState.story.locations.filter(l => l.id !== node.id);
                        AppState.save();
                        RelationshipManager.cleanupOrphanedRelationships();
                        this.loadMapNodes(); // Already calls buildQuestConnections
                        this.render();
                        if (StoryManager.renderLocations) StoryManager.renderLocations();
                    });
                }
            }
        } else if (action === 'zoom') {
            // Zoom to node
            this.zoomToNode(node);
        }
    },
    
    showConnectionContextMenu(conn, fromObj, toObj, event) {
        // Remove any existing context menu
        const existing = document.querySelector('.map-context-menu');
        if (existing) existing.remove();
        
        const menu = document.createElement('div');
        menu.className = 'map-context-menu';
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
        
        const fromName = fromObj.name || fromObj.title;
        const toName = toObj.name || toObj.title;
        
        menu.innerHTML = `
            <div class="context-menu-title">Connection</div>
            <div style="padding: 8px 16px; font-size: 0.85rem; color: var(--text-secondary);">
                ${fromName} → ${toName}
            </div>
            <div class="context-menu-divider"></div>
            <button class="context-menu-item" data-action="delete">🗑️ Delete Connection</button>
        `;
        
        document.body.appendChild(menu);
        
        // Handle delete action
        menu.querySelector('[data-action="delete"]').addEventListener('click', () => {
            this.deleteQuestConnection(conn, fromObj);
            menu.remove();
        });
        
        // Close menu on outside click
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 10);
    },
    
    deleteQuestConnection(conn, questNode) {
        // Find the quest and remove the related item
        const quest = AppState.story.quests.find(q => q.id === questNode.id);
        if (!quest) return;
        
        if (!quest.relatedItems) quest.relatedItems = [];
        
        // Remove the connection and its waypoints
        quest.relatedItems = quest.relatedItems.filter(rel => rel.id !== conn.to);
        
        // Remove waypoints from storage
        const waypointKey = `${conn.from}_${conn.to}`;
        if (AppState.story.connectionWaypoints && AppState.story.connectionWaypoints[waypointKey]) {
            delete AppState.story.connectionWaypoints[waypointKey];
        }
        
        // Sync relationships
        RelationshipManager.syncRelationships(
            { id: quest.id, type: 'quest', name: quest.title },
            [],
            quest.relatedItems
        );
        
        AppState.save();
        
        // Rebuild and render (loadMapNodes already calls buildQuestConnections)
        this.loadMapNodes();
        this.render();
        
        Utils.showNotification('Connection deleted', 'success');
    },
    
    zoomToNode(node) {
        // Calculate target position to center the node
        const targetX = -node.x - node.width / 2;
        const targetY = -node.y - node.height / 2;
        
        // Animate to position
        const duration = 300;
        const startX = this.offsetX;
        const startY = this.offsetY;
        const startScale = this.scale;
        const targetScale = 1.5;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
            
            this.offsetX = startX + (targetX * targetScale + this.canvas.width / 2 - startX) * eased;
            this.offsetY = startY + (targetY * targetScale + this.canvas.height / 2 - startY) * eased;
            this.scale = startScale + (targetScale - startScale) * eased;
            
            this.render();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    },
    
    fitToView() {
        // Calculate bounding box of all visible nodes and scenes
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasItems = false;
        
        // Include scenes if visible
        if (this.nodeVisibility.scenes) {
            this.scenes.forEach(scene => {
                if (!this.currentActFilter || scene.actId === this.currentActFilter) {
                    minX = Math.min(minX, scene.x);
                    minY = Math.min(minY, scene.y);
                    maxX = Math.max(maxX, scene.x + scene.width);
                    maxY = Math.max(maxY, scene.y + scene.height);
                    hasItems = true;
                }
            });
        }
        
        // Include nodes based on visibility
        this.nodes.forEach(node => {
            const shouldInclude = (
                (node.type === 'quest' && this.nodeVisibility.quests) ||
                (node.type === 'character' && this.nodeVisibility.characters) ||
                (node.type === 'location' && this.nodeVisibility.locations)
            );
            
            if (shouldInclude) {
                minX = Math.min(minX, node.x);
                minY = Math.min(minY, node.y);
                maxX = Math.max(maxX, node.x + node.width);
                maxY = Math.max(maxY, node.y + node.height);
                hasItems = true;
            }
        });
        
        if (!hasItems) {
            Utils.showNotification('No visible items to fit', 'warning');
            return;
        }
        
        // Add padding
        const padding = 100;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;
        
        // Calculate center and scale
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const targetScale = Math.min(
            this.canvas.width / contentWidth,
            this.canvas.height / contentHeight,
            2 // Max zoom
        ) * 0.9; // Slight margin
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        // Animate to fit
        const duration = 400;
        const startX = this.offsetX;
        const startY = this.offsetY;
        const startScale = this.scale;
        const targetX = -centerX * targetScale + this.canvas.width / 2;
        const targetY = -centerY * targetScale + this.canvas.height / 2;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
            
            this.offsetX = startX + (targetX - startX) * eased;
            this.offsetY = startY + (targetY - startY) * eased;
            this.scale = startScale + (targetScale - startScale) * eased;
            
            this.render();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    },
    
    autoLayout() {
        Utils.showNotification('Organizing nodes...', 'info');
        
        // Use force-directed layout algorithm
        const iterations = 100;
        const repulsionStrength = 5000;
        const attractionStrength = 0.01;
        const dampening = 0.8;
        const minDistance = 100;
        
        // Create velocity vectors for each node
        const velocities = new Map();
        this.nodes.forEach(node => {
            velocities.set(node.id, { vx: 0, vy: 0 });
        });
        
        // Run force simulation
        for (let iter = 0; iter < iterations; iter++) {
            const forces = new Map();
            
            // Initialize forces
            this.nodes.forEach(node => {
                forces.set(node.id, { fx: 0, fy: 0 });
            });
            
            // Calculate repulsion forces between all nodes
            for (let i = 0; i < this.nodes.length; i++) {
                for (let j = i + 1; j < this.nodes.length; j++) {
                    const node1 = this.nodes[i];
                    const node2 = this.nodes[j];
                    
                    const dx = (node2.x + node2.width / 2) - (node1.x + node1.width / 2);
                    const dy = (node2.y + node2.height / 2) - (node1.y + node1.height / 2);
                    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                    
                    if (distance < minDistance * 3) {
                        const force = repulsionStrength / (distance * distance);
                        const fx = (dx / distance) * force;
                        const fy = (dy / distance) * force;
                        
                        const f1 = forces.get(node1.id);
                        const f2 = forces.get(node2.id);
                        f1.fx -= fx;
                        f1.fy -= fy;
                        f2.fx += fx;
                        f2.fy += fy;
                    }
                }
            }
            
            // Calculate attraction forces along connections
            this.connections.forEach(conn => {
                if (conn.type !== 'quest') return;
                
                const fromNode = this.nodes.find(n => n.id === conn.from);
                const toNode = this.nodes.find(n => n.id === conn.to);
                
                if (fromNode && toNode) {
                    const dx = (toNode.x + toNode.width / 2) - (fromNode.x + fromNode.width / 2);
                    const dy = (toNode.y + toNode.height / 2) - (fromNode.y + fromNode.height / 2);
                    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                    
                    const force = distance * attractionStrength;
                    const fx = (dx / distance) * force;
                    const fy = (dy / distance) * force;
                    
                    const f1 = forces.get(fromNode.id);
                    const f2 = forces.get(toNode.id);
                    if (f1) {
                        f1.fx += fx;
                        f1.fy += fy;
                    }
                    if (f2) {
                        f2.fx -= fx;
                        f2.fy -= fy;
                    }
                }
            });
            
            // Apply forces and update positions
            this.nodes.forEach(node => {
                const force = forces.get(node.id);
                const velocity = velocities.get(node.id);
                
                if (force && velocity) {
                    velocity.vx = (velocity.vx + force.fx) * dampening;
                    velocity.vy = (velocity.vy + force.fy) * dampening;
                    
                    node.x += velocity.vx;
                    node.y += velocity.vy;
                    
                    // Keep nodes in bounds
                    node.x = Math.max(50, Math.min(1950, node.x));
                    node.y = Math.max(50, Math.min(1950, node.y));
                }
            });
        }
        
        // Save updated positions
        this.nodes.forEach(node => {
            if (node.type === 'quest') {
                const quest = AppState.story.quests.find(q => q.id === node.id);
                if (quest) {
                    quest.mapPosition = { x: node.x, y: node.y };
                }
            } else if (node.type === 'character') {
                const character = AppState.story.characters.find(c => c.id === node.id);
                if (character) {
                    character.mapPosition = { x: node.x, y: node.y };
                }
            } else if (node.type === 'location') {
                const location = AppState.story.locations.find(l => l.id === node.id);
                if (location) {
                    location.mapPosition = { x: node.x, y: node.y };
                }
            }
        });
        
        AppState.save();
        this.render();
        this.fitToView();
        
        Utils.showNotification('Nodes organized successfully!', 'success');
    },
    
    getActColor(actIndex) {
        const colors = ['#E02424', '#2424E0', '#24E024', '#E0E024', '#E024E0', '#24E0E0'];
        return colors[actIndex % colors.length];
    },
    
    setupEventListeners() {
        const container = this.canvas;
        
        container.addEventListener('mousedown', (e) => this.onMouseDown(e));
        container.addEventListener('mousemove', (e) => this.onMouseMove(e));
        container.addEventListener('mouseup', (e) => this.onMouseUp(e));
        container.addEventListener('wheel', (e) => this.onWheel(e));
        container.addEventListener('dblclick', (e) => this.onDoubleClick(e));
        
        // Prevent context menu
        container.addEventListener('contextmenu', (e) => e.preventDefault());
    },
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        
        // Account for canvas scaling and DPI
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        // Get position relative to canvas
        const canvasX = (e.clientX - rect.left) * scaleX;
        const canvasY = (e.clientY - rect.top) * scaleY;
        
        // Apply pan offset and zoom scale
        return {
            x: (canvasX - this.offsetX) / this.scale,
            y: (canvasY - this.offsetY) / this.scale
        };
    },
    
    onMouseDown(e) {
        const pos = this.getMousePos(e);
        
        // Check if clicking on a waypoint
        let clickedWaypoint = null;
        for (const conn of this.connections) {
            if (conn.waypoints && conn.waypoints.length > 0) {
                for (let i = 0; i < conn.waypoints.length; i++) {
                    const wp = conn.waypoints[i];
                    const dist = Math.sqrt((pos.x - wp.x) ** 2 + (pos.y - wp.y) ** 2);
                    if (dist < 8) {  // 8px click radius
                        clickedWaypoint = { connection: conn, index: i };
                        break;
                    }
                }
            }
            if (clickedWaypoint) break;
        }
        
        if (clickedWaypoint) {
            if (e.button === 0) {
                // Left-click: Dragging a waypoint
                this.draggedWaypoint = clickedWaypoint;
                this.isDragging = false;
            } else if (e.button === 2) {
                // Right-click: Delete waypoint
                clickedWaypoint.connection.waypoints.splice(clickedWaypoint.index, 1);
                this.saveConnectionWaypoints();
                this.render();
                Utils.showNotification('Waypoint removed', 'success');
            }
        } else {
            // Check if right-clicking on a connection line (for deletion)
            if (e.button === 2) {
                for (const conn of this.connections) {
                    // Only allow deleting quest connections manually
                    if (conn.type !== 'quest') continue;
                    
                    let fromObj = this.nodes.find(n => n.id === conn.from);
                    let toObj = this.nodes.find(n => n.id === conn.to) || this.scenes.find(s => s.id === conn.to);
                    
                    if (fromObj && toObj) {
                        if (this.isPointNearConnection(pos, conn, fromObj, toObj)) {
                            this.showConnectionContextMenu(conn, fromObj, toObj, e);
                            return;
                        }
                    }
                }
            }
            
            // Check if clicking on a node (quest, character, location)
            const clickedNode = this.nodes.find(node => {
                const centerX = node.x + node.width / 2;
                const centerY = node.y + node.height / 2;
                const radius = node.width / 2;
                const dist = Math.sqrt((pos.x - centerX) ** 2 + (pos.y - centerY) ** 2);
                return dist <= radius;
            });
            
            // Check if clicking on a scene
            const clickedScene = this.scenes.find(scene => 
                pos.x >= scene.x && pos.x <= scene.x + scene.width &&
                pos.y >= scene.y && pos.y <= scene.y + scene.height
            );
            
            if (clickedNode) {
                if (e.button === 2) {
                    // Right-click: Show context menu
                    this.showNodeContextMenu(clickedNode, e);
                } else if (e.button === 0) {
                    // Shift+Click: Create connection from quest to target
                    if (e.shiftKey && clickedNode.type === 'quest') {
                        this.selectedQuestForConnection = clickedNode;
                        Utils.showNotification('Quest selected. Shift+Click a location/character to create connection', 'info');
                    } else if (e.shiftKey && this.selectedQuestForConnection && clickedNode.id !== this.selectedQuestForConnection.id) {
                        // Create connection from selected quest to this node
                        this.createQuestConnection(this.selectedQuestForConnection, clickedNode);
                        this.selectedQuestForConnection = null;
                    } else {
                        // Normal node selection/drag
                        this.draggedNode = clickedNode;
                        this.selectedNode = clickedNode;
                        this.selectedScene = null;
                        this.isDragging = false;
                        this.dragStartX = pos.x - clickedNode.x;
                        this.dragStartY = pos.y - clickedNode.y;
                    }
                }
            } else if (clickedScene && e.button === 0) {
                this.draggedScene = clickedScene;
                this.selectedScene = clickedScene;
                this.selectedNode = null;
                this.isDragging = false;
                this.dragStartX = pos.x - clickedScene.x;
                this.dragStartY = pos.y - clickedScene.y;
            } else if (e.button === 0) {
                // Start panning
                this.panStart = { x: e.clientX - this.offsetX, y: e.clientY - this.offsetY };
                this.selectedScene = null;
                this.selectedNode = null;
            }
        }
        
        this.render();
    },
    
    onMouseMove(e) {
        const pos = this.getMousePos(e);
        
        if (this.draggedWaypoint) {
            this.isDragging = true;
            // Update waypoint position
            this.draggedWaypoint.connection.waypoints[this.draggedWaypoint.index] = { x: pos.x, y: pos.y };
            // Just update visual position - save on mouse up
            this.requestRender();
        } else if (this.draggedNode) {
            this.isDragging = true;
            this.draggedNode.x = pos.x - this.dragStartX;
            this.draggedNode.y = pos.y - this.dragStartY;
            
            // Just update visual position - save on mouse up
            this.requestRender();
        } else if (this.draggedScene) {
            this.isDragging = true;
            this.draggedScene.x = pos.x - this.dragStartX;
            this.draggedScene.y = pos.y - this.dragStartY;
            
            // Just update visual position - save on mouse up
            this.requestRender();
        } else if (this.panStart) {
            this.offsetX = e.clientX - this.panStart.x;
            this.offsetY = e.clientY - this.panStart.y;
            this.requestRender();
        } else {
            // Update cursor
            const hoveredNode = this.nodes.find(node => {
                const centerX = node.x + node.width / 2;
                const centerY = node.y + node.height / 2;
                const radius = node.width / 2;
                const dist = Math.sqrt((pos.x - centerX) ** 2 + (pos.y - centerY) ** 2);
                return dist <= radius;
            });
            
            const hoveredScene = this.scenes.find(scene => 
                pos.x >= scene.x && pos.x <= scene.x + scene.width &&
                pos.y >= scene.y && pos.y <= scene.y + scene.height
            );
            
            this.canvas.style.cursor = (hoveredNode || hoveredScene) ? 'move' : 'default';
        }
    },
    
    requestRender() {
        if (!this.renderRequested) {
            this.renderRequested = true;
            requestAnimationFrame(() => {
                this.render();
                this.renderRequested = false;
            });
        }
    },
    
    onMouseUp(e) {
        // Save positions when drag completes
        if (this.draggedWaypoint && this.isDragging) {
            this.saveConnectionWaypoints();
        }
        
        if (this.draggedNode && this.isDragging) {
            const nodeType = this.draggedNode.type;
            let collection;
            
            if (nodeType === 'quest') collection = AppState.story.quests;
            else if (nodeType === 'character') collection = AppState.story.characters;
            else if (nodeType === 'location') collection = AppState.story.locations;
            
            if (collection) {
                const item = collection.find(i => i.id === this.draggedNode.id);
                if (item) {
                    item.mapPosition = { x: this.draggedNode.x, y: this.draggedNode.y };
                    AppState.save();
                }
            }
        }
        
        if (this.draggedScene && this.isDragging) {
            const act = AppState.story.acts.find(a => a.id === this.draggedScene.actId);
            if (act) {
                const scene = act.scenes.find(s => s.id === this.draggedScene.id);
                if (scene) {
                    scene.mapPosition = { x: this.draggedScene.x, y: this.draggedScene.y };
                    AppState.save();
                }
            }
        }
        
        this.draggedScene = null;
        this.draggedNode = null;
        this.draggedWaypoint = null;
        this.panStart = null;
        this.isDragging = false;
    },
    
    onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        this.zoom(delta);
    },
    
    zoom(delta) {
        const newScale = Math.max(0.3, Math.min(3, this.scale + delta));
        this.scale = newScale;
        this.render();
    },
    
    resetView() {
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.render();
    },
    
    onDoubleClick(e) {
        const pos = this.getMousePos(e);
        
        // Check if double-clicking on a connection line
        for (const conn of this.connections) {
            let fromObj, toObj;
            
            if (conn.type === 'scene') {
                fromObj = this.scenes.find(s => s.id === conn.from);
                toObj = this.scenes.find(s => s.id === conn.to);
            } else if (conn.type === 'quest') {
                fromObj = this.nodes.find(n => n.id === conn.from);
                toObj = this.nodes.find(n => n.id === conn.to) || this.scenes.find(s => s.id === conn.to);
            }
            
            if (!fromObj || !toObj) continue;
            
            // Check if click is near the connection path
            if (this.isPointNearConnection(pos, conn, fromObj, toObj)) {
                // Add a waypoint at this position
                if (!conn.waypoints) {
                    conn.waypoints = [];
                }
                
                // Insert waypoint at appropriate position along the path
                const insertIndex = this.findWaypointInsertIndex(pos, conn, fromObj, toObj);
                conn.waypoints.splice(insertIndex, 0, { x: pos.x, y: pos.y });
                
                this.saveConnectionWaypoints();
                this.render();
                Utils.showNotification('Waypoint added to path', 'success');
                return;
            }
        }
    },
    
    isPointNearConnection(point, conn, fromObj, toObj) {
        const threshold = 10;  // pixels
        
        // Calculate center points based on object type
        let fromX, fromY, toX, toY;
        
        if (fromObj.width && fromObj.height) {
            // Node or scene
            if (fromObj.type) {
                // It's a node (circular)
                fromX = fromObj.x + fromObj.width / 2;
                fromY = fromObj.y + fromObj.height / 2;
            } else {
                // It's a scene (rectangular)
                fromX = fromObj.x + fromObj.width / 2;
                fromY = fromObj.y + fromObj.height - 10;
            }
        }
        
        if (toObj.width && toObj.height) {
            // Node or scene
            if (toObj.type) {
                // It's a node (circular)
                toX = toObj.x + toObj.width / 2;
                toY = toObj.y + toObj.height / 2;
            } else {
                // It's a scene (rectangular)
                toX = toObj.x + toObj.width / 2;
                toY = toObj.y + toObj.height - 10;
            }
        }
        
        // Build the full path including waypoints
        const pathPoints = [{ x: fromX, y: fromY }];
        if (conn.waypoints && conn.waypoints.length > 0) {
            pathPoints.push(...conn.waypoints);
        }
        pathPoints.push({ x: toX, y: toY });
        
        // Check distance to each segment
        for (let i = 0; i < pathPoints.length - 1; i++) {
            const dist = this.pointToSegmentDistance(point, pathPoints[i], pathPoints[i + 1]);
            if (dist < threshold) {
                return true;
            }
        }
        
        return false;
    },
    
    pointToSegmentDistance(point, segStart, segEnd) {
        const dx = segEnd.x - segStart.x;
        const dy = segEnd.y - segStart.y;
        const lengthSquared = dx * dx + dy * dy;
        
        if (lengthSquared === 0) {
            return Math.sqrt((point.x - segStart.x) ** 2 + (point.y - segStart.y) ** 2);
        }
        
        let t = ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));
        
        const projX = segStart.x + t * dx;
        const projY = segStart.y + t * dy;
        
        return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
    },
    
    findWaypointInsertIndex(point, conn, fromScene, toScene) {
        const fromX = fromScene.x + fromScene.width / 2;
        const fromY = fromScene.y + fromScene.height - 10;
        const toX = toScene.x + toScene.width / 2;
        const toY = toScene.y + toScene.height - 10;
        
        if (!conn.waypoints || conn.waypoints.length === 0) {
            return 0;
        }
        
        // Find the closest segment and insert after its start point
        const pathPoints = [{ x: fromX, y: fromY }, ...conn.waypoints, { x: toX, y: toY }];
        let minDist = Infinity;
        let insertIndex = 0;
        
        for (let i = 0; i < pathPoints.length - 1; i++) {
            const dist = this.pointToSegmentDistance(point, pathPoints[i], pathPoints[i + 1]);
            if (dist < minDist) {
                minDist = dist;
                insertIndex = i;
            }
        }
        
        return insertIndex;
    },
    
    saveConnectionWaypoints() {
        // Save waypoints to AppState
        if (!AppState.story.connectionWaypoints) {
            AppState.story.connectionWaypoints = {};
        }
        
        this.connections.forEach(conn => {
            const key = `${conn.from}_${conn.to}`;
            if (conn.waypoints && conn.waypoints.length > 0) {
                AppState.story.connectionWaypoints[key] = conn.waypoints;
            } else {
                delete AppState.story.connectionWaypoints[key];
            }
        });
        
        AppState.save();
    },
    
    render() {
        if (!this.ctx) return;
        
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Apply transformations
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.scale, this.scale);
        
        // Draw background image if available
        if (this.backgroundImage && AppState.story.backgroundMap?.visible !== false) {
            const opacity = AppState.story.backgroundMap?.opacity || 0.5;
            ctx.globalAlpha = opacity;
            // Draw image at its original dimensions (no stretching/shrinking)
            ctx.drawImage(this.backgroundImage, 0, 0, this.backgroundImage.width, this.backgroundImage.height);
            ctx.globalAlpha = 1;
        }
        
        // Draw grid
        this.drawGrid(ctx);
        
        // Filter connections by act if needed
        const visibleConnections = this.currentActFilter 
            ? this.connections.filter(c => c.actId === this.currentActFilter)
            : this.connections;
        
        // Draw scene connections (red threads)
        if ((this.showAllConnections || this.currentActFilter) && this.nodeVisibility.scenes) {
            visibleConnections.forEach(conn => {
                if (conn.type === 'scene') {
                    const fromScene = this.scenes.find(s => s.id === conn.from);
                    const toScene = this.scenes.find(s => s.id === conn.to);
                    
                    if (fromScene && toScene) {
                        this.drawConnection(ctx, fromScene, toScene, conn);
                    }
                }
            });
        }
        
        // Draw quest connections (green dashed) - always drawn if showQuestPaths is true
        if (this.showQuestPaths) {
            this.connections.forEach(conn => {
                if (conn.type === 'quest') {
                    const fromNode = this.nodes.find(n => n.id === conn.from);
                    const toNode = this.nodes.find(n => n.id === conn.to) || this.scenes.find(s => s.id === conn.to);
                    
                    if (fromNode && toNode) {
                        // Check if both nodes are visible based on their types
                        const fromVisible = (
                            (fromNode.type === 'quest' && this.nodeVisibility.quests) ||
                            (fromNode.type === 'character' && this.nodeVisibility.characters) ||
                            (fromNode.type === 'location' && this.nodeVisibility.locations)
                        );
                        
                        const toVisible = toNode.type ? (
                            (toNode.type === 'quest' && this.nodeVisibility.quests) ||
                            (toNode.type === 'character' && this.nodeVisibility.characters) ||
                            (toNode.type === 'location' && this.nodeVisibility.locations)
                        ) : this.nodeVisibility.scenes; // If it's a scene
                        
                        // Only draw if both endpoints are visible
                        if (fromVisible && toVisible) {
                            this.drawQuestConnection(ctx, fromNode, toNode, conn);
                        }
                    }
                }
            });
        }
        
        // Filter scenes by act if needed
        const visibleScenes = this.currentActFilter
            ? this.scenes.filter(s => s.actId === this.currentActFilter)
            : this.scenes;
        
        // Draw scenes (if visible)
        if (this.nodeVisibility.scenes) {
            visibleScenes.forEach(scene => {
                this.drawScene(ctx, scene);
            });
        }
        
        // Draw nodes (quests, characters, locations) based on visibility
        this.nodes.forEach(node => {
            const shouldShow = (
                (node.type === 'quest' && this.nodeVisibility.quests) ||
                (node.type === 'character' && this.nodeVisibility.characters) ||
                (node.type === 'location' && this.nodeVisibility.locations)
            );
            
            if (shouldShow) {
                this.drawNode(ctx, node);
            }
        });
        
        ctx.restore();
        
        // Draw minimap
        this.drawMinimap();
    },
    
    drawGrid(ctx) {
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;
        
        const gridSize = 50;
        const startX = Math.floor(-this.offsetX / this.scale / gridSize) * gridSize;
        const startY = Math.floor(-this.offsetY / this.scale / gridSize) * gridSize;
        const endX = startX + (this.canvas.width / this.scale) + gridSize;
        const endY = startY + (this.canvas.height / this.scale) + gridSize;
        
        for (let x = startX; x < endX; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }
        
        for (let y = startY; y < endY; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
    },
    
    drawConnection(ctx, fromScene, toScene, conn) {
        const color = conn.color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        
        // Connect from center of pin to center of pin
        const fromX = fromScene.x + fromScene.width / 2;
        const fromY = fromScene.y + fromScene.height - 10;  // Bottom of pin circle
        const toX = toScene.x + toScene.width / 2;
        const toY = toScene.y + toScene.height - 10;
        
        // Build path points including waypoints
        const pathPoints = [{ x: fromX, y: fromY }];
        if (conn.waypoints && conn.waypoints.length > 0) {
            pathPoints.push(...conn.waypoints);
        }
        pathPoints.push({ x: toX, y: toY });
        
        // Draw line segments between all points
        ctx.beginPath();
        ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        
        for (let i = 1; i < pathPoints.length; i++) {
            ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
        }
        ctx.stroke();
        
        // Draw waypoint markers (small circles)
        if (conn.waypoints && conn.waypoints.length > 0) {
            conn.waypoints.forEach(wp => {
                ctx.beginPath();
                ctx.arc(wp.x, wp.y, 5, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        }
        
        // Draw arrow at the end
        const lastPoint = pathPoints[pathPoints.length - 1];
        const secondLastPoint = pathPoints[pathPoints.length - 2];
        const angle = Math.atan2(lastPoint.y - secondLastPoint.y, lastPoint.x - secondLastPoint.x);
        const arrowSize = 10;
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(lastPoint.x - arrowSize * Math.cos(angle - Math.PI / 6), lastPoint.y - arrowSize * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(lastPoint.x - arrowSize * Math.cos(angle + Math.PI / 6), lastPoint.y - arrowSize * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    },
    
    drawScene(ctx, scene) {
        const isSelected = this.selectedScene && this.selectedScene.id === scene.id;
        const pinSize = 20;  // Size of the map pin
        const pinX = scene.x + scene.width / 2;  // Center of pin
        const pinY = scene.y + scene.height;  // Bottom of pin area
        
        // Draw label above pin (A1S2 format)
        const actNum = scene.actIndex + 1;
        const sceneNum = scene.sceneIndex + 1;
        const label = `A${actNum}S${sceneNum}`;
        
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Label background for readability
        const labelWidth = ctx.measureText(label).width + 8;
        const labelHeight = 16;
        const labelY = pinY - pinSize - labelHeight - 5;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(pinX - labelWidth / 2, labelY, labelWidth, labelHeight);
        ctx.strokeStyle = scene.actColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(pinX - labelWidth / 2, labelY, labelWidth, labelHeight);
        
        // Draw label text - centered in the box
        ctx.fillStyle = scene.actColor;
        ctx.fillText(label, pinX, labelY + labelHeight / 2);
        
        // Draw map pin (teardrop shape)
        ctx.beginPath();
        ctx.arc(pinX, pinY - pinSize, pinSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        
        // Pin shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        // Pin fill
        ctx.fillStyle = scene.actColor;
        ctx.fill();
        
        // Pin border
        ctx.strokeStyle = isSelected ? '#ffffff' : '#000000';
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Draw pin tip (pointing down)
        ctx.beginPath();
        ctx.moveTo(pinX, pinY - pinSize);
        ctx.lineTo(pinX - 4, pinY - pinSize + 8);
        ctx.lineTo(pinX + 4, pinY - pinSize + 8);
        ctx.closePath();
        ctx.fillStyle = scene.actColor;
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#ffffff' : '#000000';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();
        
        // Inner dot for detail
        ctx.beginPath();
        ctx.arc(pinX, pinY - pinSize, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        // Reset text alignment
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    },
    
    drawNode(ctx, node) {
        const isSelected = this.selectedNode && this.selectedNode.id === node.id;
        const centerX = node.x + node.width / 2;
        const centerY = node.y + node.height / 2;
        const radius = node.width / 2;
        
        // Draw node shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Draw node circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
        
        // Node border
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        ctx.strokeStyle = isSelected ? '#ffffff' : '#000000';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.stroke();
        
        // Draw icon based on type
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let icon = '?';
        if (node.type === 'quest') icon = '🎯';
        else if (node.type === 'character') icon = '👤';
        else if (node.type === 'location') icon = '📍';
        else if (node.type === 'item') icon = '📦';
        
        ctx.fillText(icon, centerX, centerY);
        
        // Draw label below node
        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'middle';
        
        const maxWidth = 100;
        let label = node.title;
        
        // Measure actual text width
        let textWidth = ctx.measureText(label).width;
        
        // Truncate if too long
        if (textWidth > maxWidth) {
            while (textWidth > maxWidth && label.length > 3) {
                label = label.substring(0, label.length - 1);
                textWidth = ctx.measureText(label + '...').width;
            }
            label = label + '...';
        }
        
        // Calculate label box dimensions with proper padding
        const labelWidth = Math.min(ctx.measureText(label).width + 8, maxWidth + 8);
        const labelHeight = 16;
        const labelY = centerY + radius + 5;
        
        // Label background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(centerX - labelWidth / 2, labelY, labelWidth, labelHeight);
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(centerX - labelWidth / 2, labelY, labelWidth, labelHeight);
        
        // Label text - centered in the box
        ctx.fillStyle = node.color;
        ctx.fillText(label, centerX, labelY + labelHeight / 2);
        
        // Reset
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    },
    
    drawQuestConnection(ctx, fromNode, toNode, conn) {
        const color = conn.color || this.colors.questConnection;
        
        // Calculate start and end points
        const fromX = fromNode.x + fromNode.width / 2;
        const fromY = fromNode.y + fromNode.height / 2;
        
        let toX, toY;
        if (toNode.type) {
            // It's a node (circular)
            toX = toNode.x + toNode.width / 2;
            toY = toNode.y + toNode.height / 2;
        } else {
            // It's a scene (rectangular pin)
            toX = toNode.x + toNode.width / 2;
            toY = toNode.y + toNode.height - 10;
        }
        
        // Build path points including waypoints
        const pathPoints = [{ x: fromX, y: fromY }];
        if (conn.waypoints && conn.waypoints.length > 0) {
            pathPoints.push(...conn.waypoints);
        }
        pathPoints.push({ x: toX, y: toY });
        
        // Draw dashed line segments between all points
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        ctx.beginPath();
        ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        
        for (let i = 1; i < pathPoints.length; i++) {
            ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
        }
        ctx.stroke();
        
        // Reset dash
        ctx.setLineDash([]);
        
        // Draw waypoint markers (small circles)
        if (conn.waypoints && conn.waypoints.length > 0) {
            conn.waypoints.forEach(wp => {
                ctx.beginPath();
                ctx.arc(wp.x, wp.y, 5, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        }
        
        // Draw arrow at the end
        const lastPoint = pathPoints[pathPoints.length - 1];
        const secondLastPoint = pathPoints[pathPoints.length - 2];
        const angle = Math.atan2(lastPoint.y - secondLastPoint.y, lastPoint.x - secondLastPoint.x);
        const arrowSize = 8;
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(lastPoint.x - arrowSize * Math.cos(angle - Math.PI / 6), lastPoint.y - arrowSize * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(lastPoint.x - arrowSize * Math.cos(angle + Math.PI / 6), lastPoint.y - arrowSize * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    },
    
    drawMinimap() {
        // Minimap removed - was blocking filter options
    },
    
    exportAsImage() {
        // Determine canvas size based on background image or default workspace size
        let canvasWidth = 2000;
        let canvasHeight = 2000;
        
        if (this.backgroundImage) {
            canvasWidth = Math.max(2000, this.backgroundImage.width);
            canvasHeight = Math.max(2000, this.backgroundImage.height);
        }
        
        // Create a temporary canvas with all scenes visible
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = canvasHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        // White background
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw background image if available
        if (this.backgroundImage && AppState.story.backgroundMap?.visible !== false) {
            const opacity = AppState.story.backgroundMap?.opacity || 0.5;
            tempCtx.globalAlpha = opacity;
            // Draw at original dimensions
            tempCtx.drawImage(this.backgroundImage, 0, 0, this.backgroundImage.width, this.backgroundImage.height);
            tempCtx.globalAlpha = 1;
        }
        
        // Draw all connections and scenes
        this.connections.forEach(conn => {
            const fromScene = this.scenes.find(s => s.id === conn.from);
            const toScene = this.scenes.find(s => s.id === conn.to);
            if (fromScene && toScene) {
                this.drawConnection(tempCtx, fromScene, toScene, conn);
            }
        });
        
        this.scenes.forEach(scene => {
            this.drawScene(tempCtx, scene);
        });
        
        // Download
        tempCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Story-Map-${new Date().toISOString().split('T')[0]}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    },
    
    uploadBackgroundImage(file) {
        if (!file || !file.type.startsWith('image/')) {
            Utils.showNotification('Please select a valid image file', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Store image data with original dimensions in AppState
                AppState.story.backgroundMap = {
                    data: e.target.result,  // base64 string
                    opacity: 0.5,
                    visible: true,
                    width: img.width,
                    height: img.height
                };
                AppState.save();
                
                // Load the image for rendering
                this.backgroundImage = img;
                
                // Update UI
                this.updateBackgroundControls();
                this.render();
                
                Utils.showNotification(`Background map uploaded (${img.width}x${img.height}px)`, 'success');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },
    
    loadBackgroundImage() {
        if (AppState.story.backgroundMap && AppState.story.backgroundMap.data) {
            const img = new Image();
            img.onload = () => {
                this.backgroundImage = img;
                this.updateBackgroundControls();
                this.render();
            };
            img.src = AppState.story.backgroundMap.data;
        } else {
            this.backgroundImage = null;
            this.updateBackgroundControls();
        }
    },
    
    clearBackgroundImage() {
        AppState.story.backgroundMap = null;
        AppState.save();
        this.backgroundImage = null;
        this.updateBackgroundControls();
        this.render();
        Utils.showNotification('Background map cleared', 'success');
    },
    
    addQuestToMap() {
        // Get canvas center position in world coordinates
        const centerX = (this.canvas.width / 2 - this.offsetX) / this.scale;
        const centerY = (this.canvas.height / 2 - this.offsetY) / this.scale;
        
        // Set temporary map position and open modal directly
        try {
            if (!AppState.story.quests) {
                AppState.story.quests = [];
            }
            QuestManager.tempMapPosition = { x: centerX, y: centerY };
            QuestManager.openAddModal();
        } catch (error) {
            console.error('Error opening quest modal:', error);
            alert('Error opening quest form. Please try again.');
        }
    },
    
    addCharacterToMap() {
        // Get canvas center position in world coordinates
        const centerX = (this.canvas.width / 2 - this.offsetX) / this.scale;
        const centerY = (this.canvas.height / 2 - this.offsetY) / this.scale;
        
        // Set temporary map position and open modal directly
        try {
            StoryManager.tempMapPosition = { x: centerX, y: centerY };
            StoryManager.openAddCharacterModal();
        } catch (error) {
            console.error('Error opening character modal:', error);
            alert('Error opening character form. Please try again.');
        }
    },
    
    addLocationToMap() {
        // Get canvas center position in world coordinates
        const centerX = (this.canvas.width / 2 - this.offsetX) / this.scale;
        const centerY = (this.canvas.height / 2 - this.offsetY) / this.scale;
        
        // Set temporary map position and open modal directly
        try {
            StoryManager.tempMapPosition = { x: centerX, y: centerY };
            StoryManager.openAddLocationModal();
        } catch (error) {
            console.error('Error opening location modal:', error);
            alert('Error opening location form. Please try again.');
        }
    },
    
    updateBackgroundControls() {
        const hasBackground = AppState.story.backgroundMap !== null;
        const clearBtn = document.getElementById('mapClearBackground');
        const opacityControl = document.getElementById('mapOpacityControl');
        const opacitySlider = document.getElementById('mapOpacitySlider');
        const opacityValue = document.getElementById('mapOpacityValue');
        
        if (clearBtn) {
            clearBtn.style.display = hasBackground ? 'inline-flex' : 'none';
        }
        
        if (opacityControl) {
            opacityControl.style.display = hasBackground ? 'flex' : 'none';
        }
        
        if (hasBackground && opacitySlider && opacityValue) {
            const opacity = Math.round((AppState.story.backgroundMap.opacity || 0.5) * 100);
            opacitySlider.value = opacity;
            opacityValue.textContent = opacity + '%';
        }
    }
};
END OF STORY MAP FEATURE - DISABLED */

// ============================================
// Search System
// ============================================
// Provides global search across all items and sections
// Searches notes, tasks, characters, locations, quests, classes, mechanics, etc
// Includes debounced input for performance and keyboard navigation
// Results link directly to items in their respective sections
// Supports quick filtering and navigation
const Search = {
    currentResults: null,     // Current search results
    selectedIndex: -1,        // Currently selected result index
    resultItems: [],          // Array of result DOM elements

    /**
     * Initializes search system
     * Attaches listeners to search input with debouncing
     * Sets up keyboard navigation and result interaction
     */
    init() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        // Debounced search to prevent excessive lookups
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300); // 300ms debounce delay
        });

        // Clear search button
        const clearBtn = document.getElementById('clearSearchBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                this.clearResults();
            });
        }

        // Keyboard navigation (arrow keys for result selection)
        searchInput.addEventListener('keydown', (e) => {
            const resultsContainer = document.getElementById('searchResults');
            if (!resultsContainer || resultsContainer.style.display === 'none') return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateResults(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateResults(-1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.activateSelectedResult();
            } else if (e.key === 'Escape') {
                this.clearResults();
            }
        });
    },

    navigateResults(direction) {
        if (this.resultItems.length === 0) return;

        // Remove previous selection
        if (this.selectedIndex >= 0 && this.selectedIndex < this.resultItems.length) {
            this.resultItems[this.selectedIndex].classList.remove('selected');
        }

        // Update index
        this.selectedIndex += direction;
        if (this.selectedIndex < 0) this.selectedIndex = this.resultItems.length - 1;
        if (this.selectedIndex >= this.resultItems.length) this.selectedIndex = 0;

        // Add new selection
        const selectedItem = this.resultItems[this.selectedIndex];
        selectedItem.classList.add('selected');
        selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    activateSelectedResult() {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.resultItems.length) {
            this.resultItems[this.selectedIndex].click();
        }
    },

    performSearch(query) {
        if (!query || query.trim().length === 0) {
            this.clearResults();
            return;
        }

        const q = query.toLowerCase().trim();

        // Helper function to calculate match score
        const calculateScore = (item, titleField, descField, tagsField = null) => {
            let score = 0;
            const title = item[titleField] || '';
            const desc = item[descField] || '';
            
            // Exact title match (highest priority)
            if (title.toLowerCase() === q) score += 1000;
            // Title starts with query
            else if (title.toLowerCase().startsWith(q)) score += 500;
            // Title contains query
            else if (title.toLowerCase().includes(q)) score += 100;
            
            // Description contains query
            if (desc && desc.toLowerCase().includes(q)) score += 50;
            
            // Tags/properties contain query
            if (tagsField && item[tagsField]) {
                if (Array.isArray(item[tagsField])) {
                    if (item[tagsField].some(t => t.toLowerCase() === q)) score += 200;
                    else if (item[tagsField].some(t => t.toLowerCase().includes(q))) score += 75;
                }
            }
            
            return score;
        };

        // Search through various data sets with scoring
        const results = {
            tasks: AppState.tasks
                .map(t => ({ item: t, score: calculateScore(t, 'title', 'description', 'tags') }))
                .filter(r => r.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(r => r.item),
            
            assets: AppState.assets
                .map(a => ({ item: a, score: calculateScore(a, 'name', 'description') }))
                .filter(r => r.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(r => r.item),
            
            milestones: AppState.milestones
                .map(m => ({ item: m, score: calculateScore(m, 'title', 'description') }))
                .filter(r => r.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(r => r.item),
            
            classes: AppState.classes
                .map(c => ({ 
                    item: c, 
                    score: calculateScore(c, 'name', 'description', 'properties') 
                }))
                .filter(r => r.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(r => r.item),
            
            mechanics: AppState.mechanics
                .map(m => {
                    let score = calculateScore(m, 'name', 'description', 'relatedClasses');
                    if (m.implementation && m.implementation.toLowerCase().includes(q)) score += 50;
                    return { item: m, score };
                })
                .filter(r => r.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(r => r.item),
            
            characters: (AppState.characters || [])
                .map(c => ({ item: c, score: calculateScore(c, 'name', 'description') }))
                .filter(r => r.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(r => r.item),
            
            locations: (AppState.locations || [])
                .map(l => ({ item: l, score: calculateScore(l, 'name', 'description') }))
                .filter(r => r.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(r => r.item),
            
            timeline: (AppState.timelineEvents || [])
                .map(t => ({ item: t, score: calculateScore(t, 'title', 'description') }))
                .filter(r => r.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(r => r.item),
            
            conflicts: (AppState.conflicts || [])
                .map(c => ({ item: c, score: calculateScore(c, 'name', 'description') }))
                .filter(r => r.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(r => r.item),
            
            themes: (AppState.themes || [])
                .map(t => ({ item: t, score: calculateScore(t, 'name', 'description') }))
                .filter(r => r.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(r => r.item),
            
            quests: (AppState.story && AppState.story.quests ? AppState.story.quests
                .map(quest => {
                    let score = calculateScore(quest, 'title', 'description');
                    // Search in objectives
                    if (quest.objectives && Array.isArray(quest.objectives)) {
                        quest.objectives.forEach(obj => {
                            if (obj.description && obj.description.toLowerCase().includes(q)) score += 30;
                        });
                    }
                    // Search in rewards
                    if (quest.rewards) {
                        const rewardStr = [quest.rewards.experience, quest.rewards.currency, ...(quest.rewards.items || [])].join(' ').toLowerCase();
                        if (rewardStr.includes(q)) score += 20;
                    }
                    // Search in type and status
                    if (quest.type && quest.type.toLowerCase().includes(q)) score += 40;
                    if (quest.status && quest.status.toLowerCase().includes(q)) score += 40;
                    return { item: quest, score };
                })
                .filter(r => r.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(r => r.item)
            : []),
            
            items: (AppState.story && AppState.story.items ? AppState.story.items
                .map(i => {
                    let score = calculateScore(i, 'name', 'description');
                    // Also search in effects field
                    if (i.effects && i.effects.toLowerCase().includes(q)) score += 50;
                    // Search in type and rarity
                    if (i.type && i.type.toLowerCase().includes(q)) score += 30;
                    if (i.rarity && i.rarity.toLowerCase().includes(q)) score += 30;
                    return { item: i, score };
                })
                .filter(r => r.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(r => r.item)
            : []),
            
            acts: (AppState.story && AppState.story.acts ? AppState.story.acts
                .map(a => ({ item: a, score: calculateScore(a, 'title', 'description') }))
                .filter(r => r.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(r => r.item)
            : []),
            
            scenes: [],
            notes: Array.isArray(AppState.notes) ? AppState.notes
                .map(n => ({
                    item: n,
                    score: calculateScore(n, 'title', 'content') + (n.tags.some(t => t.toLowerCase().includes(q)) ? 50 : 0)
                }))
                .filter(r => r.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(r => r.item)
            : []
        };

        // Search scenes separately (need act context)
        if (AppState.story && Array.isArray(AppState.story.acts)) {
            const sceneResults = [];
            AppState.story.acts.forEach(act => {
                (act.scenes || []).forEach(scene => {
                    const hay = [scene.title, scene.description, scene.dialogue, scene.location, (scene.characters || []).join(' ')].filter(Boolean).join(' ').toLowerCase();
                    if (hay.includes(q)) {
                        let score = 0;
                        if (scene.title && scene.title.toLowerCase() === q) score += 1000;
                        else if (scene.title && scene.title.toLowerCase().startsWith(q)) score += 500;
                        else if (scene.title && scene.title.toLowerCase().includes(q)) score += 100;
                        else score += 50;
                        
                        sceneResults.push({ 
                            data: { actId: act.id, actTitle: act.title, scene },
                            score 
                        });
                    }
                });
            });
            results.scenes = sceneResults
                .sort((a, b) => b.score - a.score)
                .map(r => r.data);
        }

        this.currentResults = results;
        this.displayResults(results, query);
    },

    displayResults(results, query) {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;

        const total = results.tasks.length + results.assets.length + results.milestones.length + 
                      results.classes.length + results.mechanics.length + results.characters.length + 
                      results.locations.length + results.timeline.length + results.conflicts.length + 
                      results.themes.length + results.quests.length + results.items.length + results.acts.length + results.scenes.length + results.notes.length;

        // Reset selection state
        this.selectedIndex = -1;
        this.resultItems = [];

        if (total === 0) {
            resultsContainer.innerHTML = `<div class="search-no-results">No results found for "${Utils.escapeHtml(query)}"</div>`;
            resultsContainer.style.display = 'block';
            return;
        }

        let html = `<div class="search-results-header">Found ${total} result${total !== 1 ? 's' : ''} for "${Utils.escapeHtml(query)}"</div>`;

        const renderGroup = (title, itemsHtml) => `
            <div class="search-category">
                <h4>${title}</h4>
                <div class="search-items">${itemsHtml}</div>
            </div>
        `;

        if (results.tasks.length > 0) {
            const items = results.tasks.map(t => `
                <div class="search-item" data-type="task" data-id="${t.id}">
                    ${Utils.icon('navigation/tasks', 'small')}
                    <div class="search-item-content">
                        <div class="search-item-title">${Utils.escapeHtml(t.title)}</div>
                        ${t.description ? `<div class="search-item-desc">${Utils.escapeHtml((t.description || '').substring(0, 120))}${(t.description || '').length > 120 ? '...' : ''}</div>` : ''}
                    </div>
                </div>
            `).join('');
            html += renderGroup(`Tasks (${results.tasks.length})`, items);
        }

        if (results.assets.length > 0) {
            const items = results.assets.map(a => `
                <div class="search-item" data-type="asset" data-id="${a.id}">
                    <span class="search-icon">${Utils.icon('asset/art', 'small')}</span>
                    <div class="search-item-content">
                        <div class="search-item-title">${Utils.escapeHtml(a.name)}</div>
                        <div class="search-item-desc">${Utils.escapeHtml(a.type || '')}${a.fileName ? ` • ${Utils.escapeHtml(a.fileName)}` : ''}</div>
                    </div>
                </div>
            `).join('');
            html += renderGroup(`Assets (${results.assets.length})`, items);
        }

        if (results.milestones.length > 0) {
            const items = results.milestones.map(m => `
                <div class="search-item" data-type="milestone" data-id="${m.id}">
                    <span class="search-icon">${Utils.icon('navigation/milestones', 'small')}</span>
                    <div class="search-item-content">
                        <div class="search-item-title">${Utils.escapeHtml(m.title)}</div>
                        ${m.dueDate ? `<div class="search-item-desc">Due: ${Utils.formatDate(m.dueDate)}</div>` : ''}
                    </div>
                </div>
            `).join('');
            html += renderGroup(`Milestones (${results.milestones.length})`, items);
        }

        if (results.classes.length > 0) {
            const items = results.classes.map(c => `
                <div class="search-item" data-type="class" data-id="${c.id}">
                    <span class="search-icon">${Utils.icon('navigation/classes', 'small')}</span>
                    <div class="search-item-content">
                        <div class="search-item-title">${Utils.escapeHtml(c.name)}</div>
                        ${c.description ? `<div class="search-item-desc">${Utils.escapeHtml((c.description || '').substring(0, 120))}${(c.description || '').length > 120 ? '...' : ''}</div>` : ''}
                    </div>
                </div>
            `).join('');
            html += renderGroup(`Classes (${results.classes.length})`, items);
        }

        if (results.mechanics.length > 0) {
            const items = results.mechanics.map(mec => `
                <div class="search-item" data-type="mechanic" data-id="${mec.id}">
                    <span class="search-icon">${Utils.icon('navigation/mechanics', 'small')}</span>
                    <div class="search-item-content">
                        <div class="search-item-title">${Utils.escapeHtml(mec.name)}</div>
                        ${mec.category ? `<div class="search-item-desc">${Utils.escapeHtml(mec.category)}</div>` : ''}
                    </div>
                </div>
            `).join('');
            html += renderGroup(`Mechanics (${results.mechanics.length})`, items);
        }

        if (results.characters.length > 0) {
            const items = results.characters.map(char => `
                <div class="search-item" data-type="character" data-id="${char.id}">
                    <span class="search-icon">${Utils.icon('navigation/characters', 'small')}</span>
                    <div class="search-item-content">
                        <div class="search-item-title">${Utils.escapeHtml(char.name)}</div>
                        ${char.description ? `<div class="search-item-desc">${Utils.escapeHtml((char.description || '').substring(0, 120))}${(char.description || '').length > 120 ? '...' : ''}</div>` : ''}
                    </div>
                </div>
            `).join('');
            html += renderGroup(`Characters (${results.characters.length})`, items);
        }

        if (results.locations.length > 0) {
            const items = results.locations.map(loc => `
                <div class="search-item" data-type="location" data-id="${loc.id}">
                    <span class="search-icon">${Utils.icon('navigation/locations', 'small')}</span>
                    <div class="search-item-content">
                        <div class="search-item-title">${Utils.escapeHtml(loc.name)}</div>
                        ${loc.description ? `<div class="search-item-desc">${Utils.escapeHtml((loc.description || '').substring(0, 120))}${(loc.description || '').length > 120 ? '...' : ''}</div>` : ''}
                    </div>
                </div>
            `).join('');
            html += renderGroup(`Locations (${results.locations.length})`, items);
        }

        if (results.timeline.length > 0) {
            const items = results.timeline.map(event => `
                <div class="search-item" data-type="timeline" data-id="${event.id}">
                    <span class="search-icon">${Utils.icon('navigation/timeline', 'small')}</span>
                    <div class="search-item-content">
                        <div class="search-item-title">${Utils.escapeHtml(event.title)}</div>
                        ${event.description ? `<div class="search-item-desc">${Utils.escapeHtml((event.description || '').substring(0, 120))}${(event.description || '').length > 120 ? '...' : ''}</div>` : ''}
                    </div>
                </div>
            `).join('');
            html += renderGroup(`Timeline (${results.timeline.length})`, items);
        }

        if (results.conflicts.length > 0) {
            const items = results.conflicts.map(conflict => `
                <div class="search-item" data-type="conflict" data-id="${conflict.id}">
                    <span class="search-icon">${Utils.icon('navigation/conflicts', 'small')}</span>
                    <div class="search-item-content">
                        <div class="search-item-title">${Utils.escapeHtml(conflict.name)}</div>
                        ${conflict.description ? `<div class="search-item-desc">${Utils.escapeHtml((conflict.description || '').substring(0, 120))}${(conflict.description || '').length > 120 ? '...' : ''}</div>` : ''}
                    </div>
                </div>
            `).join('');
            html += renderGroup(`Conflicts (${results.conflicts.length})`, items);
        }

        if (results.themes.length > 0) {
            const items = results.themes.map(theme => `
                <div class="search-item" data-type="theme" data-id="${theme.id}">
                    <span class="search-icon">${Utils.icon('navigation/themes', 'small')}</span>
                    <div class="search-item-content">
                        <div class="search-item-title">${Utils.escapeHtml(theme.name)}</div>
                        ${theme.description ? `<div class="search-item-desc">${Utils.escapeHtml((theme.description || '').substring(0, 120))}${(theme.description || '').length > 120 ? '...' : ''}</div>` : ''}
                    </div>
                </div>
            `).join('');
            html += renderGroup(`Themes (${results.themes.length})`, items);
        }

        if (results.quests.length > 0) {
            const items = results.quests.map(quest => {
                const statusColors = {
                    'not-started': '#6c757d',
                    'available': '#17a2b8',
                    'active': '#ffc107',
                    'completed': '#28a745',
                    'failed': '#dc3545'
                };
                const statusColor = statusColors[quest.status] || '#6c757d';
                return `
                <div class="search-item" data-type="quest" data-id="${quest.id}">
                    <span class="search-icon">🎯</span>
                    <div class="search-item-content">
                        <div class="search-item-title">
                            ${Utils.escapeHtml(quest.title)}
                            <span style="font-size: 0.7rem; padding: 0.15rem 0.35rem; background: ${statusColor}; color: white; border-radius: 3px; margin-left: 0.5rem;">${quest.status || 'unknown'}</span>
                        </div>
                        ${quest.description ? `<div class="search-item-desc">${Utils.escapeHtml((quest.description || '').substring(0, 120))}${(quest.description || '').length > 120 ? '...' : ''}</div>` : ''}
                    </div>
                </div>
            `}).join('');
            html += renderGroup(`Quests (${results.quests.length})`, items);
        }

        if (results.items.length > 0) {
            const items = results.items.map(item => `
                <div class="search-item" data-type="item" data-id="${item.id}">
                    <span class="search-icon">📦</span>
                    <div class="search-item-content">
                        <div class="search-item-title">${Utils.escapeHtml(item.name)} <span class="item-type-badge item-type-${item.type}" style="font-size: 0.7rem; padding: 0.15rem 0.35rem;">${item.type}</span></div>
                        ${item.description ? `<div class="search-item-desc">${Utils.escapeHtml((item.description || '').substring(0, 120))}${(item.description || '').length > 120 ? '...' : ''}</div>` : ''}
                    </div>
                </div>
            `).join('');
            html += renderGroup(`Items (${results.items.length})`, items);
        }

        if (results.acts.length > 0) {
            const items = results.acts.map(a => `
                <div class="search-item" data-type="act" data-id="${a.id}">
                    <span class="search-icon">${Utils.icon('navigation/story', 'small')}</span>
                    <div class="search-item-content">
                        <div class="search-item-title">${Utils.escapeHtml(a.title)}</div>
                        ${a.description ? `<div class="search-item-desc">${Utils.escapeHtml((a.description || '').substring(0, 120))}${(a.description || '').length > 120 ? '...' : ''}</div>` : ''}
                    </div>
                </div>
            `).join('');
            html += renderGroup(`Acts (${results.acts.length})`, items);
        }

        if (results.scenes.length > 0) {
            const items = results.scenes.map(s => `
                <div class="search-item" data-type="scene" data-act-id="${s.actId}" data-id="${s.scene.id}">
                    <span class="search-icon">${Utils.icon('misc/scroll', 'small')}</span>
                    <div class="search-item-content">
                        <div class="search-item-title">${Utils.escapeHtml(s.scene.title)} <small style="opacity:0.7;">in ${Utils.escapeHtml(s.actTitle || '')}</small></div>
                        ${s.scene.description ? `<div class="search-item-desc">${Utils.escapeHtml((s.scene.description || '').substring(0, 120))}${(s.scene.description || '').length > 120 ? '...' : ''}</div>` : ''}
                    </div>
                </div>
            `).join('');
            html += renderGroup(`Scenes (${results.scenes.length})`, items);
        }

        if (results.notes.length > 0) {
            const items = results.notes.map(note => `
                <div class="search-item" data-type="note" data-id="${note.id}">
                    <span class="search-icon">${Utils.icon('navigation/notes', 'small')}</span>
                    <div class="search-item-content">
                        <div class="search-item-title">${Utils.escapeHtml(note.title)}</div>
                        <div class="search-item-desc">${Utils.escapeHtml((note.content || '').substring(0, 120))}${(note.content || '').length > 120 ? '...' : ''}</div>
                    </div>
                </div>
            `).join('');
            html += renderGroup(`Notes (${results.notes.length})`, items);
        }

        resultsContainer.innerHTML = html;
        resultsContainer.style.display = 'block';

        // Attach click handlers and store references
        this.resultItems = Array.from(resultsContainer.querySelectorAll('.search-item'));
        this.resultItems.forEach(item => {
            item.addEventListener('click', () => {
                const type = item.getAttribute('data-type');
                const id = item.getAttribute('data-id');
                const actId = item.getAttribute('data-act-id');
                
                if (type === 'task') this.openTask(id);
                else if (type === 'asset') this.openAsset(id);
                else if (type === 'milestone') this.openMilestone(id);
                else if (type === 'class') this.openClass(id);
                else if (type === 'mechanic') this.openMechanic(id);
                else if (type === 'character') this.openCharacter(id);
                else if (type === 'location') this.openLocation(id);
                else if (type === 'timeline') this.openTimeline(id);
                else if (type === 'conflict') this.openConflict(id);
                else if (type === 'theme') this.openTheme(id);
                else if (type === 'quest') this.openQuest(id);
                else if (type === 'item') this.openItem(id);
                else if (type === 'act') this.openAct(id);
                else if (type === 'scene') this.openScene(actId, id);
                else if (type === 'note') this.openNote(id);
            });
        });
    },

    clearResults() {
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
            resultsContainer.innerHTML = '';
        }
        this.currentResults = null;
        this.selectedIndex = -1;
        this.resultItems = [];
    },

    // Action helpers to open items
    openTask(taskId) {
        const task = AppState.tasks.find(t => t.id === taskId);
        if (!task) return;
        Navigation.switchSection('tasks');
        TaskManager.render();
        // Open edit modal for quick view
        setTimeout(() => TaskManager.openAddModal(task), 50);
        this.clearResults();
    },

    openAsset(assetId) {
        const asset = AppState.assets.find(a => a.id === assetId);
        if (!asset) return;
        Navigation.switchSection('assets');
        AssetTracker.render();
        setTimeout(() => AssetTracker.previewAsset(assetId), 100);
        this.clearResults();
    },

    openMilestone(milestoneId) {
        const m = AppState.milestones.find(x => x.id === milestoneId);
        if (!m) return;
        Navigation.switchSection('milestones');
        MilestonePlanner.render();
        setTimeout(() => MilestonePlanner.openAddModal(m), 50);
        this.clearResults();
    },

    openClass(classId) {
        const c = AppState.classes.find(x => x.id === classId);
        if (!c) return;
        Navigation.switchSection('classes');
        ClassesManager.render();
        setTimeout(() => ClassesManager.openAddModal(c), 50);
        this.clearResults();
    },

    openMechanic(mechanicId) {
        const m = AppState.mechanics.find(x => x.id === mechanicId);
        if (!m) return;
        Navigation.switchSection('mechanics');
        MechanicsManager.render();
        setTimeout(() => MechanicsManager.openAddModal(m), 50);
        this.clearResults();
    },

    openAct(actId) {
        const a = (AppState.story && AppState.story.acts || []).find(x => x.id === actId);
        if (!a) return;
        Navigation.switchSection('story');
        StoryManager.render();
        setTimeout(() => StoryManager.openAddActModal(a), 50);
        this.clearResults();
    },

    openScene(actId, sceneId) {
        const act = (AppState.story && AppState.story.acts || []).find(a => a.id === actId);
        if (!act) return;
        const scene = (act.scenes || []).find(s => s.id === sceneId);
        if (!scene) return;
        Navigation.switchSection('story');
        StoryManager.render();
        setTimeout(() => StoryManager.openAddSceneModal(actId, scene), 80);
        this.clearResults();
    },

    openNote(noteId) {
        const note = AppState.notes.find(n => n.id === noteId);
        if (!note) return;
        Navigation.switchSection('notes');
        NotesManager.render();
        setTimeout(() => NotesManager.openNoteModal(note), 50);
        this.clearResults();
    },

    openCharacter(characterId) {
        const char = (AppState.characters || []).find(c => c.id === characterId);
        if (!char) return;
        Navigation.switchSection('characters');
        // Scroll to and highlight the character
        setTimeout(() => {
            const charElement = document.querySelector(`[data-id="${characterId}"]`);
            if (charElement) {
                charElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                charElement.classList.add('highlight-flash');
                setTimeout(() => charElement.classList.remove('highlight-flash'), 2000);
            }
        }, 100);
        this.clearResults();
    },

    openLocation(locationId) {
        const loc = (AppState.locations || []).find(l => l.id === locationId);
        if (!loc) return;
        Navigation.switchSection('locations');
        // Scroll to and highlight the location
        setTimeout(() => {
            const locElement = document.querySelector(`[data-id="${locationId}"]`);
            if (locElement) {
                locElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                locElement.classList.add('highlight-flash');
                setTimeout(() => locElement.classList.remove('highlight-flash'), 2000);
            }
        }, 100);
        this.clearResults();
    },

    openTimeline(timelineId) {
        const event = (AppState.timelineEvents || []).find(t => t.id === timelineId);
        if (!event) return;
        Navigation.switchSection('timeline');
        // Scroll to and highlight the timeline event
        setTimeout(() => {
            const eventElement = document.querySelector(`[data-id="${timelineId}"]`);
            if (eventElement) {
                eventElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                eventElement.classList.add('highlight-flash');
                setTimeout(() => eventElement.classList.remove('highlight-flash'), 2000);
            }
        }, 100);
        this.clearResults();
    },

    openConflict(conflictId) {
        const conflict = (AppState.conflicts || []).find(c => c.id === conflictId);
        if (!conflict) return;
        Navigation.switchSection('conflicts');
        // Scroll to and highlight the conflict
        setTimeout(() => {
            const conflictElement = document.querySelector(`[data-id="${conflictId}"]`);
            if (conflictElement) {
                conflictElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                conflictElement.classList.add('highlight-flash');
                setTimeout(() => conflictElement.classList.remove('highlight-flash'), 2000);
            }
        }, 100);
        this.clearResults();
    },

    openTheme(themeId) {
        const theme = (AppState.themes || []).find(t => t.id === themeId);
        if (!theme) return;
        Navigation.switchSection('themes');
        // Scroll to and highlight the theme
        setTimeout(() => {
            const themeElement = document.querySelector(`[data-id="${themeId}"]`);
            if (themeElement) {
                themeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                themeElement.classList.add('highlight-flash');
                setTimeout(() => themeElement.classList.remove('highlight-flash'), 2000);
            }
        }, 100);
        this.clearResults();
    },

    openQuest(questId) {
        const quest = (AppState.story.quests || []).find(q => q.id === questId);
        if (!quest) return;
        Navigation.switchSection('quests');
        // Open quest for editing
        setTimeout(() => {
            if (window.QuestManager) {
                QuestManager.openEditModal(quest);
            }
        }, 100);
        this.clearResults();
    },

    openItem(itemId) {
        const item = (AppState.story.items || []).find(i => i.id === itemId);
        if (!item) return;
        Navigation.switchSection('story');
        // Switch to items view
        StoryManager.currentView = 'items';
        StoryManager.switchView('items');
        // Highlight the item row
        setTimeout(() => {
            const itemRow = document.querySelector(`tr[data-item-id="${itemId}"]`);
            if (itemRow) {
                itemRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                itemRow.style.backgroundColor = 'var(--accent-color)';
                itemRow.style.transition = 'background-color 0.3s';
                setTimeout(() => {
                    itemRow.style.backgroundColor = '';
                }, 2000);
            }
        }, 100);
        this.clearResults();
    }
};

// ============================================
// Data Manager (Export/Import)
// ============================================
// Handles data export and import operations
// Supports multiple formats: JSON, ZIP archives, and documentation
// Provides backup/restore functionality for project data
// Allows sharing projects with other users
// Includes data validation on import
const DataManager = {
    /**
     * Initializes data manager
     * Attaches listeners to export/import buttons
     * Sets up file input handling for imports
     */
    init() {
        // Export buttons
        const exportDocBtn = document.getElementById('exportDocumentationBtn');
        const exportJSONBtn = document.getElementById('exportJSONBtn');
        const exportBtn = document.getElementById('exportDataBtn');
        
        // Import controls
        const importBtn = document.getElementById('importDataBtn');
        const importFileInput = document.getElementById('importFileInput');
        
        // Documentation export
        if (exportDocBtn) {
            exportDocBtn.addEventListener('click', () => DocumentationExporter.export());
        }
        
        // JSON export
        if (exportJSONBtn) {
            exportJSONBtn.addEventListener('click', () => this.exportJSON());
        }
        
        // Full data export (ZIP)
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
        
        // Data import
        if (importBtn && importFileInput) {
            importBtn.addEventListener('click', () => importFileInput.click());
            importFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    // Route to appropriate importer based on file type
                    if (file.name.toLowerCase().endsWith('.json')) {
                        this.importJSON(file);
                    } else {
                        this.importData(file);
                    }
                }
            });
        }
    },
    
    /**
     * Exports entire project as downloadable ZIP file
     * Includes all project data and metadata
     */
    async exportData() {
        try {
            // Show loading notification
            const loadingNotif = this.showLoadingNotification('Preparing export...');
            
            // Create ZIP file
            const zip = new JSZip();
            
            // Add metadata JSON
            const metadata = {
                version: '2.0',
                exportDate: new Date().toISOString(),
                appName: 'Forgeon',
                tasks: AppState.tasks,
                assets: AppState.assets,
                milestones: AppState.milestones,
                notes: AppState.notes,
                theme: AppState.theme,
                classes: AppState.classes,
                mechanics: AppState.mechanics,
                story: AppState.story
            };
            
            zip.file('project-data.json', JSON.stringify(metadata, null, 2));
            
            // Add all uploaded files from IndexedDB
            const assetsWithFiles = AppState.assets.filter(a => a.hasFile);
            
            if (assetsWithFiles.length > 0) {
                loadingNotif.textContent = `Exporting ${assetsWithFiles.length} files...`;
                
                const filesFolder = zip.folder('files');
                
                for (let i = 0; i < assetsWithFiles.length; i++) {
                    const asset = assetsWithFiles[i];
                    loadingNotif.textContent = `Exporting file ${i + 1}/${assetsWithFiles.length}...`;
                    
                    try {
                        const fileData = await FileStorage.getFile(asset.id);
                        if (fileData && fileData.file) {
                            // Store file with asset ID as filename to maintain reference
                            const extension = fileData.fileName.split('.').pop();
                            filesFolder.file(`${asset.id}.${extension}`, fileData.file);
                        }
                    } catch (error) {
                        console.error(`Error exporting file for asset ${asset.id}:`, error);
                    }
                }
            }
            
            // Generate ZIP file
            loadingNotif.textContent = 'Creating archive...';
            const blob = await zip.generateAsync({ 
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });
            
            // Download ZIP
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().split('T')[0];
            a.download = `Forgeon-Backup-${timestamp}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Remove loading notification
            loadingNotif.remove();
            
            // Show success
            NotesManager.showNotification(`✅ Export complete! (${assetsWithFiles.length} files included)`);
            
        } catch (error) {
            console.error('Export error:', error);
            alert('Error creating export: ' + error.message);
        }
    },
    
    async importData(file) {
        try {
            // Check if it's a ZIP file
            const isZip = file.name.toLowerCase().endsWith('.zip');
            
            if (!isZip) {
                // Legacy JSON import
                this.importLegacyJSON(file);
                return;
            }
            
            // Show loading notification
            const loadingNotif = this.showLoadingNotification('Reading archive...');
            
            // Read ZIP file
            const zip = await JSZip.loadAsync(file);
            
            // Extract metadata
            const metadataFile = zip.file('project-data.json');
            if (!metadataFile) {
                throw new Error('Invalid backup file: project-data.json not found');
            }
            
            const metadataText = await metadataFile.async('text');
            const data = JSON.parse(metadataText);
            
            // Validate data
            if (!data.tasks || !Array.isArray(data.tasks)) {
                throw new Error('Invalid data format');
            }
            
            // Confirm with user
            const assetsWithFiles = data.assets.filter(a => a.hasFile).length;
            const classesCount = (data.classes || []).length;
            const mechanicsCount = (data.mechanics || []).length;
            const notesCount = (data.notes && Array.isArray(data.notes)) ? data.notes.length : 0;
            const storyActsCount = (data.story && data.story.acts) ? data.story.acts.length : 0;
            const storyScenesCount = (data.story && data.story.acts) ? 
                data.story.acts.reduce((sum, act) => sum + (act.scenes || []).length, 0) : 0;
            
            // Count assets by type
            const assetsByType = data.assets.reduce((counts, asset) => {
                counts[asset.type] = (counts[asset.type] || 0) + 1;
                return counts;
            }, {});
            const assetTypesList = Object.entries(assetsByType)
                .map(([type, count]) => `${count} ${type}`)
                .join(', ');
            
            const confirmMessage = `⚠️ This will replace all current data.\n\n` +
                `Import contains:\n` +
                `• ${data.tasks.length} tasks\n` +
                `• ${data.assets.length} assets (${assetsWithFiles} with files)\n` +
                `  ${assetTypesList ? '  → ' + assetTypesList : ''}\n` +
                `• ${data.milestones.length} milestones\n` +
                `• ${notesCount} notes\n` +
                `• ${classesCount} classes\n` +
                `• ${mechanicsCount} mechanics\n` +
                `• ${storyActsCount} story acts (${storyScenesCount} scenes)\n\n` +
                `Current data will be lost if you haven't exported it.\n\n` +
                `Continue?`;
            
            Utils.showConfirm(confirmMessage, async () => {
                // Clear existing files from IndexedDB
                loadingNotif.textContent = 'Clearing old files...';
                for (const asset of AppState.assets) {
                    if (asset.hasFile) {
                        try {
                            await FileStorage.deleteFile(asset.id);
                        } catch (error) {
                            console.error('Error deleting old file:', error);
                        }
                    }
                }
                
                // Import metadata
                AppState.tasks = data.tasks || [];
                AppState.assets = data.assets || [];
                AppState.milestones = data.milestones || [];
                AppState.notes = (Array.isArray(data.notes) ? data.notes : []);
                AppState.theme = data.theme || 'light';
                AppState.classes = data.classes || [];
                AppState.mechanics = data.mechanics || [];
                AppState.story = data.story || { acts: [] };
                AppState.save();
                AppState.applyTheme();
                
                // Import files from ZIP
                let filesImported = 0;
                const filesFolder = zip.folder('files');
                if (filesFolder) {
                    const fileEntries = [];
                    filesFolder.forEach((relativePath, file) => {
                        fileEntries.push({ relativePath, file });
                    });
                    
                    for (let i = 0; i < fileEntries.length; i++) {
                        const entry = fileEntries[i];
                        loadingNotif.textContent = `Importing file ${i + 1}/${fileEntries.length}...`;
                        
                        try {
                            // Extract asset ID from filename (e.g., "abc123.png" -> "abc123")
                            const assetId = entry.relativePath.split('.')[0];
                            const asset = AppState.assets.find(a => a.id === assetId);
                            
                            if (asset && asset.hasFile) {
                                // Get file blob from ZIP
                                const blob = await entry.file.async('blob');
                                
                                // Create File object with proper name and type
                                const restoredFile = new File([blob], asset.fileName, { 
                                    type: asset.fileType 
                                });
                                
                                // Save to IndexedDB
                                await FileStorage.saveFile(assetId, restoredFile);
                                
                                // Regenerate thumbnail if it's an image
                                if (asset.fileType && asset.fileType.startsWith('image/')) {
                                    asset.thumbnail = await FileStorage.createThumbnail(restoredFile);
                                }
                                
                                filesImported++;
                            }
                        } catch (error) {
                            console.error(`Error importing file ${entry.relativePath}:`, error);
                        }
                    }
                }
                
                // Save updated assets with thumbnails
                AppState.save();
                
                // Refresh all views
                loadingNotif.textContent = 'Refreshing interface...';
                try {
                    if (typeof TaskManager !== 'undefined' && TaskManager.render) TaskManager.render();
                    if (typeof AssetTracker !== 'undefined' && AssetTracker.render) AssetTracker.render();
                    if (typeof MilestonePlanner !== 'undefined' && MilestonePlanner.render) MilestonePlanner.render();
                    if (typeof NotesManager !== 'undefined' && NotesManager.render) NotesManager.render();
                    if (typeof ClassesManager !== 'undefined' && ClassesManager.render) ClassesManager.render();
                    if (typeof MechanicsManager !== 'undefined' && MechanicsManager.render) MechanicsManager.render();
                    if (typeof StoryManager !== 'undefined' && StoryManager.render) StoryManager.render();
                    if (typeof Dashboard !== 'undefined' && Dashboard.refresh) Dashboard.refresh();
                } catch (renderError) {
                    console.error('Error refreshing views:', renderError);
                }
                
                // Remove loading notification
                loadingNotif.remove();
                
                // Show success
                Utils.showToast(`✅ Import complete! (${notesCount} notes, ${filesImported} files restored)`, 'success');
            }, () => {
                // User cancelled
                loadingNotif.remove();
                document.getElementById('importFileInput').value = '';
            });
            
        } catch (error) {
            console.error('Import error:', error);
            alert('Error importing data: ' + error.message);
        }
        
        // Reset file input
        document.getElementById('importFileInput').value = '';
    },
    
    importLegacyJSON(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validate data structure
                if (!data.tasks || !Array.isArray(data.tasks)) {
                    throw new Error('Invalid data format');
                }
                
                const notesCount = (data.notes && Array.isArray(data.notes)) ? data.notes.length : 0;
                const confirmMsg = `⚠️ This is a legacy JSON export (no files included).\n\nImport contains ${notesCount} notes.\n\nThis will replace all current metadata.\n\nContinue?`;
                
                Utils.showConfirm(confirmMsg, () => {
                    AppState.tasks = data.tasks || [];
                    AppState.assets = data.assets || [];
                    AppState.milestones = data.milestones || [];
                    AppState.notes = (Array.isArray(data.notes) ? data.notes : []);
                    AppState.theme = data.theme || 'light';
                    AppState.classes = data.classes || [];
                    AppState.mechanics = data.mechanics || [];
                    AppState.story = data.story || { acts: [] };
                    AppState.save();
                    AppState.applyTheme();
                    
                    // Refresh all views
                    try {
                        if (typeof TaskManager !== 'undefined' && TaskManager.render) TaskManager.render();
                        if (typeof AssetTracker !== 'undefined' && AssetTracker.render) AssetTracker.render();
                        if (typeof MilestonePlanner !== 'undefined' && MilestonePlanner.render) MilestonePlanner.render();
                        if (typeof NotesManager !== 'undefined' && NotesManager.render) NotesManager.render();
                        if (typeof ClassesManager !== 'undefined' && ClassesManager.render) ClassesManager.render();
                        if (typeof MechanicsManager !== 'undefined' && MechanicsManager.render) MechanicsManager.render();
                        if (typeof StoryManager !== 'undefined' && StoryManager.render) StoryManager.render();
                        if (typeof Dashboard !== 'undefined' && Dashboard.refresh) Dashboard.refresh();
                    } catch (renderError) {
                        console.error('Error refreshing views:', renderError);
                    }
                    
                    Utils.showToast(`✅ Legacy data imported (${notesCount} notes, files not included)`, 'success');
                });
            } catch (error) {
                alert('Error importing data: Invalid file format.\n\n' + error.message);
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
        
        // Reset file input
        document.getElementById('importFileInput').value = '';
    },
    
    // JSON-only Export/Import (no files, just data)
    exportJSON() {
        try {
            const timestamp = new Date().toISOString();
            const data = {
                version: '3.0',
                exportDate: timestamp,
                appName: 'Forgeon Game Design Planner',
                data: {
                    // Core data
                    tasks: AppState.tasks,
                    assets: AppState.assets,
                    milestones: AppState.milestones,
                    notes: AppState.notes,
                    theme: AppState.theme,
                    
                    // Game design data
                    classes: AppState.classes,
                    mechanics: AppState.mechanics,
                    
                    // Story data (all in one object)
                    story: AppState.story
                }
            };
            
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            a.download = `Forgeon-Design-${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert('✅ Game design exported successfully!\n\nNote: This export does not include uploaded files. Use "Export ZIP" to include files.');
        } catch (error) {
            console.error('JSON Export error:', error);
            alert('Error exporting data: ' + error.message);
        }
    },
    
    importJSON(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                
                // Validate structure
                if (!imported.data) {
                    throw new Error('Invalid JSON format: missing data object');
                }
                
                const data = imported.data;
                
                // Count items (handle both old and new structure)
                const story = data.story || {};
                const counts = {
                    tasks: (data.tasks || []).length,
                    assets: (data.assets || []).length,
                    milestones: (data.milestones || []).length,
                    notes: (Array.isArray(data.notes) ? data.notes.length : 0),
                    classes: (data.classes || []).length,
                    mechanics: (data.mechanics || []).length,
                    characters: (story.characters || data.characters || []).length,
                    locations: (story.locations || data.locations || []).length,
                    timelineEvents: (story.timeline || data.timelineEvents || []).length,
                    conflicts: (story.conflicts || data.conflicts || []).length,
                    themes: (story.themes || data.themes || []).length,
                    quests: (story.quests || []).length,
                    items: (story.items || []).length,
                    acts: (story.acts || data.acts || []).length,
                    scenes: (() => {
                        if (story.acts) {
                            return story.acts.reduce((sum, act) => sum + (act.scenes || []).length, 0);
                        }
                        return (data.scenes || []).length;
                    })()
                };
                
                const confirmMessage = 
                    `⚠️ This will replace ALL current data!\n\n` +
                    `Import contains:\n` +
                    `• ${counts.tasks} tasks\n` +
                    `• ${counts.assets} assets (files not included)\n` +
                    `• ${counts.milestones} milestones\n` +
                    `• ${counts.notes} notes\n` +
                    `• ${counts.classes} classes\n` +
                    `• ${counts.mechanics} mechanics\n` +
                    `• ${counts.characters} characters\n` +
                    `• ${counts.locations} locations\n` +
                    `• ${counts.quests} quests\n` +
                    `• ${counts.items} items\n` +
                    `• ${counts.timelineEvents} timeline events\n` +
                    `• ${counts.conflicts} conflicts\n` +
                    `• ${counts.themes} themes\n` +
                    `• ${counts.acts} acts\n` +
                    `• ${counts.scenes} scenes\n\n` +
                    `Exported: ${imported.exportDate}\n\n` +
                    `Continue with import?`;
                
                Utils.showConfirm(confirmMessage, () => {
                    // Import data
                    AppState.tasks = data.tasks || [];
                    AppState.assets = data.assets || [];
                    AppState.milestones = data.milestones || [];
                    AppState.notes = (Array.isArray(data.notes) ? data.notes : []);
                    AppState.theme = data.theme || 'light';
                    AppState.classes = data.classes || [];
                    AppState.mechanics = data.mechanics || [];
                    
                    // Handle both old and new story structure
                    if (data.story) {
                        // New structure - story object
                        AppState.story = data.story;
                        // Ensure new arrays exist for migration
                        if (!AppState.story.items) AppState.story.items = [];
                        if (!AppState.story.quests) AppState.story.quests = [];
                        if (!AppState.story.connectionWaypoints) AppState.story.connectionWaypoints = {};
                    } else {
                        // Old structure - separate arrays
                        AppState.story = {
                            acts: data.acts || [],
                            backgroundMap: null,
                            connectionWaypoints: {},
                            characters: data.characters || [],
                            locations: data.locations || [],
                            timeline: data.timelineEvents || [],
                            conflicts: data.conflicts || [],
                            themes: data.themes || [],
                            quests: [],
                            items: []
                        };
                    }
                    
                    // Save to storage
                    AppState.save();
                    AppState.applyTheme();
                    
                    // Refresh all sections that have render methods
                    try {
                        if (typeof TaskManager !== 'undefined' && TaskManager.render) TaskManager.render();
                        if (typeof AssetTracker !== 'undefined' && AssetTracker.render) AssetTracker.render();
                        if (typeof MilestonePlanner !== 'undefined' && MilestonePlanner.render) MilestonePlanner.render();
                        if (typeof NotesManager !== 'undefined' && NotesManager.render) NotesManager.render();
                        if (typeof ClassesManager !== 'undefined' && ClassesManager.render) ClassesManager.render();
                        if (typeof MechanicsManager !== 'undefined' && MechanicsManager.render) MechanicsManager.render();
                        if (typeof Dashboard !== 'undefined' && Dashboard.refresh) Dashboard.refresh();
                        
                        // Force reload of current section
                        if (AppState.currentSection) {
                            Navigation.switchSection(AppState.currentSection);
                        }
                    } catch (renderError) {
                        console.error('Error refreshing views:', renderError);
                    }
                    
                    Utils.showToast(`✅ Import successful! (${counts.notes} notes restored)`, 'success');
                });
                
            } catch (error) {
                Utils.showToast('❌ Error importing JSON: ' + error.message, 'error');
                console.error('JSON Import error:', error);
            }
        };
        reader.readAsText(file);
    },
    
    showLoadingNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: var(--bg-primary);
            color: var(--text-primary);
            padding: 2rem 3rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            z-index: 10001;
            font-size: 1.1rem;
            font-weight: 600;
            text-align: center;
            min-width: 300px;
            border: 2px solid var(--primary-color);
        `;
        notification.innerHTML = `
            <div style="margin-bottom: 1rem;">${Utils.icon('misc/hourglass', 'xlarge')}</div>
            <div>${message}</div>
        `;
        document.body.appendChild(notification);
        return notification;
    }
};

// ============================================
// Documentation Exporter
// ============================================
const DocumentationExporter = {
    export() {
        const html = this.generateHTML();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        a.download = `Game-Design-Documentation-${dateStr}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('✅ Documentation exported successfully!\n\nThe HTML file includes a table of contents with clickable links to all sections and cross-referenced relationships.');
    },

    generateHTML() {
        const projectName = AppState.notes?.find(n => n.category === 'Project')?.title || 'Game Design Document';
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escape(projectName)} - Design Documentation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
            border-bottom: 3px solid #E02424;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        h1 {
            font-size: 2.5rem;
            color: #E02424;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 1.1rem;
        }
        .toc {
            background: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
        }
        .toc h2 {
            margin-bottom: 15px;
            color: #E02424;
        }
        .toc-list {
            list-style: none;
            padding-left: 0;
        }
        .toc-list li {
            margin: 8px 0;
        }
        .toc-list a {
            color: #0066cc;
            text-decoration: none;
            padding: 5px 10px;
            display: inline-block;
            border-radius: 4px;
            transition: background 0.2s;
        }
        .toc-list a:hover {
            background: #e3f2fd;
        }
        .toc-sublist {
            list-style: none;
            padding-left: 20px;
            margin-top: 5px;
        }
        .section {
            margin: 40px 0;
            page-break-inside: avoid;
        }
        h2 {
            font-size: 2rem;
            color: #E02424;
            margin: 30px 0 20px 0;
            border-bottom: 2px solid #E02424;
            padding-bottom: 10px;
        }
        h3 {
            font-size: 1.5rem;
            color: #333;
            margin: 25px 0 15px 0;
        }
        h4 {
            font-size: 1.2rem;
            color: #555;
            margin: 20px 0 10px 0;
        }
        .item {
            background: #fafafa;
            border-left: 4px solid #E02424;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
        }
        .item-title {
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 10px;
            color: #222;
        }
        .item-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin: 10px 0;
            font-size: 0.9rem;
        }
        .meta-item {
            background: white;
            padding: 5px 12px;
            border-radius: 4px;
            border: 1px solid #ddd;
        }
        .meta-label {
            font-weight: 600;
            color: #666;
        }
        .description {
            margin: 10px 0;
            line-height: 1.8;
        }
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 0.85rem;
            font-weight: 600;
            margin: 2px;
        }
        .badge-type { background: #E3F2FD; color: #1976D2; }
        .badge-rarity { background: #FFF3E0; color: #F57C00; }
        .badge-priority { background: #F3E5F5; color: #7B1FA2; }
        .badge-status { background: #E8F5E9; color: #388E3C; }
        .relationships {
            margin: 15px 0;
            padding: 15px;
            background: white;
            border-radius: 4px;
            border: 1px solid #ddd;
        }
        .relationships h5 {
            margin-bottom: 10px;
            color: #E02424;
        }
        .rel-link {
            display: inline-block;
            margin: 4px;
            padding: 6px 12px;
            background: #f0f0f0;
            border-radius: 4px;
            color: #0066cc;
            text-decoration: none;
            font-size: 0.9rem;
            transition: all 0.2s;
        }
        .rel-link:hover {
            background: #e0e0e0;
            transform: translateY(-1px);
        }
        .rel-type {
            font-size: 0.75rem;
            color: #666;
            text-transform: uppercase;
            margin-right: 5px;
        }
        .stats-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        .stats-table th,
        .stats-table td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: left;
        }
        .stats-table th {
            background: #f5f5f5;
            font-weight: 600;
        }
        .stat-positive { color: #4CAF50; font-weight: 600; }
        .stat-negative { color: #f44336; font-weight: 600; }
        .empty-section {
            color: #999;
            font-style: italic;
            padding: 20px;
            text-align: center;
        }
        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; }
            .section { page-break-inside: avoid; }
            h2 { page-break-after: avoid; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${this.escape(projectName)}</h1>
            <div class="subtitle">Design Documentation • Generated ${date}</div>
        </div>

        ${this.generateTableOfContents()}
        ${this.generateTasksSection()}
        ${this.generateAssetsSection()}
        ${this.generateMilestonesSection()}
        ${this.generateClassesSection()}
        ${this.generateMechanicsSection()}
        ${this.generateCharactersSection()}
        ${this.generateLocationsSection()}
        ${this.generateItemsSection()}
        ${this.generateTimelineSection()}
        ${this.generateConflictsSection()}
        ${this.generateThemesSection()}
        ${this.generateActsSection()}
        ${this.generateNotesSection()}
    </div>
</body>
</html>`;
    },

    generateTableOfContents() {
        const sections = [];
        
        if (AppState.tasks.length > 0) sections.push({ id: 'tasks', name: 'Tasks', count: AppState.tasks.length });
        if (AppState.assets.length > 0) sections.push({ id: 'assets', name: 'Assets', count: AppState.assets.length });
        if (AppState.milestones.length > 0) sections.push({ id: 'milestones', name: 'Milestones', count: AppState.milestones.length });
        if (AppState.classes.length > 0) sections.push({ id: 'classes', name: 'Classes', count: AppState.classes.length });
        if (AppState.mechanics.length > 0) sections.push({ id: 'mechanics', name: 'Mechanics', count: AppState.mechanics.length });
        if (AppState.story.characters?.length > 0) sections.push({ id: 'characters', name: 'Characters', count: AppState.story.characters.length });
        if (AppState.story.locations?.length > 0) sections.push({ id: 'locations', name: 'Locations', count: AppState.story.locations.length });
        if (AppState.story.items?.length > 0) sections.push({ id: 'items', name: 'Items', count: AppState.story.items.length });
        if (AppState.story.timeline?.length > 0) sections.push({ id: 'timeline', name: 'Timeline', count: AppState.story.timeline.length });
        if (AppState.story.conflicts?.length > 0) sections.push({ id: 'conflicts', name: 'Conflicts', count: AppState.story.conflicts.length });
        if (AppState.story.themes?.length > 0) sections.push({ id: 'themes', name: 'Themes', count: AppState.story.themes.length });
        if (AppState.story.acts?.length > 0) sections.push({ id: 'acts', name: 'Story Acts & Scenes', count: AppState.story.acts.length });
        if (AppState.notes.length > 0) sections.push({ id: 'notes', name: 'Notes', count: AppState.notes.length });

        if (sections.length === 0) {
            return '<div class="empty-section">No content to document yet.</div>';
        }

        let html = '<div class="toc"><h2><img src="icons/misc/checklist.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Table of Contents</h2><ul class="toc-list">';
        sections.forEach(section => {
            html += `<li><a href="#${section.id}">${section.name} (${section.count})</a></li>`;
        });
        html += '</ul></div>';
        return html;
    },

    generateTasksSection() {
        if (AppState.tasks.length === 0) return '';
        
        let html = '<div class="section" id="tasks"><h2><img src="icons/misc/checklist.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Tasks</h2>';
        AppState.tasks.forEach(task => {
            html += `
                <div class="item" id="task-${task.id}">
                    <div class="item-title">${this.escape(task.title)}</div>
                    <div class="item-meta">
                        <span class="meta-item"><span class="meta-label">Status:</span> <span class="badge badge-status">${this.escape(task.status)}</span></span>
                        <span class="meta-item"><span class="meta-label">Priority:</span> <span class="badge badge-priority">${this.escape(task.priority)}</span></span>
                        ${task.dueDate ? `<span class="meta-item"><span class="meta-label">Due:</span> ${this.escape(task.dueDate)}</span>` : ''}
                    </div>
                    ${task.description ? `<div class="description">${this.escape(task.description)}</div>` : ''}
                    ${task.tags && task.tags.length > 0 ? `<div><strong>Tags:</strong> ${task.tags.map(t => `<span class="badge badge-type">${this.escape(t)}</span>`).join('')}</div>` : ''}
                </div>
            `;
        });
        html += '</div>';
        return html;
    },

    generateAssetsSection() {
        if (AppState.assets.length === 0) return '';
        
        let html = '<div class="section" id="assets"><h2>🎨 Assets</h2>';
        AppState.assets.forEach(asset => {
            html += `
                <div class="item" id="asset-${asset.id}">
                    <div class="item-title">${this.escape(asset.name)}</div>
                    <div class="item-meta">
                        <span class="meta-item"><span class="meta-label">Type:</span> <span class="badge badge-type">${this.escape(asset.type)}</span></span>
                        <span class="meta-item"><span class="meta-label">Status:</span> <span class="badge badge-status">${this.escape(asset.status)}</span></span>
                    </div>
                    ${asset.description ? `<div class="description">${this.escape(asset.description)}</div>` : ''}
                </div>
            `;
        });
        html += '</div>';
        return html;
    },

    generateMilestonesSection() {
        if (AppState.milestones.length === 0) return '';
        
        let html = '<div class="section" id="milestones"><h2><img src="icons/misc/gameplay.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Milestones</h2>';
        AppState.milestones.forEach(milestone => {
            html += `
                <div class="item" id="milestone-${milestone.id}">
                    <div class="item-title">${this.escape(milestone.title)}</div>
                    <div class="item-meta">
                        ${milestone.targetDate ? `<span class="meta-item"><span class="meta-label">Target Date:</span> ${this.escape(milestone.targetDate)}</span>` : ''}
                        <span class="meta-item"><span class="meta-label">Completed:</span> ${milestone.completed ? '✅ Yes' : '⏳ No'}</span>
                    </div>
                    ${milestone.description ? `<div class="description">${this.escape(milestone.description)}</div>` : ''}
                </div>
            `;
        });
        html += '</div>';
        return html;
    },

    generateClassesSection() {
        if (AppState.classes.length === 0) return '';
        
        let html = '<div class="section" id="classes"><h2>👤 Classes</h2>';
        AppState.classes.forEach(cls => {
            html += `
                <div class="item" id="class-${cls.id}">
                    <div class="item-title">${this.escape(cls.name)}</div>
                    <div class="item-meta">
                        <span class="meta-item"><span class="meta-label">Type:</span> <span class="badge badge-type">${this.escape(cls.classType || 'character')}</span></span>
                    </div>
                    ${cls.description ? `<div class="description">${this.escape(cls.description)}</div>` : ''}
                    ${this.generateClassStats(cls)}
                    ${this.generateClassSkills(cls)}
                    ${this.generateRelationships(cls.id, 'class')}
                </div>
            `;
        });
        html += '</div>';
        return html;
    },

    generateClassStats(cls) {
        if (!cls.attributes || cls.attributes.length === 0) return '';
        
        let html = '<div class="relationships"><h5><img src="icons/misc/chart-line-up.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Attributes</h5><table class="stats-table"><tr><th>Attribute</th><th>Base</th><th>Growth</th></tr>';
        cls.attributes.forEach(attr => {
            html += `<tr>
                <td>${this.escape(attr.name)}</td>
                <td>${this.escape(attr.baseValue)}</td>
                <td>${this.escape(attr.growthPerLevel || 0)}/level</td>
            </tr>`;
        });
        html += '</table></div>';
        return html;
    },

    generateClassSkills(cls) {
        if (!cls.skills || cls.skills.length === 0) return '';
        
        let html = '<div class="relationships"><h5><img src="icons/misc/combat.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Skills</h5>';
        cls.skills.forEach(skill => {
            html += `<div style="margin: 10px 0;">
                <strong>${this.escape(skill.name)}</strong> (Unlock Level ${skill.unlockLevel})
                ${skill.description ? `<div>${this.escape(skill.description)}</div>` : ''}
            </div>`;
        });
        html += '</div>';
        return html;
    },

    generateMechanicsSection() {
        if (AppState.mechanics.length === 0) return '';
        
        let html = '<div class="section" id="mechanics"><h2><img src="icons/navigation/mechanics.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Mechanics</h2>';
        AppState.mechanics.forEach(mechanic => {
            html += `
                <div class="item" id="mechanic-${mechanic.id}">
                    <div class="item-title">${this.escape(mechanic.name)}</div>
                    <div class="item-meta">
                        ${mechanic.category ? `<span class="meta-item"><span class="meta-label">Category:</span> <span class="badge badge-type">${this.escape(mechanic.category)}</span></span>` : ''}
                    </div>
                    ${mechanic.description ? `<div class="description">${this.escape(mechanic.description)}</div>` : ''}
                    ${mechanic.implementation ? `<div class="relationships"><h5>💻 Implementation</h5><div>${this.escape(mechanic.implementation)}</div></div>` : ''}
                    ${this.generateRelationships(mechanic.id, 'mechanic')}
                </div>
            `;
        });
        html += '</div>';
        return html;
    },

    generateCharactersSection() {
        if (!AppState.story.characters || AppState.story.characters.length === 0) return '';
        
        let html = '<div class="section" id="characters"><h2>🧑 Characters</h2>';
        AppState.story.characters.forEach(char => {
            html += `
                <div class="item" id="character-${char.id}">
                    <div class="item-title">${this.escape(char.name)}</div>
                    ${char.role ? `<div class="item-meta"><span class="meta-item"><span class="meta-label">Role:</span> <span class="badge badge-type">${this.escape(char.role)}</span></span></div>` : ''}
                    ${char.description ? `<div class="description">${this.escape(char.description)}</div>` : ''}
                    ${char.backstory ? `<div class="relationships"><h5>📖 Backstory</h5><div>${this.escape(char.backstory)}</div></div>` : ''}
                    ${char.motivations ? `<div class="relationships"><h5><img src="icons/misc/gameplay.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Motivations</h5><div>${this.escape(char.motivations)}</div></div>` : ''}
                    ${this.generateRelationships(char.id, 'character')}
                </div>
            `;
        });
        html += '</div>';
        return html;
    },

    generateLocationsSection() {
        if (!AppState.story.locations || AppState.story.locations.length === 0) return '';
        
        let html = '<div class="section" id="locations"><h2><img src="icons/story/location.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Locations</h2>';
        AppState.story.locations.forEach(loc => {
            html += `
                <div class="item" id="location-${loc.id}">
                    <div class="item-title">${this.escape(loc.name)}</div>
                    ${loc.type ? `<div class="item-meta"><span class="meta-item"><span class="meta-label">Type:</span> <span class="badge badge-type">${this.escape(loc.type)}</span></span></div>` : ''}
                    ${loc.description ? `<div class="description">${this.escape(loc.description)}</div>` : ''}
                    ${this.generateRelationships(loc.id, 'location')}
                </div>
            `;
        });
        html += '</div>';
        return html;
    },

    generateItemsSection() {
        if (!AppState.story.items || AppState.story.items.length === 0) return '';
        
        let html = '<div class="section" id="items"><h2>📦 Items</h2>';
        AppState.story.items.forEach(item => {
            html += `
                <div class="item" id="item-${item.id}">
                    <div class="item-title">${this.escape(item.name)}</div>
                    <div class="item-meta">
                        <span class="meta-item"><span class="meta-label">Type:</span> <span class="badge badge-type">${this.escape(item.type)}</span></span>
                        <span class="meta-item"><span class="meta-label">Rarity:</span> <span class="badge badge-rarity">${this.escape(item.rarity)}</span></span>
                    </div>
                    ${item.description ? `<div class="description">${this.escape(item.description)}</div>` : ''}
                    ${this.generateItemStats(item)}
                    ${item.effects ? `<div class="relationships"><h5><img src="icons/misc/sparkles.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Special Effects</h5><div>${this.escape(item.effects)}</div></div>` : ''}
                    ${this.generateRelationships(item.id, 'item')}
                </div>
            `;
        });
        html += '</div>';
        return html;
    },

    generateItemStats(item) {
        if (!item.stats) return '';
        const stats = item.stats;
        const hasStats = stats.damage || stats.defense || stats.speed || stats.health || stats.energy;
        if (!hasStats) return '';
        
        let html = '<div class="relationships"><h5><img src="icons/misc/chart-line-up.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Stats</h5><table class="stats-table"><tr>';
        if (stats.damage) html += `<th>Damage</th>`;
        if (stats.defense) html += `<th>Defense</th>`;
        if (stats.speed) html += `<th>Speed</th>`;
        if (stats.health) html += `<th>Health</th>`;
        if (stats.energy) html += `<th>Energy</th>`;
        html += '</tr><tr>';
        if (stats.damage) html += `<td class="${stats.damage > 0 ? 'stat-positive' : stats.damage < 0 ? 'stat-negative' : ''}">${stats.damage > 0 ? '+' : ''}${stats.damage}</td>`;
        if (stats.defense) html += `<td class="${stats.defense > 0 ? 'stat-positive' : stats.defense < 0 ? 'stat-negative' : ''}">${stats.defense > 0 ? '+' : ''}${stats.defense}</td>`;
        if (stats.speed) html += `<td class="${stats.speed > 0 ? 'stat-positive' : stats.speed < 0 ? 'stat-negative' : ''}">${stats.speed > 0 ? '+' : ''}${stats.speed}</td>`;
        if (stats.health) html += `<td class="${stats.health > 0 ? 'stat-positive' : stats.health < 0 ? 'stat-negative' : ''}">${stats.health > 0 ? '+' : ''}${stats.health}</td>`;
        if (stats.energy) html += `<td class="${stats.energy > 0 ? 'stat-positive' : stats.energy < 0 ? 'stat-negative' : ''}">${stats.energy > 0 ? '+' : ''}${stats.energy}</td>`;
        html += '</tr></table></div>';
        return html;
    },

    generateTimelineSection() {
        if (!AppState.story.timeline || AppState.story.timeline.length === 0) return '';
        
        let html = '<div class="section" id="timeline"><h2>📅 Timeline</h2>';
        AppState.story.timeline.forEach(event => {
            html += `
                <div class="item" id="timeline-${event.id}">
                    <div class="item-title">${this.escape(event.title)}</div>
                    ${event.date ? `<div class="item-meta"><span class="meta-item"><span class="meta-label">Date:</span> ${this.escape(event.date)}</span></div>` : ''}
                    ${event.description ? `<div class="description">${this.escape(event.description)}</div>` : ''}
                    ${this.generateRelationships(event.id, 'timeline')}
                </div>
            `;
        });
        html += '</div>';
        return html;
    },

    generateConflictsSection() {
        if (!AppState.story.conflicts || AppState.story.conflicts.length === 0) return '';
        
        let html = '<div class="section" id="conflicts"><h2><img src="icons/misc/combat.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Conflicts</h2>';
        AppState.story.conflicts.forEach(conflict => {
            html += `
                <div class="item" id="conflict-${conflict.id}">
                    <div class="item-title">${this.escape(conflict.title)}</div>
                    ${conflict.type ? `<div class="item-meta"><span class="meta-item"><span class="meta-label">Type:</span> <span class="badge badge-type">${this.escape(conflict.type)}</span></span></div>` : ''}
                    ${conflict.description ? `<div class="description">${this.escape(conflict.description)}</div>` : ''}
                    ${this.generateRelationships(conflict.id, 'conflict')}
                </div>
            `;
        });
        html += '</div>';
        return html;
    },

    generateThemesSection() {
        if (!AppState.story.themes || AppState.story.themes.length === 0) return '';
        
        let html = '<div class="section" id="themes"><h2><img src="icons/misc/thought-bubble.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Themes</h2>';
        AppState.story.themes.forEach(theme => {
            html += `
                <div class="item" id="theme-${theme.id}">
                    <div class="item-title">${this.escape(theme.title)}</div>
                    ${theme.description ? `<div class="description">${this.escape(theme.description)}</div>` : ''}
                    ${theme.examples ? `<div class="relationships"><h5><img src="icons/status/pin.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Examples</h5><div>${this.escape(theme.examples)}</div></div>` : ''}
                    ${this.generateRelationships(theme.id, 'theme')}
                </div>
            `;
        });
        html += '</div>';
        return html;
    },

    generateActsSection() {
        if (!AppState.story.acts || AppState.story.acts.length === 0) return '';
        
        let html = '<div class="section" id="acts"><h2>🎬 Story Acts & Scenes</h2>';
        AppState.story.acts.forEach(act => {
            html += `
                <div class="item" id="act-${act.id}">
                    <h3>${this.escape(act.title)}</h3>
                    ${act.description ? `<div class="description">${this.escape(act.description)}</div>` : ''}
                    ${this.generateScenesForAct(act)}
                </div>
            `;
        });
        html += '</div>';
        return html;
    },

    generateScenesForAct(act) {
        if (!act.scenes || act.scenes.length === 0) return '<div style="color: #999; font-style: italic; margin: 10px 0;">No scenes</div>';
        
        let html = '<div style="margin-top: 20px;">';
        act.scenes.forEach((scene, index) => {
            html += `
                <div style="background: white; padding: 15px; margin: 10px 0; border-left: 3px solid #0066cc; border-radius: 4px;" id="scene-${scene.id}">
                    <h4>Scene ${index + 1}: ${this.escape(scene.title)}</h4>
                    ${scene.description ? `<div class="description">${this.escape(scene.description)}</div>` : ''}
                    ${scene.dialogue ? `<div class="relationships"><h5>💬 Dialogue</h5><div>${this.escape(scene.dialogue)}</div></div>` : ''}
                    ${this.generateRelationships(scene.id, 'scene')}
                </div>
            `;
        });
        html += '</div>';
        return html;
    },

    generateNotesSection() {
        if (AppState.notes.length === 0) return '';
        
        let html = '<div class="section" id="notes"><h2>📝 Notes</h2>';
        AppState.notes.forEach(note => {
            html += `
                <div class="item" id="note-${note.id}">
                    <div class="item-title">${this.escape(note.title)}</div>
                    ${note.category ? `<div class="item-meta"><span class="meta-item"><span class="meta-label">Category:</span> <span class="badge badge-type">${this.escape(note.category)}</span></span></div>` : ''}
                    ${note.content ? `<div class="description">${this.escape(note.content)}</div>` : ''}
                </div>
            `;
        });
        html += '</div>';
        return html;
    },

    generateRelationships(itemId, itemType) {
        const item = RelationshipManager.getAllItems().find(i => i.id === itemId && i.type === itemType);
        if (!item) return '';
        // Use the unified connections renderer for consistent display
        return Utils.renderConnections(item.data || item);
    },

    escape(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, '<br>');
    }
};

// ============================================
// Utility Toolbox Manager
// ============================================
const UtilityToolbox = {
    isOpen: false,
    calculatorOpen: false,
    currentMode: 'basic',
    basicCalcState: {
        currentValue: '0',
        previousValue: null,
        operation: null,
        shouldResetDisplay: false,
        history: []
    },
    
    init() {
        const toggleBtn = document.getElementById('utilityToggleBtn');
        const tools = document.getElementById('utilityTools');
        const calculatorBtn = document.getElementById('powerCalculatorBtn');
        const calculatorModal = document.getElementById('powerCalculatorModal');
        const calculatorCloseBtn = document.getElementById('calculatorCloseBtn');
        const calculateBtn = document.getElementById('calculateBtn');
        const addVariableBtn = document.getElementById('addVariableBtn');
        
        // Toggle toolbox
        toggleBtn.addEventListener('click', () => {
            this.isOpen = !this.isOpen;
            tools.classList.toggle('active', this.isOpen);
            toggleBtn.classList.toggle('active', this.isOpen);
        });
        
        // Open calculator
        calculatorBtn.addEventListener('click', () => {
            this.openCalculator();
        });
        
        // Close calculator
        calculatorCloseBtn.addEventListener('click', () => {
            this.closeCalculator();
        });
        
        // Calculator tabs
        const tabs = calculatorModal.querySelectorAll('.calculator-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const mode = tab.dataset.mode;
                this.switchMode(mode);
            });
        });
        
        // Basic calculator buttons
        this.initBasicCalculator();
        
        // Damage calculator inputs
        this.initDamageCalculator();
        
        // Percentage calculator inputs
        this.initPercentageCalculator();
        
        // Dice roller
        this.initDiceRoller();
        
        // Calculate button (Power mode)
        calculateBtn.addEventListener('click', () => {
            this.calculate();
        });
        
        // Add variable button (Power mode)
        addVariableBtn.addEventListener('click', () => {
            this.addVariable();
        });
        
        // Quick formulas (Power mode)
        document.querySelectorAll('.quick-formula-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('calculatorFormula').value = btn.getAttribute('data-formula');
                this.calculate();
            });
        });
        
        // Auto-calculate on variable change (Power mode)
        document.getElementById('calculatorVariables').addEventListener('input', () => {
            if (document.getElementById('calculatorFormula').value.trim()) {
                this.calculate();
            }
        });
        
        // Auto-calculate on formula change (Power mode)
        document.getElementById('calculatorFormula').addEventListener('input', () => {
            if (document.getElementById('calculatorFormula').value.trim()) {
                this.calculate();
            }
        });
    },
    
    switchMode(mode) {
        this.currentMode = mode;
        
        // Update tabs
        const tabs = document.querySelectorAll('.calculator-tab');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });
        
        // Update modes
        const modes = document.querySelectorAll('.calculator-mode');
        modes.forEach(modeDiv => {
            modeDiv.classList.toggle('active', modeDiv.id === `${mode}CalculatorMode`);
        });
    },
    
    initBasicCalculator() {
        const display = document.getElementById('basicDisplay');
        const buttons = document.querySelectorAll('.calc-btn');
        
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const value = btn.dataset.value || btn.textContent;
                
                if (btn.dataset.value !== undefined) {
                    // Number or decimal button
                    if (value === '.') {
                        this.basicDecimal();
                    } else {
                        this.basicNumberClick(value);
                    }
                } else if (action === 'add' || action === 'subtract' || action === 'multiply' || action === 'divide') {
                    this.basicOperatorClick(btn.textContent);
                } else if (action === 'equals') {
                    this.basicEquals();
                } else if (action === 'clear') {
                    this.basicClear();
                } else if (action === 'delete') {
                    this.basicDelete();
                } else if (action === 'percent') {
                    this.basicPercent();
                }
                
                this.updateBasicDisplay();
            });
        });
    },
    
    basicNumberClick(num) {
        if (this.basicCalcState.shouldResetDisplay) {
            this.basicCalcState.currentValue = num;
            this.basicCalcState.shouldResetDisplay = false;
        } else {
            this.basicCalcState.currentValue = 
                this.basicCalcState.currentValue === '0' ? num : this.basicCalcState.currentValue + num;
        }
    },
    
    basicOperatorClick(op) {
        if (this.basicCalcState.operation && !this.basicCalcState.shouldResetDisplay) {
            this.basicEquals();
        }
        this.basicCalcState.previousValue = this.basicCalcState.currentValue;
        this.basicCalcState.operation = op;
        this.basicCalcState.shouldResetDisplay = true;
    },
    
    basicEquals() {
        if (!this.basicCalcState.operation || !this.basicCalcState.previousValue) return;
        
        const prev = parseFloat(this.basicCalcState.previousValue);
        const current = parseFloat(this.basicCalcState.currentValue);
        let result;
        
        switch(this.basicCalcState.operation) {
            case '+': result = prev + current; break;
            case '−': result = prev - current; break;
            case '×': result = prev * current; break;
            case '÷': result = current !== 0 ? prev / current : 'Error'; break;
            default: return;
        }
        
        const calculation = `${prev} ${this.basicCalcState.operation} ${current} = ${result}`;
        this.basicCalcState.history.unshift(calculation);
        if (this.basicCalcState.history.length > 10) this.basicCalcState.history.pop();
        this.updateHistory();
        
        this.basicCalcState.currentValue = result.toString();
        this.basicCalcState.operation = null;
        this.basicCalcState.previousValue = null;
        this.basicCalcState.shouldResetDisplay = true;
    },
    
    basicClear() {
        this.basicCalcState.currentValue = '0';
        this.basicCalcState.previousValue = null;
        this.basicCalcState.operation = null;
        this.basicCalcState.shouldResetDisplay = false;
    },
    
    basicDelete() {
        this.basicCalcState.currentValue = this.basicCalcState.currentValue.slice(0, -1) || '0';
    },
    
    basicPercent() {
        this.basicCalcState.currentValue = (parseFloat(this.basicCalcState.currentValue) / 100).toString();
    },
    
    basicDecimal() {
        if (!this.basicCalcState.currentValue.includes('.')) {
            this.basicCalcState.currentValue += '.';
        }
    },
    
    updateBasicDisplay() {
        document.getElementById('basicDisplay').textContent = this.basicCalcState.currentValue;
    },
    
    updateHistory() {
        const historyList = document.getElementById('basicHistory');
        if (historyList) {
            historyList.innerHTML = this.basicCalcState.history
                .map(item => `<div class="history-item">${item}</div>`)
                .join('');
        }
    },
    
    initDamageCalculator() {
        const inputs = ['baseDamage', 'attackMultiplier', 'critChance', 'critMultiplier', 'defenseReduction'];
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => this.calculateDamage());
            }
        });
    },
    
    calculateDamage() {
        const base = parseFloat(document.getElementById('baseDamage').value) || 0;
        const attack = parseFloat(document.getElementById('attackMultiplier').value) || 100;
        const crit = parseFloat(document.getElementById('critChance').value) || 0;
        const critMult = parseFloat(document.getElementById('critMultiplier').value) || 1.5;
        const defense = parseFloat(document.getElementById('defenseReduction').value) || 0;
        
        const baseDamage = base * (attack / 100);
        const avgDamage = baseDamage * (1 + (crit / 100) * (critMult - 1)) * (1 - defense / 100);
        const minDamage = baseDamage * (1 - defense / 100);
        const maxDamage = baseDamage * critMult * (1 - defense / 100);
        
        document.getElementById('damageResult').textContent = avgDamage.toFixed(2);
        document.getElementById('damageRange').textContent = `${minDamage.toFixed(2)} - ${maxDamage.toFixed(2)}`;
    },
    
    initPercentageCalculator() {
        const inputs = ['percentValue', 'percentTotal', 'percentPart', 'percentWhole'];
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                if (id === 'percentValue' || id === 'percentTotal') {
                    input.addEventListener('input', () => this.calculatePercent1());
                } else {
                    input.addEventListener('input', () => this.calculatePercent2());
                }
            }
        });
    },
    
    calculatePercent1() {
        const percent = parseFloat(document.getElementById('percentValue').value) || 0;
        const total = parseFloat(document.getElementById('percentTotal').value) || 0;
        const result = (percent / 100) * total;
        document.getElementById('percentResult').textContent = result.toFixed(2);
    },
    
    calculatePercent2() {
        const part = parseFloat(document.getElementById('percentPart').value) || 0;
        const whole = parseFloat(document.getElementById('percentWhole').value) || 1;
        const result = (part / whole) * 100;
        document.getElementById('percentOfResult').textContent = result.toFixed(2) + '%';
    },
    
    initDiceRoller() {
        const rollBtn = document.getElementById('rollDiceBtn');
        
        if (rollBtn) {
            rollBtn.addEventListener('click', () => this.rollDice());
        }
    },
    
    rollDice() {
        const numDice = parseInt(document.getElementById('diceCount').value) || 1;
        const sides = parseInt(document.getElementById('diceType').value) || 20;
        const modifierSign = parseInt(document.getElementById('diceModifierSign').value) || 1;
        const modifierValue = parseInt(document.getElementById('diceModifierValue').value) || 0;
        const modifier = modifierSign * modifierValue;
        
        if (numDice < 1 || numDice > 100) {
            document.getElementById('diceResult').textContent = 'Number of dice must be 1-100';
            document.getElementById('diceBreakdown').innerHTML = '';
            return;
        }
        
        if (sides < 2 || sides > 1000) {
            document.getElementById('diceResult').textContent = 'Sides must be 2-1000';
            document.getElementById('diceBreakdown').innerHTML = '';
            return;
        }
        
        const rolls = [];
        for (let i = 0; i < numDice; i++) {
            rolls.push(Math.floor(Math.random() * sides) + 1);
        }
        
        const sum = rolls.reduce((a, b) => a + b, 0);
        const total = sum + modifier;
        
        document.getElementById('diceResult').textContent = total;
        
        const breakdown = document.getElementById('diceBreakdown');
        if (breakdown) {
            const notation = `${numDice}d${sides}${modifier !== 0 ? (modifier > 0 ? '+' + modifier : modifier) : ''}`;
            const rollsHTML = rolls.map(r => `<span class="dice-roll-value">${r}</span>`).join('');
            const modText = modifier !== 0 ? ` ${modifier > 0 ? '+' : ''}${modifier}` : '';
            breakdown.innerHTML = `
                <div class="breakdown-title">Rolled ${notation}:</div>
                <div class="dice-rolls">${rollsHTML}</div>
                <div style="margin-top: 0.75rem; font-weight: 600;">Individual Rolls Sum: <span style="color: var(--primary-color);">${sum}</span></div>
                ${modifier !== 0 ? `<div style="font-weight: 600;">Modifier: <span style="color: var(--primary-color);">${modText}</span></div>` : ''}
                <div style="margin-top: 0.5rem; font-size: 1.1rem; font-weight: 700; border-top: 2px solid var(--border-color); padding-top: 0.5rem;">Final Result: <span style="color: var(--primary-color); font-size: 1.3rem;">${total}</span></div>
            `;
        }
    },
    
    openCalculator() {
        const modal = document.getElementById('powerCalculatorModal');
        modal.classList.add('active');
        this.calculatorOpen = true;
        
        // Populate power calculator variables from class attributes
        this.populateAttributesFromClasses();
    },
    
    populateAttributesFromClasses() {
        // Get all unique attribute names from all classes
        const attributeNames = new Set();
        
        AppState.classes.forEach(classObj => {
            if (classObj.attributes && Array.isArray(classObj.attributes)) {
                classObj.attributes.forEach(attr => {
                    if (attr.name) {
                        attributeNames.add(attr.name.toLowerCase().trim());
                    }
                });
            }
        });
        
        // Clear current variables and repopulate
        const container = document.getElementById('calculatorVariables');
        container.innerHTML = '';
        
        // Add 'level' as default
        const levelDiv = document.createElement('div');
        levelDiv.className = 'variable-input';
        levelDiv.innerHTML = `
            <label>level:</label>
            <input type="number" data-var="level" value="1" min="0" class="var-input">
        `;
        container.appendChild(levelDiv);
        
        // Add each unique attribute
        const sortedAttributes = Array.from(attributeNames).sort();
        sortedAttributes.forEach(attrName => {
            const cleanName = attrName.replace(/[^a-z0-9_]/g, '');
            if (cleanName && !container.querySelector(`[data-var="${cleanName}"]`)) {
                const varDiv = document.createElement('div');
                varDiv.className = 'variable-input';
                varDiv.innerHTML = `
                    <label>${cleanName}:</label>
                    <input type="number" data-var="${cleanName}" value="10" min="0" class="var-input">
                `;
                container.appendChild(varDiv);
            }
        });
        
        // If no attributes found, add default ones
        if (attributeNames.size === 0) {
            const defaults = ['strength', 'agility', 'intelligence'];
            defaults.forEach(name => {
                const varDiv = document.createElement('div');
                varDiv.className = 'variable-input';
                varDiv.innerHTML = `
                    <label>${name}:</label>
                    <input type="number" data-var="${name}" value="10" min="0" class="var-input">
                `;
                container.appendChild(varDiv);
            });
        }
        
        // Add event listeners for auto-calculate
        container.querySelectorAll('.var-input').forEach(input => {
            input.addEventListener('input', () => {
                if (document.getElementById('calculatorFormula').value.trim()) {
                    this.calculate();
                }
            });
        });
    },
    
    closeCalculator() {
        const modal = document.getElementById('powerCalculatorModal');
        modal.classList.remove('active');
        this.calculatorOpen = false;
    },
    
    addVariable() {
        const container = document.getElementById('calculatorVariables');
        const varName = prompt('Enter variable name (e.g., wisdom, defense):');
        
        if (!varName || !varName.trim()) return;
        
        const cleanName = varName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        
        if (!cleanName) {
            alert('Invalid variable name. Use only letters, numbers, and underscores.');
            return;
        }
        
        // Check if variable already exists
        if (container.querySelector(`[data-var="${cleanName}"]`)) {
            alert('Variable already exists!');
            return;
        }
        
        const varDiv = document.createElement('div');
        varDiv.className = 'variable-input';
        varDiv.innerHTML = `
            <label>${cleanName}:</label>
            <input type="number" data-var="${cleanName}" value="10" min="0" class="var-input">
        `;
        container.appendChild(varDiv);
        
        // Add event listener for auto-calculate
        varDiv.querySelector('.var-input').addEventListener('input', () => {
            if (document.getElementById('calculatorFormula').value.trim()) {
                this.calculate();
            }
        });
    },
    
    calculate() {
        const formula = document.getElementById('calculatorFormula').value.trim();
        
        if (!formula) {
            document.getElementById('resultValue').textContent = '-';
            return;
        }
        
        // Collect all variables
        const variables = {};
        document.querySelectorAll('.var-input').forEach(input => {
            const varName = input.getAttribute('data-var');
            variables[varName] = parseFloat(input.value) || 0;
        });
        
        try {
            // Create a function with the variables as parameters
            const varNames = Object.keys(variables);
            const varValues = Object.values(variables);
            
            // Allow Math functions
            const func = new Function(...varNames, 'Math', `return ${formula}`);
            const result = func(...varValues, Math);
            
            if (typeof result === 'number' && !isNaN(result)) {
                document.getElementById('resultValue').textContent = Math.round(result * 100) / 100;
            } else {
                document.getElementById('resultValue').textContent = 'Error';
            }
        } catch (error) {
            document.getElementById('resultValue').textContent = 'Invalid';
            console.error('Calculator error:', error);
        }
    }
};

// ============================================
// Templates & Presets System
// ============================================
const TemplateManager = {
    templates: [], // User's custom templates
    
    init() {
        // Load templates from storage
        this.loadTemplates();
        
        // Add template buttons to relevant sections
        this.addTemplateBrowserButtons();
    },
    
    loadTemplates() {
        const saved = localStorage.getItem('forgeon_templates');
        if (saved) {
            try {
                this.templates = JSON.parse(saved);
            } catch (e) {
                console.error('Error loading templates:', e);
                this.templates = [];
            }
        }
    },
    
    saveTemplates() {
        localStorage.setItem('forgeon_templates', JSON.stringify(this.templates));
    },
    
    addTemplateBrowserButtons() {
        // Template buttons are now added directly in HTML
        // This method kept for compatibility but no longer needed
    },
    
    saveAsTemplate(itemData, itemType) {
        // Open modal for template creation
        const typeLabels = {
            'class': 'Class',
            'mechanic': 'Mechanic',
            'character': 'Character',
            'location': 'Location'
        };
        
        const content = `
            <div class="template-editor">
                <h3><img src="icons/actions/save.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Save as Template</h3>
                <p>Create a reusable template from this ${typeLabels[itemType].toLowerCase()}.</p>
                
                <div class="form-group">
                    <label for="templateName">Template Name *</label>
                    <input type="text" id="templateName" class="form-control" placeholder="e.g., Advanced Warrior" required />
                </div>
                
                <div class="form-group">
                    <label for="templateDescription">Description</label>
                    <textarea id="templateDescription" class="form-control" rows="3" placeholder="Brief description of this template..."></textarea>
                </div>
                
                <div class="form-group">
                    <label for="templateTags">Tags (comma-separated)</label>
                    <input type="text" id="templateTags" class="form-control" placeholder="e.g., RPG, Combat, Melee" />
                    <small class="form-help">Tags help categorize and find templates later</small>
                </div>
                
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    <button class="btn btn-primary" onclick="TemplateManager.createTemplate('${itemType}')">
                        Save Template
                    </button>
                </div>
            </div>
        `;
        
        Modal.open(content);
        
        // Store the item data temporarily
        this.tempItemData = JSON.parse(JSON.stringify(itemData));
        
        // Focus the name field
        setTimeout(() => {
            document.getElementById('templateName')?.focus();
        }, 100);
    },
    
    createTemplate(itemType) {
        const name = document.getElementById('templateName').value.trim();
        const description = document.getElementById('templateDescription').value.trim();
        const tagsInput = document.getElementById('templateTags').value.trim();
        
        if (!name) {
            alert('Please enter a template name');
            return;
        }
        
        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
        
        const template = {
            id: 'template_' + Date.now(),
            name: name,
            type: itemType,
            description: description,
            tags: tags,
            createdAt: new Date().toISOString(),
            data: this.tempItemData
        };
        
        // Remove id and timestamps from template data
        delete template.data.id;
        delete template.data.createdAt;
        delete template.data.updatedAt;
        
        this.templates.push(template);
        this.saveTemplates();
        
        Modal.close();
        delete this.tempItemData;
        
        alert(`✅ Template "${name}" saved!`);
    },
    
    openTemplateBrowser(itemType) {
        const typeLabels = {
            'class': 'Classes',
            'mechanic': 'Mechanics',
            'character': 'Characters',
            'location': 'Locations'
        };
        
        const userTemplates = this.templates.filter(t => t.type === itemType);
        const prebuiltTemplates = this.getPrebuiltTemplates(itemType);
        
        const content = `
            <div class="template-browser">
                <div class="template-browser-header">
                    <div>
                        <h3>📚 ${typeLabels[itemType]} Templates</h3>
                        <p>Select a template to create a new item based on it.</p>
                    </div>
                    <button class="btn btn-primary" onclick="TemplateManager.createNewTemplate('${itemType}')">
                        <img src="icons/actions/add.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Create New Template
                    </button>
                </div>
                
                ${prebuiltTemplates.length > 0 ? `
                    <div class="template-section">
                        <h4>🎮 Pre-built Templates</h4>
                        <div class="template-grid">
                            ${prebuiltTemplates.map(template => `
                                <div class="template-card" onclick="TemplateManager.applyTemplate('${template.id}', '${itemType}', true)">
                                    <div class="template-card-header">
                                        <h5>${Utils.escapeHtml(template.name)}</h5>
                                        ${template.tags ? `<div class="template-tags">${template.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
                                    </div>
                                    <p class="template-description">${Utils.escapeHtml(template.description || '')}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${userTemplates.length > 0 ? `
                    <div class="template-section">
                        <h4>👤 Your Templates</h4>
                        <div class="template-grid">
                            ${userTemplates.map(template => `
                                <div class="template-card">
                                    <div class="template-card-header">
                                        <h5>${Utils.escapeHtml(template.name)}</h5>
                                        <button class="btn-icon-small" onclick="event.stopPropagation(); TemplateManager.deleteTemplate('${template.id}')" title="Delete template">
                                            <img src="icons/actions/trash.svg" alt="" width="14" height="14" style="vertical-align: middle;">
                                        </button>
                                    </div>
                                    ${template.description ? `<p class="template-description">${Utils.escapeHtml(template.description)}</p>` : ''}
                                    ${template.tags && template.tags.length > 0 ? `
                                        <div class="template-tags">
                                            ${template.tags.map(tag => `<span class="template-tag">${Utils.escapeHtml(tag)}</span>`).join('')}
                                        </div>
                                    ` : ''}
                                    <p class="template-date">Created: ${new Date(template.createdAt).toLocaleDateString()}</p>
                                    <div class="template-card-actions">
                                        <button class="btn btn-sm btn-primary" onclick="TemplateManager.applyTemplate('${template.id}', '${itemType}', false)">
                                            Use Template
                                        </button>
                                        <button class="btn btn-sm btn-secondary" onclick="TemplateManager.editTemplate('${template.id}')">
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : `
                    <div class="empty-state">
                        <p>You haven't saved any custom templates yet.</p>
                        <p>Create a ${itemType}, then use the "Save as Template" option to add it here.</p>
                    </div>
                `}
                
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="Modal.close()">Close</button>
                </div>
            </div>
        `;
        
        Modal.open(content);
    },
    
    createNewTemplate(itemType) {
        const typeLabels = {
            'class': 'Class',
            'mechanic': 'Mechanic',
            'character': 'Character',
            'location': 'Location'
        };
        
        // Get default structure based on type
        let defaultData = {};
        if (itemType === 'class') {
            defaultData = {
                name: '',
                category: '',
                baseStats: { health: 100, attack: 10, defense: 5, speed: 5 },
                abilities: [],
                description: '',
                relatedItems: []
            };
        } else if (itemType === 'mechanic') {
            defaultData = {
                name: '',
                category: 'Movement',
                description: '',
                rules: '',
                variables: [],
                relatedItems: []
            };
        }
        
        const content = `
            <div class="template-editor">
                <h3><img src="icons/actions/add.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Create New Template</h3>
                <p>Create a new ${typeLabels[itemType].toLowerCase()} template from scratch.</p>
                
                <div class="form-group">
                    <label for="newTemplateName">Template Name *</label>
                    <input type="text" id="newTemplateName" class="form-control" placeholder="e.g., Custom Warrior" required />
                </div>
                
                <div class="form-group">
                    <label for="newTemplateDescription">Description</label>
                    <textarea id="newTemplateDescription" class="form-control" rows="3" placeholder="Brief description of this template..."></textarea>
                </div>
                
                <div class="form-group">
                    <label for="newTemplateTags">Tags (comma-separated)</label>
                    <input type="text" id="newTemplateTags" class="form-control" placeholder="e.g., RPG, Combat, Custom" />
                    <small class="form-help">Tags help categorize and find templates later</small>
                </div>
                
                <div class="form-group">
                    <label>Template Data</label>
                    <textarea id="newTemplateData" class="form-control code-editor" rows="10" placeholder='${JSON.stringify(defaultData, null, 2)}'>${JSON.stringify(defaultData, null, 2)}</textarea>
                    <small class="form-help">Edit the JSON structure for this template. This is the base data that will be used when applying the template.</small>
                </div>
                
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="TemplateManager.openTemplateBrowser('${itemType}')">Back</button>
                    <button class="btn btn-primary" onclick="TemplateManager.saveNewTemplate('${itemType}')">
                        Create Template
                    </button>
                </div>
            </div>
        `;
        
        Modal.open(content);
        
        // Focus the name field
        setTimeout(() => {
            document.getElementById('newTemplateName')?.focus();
        }, 100);
    },
    
    saveNewTemplate(itemType) {
        const name = document.getElementById('newTemplateName').value.trim();
        const description = document.getElementById('newTemplateDescription').value.trim();
        const tagsInput = document.getElementById('newTemplateTags').value.trim();
        const dataInput = document.getElementById('newTemplateData').value.trim();
        
        if (!name) {
            alert('Please enter a template name');
            return;
        }
        
        // Parse and validate JSON data
        let templateData;
        try {
            templateData = JSON.parse(dataInput);
        } catch (error) {
            alert('Invalid JSON data. Please check your template structure.');
            return;
        }
        
        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
        
        const template = {
            id: 'template_' + Date.now(),
            name: name,
            type: itemType,
            description: description,
            tags: tags,
            createdAt: new Date().toISOString(),
            data: templateData
        };
        
        this.templates.push(template);
        this.saveTemplates();
        
        alert(`✅ Template "${name}" created!`);
        this.openTemplateBrowser(itemType);
    },
    
    editTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) {
            alert('Template not found');
            return;
        }
        
        const typeLabels = {
            'class': 'Class',
            'mechanic': 'Mechanic',
            'character': 'Character',
            'location': 'Location'
        };
        
        const content = `
            <div class="template-editor">
                <h3><img src="icons/actions/pencil.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Edit Template</h3>
                <p>Update the details for this ${typeLabels[template.type].toLowerCase()} template.</p>
                
                <div class="form-group">
                    <label for="editTemplateName">Template Name *</label>
                    <input type="text" id="editTemplateName" class="form-control" value="${Utils.escapeHtml(template.name)}" required />
                </div>
                
                <div class="form-group">
                    <label for="editTemplateDescription">Description</label>
                    <textarea id="editTemplateDescription" class="form-control" rows="3">${Utils.escapeHtml(template.description || '')}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="editTemplateTags">Tags (comma-separated)</label>
                    <input type="text" id="editTemplateTags" class="form-control" value="${template.tags ? template.tags.join(', ') : ''}" />
                    <small class="form-help">Tags help categorize and find templates later</small>
                </div>
                
                <div class="form-group">
                    <label>Template Data</label>
                    <textarea id="editTemplateData" class="form-control code-editor" rows="10">${JSON.stringify(template.data, null, 2)}</textarea>
                    <small class="form-help">Edit the JSON structure for this template. Changes will be saved and used when applying this template.</small>
                </div>
                
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="TemplateManager.openTemplateBrowser('${template.type}')">Back</button>
                    <button class="btn btn-primary" onclick="TemplateManager.updateTemplate('${templateId}')">
                        Save Changes
                    </button>
                </div>
            </div>
        `;
        
        Modal.open(content);
        
        // Focus the name field
        setTimeout(() => {
            document.getElementById('editTemplateName')?.focus();
        }, 100);
    },
    
    updateTemplate(templateId) {
        const name = document.getElementById('editTemplateName').value.trim();
        const description = document.getElementById('editTemplateDescription').value.trim();
        const tagsInput = document.getElementById('editTemplateTags').value.trim();
        const dataInput = document.getElementById('editTemplateData').value.trim();
        
        if (!name) {
            alert('Please enter a template name');
            return;
        }
        
        const template = this.templates.find(t => t.id === templateId);
        if (!template) {
            alert('Template not found');
            return;
        }
        
        // Parse and validate JSON data
        let templateData;
        try {
            templateData = JSON.parse(dataInput);
        } catch (error) {
            alert('Invalid JSON data. Please check your template structure.');
            return;
        }
        
        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
        
        template.name = name;
        template.description = description;
        template.tags = tags;
        template.data = templateData;
        template.updatedAt = new Date().toISOString();
        
        this.saveTemplates();
        
        alert(`✅ Template "${name}" updated!`);
        this.openTemplateBrowser(template.type);
    },
    
    applyTemplate(templateId, itemType, isPrebuilt) {
        const template = isPrebuilt ? 
            this.getPrebuiltTemplates(itemType).find(t => t.id === templateId) :
            this.templates.find(t => t.id === templateId);
        
        if (!template) {
            alert('Template not found');
            return;
        }
        
        // Clone template data
        const newItemData = JSON.parse(JSON.stringify(template.data));
        
        // Generate new ID and timestamps
        newItemData.id = this.generateId();
        newItemData.createdAt = new Date().toISOString();
        newItemData.updatedAt = new Date().toISOString();
        
        // Add to appropriate data array
        if (itemType === 'class') {
            AppState.classes.push(newItemData);
            ClassesManager.render();
        } else if (itemType === 'mechanic') {
            AppState.mechanics.push(newItemData);
            MechanicsManager.render();
        } else if (itemType === 'character') {
            AppState.characters.push(newItemData);
        } else if (itemType === 'location') {
            AppState.locations.push(newItemData);
        }
        
        AppState.save();
        Modal.close();
        
        alert(`✅ ${template.name} template applied! You can now edit it.`);
    },
    
    deleteTemplate(templateId) {
        Utils.showConfirm('Delete this template?', () => {
            this.templates = this.templates.filter(t => t.id !== templateId);
            this.saveTemplates();
            
            // Refresh browser if open
            const modal = document.getElementById('modalBody');
            if (modal && modal.querySelector('.template-browser')) {
                // Re-open browser to refresh
                setTimeout(() => {
                    const type = this.templates[0]?.type || 'class';
                    this.openTemplateBrowser(type);
                }, 10);
            }
        });
    },
    
    generateId() {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    },
    
    getPrebuiltTemplates(itemType) {
        const templates = {
            class: [
                {
                    id: 'preset_warrior',
                    name: 'Warrior',
                    tags: ['RPG', 'Combat'],
                    description: 'Melee combat specialist with high health and defense',
                    data: {
                        name: 'Warrior',
                        classType: 'character',
                        description: 'A strong melee fighter specializing in close combat and defense.',
                        attributes: [
                            { name: 'Health', baseValue: 120, growthRate: 10 },
                            { name: 'Strength', baseValue: 15, growthRate: 2 },
                            { name: 'Defense', baseValue: 12, growthRate: 1.5 },
                            { name: 'Speed', baseValue: 5, growthRate: 0.5 }
                        ],
                        abilities: [
                            { name: 'Power Strike', description: 'Deal 150% damage with melee weapon', cooldown: 8 },
                            { name: 'Shield Block', description: 'Reduce incoming damage by 50% for 3 seconds', cooldown: 12 },
                            { name: 'Battle Cry', description: 'Increase team attack by 20% for 10 seconds', cooldown: 30 }
                        ],
                        relatedItems: []
                    }
                },
                {
                    id: 'preset_mage',
                    name: 'Mage',
                    tags: ['RPG', 'Magic'],
                    description: 'Ranged spellcaster with powerful magic abilities',
                    data: {
                        name: 'Mage',
                        classType: 'character',
                        description: 'A master of arcane magic, dealing high damage from range.',
                        attributes: [
                            { name: 'Health', baseValue: 80, growthRate: 5 },
                            { name: 'Mana', baseValue: 150, growthRate: 15 },
                            { name: 'Intelligence', baseValue: 18, growthRate: 2.5 },
                            { name: 'Magic Power', baseValue: 20, growthRate: 3 }
                        ],
                        abilities: [
                            { name: 'Fireball', description: 'Launch explosive projectile dealing 100 damage', cooldown: 5 },
                            { name: 'Ice Shield', description: 'Create barrier absorbing 200 damage', cooldown: 15 },
                            { name: 'Lightning Storm', description: 'AOE spell hitting all enemies for 80 damage', cooldown: 25 }
                        ],
                        relatedItems: []
                    }
                },
                {
                    id: 'preset_rogue',
                    name: 'Rogue',
                    tags: ['RPG', 'Stealth'],
                    description: 'Agile assassin with stealth and critical hit abilities',
                    data: {
                        name: 'Rogue',
                        classType: 'character',
                        description: 'A stealthy character specializing in critical hits and evasion.',
                        attributes: [
                            { name: 'Health', baseValue: 90, growthRate: 7 },
                            { name: 'Agility', baseValue: 20, growthRate: 3 },
                            { name: 'Critical Chance', baseValue: 25, growthRate: 2 },
                            { name: 'Evasion', baseValue: 15, growthRate: 1.5 }
                        ],
                        abilities: [
                            { name: 'Backstab', description: 'Critical strike from behind dealing 300% damage', cooldown: 10 },
                            { name: 'Shadow Step', description: 'Teleport behind enemy and become invisible for 2s', cooldown: 18 },
                            { name: 'Poison Blade', description: 'Apply poison dealing 20 damage/sec for 5 seconds', cooldown: 12 }
                        ],
                        relatedItems: []
                    }
                }
            ],
            mechanic: [
                {
                    id: 'preset_double_jump',
                    name: 'Double Jump',
                    tags: ['Platformer', 'Movement'],
                    description: 'Allow player to jump again while airborne',
                    data: {
                        name: 'Double Jump',
                        category: 'movement',
                        description: 'Player can perform a second jump while in the air, allowing for greater mobility and reaching higher platforms.',
                        priority: 'high',
                        status: 'not-started',
                        complexity: 'simple',
                        tags: ['platformer', 'jump', 'movement'],
                        implementation: 'Track jump count. Reset to 0 when grounded. Allow jump input if count < 2. Increment count on each jump.',
                        relatedItems: []
                    }
                },
                {
                    id: 'preset_health_system',
                    name: 'Health System',
                    tags: ['Core', 'Combat'],
                    description: 'Basic health and damage system with regeneration',
                    data: {
                        name: 'Health System',
                        category: 'gameplay',
                        description: 'Core health management system with damage, healing, and optional regeneration.',
                        priority: 'critical',
                        status: 'not-started',
                        complexity: 'medium',
                        tags: ['health', 'damage', 'core'],
                        implementation: 'Store current/max health. Damage reduces current. Death at 0. Optional: Regenerate X health per second when not in combat.',
                        relatedItems: []
                    }
                },
                {
                    id: 'preset_inventory',
                    name: 'Inventory System',
                    tags: ['RPG', 'UI'],
                    description: 'Grid-based inventory with item stacking',
                    data: {
                        name: 'Inventory System',
                        category: 'ui',
                        description: 'Grid-based inventory system supporting item stacking, equipped items, and weight limits.',
                        priority: 'high',
                        status: 'not-started',
                        complexity: 'complex',
                        tags: ['inventory', 'items', 'ui'],
                        implementation: 'Create Item class with stack size. Grid array for slots. Add/remove methods. Weight/slot limits. Save/load support.',
                        relatedItems: []
                    }
                },
                {
                    id: 'preset_crafting',
                    name: 'Crafting System',
                    tags: ['RPG', 'Gameplay'],
                    description: 'Recipe-based item crafting',
                    data: {
                        name: 'Crafting System',
                        category: 'gameplay',
                        description: 'Recipe-based crafting allowing players to combine materials into new items.',
                        priority: 'medium',
                        status: 'not-started',
                        complexity: 'medium',
                        tags: ['crafting', 'recipes', 'items'],
                        implementation: 'Recipe database (inputs -> output). Check player has required items. Consume inputs, create output. Unlock recipes via progression.',
                        relatedItems: []
                    }
                }
            ]
        };
        
        return templates[itemType] || [];
    }
};

// ============================================
// Bulk Operations Manager
// ============================================
const BulkOperations = {
    enabled: false,
    selectedItems: new Set(), // Set of {id, type}
    currentSection: null,
    
    init() {
        // Will be initialized when bulk mode is activated
    },
    
    toggleBulkMode(section) {
        this.enabled = !this.enabled;
        this.currentSection = section;
        
        if (!this.enabled) {
            this.selectedItems.clear();
        }
        
        this.updateUI();
        this.refreshSection(section);
    },
    
    updateUI() {
        const bulkPanel = document.getElementById('bulkActionsPanel');
        if (this.enabled && this.selectedItems.size > 0) {
            bulkPanel.classList.add('visible');
            document.getElementById('bulkSelectedCount').textContent = this.selectedItems.size;
        } else {
            bulkPanel.classList.remove('visible');
        }
    },
    
    toggleItem(id, type) {
        const key = `${type}:${id}`;
        const item = { id, type };
        
        if (this.hasItem(id, type)) {
            // Remove
            for (let selected of this.selectedItems) {
                if (selected.id === id && selected.type === type) {
                    this.selectedItems.delete(selected);
                    break;
                }
            }
        } else {
            // Add
            this.selectedItems.add(item);
        }
        
        this.updateUI();
    },
    
    hasItem(id, type) {
        for (let item of this.selectedItems) {
            if (item.id === id && item.type === type) {
                return true;
            }
        }
        return false;
    },
    
    selectAll(section) {
        this.selectedItems.clear();
        const items = this.getItemsForSection(section);
        items.forEach(item => this.selectedItems.add({ id: item.id, type: item.type }));
        this.updateUI();
        this.refreshSection(section);
    },
    
    deselectAll() {
        this.selectedItems.clear();
        this.updateUI();
        this.refreshSection(this.currentSection);
    },
    
    getItemsForSection(section) {
        const typeMap = {
            'notes': { type: 'note', data: AppState.notes },
            'classes': { type: 'class', data: AppState.classes },
            'mechanics': { type: 'mechanic', data: AppState.mechanics },
            'characters': { type: 'character', data: AppState.characters },
            'locations': { type: 'location', data: AppState.locations },
            'timeline': { type: 'timeline', data: AppState.timelineEvents },
            'conflicts': { type: 'conflict', data: AppState.conflicts },
            'themes': { type: 'theme', data: AppState.themes },
            'acts': { type: 'act', data: AppState.acts },
            'scenes': { type: 'scene', data: AppState.scenes }
        };
        
        const mapping = typeMap[section];
        if (!mapping) return [];
        
        return mapping.data.map(item => ({ id: item.id, type: mapping.type }));
    },
    
    refreshSection(section) {
        // Trigger re-render of current section
        if (section === 'mechanics') MechanicsManager.render();
        if (section === 'classes') ClassesManager.render();
        if (section === 'characters') CharactersManager.render();
        if (section === 'locations') LocationsManager.render();
        // Add more as needed
    },
    
    bulkAddRelationships() {
        if (this.selectedItems.size === 0) return;
        
        // Show relationship picker modal
        this.showRelationshipPicker('add');
    },
    
    bulkRemoveRelationships() {
        if (this.selectedItems.size === 0) return;
        
        // Show relationship picker modal
        this.showRelationshipPicker('remove');
    },
    
    showRelationshipPicker(action) {
        this.currentAction = action;
        this.relationshipsToApply = new Set();
        
        const content = `
            <div class="bulk-relationship-modal">
                <h3>${action === 'add' ? '<img src="icons/actions/add.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Add' : '<img src="icons/misc/subtract.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Remove'} Relationships</h3>
                <p>Select items to ${action === 'add' ? 'add to' : 'remove from'} all ${this.selectedItems.size} selected items:</p>
                
                <div class="relationship-type-tabs">
                    <button class="rel-tab active" data-type="all">All Types</button>
                    <button class="rel-tab" data-type="class">Classes</button>
                    <button class="rel-tab" data-type="mechanic">Mechanics</button>
                    <button class="rel-tab" data-type="character">Characters</button>
                    <button class="rel-tab" data-type="location">Locations</button>
                </div>
                
                <div class="relationship-picker-search">
                    <input type="text" id="bulkRelSearch" placeholder="Search items..." />
                </div>
                
                <div class="relationship-picker-list" id="bulkRelList">
                    <!-- Will be populated -->
                </div>
                
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="BulkOperations.closePicker()">Cancel</button>
                    <button class="btn btn-primary" onclick="BulkOperations.applyRelationships('${action}')">
                        ${action === 'add' ? 'Add' : 'Remove'} to Selected
                    </button>
                </div>
            </div>
        `;
        
        Modal.open(content);
        
        // Setup event listeners after modal is opened
        setTimeout(() => {
            document.querySelectorAll('.rel-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    document.querySelectorAll('.rel-tab').forEach(t => t.classList.remove('active'));
                    e.target.classList.add('active');
                    this.populateRelationshipList(e.target.dataset.type);
                });
            });
            
            document.getElementById('bulkRelSearch').addEventListener('input', (e) => {
                this.filterRelationshipList(e.target.value);
            });
            
            this.populateRelationshipList('all');
        }, 10);
    },
    
    populateRelationshipList(filterType) {
        const list = document.getElementById('bulkRelList');
        const allItems = RelationshipManager.getAllItems();
        
        let filtered = filterType === 'all' ? allItems : allItems.filter(item => item.type === filterType);
        
        list.innerHTML = filtered.map(item => {
            const checked = this.relationshipsToApply.has(`${item.type}:${item.id}`);
            return `
                <label class="relationship-picker-item">
                    <input type="checkbox" 
                           value="${item.id}" 
                           data-type="${item.type}"
                           ${checked ? 'checked' : ''}
                           onchange="BulkOperations.toggleRelationship('${item.id}', '${item.type}')" />
                    <span class="item-type-badge">${item.type}</span>
                    <span class="item-name">${Utils.escapeHtml(item.name)}</span>
                </label>
            `;
        }).join('');
    },
    
    filterRelationshipList(searchTerm) {
        const items = document.querySelectorAll('.relationship-picker-item');
        const term = searchTerm.toLowerCase();
        
        items.forEach(item => {
            const name = item.querySelector('.item-name').textContent.toLowerCase();
            item.style.display = name.includes(term) ? 'flex' : 'none';
        });
    },
    
    toggleRelationship(id, type) {
        const key = `${type}:${id}`;
        if (this.relationshipsToApply.has(key)) {
            this.relationshipsToApply.delete(key);
        } else {
            this.relationshipsToApply.add(key);
        }
    },
    
    applyRelationships(action) {
        if (this.relationshipsToApply.size === 0) {
            alert('Please select at least one item to relate.');
            return;
        }
        
        const relationshipsArray = Array.from(this.relationshipsToApply).map(key => {
            const [type, id] = key.split(':');
            return { type, id };
        });
        
        let successCount = 0;
        
        this.selectedItems.forEach(selectedItem => {
            const item = this.findItemData(selectedItem.id, selectedItem.type);
            if (!item) return;
            
            if (!item.relatedItems) item.relatedItems = [];
            
            relationshipsArray.forEach(rel => {
                if (action === 'add') {
                    // Add if not already present
                    if (!item.relatedItems.some(r => r.id === rel.id && r.type === rel.type)) {
                        item.relatedItems.push(rel);
                        successCount++;
                    }
                } else {
                    // Remove
                    const index = item.relatedItems.findIndex(r => r.id === rel.id && r.type === rel.type);
                    if (index !== -1) {
                        item.relatedItems.splice(index, 1);
                        successCount++;
                    }
                }
            });
        });
        
        Storage.save();
        this.closePicker();
        this.refreshSection(this.currentSection);
        
        alert(`Successfully ${action === 'add' ? 'added' : 'removed'} ${successCount} relationships.`);
    },
    
    findItemData(id, type) {
        const dataMap = {
            'note': AppState.notes,
            'class': AppState.classes,
            'mechanic': AppState.mechanics,
            'character': AppState.characters,
            'location': AppState.locations,
            'timeline': AppState.timelineEvents,
            'conflict': AppState.conflicts,
            'theme': AppState.themes,
            'act': AppState.acts,
            'scene': AppState.scenes
        };
        
        const data = dataMap[type];
        return data ? data.find(item => item.id === id) : null;
    },
    
    closePicker() {
        Modal.close();
    },
    
    bulkDelete() {
        if (this.selectedItems.size === 0) return;
        
        Utils.showConfirm(`Are you sure you want to delete ${this.selectedItems.size} items? This cannot be undone.`, () => {
            // Show impact analysis first
            this.showDeleteImpact();
        });
    },
    
    showDeleteImpact() {
        const impacts = [];
        
        this.selectedItems.forEach(item => {
            const referencedBy = RelationshipManager.getReferencedBy(item.id);
            if (referencedBy.length > 0) {
                impacts.push({
                    item: RelationshipManager.findItemById(item.id),
                    referencedBy
                });
            }
        });
        
        if (impacts.length === 0) {
            // No dependencies, safe to delete
            this.performBulkDelete();
            return;
        }
        
        // Show impact modal
        const content = `
            <div class="impact-analysis-modal">
                <h3>⚠️ Delete Impact Analysis</h3>
                <p>The following items will be affected:</p>
                
                <div class="impact-list">
                    ${impacts.map(impact => `
                        <div class="impact-item">
                            <strong>${impact.item.name}</strong> is referenced by:
                            <ul>
                                ${impact.referencedBy.map(ref => `
                                    <li><span class="item-type-badge">${ref.type}</span> ${Utils.escapeHtml(ref.name)}</li>
                                `).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
                
                <p><strong>These relationships will be removed.</strong></p>
                
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="BulkOperations.closePicker()">Cancel</button>
                    <button class="btn btn-danger" onclick="BulkOperations.performBulkDelete()">
                        Delete Anyway
                    </button>
                </div>
            </div>
        `;
        
        Modal.open(content);
    },
    
    performBulkDelete() {
        const count = this.selectedItems.size;
        
        this.selectedItems.forEach(item => {
            const data = this.findItemData(item.id, item.type);
            if (!data) return;
            
            const dataMap = {
                'note': AppState.notes,
                'class': AppState.classes,
                'mechanic': AppState.mechanics,
                'character': AppState.characters,
                'location': AppState.locations,
                'timeline': AppState.timelineEvents,
                'conflict': AppState.conflicts,
                'theme': AppState.themes,
                'act': AppState.acts,
                'scene': AppState.scenes
            };
            
            const array = dataMap[item.type];
            if (array) {
                const index = array.findIndex(i => i.id === item.id);
                if (index !== -1) {
                    array.splice(index, 1);
                }
            }
        });
        
        this.selectedItems.clear();
        Storage.save();
        this.closePicker();
        this.updateUI();
        this.refreshSection(this.currentSection);
        
        alert(`Successfully deleted ${count} items.`);
    }
};

// ============================================
// ============================================
// Quick Notes Manager
// ============================================
const QuickNotes = {
    currentEditingNoteId: null,
    
    init() {
        const quickNotesBtn = document.getElementById('quickNotesBtn');
        const closeBtn = document.getElementById('quickNotesCloseBtn');
        const searchInput = document.getElementById('quickNotesSearch');
        const createBtn = document.getElementById('createQuickNoteBtn');
        const goToNotesBtn = document.getElementById('goToNotesBtn');
        const saveBtn = document.getElementById('saveQuickNoteBtn');
        const cancelBtn = document.getElementById('cancelQuickNoteBtn');
        
        quickNotesBtn.addEventListener('click', () => this.open());
        closeBtn.addEventListener('click', () => this.close());
        searchInput.addEventListener('input', (e) => this.filterNotes(e.target.value));
        createBtn.addEventListener('click', () => this.showEditor());
        goToNotesBtn.addEventListener('click', () => this.goToNotesTab());
        saveBtn.addEventListener('click', () => this.saveNote());
        cancelBtn.addEventListener('click', () => this.hideEditor());
    },
    
    open() {
        document.getElementById('quickNotesModal').classList.add('active');
        this.refreshNotesList();
    },
    
    close() {
        // Blur any focused element to prevent focus issues
        if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
        }
        
        document.getElementById('quickNotesModal').classList.remove('active');
        this.hideEditor();
    },
    
    refreshNotesList() {
        const listContainer = document.getElementById('quickNotesList');
        const searchTerm = document.getElementById('quickNotesSearch').value.toLowerCase();
        
        let notes = AppState.notes || [];
        
        if (searchTerm) {
            notes = notes.filter(note => 
                note.title.toLowerCase().includes(searchTerm) ||
                note.content.toLowerCase().includes(searchTerm) ||
                note.category.toLowerCase().includes(searchTerm)
            );
        }
        
        if (notes.length === 0) {
            listContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-tertiary);">No notes found</div>';
            return;
        }
        
        listContainer.innerHTML = notes.map(note => `
            <div class="quick-note-item" onclick="QuickNotes.editNote('${note.id}')">
                <div class="quick-note-item-header">
                    <span class="quick-note-item-title">${note.title}</span>
                    <span class="quick-note-item-category">${note.category}</span>
                </div>
                <div class="quick-note-item-preview">${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}</div>
            </div>
        `).join('');
    },
    
    filterNotes(searchTerm) {
        this.refreshNotesList();
    },
    
    showEditor(noteId = null) {
        const editor = document.getElementById('quickNoteEditor');
        const list = document.getElementById('quickNotesList');
        
        list.style.display = 'none';
        editor.style.display = 'block';
        
        if (noteId) {
            const note = AppState.notes.find(n => n.id === noteId);
            if (note) {
                this.currentEditingNoteId = noteId;
                document.getElementById('quickNoteTitle').value = note.title;
                document.getElementById('quickNoteCategory').value = note.category;
                document.getElementById('quickNoteContent').value = note.content;
            }
        } else {
            this.currentEditingNoteId = null;
            document.getElementById('quickNoteTitle').value = '';
            document.getElementById('quickNoteCategory').value = 'Ideas';
            document.getElementById('quickNoteContent').value = '';
        }
        
        // Focus the title input after a brief delay to ensure display is updated
        setTimeout(() => {
            const titleInput = document.getElementById('quickNoteTitle');
            if (titleInput) {
                titleInput.focus();
            }
        }, 50);
    },
    
    hideEditor() {
        const editor = document.getElementById('quickNoteEditor');
        const list = document.getElementById('quickNotesList');
        
        editor.style.display = 'none';
        list.style.display = 'block';
        this.currentEditingNoteId = null;
    },
    
    editNote(noteId) {
        this.showEditor(noteId);
    },
    
    saveNote() {
        const title = document.getElementById('quickNoteTitle').value.trim();
        const category = document.getElementById('quickNoteCategory').value;
        const content = document.getElementById('quickNoteContent').value.trim();
        
        if (!title) {
            Utils.showToast('Please enter a note title', 'warning');
            return;
        }
        
        if (this.currentEditingNoteId) {
            // Update existing note
            const note = AppState.notes.find(n => n.id === this.currentEditingNoteId);
            if (note) {
                note.title = title;
                note.category = category;
                note.content = content;
                note.updatedAt = new Date().toISOString();
            }
        } else {
            // Create new note
            const newNote = {
                id: Utils.generateId(),
                title: title,
                content: content,
                category: category,
                tags: [],
                color: '',
                pinned: false,
                reminder: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            AppState.notes.push(newNote);
        }
        
        AppState.save();
        
        // Refresh notes manager if on notes tab
        if (AppState.currentSection === 'notes') {
            NotesManager.render();
        }
        
        this.hideEditor();
        this.refreshNotesList();
        
        AIAssistant.showToast('✅ Note saved successfully!');
    },
    
    goToNotesTab() {
        this.close();
        Navigation.switchSection('notes');
    }
};

// ============================================
// AI Assistant
// ============================================
const AIAssistant = {
    isOpen: false,
    chatHistory: [],
    isProcessing: false,
    config: {
        mode: null, // 'local', 'api', 'remote'
        local: {
            modelPath: null,
            contextLength: 512,
            temperature: 0.7
        },
        api: {
            provider: 'openai',
            endpoint: null,
            apiKey: null,
            model: 'gpt-4',
            temperature: 0.7,
            maxTokens: 2000
        },
        remote: {
            serverUrl: null,
            endpointPath: '/v1/chat/completions',
            requiresAuth: false,
            authType: 'bearer',
            authToken: null,
            requestFormat: 'openai'
        }
    },
    localModel: null,
    
    init() {
        const assistantBtn = document.getElementById('aiAssistantBtn');
        const closeBtn = document.getElementById('aiCloseBtn');
        const sendBtn = document.getElementById('aiSendBtn');
        const input = document.getElementById('aiInput');
        const clearBtn = document.getElementById('aiClearHistoryBtn');
        const settingsBtn = document.getElementById('aiSettingsBtn');
        
        // Initialize resize functionality
        this.initResize();
        
        // Open AI Assistant
        assistantBtn.addEventListener('click', () => {
            this.open();
        });
        
        // Close AI Assistant
        closeBtn.addEventListener('click', () => {
            this.close();
        });
        
        // Open Settings
        settingsBtn.addEventListener('click', () => {
            this.openSettings();
        });
        
        // Send message
        sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Send on Enter (Shift+Enter for newline)
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Ensure input is always focusable - brute force fix
        input.addEventListener('mousedown', (e) => {
            // Force enable the input on any mouse interaction
            input.disabled = false;
            input.readOnly = false;
            input.style.pointerEvents = 'auto';
        });
        
        input.addEventListener('click', (e) => {
            // Force enable and focus on click
            input.disabled = false;
            input.readOnly = false;
            input.style.pointerEvents = 'auto';
            setTimeout(() => input.focus(), 0);
        });
        
        // Clear history
        clearBtn.addEventListener('click', () => {
            Utils.showConfirm('Are you sure you want to clear the entire conversation history? This cannot be undone.', () => {
                this.clearHistory();
            });
        });
        
        // Initialize settings modal
        this.initSettings();
        
        // Load config and chat history
        this.loadConfig();
        this.loadHistory();
        this.updateStatus();
    },
    
    open() {
        this.isOpen = true;
        document.getElementById('aiAssistantPanel').classList.add('active');
        
        // Hide welcome message if there are messages
        if (this.chatHistory.length > 0) {
            const welcome = document.querySelector('.ai-welcome-message');
            if (welcome) welcome.style.display = 'none';
        }
        
        // Focus input
        setTimeout(() => {
            document.getElementById('aiInput').focus();
        }, 100);
    },
    
    close() {
        this.isOpen = false;
        document.getElementById('aiAssistantPanel').classList.remove('active');
    },
    
    initResize() {
        const panel = document.getElementById('aiAssistantPanel');
        const resizeHandleLeft = document.getElementById('aiResizeHandleLeft');
        const resizeHandleTop = document.getElementById('aiResizeHandleTop');
        
        let isResizing = false;
        let resizeType = null; // 'width' or 'height'
        let startX = 0;
        let startY = 0;
        let startWidth = 0;
        let startHeight = 0;
        let startBottom = 0;

        // Left edge resize (width only)
        resizeHandleLeft.addEventListener('mousedown', (e) => {
            isResizing = true;
            resizeType = 'width';
            startX = e.clientX;
            startWidth = panel.offsetWidth;
            resizeHandleLeft.classList.add('active');
            document.body.style.cursor = 'ew-resize';
            e.preventDefault();
            e.stopPropagation();
        });

        // Top edge resize (height only)
        resizeHandleTop.addEventListener('mousedown', (e) => {
            isResizing = true;
            resizeType = 'height';
            startY = e.clientY;
            startHeight = panel.offsetHeight;
            const computedStyle = window.getComputedStyle(panel);
            startBottom = parseInt(computedStyle.bottom);
            resizeHandleTop.classList.add('active');
            document.body.style.cursor = 'ns-resize';
            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            if (resizeType === 'width') {
                // Width only (left edge)
                const deltaX = startX - e.clientX;
                // Calculate max width: distance from right edge (1.5rem = 24px) to left edge of window
                const maxWidth = window.innerWidth - 24 - 24; // 24px right margin + 24px safety margin on left
                const newWidth = Math.max(350, Math.min(maxWidth, startWidth + deltaX));
                panel.style.width = `${newWidth}px`;
            } else if (resizeType === 'height') {
                // Height only (top edge) - adjust by moving bottom up
                const deltaY = e.clientY - startY;
                const maxHeight = window.innerHeight * 0.8; // 80vh in pixels
                const newHeight = Math.max(400, Math.min(maxHeight, startHeight - deltaY));
                
                panel.style.height = `${newHeight}px`;
                panel.style.maxHeight = `${newHeight}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                resizeType = null;
                resizeHandleLeft.classList.remove('active');
                resizeHandleTop.classList.remove('active');
                document.body.style.cursor = '';
            }
        });
    },
    
    async sendMessage(retryMessage = null) {
        const input = document.getElementById('aiInput');
        const message = retryMessage || input.value.trim();
        
        if (!message || this.isProcessing) return;
        
        // Add user message (only if not retrying)
        if (!retryMessage) {
            this.addMessage('user', message);
            input.value = '';
        }
        
        // Hide welcome message
        const welcome = document.querySelector('.ai-welcome-message');
        if (welcome) welcome.style.display = 'none';
        
        // Show thinking indicator
        this.setStatus('thinking', 'Thinking...');
        this.isProcessing = true;
        document.getElementById('aiSendBtn').disabled = true;
        
        try {
            // Get AI response
            const response = await this.getAIResponse(message);
            this.addMessage('assistant', response);
            this.setStatus('ready', this.getStatusText());
        } catch (error) {
            console.error('AI Error:', error);
            // Add error message with retry button
            this.addErrorMessage(error, message);
            this.setStatus('error', 'Error');
        } finally {
            this.isProcessing = false;
            document.getElementById('aiSendBtn').disabled = false;
        }
    },
    
    addMessage(role, content) {
        const timestamp = new Date();
        const message = { role, content, timestamp: timestamp.toISOString() };
        
        this.chatHistory.push(message);
        this.saveHistory();
        this.renderMessage(message);
        
        // Scroll to bottom
        const container = document.getElementById('aiChatContainer');
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    },
    
    addErrorMessage(error, originalMessage) {
        const messagesContainer = document.getElementById('aiMessages');
        const messageEl = document.createElement('div');
        messageEl.className = 'ai-message assistant error-message';
        
        const timestamp = new Date();
        const timeStr = timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        
        // Parse error message to provide helpful guidance
        let errorDetails = error.message;
        let helpText = '';
        
        if (error.message.includes('insufficient_quota') || error.message.includes('insufficient funds')) {
            helpText = '<img src="icons/misc/lightbulb.svg" alt="" width="14" height="14" style="vertical-align: middle;"> <strong>Suggestion:</strong> Add credits to your OpenAI account or check your billing settings.';
        } else if (error.message.includes('invalid_api_key') || error.message.includes('Incorrect API key')) {
            helpText = '<img src="icons/misc/lightbulb.svg" alt="" width="14" height="14" style="vertical-align: middle;"> <strong>Suggestion:</strong> Check that your API key is correct in the settings.';
        } else if (error.message.includes('rate_limit')) {
            helpText = '<img src="icons/misc/lightbulb.svg" alt="" width="14" height="14" style="vertical-align: middle;"> <strong>Suggestion:</strong> You\'re sending requests too quickly. Wait a moment and try again.';
        } else if (error.message.includes('Not Configured')) {
            helpText = '<img src="icons/misc/lightbulb.svg" alt="" width="14" height="14" style="vertical-align: middle;"> <strong>Suggestion:</strong> Click the <img src="icons/navigation/mechanics.svg" alt="" width="14" height="14" style="vertical-align: middle;"> settings button to configure your AI connection.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            helpText = '<img src="icons/misc/lightbulb.svg" alt="" width="14" height="14" style="vertical-align: middle;"> <strong>Suggestion:</strong> Check your internet connection.';
        }
        
        messageEl.innerHTML = `
            <div class="message-avatar assistant">
                ❌
            </div>
            <div class="message-content error-content">
                <div class="error-header">
                    <strong>⚠️ Error Occurred</strong>
                </div>
                <div class="error-details">
                    ${this.formatMessage(errorDetails)}
                </div>
                ${helpText ? `<div class="error-help">${helpText}</div>` : ''}
                <div class="error-actions">
                    <button class="retry-btn" onclick="AIAssistant.retryMessage('${this.escapeForAttribute(originalMessage)}')">
                        <span>🔄 Retry Message</span>
                    </button>
                </div>
                <span class="message-time">${timeStr}</span>
            </div>
        `;
        
        messagesContainer.appendChild(messageEl);
        
        // Scroll to bottom
        const container = document.getElementById('aiChatContainer');
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    },
    
    escapeForAttribute(text) {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '&quot;')
            .replace(/\n/g, '\\n');
    },
    
    retryMessage(message) {
        // Unescape the message
        const unescaped = message.replace(/\\n/g, '\n').replace(/\\'/g, "'");
        this.sendMessage(unescaped);
    },
    
    getStatusText() {
        if (!this.config.mode) return 'Not Configured';
        const modes = {
            'local': '💻 Local Model',
            'api': '🔑 API Connected',
            'remote': '🌐 Remote Server'
        };
        return modes[this.config.mode] || 'Ready';
    },
    
    renderMessage(message) {
        const messagesContainer = document.getElementById('aiMessages');
        const messageEl = document.createElement('div');
        messageEl.className = `ai-message ${message.role}`;
        
        const timestamp = new Date(message.timestamp);
        const timeStr = timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        
        messageEl.innerHTML = `
            <div class="message-avatar ${message.role}">
                ${message.role === 'user' ? '👤' : '🤖'}
            </div>
            <div class="message-content">
                <div class="message-text">${this.formatMessage(message.content)}</div>
                <span class="message-time">${timeStr}</span>
            </div>
        `;
        
        messagesContainer.appendChild(messageEl);
    },
    
    formatMessage(text) {
        // Escape HTML and preserve line breaks
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
    },
    
    setStatus(state, text) {
        const indicator = document.getElementById('aiStatusIndicator');
        const dot = indicator.querySelector('.status-dot');
        const statusText = indicator.querySelector('.status-text');
        
        dot.className = 'status-dot';
        if (state !== 'ready') {
            dot.classList.add(state);
        }
        statusText.textContent = text;
    },
    
    async getAIResponse(userMessage) {
        // Check if AI is configured
        if (!this.config.mode) {
            throw new Error('AI is not configured. Please click the settings (<img src="icons/navigation/mechanics.svg" alt="" width="14" height="14" style="vertical-align: middle;">) button to configure your AI connection.');
        }
        
        // Build context about the entire project
        const context = this.buildContext();
        
        // Route to appropriate AI handler
        switch (this.config.mode) {
            case 'local':
                return await this.getLocalResponse(userMessage, context);
            case 'api':
                return await this.getAPIResponse(userMessage, context);
            case 'remote':
                return await this.getRemoteResponse(userMessage, context);
            default:
                return this.simulateAIResponse(userMessage, context);
        }
    },
    
    async getLocalResponse(userMessage, context) {
        if (!isElectron) {
            throw new Error('Local GGUF models are only supported in the desktop application.');
        }
        
        const config = this.config.local;
        
        try {
            // Check if model is loaded
            const isLoaded = await window.electronAPI.isModelLoaded();
            
            // Load model if needed
            if (!isLoaded) {
                if (!config.modelPath || config.modelPath === 'default') {
                    throw new Error('Please select a GGUF model in AI settings.');
                }
                
                // Show loading indicator
                this.showModelLoadingIndicator('Loading model...');
                
                try {
                    await window.electronAPI.loadModel(config.modelPath, {
                        contextLength: config.contextLength
                    });
                    this.hideModelLoadingIndicator();
                } catch (loadError) {
                    this.hideModelLoadingIndicator();
                    throw new Error(`Failed to load model: ${loadError.message}`);
                }
            }
            
            // Build prompt with context
            const systemPrompt = `You are a helpful AI assistant integrated into a game design planning tool. You have full access to the user's project data and can provide insights, suggestions, and help with brainstorming.

Current Project Context:
${JSON.stringify(context, null, 2)}

Previous conversation:
${this.chatHistory.slice(-5).map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')}

User: ${userMessage}
Assistant:`;
            
            // Generate response with streaming
            this.setupGenerationStreaming();
            
            const result = await window.electronAPI.generateText(systemPrompt, {
                temperature: config.temperature,
                maxTokens: 512,
                threads: 4
            });
            
            if (!result.success) {
                throw new Error('Generation failed');
            }
            
            return result.text;
            
        } catch (error) {
            console.error('Local inference error:', error);
            throw error;
        }
    },
    
    showModelLoadingIndicator(message) {
        const chatPanel = document.querySelector('.ai-chat-container');
        let indicator = document.getElementById('modelLoadingIndicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'modelLoadingIndicator';
            indicator.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.9);
                padding: 2rem;
                border-radius: 8px;
                text-align: center;
                z-index: 1000;
                color: white;
                pointer-events: none;
            `;
            chatPanel.style.position = 'relative';
            chatPanel.appendChild(indicator);
        }
        
        indicator.innerHTML = `
            <div style="font-size: 1.2rem; margin-bottom: 1rem;">${message}</div>
            <div style="font-size: 0.9rem; opacity: 0.7;">This may take a minute...</div>
        `;
        indicator.style.display = 'block';
    },
    
    hideModelLoadingIndicator() {
        const indicator = document.getElementById('modelLoadingIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    },
    
    setupGenerationStreaming() {
        if (this.streamingSetup) return;
        
        if (isElectron && window.electronAPI.onGenerationProgress) {
            window.electronAPI.onGenerationProgress((token) => {
                // Update the last message with streaming tokens
                const messages = document.querySelectorAll('.ai-message');
                const lastMessage = messages[messages.length - 1];
                if (lastMessage && lastMessage.classList.contains('ai')) {
                    lastMessage.querySelector('.message-content').textContent += token;
                }
            });
            this.streamingSetup = true;
        }
    },
    
    async getAPIResponse(userMessage, context) {
        const config = this.config.api;
        
        // Build messages array with context
        const messages = [
            {
                role: 'system',
                content: `You are a helpful AI assistant integrated into a game design planning tool. You have full access to the user's project data and can provide insights, suggestions, and help with brainstorming. However, you cannot directly edit or modify the project data.

Current Project Context:
${JSON.stringify(context, null, 2)}`
            },
            ...this.chatHistory.slice(-10).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            })),
            {
                role: 'user',
                content: userMessage
            }
        ];
        
        // Call appropriate API
        if (config.provider === 'openai' || config.provider === 'custom') {
            return await this.callOpenAIAPI(messages, config);
        } else if (config.provider === 'anthropic') {
            return await this.callAnthropicAPI(messages, config);
        } else {
            // Generic OpenAI-compatible API
            return await this.callOpenAIAPI(messages, config);
        }
    },
    
    async callOpenAIAPI(messages, config) {
        try {
            const response = await fetch(config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: messages,
                    temperature: config.temperature,
                    max_tokens: config.maxTokens
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                
                // Extract detailed error information
                let errorMessage = `API Error (${response.status})`;
                
                if (errorData) {
                    // OpenAI error format
                    if (errorData.error) {
                        errorMessage = errorData.error.message || errorData.error.type || errorMessage;
                        
                        // Add error code if available
                        if (errorData.error.code) {
                            errorMessage = `[${errorData.error.code}] ${errorMessage}`;
                        }
                    } else if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                } else {
                    errorMessage = `${response.status} ${response.statusText}`;
                }
                
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response format from API');
            }
            
            return data.choices[0].message.content;
        } catch (error) {
            // Enhance network errors
            if (error.message.includes('fetch')) {
                throw new Error('Network error: Unable to connect to API. Check your internet connection.');
            }
            throw error;
        }
    },
    
    async callAnthropicAPI(messages, config) {
        // Extract system message
        const systemMessage = messages.find(m => m.role === 'system');
        const conversationMessages = messages.filter(m => m.role !== 'system');
        
        try {
            const response = await fetch(config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': config.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: conversationMessages,
                    system: systemMessage?.content,
                    temperature: config.temperature,
                    max_tokens: config.maxTokens
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                let errorMessage = `API Error (${response.status})`;
                
                if (errorData && errorData.error) {
                    errorMessage = errorData.error.message || errorMessage;
                }
                
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            if (!data.content || !data.content[0] || !data.content[0].text) {
                throw new Error('Invalid response format from Anthropic API');
            }
            
            return data.content[0].text;
        } catch (error) {
            if (error.message.includes('fetch')) {
                throw new Error('Network error: Unable to connect to Anthropic API. Check your internet connection.');
            }
            throw error;
        }
    },
    
    async getRemoteResponse(userMessage, context) {
        const config = this.config.remote;
        const fullUrl = config.serverUrl + config.endpointPath;
        
        // Build request based on format
        let requestBody;
        if (config.requestFormat === 'openai') {
            requestBody = {
                model: 'default',
                messages: [
                    {
                        role: 'system',
                        content: `You are a helpful AI assistant for game design. Project context: ${JSON.stringify(context)}`
                    },
                    ...this.chatHistory.slice(-10).map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    {
                        role: 'user',
                        content: userMessage
                    }
                ]
            };
        } else if (config.requestFormat === 'ollama') {
            requestBody = {
                model: 'default',
                prompt: userMessage,
                system: `You are a helpful AI assistant for game design. Project context: ${JSON.stringify(context)}`
            };
        } else if (config.requestFormat === 'llamacpp') {
            requestBody = {
                prompt: `${JSON.stringify(context)}\n\n${userMessage}`,
                temperature: 0.7,
                n_predict: 2000
            };
        } else {
            // Default to OpenAI format
            requestBody = {
                messages: [{ role: 'user', content: userMessage }]
            };
        }
        
        // Build headers
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (config.requiresAuth) {
            if (config.authType === 'bearer') {
                headers['Authorization'] = `Bearer ${config.authToken}`;
            } else if (config.authType === 'apikey') {
                headers['X-API-Key'] = config.authToken;
            } else if (config.authType === 'basic') {
                headers['Authorization'] = `Basic ${btoa(config.authToken)}`;
            }
        }
        
        try {
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                let errorMessage = `Remote Server Error (${response.status})`;
                
                if (errorData) {
                    if (errorData.error) {
                        errorMessage = typeof errorData.error === 'string' ? errorData.error : errorData.error.message || errorMessage;
                    } else if (errorData.message) {
                        errorMessage = errorData.message;
                    } else if (errorData.detail) {
                        errorMessage = errorData.detail;
                    }
                } else {
                    errorMessage = `${response.status} ${response.statusText}`;
                }
                
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            // Extract response based on format
            let responseText;
            if (config.requestFormat === 'openai') {
                responseText = data.choices?.[0]?.message?.content;
            } else if (config.requestFormat === 'ollama') {
                responseText = data.response;
            } else if (config.requestFormat === 'llamacpp') {
                responseText = data.content;
            } else {
                // Try to find response in common fields
                responseText = data.response || data.content || data.text || data.message;
            }
            
            if (!responseText) {
                throw new Error('Unable to extract response from server. Check your request format setting.');
            }
            
            return responseText;
        } catch (error) {
            if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
                throw new Error(`Network error: Unable to connect to ${config.serverUrl}. Check the server URL and your internet connection.`);
            }
            throw error;
        }
    },
    
    simulateAIResponse(message, context) {
        // Simulated AI response for demonstration
        // This will be replaced with actual API calls
        
        const lowerMsg = message.toLowerCase();
        
        // Check what the user is asking about
        if (lowerMsg.includes('task') || lowerMsg.includes('todo')) {
            const tasks = AppState.tasks;
            if (tasks.length === 0) {
                return "I see you don't have any tasks yet. Would you like me to help you brainstorm some tasks to get started with your game development?";
            }
            
            const pending = tasks.filter(t => t.status !== 'Completed').length;
            const completed = tasks.filter(t => t.status === 'Completed').length;
            
            return `You currently have ${tasks.length} tasks: ${completed} completed and ${pending} pending.\n\nThe high-priority tasks include: ${tasks.filter(t => t.priority === 'High').map(t => t.title).join(', ') || 'none'}.\n\nWould you like me to help you prioritize or suggest new tasks?`;
        }
        
        if (lowerMsg.includes('class') || lowerMsg.includes('character class')) {
            const classes = AppState.classes;
            if (classes.length === 0) {
                return "I notice you haven't created any character classes yet. What type of game are you making? I can help you brainstorm class ideas based on your game genre.";
            }
            
            return `You have ${classes.length} character classes: ${classes.map(c => c.name).join(', ')}.\n\nEach class has unique attributes and skills. Would you like me to analyze the balance between them or suggest improvements?`;
        }
        
        if (lowerMsg.includes('story') || lowerMsg.includes('narrative') || lowerMsg.includes('plot')) {
            const chars = AppState.story.characters?.length || 0;
            const locs = AppState.story.locations?.length || 0;
            const acts = AppState.story.acts?.length || 0;
            
            if (chars === 0 && locs === 0 && acts === 0) {
                return "Your story section is empty. Let's build your narrative! Start by telling me about your game's premise or the type of story you want to tell.";
            }
            
            return `Your story has ${chars} characters, ${locs} locations, and ${acts} acts.\n\nWould you like me to help develop character arcs, suggest plot twists, or analyze the story structure?`;
        }
        
        if (lowerMsg.includes('balance') || lowerMsg.includes('gameplay')) {
            return "I'd be happy to help analyze game balance! Based on your classes, mechanics, and items, I can provide insights on:\n\n• Power progression curves\n• Class balance and synergies\n• Item stat distribution\n• Difficulty scaling\n\nWhat aspect would you like to focus on?";
        }
        
        if (lowerMsg.includes('item')) {
            const items = AppState.story.items?.length || 0;
            if (items === 0) {
                return "You haven't added any items yet. What type of items does your game need? Weapons, armor, consumables, or quest items?";
            }
            
            return `You have ${items} items in your game. I can help you:\n\n• Design new items with balanced stats\n• Analyze item distribution across rarity tiers\n• Suggest item effects and abilities\n• Create item sets or collections\n\nWhat would you like to work on?`;
        }
        
        // Generic helpful response
        return `I'm here to help with your game design! I have access to all your project data:\n\n• ${AppState.tasks.length} tasks\n• ${AppState.classes.length} classes\n• ${AppState.mechanics.length} mechanics\n• ${AppState.story.characters?.length || 0} characters\n• ${AppState.story.items?.length || 0} items\n• And much more!\n\nFeel free to ask me about:\n\n<img src="icons/misc/lightbulb.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Brainstorming new ideas\n<img src="icons/misc/chart-line-up.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Analyzing game balance\n<img src="icons/misc/sparkles.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Developing story elements\n<img src="icons/misc/gameplay.svg" alt="" width="14" height="14" style="vertical-align: middle;"> Prioritizing tasks\n🔍 Finding connections between elements\n\nWhat would you like to work on?`;
    },
    
    buildContext() {
        // Build a comprehensive context object with all project data
        return {
            projectName: AppState.notes?.find(n => n.category === 'Project')?.title || 'Untitled Game',
            tasks: {
                total: AppState.tasks.length,
                completed: AppState.tasks.filter(t => t.status === 'Completed').length,
                pending: AppState.tasks.filter(t => t.status !== 'Completed').length,
                byPriority: {
                    high: AppState.tasks.filter(t => t.priority === 'High').length,
                    medium: AppState.tasks.filter(t => t.priority === 'Medium').length,
                    low: AppState.tasks.filter(t => t.priority === 'Low').length
                },
                items: AppState.tasks.map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority }))
            },
            assets: {
                total: AppState.assets.length,
                byType: this.groupByProperty(AppState.assets, 'type'),
                items: AppState.assets.map(a => ({ id: a.id, name: a.name, type: a.type, status: a.status }))
            },
            classes: {
                total: AppState.classes.length,
                items: AppState.classes.map(c => ({
                    id: c.id,
                    name: c.name,
                    attributes: c.attributes?.map(a => ({ name: a.name, base: a.baseValue })),
                    skills: c.skills?.map(s => s.name)
                }))
            },
            mechanics: {
                total: AppState.mechanics.length,
                byCategory: this.groupByProperty(AppState.mechanics, 'category'),
                items: AppState.mechanics.map(m => ({ id: m.id, name: m.name, category: m.category }))
            },
            story: {
                characters: {
                    total: AppState.story.characters?.length || 0,
                    items: AppState.story.characters?.map(c => ({ id: c.id, name: c.name, role: c.role })) || []
                },
                locations: {
                    total: AppState.story.locations?.length || 0,
                    items: AppState.story.locations?.map(l => ({ id: l.id, name: l.name, type: l.type })) || []
                },
                items: {
                    total: AppState.story.items?.length || 0,
                    byType: this.groupByProperty(AppState.story.items || [], 'type'),
                    byRarity: this.groupByProperty(AppState.story.items || [], 'rarity'),
                    items: AppState.story.items?.map(i => ({
                        id: i.id,
                        name: i.name,
                        type: i.type,
                        rarity: i.rarity,
                        stats: i.stats
                    })) || []
                },
                acts: {
                    total: AppState.story.acts?.length || 0,
                    items: AppState.story.acts?.map(a => ({
                        id: a.id,
                        title: a.title,
                        scenes: a.scenes?.length || 0
                    })) || []
                }
            }
        };
    },
    
    groupByProperty(array, property) {
        const grouped = {};
        array.forEach(item => {
            const key = item[property] || 'Other';
            grouped[key] = (grouped[key] || 0) + 1;
        });
        return grouped;
    },
    
    loadHistory() {
        try {
            const saved = localStorage.getItem(ProjectManager.getStorageKey('ai_chat_history'));
            if (saved) {
                this.chatHistory = JSON.parse(saved);
                
                // Render all messages
                this.chatHistory.forEach(msg => this.renderMessage(msg));
                
                // Hide welcome if there are messages
                if (this.chatHistory.length > 0) {
                    const welcome = document.querySelector('.ai-welcome-message');
                    if (welcome) welcome.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error loading AI chat history:', error);
        }
    },
    
    saveHistory() {
        try {
            localStorage.setItem(ProjectManager.getStorageKey('ai_chat_history'), JSON.stringify(this.chatHistory));
        } catch (error) {
            console.error('Error saving AI chat history:', error);
        }
    },
    
    clearHistory() {
        this.chatHistory = [];
        localStorage.removeItem(ProjectManager.getStorageKey('ai_chat_history'));
        
        // Clear messages from UI
        document.getElementById('aiMessages').innerHTML = '';
        
        // Show welcome message again
        const welcome = document.querySelector('.ai-welcome-message');
        if (welcome) welcome.style.display = 'block';
        
        this.updateStatus();
    },
    
    // ============================================
    // Settings Modal Management
    // ============================================
    
    initSettings() {
        const modal = document.getElementById('aiSettingsModal');
        const closeBtn = document.getElementById('aiSettingsCloseBtn');
        const cancelBtn = document.getElementById('cancelSettingsBtn');
        const saveBtn = document.getElementById('saveSettingsBtn');
        
        // Mode selection
        const modeRadios = document.querySelectorAll('input[name="aiMode"]');
        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.showModeSettings(e.target.value);
            });
        });
        
        // Close modal
        closeBtn.addEventListener('click', () => this.closeSettings());
        cancelBtn.addEventListener('click', () => this.closeSettings());
        
        // Save settings
        saveBtn.addEventListener('click', () => this.saveSettings());
        
        // Click outside to close (prevent event bubbling)
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                e.stopPropagation();
                this.closeSettings();
            }
        });
        
        // API provider change
        document.getElementById('apiProvider').addEventListener('change', (e) => {
            const customEndpoint = document.getElementById('customApiEndpoint');
            customEndpoint.style.display = e.target.value === 'custom' ? 'block' : 'none';
            
            // Set default models
            const modelInput = document.getElementById('apiModel');
            const defaults = {
                'openai': 'gpt-4',
                'anthropic': 'claude-3-opus-20240229',
                'cohere': 'command',
                'google': 'gemini-pro',
                'mistral': 'mistral-large-latest'
            };
            if (defaults[e.target.value]) {
                modelInput.value = defaults[e.target.value];
            }
        });
        
        // Local model selection
        document.getElementById('localModelSelect').addEventListener('change', (e) => {
            const customUpload = document.getElementById('customModelUpload');
            customUpload.style.display = e.target.value === 'custom' ? 'block' : 'none';
        });
        
        // Open models folder button (Electron only)
        const openModelsFolderBtn = document.getElementById('openModelsFolder');
        if (isElectron && openModelsFolderBtn) {
            openModelsFolderBtn.addEventListener('click', async () => {
                try {
                    await window.electronAPI.openModelsFolder();
                } catch (error) {
                    alert(`Error opening models folder: ${error.message}`);
                }
            });
        } else if (openModelsFolderBtn) {
            // Hide button in web mode
            openModelsFolderBtn.style.display = 'none';
        }
        
        // Unload model button (Electron only)
        const unloadModelBtn = document.getElementById('unloadModelBtn');
        if (isElectron && unloadModelBtn) {
            unloadModelBtn.addEventListener('click', async () => {
                try {
                    await window.electronAPI.unloadModel();
                    await this.updateModelStatus();
                    alert('Model unloaded successfully. Memory has been freed.');
                } catch (error) {
                    alert(`Error unloading model: ${error.message}`);
                }
            });
        }
        
        // GGUF file input - use Electron file picker if available
        const ggufFileInput = document.getElementById('ggufFileInput');
        if (isElectron) {
            // Replace file input with button for Electron
            const electronPickerBtn = document.createElement('button');
            electronPickerBtn.type = 'button';
            electronPickerBtn.className = 'btn btn-secondary btn-sm';
            electronPickerBtn.innerHTML = '<span>📁 Select GGUF Model File</span>';
            electronPickerBtn.style.width = '100%';
            electronPickerBtn.style.marginTop = '0.5rem';
            
            let selectedGGUFFile = null;
            
            electronPickerBtn.addEventListener('click', async () => {
                try {
                    const fileInfo = await window.electronAPI.selectGGUFFile();
                    if (fileInfo) {
                        selectedGGUFFile = fileInfo;
                        electronPickerBtn.innerHTML = `<span>✅ ${fileInfo.name} (${(fileInfo.size / 1024 / 1024).toFixed(2)} MB)</span>`;
                        // Store file info in config
                        this.config.local.modelFile = fileInfo;
                    }
                } catch (error) {
                    alert(`Error selecting file: ${error.message}`);
                }
            });
            
            ggufFileInput.parentNode.insertBefore(electronPickerBtn, ggufFileInput);
            ggufFileInput.style.display = 'none';
        }
        
        // Remote auth toggle
        document.getElementById('remoteRequiresAuth').addEventListener('change', (e) => {
            document.getElementById('remoteAuthSettings').style.display = e.target.checked ? 'block' : 'none';
        });
        
        // Temperature sliders
        document.getElementById('localTemperature').addEventListener('input', (e) => {
            document.getElementById('localTempValue').textContent = e.target.value;
        });
        document.getElementById('apiTemperature').addEventListener('input', (e) => {
            document.getElementById('apiTempValue').textContent = e.target.value;
        });
        
        // Test connection
        document.getElementById('testConnectionBtn').addEventListener('click', () => this.testRemoteConnection());
        
        // Run test
        document.getElementById('runTestBtn').addEventListener('click', () => this.runConfigTest());
    },
    
    async openSettings() {
        const modal = document.getElementById('aiSettingsModal');
        
        if (!modal) {
            console.error('AI Settings modal not found!');
            return;
        }
        
        modal.classList.add('active');
        
        // Load current config into form
        this.populateSettingsForm();
        
        // Scan for models in Electron
        if (isElectron) {
            await this.scanAndPopulateModels();
            await this.updateModelStatus();
        }
    },
    
    async scanAndPopulateModels() {
        try {
            const models = await window.electronAPI.scanModelsFolder();
            const select = document.getElementById('localModelSelect');
            
            // Clear existing options except "Select" and "Custom"
            select.innerHTML = `
                <option value="">-- Select a model --</option>
            `;
            
            // Add detected models
            if (models && models.length > 0) {
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.path;
                    option.textContent = `${model.name} (${model.sizeFormatted})`;
                    select.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.disabled = true;
                option.textContent = '-- No models found in models/ folder --';
                select.appendChild(option);
            }
            
            // Add custom option at the end
            const customOption = document.createElement('option');
            customOption.value = 'custom';
            customOption.textContent = 'Load Custom GGUF File...';
            select.appendChild(customOption);
            
            // Restore selected value if exists
            if (this.config.local.modelPath && this.config.local.modelPath !== 'default') {
                select.value = this.config.local.modelPath;
            }
        } catch (error) {
            console.error('Error scanning models folder:', error);
        }
    },
    
    async updateModelStatus() {
        if (!isElectron) return;
        
        try {
            const isLoaded = await window.electronAPI.isModelLoaded();
            const statusSection = document.getElementById('modelStatusSection');
            const statusText = document.getElementById('modelStatus');
            const unloadBtn = document.getElementById('unloadModelBtn');
            
            statusSection.style.display = 'block';
            
            if (isLoaded) {
                statusText.innerHTML = '<span style="color: #4CAF50;">✓ Model loaded and ready</span>';
                statusText.style.color = '#4CAF50';
                unloadBtn.style.display = 'block';
            } else {
                statusText.innerHTML = '<span style="color: #888;">No model loaded</span>';
                statusText.style.color = '#888';
                unloadBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking model status:', error);
        }
    },
    
    closeSettings() {
        const modal = document.getElementById('aiSettingsModal');
        
        if (!modal) return;
        
        // Blur any focused element in the modal first
        const activeElement = document.activeElement;
        if (activeElement && modal.contains(activeElement)) {
            activeElement.blur();
        }
        
        // Remove the active class - CSS handles the rest
        modal.classList.remove('active');
        
        const testSection = document.getElementById('aiTestSection');
        const testResult = document.getElementById('testResult');
        
        if (testSection) testSection.style.display = 'none';
        if (testResult) testResult.classList.remove('active');
        
        // Force focus back to the chat input after modal closes
        // Multiple attempts to ensure focus is properly restored
        const chatInput = document.getElementById('aiInput');
        if (chatInput) {
            // Immediate focus attempt
            chatInput.focus();
            
            // Delayed focus attempt to handle any async issues
            setTimeout(() => {
                chatInput.focus();
            }, 10);
            
            // Final focus attempt after UI has settled
            setTimeout(() => {
                chatInput.focus();
                chatInput.select(); // Also select the text to make it obvious it's focused
            }, 100);
        }
    },
    
    showModeSettings(mode) {
        document.getElementById('localSettings').style.display = mode === 'local' ? 'block' : 'none';
        document.getElementById('apiSettings').style.display = mode === 'api' ? 'block' : 'none';
        document.getElementById('remoteSettings').style.display = mode === 'remote' ? 'block' : 'none';
        document.getElementById('aiTestSection').style.display = 'block';
    },
    
    populateSettingsForm() {
        // Set mode
        if (this.config.mode) {
            document.getElementById(`aiMode${this.config.mode.charAt(0).toUpperCase() + this.config.mode.slice(1)}`).checked = true;
            this.showModeSettings(this.config.mode);
        }
        
        // Local settings
        document.getElementById('localContextLength').value = this.config.local.contextLength;
        document.getElementById('localTemperature').value = this.config.local.temperature;
        document.getElementById('localTempValue').textContent = this.config.local.temperature;
        
        // API settings
        document.getElementById('apiProvider').value = this.config.api.provider;
        if (this.config.api.endpoint) document.getElementById('apiEndpoint').value = this.config.api.endpoint;
        if (this.config.api.apiKey) document.getElementById('apiKey').value = this.config.api.apiKey;
        document.getElementById('apiModel').value = this.config.api.model;
        document.getElementById('apiTemperature').value = this.config.api.temperature;
        document.getElementById('apiTempValue').textContent = this.config.api.temperature;
        document.getElementById('apiMaxTokens').value = this.config.api.maxTokens;
        
        // Remote settings
        if (this.config.remote.serverUrl) document.getElementById('remoteServerUrl').value = this.config.remote.serverUrl;
        document.getElementById('remoteEndpointPath').value = this.config.remote.endpointPath;
        document.getElementById('remoteRequiresAuth').checked = this.config.remote.requiresAuth;
        document.getElementById('remoteAuthSettings').style.display = this.config.remote.requiresAuth ? 'block' : 'none';
        document.getElementById('remoteAuthType').value = this.config.remote.authType;
        if (this.config.remote.authToken) document.getElementById('remoteAuthToken').value = this.config.remote.authToken;
        document.getElementById('remoteRequestFormat').value = this.config.remote.requestFormat;
    },
    
    saveSettings() {
        const mode = document.querySelector('input[name="aiMode"]:checked')?.value;
        
        if (!mode) {
            alert('Please select an AI mode.');
            return;
        }
        
        this.config.mode = mode;
        
        // Save mode-specific settings
        if (mode === 'local') {
            this.config.local.contextLength = parseInt(document.getElementById('localContextLength').value);
            this.config.local.temperature = parseFloat(document.getElementById('localTemperature').value);
            
            const modelSelect = document.getElementById('localModelSelect').value;
            if (!modelSelect) {
                alert('Please select a model.');
                return;
            }
            
            if (modelSelect === 'custom') {
                // Check if using Electron file picker or web file input
                if (isElectron && this.config.local.modelFile) {
                    this.config.local.modelPath = this.config.local.modelFile.path;
                } else {
                    const fileInput = document.getElementById('ggufFileInput');
                    if (fileInput.files.length === 0) {
                        alert('Please select a GGUF model file.');
                        return;
                    }
                    // File will be loaded when AI is initialized
                    this.config.local.modelPath = 'custom';
                }
            } else {
                // Store the actual model path from detected models
                this.config.local.modelPath = modelSelect;
            }
        } else if (mode === 'api') {
            this.config.api.provider = document.getElementById('apiProvider').value;
            this.config.api.apiKey = document.getElementById('apiKey').value;
            this.config.api.model = document.getElementById('apiModel').value;
            this.config.api.temperature = parseFloat(document.getElementById('apiTemperature').value);
            this.config.api.maxTokens = parseInt(document.getElementById('apiMaxTokens').value);
            
            if (this.config.api.provider === 'custom') {
                this.config.api.endpoint = document.getElementById('apiEndpoint').value;
                if (!this.config.api.endpoint) {
                    alert('Please enter an API endpoint.');
                    return;
                }
            } else {
                // Set default endpoints
                const endpoints = {
                    'openai': 'https://api.openai.com/v1/chat/completions',
                    'anthropic': 'https://api.anthropic.com/v1/messages',
                    'cohere': 'https://api.cohere.ai/v1/chat',
                    'google': 'https://generativelanguage.googleapis.com/v1beta/models',
                    'mistral': 'https://api.mistral.ai/v1/chat/completions'
                };
                this.config.api.endpoint = endpoints[this.config.api.provider];
            }
            
            if (!this.config.api.apiKey) {
                alert('Please enter an API key.');
                return;
            }
        } else if (mode === 'remote') {
            this.config.remote.serverUrl = document.getElementById('remoteServerUrl').value;
            this.config.remote.endpointPath = document.getElementById('remoteEndpointPath').value;
            this.config.remote.requiresAuth = document.getElementById('remoteRequiresAuth').checked;
            this.config.remote.authType = document.getElementById('remoteAuthType').value;
            this.config.remote.authToken = document.getElementById('remoteAuthToken').value;
            this.config.remote.requestFormat = document.getElementById('remoteRequestFormat').value;
            
            if (!this.config.remote.serverUrl) {
                alert('Please enter a server URL.');
                return;
            }
        }
        
        // Save to localStorage
        this.saveConfig();
        this.updateStatus();
        
        // Close the modal first
        this.closeSettings();
        
        // Show non-blocking success message after modal is closed
        this.showToast('✅ AI Configuration saved successfully!');
    },
    
    loadConfig() {
        try {
            const saved = localStorage.getItem(ProjectManager.getStorageKey('ai_config'));
            if (saved) {
                const config = JSON.parse(saved);
                this.config = { ...this.config, ...config };
            }
        } catch (error) {
            console.error('Error loading AI config:', error);
        }
    },
    
    saveConfig() {
        try {
            localStorage.setItem(ProjectManager.getStorageKey('ai_config'), JSON.stringify(this.config));
        } catch (error) {
            console.error('Error saving AI config:', error);
        }
    },
    
    updateStatus() {
        const statusText = document.getElementById('aiStatusText');
        const dot = document.querySelector('.status-dot');
        
        if (!this.config.mode) {
            statusText.textContent = 'Not Configured';
            dot.className = 'status-dot error';
        } else {
            const modes = {
                'local': '💻 Local Model',
                'api': '🔑 API Connected',
                'remote': '🌐 Remote Server'
            };
            statusText.textContent = modes[this.config.mode] || 'Ready';
            dot.className = 'status-dot';
        }
    },
    
    async testRemoteConnection() {
        const url = document.getElementById('remoteServerUrl').value;
        const path = document.getElementById('remoteEndpointPath').value;
        
        if (!url) {
            alert('Please enter a server URL.');
            return;
        }
        
        const testResult = document.getElementById('testResult');
        testResult.className = 'test-result active loading';
        testResult.textContent = '🔄 Testing connection...';
        
        try {
            const fullUrl = url + path;
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ test: true })
            });
            
            if (response.ok) {
                testResult.className = 'test-result active success';
                testResult.textContent = '✅ Connection successful!';
            } else {
                testResult.className = 'test-result active error';
                testResult.textContent = `❌ Connection failed: ${response.status} ${response.statusText}`;
            }
        } catch (error) {
            testResult.className = 'test-result active error';
            testResult.textContent = `❌ Connection error: ${error.message}`;
        }
    },
    
    async runConfigTest() {
        const mode = document.querySelector('input[name="aiMode"]:checked')?.value;
        if (!mode) {
            alert('Please select an AI mode first.');
            return;
        }
        
        const testPrompt = document.getElementById('testPrompt').value;
        const testResult = document.getElementById('testResult');
        
        testResult.className = 'test-result active loading';
        testResult.textContent = '🔄 Testing AI configuration...';
        
        try {
            // Temporarily save settings for test
            const tempConfig = { ...this.config };
            this.saveSettings();
            
            const response = await this.getAIResponse(testPrompt);
            
            testResult.className = 'test-result active success';
            testResult.innerHTML = `<strong>✅ Test successful!</strong><br><br><strong>Response:</strong><br>${this.formatMessage(response)}`;
        } catch (error) {
            testResult.className = 'test-result active error';
            testResult.innerHTML = `<strong>❌ Test failed!</strong><br><br>${error.message}`;
        }
    },
    
    showToast(message) {
        // Create toast notification element
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            z-index: 99999;
            font-size: 1rem;
            font-weight: 600;
            animation: fadeInOut 2s ease-in-out;
        `;
        toast.textContent = message;
        
        // Add animation keyframes if not already present
        if (!document.getElementById('toastAnimation')) {
            const style = document.createElement('style');
            style.id = 'toastAnimation';
            style.textContent = `
                @keyframes fadeInOut {
                    0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                    10%, 90% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        // Remove toast after animation
        setTimeout(() => {
            toast.remove();
        }, 2000);
    }
};

// ============================================
// Relationship Graph Visualization (REMOVED - Not working properly)
// ============================================
/* const RelationshipGraph = {
    canvas: null,
    ctx: null,
    nodes: [],
    edges: [],
    selectedNode: null,
    hoveredNode: null,
    draggedNode: null,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    panStart: null,
    nodeSize: 15,
    showLabels: true,
    physicsEnabled: true,
    animationFrame: null,
    
    typeColors: {
        'note': '#3b82f6',
        'class': '#8b5cf6',
        'mechanic': '#ec4899',
        'character': '#f59e0b',
        'location': '#10b981',
        'timeline': '#06b6d4',
        'conflict': '#ef4444',
        'theme': '#a855f7',
        'act': '#f97316',
        'scene': '#14b8a6'
    },
    
    visibleTypes: new Set(['note', 'class', 'mechanic', 'character', 'location', 'timeline', 'conflict', 'theme', 'act', 'scene']),
    
    init() {
        this.canvas = document.getElementById('relationshipGraph');
        if (!this.canvas) {
            console.warn('Relationship graph canvas not found');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        window.addEventListener('resize', () => {
            if (AppState.currentSection === 'graph') {
                this.resizeCanvas();
            }
        });
        
        // Controls
        document.getElementById('graphResetViewBtn')?.addEventListener('click', () => this.resetView());
        document.getElementById('graphExportBtn')?.addEventListener('click', () => this.exportAsImage());
        
        // Type filters
        ['Notes', 'Classes', 'Mechanics', 'Characters', 'Locations', 'Timeline', 'Conflicts', 'Themes', 'Acts', 'Scenes'].forEach((type, index) => {
            const typeKey = type.toLowerCase().slice(0, -1); // Remove 's' from plural
            const checkbox = document.getElementById(`graphShow${type}`);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.visibleTypes.add(typeKey);
                    } else {
                        this.visibleTypes.delete(typeKey);
                    }
                    this.buildGraph();
                    this.render();
                });
            }
        });
        
        // Settings
        document.getElementById('graphPhysicsEnabled')?.addEventListener('change', (e) => {
            this.physicsEnabled = e.target.checked;
            if (this.physicsEnabled) {
                this.startPhysics();
            } else {
                this.stopPhysics();
            }
        });
        
        document.getElementById('graphNodeSize')?.addEventListener('input', (e) => {
            this.nodeSize = parseInt(e.target.value);
            this.render();
        });
        
        document.getElementById('graphShowLabels')?.addEventListener('change', (e) => {
            this.showLabels = e.target.checked;
            this.render();
        });
        
        // Canvas interactions
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        // Build initial graph
        this.buildGraph();
        this.render();
    },
    
    resizeCanvas() {
        if (!this.canvas) return;
        const container = this.canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        if (width > 0 && height > 0) {
            this.canvas.width = width;
            this.canvas.height = height;
            console.log(`Graph canvas resized to ${width}x${height}`);
            this.render();
        } else {
            console.warn('Graph canvas has zero dimensions, waiting for section to be visible');
        }
    },
    
    buildGraph() {
        this.nodes = [];
        this.edges = [];
        
        // Get all items from RelationshipManager
        const allItems = RelationshipManager.getAllItems();
        console.log(`Building graph with ${allItems.length} total items`);
        
        // Filter by visible types
        const visibleItems = allItems.filter(item => this.visibleTypes.has(item.type));
        console.log(`Filtered to ${visibleItems.length} visible items`);
        
        // Create nodes
        visibleItems.forEach(item => {
            // Count connections
            const connections = (item.data.relatedItems || []).length + 
                              RelationshipManager.getReferencedBy(item.id).length;
            
            // Initialize position if not set or if canvas was resized
            const centerX = this.canvas.width > 0 ? this.canvas.width / 2 : 400;
            const centerY = this.canvas.height > 0 ? this.canvas.height / 2 : 300;
            
            if (!item.graphX || !item.graphY || item.graphX === 0 || item.graphY === 0) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 100 + Math.random() * 200;
                item.graphX = centerX + Math.cos(angle) * radius;
                item.graphY = centerY + Math.sin(angle) * radius;
                item.graphVx = 0;
                item.graphVy = 0;
            }
            
            this.nodes.push({
                id: item.id,
                type: item.type,
                name: item.name,
                x: item.graphX,
                y: item.graphY,
                vx: item.graphVx || 0,
                vy: item.graphVy || 0,
                connections: connections,
                data: item
            });
        });
        
        // Create edges (use a Set to avoid duplicates)
        const edgeSet = new Set();
        let edgeCount = 0;
        visibleItems.forEach(item => {
            // Check if item has relatedItems in its data object
            if (!item.data.relatedItems || !Array.isArray(item.data.relatedItems)) {
                return;
            }
            
            item.data.relatedItems.forEach(rel => {
                // Only create edge if target is also visible
                if (this.visibleTypes.has(rel.type)) {
                    // Create a unique key for this edge (sorted to avoid duplicates)
                    const edgeKey = [item.id, rel.id].sort().join('|');
                    if (!edgeSet.has(edgeKey)) {
                        edgeSet.add(edgeKey);
                        this.edges.push({
                            source: item.id,
                            target: rel.id
                        });
                        edgeCount++;
                    }
                }
            });
            
            // Also check for reverse references (items that reference this item)
            const referencedBy = RelationshipManager.getReferencedBy(item.id);
            referencedBy.forEach(ref => {
                // Only create edge if the referencing item is visible
                if (this.visibleTypes.has(ref.type)) {
                    // Create a unique key for this edge (sorted to avoid duplicates)
                    const edgeKey = [item.id, ref.id].sort().join('|');
                    if (!edgeSet.has(edgeKey)) {
                        edgeSet.add(edgeKey);
                        this.edges.push({
                            source: ref.id,
                            target: item.id
                        });
                        edgeCount++;
                    }
                }
            });
        });
        console.log('Total edges created:', edgeCount);
        
        // Update stats
        this.updateStats();
        
        // Start physics if enabled
        if (this.physicsEnabled) {
            this.startPhysics();
        }
    },
    
    updateStats() {
        const statsEl = document.getElementById('graphStats');
        if (statsEl) {
            statsEl.textContent = `Nodes: ${this.nodes.length} | Edges: ${this.edges.length}`;
        }
    },
    
    startPhysics() {
        if (this.animationFrame) return;
        
        const animate = () => {
            this.applyForces();
            this.render();
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    },
    
    stopPhysics() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    },
    
    applyForces() {
        // Use default center if canvas not ready
        const centerX = this.canvas.width > 0 ? this.canvas.width / 2 : 400;
        const centerY = this.canvas.height > 0 ? this.canvas.height / 2 : 300;
        const repulsionStrength = 2000;
        const attractionStrength = 0.001;
        const damping = 0.9;
        const centerAttraction = 0.001;
        
        // Reset forces
        this.nodes.forEach(node => {
            node.fx = 0;
            node.fy = 0;
        });
        
        // Repulsion between all nodes
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const node1 = this.nodes[i];
                const node2 = this.nodes[j];
                
                const dx = node2.x - node1.x;
                const dy = node2.y - node1.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                
                const force = repulsionStrength / (distance * distance);
                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;
                
                node1.fx -= fx;
                node1.fy -= fy;
                node2.fx += fx;
                node2.fy += fy;
            }
        }
        
        // Attraction along edges
        this.edges.forEach(edge => {
            const source = this.nodes.find(n => n.id === edge.source);
            const target = this.nodes.find(n => n.id === edge.target);
            
            if (!source || !target) return;
            
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            
            const force = distance * attractionStrength;
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;
            
            source.fx += fx;
            source.fy += fy;
            target.fx -= fx;
            target.fy -= fy;
        });
        
        // Apply center attraction and update positions
        this.nodes.forEach(node => {
            if (node === this.draggedNode) return;
            
            // Center attraction
            const dx = centerX - node.x;
            const dy = centerY - node.y;
            node.fx += dx * centerAttraction;
            node.fy += dy * centerAttraction;
            
            // Update velocity
            node.vx = (node.vx + node.fx) * damping;
            node.vy = (node.vy + node.fy) * damping;
            
            // Update position
            node.x += node.vx;
            node.y += node.vy;
            
            // Save to data
            if (node.data) {
                node.data.graphX = node.x;
                node.data.graphY = node.y;
                node.data.graphVx = node.vx;
                node.data.graphVy = node.vy;
            }
        });
    },
    
    render() {
        if (!this.ctx || !this.canvas) return;
        
        // Don't render if canvas has no dimensions
        if (this.canvas.width === 0 || this.canvas.height === 0) {
            return;
        }
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        
        // Apply zoom and pan
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);
        
        // Get connected nodes if something is selected
        const connectedNodeIds = new Set();
        if (this.selectedNode) {
            connectedNodeIds.add(this.selectedNode.id);
            this.edges.forEach(edge => {
                if (edge.source === this.selectedNode.id) {
                    connectedNodeIds.add(edge.target);
                }
                if (edge.target === this.selectedNode.id) {
                    connectedNodeIds.add(edge.source);
                }
            });
        }
        
        // Draw edges
        this.ctx.strokeStyle = '#e5e7eb';
        this.ctx.lineWidth = 1;
        this.edges.forEach(edge => {
            const source = this.nodes.find(n => n.id === edge.source);
            const target = this.nodes.find(n => n.id === edge.target);
            
            if (!source || !target) return;
            
            // Determine if this edge is connected to selected node
            const isConnectedToSelected = this.selectedNode && 
                (source.id === this.selectedNode.id || target.id === this.selectedNode.id);
            
            // Gray out edges not connected to selected node
            if (this.selectedNode && !isConnectedToSelected) {
                this.ctx.strokeStyle = '#d1d5db';
                this.ctx.lineWidth = 0.5;
                this.ctx.globalAlpha = 0.3;
            }
            // Highlight if connected to hovered node (when nothing selected)
            else if (!this.selectedNode && this.hoveredNode && (source.id === this.hoveredNode.id || target.id === this.hoveredNode.id)) {
                this.ctx.strokeStyle = '#f59e0b';
                this.ctx.lineWidth = 2;
                this.ctx.globalAlpha = 1;
            }
            // Highlight if connected to selected node
            else if (isConnectedToSelected) {
                this.ctx.strokeStyle = '#3b82f6';
                this.ctx.lineWidth = 3;
                this.ctx.globalAlpha = 1;
            }
            // Normal edges
            else {
                this.ctx.strokeStyle = '#e5e7eb';
                this.ctx.lineWidth = 1;
                this.ctx.globalAlpha = 1;
            }
            
            this.ctx.beginPath();
            this.ctx.moveTo(source.x, source.y);
            this.ctx.lineTo(target.x, target.y);
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
        });
        
        // Draw nodes
        this.nodes.forEach(node => {
            const size = this.nodeSize + (node.connections * 2);
            let color = this.typeColors[node.type] || '#6b7280';
            
            // Determine if this node is connected to selected node
            const isConnected = !this.selectedNode || connectedNodeIds.has(node.id);
            
            // Gray out unconnected nodes
            if (this.selectedNode && !isConnected) {
                // Convert to grayscale
                color = '#9ca3af';
                this.ctx.globalAlpha = 0.3;
            } else {
                this.ctx.globalAlpha = 1;
            }
            
            // Node circle
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Border for hovered/selected
            if (node === this.hoveredNode || node === this.selectedNode) {
                this.ctx.strokeStyle = node === this.selectedNode ? '#fbbf24' : '#ffffff';
                this.ctx.lineWidth = 4;
                this.ctx.globalAlpha = 1;
                this.ctx.stroke();
            }
            
            // Extra highlight ring for connected nodes when something is selected
            if (this.selectedNode && isConnected && node !== this.selectedNode) {
                this.ctx.strokeStyle = '#60a5fa';
                this.ctx.lineWidth = 2;
                this.ctx.globalAlpha = 0.8;
                this.ctx.stroke();
            }
            
            this.ctx.globalAlpha = 1;
            
            // Label
            if (this.showLabels) {
                if (this.selectedNode && !isConnected) {
                    this.ctx.fillStyle = '#9ca3af';
                    this.ctx.globalAlpha = 0.5;
                } else {
                    this.ctx.fillStyle = '#111827';
                    this.ctx.globalAlpha = 1;
                }
                this.ctx.font = '12px system-ui';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(node.name, node.x, node.y + size + 15);
                this.ctx.globalAlpha = 1;
            }
        });
        
        this.ctx.restore();
        
        // Update selection info display
        this.updateSelectionInfo();
    },
    
    updateSelectionInfo() {
        const infoEl = document.getElementById('graphSelectionInfo');
        if (!infoEl) return;
        
        if (this.selectedNode) {
            // Count connected nodes
            const connectedCount = this.edges.filter(edge => 
                edge.source === this.selectedNode.id || edge.target === this.selectedNode.id
            ).length;
            
            infoEl.innerHTML = `
                <strong>${this.selectedNode.name}</strong>
                <em>${this.selectedNode.type}</em> • ${connectedCount} connection(s)
                <small>Click empty space or the node again to deselect</small>
            `;
            infoEl.classList.add('active');
        } else {
            infoEl.classList.remove('active');
        }
    },
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - this.offsetX) / this.scale,
            y: (e.clientY - rect.top - this.offsetY) / this.scale
        };
    },
    
    getNodeAt(x, y) {
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];
            const size = this.nodeSize + (node.connections * 2);
            const dx = x - node.x;
            const dy = y - node.y;
            
            if (dx * dx + dy * dy <= size * size) {
                return node;
            }
        }
        return null;
    },
    
    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        const node = this.getNodeAt(pos.x, pos.y);
        
        if (node) {
            this.draggedNode = node;
        } else {
            this.panStart = { x: e.clientX, y: e.clientY };
        }
    },
    
    handleMouseMove(e) {
        const pos = this.getMousePos(e);
        
        if (this.draggedNode) {
            this.draggedNode.x = pos.x;
            this.draggedNode.y = pos.y;
            this.draggedNode.vx = 0;
            this.draggedNode.vy = 0;
            if (!this.physicsEnabled) this.requestRender();
        } else if (this.panStart) {
            const dx = e.clientX - this.panStart.x;
            const dy = e.clientY - this.panStart.y;
            this.offsetX += dx;
            this.offsetY += dy;
            this.panStart = { x: e.clientX, y: e.clientY };
            if (!this.physicsEnabled) this.requestRender();
        } else {
            // Update hovered node
            const node = this.getNodeAt(pos.x, pos.y);
            if (node !== this.hoveredNode) {
                this.hoveredNode = node;
                this.showTooltip(node, e);
                if (!this.physicsEnabled) this.requestRender();
            }
        }
    },
    
    requestRender() {
        if (!this.renderRequested) {
            this.renderRequested = true;
            requestAnimationFrame(() => {
                this.render();
                this.renderRequested = false;
            });
        }
    },
    
    handleMouseUp(e) {
        this.draggedNode = null;
        this.panStart = null;
    },
    
    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.scale *= delta;
        this.scale = Math.max(0.1, Math.min(5, this.scale));
        if (!this.physicsEnabled) this.render();
    },
    
    handleClick(e) {
        const pos = this.getMousePos(e);
        const node = this.getNodeAt(pos.x, pos.y);
        
        if (node) {
            // If clicking the same node, deselect it
            if (this.selectedNode === node) {
                this.selectedNode = null;
            } else {
                this.selectedNode = node;
            }
            if (!this.physicsEnabled) this.render();
        } else {
            // Clicked empty space - deselect
            if (this.selectedNode) {
                this.selectedNode = null;
                if (!this.physicsEnabled) this.render();
            }
        }
    },
    
    showTooltip(node, e) {
        const tooltip = document.getElementById('graphTooltip');
        if (!tooltip) return;
        
        if (node) {
            let html = `
                <strong>${node.name}</strong><br>
                <em>${node.type}</em><br>
                ${node.connections} connection(s)
            `;
            
            // Add hint about clicking
            if (this.selectedNode === node) {
                html += '<br><small style="color: #fbbf24;">Click again to deselect</small>';
            } else {
                html += '<br><small style="color: #9ca3af;">Click to select and navigate</small>';
            }
            
            tooltip.innerHTML = html;
            tooltip.style.left = e.clientX + 10 + 'px';
            tooltip.style.top = e.clientY + 10 + 'px';
            tooltip.style.display = 'block';
        } else {
            tooltip.style.display = 'none';
        }
    },
    
    resetView() {
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.selectedNode = null;
        this.hoveredNode = null;
        this.buildGraph();
        this.render();
    },
    
    exportAsImage() {
        const link = document.createElement('a');
        link.download = 'relationship-graph.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }
}; */

// ============================================
// Application Initialization
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize IndexedDB first
    try {
        await FileStorage.init();
        console.log('File storage ready');
    } catch (error) {
        console.error('Error initializing file storage:', error);
    }
    
    // Initialize Project Management FIRST (before AppState)
    ProjectManager.init();
    
    // Initialize state (now that ProjectManager is ready)
    AppState.init();
    
    // Clean up any orphaned relationships on startup
    RelationshipManager.cleanupOrphanedRelationships();
    
    // Initialize components
    Navigation.init();
    Modal.init();
    TaskManager.init();
    AssetTracker.init();
    MilestonePlanner.init();
    NotesManager.init();
    ClassesManager.init();
    MechanicsManager.init();
    StoryManager.init();
    // StoryMap.init(); // DISABLED - Story Map feature commented out
    Search.init();
    // RelationshipFilter.init(); // REMOVED
    DataManager.init();
    TemplateManager.init();
    Dashboard.init();
    Dashboard.refresh();
    UtilityToolbox.init();
    
    // Initialize utility tools
    QuickNotes.init();
    AIAssistant.init();
    
    // Check for reminders on load
    NotesManager.checkReminders();
    
    // Check reminders every minute
    setInterval(() => {
        NotesManager.checkReminders();
    }, 60000);
    
    // Project selector change handler
    document.getElementById('projectSelector').addEventListener('change', (e) => {
        ProjectManager.switchProject(e.target.value);
    });
    
    // Project menu button
    document.getElementById('projectMenuBtn').addEventListener('click', () => {
        const modal = document.getElementById('projectModal');
        modal.classList.add('active');
        
        // Populate project name input
        const currentProject = ProjectManager.getCurrentProject();
        document.getElementById('projectNameInput').value = currentProject?.name || '';
        
        // Populate project list
        const listContainer = document.getElementById('projectList');
        listContainer.innerHTML = ProjectManager.projects.map(p => {
            const date = new Date(p.lastModified).toLocaleDateString();
            const isCurrent = p.id === ProjectManager.currentProjectId;
            return `
                <div class="project-list-item ${isCurrent ? 'current' : ''}" data-project-id="${p.id}">
                    <div class="project-list-item-info">
                        <div class="project-list-item-name">${p.name} ${isCurrent ? '(Current)' : ''}</div>
                        <div class="project-list-item-date">Last modified: ${date}</div>
                    </div>
                    ${!isCurrent ? `<button class="btn btn-sm btn-secondary" onclick="ProjectManager.switchProject('${p.id}')">Switch</button>` : ''}
                </div>
            `;
        }).join('');
    });
    
    // Close project modal
    document.getElementById('projectModalClose').addEventListener('click', () => {
        document.getElementById('projectModal').classList.remove('active');
    });
    
    // Close modal on background click
    document.getElementById('projectModal').addEventListener('click', (e) => {
        if (e.target.id === 'projectModal') {
            document.getElementById('projectModal').classList.remove('active');
        }
    });
    
    // New project button
    document.getElementById('newProjectBtn').addEventListener('click', () => {
        Utils.showPrompt('Enter project name:', 'New Project', (name) => {
            ProjectManager.createProject(name);
        });
    });
    
    // Rename project button
    document.getElementById('renameProjectBtn').addEventListener('click', () => {
        const newName = document.getElementById('projectNameInput').value.trim();
        if (newName) {
            ProjectManager.renameProject(ProjectManager.currentProjectId, newName);
            document.getElementById('projectModal').classList.remove('active');
        }
    });
    
    // Delete current project button
    document.getElementById('deleteProjectBtn').addEventListener('click', () => {
        ProjectManager.deleteProject(ProjectManager.currentProjectId);
    });
    
    // Delete all projects button
    document.getElementById('deleteAllProjectsBtn').addEventListener('click', () => {
        ProjectManager.deleteAllProjects();
    });
    
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
        AppState.toggleTheme();
    });
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    // Initialize Relationship Graph (REMOVED)
    // RelationshipGraph.init();
    
    // Override global alert() and confirm() to prevent focus issues
    // Store original functions
    window._originalAlert = window.alert;
    window._originalConfirm = window.confirm;
    
    // Replace with non-blocking versions
    window.alert = function(message) {
        Utils.showToast(message, 'info');
    };
    
    window.confirm = function(message) {
        console.warn('⚠️ Legacy confirm() called. Use Utils.showConfirm() for better UX.');
        console.warn('Message:', message);
        // For safety, still allow the original confirm as fallback
        return window._originalConfirm(message);
    };
    
    // Emergency modal fix: Ctrl+Shift+Escape force closes any stuck modals
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'Escape') {
            e.preventDefault();
            Modal.forceClose();
            Utils.showNotification('Modal force-closed', 'info');
        }
    });
    
    console.log('🎮 Forgeon initialized successfully!');
});
