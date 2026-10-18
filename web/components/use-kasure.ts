"use client";

import { useSyncExternalStore } from "react";

// 時刻はサーバーとクライアントでずれるため、表示後にだけ現在時刻を使う（ハイドレーション時は null）
const subscribe = (onChange: () => void) => {
  const t = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(t);
};
const getMinute = () => Math.floor(Date.now() / 60_000) * 60_000;

export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getMinute, () => null);
}

// 最終更新からの経過で墨がかすれる。0 = 濃い墨、1 = ほぼ消えかけ（decayDays 日で約 6 割）。
// decayDays = 0 は「永久墨」で、かすれない
export function kasureAmount(updatedAt: string, now: number | null, decayDays = 7): number {
  if (now === null || decayDays === 0) return 0;
  const days = Math.max(0, now - new Date(updatedAt).getTime()) / 86_400_000;
  return 1 - Math.exp(-days / decayDays);
}

export function kasureLevel(amount: number): 0 | 1 | 2 | 3 | 4 {
  return Math.min(4, Math.round(amount * 4)) as 0 | 1 | 2 | 3 | 4;
}

export function inkPercent(amount: number) {
  return Math.round((1 - amount) * 100);
}
