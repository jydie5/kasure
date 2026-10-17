CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_sub text NOT NULL,
  owner_name text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  excerpt text NOT NULL DEFAULT '',
  visibility text NOT NULL DEFAULT 'private',
  slug text NOT NULL,
  cover_key text,
  accent text NOT NULL DEFAULT 'ink',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS note_tags (
  note_id uuid NOT NULL,
  tag text NOT NULL,
  PRIMARY KEY (note_id, tag)
);
CREATE INDEX ASYNC IF NOT EXISTS notes_owner_idx ON notes (owner_sub, updated_at);
CREATE UNIQUE INDEX ASYNC IF NOT EXISTS notes_slug_idx ON notes (slug);
CREATE INDEX ASYNC IF NOT EXISTS notes_public_idx ON notes (visibility, updated_at);
CREATE INDEX ASYNC IF NOT EXISTS note_tags_tag_idx ON note_tags (tag);
CREATE ROLE yohaku_app WITH LOGIN;
GRANT SELECT, INSERT, UPDATE, DELETE ON notes, note_tags TO yohaku_app;
