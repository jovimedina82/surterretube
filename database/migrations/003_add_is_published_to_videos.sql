-- Migration: Add is_published column to admin_videos
-- Created: 2025-11-11
-- Description: Enable draft/published workflow for videos

-- Add is_published column (default to true for existing videos)
ALTER TABLE admin_videos
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

-- Add index for faster queries by published status
CREATE INDEX IF NOT EXISTS idx_admin_videos_published ON admin_videos(is_published);

-- Comment
COMMENT ON COLUMN admin_videos.is_published IS 'Whether the video is published and visible to users';
