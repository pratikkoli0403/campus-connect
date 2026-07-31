# API and Realtime Reference

Base REST URL defaults to `http://localhost:5000/api`. JSON success envelopes generally use `{ success, message, data }`. All protected API endpoints require `Authorization: Bearer <JWT>`.

## REST API

### Auth

| Method/path | Auth | Permission | Request / result / notable errors |
| --- | --- | --- | --- |
| `POST /api/auth/register` | No | Public STUDENT registration only | `name, rollNo, password, role: "STUDENT", branch, year`; hashes password and may create matching group membership. 400 invalid fields, 403 non-student role, 409 roll number exists. |
| `POST /api/auth/login` | No | Public | `rollNo, password`; returns `token` and public user data. 401 invalid credentials. |
| `PATCH /api/auth/change-password` | Yes | Authenticated user | `currentPassword, newPassword` (minimum 6); verifies current hash. |

### Groups

| Method/path | Auth | Permission | Purpose |
| --- | --- | --- | --- |
| `POST /api/groups` | Yes | ADMIN | Create group: `name, branch, year`. |
| `GET /api/groups/my-groups` | Yes | Authenticated | Return groups where `GroupMember.userId` is caller. |
| `GET /api/groups/:groupId/members` | Yes | Member or ADMIN | Return group users; attendance percentage included only for staff. |
| `GET /api/groups` | Yes | Staff helper role | Return all groups. |
| `POST /api/groups/join` | Yes | ADMIN, or STUDENT with matching branch/year | `groupId`; rejects existing membership. |

### Messages

| Method/path | Auth | Permission | Purpose |
| --- | --- | --- | --- |
| `GET /api/messages/:groupId` | Yes | Member or ADMIN | Ordered message history with sender data. |
| `DELETE /api/messages/:id` | Yes | Owner; ADMIN; or TEACHER/FACULTY member | Deletes message. If attachment URL exists, removes disk file and matching `File` metadata, then emits `message_deleted`. |

There is no REST endpoint for sending a normal chat message; that operation is Socket.IO `sendMessage`.

### Announcements

| Method/path | Auth | Permission | Purpose |
| --- | --- | --- | --- |
| `POST /api/announcements` | Yes | Staff in accessible group | `groupId, title` (max 140), `content` (max 4000); returns created record and emits realtime creation. |
| `GET /api/announcements/:groupId` | Yes | Member or ADMIN | Newest-first group announcements. |
| `DELETE /api/announcements/:id` | Yes | ADMIN or creator teacher/faculty; group access required | Deletes and emits `announcement_deleted`. |

### Files and protected upload download

| Method/path | Auth | Permission | Purpose |
| --- | --- | --- | --- |
| `POST /api/files/upload` | Yes | Member or ADMIN | Multipart `file` and `groupId`; 10 MB; allowed PDF/PNG/JPG/JPEG/DOC/DOCX. Creates `File` plus attachment `Message`, emits file/message events. |
| `GET /api/files/:groupId` | Yes | Member or ADMIN | Newest-first file metadata with uploader. |
| `DELETE /api/files/:id` | Yes | ADMIN or teacher/faculty uploader; group access | Deletes file, linked attachment messages, disk file; emits file/message delete events. |
| `GET /uploads/:filename` | Yes | Member or ADMIN of file's group | Not public/static. Looks up exact metadata, validates access, returns `res.download` using original filename. 401 bad/missing JWT; 403 unauthorized; 404 no metadata/file. |

### Attendance and import

| Method/path | Auth | Permission | Purpose |
| --- | --- | --- | --- |
| `GET /api/attendance/me` | Yes | Authenticated | Return caller's attendance percentage. |
| `PATCH /api/attendance/:userId` | Yes | Staff helper role; non-admin must share group | `{ attendancePercentage }`, 0–100; target must be STUDENT. |
| `POST /api/admin/import-students` | Yes | Staff helper role | Multipart CSV/XLSX `file`; returns imported/skipped counts, row errors, student/group info, temporary credentials. |

### Other

`GET /` returns a plain backend status string. `GET /api/protected` is an authenticated JWT example that returns decoded `req.user`.

## Socket.IO events

Handshake authentication is `socket.handshake.auth.token`. `setupChatSocket()` verifies it with `JWT_SECRET`; a missing/invalid token rejects the connection. `ChatPage.jsx` sets the token from local storage before `socket.connect()`.

| Event | Direction | Payload | Auth / room behavior | Locations |
| --- | --- | --- | --- | --- |
| `registerUser` | client -> server | client currently sends `{ userId }`, server ignores it | socket JWT user becomes online; global `onlineUsers` broadcast | ChatPage; `chat.socket.js` |
| `onlineUsers` | server -> all / new socket | numeric user ID array | process-local online presence | same |
| `joinGroup` | client -> server | `{ groupId }` | server runs `getUserGroupAccess`; only then joins `String(groupId)` | same |
| `sendMessage` | client -> server | `{ content, senderId, groupId }`; senderId ignored | server uses JWT user and validates group access | same |
| `receiveMessage` | server -> group room | persisted message + sender | normal chat or newly uploaded attachment | socket/file controller -> ChatPage |
| `announcement_created` | server -> group room | announcement + creator | emitted after REST persistence | announcement controller -> ChatPage |
| `announcement_deleted` | server -> group room | `{ id, groupId }` | emitted after deletion | announcement controller -> ChatPage |
| `file_created` | server -> group room | file + uploader | emitted after upload transaction | file controller -> ChatPage |
| `file_deleted` | server -> group room | `{ id, groupId, fileUrl }` | emitted after deletion | file controller -> ChatPage |
| `message_deleted` | server -> group room | `{ id, groupId, fileUrl? }` | emitted by message/file deletion | controllers -> ChatPage |
| `typing` / `stopTyping` | client -> server | `{ groupId, userName, userId? }` | payload validation; server relays to room except sender | ChatPage / socket |
| `userTyping` / `userStopTyping` | server -> room except sender | normalized typing payload | transient UI state | socket -> ChatPage |

### Realtime synchronization

Creation controllers persist first and then use `io.to(String(groupId)).emit(...)`. `ChatPage` filters by selected group and deduplicates messages/files/announcements by ID. Delete handlers filter their local arrays. REST loads remain the source for initial state and refresh recovery.

### Download flow

```text
FileCard or MessageRow button
 -> fileService.downloadFile (Bearer header, blob response)
 -> GET /uploads/:filename
 -> authMiddleware
 -> File lookup by stored URL
 -> getUserGroupAccess
 -> res.download(uploadDir/name, original fileName)
 -> temporary browser object URL download
```
