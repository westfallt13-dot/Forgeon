/**
 * localStorage persistence layer ported from the original Forgeon app.
 * All project data is namespaced by project ID to support multiple projects.
 */

const PROJECTS_KEY = 'forgeon_projects';
const CURRENT_PROJECT_KEY = 'forgeon_currentProject';

/**
 * Generates a namespaced localStorage key for a given project
 * @param {string} projectId - The project ID
 * @param {string} key - The data key
 * @returns {string} Namespaced key: `forgeon_project_{projectId}_{key}`
 */
export function getStorageKey(projectId, key) {
  return `forgeon_project_${projectId}_${key}`;
}

/**
 * Persists application state to localStorage for a specific project
 * @param {string} projectId - The project ID
 * @param {Object} state - The state object to persist
 */
export function saveState(projectId, state) {
  const storageKey = getStorageKey(projectId, 'state');
  const stateToSave = {
    tasks: state.tasks,
    assets: state.assets,
    milestones: state.milestones,
    notes: state.notes,
    noteCategories: state.noteCategories,
    theme: state.theme,
    classes: state.classes,
    mechanics: state.mechanics,
    story: state.story,
  };
  localStorage.setItem(storageKey, JSON.stringify(stateToSave));
}

/**
 * Loads application state from localStorage for a specific project
 * @param {string} projectId - The project ID
 * @returns {Object|null} The parsed state object, or null if not found
 */
export function loadState(projectId) {
  const storageKey = getStorageKey(projectId, 'state');
  const savedState = localStorage.getItem(storageKey);
  if (!savedState) return null;
  try {
    return JSON.parse(savedState);
  } catch (e) {
    console.error('Error loading saved state:', e);
    return null;
  }
}

/**
 * Removes all state data for a project from localStorage
 * @param {string} projectId - The project ID to remove
 */
export function removeProjectState(projectId) {
  localStorage.removeItem(getStorageKey(projectId, 'state'));
}

/**
 * Loads the project list from localStorage
 * @returns {Array} Array of project objects
 */
export function getProjects() {
  const saved = localStorage.getItem(PROJECTS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Saves the project list to localStorage
 * @param {Array} projects - Array of project objects
 */
export function saveProjects(projects) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

/**
 * Gets the currently active project ID from localStorage
 * @returns {string|null} The current project ID or null
 */
export function getCurrentProjectId() {
  return localStorage.getItem(CURRENT_PROJECT_KEY);
}

/**
 * Sets the currently active project ID in localStorage
 * @param {string} id - The project ID to set as current
 */
export function setCurrentProjectId(id) {
  localStorage.setItem(CURRENT_PROJECT_KEY, id);
}
