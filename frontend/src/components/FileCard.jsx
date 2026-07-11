import { Download, FileText } from "lucide-react";
import { resolveFileUrl } from "../services/fileService.js";

function formatFileTime(iso) {
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

export default function FileCard({ file }) {
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
