import { Loader2 } from "lucide-react";
import { Paperclip } from "lucide-react";
export default function FilesPanel({ files, loading, error }) {
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
  