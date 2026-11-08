// RelayDeck — locate a Chromium-family browser on this machine.
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const WINDOWS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];

const POSIX = [
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium",
  "/usr/bin/chromium-browser", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
];

/** Every browser we can see, in preference order (Chrome first). */
export function candidates() {
  const list = [];
  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA;
    if (local) {
      list.push(join(local, "Google", "Chrome", "Application", "chrome.exe"));
      list.push(join(local, "Microsoft", "Edge", "Application", "msedge.exe"));
    }
    list.push(...WINDOWS);
  } else {
    list.push(...POSIX);
  }
  for (const extra of ["RELAYDECK_BROWSER"]) {
    if (process.env[extra]) list.unshift(process.env[extra]);
  }
  return [...new Set(list)];
}

export function findBrowser() {
  for (const candidate of candidates()) {
    try { if (existsSync(candidate)) return candidate; } catch (e) { /* keep looking */ }
  }
  return undefined;
}

/** Default per-user browser profile for the automation session. */
export function defaultUserDataDir(baseDir) {
  return join(baseDir || join(homedir(), ".relaydeck"), "browser");
}
