import { Loader2, Lock, Save } from "lucide-react";
export default function SettingsPanel({
  values,
  loading,
  error,
  success,
  onChange,
  onSubmit,
}) {
  return (
    <section className="mx-2 mb-4 rounded-lg border border-[#1e1f22]/70 bg-[#313338] p-3 shadow-sm ring-1 ring-white/[0.02] sm:mx-4 sm:p-4">
      <div className="mb-3 flex min-w-0 items-center gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#5865f2]/15 text-[#b8c0ff] ring-1 ring-[#5865f2]/25">
          <Lock className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-[#f2f3f5]">
            Account settings
          </h2>
          <p className="truncate text-xs text-[#949ba4]">
            Change your login password
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3">
        <input
          type="password"
          name="currentPassword"
          value={values.currentPassword}
          onChange={onChange}
          placeholder="Current password"
          autoComplete="current-password"
          aria-label="Current password"
          className="h-11 rounded-md border border-transparent bg-[#1e1f22] px-3 text-sm text-[#f2f3f5] placeholder:text-[#6d6f78] outline-none transition-all hover:bg-[#232428] focus:border-[#5865f2]/60 focus:ring-2 focus:ring-[#5865f2]/20"
        />
        <input
          type="password"
          name="newPassword"
          value={values.newPassword}
          onChange={onChange}
          placeholder="New password"
          autoComplete="new-password"
          aria-label="New password"
          className="h-11 rounded-md border border-transparent bg-[#1e1f22] px-3 text-sm text-[#f2f3f5] placeholder:text-[#6d6f78] outline-none transition-all hover:bg-[#232428] focus:border-[#5865f2]/60 focus:ring-2 focus:ring-[#5865f2]/20"
        />
        <input
          type="password"
          name="confirmPassword"
          value={values.confirmPassword}
          onChange={onChange}
          placeholder="Confirm new password"
          autoComplete="new-password"
          aria-label="Confirm new password"
          className="h-11 rounded-md border border-transparent bg-[#1e1f22] px-3 text-sm text-[#f2f3f5] placeholder:text-[#6d6f78] outline-none transition-all hover:bg-[#232428] focus:border-[#5865f2]/60 focus:ring-2 focus:ring-[#5865f2]/20"
        />

        <div className="sm:col-span-3 sm:flex sm:items-center sm:justify-between sm:gap-3">
          <div className="min-h-5 flex-1">
            {error && (
              <p className="rounded-md border border-[#ed4245]/30 bg-[#ed4245]/10 px-3 py-2 text-xs text-[#f23f42]" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-md border border-[#23a559]/30 bg-[#23a559]/10 px-3 py-2 text-xs text-[#57f287]" role="status">
                {success}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#5865f2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4752c4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8c0ff]/80 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#5865f2] sm:mt-0 sm:w-auto"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Update password
          </button>
        </div>
      </form>
    </section>
  );
}
