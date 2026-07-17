import { useEffect, useRef, useState } from "react";
import { Loader2, Megaphone, MoreVertical, Trash2 } from "lucide-react";

function formatAnnouncementTime(iso) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function AnnouncementCard({
  announcement,
  canDelete,
  isDeleting,
  deleteError,
  onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const menuRef = useRef(null);
  const creator = announcement.creator;

  useEffect(() => {
    if (!menuOpen && !confirmOpen) return;

    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
        setConfirmOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setConfirmOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, confirmOpen]);

  useEffect(() => {
    if (!canDelete) {
      setMenuOpen(false);
      setConfirmOpen(false);
    }
  }, [canDelete]);

  function handleMenuToggle(event) {
    event.stopPropagation();
    if (isDeleting) return;
    setConfirmOpen(false);
    setMenuOpen((open) => !open);
  }

  function handleDeleteClick(event) {
    event.stopPropagation();
    setMenuOpen(false);
    setConfirmOpen(true);
  }

  function handleConfirmCancel(event) {
    event.stopPropagation();
    setConfirmOpen(false);
  }

  function handleConfirmDelete(event) {
    event.stopPropagation();
    setConfirmOpen(false);
    onDelete?.(announcement);
  }

  return (
    <article
      className={`group relative rounded-lg border border-[#3f4147]/80 bg-[#2b2d31] p-3 transition-opacity ${
        isDeleting ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#f2f3f5]">
              {announcement.title}
            </h3>
            {canDelete && (
              <div ref={menuRef} className="relative shrink-0">
                <button
                  type="button"
                  aria-label="Announcement actions"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen || confirmOpen}
                  disabled={isDeleting}
                  onClick={handleMenuToggle}
                  className={`flex h-7 w-7 items-center justify-center rounded-md text-[#b5bac1] transition-all hover:bg-[#1e1f22]/80 hover:text-[#f2f3f5] focus:bg-[#1e1f22]/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5865f2]/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                    menuOpen || confirmOpen || isDeleting
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                  }`}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <MoreVertical className="h-4 w-4" aria-hidden />
                  )}
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 z-30 mt-1 min-w-[10.5rem] overflow-hidden rounded-md border border-[#1e1f22]/80 bg-[#111214] py-1 shadow-xl ring-1 ring-black/30"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleDeleteClick}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#f23f42] transition-colors hover:bg-[#ed4245] hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      Delete
                    </button>
                  </div>
                )}

                {confirmOpen && (
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Confirm delete announcement"
                    className="absolute right-0 z-40 mt-1 w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-[#1e1f22]/80 bg-[#2b2d31] p-3 shadow-2xl ring-1 ring-black/30"
                  >
                    <p className="text-sm font-semibold text-[#f2f3f5]">
                      Delete announcement?
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#b5bac1]">
                      This cannot be undone. The announcement will be removed
                      for everyone in this group.
                    </p>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmCancel}
                        className="rounded-md px-2.5 py-1.5 text-xs font-medium text-[#dbdee1] transition-colors hover:bg-[#404249] hover:text-[#f2f3f5]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDelete}
                        className="rounded-md bg-[#da373c] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#a12828]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#dbdee1]">
            {announcement.content}
          </p>

          <p className="mt-2 truncate text-xs text-[#949ba4]">
            {creator?.name ?? "Unknown"}
            {announcement.createdAt
              ? ` · ${formatAnnouncementTime(announcement.createdAt)}`
              : ""}
          </p>

          {deleteError && (
            <p role="alert" className="mt-2 text-xs text-[#f23f42]">
              {deleteError}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export default function AnnouncementPanel({
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
  canDeleteAnnouncement,
  deletingAnnouncementId,
  deleteErrorAnnouncementId,
  announcementDeleteError,
  onDeleteAnnouncement,
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
              canDelete={Boolean(canDeleteAnnouncement?.(announcement))}
              isDeleting={
                Number(deletingAnnouncementId) === Number(announcement.id)
              }
              deleteError={
                Number(deleteErrorAnnouncementId) === Number(announcement.id)
                  ? announcementDeleteError
                  : ""
              }
              onDelete={onDeleteAnnouncement}
            />
          ))}
        </div>
      )}
    </section>
  );
}
