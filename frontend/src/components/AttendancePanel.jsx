import { Gauge, Loader2, Save } from "lucide-react";
function formatAttendance(value) {
    const percentage = Number(value ?? 0);
    return `${Number.isInteger(percentage) ? percentage : percentage.toFixed(2)}%`;
  }
  
export default function AttendancePanel({ attendance, loading, error }) {
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