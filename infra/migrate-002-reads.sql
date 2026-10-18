-- 002: 段落ごとの「読まれた回数」。読まれた段落は墨が戻る
CREATE TABLE IF NOT EXISTS note_reads (
  note_id uuid NOT NULL,
  pid text NOT NULL,
  reads integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (note_id, pid)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON note_reads TO yohaku_app;
