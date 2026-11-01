import { useState } from "react";
import type { ApprovalItem, Decision } from "../../server/types";
import { post } from "../api";

/** Approve, request changes or reject (POST /approvals/{id}/decisions). */
export function DecidePanel({ item, onDone }: { item: ApprovalItem; onDone: (msg: string, tone?: string) => void }) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const approvedBy = item.decisions.filter((d) => d.decision === "approved");

  async function decide(decision: Decision) {
    setBusy(true);
    setError(null);
    try {
      const out = await post<ApprovalItem>(`/approvals/${item.id}/decisions`, { decision, comment: comment || undefined });
      const left = out.required_count - out.decisions.filter((d) => d.decision === "approved").length;
      onDone(out.status === "open" ? `Recorded. ${left} more approval needed from another person.` : `Item ${out.status.replace("_", " ")}`);
      setComment("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (item.status !== "open") return <div className="notice">This item is {item.status.replace("_", " ")}.</div>;
  return (
    <div className="decide">
      {item.required_count > 1 && (
        <div className="notice">Needs {item.required_count} different people. Approved so far: {approvedBy.length ? approvedBy.map((d) => d.role).join(", ") : "nobody"}.</div>
      )}
      {item.compliance?.outcome === "block" && (
        <div className="notice notice-bad">Compliance found a claim that is not approved yet (block). This gate is where a person approves or rejects the claim (guardrail G3).</div>
      )}
      <label className="field">
        <span>Comment (needed for changes)</span>
        <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What should the agent change?" />
      </label>
      {error && <div className="notice notice-bad">{error}</div>}
      <div className="row">
        <button className="btn btn-good" disabled={busy} onClick={() => decide("approved")}>Approve</button>
        <button className="btn" disabled={busy} onClick={() => decide("changes_requested")}>Request changes</button>
        <button className="btn btn-bad" disabled={busy} onClick={() => decide("rejected")}>Reject</button>
      </div>
    </div>
  );
}
