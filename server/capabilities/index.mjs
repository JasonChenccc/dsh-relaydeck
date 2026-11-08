// RelayDeck — capability registry.
//
// A capability is one independently usable ability on one platform, in one of
// three stages: "source" produces items, "filter" narrows items, "action"
// consumes items. Adding a platform means registering capabilities; every
// existing flow can then reference them without code changes.
const registry = new Map();

export function register(capability) {
  if (!capability || typeof capability.id !== "string") throw new Error("capability needs an id");
  if (!["source", "filter", "action"].includes(capability.stage)) throw new Error("capability " + capability.id + " has an invalid stage");
  if (typeof capability.run !== "function") throw new Error("capability " + capability.id + " needs a run()");
  registry.set(capability.id, capability);
  return capability;
}

export function registerAll(list) {
  for (const capability of list) register(capability);
}

export function get(id) {
  return registry.get(id);
}

export function list() {
  return [...registry.values()].map((c) => ({
    id: c.id,
    platform: c.platform,
    stage: c.stage,
    title: c.title,
    description: c.description,
    params: c.params || {}
  }));
}

export function byStage(stage) {
  return list().filter((c) => c.stage === stage);
}
