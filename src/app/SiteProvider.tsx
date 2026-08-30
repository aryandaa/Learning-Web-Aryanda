import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { MetadataFile, TreeFolderNode } from '../domain/types';
import {
  buildCodeIndex,
  buildFileMap,
  fetchMetadata,
  fetchTree,
  type CodeFileEntry,
  type CodeFolderEntry,
  type FileMapEntry,
} from '../services/docs';

interface SiteData {
  tree: TreeFolderNode[] | null;
  metadata: MetadataFile | null;
  fileMap: Map<string, FileMapEntry>;
  /** Index code file (metadata ringan dari tree, tanpa content). */
  codeFileById: Map<string, CodeFileEntry>;
  /** Index code folder (folder yang langsung berisi file code). */
  codeFolderById: Map<string, CodeFolderEntry>;
  loading: boolean;
  error: string | null;
}

const SiteContext = createContext<SiteData>({
  tree: null,
  metadata: null,
  fileMap: new Map(),
  codeFileById: new Map(),
  codeFolderById: new Map(),
  loading: true,
  error: null,
});

export function useSiteData(): SiteData {
  return useContext(SiteContext);
}

/**
 * Memuat tree.json + metadata.json sekali di awal aplikasi.
 * Dokumen & search index tetap dimuat on-demand (spec §38).
 */
export function SiteProvider({ children }: { children: ReactNode }) {
  const [tree, setTree] = useState<TreeFolderNode[] | null>(null);
  const [metadata, setMetadata] = useState<MetadataFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [treeData, metadataData] = await Promise.all([fetchTree(), fetchMetadata()]);
        if (cancelled) return;
        setTree(treeData);
        setMetadata(metadataData);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fileMap = tree ? buildFileMap(tree) : new Map<string, FileMapEntry>();
  const { codeFileById, codeFolderById } = tree ? buildCodeIndex(tree) : { codeFileById: new Map<string, CodeFileEntry>(), codeFolderById: new Map<string, CodeFolderEntry>() };

  return (
    <SiteContext.Provider value={{ tree, metadata, fileMap, codeFileById, codeFolderById, loading, error }}>
      {children}
    </SiteContext.Provider>
  );
}
