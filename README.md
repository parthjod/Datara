# Datara — Student Data Query & Admin Management System

A pair of high-performance Next.js 14 applications built for MIT World Peace University (MIT-WPU):
1. **Teacher Dashboard** (`/teacher`): AI-powered natural language student querying, live permission enforcement, and CSV/PDF export.
2. **Admin Dashboard** (`/admin`): Interactive faculty management portal for allocating cohort panel permissions (A–K), academic years, departments, and activating/deactivating faculty accounts.

Both applications share the same client-side `localStorage` key (`dq_teacher_permissions`) to achieve instant real-time synchronization when operated on the same origin.

---

## Architecture Overview

```
Datara/
├── teacher/                     # Next.js 14 Teacher Dashboard (Port 3000)
│   ├── app/
│   │   ├── dashboard/           # Protected query dashboard
│   │   ├── login/               # Teacher login
│   │   ├── globals.css          # Design tokens & typography
│   │   └── layout.tsx           # Font loading (UnifrakturCook, Instrument Serif, Instrument Sans)
│   ├── components/              # Topbar, HowItWorks, QueryBox, ResultsTable, ExportModal, Toast
│   ├── lib/                     # students.ts (660 student generator), parser.ts, export.ts, auth.ts, permissions.ts
│   └── types/                   # TypeScript interfaces
│
├── admin/                       # Next.js 14 Admin Dashboard (Port 3001)
│   ├── app/
│   │   ├── admin/               # Protected administration console
│   │   ├── login/               # Admin login
│   │   ├── globals.css          # Shared design system tokens
│   │   └── layout.tsx           # Font loading
│   ├── components/              # Topbar, TeacherSidebar, TeacherDetail, PanelChips, ToggleSwitch, AddTeacherModal, Toast
│   ├── lib/                     # permissions.ts (shared schema & sync logic), auth.ts
│   └── types/                   # TypeScript interfaces
│
├── prompt1.md                   # Specification: Teacher Dashboard
└── prompt2.md                   # Specification: Admin Dashboard
```

---

## Default Credentials

### Teacher Portal
- **URL**: `http://localhost:3000/login`
- **Email**: `teacher@mitwpu.edu.in`
- **Password**: `teacher123`
- **Initial Panels**: `D`, `J` (TY CSE)

### Admin Portal
- **URL**: `http://localhost:3001/login`
- **Email**: `admin@mitwpu.edu.in`
- **Password**: `admin`

---

## Setup & Running Locally

### 1. Install Dependencies
Run the installation scripts:
```bash
# In the root Datara directory:
npm run install:all
```
Or individually:
```bash
cd teacher && npm install
cd ../admin && npm install
```

### 2. Configure Environment Variables
- `teacher/.env.local`:
  - `NEXT_PUBLIC_TEACHER_EMAIL`: `teacher@mitwpu.edu.in`
  - `NEXT_PUBLIC_TEACHER_PASSWORD`: `teacher123`
  - `NEXT_PUBLIC_APP_NAME`: `Datara`
  - `NEXT_PUBLIC_INSTITUTE_DOMAIN`: `mitwpu.edu.in`
  - `NEXT_PUBLIC_PERMISSIONS_STORAGE_KEY`: `dq_teacher_permissions`

- `admin/.env.local`:
  - `NEXT_PUBLIC_ADMIN_EMAIL`: `admin@mitwpu.edu.in`
  - `NEXT_PUBLIC_ADMIN_PASSWORD`: `admin`
  - `NEXT_PUBLIC_PERMISSIONS_STORAGE_KEY`: `dq_teacher_permissions`
  - `NEXT_PUBLIC_APP_NAME`: `Datara`
  - `NEXT_PUBLIC_INSTITUTE_DOMAIN`: `mitwpu.edu.in`

### 3. Start Development Servers
Open two terminals or run from root:

**Terminal 1 (Teacher App):**
```bash
npm run dev:teacher
# Runs on http://localhost:3000
```

**Terminal 2 (Admin App):**
```bash
npm run dev:admin
# Runs on http://localhost:3001
```

---

## Dynamic Permissions & Sync Mechanism
- Both applications interact with `localStorage.getItem("dq_teacher_permissions")` and `localStorage.setItem("dq_teacher_permissions", ...)`.
- Any updates made in the Admin Dashboard (panel assignment, year/department access, account enable/disable) persist instantly.
- When the teacher submits a natural language query in the Teacher Dashboard, it reads the latest permissions from storage on the fly.
