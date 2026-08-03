import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  backupRecords,
  compareRecordSets,
  loadAnnotationBackup,
} from "./d1-backup";
import {
  parseWranglerRows,
  readArgument,
  runWrangler,
  targetFlag,
} from "./d1-cli";

function query(
  database: string,
  target: "--local" | "--remote",
  sql: string
): Array<Record<string, unknown>> {
  const command = sql.replace(/\s+/g, " ").trim();
  return parseWranglerRows(
    runWrangler([
      "d1",
      "execute",
      database,
      target,
      "--json",
      "--command",
      command,
    ])
  );
}

async function main(): Promise<void> {
  const input = readArgument("--input");
  if (!input) throw new Error("--input is required");
  const database = readArgument("--database") ?? "rowan-blog-annotations";
  const target = targetFlag();
  const backup = await loadAnnotationBackup(resolve(input));
  const expected = backupRecords(backup);

  const actualArticles = query(
    database,
    target,
    `SELECT path, title, github_discussion_id AS githubDiscussionId,
      github_discussion_number AS githubDiscussionNumber,
      github_url AS githubUrl, created_at AS createdAt, updated_at AS updatedAt
     FROM articles ORDER BY path;`
  );
  const actualAnnotations = query(
    database,
    target,
    `SELECT id, article_path AS articlePath, author_login AS authorLogin,
      author_avatar_url AS authorAvatarUrl, author_url AS authorUrl, body,
      github_url AS githubUrl, block_id AS blockId, heading_id AS headingId,
      exact_text AS exactText, prefix_text AS prefixText,
      suffix_text AS suffixText, view, github_node_id AS githubNodeId,
      created_at AS createdAt, updated_at AS updatedAt
     FROM annotations WHERE deleted_at IS NULL ORDER BY id;`
  );
  const actualReplies = query(
    database,
    target,
    `SELECT id, annotation_id AS annotationId, author_login AS authorLogin,
      author_avatar_url AS authorAvatarUrl, author_url AS authorUrl, body,
      github_url AS githubUrl, kind, github_node_id AS githubNodeId,
      created_at AS createdAt, updated_at AS updatedAt
     FROM replies WHERE deleted_at IS NULL ORDER BY id;`
  );

  const mismatches = {
    articles: compareRecordSets(expected.articles, actualArticles, "path"),
    annotations: compareRecordSets(expected.annotations, actualAnnotations, "id"),
    replies: compareRecordSets(expected.replies, actualReplies, "id"),
  };
  const mismatchCount = Object.values(mismatches).reduce(
    (total, entries) => total + entries.length,
    0
  );
  const output = resolve(
    readArgument("--output") ??
      `artifacts/cloudflare-migration/d1-reconciliation-${target.slice(2)}-${Date.now()}.json`
  );
  const report = {
    checkedAt: new Date().toISOString(),
    database,
    target: target.slice(2),
    expectedCounts: {
      articles: expected.articles.length,
      annotations: expected.annotations.length,
      replies: expected.replies.length,
    },
    actualCounts: {
      articles: actualArticles.length,
      annotations: actualAnnotations.length,
      replies: actualReplies.length,
    },
    mismatchCount,
    mismatches,
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  console.log(
    JSON.stringify(
      {
        output,
        expectedCounts: report.expectedCounts,
        actualCounts: report.actualCounts,
        mismatchCount,
      },
      null,
      2
    )
  );
  if (mismatchCount > 0) process.exitCode = 1;
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
