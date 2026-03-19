import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import './Sidebar.css';

const NAV_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: '/icons/navigation/dashboard.svg' },
  { id: 'tasks', label: 'Tasks', icon: '/icons/navigation/tasks.svg' },
  { id: 'assets', label: 'Assets', icon: '/icons/navigation/assets.svg' },
  { id: 'milestones', label: 'Milestones', icon: '/icons/navigation/milestones.svg' },
  { id: 'classes', label: 'Classes', icon: '/icons/navigation/classes.svg' },
  { id: 'mechanics', label: 'Mechanics', icon: '/icons/navigation/mechanics.svg' },
  { id: 'story', label: 'Story', icon: '/icons/navigation/story.svg' },
  { id: 'notes', label: 'Notes', icon: '/icons/navigation/notes.svg' },
];

export default function Sidebar() {
  const {
    currentSection,
    setSection,
    theme,
    toggleTheme,
    projects,
    currentProjectId,
    switchProject,
    createProject,
    renameProject,
    deleteProject,
    deleteAllProjects,
  } = useApp();

  const { showToast, showPrompt, showConfirm } = useToast();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleNewProject = () => {
    setDropdownOpen(false);
    showPrompt('Enter project name:', 'Untitled Project', (name) => {
      createProject(name);
      showToast('Project created!', 'success');
    });
  };

  const handleRenameProject = () => {
    setDropdownOpen(false);
    const current = projects.find((p) => p.id === currentProjectId);
    showPrompt('Enter new project name:', current?.name || '', (name) => {
      renameProject(currentProjectId, name);
      showToast('Project renamed!', 'success');
    });
  };

  const handleDeleteProject = () => {
    setDropdownOpen(false);
    if (projects.length <= 1) {
      showToast('Cannot delete the only project', 'warning');
      return;
    }
    showConfirm('Are you sure you want to delete this project? This cannot be undone.', () => {
      deleteProject(currentProjectId);
      showToast('Project deleted', 'success');
    });
  };

  const handleDeleteAllProjects = () => {
    setDropdownOpen(false);
    showConfirm(
      'Are you sure you want to delete ALL projects? This cannot be undone.',
      () => {
        deleteAllProjects();
        showToast('All projects deleted', 'success');
      }
    );
  };

  const themeIcon = theme === 'light' ? '/icons/theme/moon.svg' : '/icons/theme/sun.svg';

  return (
    <aside className="sidebar" role="navigation" aria-label="Main navigation">
      <div className="sidebar-header">
        <img
          src="/icons/application/forgeon-banner.png"
          alt="Forgeon"
          className="app-logo"
        />
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
        >
          <img src={themeIcon} alt="" className="theme-icon" width="24" height="24" />
        </button>
      </div>

      {/* Project Selector */}
      <div className="project-selector-container">
        <select
          className="project-selector"
          value={currentProjectId}
          onChange={(e) => switchProject(e.target.value)}
          aria-label="Select project"
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <div className="project-menu-wrapper" ref={dropdownRef}>
          <button
            className="project-menu-btn"
            onClick={() => setDropdownOpen((prev) => !prev)}
            title="Project Menu"
          >
            <img src="/icons/navigation/settings.svg" alt="" width="20" height="20" />
          </button>
          {dropdownOpen && (
            <div className="project-dropdown">
              <button onClick={handleNewProject}>New Project</button>
              <button onClick={handleRenameProject}>Rename Project</button>
              <button onClick={handleDeleteProject}>Delete Project</button>
              <button className="danger" onClick={handleDeleteAllProjects}>
                Delete All Projects
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="nav-menu">
        <ul className="nav-list">
          {NAV_SECTIONS.map((section) => (
            <li key={section.id}>
              <button
                className={`nav-item${currentSection === section.id ? ' active' : ''}`}
                onClick={() => setSection(section.id)}
                aria-current={currentSection === section.id ? 'page' : undefined}
              >
                <img
                  src={section.icon}
                  alt=""
                  className="nav-icon"
                  width="20"
                  height="20"
                />
                <span className="nav-text">{section.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
