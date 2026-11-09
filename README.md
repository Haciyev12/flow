# Flow — Your Personal macOS Productivity Launcher

**Flow** is a desktop productivity and automation application built for macOS. It brings applications, projects, files, folders, websites, and custom workflows together in one place.

Instead of manually opening everything you need whenever you switch between activities, Flow lets you organize your resources into **Workspaces** and launch them together with a single action.

Whether you're coding, studying, teaching, or working on a personal project, Flow helps you get everything ready and start working faster.

---

## ✨ Why Flow?

A typical workflow often involves opening multiple applications, finding the right project folder, locating documents, opening websites, and arranging everything before you can actually start working.

Flow aims to simplify this process.

Create a workspace once, add everything you need, and launch your entire workflow whenever you want.

For example:

- **Coding Workspace:** VS Code, your development project, Terminal, and GitHub.
- **Study Workspace:** University websites, lecture PDFs, study materials, and Word.
- **Teaching Workspace:** Google Meet, VJudge, Miro, and other teaching resources.
- **Personal Workspace:** Your frequently used applications, websites, and files.

Everything is organized and accessible through one application.

## 🚀 Features

### 1. Universal Library

The Library is the central place where you manage your resources.

You can register and organize:

- **Applications:** VS Code, Brave, Spotify, Terminal, and other installed applications.
- **Projects:** Development projects and their associated folders.
- **Files:** PDFs, Word documents, Excel spreadsheets, images, and other supported file types.
- **Folders:** Frequently accessed directories.
- **Websites:** URLs you use regularly.

Flow uses your macOS environment to open files with their associated applications.

### 2. Workspaces

Workspaces let you group different Library items based on your activities.

For example, a Coding Workspace might contain:
- Visual Studio Code
- A specific programming project
- Terminal
- GitHub

You can create, edit, delete, and customize workspaces, add existing Library items, and organize their order.

Workspaces reference Library items instead of duplicating their information.

### 3. Workspace Automation

Start an entire workflow with one click.

Flow executes the actions configured in a workspace, opening applications, projects, files, folders, and websites.

The automation engine provides execution feedback so you can see which actions succeed or fail.

### 4. Global Command Palette

Access Flow without navigating through the main application.

Use a global keyboard shortcut to open the command palette and quickly search for:

- Applications
- Projects
- Files
- Folders
- Websites
- Workspaces

Select an item to open it or launch a complete workspace.

The goal is to make Flow accessible through a fast, keyboard-driven experience.

### 5. Personalization

Flow includes settings for customizing the application and its behavior, including appearance, keyboard shortcuts, and workspace preferences.

### 6. Local-First Approach

Flow is designed as a personal desktop application.

Your Library and workspace configuration are stored locally, without requiring a cloud account or remote database for normal usage.

---

## 🛠️ Technology Stack

Flow is built using modern web technologies combined with native desktop capabilities.

| Technology | Purpose |
|---|---|
| [Tauri 2](https://v2.tauri.app/) | Native desktop application framework |
| [React](https://react.dev/) | User interface |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe application development |
| [Vite](https://vite.dev/) | Frontend development and build tooling |
| [Tailwind CSS](https://tailwindcss.com/) | UI styling |
| [Rust](https://www.rust-lang.org/) | Native functionality and system integration |
| [Lucide](https://lucide.dev/) | Icons |

### Why Tauri?

Tauri allows Flow to combine a modern React interface with native system functionality through Rust.

This makes it possible to build a lightweight desktop application that can interact with the operating system, manage application launching, and provide native desktop features.

---

## 💻 Getting Started

### Requirements

- macOS
- Node.js and npm
- Rust and Cargo
- Tauri 2 development prerequisites

For detailed environment setup, see the [Tauri prerequisites documentation](https://v2.tauri.app/start/prerequisites/).

### Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/flow.git
```

Navigate to the project directory:

```bash
cd flow
```

Install dependencies:

```bash
npm install
```

Start the development application:

```bash
npm run tauri dev
```

### Production Build

To generate a production macOS application bundle:

```bash
npm run tauri build
```

The generated application bundles can be found inside:

```text
src-tauri/target/release/bundle/
```

---

## 🗂️ Project Architecture

Flow is organized around three main concepts:

**Library → Workspaces → Automation**

```text
Flow
│
├── Library
│   ├── Applications
│   ├── Projects
│   ├── Files
│   ├── Folders
│   └── Websites
│
├── Workspaces
│   ├── Coding
│   ├── Study
│   ├── Teaching
│   └── Personal
│
├── Automation Engine
│   ├── Application Launcher
│   ├── File & Folder Opener
│   ├── Website Launcher
│   └── Workspace Execution
│
├── Command Palette
│   └── Global Search & Actions
│
└── Settings
    ├── Appearance
    ├── Keyboard Shortcuts
    └── Preferences
```

The Library stores resources, Workspaces organize references to those resources, and the Automation Engine executes the configured actions.

This separation keeps the application organized and makes it easier to extend in the future.

---

## 🎯 Project Goals

Flow is an ongoing personal project focused on improving everyday productivity on macOS.

Its main goals are:

- Reduce repetitive actions when switching between tasks.
- Make frequently used resources easier to access.
- Automate repetitive workspace setup.
- Provide a fast keyboard-driven experience.
- Maintain a clean, intuitive, and native-feeling desktop interface.
- Keep personal configuration and data local by default.

## 🛣️ Future Development

Some areas planned for further improvement include:

- Deeper macOS menu bar integration.
- Launch at login and background operation.
- More advanced browser window and profile management.
- Improved workspace execution and session management.
- Drag-and-drop resource management.
- Workspace templates and duplication.
- Better activity history and execution logs.
- Additional personalization options.

## 📌 Project Status

Flow is under active development. Its core Library, Workspace, automation, and command palette functionality form the foundation of the application. Further improvements to native macOS integration, reliability, and usability are ongoing.

## 👨‍💻 Author

Developed as a personal project to explore desktop application development, macOS automation, and productivity tools.

---

**Flow — Set up your workspace. Focus on what matters.**