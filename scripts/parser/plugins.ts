import type { ParserContext } from './context';
import type { ParseResult, VaultSnapshot } from './types';

/**
 * Lightweight plugin lifecycle (spec §32).
 * Plugins register hooks and are invoked at each pipeline stage.
 * Future plugins: graph, flashcards, quiz, statistics, AI summary...
 */

export interface PluginHooks {
  beforeScan?(context: ParserContext): Promise<void> | void;
  afterScan?(context: ParserContext, snapshot: VaultSnapshot): Promise<void> | void;
  beforeValidate?(context: ParserContext): Promise<void> | void;
  afterValidate?(context: ParserContext): Promise<void> | void;
  beforeIndex?(context: ParserContext): Promise<void> | void;
  afterIndex?(context: ParserContext): Promise<void> | void;
  beforeResolve?(context: ParserContext): Promise<void> | void;
  afterResolve?(context: ParserContext): Promise<void> | void;
  beforeRender?(context: ParserContext): Promise<void> | void;
  afterRender?(context: ParserContext): Promise<void> | void;
  beforeCopyAssets?(context: ParserContext): Promise<void> | void;
  afterCopyAssets?(context: ParserContext): Promise<void> | void;
  beforeWrite?(context: ParserContext): Promise<void> | void;
  afterWrite?(context: ParserContext, result: ParseResult): Promise<void> | void;
  beforePublish?(context: ParserContext): Promise<void> | void;
  afterPublish?(context: ParserContext): Promise<void> | void;
}

export type PluginLifecycle = PluginHooks;

export async function runPlugins(context: ParserContext, hook: keyof PluginHooks, ...args: unknown[]): Promise<void> {
  for (const plugin of context.config.plugins) {
    const fn = plugin[hook];
    if (typeof fn === 'function') {
      await (fn as (...a: unknown[]) => unknown).apply(plugin, [context, ...args]);
    }
  }
}
