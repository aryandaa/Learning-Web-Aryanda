#!/usr/bin/env node
/**
 * TEST pipeline code-file (source code rendering dari vault).
 *
 * Menjalankan parser penuh terhadap vault fixture di temp dir, lalu
 * meng-assert seluruh persyaratan:
 *   - penemuan file .py/.js/.html/.php (dan extension lain)
 *   - grouping per folder (satu JSON per folder, tidak tercampur antar folder)
 *   - isi source code dipertahankan 100% (byte-exact, termasuk CRLF)
 *   - filename / extension / language detection benar
 *   - extension tidak dikenal tetap tampil (plaintext)
 *   - encoding invalid → warning + asset fallback (bukan code JSON)
 *   - binary → asset (bukan code JSON)
 *   - markdown lama tetap bekerja + routing docs tetap ada
 *   - search index hanya memuat metadata ringan (tanpa content)
 *   - mapping bahasa parser sinkron dengan mapping frontend
 *
 * Usage: npm run test:parser
 */
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { runParser } from './parser/pipeline';
import type { ParseResult } from './parser/types';
import { CODE_FILE_EXTENSIONS, languageForExtension } from './parser/code-languages';
import { languageInfo } from '../src/lib/codeLanguages';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(condition: unknown, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    failures.push(label);
    console.log(`  ✗ ${label}`);
  }
}

async function main(): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codelearn-test-'));
  const vault = path.join(root, 'vault');
  const out = path.join(root, 'generated');

  // ---------- bangun fixture vault ----------
  const write = async (rel: string, content: string | Buffer): Promise<void> => {
    const abs = path.join(vault, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content);
  };

  const PY = 'def hello():\n    print("Hello World")\n    return {"angka": 42, "emoji": "🎉"}\n';
  await write('Praktek/praktek1.py', PY);
  await write('Praktek/praktek2.py', 'x = 1\n# komentar asli, jangan diubah\ny = x + 2\n');
  await write('Praktek/latihan.js', 'const greet = (name) => {\n\treturn `Halo ${name}!`;\n};\nconsole.log(greet("Aryanda"));\n');
  await write('Praktek/index.html', '<!DOCTYPE html>\n<html>\n<body>\n  <h1>Test</h1>\n</body>\n</html>\n');

  // CRLF: line ending harus dipertahankan persis.
  await write('Files/script.js', Buffer.from('// CRLF file\r\nconst a = 1;\r\nconsole.log(a);\r\n'));
  await write('Files/example.py', 'print("from Files")\n');
  await write('Files/README.unknown', 'this is just text without a known extension\n');

  await write('JavaScript/app.js', 'export const app = 1;\n');
  await write('JavaScript/utils.js', 'export const utils = 2;\n');
  await write('PHP/index.php', '<?php echo "Halo";\n');

  await write('Sub/Nested/Praktek/a.py', 'print("nested")\n');
  await write('Sub/Nested/Praktek/b.js', 'console.log("nested js");\n');

  // REGRESSION: beberapa subkategori dengan folder "Praktek" masing-masing.
  // Identitas collection = FULL PATH (Python/Python Basic/Praktek ≠
  // Python/Python Advanced/Praktek), BUKAN nama folder "Praktek" saja.
  await write('Python/Python Basic/Praktek/praktek1.py', 'print("basic 1")\n');
  await write('Python/Python Basic/Praktek/praktek2.py', 'print("basic 2")\n');
  await write('Python/Python Advanced/Praktek/praktek3.py', 'print("advanced 3")\n');
  await write('Python/Python Advanced/Praktek/praktek4.py', 'print("advanced 4")\n');
  // Subkategori TANPA folder Praktek (hanya materi) → tidak boleh punya section.
  await write('Python/Python Expert/Materi.md', '# Python Expert\n\nTanpa folder Praktek.\n');
  // Sepasang SIBLING: hanya SATU yang punya folder Praktek.
  await write('Belajar/Konsep/Praktek/satu.py', 'print("satu")\n');
  await write('Belajar/Lanjutan/Materi.md', '# Lanjutan\n\nTanpa Praktek.\n');

  // Folder "Latihan" berisi code file tapi NAMA-nya bukan "Praktek"
  // → TIDAK boleh dianggap folder praktik (konvensi /Praktek/ saja).
  await write('Latihan/x.js', 'console.log("latihan bukan praktek");\n');

  await write('Materi/Belajar.md', '---\ntags: [python]\n---\n# Belajar\n\nIni catatan markdown biasa.\n\n![[gambar.png]]\n![[rusak.py]]\n\n```python\nprint("ok")\n```\n');

  // Binary: harus jadi asset, BUKAN code JSON.
  await write('Praktek/gambar.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]));

  // Invalid UTF-8 dengan extension code (.py) → warning + asset fallback.
  await write('Praktek/rusak.py', Buffer.from([0x70, 0x72, 0x69, 0x6e, 0x74, 0x28, 0x27, 0xe9, 0x27, 0x29, 0x0a]));

  // Folder ter-exclude: TIDAK boleh muncul di code JSON / tree.
  await write('Note Personal/rahasia.py', 'print("secret")\n');

  // ---------- jalankan parser ----------
  console.log('Running parser on fixture vault…');
  const result: ParseResult = await runParser({
    vaultPath: vault,
    generatedDir: out,
    skipPublish: true,
    skipAssets: false,
  });

  const docsDir = path.join(out, 'docs');

  // ---------- helper ----------
  const readFolderJson = async (rel: string): Promise<{ files: CodeFileLike[]; path?: string; parentPath?: string; type?: string }> => {
    return JSON.parse(await fs.readFile(path.join(docsDir, 'code', `${rel}.json`), 'utf-8'));
  };
  interface CodeFileLike {
    name: string;
    path?: string;
    extension?: string;
    language?: string;
    size?: number;
    content?: string;
  }
  const fileIn = (folderData: { files: CodeFileLike[] }, name: string): CodeFileLike | undefined =>
    folderData.files.find((f) => f.name === name);

  // ============================================================
  console.log('\n[1] Penemuan file & grouping per folder');
  // ============================================================
  const praktek = await readFolderJson('Praktek');
  ok(fileIn(praktek, 'praktek1.py'), '.py ditemukan di folder Praktek');
  ok(fileIn(praktek, 'praktek2.py'), 'file kedua .py di folder sama');
  ok(fileIn(praktek, 'latihan.js'), '.js ditemukan di folder Praktek');
  ok(fileIn(praktek, 'index.html'), '.html ditemukan di folder Praktek');
  ok(praktek.files.length === 4, `folder Praktek punya 4 file (dapat ${praktek.files.length})`);

  const filesFolder = await readFolderJson('Files');
  ok(fileIn(filesFolder, 'script.js'), '.js ditemukan di folder Files');
  ok(fileIn(filesFolder, 'example.py'), '.py ditemukan di folder Files');
  ok(fileIn(filesFolder, 'README.unknown'), 'extension tidak dikenal tetap tampil (README.unknown)');

  const jsFolder = await readFolderJson('JavaScript');
  ok(fileIn(jsFolder, 'app.js') && fileIn(jsFolder, 'utils.js'), 'folder JavaScript berisi app.js + utils.js');
  ok(!fileIn(jsFolder, 'latihan.js'), 'file dari folder berbeda tidak tercampur (latihan.js bukan di JavaScript)');

  const phpFolder = await readFolderJson('PHP');
  ok(fileIn(phpFolder, 'index.php'), '.php ditemukan di folder PHP');

  const nested = await readFolderJson('Sub/Nested/Praktek');
  ok(fileIn(nested, 'a.py') && fileIn(nested, 'b.js'), 'folder bersarang (Sub/Nested/Praktek) punya JSON sendiri');

  // ============================================================
  console.log('\n[2] Isi source code 100% asli');
  // ============================================================
  const py1 = fileIn(praktek, 'praktek1.py')!;
  ok(py1.content === PY, 'isi praktek1.py identik byte-exact (indentasi, emoji, newline)');

  const crlf = fileIn(filesFolder, 'script.js')!;
  const crlfOriginal = '// CRLF file\r\nconst a = 1;\r\nconsole.log(a);\r\n';
  ok(crlf.content === crlfOriginal, 'line ending CRLF dipertahankan persis');

  const html = fileIn(praktek, 'index.html')!;
  ok(html.content!.includes('<!DOCTYPE html>') && html.content!.endsWith('</html>\n'), 'isi HTML utuh');

  // ============================================================
  console.log('\n[3] Filename, extension, language detection');
  // ============================================================
  ok(py1.name === 'praktek1.py', 'filename benar');
  ok(py1.extension === '.py', 'extension benar (.py)');
  ok(py1.language === 'python', 'language .py = python');
  ok(fileIn(praktek, 'latihan.js')!.language === 'javascript', 'language .js = javascript');
  ok(fileIn(praktek, 'index.html')!.language === 'html', 'language .html = html');
  ok(fileIn(phpFolder, 'index.php')!.language === 'php', 'language .php = php');
  ok(fileIn(filesFolder, 'README.unknown')!.language === 'plaintext', 'extension tidak dikenal → plaintext');

  // ============================================================
  console.log('\n[4] Binary & encoding invalid');
  // ============================================================
  ok(!fileIn(praktek, 'gambar.png'), 'binary .png TIDAK masuk code JSON');
  ok(!fileIn(praktek, 'rusak.py'), 'file .py dengan encoding invalid TIDAK masuk code JSON');
  ok(result.warnings.invalidEncoding.some((w) => w.includes('rusak.py')), 'warning invalidEncoding untuk rusak.py');
  ok(result.assets.some((a) => a.sourcePath === 'Praktek/rusak.py'), 'rusak.py fallback menjadi asset');
  ok(result.assets.some((a) => a.sourcePath === 'Praktek/gambar.png'), 'gambar.png menjadi asset');

  // ============================================================
  console.log('\n[5] Exclude folder');
  // ============================================================
  try {
    await readFolderJson('Note Personal/rahasia');
    ok(false, 'folder Note Personal tidak punya code JSON');
  } catch {
    ok(true, 'folder Note Personal tidak punya code JSON (exclude)');
  }
  const hasSecret = JSON.stringify(result.tree).includes('rahasia.py');
  ok(!hasSecret, 'rahasia.py tidak muncul di tree');

  // ============================================================
  console.log('\n[6] Markdown lama tetap bekerja');
  // ============================================================
  const belajar = result.records.find((r) => r.id === 'materi/belajar');
  ok(Boolean(belajar), 'dokumen markdown tetap di-parsing');
  ok(belajar!.html.includes('<h1') && belajar!.html.includes('Ini catatan markdown biasa'), 'markdown dirender menjadi HTML');
  const belajarJson = path.join(docsDir, 'Materi/Belajar.json');
  ok((await fs.stat(belajarJson)).isFile(), 'JSON dokumen markdown tetap ditulis');
  ok(result.tree.some((n) => JSON.stringify(n).includes('"id":"materi/belajar"')), 'dokumen markdown tetap ada di tree');

  // Prev/Next hanya antar dokumen markdown (code file tidak ikut).
  const { treeFileOrder } = await import('./parser/tree');
  const order = treeFileOrder(result.tree);
  ok(!order.some((id) => id.endsWith('.py') || id.endsWith('.js')), 'tree file order (Prev/Next) tidak memuat code file');
  ok(result.records.every((r) => r.previous !== 'praktek/praktek1.py' && r.next !== 'praktek/praktek1.py'), 'previous/next record tidak menunjuk code file');

  // ============================================================
  console.log('\n[7] Tree: struktur folder code');
  // ============================================================
  const findNode = (nodes: import('./parser/types').TreeNode[], rel: string): import('./parser/types').TreeFolderNode | null => {
    for (const n of nodes) {
      if (n.type === 'folder' && n.relativePath === rel) return n;
      if (n.type === 'folder') {
        const found = findNode(n.children, rel);
        if (found) return found;
      }
    }
    return null;
  };
  const praktekNode = findNode(result.tree as unknown as import('./parser/types').TreeNode[], 'Praktek');
  ok(Boolean(praktekNode), 'folder Praktek ada di tree');
  ok(praktekNode?.isCodeFolder === true, 'folder Praktek ditandai isCodeFolder');
  ok(praktekNode?.children.some((c) => c.type === 'file' && c.isCode && c.title === 'praktek1.py'), 'praktek1.py jadi node file isCode');
  const nestedNode = findNode(result.tree as unknown as import('./parser/types').TreeNode[], 'Sub/Nested/Praktek');
  ok(Boolean(nestedNode) && nestedNode?.isCodeFolder === true, 'folder bersarang isCodeFolder');
  const codeFileNode = praktekNode?.children.find(
    (c): c is import('./parser/types').TreeFileNode => c.type === 'file' && c.title === 'praktek1.py'
  );
  ok(codeFileNode?.id === 'praktek/praktek1.py', `id code file konsisten (${codeFileNode?.id})`);

  // ============================================================
  console.log('\n[8] Metadata & search index ringan');
  // ============================================================
  ok(result.metadata.totalCodeFiles >= 10, `metadata.totalCodeFiles = ${result.metadata.totalCodeFiles} (>= 10)`);
  ok(result.metadata.totalCodeFolders >= 5, `metadata.totalCodeFolders = ${result.metadata.totalCodeFolders} (>= 5)`);
  const codeSearch = result.searchIndex.filter((s) => s.id.endsWith('.py') || s.id.endsWith('.js') || s.id.includes('README.unknown'));
  ok(codeSearch.length >= 5, `search index berisi entri code (${codeSearch.length})`);
  ok(codeSearch.every((s) => s.content === '' && s.excerpt === ''), 'search index code TANPA content (ringan)');
  const praktekSearch = codeSearch.find((s) => s.id === 'praktek/praktek1.py');
  ok(Boolean(praktekSearch) && praktekSearch!.folder === 'Praktek', 'entri search code punya folder + id benar');

  // ============================================================
  console.log('\n[9] Sinkronisasi mapping bahasa parser ↔ frontend');
  // ============================================================
  let mappingOk = true;
  for (const ext of CODE_FILE_EXTENSIONS) {
    if (ext === '.md') continue; // markdown bukan code file
    const lang = languageForExtension(`sample${ext}`);
    const info = languageInfo(lang);
    if (info.label === 'Text' && lang !== 'plaintext') {
      mappingOk = false;
      console.log(`    → bahasa "${lang}" (dari ${ext}) tidak dikenal frontend`);
    }
  }
  ok(mappingOk, 'setiap bahasa parser dikenali mapping frontend');

  // ============================================================
  console.log('\n[10] Artifacts generated tetap ada (backward compat)');
  // ============================================================
  for (const file of ['tree.json', 'search-index.json', 'metadata.json', 'graph.json', 'roadmaps.json']) {
    ok((await fs.stat(path.join(docsDir, file)).catch(() => null)) !== null, `generated/docs/${file} ada`);
  }
  ok((await fs.stat(path.join(out, 'warnings.json')).catch(() => null)) !== null, 'generated/warnings.json ada');

  // ============================================================
  console.log('\n[11] Roadmap: section Code / Praktik (folder bernama "Praktek" saja)');
  // ============================================================
  const { collectPracticeFiles } = await import('../src/lib/practiceFiles');
  const { buildCodeIndex } = await import('../src/services/docs');

  const practiceRoot = collectPracticeFiles(result.tree, '');
  ok(
    practiceRoot.length === 11,
    `scope root: 11 file praktik (Praktek 4 + Sub/Nested/Praktek 2 + Python Basic 2 + Python Advanced 2 + Belajar/Konsep/Praktek 1) — dapat ${practiceRoot.length}`
  );
  ok(
    practiceRoot.every((f) => f.relativePath.toLowerCase().includes('/praktek/') || f.relativePath.toLowerCase().startsWith('praktek/')),
    'semua file praktik berada di dalam folder bernama Praktek'
  );
  ok(
    !practiceRoot.some((f) => f.relativePath.startsWith('Files/') || f.relativePath.startsWith('JavaScript/') || f.relativePath.startsWith('PHP/') || f.relativePath.startsWith('Latihan/')),
    'folder Files/JavaScript/PHP/Latihan TIDAK dianggap folder praktik (konvensi /Praktek/)'
  );

  // Skill tanpa /Praktek/ → section tidak muncul (0 file).
  ok(collectPracticeFiles(result.tree, 'Materi').length === 0, 'skill tanpa folder Praktek → 0 file praktik');
  // Skill dengan /Praktek/ (langsung di bawah scope).
  ok(collectPracticeFiles(result.tree, 'Sub/Nested').length === 2, 'scope Sub/Nested → 2 file praktik');
  // /Praktek/ ditemukan rekursif di subfolder.
  ok(collectPracticeFiles(result.tree, 'Sub').length === 2, 'scope Sub → folder Praktek bersarang ditemukan (2 file)');

  // Setiap file praktik bisa dibuka via renderer yang sudah ada (CodeFileViewer):
  // id-nya harus ada di codeFileById (index dari tree, dipakai routing /docs/*).
  const { codeFileById } = buildCodeIndex(result.tree);
  ok(
    practiceRoot.every((f) => codeFileById.has(f.id)),
    'semua file praktik ter-resolve ke route viewer source code yang sudah ada'
  );
  const uniqueIds = new Set(practiceRoot.map((f) => f.id));
  ok(uniqueIds.size === practiceRoot.length, 'tidak ada id duplikat (tidak ada duplikasi source code)');
  ok(
    practiceRoot.every((f) => f.name === f.relativePath.split('/').pop()),
    'nama file praktik sama dengan nama file asli di path-nya'
  );

  // ============================================================
  console.log('\n[12] REGRESSION: beberapa folder "Praktek" → group per FULL PATH');
  // ============================================================
  const { collectPracticeGroups } = await import('../src/lib/practiceFiles');

  // (a) Parser level: dua folder Praktek SIBLING menghasilkan DUA JSON terpisah,
  //     masing-masing mempertahankan path lengkap + parentPath.
  const pyBasic = await readFolderJson('Python/Python Basic/Praktek');
  const pyAdvanced = await readFolderJson('Python/Python Advanced/Praktek');
  ok(pyBasic.path === 'Python/Python Basic/Praktek', 'path JSON Basic = full path (bukan hanya "Praktek")');
  ok(pyAdvanced.path === 'Python/Python Advanced/Praktek', 'path JSON Advanced = full path');
  ok(pyBasic.parentPath === 'Python/Python Basic', 'parentPath Basic = parent sebenarnya');
  ok(pyAdvanced.parentPath === 'Python/Python Advanced', 'parentPath Advanced = parent sebenarnya');
  ok(pyBasic.type === 'code-folder', 'CodeFolderData punya type "code-folder"');
  ok(pyBasic.files.length === 2, `folder Basic punya 2 file (${pyBasic.files.length})`);
  ok(pyAdvanced.files.length === 2, `folder Advanced punya 2 file (${pyAdvanced.files.length})`);
  ok(
    pyBasic.files.every((f) => (f.path ?? '').startsWith('Python/Python Basic/Praktek/')) &&
      pyAdvanced.files.every((f) => (f.path ?? '').startsWith('Python/Python Advanced/Praktek/')),
    'file tidak pernah berpindah antar folder Praktek (parser level)'
  );
  ok(!fileIn(pyBasic, 'praktek3.py') && !fileIn(pyAdvanced, 'praktek1.py'), 'tidak ada file milik folder lain masuk collection');

  // (b) Frontend grouping: SATU group per FULL PATH, file tidak tercampur.
  const pyGroups = collectPracticeGroups(result.tree, 'Python');
  ok(pyGroups.length === 2, `scope Python → 2 group terpisah (Basic + Advanced), dapat ${pyGroups.length}`);
  const groupByPath = new Map(pyGroups.map((g) => [g.path, g]));
  ok(groupByPath.has('Python/Python Basic/Praktek'), 'group Basic teridentifikasi oleh full path');
  ok(groupByPath.has('Python/Python Advanced/Praktek'), 'group Advanced teridentifikasi oleh full path');
  ok(
    groupByPath.get('Python/Python Basic/Praktek')!.files.every((f) => f.relativePath.includes('Python Basic/Praktek/')),
    'file Basic tetap di group Basic'
  );
  ok(
    groupByPath.get('Python/Python Advanced/Praktek')!.files.every((f) => f.relativePath.includes('Python Advanced/Praktek/')),
    'file Advanced tetap di group Advanced'
  );
  ok(
    groupByPath.get('Python/Python Basic/Praktek')!.parentPath === 'Python/Python Basic' &&
      groupByPath.get('Python/Python Advanced/Praktek')!.parentPath === 'Python/Python Advanced',
    'parentPath group benar'
  );
  ok(
    pyGroups.every((g) => g.id === g.path.toLowerCase().replace(/ /g, '-')),
    'id group = normalized full path (unique id, bukan nama folder)'
  );

  // (c) Subkategori tanpa Praktek → TIDAK ada group/section.
  ok(collectPracticeGroups(result.tree, 'Python/Python Expert').length === 0, 'subkategori tanpa Praktek → 0 group');
  ok(collectPracticeGroups(result.tree, 'Materi').length === 0, 'scope tanpa Praktek sama sekali → 0 group');

  // (c2) Sepasang sibling: HANYA subkategori yang benar-benar punya Praktek
  //      yang mendapat group — sibling tanpa Praktek tidak boleh ikut.
  const belajarGroups = collectPracticeGroups(result.tree, 'Belajar');
  ok(
    belajarGroups.length === 1 && belajarGroups[0].path === 'Belajar/Konsep/Praktek',
    `dari sepasang sibling, hanya yang punya Praktek mendapat group (dapat ${belajarGroups.length})`
  );
  ok(collectPracticeGroups(result.tree, 'Belajar/Lanjutan').length === 0, 'sibling tanpa Praktek → tidak ada group');

  // (d) Nested lebih dalam & beberapa file dalam satu Praktek.
  const nestedGroups = collectPracticeGroups(result.tree, 'Sub');
  ok(
    nestedGroups.length === 1 && nestedGroups[0].path === 'Sub/Nested/Praktek',
    'nested Praktek = 1 group dengan full path'
  );
  ok(nestedGroups[0].files.length === 2, 'satu Praktek dengan beberapa file → semua masuk group yang sama');
  const rootGroups = collectPracticeGroups(result.tree, '');
  ok(
    rootGroups.length === 5,
    `root → 5 group (Praktek, Sub/Nested/Praktek, Basic, Advanced, Belajar/Konsep/Praktek) — dapat ${rootGroups.length}`
  );
  ok(
    rootGroups.every((g, i) => i === 0 || rootGroups[i - 1].path.localeCompare(g.path, undefined, { sensitivity: 'base' }) <= 0),
    'group terurut deterministik berdasarkan path'
  );

  // (e) Koneksi ke viewer yang sudah ada: setiap file group ter-resolve di codeFileById.
  for (const g of pyGroups) {
    ok(g.files.every((f) => codeFileById.has(f.id)), `file di group ${g.path} ter-resolve ke route viewer`);
  }

  // ============================================================
  await fs.rm(root, { recursive: true, force: true });

  console.log('\n==============================');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failed > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log('All code-file parser tests passed ✓');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
