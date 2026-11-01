import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Client, WorkflowDef } from "../../server/types";
import { post } from "../api";
import { Modal } from "./ui";

/** Start a run of 1 workflow for 1 client (POST /runs). */
export function StartRunDialog({ workflow, clients, onClose, presetClient }: {
  workflow: WorkflowDef;
  clients: Client[];
  presetClient?: string;
  onClose: () => void;
}) {
  const eligible = clients.filter((c) => c.services.includes(workflow.service));
  const [clientId, setClientId] = useState(presetClient ?? eligible[0]?.id ?? "");
  const client = eligible.find((c) => c.id === clientId);
  const [markets, setMarkets] = useState<string[]>(client?.markets ?? []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const gates = workflow.steps.filter((s) => s.type === "gate");
  const risky = workflow.steps.filter((s) => s.tool && ["send", "spend", "write_external", "sign", "pay"].includes(s.tool.risk));

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const run = await post<{ id: string }>("/runs", { client_id: clientId, workflow_id: workflow.id, markets });
      onClose();
      nav(`/runs/${run.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Start ${workflow.id}`} onClose={onClose}>
      <p className="muted">{workflow.description}</p>
      {eligible.length === 0 ? (
        <div className="notice notice-warn">No client buys this service yet.</div>
      ) : (
        <>
          <label className="field">
            <span>Client</span>
            <select value={clientId} onChange={(e) => {
              setClientId(e.target.value);
              setMarkets(eligible.find((c) => c.id === e.target.value)?.markets ?? []);
            }}>
              {eligible.map((c) => <option key={c.id} value={c.id}>{c.name}{c.paused ? " (paused)" : ""}</option>)}
            </select>
          </label>
          <fieldset className="field">
            <legend>Markets</legend>
            <div className="row wrap">
              {client?.markets.map((m) => (
                <label key={m} className="check">
                  <input type="checkbox" checked={markets.includes(m)}
                    onChange={(e) => setMarkets(e.target.checked ? [...markets, m] : markets.filter((x) => x !== m))} />
                  {m}
                </label>
              ))}
            </div>
          </fieldset>
          <ul className="facts">
            <li><b>{workflow.steps.length}</b> steps</li>
            <li><b>{gates.length}</b> approval gates: {gates.map((g) => g.gate!.approval_kind).join(", ") || "none"}</li>
            <li><b>{risky.length}</b> steps that send, publish, spend, sign or pay. Each one waits for its gate.</li>
          </ul>
          {client?.paused && <div className="notice notice-warn">This client is paused. Steps that send, publish or spend will be held.</div>}
          {error && <div className="notice notice-bad">{error}</div>}
          <div className="row end">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={busy || !clientId || markets.length === 0} onClick={start}>Start run</button>
          </div>
        </>
      )}
    </Modal>
  );
}
