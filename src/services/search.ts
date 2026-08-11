import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import type { SearchIndexEntry } from '../domain/types';

export type SearchResult = SearchIndexEntry;

/**
 * Membungkus Fuse.js. Index dibangun sekali dari search-index.json
 * yang dimuat lazy saat halaman pencarian dibuka.
 */
export function useFuseSearch(index: SearchIndexEntry[] | null) {
  const [query, setQuery] = useState('');

  const fuse = useMemo(() => {
    if (!index) return null;
    return new Fuse(index, {
      keys: [
        { name: 'title', weight: 3 },
        { name: 'aliases', weight: 2 },
        { name: 'headings', weight: 2 },
        { name: 'tags', weight: 1 },
        { name: 'content', weight: 1 },
      ],
      threshold: 0.38,
      ignoreLocation: true,
      includeScore: true,
    });
  }, [index]);

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!fuse) return null;
    if (!trimmed) return [];
    return fuse.search(trimmed).map((result) => result.item);
  }, [fuse, query]);

  return { query, setQuery, results };
}
