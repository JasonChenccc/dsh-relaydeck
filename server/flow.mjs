// RelayDeck — the flow engine.
//
// A flow is: source -> filters[] -> actions[]. One execution is a run; every
// stage execution is a step. Runs and steps are persisted so a run can be
// inspected, explained and retried — that trace is the product's backbone.
import { nowIso } from "./db.mjs";
import { get as getCapability } from "./capabilities/index.mjs";
import { errorText } from "./log.mjs";

/** Validate and normalize a raw flow spec. Throws with a readable reason. */
export function validateSpec(raw) {
  const spec = raw && typeof raw === "object" ? raw : {};
  const source = spec.source;
  if (!source || typeof source.capability !== "string" || source.capability.length === 0) {
    throw new Error("flow.source.capability is required");
  }
  const filters = Array.isArray(spec.filters) ? spec.filters : [];
  const actions = Array.isArray(spec.actions) ? spec.actions : [];
  for (const node of [source, ...filters, ...actions]) {
    if (!node || typeof node.capability !== "string" || node.capability.length === 0) {
      throw new Error("every flow node needs a capability");
    }
  }
  return { source, filters, actions };
}

function insertStep(db, runId, seq, stage, capabilityId, inCount) {
  const info = db.prepare(
    "INSERT INTO run_steps (run_id, seq, stage, capability, state, in_count, started_at) VALUES (?, ?, ?, ?, 'running', ?, ?)"
  ).run(runId, seq, stage, capabilityId, inCount, nowIso());
  return Number(info.lastInsertRowid);
}

function finishStep(db, stepId, state, outCount, detail, error) {
  db.prepare("UPDATE run_steps SET state = ?, out_count = ?, detail = ?, error = ?, ended_at = ? WHERE id = ?")
    .run(state, outCount, detail || "", error || "", nowIso(), stepId);
}

/**
 * Execute one flow.
 * @returns the finished run row, including per-stage step records.
 */
export async function executeFlow({ db, spec, flow, trigger, dataDir }) {
  const parsed = validateSpec(spec);
  const flowId = flow ? flow.id : null;
  const flowName = flow ? flow.name : (spec && spec.name ? String(spec.name) : "(inline)");
  const startedAt = nowIso();
  const info = db.prepare(
    "INSERT INTO runs (flow_id, flow_name, state, trigger, started_at) VALUES (?, ?, 'running', ?, ?)"
  ).run(flowId, flowName, trigger || "manual", startedAt);
  const run = { id: Number(info.lastInsertRowid), flow_id: flowId, flow_name: flowName };

  let seq = 0;
  let items = [];
  let found = 0;
  let saved = 0;

  const runStage = async (stage, node) => {
    seq += 1;
    const capabilityId = String(node.capability);
    const stepId = insertStep(db, run.id, seq, stage, capabilityId, items.length);
    const capability = getCapability(capabilityId);
    try {
      if (!capability) throw new Error("unknown capability: " + capabilityId);
      if (capability.stage !== stage) {
        throw new Error(capabilityId + " is a " + capability.stage + " capability but was used as " + stage);
      }
      const outcome = await capability.run({ db, params: node.params || {}, items, run, dataDir });
      const produced = Array.isArray(outcome) ? outcome : items;
      const summary = Array.isArray(outcome) ? null : (outcome || {});
      const detail = summary ? String(summary.detail || "") : "";
      if (summary && typeof summary.saved === "number") saved += summary.saved;
      items = produced;
      finishStep(db, stepId, "ok", items.length, detail, "");
      return;
    } catch (error) {
      finishStep(db, stepId, "failed", 0, "", errorText(error));
      throw error;
    }
  };

  try {
    await runStage("source", parsed.source);
    found = items.length;
    for (const filter of parsed.filters) {
      await runStage("filter", filter);
      if (items.length === 0) break;
    }
    for (const action of parsed.actions) await runStage("action", action);

    db.prepare("UPDATE runs SET state = 'ok', ended_at = ?, found = ?, kept = ?, saved = ? WHERE id = ?")
      .run(nowIso(), found, items.length, saved, run.id);
    if (flowId !== null) {
      db.prepare("UPDATE flows SET last_run_at = ?, last_state = 'ok', updated_at = ? WHERE id = ?")
        .run(nowIso(), nowIso(), flowId);
    }
  } catch (error) {
    db.prepare("UPDATE runs SET state = 'failed', ended_at = ?, found = ?, kept = ?, saved = ?, error = ? WHERE id = ?")
      .run(nowIso(), found, items.length, saved, errorText(error), run.id);
    if (flowId !== null) {
      db.prepare("UPDATE flows SET last_run_at = ?, last_state = 'failed', updated_at = ? WHERE id = ?")
        .run(nowIso(), nowIso(), flowId);
    }
  }

  return readRun(db, run.id);
}

export function readRun(db, runId) {
  const run = db.prepare("SELECT * FROM runs WHERE id = ?").get(runId);
  if (!run) return null;
  run.steps = db.prepare("SELECT * FROM run_steps WHERE run_id = ? ORDER BY seq").all(runId);
  return run;
}

export function readFlow(db, flowId) {
  const row = db.prepare("SELECT * FROM flows WHERE id = ?").get(flowId);
  if (!row) return null;
  let spec = {};
  try { spec = JSON.parse(row.spec_json); } catch (e) { spec = {}; }
  return { ...row, spec, enabled: row.enabled === 1 };
}
