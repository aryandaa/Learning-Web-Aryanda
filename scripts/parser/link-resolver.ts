import type { ParserContext } from './context';
import type { NoteRecord } from './types';
import { buildTree, treeFileOrder } from './tree';
import { toDocumentId } from './validator';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.avif', '.ico']);

export interface ResolvedNoteTarget {
  kind: 'note';
  id: string;
  title: string;
  /** Optional heading anchor, e.g. "pengenalan". */
  anchor?: string;
}

export interface ResolvedAssetTarget {
  kind: 'asset';
  publicUrl: string;
  /** Vault-relative source path, used to track referenced assets. */
  sourcePath: string;
  isImage: boolean;
}

export interface BrokenTarget {
  kind: 'broken';
  raw: string;
}

export type LinkTarget = ResolvedNoteTarget | ResolvedAssetTarget | BrokenTarget;

export interface LinkLookupOptions {
  assetPublicPrefix: string;
}

/**
 * Index of everything resolvable from notes:
 * ids, relative paths, titles, aliases, basenames, and vault assets.
 */
export class LinkLookup {
  private byId = new Map<string, NoteRecord>();
  private byRel = new Map<string, NoteRecord>();
  private byTitle = new Map<string, NoteRecord[]>();
  private byAlias = new Map<string, NoteRecord[]>();
  private byBasename = new Map<string, NoteRecord[]>();
  private assetsByPath = new Map<string, { relativePath: string; isImage: boolean }>();
  private assetsByName = new Map<string, { relativePath: string; isImage: boolean }[]>();

  constructor(
    private options: LinkLookupOptions,
    records: NoteRecord[],
    assets: { relativePath: string; isImage: boolean }[]
  ) {
    for (const record of records) {
      this.byId.set(record.id, record);
      this.byRel.set(this.norm(record.relativePath), record);
      this.push(this.byTitle, record.title.toLowerCase(), record);
      this.push(this.byBasename, record.slug, record);
      for (const alias of record.aliases) this.push(this.byAlias, alias.toLowerCase(), record);
    }
    for (const asset of assets) {
      this.assetsByPath.set(this.norm(asset.relativePath), asset);
      const name = asset.relativePath.split('/').pop()!.toLowerCase();
      const list = this.assetsByName.get(name) ?? [];
      list.push(asset);
      this.assetsByName.set(name, list);
    }
  }

  private push(map: Map<string, NoteRecord[]>, key: string, record: NoteRecord): void {
    const list = map.get(key) ?? [];
    list.push(record);
    map.set(key, list);
  }

  /** Normalize a vault-relative path for lookup (lowercase, spaces -> hyphens). */
  private norm(p: string): string {
    return p.replace(/\\/g, '/').toLowerCase().replace(/ /g, '-');
  }

  private noteTarget(record: NoteRecord, anchor?: string): ResolvedNoteTarget {
    return { kind: 'note', id: record.id, title: record.title, anchor };
  }

  private assetTarget(rel: string, isImage: boolean): ResolvedAssetTarget {
    return {
      kind: 'asset',
      publicUrl: `${this.options.assetPublicPrefix}/${rel}`,
      sourcePath: rel,
      isImage,
    };
  }

  private pickBest(list: NoteRecord[], from?: NoteRecord): NoteRecord {
    if (from) {
      const sameFolder = list.find((r) => r.folder === from.folder);
      if (sameFolder) return sameFolder;
    }
    return [...list].sort((a, b) => a.relativePath.localeCompare(b.relativePath))[0];
  }

  /**
   * Resolves an Obsidian wiki link target: `[[Note]]`, `[[Folder/Note]]`,
   * `[[Note|alias]]`, `[[Note#Section]]`. Resolution order:
   * id -> relative path -> title -> alias -> filename.
   */
  resolveWiki(raw: string, from?: NoteRecord): LinkTarget {
    const [pathPart = '', section = ''] = raw.split('#');
    const target = pathPart.trim();
    if (!target) return { kind: 'broken', raw };

    const norm = this.norm(target.replace(/\.md$/i, ''));
    const anchor = section.trim() || undefined;

    let record: NoteRecord | undefined;

    if (target.includes('/')) {
      record = this.byId.get(norm) ?? this.byRel.get(norm);
      if (!record) {
        const base = target.split('/').pop()!.toLowerCase();
        record = this.pickBest(this.byBasename.get(base) ?? [], from);
      }
    } else {
      record =
        this.byTitle.get(target.toLowerCase())?.[0] ??
        this.byAlias.get(target.toLowerCase())?.[0] ??
        this.byBasename.get(target.toLowerCase())?.[0];
      if (!record) record = this.pickBest(this.byBasename.get(target.toLowerCase()) ?? [], from);
      if (!record) {
        // Fall back to relative path style even without a slash.
        record = this.byRel.get(norm) ?? this.byId.get(norm);
      }
    }

    if (record) return this.noteTarget(record, anchor);

    // `[[file.pdf]]` (non-embed) still links to the asset in Obsidian.
    const assetByPath = this.assetsByPath.get(norm);
    if (assetByPath) return this.assetTarget(assetByPath.relativePath, assetByPath.isImage);
    const byNameAsset = this.assetsByName.get(target.toLowerCase());
    if (byNameAsset && byNameAsset.length > 0) {
      return this.assetTarget(byNameAsset[0].relativePath, byNameAsset[0].isImage);
    }

    return { kind: 'broken', raw };
  }

  /** Resolves `![[embed]]` — image, note, or unsupported asset. */
  resolveEmbed(raw: string, from?: NoteRecord): LinkTarget {
    const [pathPart = '', section = ''] = raw.split('#');
    const target = pathPart.trim();
    if (!target) return { kind: 'broken', raw };

    // Asset lookup: by exact path first, then by name (Obsidian behavior).
    const norm = this.norm(target);
    const byPath = this.assetsByPath.get(norm);
    if (byPath) return this.assetTarget(byPath.relativePath, byPath.isImage);

    const name = target.split('/').pop()!.toLowerCase();
    const byName = this.assetsByName.get(name);
    if (byName) {
      const sameFolder = from
        ? byName.find((a) => a.relativePath.split('/').slice(0, -1).join('/') === from.folder)
        : undefined;
      const chosen = sameFolder ?? byName[0];
      return this.assetTarget(chosen.relativePath, chosen.isImage);
    }

    // Not an asset — maybe an embedded note.
    const note = this.resolveWiki(target, from);
    if (note.kind === 'note') return note;
    return { kind: 'broken', raw };
  }

  /**
   * Resolves a markdown link/image path (relative to the note's folder,
   * or vault-root when it starts with "/").
   */
  resolveMarkdownPath(href: string, from: NoteRecord): LinkTarget {
    const cleaned = decodeURIComponent(href).split('#')[0];
    if (!cleaned) return { kind: 'broken', raw: href };

    const candidates: string[] = [];
    if (cleaned.startsWith('/')) {
      candidates.push(cleaned.replace(/^\//, ''));
    } else {
      const dir = from.relativePath.includes('/')
        ? from.relativePath.split('/').slice(0, -1).join('/')
        : '';
      candidates.push(dir ? `${dir}/${cleaned}` : cleaned);
      candidates.push(cleaned);
    }

    for (const candidate of candidates) {
      const norm = this.norm(candidate.replace(/\.md$/i, ''));
      const note = this.byId.get(norm) ?? this.byRel.get(norm);
      if (note) {
        const anchor = decodeURIComponent(href).split('#')[1]?.trim();
        return this.noteTarget(note, anchor || undefined);
      }
      const asset = this.assetsByPath.get(norm);
      if (asset) return this.assetTarget(asset.relativePath, asset.isImage);
    }

    return { kind: 'broken', raw: href };
  }
}

export function isImageAsset(relativePath: string): boolean {
  return IMAGE_EXTENSIONS.has(relativePath.split('.').pop()?.toLowerCase() ?? '');
}

/** Builds the link lookup used by the renderer plugins. */
export function buildLinkLookup(context: ParserContext, records: NoteRecord[]): LinkLookup {
  const assets = context.snapshot!.assets.map((asset) => ({
    relativePath: asset.relativePath,
    isImage: isImageAsset(asset.relativePath),
  }));
  return new LinkLookup(
    { assetPublicPrefix: context.config.assetPublicPrefix },
    records,
    assets
  );
}

/**
 * Resolve stage: builds the navigation tree and assigns previous/next ids
 * using the deterministic depth-first file order.
 */
export function resolveLinks(context: ParserContext, records: NoteRecord[]): void {
  const tree = buildTree(records);
  const order = treeFileOrder(tree);
  const indexById = new Map(order.map((id, index) => [id, index]));

  for (const record of records) {
    const index = indexById.get(record.id);
    record.previous = index !== undefined && index > 0 ? order[index - 1] : null;
    record.next = index !== undefined && index < order.length - 1 ? order[index + 1] : null;
  }

  (context as ParserContext & { tree?: typeof tree }).tree = tree;
}
