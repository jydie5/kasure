"use client";

import { useEffect } from "react";
import { recordReads } from "@/app/actions";

// 段落の「触れた時刻」から経過を求め、時間の層（data-age 0〜3）を付ける。
// 描画はサーバーでキャッシュされるため、現在時刻に依存する部分だけをここで行う
export function TraceAge({ decayDays }: { decayDays: number }) {
  useEffect(() => {
    if (decayDays === 0) return;
    const apply = () => {
      const now = Date.now();
      document.querySelectorAll<HTMLElement>(".read-body [data-touched]").forEach((el) => {
        const t = Date.parse(el.dataset.touched ?? "");
        if (!Number.isFinite(t)) return;
        const amount = 1 - Math.exp(-Math.max(0, now - t) / 86_400_000 / decayDays);
        const level = amount < 0.3 ? 0 : amount < 0.55 ? 1 : amount < 0.8 ? 2 : 3;
        if (level) el.dataset.age = String(level);
        else delete el.dataset.age;
      });
    };
    apply();
    const timer = window.setInterval(apply, 60_000);
    return () => window.clearInterval(timer);
  }, [decayDays]);
  return null;
}

// 公開ノートを読んでいる人が、段落を 1.5 秒以上視界に入れたら「読まれた」として記録する。
// 同じタブでは 1 回だけ。書いた本人は数えない
export function ReadTracker({ noteId }: { noteId: string }) {
  useEffect(() => {
    const key = `kasure:read:${noteId}`;
    let seen = new Set<string>();
    try {
      seen = new Set(JSON.parse(sessionStorage.getItem(key) ?? "[]") as string[]);
    } catch {}
    const pending = new Set<string>();
    const timers = new Map<string, number>();
    let flushTimer: number | undefined;

    const flush = () => {
      if (pending.size === 0) return;
      const pids = [...pending];
      pending.clear();
      pids.forEach((p) => seen.add(p));
      try {
        sessionStorage.setItem(key, JSON.stringify([...seen]));
      } catch {}
      void recordReads(noteId, pids);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const pid = (e.target as HTMLElement).dataset.pid;
          if (!pid || seen.has(pid)) continue;
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            if (!timers.has(pid)) {
              timers.set(
                pid,
                window.setTimeout(() => {
                  pending.add(pid);
                  timers.delete(pid);
                  window.clearTimeout(flushTimer);
                  flushTimer = window.setTimeout(flush, 2000);
                }, 1500),
              );
            }
          } else {
            const t = timers.get(pid);
            if (t) {
              window.clearTimeout(t);
              timers.delete(pid);
            }
          }
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    document.querySelectorAll<HTMLElement>(".read-body [data-pid]").forEach((el) => io.observe(el));
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(flushTimer);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [noteId]);
  return null;
}
