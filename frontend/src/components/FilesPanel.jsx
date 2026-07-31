import { Paperclip } from "lucide-react";
import FileCard from "./FileCard";

export default function FilesPanel({
  files,
  loading,
  error,
  canDeleteFile,
  deletingFileId,
  deleteErrorFileId,
  fileDeleteError,
  onDeleteFile,
  onDownloadFile,
}) {
  return (
    <section className="mx-2 mb-4 rounded-lg border border-[#1e1f22]/70 bg-[#313338] p-3 shadow-sm ring-1 ring-white/[0.02] sm:mx-4 sm:p-4">
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
        <div className="grid gap-2 sm:grid-cols-2" aria-label="Loading files">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-lg border border-[#3f4147]/70 bg-[#2b2d31] p-3"
            >
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-md bg-[#404249]" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-[#404249]" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-[#404249]/70" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p
          role="alert"
          className="rounded-lg border border-[#ed4245]/30 bg-[#ed4245]/10 px-3 py-3 text-sm text-[#f23f42]"
        >
          {error}
        </p>
      ) : files.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#3f4147] bg-[#2b2d31]/70 px-4 py-10 text-center text-sm text-[#949ba4]">
          <Paperclip className="mx-auto mb-3 h-8 w-8 text-[#b8c0ff]/80" aria-hidden />
          No files shared yet.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              canDelete={Boolean(canDeleteFile?.(file))}
              isDeleting={Number(deletingFileId) === Number(file.id)}
              deleteError={
                Number(deleteErrorFileId) === Number(file.id)
                  ? fileDeleteError
                  : ""
              }
              onDelete={onDeleteFile}
              onDownload={onDownloadFile}
            />
          ))}
        </div>
      )}
    </section>
  );
}
