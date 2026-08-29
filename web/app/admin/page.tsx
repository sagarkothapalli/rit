"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AccessibilityControls from "@/components/AccessibilityControls";
import { DEFAULT_MODEL, MODEL_CATALOG, findModel, type ModelOption } from "@/lib/cage/models";

interface Status {
  configured: boolean;
  source: "admin" | "env" | null;
  envFallback: boolean;
  defaults: { baseUrl: string; model: string };
  models?: ModelOption[];
  meta: {
    live: boolean;
    baseUrl: string;
    modelFast: string;
    modelStrong: string;
    keyLast4: string;
    updatedAt: string | null;
  } | null;
}

function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.4 12S5.8 5.5 12 5.5 21.6 12 21.6 12 18.2 18.5 12 18.5 2.4 12 2.4 12Z" />
      <circle cx="12" cy="12" r="2.7" />
      {off ? <path d="M4 4l16 16" /> : null}
    </svg>
  );
}

function SecretField({
  value,
  onChange,
  placeholder,
  autoFocus,
  revealLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  revealLabel: string;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className={`relative ${className ?? ""}`}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        name={`secret-${revealLabel.toLowerCase().replace(/\s+/g, "-")}`}
        className="w-full rounded-xl border border-[var(--line-strong)] bg-[var(--glass-strong)] px-4 py-3 pr-12 font-mono text-[15px] outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10"
      />
      <button
        type="button"
        aria-label={show ? `Hide ${revealLabel}` : `Show ${revealLabel}`}
        aria-pressed={show}
        onClick={() => setShow((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[var(--fg-faint)] hover:text-[var(--fg)]"
      >
        <EyeIcon off={show} />
      </button>
    </div>
  );
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
  const catalog = status?.models?.length ? status.models : MODEL_CATALOG;
  const selected = useMemo(() => findModel(model) ?? catalog.find((m) => m.id === model), [catalog, model]);
  const savedProvider = findModel(status?.meta?.modelFast)?.provider;
  const canReuseKey = Boolean(status?.configured && selected && savedProvider === selected.provider);

  async function loadStatus(): Promise<boolean> {
    const res = await fetch("/api/admin/config", { cache: "no-store", credentials: "include" });
    if (res.status === 401) {
      setUnlocked(false);
      return false;
    }
    const data = (await res.json()) as Status;
    setStatus(data);
    setBaseUrl((v) => v || data.meta?.baseUrl || data.defaults.baseUrl);
    setModel((v) => v || data.meta?.modelFast || data.defaults.model);
    setUnlocked(true);
    return true;
  }

  useEffect(() => {
    let on = true;
    fetch("/api/admin/config", { cache: "no-store", credentials: "include" })
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
        credentials: "include",
        body: JSON.stringify({ pin: pin.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error === "WRONG_PIN" ? "Wrong PIN" : data.error || "Unlock failed");
      const ok = await loadStatus();
      if (!ok) {
        throw new Error("PIN accepted, but the session cookie did not stick. Open http://localhost:3000/admin and try again.");
      }
      setPin("");
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
        credentials: "include",
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
        credentials: "include",
        body: JSON.stringify({ action: action === "pause" ? "set-live" : action, ...(action === "pause" ? { live: false } : {}) }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Action failed");
      setMsg({ kind: "ok", text: action === "clear" ? "Key cleared. Gates now use the local fallback." : "Updated." });
      await loadStatus();
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Action failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen flex flex-col bg-[var(--bg)]">
      <div className="tricolour" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="utility-bar">
        <div className="site-container utility-inner">
          <span className="utility-notice">
            <span className="admin-tag">Admin</span>
            Model control room. Your key is stored on the server and never shown again.
          </span>
          <div className="utility-end">
            <div className="utility-links">
              <Link href="/request">Back to workspace</Link>
            </div>
            <AccessibilityControls />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl w-full px-6 py-12 space-y-6">
        <h1 className="font-display text-4xl font-medium tracking-tight">Gateway control</h1>
        <p className="text-[15px] text-[var(--fg-soft)] -mt-3">
          Choose the After Speech model, then paste the matching API key. Notes, exemption check,
          draft, and department explanation run live on
          <span className="font-mono text-[13px] mx-1 px-1.5 py-0.5 rounded bg-[var(--iris-tint)] text-[var(--iris)]">{selected?.label || model || "DeepSeek V4 Flash"}</span>
          for every visitor.
        </p>
        <p className="text-[13px] text-[var(--fg-faint)] -mt-3">
          Available: DeepSeek V4 Flash, Gemini 3.7, Gemini 3.6, Gemini 3.5, and Gemini 3.5 Flash Lite.
        </p>

        {!unlocked ? (
          <form onSubmit={unlock} className="paper p-7">
            <label className="block font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] mb-2">
              Admin PIN
            </label>
            <div className="flex gap-2.5">
              <SecretField
                value={pin}
                onChange={setPin}
                placeholder="Admin PIN"
                autoFocus
                revealLabel="PIN"
                className="flex-1"
              />
              <button type="submit" disabled={busy || !pin.trim()} className="brass-plate px-5 py-3 text-[14px] font-medium disabled:opacity-40">
                Unlock
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="paper p-6">
              <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] ${status?.configured && status.source === "admin" ? "border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]" : "border-[var(--amber)]/30 bg-[var(--amber)]/10 text-[var(--amber)]"}`}>
                {status?.source === "admin" ? `Live | admin key ${status?.meta?.keyLast4}` : status?.source === "env" ? "Live | environment fallback" : "Local fallback | no key"}
              </span>
              {status?.meta && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-2 text-[13px] text-[var(--fg-soft)]">
                  <div><span className="block text-[11px] text-[var(--fg-faint)]">Model</span>{status.meta.modelFast}</div>
                  <div className="min-w-0"><span className="block text-[11px] text-[var(--fg-faint)]">Base URL</span><span className="truncate block">{status.meta.baseUrl}</span></div>
                  <div><span className="block text-[11px] text-[var(--fg-faint)]">State</span>{status.meta.live ? "enabled" : "paused"}</div>
                  <div><span className="block text-[11px] text-[var(--fg-faint)]">Updated</span>{status.meta.updatedAt ? new Date(status.meta.updatedAt).toLocaleString() : "Not available"}</div>
                </div>
              )}
              {status?.meta && (
                <div className="mt-4 flex gap-2.5">
                  <button
                    onClick={() => act(status.meta?.live ? "pause" : "resume")}
                    disabled={busy}
                    className="rounded-full border border-[var(--line-strong)] bg-[var(--glass-strong)] px-3.5 py-1.5 text-[13px] text-[var(--fg-soft)] transition hover:text-[var(--fg)] hover:border-[color-mix(in_srgb,var(--iris)_45%,transparent)] disabled:opacity-40"
                  >
                    {status.meta.live ? "Pause and use local fallback" : "Resume"}
                  </button>
                  <button
                    onClick={() => act("clear")}
                    disabled={busy}
                    className="rounded-full border border-[var(--line-strong)] bg-[var(--glass-strong)] px-3.5 py-1.5 text-[13px] text-[var(--fg-soft)] transition hover:text-[var(--red)] hover:border-[color-mix(in_srgb,var(--red)_45%,transparent)] disabled:opacity-40"
                  >
                    Clear key
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={save} className="paper p-7 space-y-5">
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] mb-2">Model</label>
                <select
                  value={model || DEFAULT_MODEL}
                  onChange={(e) => {
                    const next = findModel(e.target.value);
                    setModel(e.target.value);
                    if (next) setBaseUrl(next.baseUrl);
                  }}
                  className="w-full rounded-xl border border-[var(--line-strong)] bg-[var(--glass-strong)] px-4 py-3 text-[15px] outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10"
                >
                  <optgroup label="Google Gemini">
                    {catalog.filter((m) => m.provider === "gemini").map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="DeepSeek (automatic fallback)">
                    {catalog.filter((m) => m.provider === "deepseek").map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </optgroup>
                  {model && !catalog.some((m) => m.id === model) ? <option value={model}>{model}</option> : null}
                </select>
                {selected?.hint ? (
                  <p className="mt-2 text-[12.5px] text-[var(--fg-faint)]">{selected.hint} · <span className="font-mono">{selected.id}</span></p>
                ) : null}
              </div>
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] mb-2">
                  {selected?.provider === "gemini" ? "Gemini API key" : "DeepSeek API key"}
                </label>
                <SecretField
                  value={apiKey}
                  onChange={setApiKey}
                  placeholder={selected?.provider === "gemini" ? "AIza…" : "sk-…"}
                  revealLabel="API key"
                />
                {canReuseKey && !apiKey ? (
                  <p className="mt-2 text-[12.5px] text-[var(--fg-faint)]">
                    Leave blank to keep the saved key and only switch the model.
                  </p>
                ) : selected?.provider === "gemini" ? (
                  <p className="mt-2 text-[12.5px] text-[var(--fg-faint)]">
                    Get a Gemini key from Google AI Studio. A DeepSeek key will not work here.
                  </p>
                ) : null}
              </div>
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] mb-2">Base URL</label>
                <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="w-full rounded-xl border border-[var(--line-strong)] bg-[var(--glass-strong)] px-4 py-3 font-mono text-[13px] outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10" />
              </div>
              <button type="submit" disabled={busy || (!apiKey && !canReuseKey)} className="brass-plate w-full py-3 text-[15px] font-medium disabled:opacity-40">
                {busy ? `Testing ${selected?.label || "the model"}…` : canReuseKey && !apiKey ? "Test & switch model" : "Test & save key"}
              </button>
            </form>

            <button
              onClick={() => fetch("/api/admin/session", { method: "DELETE", credentials: "include" }).then(() => setUnlocked(false))}
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg)] transition-colors"
            >
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
            Note: an environment variable key also exists on this deployment and acts as fallback when no admin key is saved.
          </p>
        )}
      </div>
    </main>
  );
}
