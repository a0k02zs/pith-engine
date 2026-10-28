import { scoreLead, type ClientIcp, type ContactProfile, type EngagementEvent, type ScoreModel } from "./score.js";

/**
 * Actions of the service-local tool `crm_ops`: pure functions in this package that a workflow `tool` step runs.
 * They read only their input, so their risk is `read`, except publishing a model version (write_internal).
 */
export const localTools = {
  "score.calculate": (input: { contact: ContactProfile; events: EngagementEvent[]; icp: ClientIcp; now: string; model?: ScoreModel }) =>
    scoreLead(input.contact, input.events, input.icp, new Date(input.now), input.model),
  "score_model.publish_version": (input: { model: ScoreModel; approval_id: string }) => {
    if (!input.approval_id) throw new Error("A score model version needs an approved G3 decision");
    return { model_id: input.model.model_id, version: input.model.version, approval_id: input.approval_id };
  },
} as const;

export type LocalAction = keyof typeof localTools;
