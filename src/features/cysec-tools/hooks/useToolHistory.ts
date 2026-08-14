/**
 * Riwayat tool: recently used + favorites, disimpan di localStorage.
 * Tanpa backend. Dipakai di dashboard CySec Tools.
 */

import { useCallback, useEffect, useState } from 'react';

const RECENT_KEY = 'cysec-recent-tools';
const FAV_KEY = 'cysec-fav-tools';
const MAX_RECENT = 8;

function readList(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
  } catch {
    /* abaikan */
  }
}

export function useToolHistory() {
  const [recent, setRecent] = useState<string[]>(() => readList(RECENT_KEY));
  const [favorites, setFavorites] = useState<string[]>(() => readList(FAV_KEY));

  useEffect(() => {
    writeList(RECENT_KEY, recent);
  }, [recent]);

  useEffect(() => {
    writeList(FAV_KEY, favorites);
  }, [favorites]);

  /** Catat tool dipakai (paling baru di depan). */
  const recordUsage = useCallback((toolId: string) => {
    setRecent((prev) => [toolId, ...prev.filter((id) => id !== toolId)].slice(0, MAX_RECENT));
  }, []);

  const toggleFavorite = useCallback((toolId: string) => {
    setFavorites((prev) => (prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [toolId, ...prev]));
  }, []);

  const isFavorite = useCallback((toolId: string) => favorites.includes(toolId), [favorites]);

  return { recent, favorites, recordUsage, toggleFavorite, isFavorite };
}
