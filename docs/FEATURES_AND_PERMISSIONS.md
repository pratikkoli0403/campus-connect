# Features and Permissions

Backend checks are authoritative. Frontend utilities in `frontend/src/utils/permissions.js` mainly decide UI visibility; they broadly mirror, but do not replace, `backend/src/utils/permissions.js` and controller checks.

## Implemented feature inventory

| Feature | Current behavior / key files |
| --- | --- |
| Login/logout | Roll number/password login in `LoginPage.jsx` and `AuthContext.jsx`; logout removes local storage values. |
| Public registration | `POST /api/auth/register` creates **only STUDENT** accounts and may join matching branch/year group. No registration form is exposed in current frontend routes. |
| Password change | Settings UI uses protected `PATCH /api/auth/change-password`; current password is verified. |
| Groups | Sidebar loads own memberships, searches them client-side, and selects a group. Staff can list all groups by API; admin can create group by API. |
| Chat | REST history plus persisted authenticated Socket.IO messages; typing and online IDs. |
| Message deletion | Own message; admin any accessible message; teacher only within a group they are a member of. File attachment message deletion also removes matching file record/disk file. |
| Announcements | Group list/create/delete, realtime creation/deletion. |
| Files | Multipart upload, group list, attachment message, realtime changes, protected blob download, deletion. |
| Attendance | Student sees own percentage; staff see group members and can update eligible students. |
| Bulk import | Staff endpoint/UI accepts CSV/XLSX, validates rows, supplies results and temporary credentials, then refreshes selected members. |
| Responsive UI | `ChatPage.jsx` includes mobile/sidebar state and component layouts use responsive class variants. |

The schema includes `PrivateMessage` and `LeaveRequest`, but this repository contains no route/controller/UI flow for them. They are not listed as implemented user-facing features.

## Permission matrix

| Feature | STUDENT | TEACHER | FACULTY | ADMIN |
| --- | --- | --- | --- | --- |
| Login / change own password | Yes | Yes | Helper supports | Yes |
| Access group data | Own memberships | Membership required | Helper supports membership | Any group (`canAccessGroup`) |
| Send chat | Authorized group | Authorized group | Helper supports | Authorized group/admin access |
| Delete message | Own only | Own, or any in group they belong to | Same helper behavior | Any accessible group message |
| View announcements/files | Authorized group | Authorized group | Helper supports | Any group |
| Create announcement | No | Yes, only accessible group | Helper supports | Yes, only accessible/existing group |
| Delete announcement | No | Only own announcement | Helper supports | Any accessible group announcement |
| Upload file | Yes, accessible group | Yes, accessible group | Helper supports | Yes |
| Delete file | No | Only own upload | Helper supports | Any accessible group file |
| Download file | Authorized group | Authorized group | Helper supports | Any group |
| View own attendance | Yes | Yes (endpoint is not role-limited) | Helper supports | Yes |
| View group attendance/member percentage | Member list but no percentages | Yes in accessible group | Helper supports | Yes |
| Update attendance | No | Student in a shared group | Helper supports | Any student |
| Import students | No | Yes | Helper supports | Yes |
| Create group | No | No | No under current schema | Yes |

### Important role note

The Prisma `Role` enum is exactly `STUDENT`, `TEACHER`, `ADMIN`. Backend and frontend helper sets also list `FACULTY`, but no current database record can have that enum value. The FACULTY column above documents helper intent, not a role currently creatable by Prisma.

## Enforcement details

- **Group scope:** `getUserGroupAccess()` / `canAccessGroup()` are used by message history/deletion, announcements, file deletion/download, group member lookup, and Socket.IO joining/sending.
- **Announcements:** `canCreateAnnouncement` accepts staff; `canDeleteAnnouncement` accepts admin or teacher/faculty who created it.
- **Files:** uploads/listing use membership/admin access. `canDeleteFile` allows admin or teacher/faculty uploader; students cannot delete files. Download has authentication plus database file lookup plus group access.
- **Attendance:** `canUpdateAttendance` and `canViewMemberAttendance` recognize staff. The attendance update controller additionally checks the target is STUDENT and non-admin updater shares a group.
- **Import:** `admin.routes.js` runs `authMiddleware`, `requireImportAccess`, and upload validation before import service execution.

## Upload/import safeguards

Shared file upload allows PDF, PNG, JPG/JPEG, DOC/DOCX MIME/extension combinations and 10 MB maximum. Import allows CSV/XLSX and 5 MB maximum. Import validates `name`, `rollNo`, `branch`, `year`; detects duplicate roll numbers in one file and existing users; rejects rows with no matching group; and wraps each successful user plus membership in a transaction.
