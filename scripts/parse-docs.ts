import path from 'path';
import fs from 'fs/promises';
import { parseVault, copyStaticAssets } from './parser/parser.js';

async function main() {
  const vaultArg = process.argv.find((arg) => arg.startsWith('--vault='));
  const vaultPath = vaultArg ? vaultArg.replace('--vault=', '') : process.env.VAULT_PATH;

  if (!vaultPath) {
    console.error('Usage: tsx scripts/parse-docs.ts --vault=PATH_TO_VAULT');
    process.exit(1);
  }

  const resolvedVault = path.resolve(vaultPath);
  const projectRoot = path.resolve(process.cwd());
  const publicAssetTarget = path.join(projectRoot, 'public', 'assets', 'vault');

  await fs.rm(path.join(projectRoot, 'generated', 'docs'), { recursive: true, force: true });
  await fs.rm(path.join(projectRoot, 'generated', 'warnings.json'), { force: true });
  await fs.rm(publicAssetTarget, { recursive: true, force: true });

  const docs = await parseVault(resolvedVault, projectRoot);
  await copyStaticAssets(resolvedVault, publicAssetTarget);

  if (docs.length === 0) {
    console.error('No markdown documents were found in the vault.');
    process.exit(2);
  }

  console.log(`Parsed ${docs.length} documents from vault at ${resolvedVault}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
