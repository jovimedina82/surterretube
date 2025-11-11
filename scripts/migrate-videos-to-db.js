#!/usr/bin/env node

/**
 * Migration Script: Add all existing filesystem videos to database
 * This enables comment support for legacy videos
 */

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

const VOD_DIR = '/mnt/media/vod';
const THUMBS_DIR = path.join(VOD_DIR, 'thumbs');
const PUBLISH_JSON = path.join(VOD_DIR, 'published.json');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'surterre',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'surterretube_prod',
});

async function readPublishedJson() {
  try {
    const content = await fs.readFile(PUBLISH_JSON, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading published.json:', error.message);
    return {};
  }
}

async function getVideoStats(filename) {
  try {
    const filePath = path.join(VOD_DIR, filename);
    const stats = await fs.stat(filePath);
    return stats;
  } catch (error) {
    console.error(`Error getting stats for ${filename}:`, error.message);
    return null;
  }
}

async function checkThumbnailExists(filename) {
  const thumbName = filename.replace(/\.mp4$/i, '.jpg');
  const thumbPath = path.join(THUMBS_DIR, thumbName);

  try {
    await fs.access(thumbPath);
    return thumbName;
  } catch {
    return null;
  }
}

async function migrateVideos() {
  console.log('🎬 Starting video migration to database...\n');

  const client = await pool.connect();

  try {
    // Read published.json
    const published = await readPublishedJson();
    const publishedVideos = Object.keys(published).filter(f => published[f]);

    console.log(`📋 Found ${publishedVideos.length} published videos in filesystem\n`);

    // Get existing videos in database
    const existingResult = await client.query(
      'SELECT filename FROM admin_videos'
    );
    const existingFilenames = new Set(existingResult.rows.map(row => row.filename));

    console.log(`📊 Database currently has ${existingFilenames.size} videos\n`);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    // Process each published video
    for (const filename of publishedVideos) {
      // Skip if already in database
      if (existingFilenames.has(filename)) {
        console.log(`⏭️  Skipped: ${filename} (already in database)`);
        skipped++;
        continue;
      }

      // Get file stats
      const stats = await getVideoStats(filename);
      if (!stats) {
        console.log(`❌ Failed: ${filename} (file not found)`);
        failed++;
        continue;
      }

      // Check for thumbnail
      const thumbFilename = await checkThumbnailExists(filename);

      // Extract display name (remove .mp4 extension)
      const displayName = filename.replace(/\.mp4$/i, '');

      try {
        // Insert into database
        const result = await client.query(
          `INSERT INTO admin_videos
            (filename, display_name, size_bytes, uploaded_at, thumb_filename)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id`,
          [
            filename,
            displayName,
            stats.size,
            stats.mtime,
            thumbFilename
          ]
        );

        console.log(`✅ Migrated: ${filename} (ID: ${result.rows[0].id})`);
        migrated++;
      } catch (error) {
        console.log(`❌ Failed: ${filename} (${error.message})`);
        failed++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Migrated: ${migrated} videos`);
    console.log(`⏭️  Skipped:  ${skipped} videos (already in database)`);
    console.log(`❌ Failed:   ${failed} videos`);
    console.log(`📦 Total:    ${publishedVideos.length} videos processed`);
    console.log('='.repeat(60));

    if (migrated > 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('💬 All migrated videos now support comments.');
    } else {
      console.log('\nℹ️  No new videos to migrate.');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrateVideos().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
