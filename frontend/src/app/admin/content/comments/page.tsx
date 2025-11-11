'use client';

import React, { useCallback, useEffect, useState } from 'react';

interface Comment {
  id: number;
  video_id: number;
  video_filename: string;
  user_sub: string;
  user_name: string;
  comment_text: string;
  parent_comment_id: number | null;
  created_at: string;
  updated_at: string;
}

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const limit = 20;

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (search) {
        params.set('search', search);
      }

      const response = await fetch(`/api/admin/comments?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const data = await response.json();
      setComments(data.comments || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error loading comments:', error);
      alert('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [offset, search]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleDelete = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment? This will also delete all replies.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/comments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comment_id: commentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      // Reload comments
      await loadComments();
      alert('Comment deleted successfully');
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setOffset(0);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setOffset(0);
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-slate-100">
          💬 Comment Moderation
        </h1>
        <p className="text-slate-400">
          Manage and moderate user comments on videos
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by comment text or user name..."
            className="flex-1 rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3 text-sm text-slate-100 placeholder-slate-400 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
          />
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 transition hover:shadow-cyan-500/40 active:scale-[0.98]"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="rounded-xl border border-slate-600 bg-slate-700/50 px-6 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-700 active:scale-[0.98]"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Stats */}
      <div className="mb-6 rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            Total Comments: <span className="font-bold text-cyan-400">{total}</span>
          </div>
          {totalPages > 1 && (
            <div className="text-sm text-slate-400">
              Page {currentPage} of {totalPages}
            </div>
          )}
        </div>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-12 text-center">
          <div className="text-4xl mb-4">💬</div>
          <p className="text-slate-400">
            {search ? 'No comments found matching your search.' : 'No comments yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-5 transition hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10"
            >
              {/* Comment Header */}
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-3">
                    <span className="font-medium text-cyan-400">
                      {comment.user_name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                    {comment.parent_comment_id && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                        Reply
                      </span>
                    )}
                    {comment.created_at !== comment.updated_at && (
                      <span className="text-xs italic text-slate-500">(edited)</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    Video: <span className="font-mono">{comment.video_filename}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20 active:scale-[0.98]"
                >
                  Delete
                </button>
              </div>

              {/* Comment Text */}
              <div className="rounded-lg bg-slate-900/50 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                  {comment.comment_text}
                </p>
              </div>

              {/* Comment Footer */}
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                <span>ID: {comment.id}</span>
                <span>•</span>
                <span>Video ID: {comment.video_id}</span>
                <span>•</span>
                <span>User: {comment.user_sub.substring(0, 20)}...</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-sm text-slate-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
