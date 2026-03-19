import { AppProvider, useApp } from './context/AppContext';
import { ModalProvider } from './context/ModalContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/Sidebar/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
import Tasks from './components/Tasks/Tasks';
import Assets from './components/Assets/Assets';
import Modal from './components/Modal/Modal';
import Toast from './components/Toast/Toast';
import './App.css';

const SECTION_LABELS = {
  dashboard: 'Dashboard',
  tasks: 'Tasks',
  assets: 'Assets',
  milestones: 'Milestones',
  classes: 'Classes',
  mechanics: 'Mechanics',
  story: 'Story',
  notes: 'Notes',
};

function AppContent() {
  const { currentSection } = useApp();

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content" role="main">
        <section className="content-section active">
          <header className="section-header">
            <div>
              <h2>{SECTION_LABELS[currentSection] || currentSection}</h2>
              <p className="section-description">
                {currentSection === 'dashboard' && 'Overview of your game development project'}
                {currentSection === 'tasks' && 'Manage your development tasks'}
                {currentSection === 'assets' && 'Track your game assets'}
                {currentSection === 'milestones' && 'Set and track project milestones'}
                {currentSection === 'classes' && 'Define your game classes'}
                {currentSection === 'mechanics' && 'Design game mechanics'}
                {currentSection === 'story' && 'Build your game narrative'}
                {currentSection === 'notes' && 'Capture your ideas and notes'}
              </p>
            </div>
          </header>
          {currentSection === 'dashboard' && <Dashboard />}
          {currentSection === 'tasks' && <Tasks />}
          {currentSection === 'assets' && <Assets />}
          {!['dashboard', 'tasks', 'assets'].includes(currentSection) && (
            <div className="section-placeholder">
              <p>The {SECTION_LABELS[currentSection] || currentSection} section is coming soon.</p>
            </div>
          )}
        </section>
      </main>
      <Modal />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ModalProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ModalProvider>
    </AppProvider>
  );
}
