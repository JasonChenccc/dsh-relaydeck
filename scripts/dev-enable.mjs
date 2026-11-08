// Switch a DSH profile to dev-source loading of this plugin and enable HMR watching.
//
//   node scripts/dev-enable.mjs                 # dry run: report the planned changes
//   node scripts/dev-enable.mjs --apply         # back up the profile, then apply
//
// It (1) links this source directory into the profile instead of a packed tgz,
// (2) ensures the plugin is in the profile bundles, and (3) adds an hmr entry with
// root watching + a 300 ms debounce. Every touched file is backed up first.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = join(here, "..");
const pkg = JSON.parse(readFileSync(join(pluginRoot, "package.json"), "utf8"));
const pkgName = pkg.name;
const entryId = "dsh-relaydeck";
const profileName = process.argv.find((a) => a.startsWith("--profile="))?.slice("--profile=".length) || "desktop";
const apply = process.argv.includes("--apply");
const linkSpec = "link:" + pluginRoot.replace(/\\/g, "/");
const profileDir = join(homedir(), ".dsh", "profiles", profileName);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

const pkgPath = join(profileDir, "package.json");
const patchPath = join(profileDir, "cordis.patch.yml");
if (!existsSync(pkgPath)) {
  console.log(JSON.stringify({ ok: false, error: "profile not found: " + profileDir }));
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(pkgPath, "utf8"));
const currentSpec = manifest.dependencies ? manifest.dependencies[pkgName] : undefined;
const bundles = (manifest.dsh && manifest.dsh.profile && manifest.dsh.profile.bundles) || [];
const patchText = existsSync(patchPath) ? readFileSync(patchPath, "utf8") : "";
const hasHmr = /^-\s*id:\s*hmr\s*$/m.test(patchText);
const hasConfig = new RegExp("^-\\s*id:\\s*" + entryId + "\\s*$", "m").test(patchText);

const plan = [
  { step: "dependency", package: pkgName, from: currentSpec, to: linkSpec },
  { step: "bundles", present: bundles.includes(pkgName) },
  { step: "hmr-entry", present: hasHmr },
  { step: "dev-config", id: entryId, present: hasConfig }
];

if (!apply) {
  console.log(JSON.stringify({ ok: true, dryRun: true, profileDir, pluginRoot, plan }, null, 2));
} else {
  const backup = (file) => {
    if (!existsSync(file)) return undefined;
    const target = file + ".dev-bak-" + stamp;
    copyFileSync(file, target);
    return target;
  };
  const pkgBackup = backup(pkgPath);
  const patchBackup = backup(patchPath);

  if (!manifest.dependencies) manifest.dependencies = {};
  manifest.dependencies[pkgName] = linkSpec;
  if (!manifest.dsh) manifest.dsh = {};
  if (!manifest.dsh.profile) manifest.dsh.profile = {};
  const nextBundles = Array.isArray(manifest.dsh.profile.bundles) ? manifest.dsh.profile.bundles.slice() : [];
  if (!nextBundles.includes(pkgName)) nextBundles.push(pkgName);
  manifest.dsh.profile.bundles = nextBundles;
  writeFileSync(pkgPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  let nextPatch = patchText;
  if (!hasConfig) {
    nextPatch = [
      "# Development config for RelayDeck (dev panel routes).",
      "# The entry id must match the plugin bundle patch, not the package name.",
      "- id: " + entryId,
      "  config:",
      "    allowHostRestart: false",
      ""
    ].join("\n") + nextPatch;
  }
  if (!hasHmr) {
    nextPatch = [
      "# Development: watch the linked source and reload on save.",
      "- id: hmr",
      "  disabled: false",
      "  config:",
      "    root: [\".\"]",
      "    debounce: 300",
      ""
    ].join("\n") + nextPatch;
  }
  if (nextPatch !== patchText) writeFileSync(patchPath, nextPatch, "utf8");

  console.log(JSON.stringify({
    ok: true, applied: true, profileDir, pluginRoot, linkSpec,
    pkgBackup, patchBackup, hmrAdded: !hasHmr, configAdded: !hasConfig,
    note: "重启 DSH 后生效。若链接未建立，手工把 node_modules/" + pkgName + " 指向源码目录。"
  }, null, 2));
}
