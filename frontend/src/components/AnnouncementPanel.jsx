import { Megaphone } from "lucide-react";
import { Loader2 } from "lucide-react";
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
  <div
    key={announcement.id}
    className="rounded-lg border border-white/10 p-4"
  >
    <div className="font-semibold">
      {announcement.title}
    </div>

    <div className="text-sm opacity-80">
      {announcement.content}
    </div>
  </div>
))}
          </div>
        )}
      </section>
    );
  }
  