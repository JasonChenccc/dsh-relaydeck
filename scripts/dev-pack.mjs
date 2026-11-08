// Rebuild client.js and repackage the plugin tarball in one step.
// Plain Node, no dependencies. Prints a single JSON line for the dev panel.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const tgz = join(root, pkg.name + "-" + pkg.version + ".tgz");

try {
  await import("./build-client.mjs");

  const stage = join(tmpdir(), "relaydeck-pack-" + Date.now());
  const pkgDir = join(stage, "package");
  mkdirSync(pkgDir, { recursive: true });
  for (const entry of ["lib", "server", "client.js", "icon.svg", "cordis.patch.yml", "README.md", "NOTICE", "LICENSE", "docs", "scripts", "test", "package.json"]) {
    const src = join(root, entry);
    if (existsSync(src)) cpSync(src, join(pkgDir, entry), { recursive: true });
  }
  if (existsSync(tgz)) rmSync(tgz);
  execFileSync("tar", ["-czf", tgz, "-C", stage, "package"], { stdio: "ignore" });
  rmSync(stage, { recursive: true, force: true });

  console.log(JSON.stringify({
    ok: true,
    name: pkg.name,
    version: pkg.version,
    file: tgz,
    bytes: statSync(tgz).size,
    clientBytes: statSync(join(root, "client.js")).size,
    at: new Date().toISOString()
  }));
} catch (error) {
  console.log(JSON.stringify({ ok: false, error: String(error && error.message ? error.message : error) }));
  process.exitCode = 1;
}
