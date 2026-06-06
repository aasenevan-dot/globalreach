import { useState, useEffect } from "react";
import { Globe, Lock, ArrowRight } from "lucide-react";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "open" | "locked" | "authenticated">("loading");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if the session already has auth
    const stored = sessionStorage.getItem("gr_auth");
    if (stored === "1") { setStatus("authenticated"); return; }

    fetch("/api/auth/status")
      .then(r => r.json())
      .then(d => {
        if (!d.protected) setStatus("open");
        else setStatus("locked");
      })
      .catch(() => setStatus("open"));
  }, []);

  const handleLogin = async () => {
    setError("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (r.ok) {
        sessionStorage.setItem("gr_auth", "1");
        setStatus("authenticated");
      } else {
        setError("Wrong password. Try again.");
      }
    } catch {
      setError("Connection error.");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2 text-gray-500">
          <Globe className="h-5 w-5" /> Loading...
        </div>
      </div>
    );
  }

  if (status === "open" || status === "authenticated") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src="/logo-transparent.png" alt="GlobalReach" className="h-12 w-auto" />
          </div>
          <p className="text-gray-500 text-sm">Enter your password to access the dashboard.</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 bg-gray-800/50 rounded-xl px-4 py-3 border border-gray-700 focus-within:border-teal-500/50 transition-colors">
            <Lock className="h-4 w-4 text-gray-500 shrink-0" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleLogin(); }}
              placeholder="Password"
              autoFocus
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-600"
            />
          </div>
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            Sign In <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <p className="text-center text-gray-700 text-xs mt-6">
          Set your password in Settings to enable this gate.
        </p>
      </div>
    </div>
  );
}
