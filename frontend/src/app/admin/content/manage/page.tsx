'use client';

import React, { useCallback, useEffect, useState } from 'react';

interface Video {
  id: number;
  filename: string;
  display_name: string;
  size_bytes: number;
  uploaded_at: string;
  thumb_filename: string | null;
  is_published: boolean;
  url: string;
  thumb: string | null;
}

export default function ManageVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/videos/all', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }

      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Error loading videos:', error);
      alert('Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const handleEdit = (video: Video) => {
    setEditingId(video.id);
    setEditName(video.display_name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleSave = async (id: number) => {
    if (!editName.trim()) {
      alert('Video name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/videos/all', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id,
          display_name: editName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update video');
      }

      await loadVideos();
      setEditingId(null);
      setEditName('');
    } catch (error) {
      console.error('Error updating video:', error);
      alert('Failed to update video');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (id: number, currentStatus: boolean) => {
    const action = currentStatus ? 'unpublish' : 'publish';
    if (!confirm(`Are you sure you want to ${action} this video?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/videos/all', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id,
          is_published: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} video`);
      }

      await loadVideos();
    } catch (error) {
      console.error(`Error ${action}ing video:`, error);
      alert(`Failed to ${action} video`);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const publishedVideos = videos.filter(v => v.is_published);
  const unpublishedVideos = videos.filter(v => !v.is_published);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-slate-100">
          📹 Manage Videos
        </h1>
        <p className="text-slate-400">
          Edit video names and publish/unpublish videos
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading videos...</div>
      ) : (
        <>
          {/* Unpublished Videos Section */}
          {unpublishedVideos.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-bold text-amber-400">
                📝 Draft Videos ({unpublishedVideos.length})
              </h2>
              <p className="mb-4 text-sm text-slate-400">
                These videos are recorded but not yet published. Edit the name and publish when ready.
              </p>
              <div className="space-y-3">
                {unpublishedVideos.map((video) => (
                  <div
                    key={video.id}
                    className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-5 transition hover:border-amber-500/70"
                  >
                    {editingId === video.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                          placeholder="Video name..."
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(video.id)}
                            disabled={saving}
                            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 active:scale-[0.98] disabled:opacity-50"
                          >
                            {saving ? 'Saving...' : 'Save Name'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={saving}
                            className="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-600 active:scale-[0.98]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-3">
                            <h3 className="text-lg font-medium text-amber-300">
                              {video.display_name}
                            </h3>
                            <span className="rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-medium text-amber-400">
                              DRAFT
                            </span>
                          </div>
                          <p className="mb-1 text-xs text-slate-400">
                            File: <span className="font-mono">{video.filename}</span>
                          </p>
                          <p className="text-xs text-slate-400">
                            Size: {formatBytes(video.size_bytes)} • Recorded:{' '}
                            {new Date(video.uploaded_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(video)}
                            className="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-600 active:scale-[0.98]"
                          >
                            Edit Name
                          </button>
                          <button
                            onClick={() => handleTogglePublish(video.id, video.is_published)}
                            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 active:scale-[0.98]"
                          >
                            Publish
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Published Videos Section */}
          <div>
            <h2 className="mb-4 text-xl font-bold text-emerald-400">
              ✅ Published Videos ({publishedVideos.length})
            </h2>
            {publishedVideos.length === 0 ? (
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-12 text-center">
                <div className="text-4xl mb-4">📹</div>
                <p className="text-slate-400">No published videos yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {publishedVideos.map((video) => (
                  <div
                    key={video.id}
                    className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-5 transition hover:border-emerald-500/30"
                  >
                    {editingId === video.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                          placeholder="Video name..."
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(video.id)}
                            disabled={saving}
                            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-50"
                          >
                            {saving ? 'Saving...' : 'Save Name'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={saving}
                            className="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-600 active:scale-[0.98]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-3">
                            <h3 className="text-lg font-medium text-emerald-300">
                              {video.display_name}
                            </h3>
                            <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-medium text-emerald-400">
                              PUBLISHED
                            </span>
                          </div>
                          <p className="mb-1 text-xs text-slate-400">
                            File: <span className="font-mono">{video.filename}</span>
                          </p>
                          <p className="text-xs text-slate-400">
                            Size: {formatBytes(video.size_bytes)} • Published:{' '}
                            {new Date(video.uploaded_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(video)}
                            className="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-600 active:scale-[0.98]"
                          >
                            Edit Name
                          </button>
                          <button
                            onClick={() => handleTogglePublish(video.id, video.is_published)}
                            className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20 active:scale-[0.98]"
                          >
                            Unpublish
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
