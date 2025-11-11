-- Migration: Add video comments table
-- Created: 2025-11-11
-- Description: YouTube-style comments for VOD videos

CREATE TABLE IF NOT EXISTS video_comments (
  id SERIAL PRIMARY KEY,
  video_id INTEGER NOT NULL REFERENCES admin_videos(id) ON DELETE CASCADE,
  user_sub VARCHAR(255) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  comment_text TEXT NOT NULL CHECK (char_length(comment_text) <= 2000),
  parent_comment_id INTEGER REFERENCES video_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries by video
CREATE INDEX idx_video_comments_video_id ON video_comments(video_id);

-- Index for faster queries by user
CREATE INDEX idx_video_comments_user_sub ON video_comments(user_sub);

-- Index for fetching replies
CREATE INDEX idx_video_comments_parent_id ON video_comments(parent_comment_id);

-- Index for sorting by date
CREATE INDEX idx_video_comments_created_at ON video_comments(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_video_comments_updated_at
  BEFORE UPDATE ON video_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_video_comments_updated_at();

-- Add comment to track migration
COMMENT ON TABLE video_comments IS 'Stores user comments on published VOD videos';
