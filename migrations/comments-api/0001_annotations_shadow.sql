PRAGMA foreign_keys = ON;

CREATE TABLE articles (
  path TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  github_discussion_id TEXT NOT NULL UNIQUE,
  github_discussion_number INTEGER NOT NULL,
  github_url TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE annotations (
  id TEXT PRIMARY KEY,
  article_path TEXT NOT NULL,
  author_login TEXT NOT NULL,
  author_avatar_url TEXT NOT NULL,
  author_url TEXT NOT NULL,
  body TEXT NOT NULL,
  github_url TEXT NOT NULL,
  block_id TEXT NOT NULL,
  heading_id TEXT,
  exact_text TEXT NOT NULL,
  prefix_text TEXT NOT NULL,
  suffix_text TEXT NOT NULL,
  view TEXT NOT NULL CHECK (view IN ('article', 'translated', 'original')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'deleted')),
  github_node_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (article_path) REFERENCES articles(path)
);

CREATE INDEX annotations_article_path_idx
  ON annotations(article_path, deleted_at, created_at);

CREATE TABLE replies (
  id TEXT PRIMARY KEY,
  annotation_id TEXT NOT NULL,
  author_login TEXT NOT NULL,
  author_avatar_url TEXT NOT NULL,
  author_url TEXT NOT NULL,
  body TEXT NOT NULL,
  github_url TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'human' CHECK (kind IN ('human', 'ai')),
  github_node_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (annotation_id) REFERENCES annotations(id)
);

CREATE INDEX replies_annotation_id_idx
  ON replies(annotation_id, deleted_at, created_at);

CREATE TABLE annotation_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('annotation', 'reply')),
  resource_id TEXT NOT NULL,
  previous_body TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  changed_by TEXT NOT NULL
);

CREATE INDEX annotation_revisions_resource_idx
  ON annotation_revisions(resource_type, resource_id, changed_at);

CREATE TABLE ai_jobs (
  id TEXT PRIMARY KEY,
  annotation_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (
    status IN ('queued', 'answering', 'completed', 'failed')
  ),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  provider TEXT,
  model TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (annotation_id) REFERENCES annotations(id)
);
