"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Status {
  configured: boolean;
  source: "admin" | "env" | null;
  envFallback: boolean;
  defaults: { baseUrl: string; model: string };
  meta: {
    live: boolean;
    baseUrl: string;
    modelFast: string;
    modelStrong: string;
    keyLast4: string;
    updatedAt: string | null;
  } | null;
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function loadStatus() {
    const res = await fetch("/api/admin/config", { cache: "no-store" });
    if (res.status === 401) {
      setUnlocked(false);
      return;
    }
    const data = (await res.json()) as Status;
    setStatus(data);
    if (!baseUrl) setBaseUrl(data.meta?.baseUrl || data.defaults.baseUrl);
    if (!model) setModel(data.meta?.modelFast || data.defaults.model);
    setUnlocked(true);
  }

  useEffect(() => {
    let on = true;
    fetch("/api/admin/config", { cache: "no-store" })
      .then(async (res) => (res.status === 401 ? null : ((await res.json()) as Status)))
      .then((data) => {
        if (!on || !data) return;
        setStatus(data);
        setBaseUrl((v) => v || data.meta?.baseUrl || data.defaults.baseUrl);
        setModel((v) => v || data.meta?.modelFast || data.defaults.model);
        setUnlocked(true);
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) throw new Error("Wrong PIN");
      setPin("");
      await loadStatus();
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Unlock failed" });
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", apiKey, baseUrl, model }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Save failed");
      setApiKey("");
      setMsg({ kind: "ok", text: `Key saved and verified. Gateway replied: ${String(data.testReply).slice(0, 80)}` });
      await loadStatus();
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setBusy(false);
    }
  }

  async function act(action: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action === "pause" ? "set-live" : action, ...(action === "pause" ? { live: false } : {}) }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Action failed");
      setMsg({ kind: "ok", text: action === "clear" ? "Key cleared — gates run simulated." : "Updated." });
      await loadStatus();
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Action failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen flex flex-col">
      <div className="w-full border-b border-[var(--line)] bg-[var(--glass)] backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-6 py-2 flex items-center gap-2.5 text-[13px] text-[var(--fg-soft)]">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--amber)]">Admin</span>
          <span>Model control room. Your key is stored server-side and never shown again.</span>
          <Link href="/demo" className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--iris)] hover:underline shrink-0">
            ← Console
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl w-full px-6 py-12 space-y-6">
        <h1 className="font-display text-4xl font-medium tracking-tight">Gateway control</h1>
        <p className="text-[15px] text-[var(--fg-soft)] -mt-3">
          Paste your GMI Cloud gateway key once. Every gate on the console then runs LIVE on
          <span className="font-mono text-[13px] mx-1 px-1.5 py-0.5 rounded bg-[var(--iris-tint)] text-[var(--iris)]">{model || "minimax/minimax-m3"}</span>
          through the gateway — for all visitors.
        </p>

        {!unlocked ? (
          <form onSubmit={unlock} className="paper p-7">
            <label className="block font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] mb-2">
              Admin PIN
            </label>
            <div className="flex gap-2.5">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="demo pin: 123456"
                autoFocus
                className="flex-1 rounded-xl border border-[var(--line-strong)] bg-[var(--glass-strong)] px-4 py-3 text-[15px] outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10"
              />
              <button type="submit" disabled={busy || !pin} className="brass-plate px-5 py-3 text-[14px] font-medium disabled:opacity-40">
                Unlock
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="paper p-6">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${status?.configured && status.source === "admin" ? "border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]" : "border-[var(--amber)]/30 bg-[var(--amber)]/10 text-[var(--amber)]"}`}>
                {status?.source === "admin" ? `Live · admin key ····${status?.meta?.keyLast4}` : status?.source === "env" ? "Live · env fallback" : "Simulated · no key"}
              </span>
              {status?.meta && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-2 text-[13px] text-[var(--fg-soft)]">
                  <div><span className="block text-[11px] text-[var(--fg-faint)]">Model</span>{status.meta.modelFast}</div>
                  <div className="min-w-0"><span className="block text-[11px] text-[var(--fg-faint)]">Base URL</span><span className="truncate block">{status.meta.baseUrl}</span></div>
                  <div><span className="block text-[11px] text-[var(--fg-faint)]">State</span>{status.meta.live ? "enabled" : "paused"}</div>
                  <div><span className="block text-[11px] text-[var(--fg-faint)]">Updated</span>{status.meta.updatedAt ? new Date(status.meta.updatedAt).toLocaleString() : "—"}</div>
                </div>
              )}
              {status?.meta && (
                <div className="mt-4 flex gap-2.5">
                  <button onClick={() => act(status.meta?.live ? "pause" : "resume")} disabled={busy} className="btn-chip">
                    {status.meta.live ? "Pause (revert to simulated)" : "Resume"}
                  </button>
                  <button onClick={() => act("clear")} disabled={busy} className="btn-chip btn-danger">
                    Clear key
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={save} className="paper p-7 space-y-5">
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] mb-2">
                  GMI Cloud API key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="vck_… or gateway key"
                  autoComplete="off"
                  className="w-full rounded-xl border border-[var(--line-strong)] bg-[var(--glass-strong)] px-4 py-3 font-mono text-[14px] outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] mb-2">Model</label>
                  <input value={model} onChange={(e) => setModel(e.target.value)} className="w-full rounded-xl border border-[var(--line-strong)] bg-[var(--glass-strong)] px-4 py-3 font-mono text-[13px] outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10" />
                </div>
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] mb-2">Base URL</label>
                  <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="w-full rounded-xl border border-[var(--line-strong)] bg-[var(--glass-strong)] px-4 py-3 font-mono text-[13px] outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10" />
                </div>
              </div>
              <button type="submit" disabled={busy || !apiKey} className="brass-plate w-full py-3 text-[15px] font-medium disabled:opacity-40">
                {busy ? "Testing against the gateway…" : "Test & save key"}
              </button>
            </form>

            <button onClick={() => fetch("/api/admin/session", { method: "DELETE" }).then(() => setUnlocked(false))} className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg)] transition-colors">
              Lock panel
            </button>
          </>
        )}

        {msg && (
          <p className={`text-[13.5px] rounded-xl border px-4 py-3 ${msg.kind === "ok" ? "border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]" : "border-[var(--red)]/30 bg-[var(--red)]/10 text-[var(--red)]"}`}>
            {msg.text}
          </p>
        )}

        {!status?.configured && status?.envFallback && (
          <p className="text-[13px] text-[var(--fg-faint)]">
            Note: an env-var LLM key also exists on this deployment and acts as fallback when no admin key is saved.
          </p>
        )}
      </div>

      <style jsx global>{`
        .btn-chip {
          border-radius: 999px;
          border: 1px solid var(--line-strong);
          background: var(--glass-strong);
          padding: 6px 14px;
          font-size: 13px;
          color: var(--fg-soft);
          transition: all 150ms ease;
        }
        .btn-chip:hover:not(:disabled) { color: var(--fg); border-color: color-mix(in srgb, var(--iris) 45%, transparent); }
        .btn-danger:hover:not(:disabled) { color: var(--red); border-color: color-mix(in srgb, var(--red) 45%, transparent); }
      `}</style>
    </main>
  );
}
