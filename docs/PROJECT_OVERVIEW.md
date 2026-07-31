# CampusConnect — Project Overview

CampusConnect is a college collaboration application for class groups. It gives students and staff one place for group chat, announcements, file sharing, attendance, and controlled student imports. Its central model is a `Group` representing a branch/year class such as `IT-SY`.

## Users and features

- **Students** log in with roll number and password, access their own groups, chat, see announcements/files, download authorized files, view their own attendance, and change password.
- **Teachers** are the staff role represented by the current Prisma schema. They can work only in groups they can access, manage announcements, update attendance for students in shared groups, import students, and delete files they uploaded.
- **Admins** have global group access in backend permission helpers and can create groups, manage announcements/files, update attendance, and import students.

Implemented user-facing features include group search/selection, authenticated realtime chat and typing/presence indicators, message deletion, announcements, file attachments, protected downloads, attendance, CSV/XLSX student import, password changes, and responsive React UI panels.

## Technology stack

| Layer | Current implementation |
| --- | --- |
| Frontend | React 19, Vite, React Router, Axios, Socket.IO Client, Lucide React; styling is authored in JSX/CSS with Tailwind-style utility classes |
| Backend | Node.js, Express 5, Socket.IO, JWT, bcrypt, Multer, XLSX |
| Database | PostgreSQL through Prisma (`backend/prisma/schema.prisma`) |
| Realtime | Socket.IO group rooms on the same Node HTTP server |
| Files | Validated disk uploads in `backend/uploads`; metadata in PostgreSQL; protected blob download |
| Import | Multer memory upload plus SheetJS/XLSX parsing for `.csv` and `.xlsx` |

## Important directories

```text
frontend/src/
  pages/ChatPage.jsx          main application screen and client realtime state
  components/                 files, announcements, attendance, settings UI
  services/                   Axios API calls and authenticated download helper
  context/                    persisted auth state
  sockets/socket.js           Socket.IO client
backend/src/
  server.js                   Express, routes, protected uploads, Socket.IO
  controllers/                HTTP use-case handlers
  routes/                     route-to-controller mapping
  middleware/                 JWT and Multer upload handling
  services/studentImport...   import workflow
  sockets/chat.socket.js      authenticated realtime handlers
  utils/                      group lookup, validation, permissions
backend/prisma/
  schema.prisma               PostgreSQL data model
  migrations/                 committed Prisma migrations
docs/                         project documentation
```

## How the parts communicate

The React client calls Express REST endpoints through Axios. A JWT from login is stored in browser `localStorage` and sent in the `Authorization: Bearer ...` header. Express verifies it, controllers use Prisma for PostgreSQL access, and group checks guard group-owned data. The React client also opens an authenticated Socket.IO connection, joins authorized group rooms, and receives realtime changes. Files are stored on the backend disk but are never served as public static files; the UI fetches them with the same JWT header and downloads a blob.

## Local startup

1. Provide backend environment values (see below) and ensure PostgreSQL/schema migrations are ready.
2. Start the backend: `cd backend && npm start` (or `npm run dev`). Default port is `5000`.
3. Start the frontend: `cd frontend && npm run dev`.
4. Open the Vite URL and log in using an existing account.

Useful checks: `cd frontend && npm run lint && npm run build`. The backend currently has no lint/test script; `node --check src/server.js` is a syntax/import sanity check.

## Environment variables

Never commit actual values. Current code reads:

| Variable | Used by | Purpose |
| --- | --- | --- |
| `JWT_SECRET` | backend auth, Socket.IO, server startup | required signing/verifying secret |
| `DATABASE_URL` | Prisma schema | PostgreSQL connection URL |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | `backend/src/config/db.js` | raw `pg` pool configuration |
| `PORT` | backend server | optional Express/Socket.IO port; defaults to 5000 |
| `CORS_ORIGIN` | backend server | comma-separated allowed origins; defaults to `*` |
| `VITE_API_URL` | frontend Axios/file service | API base; defaults to `http://localhost:5000/api` |
| `VITE_SOCKET_URL` | Socket.IO client | socket origin; defaults to `http://localhost:5000` |

## Current status

The repository is demo-ready and its chat, announcement/file synchronization, attachment persistence, protected downloads, and import attendance refresh have been demo-tested. It is a college-project architecture, not a production deployment template; see `DEMO_AND_LEARNING_GUIDE.md` for concrete production gaps.

## AI CONTEXT SUMMARY

CampusConnect is a React/Vite + Express + PostgreSQL/Prisma college group collaboration app. Login uses roll number/password, bcrypt hashes, a 7-day JWT stored in localStorage, and Axios Bearer headers. Data is scoped through `GroupMember`; admins bypass membership in `canAccessGroup`. `ChatPage.jsx` is the main client state hub. Socket.IO authenticates with `handshake.auth.token`, validates `joinGroup` through `getUserGroupAccess`, stores normal chat messages in Prisma, and broadcasts group rooms. Announcements use REST + `announcement_created/deleted`; file upload creates both `File` and attachment `Message` in a transaction, emits `file_created` + `receiveMessage`, and downloads only through protected `GET /uploads/:filename`. Imports accept CSV/XLSX with `name, rollNo, branch, year`, create STUDENT + membership transactionally, and refresh current members in the UI. Read `backend/src/utils/permissions.js`, `groupAccess.js`, controllers, and `frontend/src/pages/ChatPage.jsx` before changing behavior.
