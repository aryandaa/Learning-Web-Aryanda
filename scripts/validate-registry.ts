/**
 * Validasi registry CySec Tools (development-time).
 *
 * Memastikan prinsip ONE TOOL = ONE CATEGORY:
 *  1. tidak ada duplicate tool ID (per namespace)
 *  2. setiap tool memiliki category (single string)
 *  3. category harus dikenal
 *  4. tidak boleh ada multi-category (`alsoIn` / `categories` array)
 *  5. tidak ada duplicate route/path (global, CySec + OSINT)
 *
 * Jalankan: npm run validate
 */

import { CATEGORIES as CY_CATEGORIES, allTools } from '../src/features/cysec-tools/registry';
import { CATEGORIES as OSINT_CATEGORIES, allOsintTools } from '../src/features/osint/registry';

let errors = 0;
let warnings = 0;

function err(msg: string) {
  errors++;
  console.error(`  ❌ ${msg}`);
}
function warn(msg: string) {
  warnings++;
  console.warn(`  ⚠ ${msg}`);
}

function validateNamespace(label: string, tools: { id: string; category: string; path?: string }[], knownCategories: Set<string>) {
  console.log(`\n${label}:`);
  const seenIds = new Set<string>();
  const seenPaths = new Set<string>();
  for (const t of tools) {
    // 1) duplicate id
    if (seenIds.has(t.id)) err(`Tool '${t.id}' duplikat di ${label}.`);
    seenIds.add(t.id);

    // 4) multi-category
    const any = t as unknown as Record<string, unknown>;
    if (any.alsoIn !== undefined) err(`Tool '${t.id}' memiliki 'alsoIn' (multi-category). Setiap tool harus satu category.`);
    if (Array.isArray(any.category)) err(`Tool '${t.id}' memiliki category berupa array. Gunakan satu string canonical.`);
    if (any.categories !== undefined) err(`Tool '${t.id}' memiliki field 'categories'. Gunakan satu field 'category' string.`);

    // 2) missing category
    if (!t.category || typeof t.category !== 'string') {
      err(`Tool '${t.id}' tanpa category.`);
      continue;
    }
    // 3) unknown category
    if (!knownCategories.has(t.category)) {
      err(`Tool '${t.id}' memiliki category tidak dikenal: '${t.category}'.`);
    }

    // 5) duplicate route/path
    if (t.path) {
      if (seenPaths.has(t.path)) err(`Tool '${t.id}' memiliki route duplikat: ${t.path}.`);
      seenPaths.add(t.path);
    }

    // alias (route lama) harus unik dan tidak menabrak id
    const aliases = (t as unknown as { aliases?: string[] }).aliases ?? [];
    for (const a of aliases) {
      if (seenIds.has(a)) err(`Tool '${t.id}' memiliki alias '${a}' yang bentrok dengan id lain.`);
      if (seenPaths.has(`/cysec-tools/${a}`)) err(`Tool '${t.id}' memiliki alias '${a}' yang bentrok dengan route lain.`);
      seenIds.add(a);
    }
  }
}

const cyCategories = new Set(CY_CATEGORIES.map((c) => c.id));
const osintCategories = new Set(OSINT_CATEGORIES.map((c) => c.id));

const cyTools = allTools();
const osintTools = allOsintTools();

validateNamespace('CySec Tools', cyTools, cyCategories);
validateNamespace('OSINT', osintTools, osintCategories);

// Route unik global (CySec /cysec-tools/:id dan OSINT /osint/:id)
console.log('\nRoute global:');
const globalPaths = new Set<string>();
for (const t of cyTools) {
  const p = `/cysec-tools/${t.id}`;
  if (globalPaths.has(p)) err(`Route duplikat: ${p}`);
  globalPaths.add(p);
}
for (const t of osintTools) {
  const p = `/osint/${t.id}`;
  if (globalPaths.has(p)) err(`Route duplikat: ${p}`);
  globalPaths.add(p);
}

// Collision ID lintas namespace (hanya peringatan; route tetap unik)
const cyIds = new Set(cyTools.map((t) => t.id));
for (const t of osintTools) {
  if (cyIds.has(t.id)) {
    warn(`ID '${t.id}' ada di CySec dan OSINT (route berbeda; dipertahankan untuk kompatibilitas).`);
  }
}

// Hitung kategori canonical untuk laporan
console.log('\nKategori canonical (jumlah tool):');
const count = new Map<string, number>();
for (const t of cyTools) count.set(t.category, (count.get(t.category) ?? 0) + 1);
count.set('osint', osintTools.length);
for (const c of CY_CATEGORIES) {
  console.log(`  ${c.icon} ${c.name}: ${count.get(c.id) ?? 0} tools`);
}

console.log(`\nHasil validasi: ${errors} error, ${warnings} warning.`);
if (errors > 0) {
  console.error('REGISTRY INVALID. Perbaiki sebelum lanjut.');
  process.exit(1);
}
console.log('REGISTRY VALID. Satu tool = satu category. ✔');
