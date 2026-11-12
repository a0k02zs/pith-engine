import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api, HttpError } from "../api";

export interface Session { protected: boolean; signed_in: boolean }

/** Shows the sign-in form when the server has an access code and this browser has no session. */
export function AccessGate({ children }: { children: (session: Session, signOut: () => void) => ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Session>("/session").then(setSession).catch(() => setSession({ protected: false, signed_in: true }));
    const out = () => setSession((s) => (s?.protected ? { protected: true, signed_in: false } : s));
    window.addEventListener("pith:signed-out", out);
    return () => window.removeEventListener("pith:signed-out", out);
  }, []);

  if (!session) return <div className="gate"><p className="muted">Loading…</p></div>;
  if (session.signed_in) {
    const signOut = () => void api<Session>("/session", { method: "DELETE" }).then(setSession);
    return <>{children(session, signOut)}</>;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setSession(await api<Session>("/session", { method: "POST", body: JSON.stringify({ code }) }));
      setCode("");
    } catch (err) {
      setError(err instanceof HttpError ? err.message : "The server did not answer. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gate">
      <form className="card gate-card" onSubmit={submit}>
        <div className="gate-brand"><span className="logo" aria-hidden>P</span><b>Pith Command Centre</b></div>
        <label htmlFor="access-code">Access code</label>
        <input id="access-code" type="password" autoComplete="current-password" autoFocus required value={code} onChange={(e) => setCode(e.target.value)} aria-describedby={error ? "access-error" : undefined} />
        {error && <p id="access-error" className="bad-text" role="alert">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy || !code}>{busy ? "Checking…" : "Sign in"}</button>
        <p className="small muted">Ask the Pith operations lead for the code.</p>
      </form>
    </div>
  );
}
