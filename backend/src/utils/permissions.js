const FACULTY_ROLES = new Set(["FACULTY", "TEACHER"]);
const STAFF_ROLES = new Set(["ADMIN", "FACULTY", "TEACHER"]);
const ATTENDANCE_MANAGER_ROLES = new Set(["ADMIN", "FACULTY", "TEACHER"]);
const IMPORT_ROLES = new Set(["ADMIN", "FACULTY", "TEACHER"]);

function isAdmin(role) {
  return role === "ADMIN";
}

function isFaculty(role) {
  return FACULTY_ROLES.has(role);
}

function isStaff(role) {
  return STAFF_ROLES.has(role);
}

function canCreateAnnouncement(role) {
  return isStaff(role);
}

function canDeleteAnnouncement(user, announcement) {
  if (!user || !announcement) return false;
  if (isAdmin(user.role)) return true;
  if (
    isFaculty(user.role) &&
    Number(user.id) === Number(announcement.createdBy)
  ) {
    return true;
  }
  return false;
}

function canUpdateAttendance(role) {
  return ATTENDANCE_MANAGER_ROLES.has(role);
}

function canImportStudents(role) {
  return IMPORT_ROLES.has(role);
}

function canViewMemberAttendance(role) {
  return ATTENDANCE_MANAGER_ROLES.has(role);
}

function canDeleteMessage(user, message, isGroupMember = false) {
  if (!user || !message) return false;

  if (Number(user.id) === Number(message.senderId)) {
    return true;
  }

  if (isAdmin(user.role)) {
    return true;
  }

  if (isFaculty(user.role) && isGroupMember) {
    return true;
  }

  return false;
}

function canDeleteFile(user, file) {
  if (!user || !file) return false;

  if (isAdmin(user.role)) {
    return true;
  }

  // Faculty/teachers may delete only files they uploaded. Students cannot delete.
  if (
    isFaculty(user.role) &&
    Number(user.id) === Number(file.uploadedBy)
  ) {
    return true;
  }

  return false;
}

function canAccessGroup(user, isGroupMember) {
  return isAdmin(user?.role) || isGroupMember;
}

module.exports = {
  FACULTY_ROLES,
  STAFF_ROLES,
  isAdmin,
  isFaculty,
  isStaff,
  canCreateAnnouncement,
  canDeleteAnnouncement,
  canUpdateAttendance,
  canImportStudents,
  canViewMemberAttendance,
  canDeleteMessage,
  canDeleteFile,
  canAccessGroup,
};
