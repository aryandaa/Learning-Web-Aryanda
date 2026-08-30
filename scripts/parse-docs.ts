#!/usr/bin/env node
/**
 * Parser CLI entrypoint.
 *
 * Usage:
 *   npm run parse -- --vault=/path/to/vault [--commit=<sha>] [--branch=<name>]
 *                       [--out=<generated dir>] [--no-publish] [--no-assets]
 *
 * Environment fallbacks: VAULT_PATH, VAULT_COMMIT, VAULT_BRANCH, GENERATED_DIR.
 */
import path from 'path';
import { runParser } from './parser/pipeline';
import type { ParseSummary } from './parser/types';

interface CliArgs {
  vault: string | null;
  commit: string | null;
  branch: string | null;
  out: string | null;
  noPublish: boolean;
  noAssets: boolean;
  excludes: string[];
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    vault: null,
    commit: null,
    branch: null,
    out: null,
    noPublish: false,
    noAssets: false,
    excludes: [],
  };

  for (const arg of argv) {
    if (arg.startsWith('--vault=')) args.vault = arg.slice('--vault='.length);
    else if (arg.startsWith('--commit=')) args.commit = arg.slice('--commit='.length);
    else if (arg.startsWith('--branch=')) args.branch = arg.slice('--branch='.length);
    else if (arg.startsWith('--out=')) args.out = arg.slice('--out='.length);
    else if (arg.startsWith('--exclude=')) args.excludes.push(arg.slice('--exclude='.length));
    else if (arg === '--no-publish') args.noPublish = true;
    else if (arg === '--no-assets') args.noAssets = true;
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const vaultPath = args.vault ?? process.env.VAULT_PATH;
  if (!vaultPath) {
    console.error('Usage: npm run parse -- --vault=PATH_TO_VAULT [--commit=sha] [--branch=name]');
    console.error('       or set VAULT_PATH environment variable.');
    process.exit(1);
  }

  const resolvedVault = path.resolve(vaultPath);
  const commit = args.commit ?? process.env.VAULT_COMMIT ?? null;
  const branch = args.branch ?? process.env.VAULT_BRANCH ?? null;
  const out = args.out ?? process.env.GENERATED_DIR ?? null;

  console.log(`Parsing vault: ${resolvedVault}`);
  if (commit) console.log(`Vault commit:  ${commit}`);
  if (branch) console.log(`Vault branch:  ${branch}`);

  const result = await runParser({
    vaultPath: resolvedVault,
    vaultCommit: commit,
    vaultBranch: branch,
    generatedDir: out ?? undefined,
    skipPublish: args.noPublish,
    skipAssets: args.noAssets,
    excludeFolders: args.excludes,
  });

  const summary: ParseSummary = {
    notes: result.metadata.totalNotes,
    folders: result.metadata.totalFolders,
    assets: result.assets.length,
    warnings: result.metadata.warningsCount,
    brokenLinks: result.metadata.brokenLinksCount,
    codeFiles: result.metadata.totalCodeFiles,
    codeFolders: result.metadata.totalCodeFolders,
    outputDir: out ?? path.join(process.cwd(), 'generated'),
  };

  console.log('---');
  console.log(`Notes:      ${summary.notes}`);
  console.log(`Folders:    ${summary.folders}`);
  console.log(`Assets:     ${summary.assets}`);
  console.log(`Code files: ${summary.codeFiles}`);
  console.log(`Code folders: ${summary.codeFolders}`);
  console.log(`Warnings:   ${summary.warnings}`);
  console.log(`Broken links: ${summary.brokenLinks}`);
  console.log(`Output:     ${summary.outputDir}`);

  if (summary.warnings > 0) {
    console.log('---');
    console.log('Warnings (see generated/warnings.json for details):');
    for (const [category, entries] of Object.entries(result.warnings)) {
      if (entries.length > 0) {
        console.log(`  ${category}: ${entries.length}`);
      }
    }
  }

  if (summary.notes === 0) {
    console.error('No markdown documents found in vault. Aborting.');
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
