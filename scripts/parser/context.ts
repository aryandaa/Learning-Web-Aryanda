import type { ParserConfig } from './parser.config';
import type { TreeFolderNode, VaultSnapshot, Warnings } from './types';

/**
 * Shared mutable state threaded through the whole pipeline.
 * One instance per parse run.
 */
export class ParserContext {
  readonly vaultPath: string;
  readonly config: ParserConfig;
  snapshot: VaultSnapshot | null = null;
  /** Navigation tree, built during the resolve stage. */
  tree: TreeFolderNode[] | null = null;
  /**
   * Vault-relative paths of assets actually referenced by rendered notes.
   * Asset copying only keeps these (spec-free optimization: nothing else
   * is ever displayed, so nothing else is published).
   */
  referencedAssets = new Set<string>();
  warnings: Warnings = {
    duplicatePaths: [],
    brokenWikiLinks: [],
    missingImages: [],
    malformedFrontmatter: [],
    unsupportedEmbeds: [],
  };

  constructor(vaultPath: string, config: ParserConfig) {
    this.vaultPath = vaultPath;
    this.config = config;
  }

  warn(category: keyof Warnings, message: string): void {
    this.warnings[category].push(message);
  }

  get warningsCount(): number {
    return Object.values(this.warnings).reduce((sum, list) => sum + list.length, 0);
  }
}
