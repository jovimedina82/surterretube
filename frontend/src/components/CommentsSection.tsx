'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';

/* -------------------- Utility Functions -------------------- */
function hashFnv1a(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const PALETTE = [
  '#3d6864', '#2563eb', '#4f46e5', '#7c3aed', '#d946ef', '#e11d48',
  '#ef4444', '#f97316', '#f59e0b', '#65a30d', '#10b981', '#06b6d4',
  '#14b8a6', '#8b5cf6', '#ec4899', '#f43f5e',
];

const autoColor = (name: string) =>
  PALETTE[hashFnv1a((name || 'user').toLowerCase()) % PALETTE.length];

/* -------------------- Types -------------------- */
interface Comment {
  id: number;
  video_id: number;
  user_sub: string;
  user_name: string;
  comment_text: string;
  parent_comment_id: number | null;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
}

interface CommentsSectionProps {
  videoId: number;
}

/* -------------------- CommentItem Component -------------------- */
function CommentItem({
  comment,
  currentUserSub,
  currentUserName,
  onReply,
  onEdit,
  onDelete,
  depth = 0,
}: {
  comment: Comment;
  currentUserSub: string;
  currentUserName: string;
  onReply: (parentId: number) => void;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: number) => void;
  depth?: number;
}) {
  const isOwner = comment.user_sub === currentUserSub;
  const nameColor = autoColor(comment.user_name);
  const isEdited = comment.created_at !== comment.updated_at;

  const timeAgo = useMemo(() => {
    const now = new Date().getTime();
    const created = new Date(comment.created_at).getTime();
    const diff = now - created;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }, [comment.created_at]);

  return (
    <div className={`${depth > 0 ? 'ml-8 mt-3' : 'mt-4'}`}>
      <div className="group rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm transition hover:shadow">
        {/* Comment Header */}
        <div className="mb-2 flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: nameColor }}
          />
          <span className="font-medium" style={{ color: nameColor }}>
            {comment.user_name}
          </span>
          <span className="text-xs text-gray-400">{timeAgo}</span>
          {isEdited && (
            <span className="text-xs text-gray-400 italic">(edited)</span>
          )}
        </div>

        {/* Comment Text */}
        <p className="mb-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-gray-800">
          {comment.comment_text}
        </p>

        {/* Comment Actions */}
        <div className="flex gap-3 text-xs">
          <button
            onClick={() => onReply(comment.id)}
            className="text-emerald-600 transition hover:text-emerald-700 hover:underline"
          >
            Reply
          </button>
          {isOwner && (
            <>
              <button
                onClick={() => onEdit(comment)}
                className="text-blue-600 transition hover:text-blue-700 hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(comment.id)}
                className="text-red-600 transition hover:text-red-700 hover:underline"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Render Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserSub={currentUserSub}
              currentUserName={currentUserName}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------- CommentsSection Component -------------------- */
export default function CommentsSection({ videoId }: CommentsSectionProps) {
  const { instance, accounts } = useMsal();
  const isAuthed = useIsAuthenticated();
  const activeAccount = instance.getActiveAccount() ?? accounts[0] ?? null;
  const userName = activeAccount?.name || 'User';
  // Use idTokenClaims.sub for unique user identifier, fallback to homeAccountId
  const userSub = (activeAccount?.idTokenClaims?.sub as string) ||
                  activeAccount?.homeAccountId ||
                  activeAccount?.localAccountId ||
                  '';

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check if this is a valid numeric video ID (comments only work for database videos)
  // Video ID must be a positive number (greater than 0)
  const isValidVideoId = !isNaN(videoId) && videoId > 0;

  // Load comments
  const loadComments = useCallback(async () => {
    if (!isValidVideoId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/videos/${videoId}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  }, [videoId, isValidVideoId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Submit comment (new or reply)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !isAuthed || submitting) return;

    // Debug: log user info
    console.log('Submitting comment with:', { userSub, userName, isAuthed });

    if (!userSub) {
      alert('Unable to identify user. Please try signing out and signing back in.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingComment) {
        // Update existing comment
        const response = await fetch(
          `/api/videos/${videoId}/comments/${editingComment.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              comment_text: commentText.trim(),
              user_sub: userSub,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to update comment');
        }
        setEditingComment(null);
      } else {
        // Create new comment or reply
        const response = await fetch(`/api/videos/${videoId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            comment_text: commentText.trim(),
            user_sub: userSub,
            user_name: userName,
            parent_comment_id: replyingTo,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('API Error:', errorData);
          throw new Error(errorData.error || 'Failed to add comment');
        }
        setReplyingTo(null);
      }

      setCommentText('');
      await loadComments();
    } catch (error) {
      console.error('Error submitting comment:', error);
      const message = error instanceof Error ? error.message : 'Failed to submit comment. Please try again.';
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle reply
  const handleReply = (parentId: number) => {
    setReplyingTo(parentId);
    setEditingComment(null);
    setCommentText('');
    textareaRef.current?.focus();
  };

  // Handle edit
  const handleEdit = (comment: Comment) => {
    setEditingComment(comment);
    setReplyingTo(null);
    setCommentText(comment.comment_text);
    textareaRef.current?.focus();
  };

  // Handle delete
  const handleDelete = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(`/api/videos/${videoId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_sub: userSub }),
      });

      if (!response.ok) throw new Error('Failed to delete comment');
      await loadComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment. Please try again.');
    }
  };

  // Cancel editing or replying
  const handleCancel = () => {
    setCommentText('');
    setReplyingTo(null);
    setEditingComment(null);
  };

  // If not a valid video ID, show message that comments are not available
  if (!isValidVideoId) {
    return (
      <section className="mt-6 rounded-2xl border-2 border-gray-200 bg-gray-50 p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-white shadow-sm">
            💬
          </div>
          <h3 className="text-lg font-bold text-gray-700">Comments</h3>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-600">
          Comments are not available for legacy videos. Only newly uploaded videos support comments.
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border-2 border-emerald-100/50 bg-gradient-to-b from-white/95 to-emerald-50/30 p-6 shadow-lg backdrop-blur-sm">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
          💬
        </div>
        <h3 className="text-lg font-bold text-emerald-700">
          Comments ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})
        </h3>
      </div>

      {/* Comment Form */}
      {isAuthed ? (
        <form onSubmit={handleSubmit} className="mb-6">
          {(replyingTo !== null || editingComment) && (
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
              <span>
                {editingComment
                  ? 'Editing your comment'
                  : `Replying to comment #${replyingTo}`}
              </span>
              <button
                type="button"
                onClick={handleCancel}
                className="text-red-600 hover:underline"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <textarea
              ref={textareaRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={
                editingComment
                  ? 'Edit your comment...'
                  : replyingTo
                  ? 'Write a reply...'
                  : 'Add a comment...'
              }
              maxLength={2000}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {commentText.length}/2000 characters
              </span>
              <button
                type="submit"
                disabled={!commentText.trim() || submitting}
                className="rounded-xl bg-emerald-500 px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-50"
              >
                {submitting
                  ? 'Posting...'
                  : editingComment
                  ? 'Update'
                  : replyingTo
                  ? 'Reply'
                  : 'Comment'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
          Please sign in to leave a comment.
        </div>
      )}

      {/* Comments List */}
      <div>
        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <div className="space-y-2">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserSub={userSub}
                currentUserName={userName}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
