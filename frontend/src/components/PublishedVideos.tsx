"use client";

import { useEffect, useState, useRef } from "react";
import styles from "./published.module.css";
import CommentsSection from "./CommentsSection";

type Item = {
  id: string;
  file: string;
  size: number;
  mtime: string;
  url: string;
  thumb: string | null;
};

export default function PublishedVideos() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Item | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // soft auth check (admin/session); if you have a viewer session endpoint, swap it here
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/session", { credentials: "include" });
        setAuthed(r.ok);
      } catch {
        setAuthed(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (authed !== true) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/admin/videos/list", { credentials: "include" });
        const j = await r.json();
        setItems(j.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [authed]);

  // Handle video selection
  const handleVideoClick = (item: Item) => {
    setSelectedVideo(item);
  };

  // Close video modal
  const handleCloseVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setSelectedVideo(null);
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedVideo) {
        handleCloseVideo();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedVideo]);

  if (authed === false) {
    return (
      <div className={styles.wrap}>
        <h2 className={styles.h2}>Recent Videos</h2>
        <div className={styles.locked}>
          Sign in to view published videos.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.wrap}>
        <h2 className={styles.h2}>Recent Videos</h2>
        {loading ? (
          <div className={styles.loading}>Loading…</div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>No published videos yet.</div>
        ) : (
          <div className={styles.grid}>
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => handleVideoClick(it)}
                className={styles.card}
                style={{ cursor: "pointer", border: "none", textAlign: "left" }}
              >
                <div className={styles.thumb}>
                  {it.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.thumb} alt={it.file} />
                  ) : (
                    <div className={styles.noThumb}>No thumbnail</div>
                  )}
                </div>
                <div className={styles.meta}>
                  <div className={styles.name} title={it.file}>
                    {it.file}
                  </div>
                  <div className={styles.sub}>
                    {new Date(it.mtime).toLocaleString()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 pt-8 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseVideo();
          }}
        >
          <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
            {/* Close Button */}
            <button
              onClick={handleCloseVideo}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
              title="Close (Esc)"
            >
              ✕
            </button>

            {/* Video Player */}
            <div className="aspect-video w-full overflow-hidden rounded-t-2xl bg-black">
              <video
                ref={videoRef}
                src={selectedVideo.url}
                controls
                autoPlay
                className="h-full w-full"
                controlsList="nodownload"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Video Info */}
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedVideo.file}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Published on {new Date(selectedVideo.mtime).toLocaleString()}
              </p>
            </div>

            {/* Comments Section */}
            <div className="px-6 pb-6">
              <CommentsSection videoId={parseInt(selectedVideo.id) || 0} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
