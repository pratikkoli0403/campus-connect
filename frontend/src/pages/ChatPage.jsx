import AttendancePanel from "../components/AttendancePanel";
import FilesPanel from "../components/FilesPanel";
import AnnouncementPanel from "../components/AnnouncementPanel";
import SettingsPanel from "../components/SettingsPanel";
import socket from "../sockets/socket";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Download,
  FileText,
  Gauge,
  Hash,
  Loader2,
  Menu,
  Megaphone,
  MoreVertical,
  Paperclip,
  Pin,
  Save,
  Search,
  Send,
  Settings,
  Smile,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../context/authContext.js";
import { getGroupMembers, getGroups } from "../services/groupService.js";
import { getMessages } from "../services/messageService";
import {
  createAnnouncement,
  getAnnouncements,
} from "../services/announcementService.js";
import {
  getFiles,
  resolveFileUrl,
  uploadFile,
} from "../services/fileService.js";
import {
  getMyAttendance,
  updateAttendance,
} from "../services/attendanceService.js";
import { importStudents } from "../services/adminService.js";
import { changePassword } from "../services/authService.js";

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatMessageTime(iso) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatAnnouncementTime(iso) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatFileTime(iso) {
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function canManageAnnouncements(role) {
  return ["ADMIN", "FACULTY", "TEACHER"].includes(role);
}

function canManageAttendance(role) {
  return ["ADMIN", "TEACHER"].includes(role);
}

function formatAttendance(value) {
  const percentage = Number(value ?? 0);
  return `${Number.isInteger(percentage) ? percentage : percentage.toFixed(2)}%`;
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-[#5865f2]",
  "bg-[#3ba55c]",
  "bg-[#faa61a]",
  "bg-[#ed4245]",
  "bg-[#eb459e]",
  "bg-[#57f287]",
];

function avatarColor(id) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

const TYPING_THROTTLE_MS = 2000;
const TYPING_IDLE_MS = 2000;
const TYPING_STALE_MS = 5000;
const CHAT_EMOJIS = [
  "😀",
  "😄",
  "😂",
  "😊",
  "😍",
  "😎",
  "🥳",
  "🤔",
  "😅",
  "😭",
  "😤",
  "🙌",
  "👏",
  "👍",
  "👎",
  "🙏",
  "💪",
  "🔥",
  "✨",
  "🎉",
  "✅",
  "❌",
  "📌",
  "📚",
  "📝",
  "💻",
  "⏰",
  "🚀",
  "❤️",
  "💯",
];

function formatTypingLabel(names) {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return `${names[0]}, ${names[1]}, and ${names.length - 2} others are typing…`;
}

function EmojiPicker({ onSelect }) {
  return (
    <div
      className="absolute bottom-full right-11 z-30 mb-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-lg border border-[#1e1f22]/80 bg-[#2b2d31] p-2 shadow-2xl ring-1 ring-black/20 sm:right-12"
      role="dialog"
      aria-label="Emoji picker"
    >
      <div className="grid grid-cols-6 gap-1">
        {CHAT_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="flex aspect-square min-h-10 items-center justify-center rounded-md text-xl transition-colors hover:bg-[#404249] focus:bg-[#404249] focus:outline-none focus:ring-2 focus:ring-[#5865f2]/50"
            onClick={() => onSelect(emoji)}
            aria-label={`Insert ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

function PresenceDot({ online, size = "sm", className = "" }) {
  const sizeClass =
    size === "lg" ? "h-3 w-3 border-[2.5px]" : "h-2.5 w-2.5 border-2";
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${sizeClass} border-[#2b2d31] ${
        online ? "bg-[#23a559]" : "bg-[#80848e]"
      } ${className}`}
      title={online ? "Online" : "Offline"}
      aria-hidden
    />
  );
}

function UserAvatar({ user, online, size = "md" }) {
  const box =
    size === "sm"
      ? "h-8 w-8 text-[10px]"
      : "h-9 w-9 text-xs sm:h-10 sm:w-10";
  const dot =
    size === "sm"
      ? "h-2.5 w-2.5 border-2"
      : "h-3 w-3 border-[2.5px]";

  return (
    <div
      className={`relative shrink-0 ${
        size === "sm" ? "h-8 w-8" : "h-9 w-9 sm:h-10 sm:w-10"
      }`}
    >
      <div
        className={`flex ${box} items-center justify-center rounded-full font-semibold text-white ${avatarColor(user.id)}`}
        aria-hidden
      >
        {getInitials(user.name)}
      </div>
      <span
        className={`absolute -bottom-0.5 -right-0.5 rounded-full border-[#2b2d31] ${dot} ${
          online ? "bg-[#23a559]" : "bg-[#80848e]"
        }`}
        title={online ? "Online" : "Offline"}
        aria-hidden
      />
    </div>
  );
}

function MessageRow({ message, showHeader, isOwn, isSenderOnline }) {
  const { sender, content, createdAt } = message;
  const bubbleBase =
    "max-w-[min(92vw,28rem)] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm sm:max-w-[min(85%,28rem)] sm:px-3.5 sm:text-[15px] md:max-w-md";

  if (isOwn) {
    return (
      <div
        className={`group flex justify-end px-2 sm:px-4 ${
          showHeader ? "mt-3 first:mt-0" : "mt-1"
        }`}
      >
        <div className="flex min-w-0 flex-col items-end">
          {showHeader && (
            <div className="mb-1 flex items-center gap-2 px-1">
              <span className="text-sm font-semibold text-[#f2f3f5]">
                {sender.name}
              </span>
              <PresenceDot online={isSenderOnline} />
              <span className="text-xs text-[#949ba4]">
                {formatMessageTime(createdAt)}
              </span>
            </div>
          )}
          <div
            className={`${bubbleBase} rounded-br-md bg-[#5865f2] text-white`}
          >
            <p className="break-words">{content}</p>
          </div>
          {!showHeader && (
            <span className="mt-0.5 px-1 text-[10px] text-[#949ba4] opacity-0 transition-opacity group-hover:opacity-100">
              {formatMessageTime(createdAt)}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex justify-start gap-2 px-2 sm:gap-3 sm:px-4 ${
        showHeader ? "mt-3 first:mt-0" : "mt-1"
      }`}
    >
      {showHeader ? (
        <div className="mt-0.5 shrink-0 max-sm:scale-90 max-sm:origin-top-left sm:scale-100">
          <UserAvatar user={sender} online={isSenderOnline} />
        </div>
      ) : (
        <div className="flex w-8 shrink-0 items-center justify-center sm:w-10">
          <span className="text-[10px] text-[#949ba4] opacity-0 transition-opacity group-hover:opacity-100">
            {formatMessageTime(createdAt)}
          </span>
        </div>
      )}

      <div className="flex min-w-0 flex-col items-start">
        {showHeader && (
          <div className="mb-1 flex items-center gap-2 px-0.5">
            <span className="text-sm font-semibold text-[#f2f3f5]">
              {sender.name}
            </span>
            <PresenceDot online={isSenderOnline} />
            <span className="text-xs text-[#949ba4]">
              {formatMessageTime(createdAt)}
            </span>
          </div>
        )}
        <div
          className={`${bubbleBase} rounded-bl-md border border-[#1e1f22]/40 bg-[#404249] text-[#dbdee1]`}
        >
          <p className="break-words">{content}</p>
        </div>
      </div>
    </div>
  );
}


function FileCard({ file }) {
  const uploader = file.uploader ?? {
    id: file.uploadedBy,
    name: "Unknown user",
  };

  return (
    <a
      href={resolveFileUrl(file.fileUrl)}
      target="_blank"
      rel="noreferrer"
      download
      className="group flex min-w-0 items-center gap-3 rounded-lg border border-[#3f4147]/80 bg-[#2b2d31] p-3 text-left transition-colors hover:border-[#5865f2]/60 hover:bg-[#32343a]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#5865f2]/15 text-[#b8c0ff] ring-1 ring-[#5865f2]/25">
        <FileText className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#f2f3f5]">
          {file.fileName}
        </p>
        <p className="truncate text-xs text-[#949ba4]">
          {uploader.name} · {formatFileTime(file.createdAt)}
        </p>
      </div>
      <Download
        className="h-4 w-4 shrink-0 text-[#949ba4] transition-colors group-hover:text-[#f2f3f5]"
        aria-hidden
      />
    </a>
  );
}

function FilesSection({ files, loading, error }) {
  return (
    <section className="mx-2 mb-4 rounded-lg border border-[#1e1f22]/70 bg-[#313338] p-3 shadow-sm sm:mx-4 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Paperclip className="h-5 w-5 shrink-0 text-[#b8c0ff]" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[#f2f3f5]">
              Shared files
            </h2>
            <p className="truncate text-xs text-[#949ba4]">
              {files.length} uploaded
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg bg-[#2b2d31] px-3 py-3 text-sm text-[#949ba4]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading files...
        </div>
      ) : error ? (
        <p
          role="alert"
          className="rounded-lg border border-[#ed4245]/30 bg-[#ed4245]/10 px-3 py-3 text-sm text-[#f23f42]"
        >
          {error}
        </p>
      ) : files.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#3f4147] bg-[#2b2d31]/70 px-3 py-4 text-sm text-[#949ba4]">
          No files shared yet.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {files.map((file) => (
            <FileCard key={file.id} file={file} />
          ))}
        </div>
      )}
    </section>
  );
}

function StudentImportPanel({
  fileName,
  loading,
  result,
  error,
  onFileChange,
  onSubmit,
}) {
  const credentials = result?.credentials ?? [];
  const credentialText = credentials
    .map((credential) =>
      [
        credential.name,
        credential.rollNo,
        credential.temporaryPassword,
        credential.group?.name ?? "Unassigned",
      ].join("\t")
    )
    .join("\n");

  return (
    <section className="mx-2 mb-4 rounded-lg border border-[#1e1f22]/70 bg-[#313338] p-3 shadow-sm sm:mx-4 sm:p-4">
      <div className="mb-3 flex min-w-0 items-center gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#5865f2]/15 text-[#b8c0ff] ring-1 ring-[#5865f2]/25">
          <Upload className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-[#f2f3f5]">
            Bulk student import
          </h2>
          <p className="truncate text-xs text-[#949ba4]">
            Upload CSV or XLSX with name, rollNo, branch, year
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="flex min-h-11 cursor-pointer items-center rounded-md border border-dashed border-[#3f4147] bg-[#2b2d31] px-3 text-sm text-[#b5bac1] transition-colors hover:border-[#5865f2]/60 hover:text-[#f2f3f5]">
          <input
            key={fileName || "empty-import-file"}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={onFileChange}
          />
          <span className="truncate">{fileName || "Choose CSV or XLSX file"}</span>
        </label>
        <button
          type="submit"
          disabled={loading || !fileName}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#5865f2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4752c4] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#5865f2]"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Import
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-[#ed4245]/30 bg-[#ed4245]/10 px-3 py-2 text-xs text-[#f23f42]"
        >
          {error}
        </p>
      )}

      {result && (
        <div className="mt-3 rounded-lg border border-[#3f4147]/80 bg-[#2b2d31] p-3">
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#949ba4]">
                Imported
              </p>
              <p className="text-lg font-bold text-[#57f287]">
                {result.importedCount}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[#949ba4]">
                Skipped
              </p>
              <p className="text-lg font-bold text-[#faa61a]">
                {result.skippedCount}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[#949ba4]">
                Notes
              </p>
              <p className="text-lg font-bold text-[#f2f3f5]">
                {result.errors?.length ?? 0}
              </p>
            </div>
          </div>

          {credentials.length > 0 && (
            <>
              <div className="mt-3 overflow-hidden rounded-md border border-[#1e1f22]/70">
                <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-2 border-b border-[#1e1f22]/70 bg-[#1e1f22] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#949ba4] sm:grid">
                  <span>Name</span>
                  <span>Roll no</span>
                  <span>Password</span>
                  <span>Group</span>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {credentials.map((credential) => (
                    <div
                      key={credential.rollNo}
                      className="grid gap-1 border-b border-[#1e1f22]/70 px-3 py-2 text-xs last:border-b-0 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.9fr)] sm:gap-2"
                    >
                      <p className="truncate text-[#dbdee1]">
                        <span className="text-[#949ba4] sm:hidden">Name: </span>
                        {credential.name}
                      </p>
                      <p className="truncate font-mono text-[#dbdee1]">
                        <span className="font-sans text-[#949ba4] sm:hidden">
                          Roll no:{" "}
                        </span>
                        {credential.rollNo}
                      </p>
                      <p className="truncate font-mono text-[#b8c0ff]">
                        <span className="font-sans text-[#949ba4] sm:hidden">
                          Password:{" "}
                        </span>
                        {credential.temporaryPassword}
                      </p>
                      <p className="truncate text-[#dbdee1]">
                        <span className="text-[#949ba4] sm:hidden">Group: </span>
                        {credential.group?.name ?? "Unassigned"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <textarea
                readOnly
                value={credentialText}
                rows={Math.min(credentials.length, 5)}
                onFocus={(e) => e.target.select()}
                className="mt-2 max-h-32 min-h-16 w-full resize-y rounded-md border border-[#1e1f22]/70 bg-[#1e1f22] px-3 py-2 font-mono text-xs text-[#dbdee1] outline-none focus:border-[#5865f2]/60 focus:ring-2 focus:ring-[#5865f2]/20"
                aria-label="Copy imported student credentials"
              />
            </>
          )}

          {result.errors?.length > 0 && (
            <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto text-xs text-[#f0b86a]">
              {result.errors.slice(0, 8).map((item, index) => (
                <li key={`${item.row ?? "row"}-${index}`}>
                  Row {item.row ?? "-"}: {item.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}


function StudentAttendanceCard({ attendance, loading, error }) {
  const percentage = attendance?.attendancePercentage ?? 0;

  return (
    <section className="mx-2 mb-4 rounded-lg border border-[#1e1f22]/70 bg-[#313338] p-3 shadow-sm sm:mx-4 sm:p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#23a559]/15 text-[#57f287] ring-1 ring-[#23a559]/25">
          <Gauge className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#949ba4]">
            Attendance
          </p>
          {loading ? (
            <div className="mt-2 h-7 w-24 animate-pulse rounded bg-[#404249]" />
          ) : error ? (
            <p className="mt-1 text-sm text-[#f23f42]">{error}</p>
          ) : (
            <p className="mt-0.5 text-3xl font-bold leading-none text-[#f2f3f5]">
              {formatAttendance(percentage)}
            </p>
          )}
        </div>
      </div>
      {!loading && !error && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#1e1f22]">
          <div
            className="h-full rounded-full bg-[#23a559]"
            style={{ width: `${Math.min(Math.max(Number(percentage), 0), 100)}%` }}
          />
        </div>
      )}
    </section>
  );
}

function AttendanceUpdatePanel({
  members,
  values,
  loadingUserId,
  error,
  onValueChange,
  onSubmit,
}) {
  return (
    <section className="mx-2 mb-4 rounded-lg border border-[#1e1f22]/70 bg-[#313338] p-3 shadow-sm sm:mx-4 sm:p-4">
      <div className="mb-3 flex min-w-0 items-center gap-2">
        <Gauge className="h-5 w-5 shrink-0 text-[#57f287]" />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-[#f2f3f5]">
            Attendance updates
          </h2>
          <p className="truncate text-xs text-[#949ba4]">
            Set a student percentage from 0 to 100
          </p>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-3 rounded-md border border-[#ed4245]/30 bg-[#ed4245]/10 px-3 py-2 text-xs text-[#f23f42]"
        >
          {error}
        </p>
      )}

      {members.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#3f4147] bg-[#2b2d31]/70 px-3 py-4 text-sm text-[#949ba4]">
          No students available in this group.
        </div>
      ) : (
        <div className="grid gap-2">
          {members.map((member) => {
            const saving = loadingUserId === member.id;
            return (
              <form
                key={member.id}
                onSubmit={(e) => onSubmit(e, member.id)}
                className="grid gap-2 rounded-lg border border-[#3f4147]/80 bg-[#2b2d31] p-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#f2f3f5]">
                    {member.name}
                  </p>
                  <p className="truncate text-xs text-[#949ba4]">
                    {member.rollNo ?? member.role} · Current{" "}
                    {formatAttendance(member.attendancePercentage)}
                  </p>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={values[member.id] ?? ""}
                  onChange={(e) => onValueChange(member.id, e.target.value)}
                  className="h-10 w-full rounded-md border border-transparent bg-[#1e1f22] px-3 text-sm text-[#f2f3f5] placeholder:text-[#6d6f78] outline-none transition-all focus:border-[#57f287]/60 focus:ring-2 focus:ring-[#57f287]/20"
                />
                <button
                  type="submit"
                  disabled={saving || values[member.id] === ""}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#23a559] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f8f4d] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#23a559]"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </button>
              </form>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AnnouncementsSection({
  announcements,
  loading,
  error,
  canCreate,
  title,
  content,
  createLoading,
  createError,
  onTitleChange,
  onContentChange,
  onSubmit,
}) {
  return (
    <section className="mx-2 mb-4 rounded-lg border border-[#1e1f22]/70 bg-[#313338] p-3 shadow-sm sm:mx-4 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Megaphone className="h-5 w-5 shrink-0 text-[#faa61a]" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[#f2f3f5]">
              Announcements
            </h2>
            <p className="truncate text-xs text-[#949ba4]">
              {announcements.length} posted
            </p>
          </div>
        </div>
      </div>

      {canCreate && (
        <form
          onSubmit={onSubmit}
          className="mb-3 rounded-lg border border-[#3f4147]/70 bg-[#2b2d31] p-3"
        >
          <div className="grid gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Announcement title"
              maxLength={140}
              className="w-full rounded-md border border-transparent bg-[#1e1f22] px-3 py-2 text-sm text-[#f2f3f5] placeholder:text-[#6d6f78] outline-none transition-all focus:border-[#faa61a]/60 focus:ring-2 focus:ring-[#faa61a]/20"
            />
            <textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="Share an update with this group"
              rows={3}
              className="max-h-36 min-h-20 w-full resize-y rounded-md border border-transparent bg-[#1e1f22] px-3 py-2 text-sm text-[#f2f3f5] placeholder:text-[#6d6f78] outline-none transition-all focus:border-[#faa61a]/60 focus:ring-2 focus:ring-[#faa61a]/20"
            />
          </div>

          {createError && (
            <p
              role="alert"
              className="mt-2 rounded-md border border-[#ed4245]/30 bg-[#ed4245]/10 px-3 py-2 text-xs text-[#f23f42]"
            >
              {createError}
            </p>
          )}

          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={createLoading || !title.trim() || !content.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-[#faa61a] px-3 py-2 text-sm font-semibold text-[#1e1f22] transition-colors hover:bg-[#e99a18] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#faa61a]"
            >
              {createLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Megaphone className="h-4 w-4" />
              )}
              Post
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg bg-[#2b2d31] px-3 py-3 text-sm text-[#949ba4]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading announcements...
        </div>
      ) : error ? (
        <p
          role="alert"
          className="rounded-lg border border-[#ed4245]/30 bg-[#ed4245]/10 px-3 py-3 text-sm text-[#f23f42]"
        >
          {error}
        </p>
      ) : announcements.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#3f4147] bg-[#2b2d31]/70 px-3 py-4 text-sm text-[#949ba4]">
          No announcements yet.
        </div>
      ) : (
        <div className="grid gap-2">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ChatPage() {
  const [activePanel, setActivePanel] = useState("chat");
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementsError, setAnnouncementsError] = useState("");
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState("");
  const [fileUploadLoading, setFileUploadLoading] = useState(false);
  const [fileUploadError, setFileUploadError] = useState("");
  const [myAttendance, setMyAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  const [attendanceValues, setAttendanceValues] = useState({});
  const [attendanceUpdateUserId, setAttendanceUpdateUserId] = useState(null);
  const [attendanceUpdateError, setAttendanceUpdateError] = useState("");
  const [studentImportFile, setStudentImportFile] = useState(null);
  const [studentImportLoading, setStudentImportLoading] = useState(false);
  const [studentImportResult, setStudentImportResult] = useState(null);
  const [studentImportError, setStudentImportError] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState("");
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementCreateLoading, setAnnouncementCreateLoading] =
    useState(false);
  const [announcementCreateError, setAnnouncementCreateError] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());
  const [membersOpen, setMembersOpen] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState(() => new Map());
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const lastTypingEmitRef = useRef(0);
  const stopTypingTimerRef = useRef(null);
  const typingExpiryTimersRef = useRef(new Map());

  const isUserOnline = useMemo(() => {
    return (userId) => onlineUserIds.has(Number(userId));
  }, [onlineUserIds]);

  const typingLabel = useMemo(() => {
    const names = [...typingUsers.values()];
    return formatTypingLabel(names);
  }, [typingUsers]);

  const canCreateAnnouncements = canManageAnnouncements(user?.role);
  const canEditAttendance = canManageAttendance(user?.role);
  const canImportStudents = canManageAttendance(user?.role);

  const clearTypingExpiry = useCallback((key) => {
    const timer = typingExpiryTimersRef.current.get(key);
    if (timer) {
      clearTimeout(timer);
      typingExpiryTimersRef.current.delete(key);
    }
  }, []);

  const clearAllTypingExpiry = useCallback(() => {
    typingExpiryTimersRef.current.forEach((timer) => clearTimeout(timer));
    typingExpiryTimersRef.current.clear();
  }, []);

  const emitStopTyping = useCallback((groupId = selectedGroupId) => {
    if (groupId == null || !user?.name) return;

    clearTimeout(stopTypingTimerRef.current);
    stopTypingTimerRef.current = null;
    lastTypingEmitRef.current = 0;

    socket.emit("stopTyping", {
      groupId,
      userId: user.id,
      userName: user.name,
    });
  }, [selectedGroupId, user]);

  function emitTyping() {
    if (selectedGroupId == null || !user?.name) return;

    const now = Date.now();
    if (now - lastTypingEmitRef.current < TYPING_THROTTLE_MS) {
      return;
    }

    lastTypingEmitRef.current = now;
    socket.emit("typing", {
      groupId: selectedGroupId,
      userId: user.id,
      userName: user.name,
    });
  }

  function scheduleStopTyping() {
    clearTimeout(stopTypingTimerRef.current);
    stopTypingTimerRef.current = setTimeout(
      () => emitStopTyping(),
      TYPING_IDLE_MS
    );
  }

  function updateDraftMessage(value) {
    setNewMessage(value);

    if (selectedGroupId == null || !user?.name) return;

    if (!value.trim()) {
      emitStopTyping();
      return;
    }

    emitTyping();
    scheduleStopTyping();
  }

  const addTypingUser = useCallback((key, userName) => {
    setTypingUsers((prev) => {
      const next = new Map(prev);
      next.set(key, userName);
      return next;
    });

    clearTypingExpiry(key);
    typingExpiryTimersRef.current.set(
      key,
      setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
        typingExpiryTimersRef.current.delete(key);
      }, TYPING_STALE_MS)
    );
  }, [clearTypingExpiry]);

  const removeTypingUser = useCallback((key) => {
    clearTypingExpiry(key);
    setTypingUsers((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, [clearTypingExpiry]);

  useEffect(() => {
    let cancelled = false;

    async function loadMyAttendance() {
      if (!user?.id) {
        setMyAttendance(null);
        return;
      }

      setAttendanceLoading(true);
      setAttendanceError("");
      try {
        const data = await getMyAttendance();
        if (!cancelled) setMyAttendance(data);
      } catch (err) {
        if (!cancelled) {
          setAttendanceError(
            err.response?.data?.message ?? "Failed to load attendance."
          );
        }
      } finally {
        if (!cancelled) setAttendanceLoading(false);
      }
    }

    loadMyAttendance();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    async function fetchGroups() {
      setGroupsLoading(true);
      setGroupsError("");
      try {
        const data = await getGroups();
        if (cancelled) return;

        const list = data.data ?? [];
        setGroups(list);
        setSelectedGroupId((prev) => {
          if (prev != null && list.some((g) => g.id === prev)) return prev;
          return list[0]?.id ?? null;
        });
      } catch (err) {
        if (!cancelled) {
          setGroupsError(
            err.response?.data?.message ?? "Failed to load groups."
          );
          setGroups([]);
        }
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    }

    fetchGroups();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (user?.id == null) return;

    const register = () => {
      socket.emit("registerUser", { userId: user.id });
    };

    const onOnlineUsers = (ids) => {
      setOnlineUserIds(new Set((ids ?? []).map(Number)));
    };

    register();
    socket.on("connect", register);
    socket.on("onlineUsers", onOnlineUsers);

    return () => {
      socket.off("connect", register);
      socket.off("onlineUsers", onOnlineUsers);
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      if (selectedGroupId == null) {
        setMessages([]);
        return;
      }

      try {
        const data = await getMessages(selectedGroupId);
        if (!cancelled) setMessages(data ?? []);
      } catch {
        if (!cancelled) {
          console.error("Failed to load messages");
          setMessages([]);
        }
      }
    }

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [selectedGroupId]);

  useEffect(() => {
    let cancelled = false;

    async function loadAnnouncements() {
      if (selectedGroupId == null) {
        setAnnouncements([]);
        setAnnouncementsError("");
        return;
      }

      setAnnouncementsLoading(true);
      setAnnouncementsError("");
      setAnnouncementCreateError("");
      try {
        const data = await getAnnouncements(selectedGroupId);
        if (!cancelled) setAnnouncements(data ?? []);
      } catch (err) {
        if (!cancelled) {
          setAnnouncements([]);
          setAnnouncementsError(
            err.response?.data?.message ?? "Failed to load announcements."
          );
        }
      } finally {
        if (!cancelled) setAnnouncementsLoading(false);
      }
    }

    loadAnnouncements();
    return () => {
      cancelled = true;
    };
  }, [selectedGroupId]);

  useEffect(() => {
    let cancelled = false;

    async function loadFiles() {
      if (selectedGroupId == null) {
        setFiles([]);
        setFilesError("");
        return;
      }

      setFilesLoading(true);
      setFilesError("");
      setFileUploadError("");
      try {
        const data = await getFiles(selectedGroupId);
        if (!cancelled) setFiles(data ?? []);
      } catch (err) {
        if (!cancelled) {
          setFiles([]);
          setFilesError(err.response?.data?.message ?? "Failed to load files.");
        }
      } finally {
        if (!cancelled) setFilesLoading(false);
      }
    }

    loadFiles();
    return () => {
      cancelled = true;
    };
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId == null) return;

    socket.emit("joinGroup", { groupId: selectedGroupId });

    const onReceiveMessage = (message) => {
      if (Number(message.groupId) !== Number(selectedGroupId)) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    };

    socket.on("receiveMessage", onReceiveMessage);

    return () => {
      socket.off("receiveMessage", onReceiveMessage);
    };
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId == null) return;

    const onUserTyping = ({ groupId, userId, userName }) => {
      if (Number(groupId) !== Number(selectedGroupId)) return;
      if (
        user?.id != null &&
        userId != null &&
        Number(userId) === Number(user.id)
      ) {
        return;
      }

      const key = userId ?? userName;
      addTypingUser(key, userName);
    };

    const onUserStopTyping = ({ groupId, userId, userName }) => {
      if (Number(groupId) !== Number(selectedGroupId)) return;
      removeTypingUser(userId ?? userName);
    };

    socket.on("userTyping", onUserTyping);
    socket.on("userStopTyping", onUserStopTyping);

    return () => {
      socket.off("userTyping", onUserTyping);
      socket.off("userStopTyping", onUserStopTyping);
      emitStopTyping(selectedGroupId);
      setTypingUsers(new Map());
      clearAllTypingExpiry();
      clearTimeout(stopTypingTimerRef.current);
    };
  }, [
    addTypingUser,
    clearAllTypingExpiry,
    emitStopTyping,
    removeTypingUser,
    selectedGroupId,
    user?.id,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      if (selectedGroupId == null) {
        setGroupMembers([]);
        return;
      }

      setMembersLoading(true);
      try {
        const data = await getGroupMembers(selectedGroupId);
        if (!cancelled) {
          const members = data.data ?? [];
          setGroupMembers(members);
          setAttendanceValues(
            Object.fromEntries(
              members
                .filter((member) => member.role === "STUDENT")
                .map((member) => [
                  member.id,
                  String(member.attendancePercentage ?? 0),
                ])
            )
          );
        }
      } catch {
        if (!cancelled) {
          setGroupMembers([]);
          setAttendanceValues({});
        }
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    }

    loadMembers();
    return () => {
      cancelled = true;
    };
  }, [selectedGroupId]);

  useEffect(() => {
    if (messages.length === 0) {
      prevMessageCountRef.current = 0;
      return;
    }

    const isIncremental =
      messages.length > prevMessageCountRef.current &&
      prevMessageCountRef.current > 0;

    messagesEndRef.current?.scrollIntoView({
      behavior: isIncremental ? "smooth" : "auto",
      block: "end",
    });
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groupSearch, groups]);

  function sendMessage() {
    const content = newMessage.trim();
    if (!content || selectedGroupId == null) return;

    const storedUser = getStoredUser();
    if (!storedUser?.id) return;

    socket.emit("sendMessage", {
      content,
      senderId: storedUser.id,
      groupId: selectedGroupId,
    });

    emitStopTyping();
    setNewMessage("");
    setEmojiPickerOpen(false);
  }

  function handleSend(e) {
    e.preventDefault();
    sendMessage();
  }

  function openFilePicker() {
    if (!selectedGroup || fileUploadLoading) return;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const selectedFile = e.target.files?.[0];
    e.target.value = "";

    if (!selectedFile || !selectedGroup) return;

    setFileUploadLoading(true);
    setFileUploadError("");

    try {
      const uploaded = await uploadFile({
        groupId: selectedGroup.id,
        file: selectedFile,
      });
      setFiles((prev) => [uploaded, ...prev]);
    } catch (err) {
      setFileUploadError(
        err.response?.data?.message ?? "Failed to upload file."
      );
    } finally {
      setFileUploadLoading(false);
    }
  }

  function handleAttendanceValueChange(userId, value) {
    setAttendanceValues((prev) => ({
      ...prev,
      [userId]: value,
    }));
  }

  async function handleAttendanceSubmit(e, userId) {
    e.preventDefault();

    const rawValue = attendanceValues[userId];
    if (rawValue === "" || rawValue == null) return;

    setAttendanceUpdateUserId(userId);
    setAttendanceUpdateError("");

    try {
      const updated = await updateAttendance(userId, rawValue);
      setGroupMembers((prev) =>
        prev.map((member) =>
          member.id === updated.id
            ? {
                ...member,
                attendancePercentage: updated.attendancePercentage,
              }
            : member
        )
      );

      if (Number(updated.id) === Number(user?.id)) {
        setMyAttendance(updated);
      }
    } catch (err) {
      setAttendanceUpdateError(
        err.response?.data?.message ?? "Failed to update attendance."
      );
    } finally {
      setAttendanceUpdateUserId(null);
    }
  }

  function handleStudentImportFileChange(e) {
    const file = e.target.files?.[0] ?? null;
    setStudentImportFile(file);
    setStudentImportResult(null);
    setStudentImportError("");
  }

  async function handleStudentImportSubmit(e) {
    e.preventDefault();
    if (!studentImportFile || !canImportStudents) return;

    setStudentImportLoading(true);
    setStudentImportError("");
    setStudentImportResult(null);

    try {
      const result = await importStudents(studentImportFile);
      setStudentImportResult(result);
      setStudentImportFile(null);
    } catch (err) {
      setStudentImportError(
        err.response?.data?.message ?? "Failed to import students."
      );
    } finally {
      setStudentImportLoading(false);
    }
  }

  function handlePasswordFormChange(e) {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPasswordChangeError("");
    setPasswordChangeSuccess("");
  }

  async function handlePasswordChangeSubmit(e) {
    e.preventDefault();

    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword;
    const confirmPassword = passwordForm.confirmPassword;

    setPasswordChangeError("");
    setPasswordChangeSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordChangeError("All password fields are required.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordChangeError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordChangeError("New password and confirmation do not match.");
      return;
    }

    setPasswordChangeLoading(true);
    try {
      const response = await changePassword({
        currentPassword,
        newPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordChangeSuccess(
        response.message ?? "Password updated successfully."
      );
    } catch (err) {
      setPasswordChangeError(
        err.response?.data?.message ?? "Failed to update password."
      );
    } finally {
      setPasswordChangeLoading(false);
    }
  }

  function handleInputKeyDown(e) {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    sendMessage();
  }

  function handleMessageChange(e) {
    updateDraftMessage(e.target.value);
  }

  function toggleEmojiPicker() {
    if (selectedGroupId == null || groupsLoading) return;
    setEmojiPickerOpen((open) => !open);
  }

  function insertEmoji(emoji) {
    const input = messageInputRef.current;
    const start = input?.selectionStart ?? newMessage.length;
    const end = input?.selectionEnd ?? newMessage.length;
    const nextMessage =
      newMessage.slice(0, start) + emoji + newMessage.slice(end);
    const nextCursor = start + emoji.length;

    updateDraftMessage(nextMessage);
    setEmojiPickerOpen(false);

    requestAnimationFrame(() => {
      messageInputRef.current?.focus();
      messageInputRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  async function handleCreateAnnouncement(e) {
    e.preventDefault();
    if (!selectedGroup || !canCreateAnnouncements) return;

    const title = announcementTitle.trim();
    const content = announcementContent.trim();
    if (!title || !content) return;

    setAnnouncementCreateLoading(true);
    setAnnouncementCreateError("");

    try {
      const created = await createAnnouncement({
        groupId: selectedGroup.id,
        title,
        content,
      });
      setAnnouncements((prev) => [created, ...prev]);
      setAnnouncementTitle("");
      setAnnouncementContent("");
    } catch (err) {
      setAnnouncementCreateError(
        err.response?.data?.message ?? "Failed to create announcement."
      );
    } finally {
      setAnnouncementCreateLoading(false);
    }
  }

  function selectGroup(id) {
    setSelectedGroupId(id);
    setAnnouncementTitle("");
    setAnnouncementContent("");
    setAnnouncementCreateError("");
    setFileUploadError("");
    setAttendanceUpdateError("");
    setStudentImportFile(null);
    setStudentImportResult(null);
    setStudentImportError("");
    setPasswordChangeError("");
    setPasswordChangeSuccess("");
    setEmojiPickerOpen(false);
    setSidebarOpen(false);
  }

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const onChange = () => {
      setIsMobileLayout(media.matches);
      if (!media.matches) setSidebarOpen(false);
    };
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!sidebarOpen || !isMobile) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!emojiPickerOpen) return;

    const onPointerDown = (e) => {
      if (emojiPickerRef.current?.contains(e.target)) return;
      setEmojiPickerOpen(false);
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") setEmojiPickerOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [emojiPickerOpen]);

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-[#313338] text-[#f2f3f5]">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Groups sidebar — off-canvas on mobile, fixed column on md+ */}
      <aside
        id="groups-sidebar"
        aria-label="Groups"
        aria-hidden={isMobileLayout ? !sidebarOpen : false}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100vw,280px)] max-w-full flex-col border-r border-[#1e1f22]/80 bg-[#2b2d31] transition-transform duration-300 ease-out max-md:shadow-2xl md:static md:z-auto md:w-60 md:max-w-none md:translate-x-0 md:shadow-none ${
          sidebarOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
        }`}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#1e1f22]/60 px-4 shadow-sm">
          <h2 className="truncate text-sm font-semibold tracking-tight">
            CampusConnect
          </h2>
          <button
            type="button"
            aria-label="Close groups"
            className="rounded-md p-1.5 text-[#b5bac1] transition-colors hover:bg-[#3f4147] hover:text-[#f2f3f5] md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#949ba4]" />
            <input
              type="search"
              placeholder="Search groups"
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              className="w-full rounded-md border border-transparent bg-[#1e1f22] py-2 pl-9 pr-3 text-sm text-[#f2f3f5] placeholder:text-[#6d6f78] outline-none transition-all duration-200 hover:bg-[#232428] focus:border-[#5865f2]/50 focus:ring-2 focus:ring-[#5865f2]/25"
            />
          </div>
        </div>

        <div className="px-3 pb-1">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-[#949ba4]">
            Your groups
          </p>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
          {groupsLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#5865f2]" aria-hidden />
              <p className="text-sm text-[#949ba4]">Loading groups…</p>
            </div>
          ) : groupsError ? (
            <p
              role="alert"
              className="px-2 py-4 text-center text-sm text-[#f23f42]"
            >
              {groupsError}
            </p>
          ) : (
            <>
              {filteredGroups.map((group) => {
                const active = group.id === selectedGroupId;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => selectGroup(group.id)}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[15px] transition-all duration-150 ${
                      active
                        ? "bg-[#404249] text-white shadow-sm ring-1 ring-[#5865f2]/20"
                        : "text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]"
                    }`}
                  >
                    <Hash
                      className={`h-5 w-5 shrink-0 ${active ? "text-[#f2f3f5]" : "text-[#949ba4]"}`}
                    />
                    <span className="truncate font-medium">{group.name}</span>
                  </button>
                );
              })}
              <div className="mt-4 border-t border-[#3f4147] pt-4">
  <button
    onClick={() => setActivePanel("chat")}
    className="mb-2 block w-full rounded px-3 py-2 text-left text-[#dbdee1] hover:bg-[#404249]"
  >
    💬 Chat
  </button>

  <button
    onClick={() => setActivePanel("announcements")}
    className="mb-2 block w-full rounded px-3 py-2 text-left text-[#dbdee1] hover:bg-[#404249]"
  >
    📢 Announcements
  </button>

  <button
    onClick={() => setActivePanel("files")}
    className="mb-2 block w-full rounded px-3 py-2 text-left text-[#dbdee1] hover:bg-[#404249]"
  >
    📁 Files
  </button>

  <button
    onClick={() => setActivePanel("attendance")}
    className="mb-2 block w-full rounded px-3 py-2 text-left text-[#dbdee1] hover:bg-[#404249]"
  >
    📊 Attendance
  </button>

  <button
    onClick={() => setActivePanel("settings")}
    className="block w-full rounded px-3 py-2 text-left text-[#dbdee1] hover:bg-[#404249]"
  >
    ⚙ Settings
  </button>
</div>
              {filteredGroups.length === 0 && (
                <p className="px-2 py-4 text-center text-sm text-[#949ba4]">
                  {groups.length === 0
                    ? "No groups available yet."
                    : "No groups match your search."}
                </p>
              )}
            </>
          )}
        </nav>

        <div className="shrink-0 border-t border-[#1e1f22]/60 bg-[#232428] p-2">
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
            {user ? (
              <UserAvatar
                user={user}
                online={isUserOnline(user.id)}
                size="sm"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5865f2] text-xs font-bold text-white">
                You
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user?.name ?? "Student"}
              </p>
              <p className="truncate text-xs text-[#949ba4]">
                {user?.id != null && isUserOnline(user.id)
                  ? "Online"
                  : user?.rollNo ?? "Offline"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main chat — full width on mobile */}
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center gap-1.5 border-b border-[#1e1f22]/50 bg-[#313338] px-2 shadow-sm sm:gap-2 sm:px-3 md:px-4">
          <button
            type="button"
            aria-label="Open groups menu"
            aria-expanded={sidebarOpen}
            aria-controls="groups-sidebar"
            className="-ml-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[#b5bac1] transition-colors hover:bg-[#404249] hover:text-[#f2f3f5] active:bg-[#404249] md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <Hash className="hidden h-6 w-6 shrink-0 text-[#949ba4] sm:block" />
          <div className="min-w-0 flex-1">
            {groupsLoading ? (
              <>
                <div className="h-4 w-32 animate-pulse rounded bg-[#404249]" />
                <div className="mt-1.5 h-3 w-24 animate-pulse rounded bg-[#404249]/70" />
              </>
            ) : selectedGroup ? (
              <>
                <h1 className="truncate text-sm font-semibold sm:text-base">
                  {selectedGroup.name}
                </h1>
                <p className="truncate text-[11px] text-[#949ba4] sm:text-xs">
                  <span className="sm:hidden">
                    {selectedGroup.branch}
                  </span>
                  <span className="hidden sm:inline">
                    {selectedGroup.branch} · Year {selectedGroup.year}
                  </span>
                </p>
              </>
            ) : (
              <>
                <h1 className="truncate text-base font-semibold text-[#949ba4]">
                  Select a group
                </h1>
                <p className="truncate text-xs text-[#6d6f78]">
                  Choose a channel from the sidebar
                </p>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              aria-label="Members"
              aria-expanded={membersOpen}
              onClick={() => setMembersOpen((open) => !open)}
              className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-[#404249] hover:text-[#f2f3f5] sm:h-auto sm:w-auto sm:p-2 ${
                membersOpen
                  ? "bg-[#404249] text-[#f2f3f5]"
                  : "text-[#b5bac1]"
              }`}
            >
              <Users className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Pinned messages"
              className="hidden rounded-md p-2 text-[#b5bac1] transition-colors hover:bg-[#404249] hover:text-[#f2f3f5] sm:block"
            >
              <Pin className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Notifications"
              className="hidden rounded-md p-2 text-[#b5bac1] transition-colors hover:bg-[#404249] hover:text-[#f2f3f5] lg:block"
            >
              <Bell className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="More options"
              className="hidden h-10 w-10 items-center justify-center rounded-md text-[#b5bac1] transition-colors hover:bg-[#404249] hover:text-[#f2f3f5] max-sm:flex sm:p-2"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </header>

        {membersOpen && selectedGroup && (
          <div className="shrink-0 border-b border-[#1e1f22]/50 bg-[#2b2d31] px-2 py-2.5 sm:px-3 sm:py-3 md:px-4">
            <div className="w-full md:mx-auto md:max-w-4xl">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#949ba4]">
                  Members — {groupMembers.length}
                </p>
                <p className="text-xs text-[#949ba4]">
                  {groupMembers.filter((m) => isUserOnline(m.id)).length} online
                </p>
              </div>
              {membersLoading ? (
                <div className="flex items-center gap-2 py-2 text-sm text-[#949ba4]">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading members…
                </div>
              ) : groupMembers.length === 0 ? (
                <p className="text-sm text-[#949ba4]">No members in this group.</p>
              ) : (
                <ul className="flex max-h-36 flex-col gap-2 overflow-y-auto sm:max-h-32 sm:flex-row sm:flex-wrap">
                  {groupMembers.map((member) => {
                    const online = isUserOnline(member.id);
                    return (
                      <li
                        key={member.id}
                        className="flex items-center gap-2 rounded-md bg-[#313338] px-2.5 py-1.5 ring-1 ring-[#1e1f22]/60"
                      >
                        <UserAvatar user={member} online={online} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#f2f3f5]">
                            {member.name}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-[#949ba4]">
                            <PresenceDot online={online} />
                            {online ? "Online" : "Offline"}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth">
          <div className="w-full space-y-0.5 py-3 sm:py-4 md:mx-auto md:max-w-4xl">
            {!groupsLoading && selectedGroup && (
              <>
                <SettingsPanel
                  values={passwordForm}
                  loading={passwordChangeLoading}
                  error={passwordChangeError}
                  success={passwordChangeSuccess}
                  onChange={handlePasswordFormChange}
                  onSubmit={handlePasswordChangeSubmit}
                />
                {canImportStudents && (
                  <StudentImportPanel
                    fileName={studentImportFile?.name ?? ""}
                    loading={studentImportLoading}
                    result={studentImportResult}
                    error={studentImportError}
                    onFileChange={handleStudentImportFileChange}
                    onSubmit={handleStudentImportSubmit}
                  />
                )}
                {user?.role === "STUDENT" && (
                  <AttendancePanel
                    attendance={myAttendance}
                    loading={attendanceLoading}
                    error={attendanceError}
                  />
                )}
                {canEditAttendance && (
                  <AttendanceUpdatePanel
                    members={groupMembers.filter(
                      (member) => member.role === "STUDENT"
                    )}
                    values={attendanceValues}
                    loadingUserId={attendanceUpdateUserId}
                    error={attendanceUpdateError}
                    onValueChange={handleAttendanceValueChange}
                    onSubmit={handleAttendanceSubmit}
                  />
                )}
              </>
            )}
            {!groupsLoading && selectedGroup && (
              <AnnouncementPanel
                announcements={announcements}
                loading={announcementsLoading}
                error={announcementsError}
                canCreate={canCreateAnnouncements}
                title={announcementTitle}
                content={announcementContent}
                createLoading={announcementCreateLoading}
                createError={announcementCreateError}
                onTitleChange={setAnnouncementTitle}
                onContentChange={setAnnouncementContent}
                onSubmit={handleCreateAnnouncement}
              />
            )}
            {!groupsLoading && selectedGroup && (
              <FilesPanel
                files={files}
                loading={filesLoading}
                error={filesError}
              />
            )}
            {groupsLoading ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <Loader2
                  className="mb-4 h-10 w-10 animate-spin text-[#5865f2]"
                  aria-hidden
                />
                <p className="text-sm text-[#949ba4]">Loading channel…</p>
              </div>
            ) : !selectedGroup ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#404249]">
                  <Hash className="h-8 w-8 text-[#949ba4]" />
                </div>
                <h2 className="text-xl font-bold text-[#f2f3f5]">
                  No group selected
                </h2>
                <p className="mt-2 max-w-sm text-sm text-[#b5bac1]">
                  Pick a group from the sidebar to start chatting.
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#404249]">
                  <Hash className="h-8 w-8 text-[#949ba4]" />
                </div>
                <h2 className="text-xl font-bold text-[#f2f3f5]">
                  Welcome to #{selectedGroup.name}
                </h2>
                <p className="mt-2 max-w-sm text-sm text-[#b5bac1]">
                  This is the start of the channel. Say hello to your classmates.
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => {
                  const prev = messages[index - 1];
                  const isOwn =
                    user?.id != null &&
                    Number(msg.sender.id) === Number(user.id);
                  const showHeader =
                    !prev || prev.sender.id !== msg.sender.id;
                  return (
                    <MessageRow
                      key={msg.id}
                      message={msg}
                      showHeader={showHeader}
                      isOwn={isOwn}
                      isSenderOnline={isUserOnline(msg.sender.id)}
                    />
                  );
                })}
                <div ref={messagesEndRef} className="h-px shrink-0" aria-hidden />
              </>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 sm:px-3 sm:pb-4 md:px-4">
          {typingLabel && (
            <p
              className="mb-1.5 truncate px-1 text-xs italic text-[#949ba4] md:mx-auto md:max-w-4xl"
              role="status"
              aria-live="polite"
            >
              {typingLabel}
            </p>
          )}
          {fileUploadError && (
            <p
              className="mb-1.5 rounded-md border border-[#ed4245]/30 bg-[#ed4245]/10 px-3 py-2 text-xs text-[#f23f42] md:mx-auto md:max-w-4xl"
              role="alert"
            >
              {fileUploadError}
            </p>
          )}
          <form
            ref={emojiPickerRef}
            onSubmit={handleSend}
            className="relative flex w-full items-end gap-1.5 rounded-lg bg-[#383a40] px-2 py-1.5 shadow-inner ring-1 ring-[#1e1f22]/40 transition-shadow focus-within:ring-[#5865f2]/40 sm:gap-2 sm:px-3 sm:py-2 md:mx-auto md:max-w-4xl"
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,application/pdf,image/png,image/jpeg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
            />
            <button
              type="button"
              aria-label="Attach file"
              disabled={!selectedGroup || groupsLoading || fileUploadLoading}
              onClick={openFilePicker}
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[#b5bac1] transition-colors hover:text-[#f2f3f5] disabled:cursor-not-allowed disabled:opacity-40 sm:h-auto sm:w-auto sm:p-2"
            >
              {fileUploadLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Paperclip className="h-5 w-5" />
              )}
            </button>

            <input
              ref={messageInputRef}
              type="text"
              placeholder={
                selectedGroup
                  ? `Message #${selectedGroup.name}`
                  : "Select a group"
              }
              value={newMessage}
              onChange={handleMessageChange}
              onKeyDown={handleInputKeyDown}
              onBlur={() => emitStopTyping()}
              disabled={!selectedGroup || groupsLoading}
              className="min-h-[40px] min-w-0 flex-1 bg-transparent py-2 text-sm text-[#f2f3f5] placeholder:text-[#6d6f78] outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-[15px]"
            />

            {emojiPickerOpen && <EmojiPicker onSelect={insertEmoji} />}

            <button
              type="button"
              aria-label="Emoji"
              aria-expanded={emojiPickerOpen}
              aria-haspopup="dialog"
              disabled={!selectedGroup || groupsLoading}
              onClick={toggleEmojiPicker}
              className={`mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[#b5bac1] transition-colors hover:text-[#f2f3f5] disabled:cursor-not-allowed disabled:opacity-40 sm:h-auto sm:w-auto sm:p-2 ${
                emojiPickerOpen ? "bg-[#404249] text-[#f2f3f5]" : ""
              }`}
            >
              <Smile className="h-5 w-5" />
            </button>

            <button
              type="submit"
              disabled={!newMessage.trim() || !selectedGroup || groupsLoading}
              aria-label="Send message"
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#5865f2] text-white transition-all duration-200 hover:bg-[#4752c4] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#5865f2] sm:h-auto sm:w-auto sm:p-2"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
