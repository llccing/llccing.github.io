ALTER TABLE articles
  ADD COLUMN github_mirror_state TEXT NOT NULL DEFAULT 'synced'
  CHECK (github_mirror_state IN ('pending', 'synced', 'failed'));

ALTER TABLE annotations
  ADD COLUMN github_mirror_state TEXT NOT NULL DEFAULT 'synced'
  CHECK (github_mirror_state IN ('pending', 'synced', 'failed'));

ALTER TABLE replies
  ADD COLUMN github_mirror_state TEXT NOT NULL DEFAULT 'synced'
  CHECK (github_mirror_state IN ('pending', 'synced', 'failed'));

CREATE INDEX annotations_github_mirror_state_idx
  ON annotations(github_mirror_state, updated_at);

CREATE INDEX replies_github_mirror_state_idx
  ON replies(github_mirror_state, updated_at);
