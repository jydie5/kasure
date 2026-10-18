-- 001: リッチエディタ用の列を追加
ALTER TABLE notes ADD COLUMN IF NOT EXISTS doc jsonb;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS layout jsonb;
