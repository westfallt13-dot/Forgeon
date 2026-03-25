# Forgeon

A comprehensive game development project management tool designed to help organize and track all aspects of game creation.

## Features

### 📊 Dashboard
- Real-time statistics overview
- Quick access to tasks, assets, milestones, and notes
- Visual progress tracking

### ✅ Task Management
- Create and organize tasks with priorities
- Track task status (To Do, In Progress, Completed)
- Set deadlines and monitor progress

### 🎨 Asset Tracker
- Store and organize game assets (images, audio, video, documents, scripts)
- Preview support for multiple file types
- Categorize assets by type (Art, Audio, Code, Design, etc.)
- Document/script zoom controls for better readability

### 🎯 Milestone Planner
- Define project milestones and deliverables
- Track completion progress
- Set target dates for goals

### 🎭 Classes Manager
- Define character classes and types
- Document abilities, stats, and characteristics
- Organize game mechanics by class

### ⚙️ Mechanics Manager
- Document game mechanics and systems
- Define rules and gameplay elements
- Track implementation status

### 📖 Story Manager
- Organize story into acts and scenes
- Write and manage narrative content
- Track story progression

### 📝 Notes
- Quick note-taking for ideas and reminders
- Searchable note library
- Color-coded organization

## Data Management

### Export & Import
- Export all project data as a ZIP backup
- Import previously exported projects
- Includes all data: tasks, assets, milestones, classes, mechanics, story, and notes
- Preserves file attachments and complete project structure

### Local Storage
- All data stored locally in your browser
- IndexedDB for file storage
- LocalStorage for application state
- No server required - works completely offline

## Theme Support

Toggle between light and dark modes for comfortable viewing in any environment.

## Getting Started

1. Install the build prerequisites (see **Building from Source** above)
2. Build the application: `cmake -B build && cmake --build build`
3. Run: `./build/forgeon`
4. Start creating your game development project
5. Use the navigation menu to access different sections
6. Export your work regularly to create backups

## Technologies Used

- **C++17** - Native desktop application shell (GTK3 + WebKit2GTK)
- **CMake** - Build system
- **HTML5** - UI structure and markup
- **CSS3** - Styling and animations
- **Vanilla JavaScript** - Application logic
- **IndexedDB** - File storage
- **LocalStorage** - Application state
- **JSZip** - Export/import functionality

## Building from Source

### Prerequisites

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install build-essential cmake pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev
```
> **Note:** On older distributions use `libwebkit2gtk-4.0-dev` and change `webkit2gtk-4.1` to `webkit2gtk-4.0` in `CMakeLists.txt`.

**Linux (Fedora):**
```bash
sudo dnf install gcc-c++ cmake pkgconfig gtk3-devel webkit2gtk4.1-devel
```

**Linux (Arch):**
```bash
sudo pacman -S base-devel cmake gtk3 webkit2gtk-4.1
```

### Build

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

### Run

```bash
./build/forgeon
```

### Install (optional)

```bash
sudo cmake --install build --prefix /usr/local
```

## Browser Mode

The application can also be opened directly in a modern web browser by loading
`index.html`. Browser mode supports the same features but uses browser-native
file dialogs instead of the native GTK dialogs provided by the C++ shell.

Works best in modern browsers with support for:
- ES6+ JavaScript
- IndexedDB
- LocalStorage
- CSS Grid and Flexbox

## Development

### Project Structure
```
Forgeon/
├── CMakeLists.txt      # C++ build configuration
├── src/
│   └── main.cpp        # Native application entry point (GTK3 + WebKit2GTK)
├── index.html          # Main application UI
├── script.js           # Application logic
├── style.css           # Styles and theming
└── icons/              # SVG icon library
    ├── actions/        # Action icons
    ├── application/    # App branding
    ├── asset/          # Asset type icons
    ├── misc/           # Miscellaneous icons
    ├── navigation/     # Navigation icons
    ├── status/         # Status indicators
    ├── story/          # Story-related icons
    └── theme/          # Theme toggle icons
```

## License

Copyright (c) 2025 Thomas Westfall. All Rights Reserved.

This is proprietary software. See the [LICENSE](LICENSE) file for full terms and conditions.

**Users MAY:**
- Use for personal, commercial, and non-commercial projects

**Users MAY NOT:**
- Redistribute, sell, or sublicense the software
- Modify or create derivative works for distribution

## Support

For issues, questions, or feature requests:
- **Email**: westfallt13@gmail.com
- **GitHub Issues**: https://github.com/beachfall/Forgeon/issues

---

**Forgeon** - Forge your game development journey

Copyright (c) 2025 Thomas Westfall. All Rights Reserved.
