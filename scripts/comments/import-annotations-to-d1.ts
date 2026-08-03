import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  backupRecords,
  generateImportSql,
  loadAnnotationBackup,
} from "./d1-backup";
import { readArgument, runWrangler, targetFlag } from "./d1-cli";

async function main(): Promise<void> {
  const input = readArgument("--input");
  if (!input) throw new Error("--input is required");
  const database = readArgument("--database") ?? "rowan-blog-annotations";
  const target = targetFlag();
  const inputPath = resolve(input);
  const backup = await loadAnnotationBackup(inputPath);
  const records = backupRecords(backup);
  const sqlPath = resolve(
    "artifacts/cloudflare-migration",
    `d1-import-${target.slice(2)}-${Date.now()}.sql`
  );
  await mkdir(dirname(sqlPath), { recursive: true });
  await writeFile(sqlPath, generateImportSql(records), { mode: 0o600 });
  try {
    runWrangler(["d1", "execute", database, target, "--yes", "--file", sqlPath]);
  } finally {
    await rm(sqlPath, { force: true });
  }
  console.log(
    JSON.stringify(
      {
        database,
        target: target.slice(2),
        input: inputPath,
        counts: {
          articles: records.articles.length,
          annotations: records.annotations.length,
          replies: records.replies.length,
        },
      },
      null,
      2
    )
  );
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
