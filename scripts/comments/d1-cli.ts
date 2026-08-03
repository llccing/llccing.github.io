import { spawnSync } from "node:child_process";

export function readArgument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

export function targetFlag(): "--local" | "--remote" {
  const local = process.argv.includes("--local");
  const remote = process.argv.includes("--remote");
  if (local === remote) {
    throw new Error("Choose exactly one of --local or --remote");
  }
  return remote ? "--remote" : "--local";
}

export function runWrangler(args: string[]): string {
  const pnpmScript = process.env.npm_execpath;
  if (!pnpmScript) throw new Error("Run this command through pnpm");
  const result = spawnSync(
    process.execPath,
    [pnpmScript, "exec", "wrangler", ...args],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
  );
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || "Wrangler failed");
  }
  return result.stdout;
}

export function parseWranglerRows(output: string): Array<Record<string, unknown>> {
  const payload: unknown = JSON.parse(output);
  if (!Array.isArray(payload)) throw new Error("Wrangler returned invalid JSON");
  return payload.flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const results = (item as { results?: unknown }).results;
    return Array.isArray(results)
      ? results.filter(
          (row): row is Record<string, unknown> =>
            Boolean(row) && typeof row === "object"
        )
      : [];
  });
}
