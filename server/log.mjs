// RelayDeck backend — minimal structured logger (no dependencies).
export function log(level, message, extra) {
  const stamp = new Date().toISOString();
  const tail = extra === undefined ? "" : " " + JSON.stringify(extra);
  process.stdout.write(stamp + " " + String(level).toUpperCase() + " " + message + tail + "\n");
}

export function errorText(error) {
  return String(error && error.message ? error.message : error);
}
