# Devnest

Devnest is a full-featured browser-based IDE inspired by VS Code and Google Antigravity IDE, featuring:
- **Cloud-first Storage & Backend API**: Node.js / Express backend with Supabase Storage integration.
- **Local-first Offline Persistence**: Native browser IndexedDB (`devnest-db`) with instant offline editing and explicit cloud synchronization.
- **Standalone Local Agent**: Standalone Node.js loopback daemon (`127.0.0.1:4317`) for workspace isolation, child process execution, and live dev server preview.
- **VS Code IDE Interface**: Full-viewport desktop layout with Top Menu Bar, Activity Bar, File Explorer, Monaco Editor tabs with minimap, integrated Terminal, and AI Assistant panel.

---

## Project Structure

```text
Devnest/
├── frontend/           # React + Tailwind CSS + Monaco Editor frontend application
├── backend/            # Express REST API for projects, files, and Supabase integration
├── local-agent/        # Standalone Node.js agent for local workspace and process execution
├── test/               # Consolidated test suites
│   ├── frontend/       # Frontend, Monaco, IndexedDB, and client integration tests
│   ├── backend/        # Backend API, file CRUD, and storage tests
│   ├── local-agent/    # Local agent loopback and process execution tests
│   └── README.md       # Detailed test suite documentation
├── package.json        # Root package scripts for testing, building, and running
└── README.md           # This document
```

---

## Quick Start

### 1. Starting the Application Services

```bash
# Start backend API (defaults to http://127.0.0.1:5000)
npm run start:backend

# Start local agent daemon (defaults to http://127.0.0.1:4317)
npm run start:local-agent

# Start frontend dev server (defaults to http://localhost:5173)
npm run dev:frontend

# Build frontend for production
npm run build:frontend
```

---

## Running Test Suites

All tests are centralized in the `test/` directory and can be executed directly from the project root:

### Run All Tests
```bash
npm test
```

### Run by Subsystem
```bash
# Run backend tests (Milestone 5)
npm run test:backend

# Run local agent tests (Milestones 10 & 11)
npm run test:local-agent

# Run all frontend tests (Milestones 6, 7, 8, 9, 12, 13, IndexedDB, Managed Workspace)
npm run test:frontend
```

### Run Individual Milestone Tests
```bash
npm run test:m5                   # Milestone 5: Backend File CRUD & Storage
npm run test:m6                   # Milestone 6: Frontend Auth & API Client
npm run test:m7                   # Milestone 7: Project Management & Dashboard
npm run test:m8                   # Milestone 8: File Explorer & Tabs Lifecycle
npm run test:m9                   # Milestone 9: Monaco Editor Integration
npm run test:m10                  # Milestone 10: Local Agent Foundation
npm run test:m11                  # Milestone 11: Local Project Execution
npm run test:m12                  # Milestone 12: Local Agent Client & Controls
npm run test:m13                  # Milestone 13: Cloud-to-Local Synchronization
npm run test:managed-workspace    # Devnest-Managed Workspace Security
npm run test:indexeddb            # IndexedDB Local-First Persistence
```

For more details on test configurations, see [test/README.md](file:///c:/Users/ombar/OneDrive/Documents/Devnest/test/README.md).

