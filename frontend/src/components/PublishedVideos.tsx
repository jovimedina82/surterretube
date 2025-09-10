"use client";

import { useEffect, useState } from "react";
import styles from "./published.module.css";

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
    <div className={styles.wrap}>
      <h2 className={styles.h2}>Recent Videos</h2>
      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>No published videos yet.</div>
      ) : (
        <div className={styles.grid}>
          {items.map((it) => (
            <a
              key={it.id}
              href={it.url}
              className={styles.card}
              target="_blank"
              rel="noreferrer"
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
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
