import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';

export interface DocEntry {
  slug: string;
  title: string;
  excerpt: string;
  html: string;
  source: string;
}

async function listVaultFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'vendor') {
      continue;
    }

    const nextPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listVaultFiles(nextPath)));
      continue;
    }

    files.push(nextPath);
  }

  return files;
}

function normalizeSlug(relativePath: string): string {
  return relativePath.replace(/\\/g, '/').replace(/\.md$/i, '');
}

function excerptFromContent(content: string): string {
  const trimmed = content.trim();
  const match = trimmed.match(/^(.*?)(?:\n\n|$)/s);
  return match ? match[1].replace(/\n+/g, ' ').slice(0, 200) : trimmed.slice(0, 200);
}

async function renderMarkdownToHtml(markdown: string): Promise<string> {
  const file = await remark()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKatex)
    .use(rehypeHighlight, { ignoreMissing: true })
    .use(rehypeStringify)
    .process(markdown);

  return String(file);
}

export async function parseVault(vaultDir: string, outputRoot: string): Promise<DocEntry[]> {
  const files = await listVaultFiles(vaultDir);
  const docs: DocEntry[] = [];

  for (const absoluteFile of files) {
    const relative = path.relative(vaultDir, absoluteFile);
    if (relative.startsWith('.') || relative.includes('/.')) {
      continue;
    }

    if (!relative.toLowerCase().endsWith('.md')) {
      continue;
    }

    const raw = String(await fs.readFile(absoluteFile, 'utf-8'));
    const parsed = matter(raw);
    const slug = normalizeSlug(relative);
    const title = String(parsed.data.title || path.basename(relative, path.extname(relative))).trim();
    const excerpt = excerptFromContent(parsed.content);
    const html = await renderMarkdownToHtml(parsed.content);

    docs.push({
      slug,
      title,
      excerpt,
      html,
      source: relative.replace(/\\/g, '/'),
    });
  }

  docs.sort((a, b) => a.slug.localeCompare(b.slug, undefined, { sensitivity: 'base' }));

  const docsOutputDir = path.join(outputRoot, 'generated', 'docs');
  const assetsOutputDir = path.join(outputRoot, 'public', 'assets', 'vault');
  await fs.mkdir(docsOutputDir, { recursive: true });
  await fs.mkdir(assetsOutputDir, { recursive: true });

  await fs.writeFile(path.join(docsOutputDir, 'index.json'), JSON.stringify(docs, null, 2), 'utf-8');
  await fs.writeFile(path.join(outputRoot, 'generated', 'warnings.json'), JSON.stringify({ warnings: [] }, null, 2), 'utf-8');

  return docs;
}

export async function copyStaticAssets(vaultDir: string, targetDir: string): Promise<void> {
  const entries = await fs.readdir(vaultDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'generated') {
      continue;
    }

    const sourcePath = path.join(vaultDir, entry.name);
    const destPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyStaticAssets(sourcePath, destPath);
      continue;
    }

    if (!entry.name.toLowerCase().endsWith('.md')) {
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(sourcePath, destPath);
    }
  }
}
