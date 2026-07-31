import { useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, MoreVertical, Trash2 } from "lucide-react";

function formatFileTime(iso) {
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

export default function FileCard({
  file,
  canDelete = false,
  isDeleting = false,
  deleteError = "",
  onDelete,
  onDownload,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const menuRef = useRef(null);
  const uploader = file.uploader ?? {
    id: file.uploadedBy,
    name: "Unknown user",
  };

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
    if (canDelete) return undefined;
    const timer = window.setTimeout(() => {
      setMenuOpen(false);
      setConfirmOpen(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [canDelete]);

  function handleMenuToggle(event) {
    event.preventDefault();
    event.stopPropagation();
    if (isDeleting) return;
    setConfirmOpen(false);
    setMenuOpen((open) => !open);
  }

  function handleDeleteClick(event) {
    event.preventDefault();
    event.stopPropagation();
    setMenuOpen(false);
    setConfirmOpen(true);
  }

  function handleConfirmCancel(event) {
    event.preventDefault();
    event.stopPropagation();
    setConfirmOpen(false);
  }

  function handleConfirmDelete(event) {
    event.preventDefault();
    event.stopPropagation();
    setConfirmOpen(false);
    onDelete?.(file);
  }

  async function handleDownload(event) {
    event.preventDefault();
    setDownloadError("");
    try {
      await onDownload?.(file);
    } catch (error) {
      setDownloadError(error.message ?? "Failed to download file.");
    }
  }

  return (
    <div
      className={`group relative flex min-w-0 flex-col rounded-lg border border-[#3f4147]/80 bg-[#2b2d31] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#5865f2]/60 hover:bg-[#32343a] hover:shadow-md ${
        isDeleting ? "opacity-60" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-3 p-3">
        <button
          type="button"
          onClick={handleDownload}
          aria-label={`Download ${file.fileName}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5865f2]/60"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#5865f2]/15 text-[#b8c0ff] ring-1 ring-[#5865f2]/25">
            <FileText className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#f2f3f5] group-hover:text-white">
              {file.fileName}
            </p>
            <p className="truncate text-xs text-[#949ba4]">
              {uploader.name} · {formatFileTime(file.createdAt)}
            </p>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#1e1f22] text-[#949ba4] transition-colors group-hover:text-[#f2f3f5]">
            <Download className="h-4 w-4" aria-hidden />
          </span>
        </button>

        {canDelete && (
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              aria-label="File actions"
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
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#f23f42] transition-colors hover:bg-[#ed4245] hover:text-white focus:outline-none focus-visible:bg-[#ed4245] focus-visible:text-white"
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
                aria-label="Confirm delete file"
                className="absolute right-0 z-40 mt-1 w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-[#1e1f22]/80 bg-[#2b2d31] p-3 shadow-2xl ring-1 ring-black/30"
              >
                <p className="text-sm font-semibold text-[#f2f3f5]">
                  Delete file?
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#b5bac1]">
                  This cannot be undone. The file will be removed for everyone
                  in this group.
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmCancel}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-[#dbdee1] transition-colors hover:bg-[#404249] hover:text-[#f2f3f5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5865f2]/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="rounded-md bg-[#da373c] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#a12828] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f23f42]/70"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {deleteError && (
        <p role="alert" className="px-3 pb-3 text-xs text-[#f23f42]">
          {deleteError}
        </p>
      )}
      {downloadError && (
        <p role="alert" className="px-3 pb-3 text-xs text-[#f23f42]">
          {downloadError}
        </p>
      )}
    </div>
  );
}
