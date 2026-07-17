import { Gauge } from "lucide-react";
function formatAttendance(value) {
    const percentage = Number(value ?? 0);
    return `${Number.isInteger(percentage) ? percentage : percentage.toFixed(2)}%`;
  }
  
export default function AttendancePanel({ attendance, loading, error }) {
    const percentage = attendance?.attendancePercentage ?? 0;
  
    return (
      <section className="mx-2 mb-4 rounded-lg border border-[#1e1f22]/70 bg-[#313338] p-3 shadow-sm ring-1 ring-white/[0.02] sm:mx-4 sm:p-4">
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
              <p className="mt-1 text-sm text-[#f23f42]" role="alert">{error}</p>
            ) : (
              <p className="mt-0.5 text-3xl font-bold leading-none text-[#f2f3f5]">
                {formatAttendance(percentage)}
              </p>
            )}
          </div>
        </div>
        {!loading && !error && (
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#1e1f22] ring-1 ring-black/20">
            <div
              className="h-full rounded-full bg-[#23a559] transition-[width] duration-300"
              style={{ width: `${Math.min(Math.max(Number(percentage), 0), 100)}%` }}
            />
          </div>
        )}
      </section>
    );
  }
