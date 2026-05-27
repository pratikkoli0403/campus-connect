import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Hash, Lock, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [rollNo, setRollNo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(rollNo, password);
      navigate("/chat");
    } catch (err) {
      const message =
        err.response?.data?.message ??
        (err.request
          ? "Unable to reach the server. Check your connection."
          : "Login failed. Please try again.");
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#1e1f22] text-[#f2f3f5]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(88,101,242,0.18),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-1/3 h-72 w-72 rounded-full bg-[#5865f2]/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-1/4 h-64 w-64 rounded-full bg-[#5865f2]/8 blur-3xl"
        aria-hidden
      />

      <main className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5865f2] shadow-lg shadow-[#5865f2]/25 transition-transform duration-300 hover:scale-105">
              <GraduationCap className="h-7 w-7 text-white" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">CampusConnect</h1>
            <p className="mt-1 text-sm text-[#b5bac1]">
              Sign in with your campus credentials
            </p>
          </div>

          <div className="rounded-xl border border-[#3f4147]/80 bg-[#2b2d31] p-8 shadow-2xl shadow-black/40 backdrop-blur-sm transition-shadow duration-300 hover:shadow-[#5865f2]/5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="rollNo"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#b5bac1]"
                >
                  Roll number
                </label>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#949ba4]" />
                  <input
                    id="rollNo"
                    type="text"
                    autoComplete="username"
                    placeholder="e.g. 21CS001"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    required
                    className="w-full rounded-md border border-transparent bg-[#1e1f22] py-2.5 pl-10 pr-3 text-[#f2f3f5] placeholder:text-[#6d6f78] outline-none transition-all duration-200 hover:bg-[#232428] focus:border-[#5865f2] focus:ring-2 focus:ring-[#5865f2]/30"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#b5bac1]"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#949ba4]" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-md border border-transparent bg-[#1e1f22] py-2.5 pl-10 pr-3 text-[#f2f3f5] placeholder:text-[#6d6f78] outline-none transition-all duration-200 hover:bg-[#232428] focus:border-[#5865f2] focus:ring-2 focus:ring-[#5865f2]/30"
                  />
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-[#ed4245]/30 bg-[#ed4245]/10 px-3 py-2 text-sm text-[#f23f42]"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-md bg-[#5865f2] py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#4752c4] hover:shadow-lg hover:shadow-[#5865f2]/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#5865f2] disabled:hover:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Log in"
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-[#6d6f78]">
            Your campus community, one place to connect.
          </p>
        </div>
      </main>
    </div>
  );
}
