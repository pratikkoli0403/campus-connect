const FACULTY_ROLES = new Set(["FACULTY", "TEACHER"]);
const STAFF_ROLES = new Set(["ADMIN", "FACULTY", "TEACHER"]);

export function isAdmin(role) {
  return role === "ADMIN";
}

export function isFaculty(role) {
  return FACULTY_ROLES.has(role);
}

export function isStaff(role) {
  return STAFF_ROLES.has(role);
}

export function isStudent(role) {
  return role === "STUDENT";
}

/** Create announcements (ADMIN / FACULTY / TEACHER). */
export function canManageAnnouncements(role) {
  return isStaff(role);
}

/** Update student attendance percentages. */
export function canManageAttendance(role) {
  return isStaff(role);
}

/** Import students via CSV/XLSX. */
export function canImportStudents(role) {
  return isStaff(role);
}

/**
 * Delete messages:
 * - own messages (any role)
 * - ADMIN: any
 * - FACULTY/TEACHER: any in groups they belong to (UI is scoped to current group)
 */
export function canDeleteMessage(user, message) {
  if (!user || !message) return false;

  const senderId = message.senderId ?? message.sender?.id;
  if (senderId != null && Number(senderId) === Number(user.id)) {
    return true;
  }

  if (isAdmin(user.role)) {
    return true;
  }

  if (isFaculty(user.role)) {
    return true;
  }

  return false;
}

/**
 * Delete announcements:
 * - ADMIN: any
 * - FACULTY/TEACHER: only ones they created
 */
export function canDeleteAnnouncement(user, announcement) {
  if (!user || !announcement) return false;

  if (isAdmin(user.role)) {
    return true;
  }

  if (isFaculty(user.role)) {
    const creatorId = announcement.createdBy ?? announcement.creator?.id;
    return creatorId != null && Number(creatorId) === Number(user.id);
  }

  return false;
}

/**
 * Delete files:
 * - ADMIN: any
 * - FACULTY/TEACHER: only files they uploaded
 * - STUDENT: never
 */
export function canDeleteFile(user, file) {
  if (!user || !file) return false;

  if (isAdmin(user.role)) {
    return true;
  }

  if (isFaculty(user.role)) {
    const uploaderId = file.uploadedBy ?? file.uploader?.id;
    return uploaderId != null && Number(uploaderId) === Number(user.id);
  }

  return false;
}
