import type { TreeFolderNode, TreeNode } from '../domain/types';
import { findFolderNode, normalizeId, parentPathOf } from '../services/docs';

/**
 * Koleksi file praktik/source code untuk Roadmap.
 *
 * KONVENSI (satu-satunya indikator, tanpa heuristik):
 *   folder bernama "Praktek" (case-insensitive) = folder praktik/source code.
 *
 * IDENTITAS (penting):
 *   "Praktek" BUKAN kategori global. Setiap folder "Praktek" adalah collection
 *   LOKAL yang terikat pada parent directory-nya. Identity = FULL RELATIVE PATH:
 *
 *     Python/Python Basic/Praktek   ≠   Python/Python Advanced/Praktek
 *
 *   File dari satu folder Praktek TIDAK PERNAH bercampur dengan folder lain,
 *   walau namanya sama. Grouping dilakukan lewat `collectPracticeGroups()`
 *   yang menghasilkan SATU group per folder (key = path lengkap).
 *
 * Data berasal dari tree.json yang sama dengan halaman Docs (pipeline parser
 * yang sudah ada) — tidak ada salinan/duplikasi source code.
 */

export interface PracticeFile {
  /** Id route code file (sama dengan tree), mis. ".../praktek/requests-dasar.py". */
  id: string;
  /** Nama file lengkap. */
  name: string;
  /** Path relatif vault. */
  relativePath: string;
  extension: string;
  language: string;
  size: number;
}

/** SATU collection folder "Praktek" (identitas = `path`, bukan `name`). */
interface PracticeGroup {
  /** Jenis collection (selalu "code-folder"). */
  type: 'code-folder';
  /** Id route folder (normalized FULL PATH), mis. "pemrograman/python/python-dasar/praktek". */
  id: string;
  /** Nama folder terakhir, mis. "Praktek". */
  name: string;
  /** Path relatif folder, mis. "Pemrograman/Python/Python Dasar/Praktek". */
  path: string;
  /** Path relatif folder induk, mis. "Pemrograman/Python/Python Dasar". */
  parentPath: string;
  /** File code yang berada di dalam folder ini (termasuk subfolder-nya). */
  files: PracticeFile[];
}

const isPraktekFolder = (name: string): boolean => name.toLowerCase() === 'praktek';

/** Semua code file di bawah node folder (rekursif, termasuk subfolder). */
function codeFilesUnder(node: TreeFolderNode): PracticeFile[] {
  const out: PracticeFile[] = [];
  const collectFrom = (items: TreeNode[]): void => {
    for (const item of items) {
      if (item.type === 'file') {
        if (!item.isCode) continue;
        out.push({
          id: item.id,
          name: item.title,
          relativePath: item.relativePath,
          extension: item.extension ?? '',
          language: item.language ?? 'plaintext',
          size: item.size ?? 0,
        });
      } else {
        collectFrom(item.children);
      }
    }
  };
  collectFrom(node.children);
  return out;
}

/**
 * Kumpulkan semua collection "Praktek" di dalam scope folder, SATU GROUP PER
 * FULL PATH. Scope kosong = seluruh tree (root).
 *
 * - Setiap folder bernama "Praktek" (case-insensitive) menghasilkan SATU group
 *   dengan identity = `path` lengkap (mis. "Pemrograman/Python/Python Dasar/Praktek").
 * - Group hanya dibuat jika folder benar-benar berisi file code (folder kosong
 *   / tanpa code file tidak menghasilkan section).
 * - File di luar folder "Praktek" TIDAK ikut (folder "Files", "Latihan", dll. diabaikan).
 * - Hasil diurutkan deterministik berdasarkan path.
 */
export function collectPracticeGroups(nodes: TreeNode[], scope: string): PracticeGroup[] {
  const groups: PracticeGroup[] = [];

  const walk = (items: TreeNode[]): void => {
    for (const node of items) {
      if (node.type !== 'folder') continue;
      if (isPraktekFolder(node.name)) {
        const files = codeFilesUnder(node);
        if (files.length === 0) continue; // tidak ada section kosong
        groups.push({
          type: 'code-folder',
          id: normalizeId(node.relativePath),
          name: node.name,
          path: node.relativePath,
          parentPath: parentPathOf(node.relativePath),
          files,
        });
      } else {
        walk(node.children);
      }
    }
  };

  if (!scope) {
    walk(nodes);
  } else {
    const start = findFolderNode(nodes, scope);
    if (start) walk([start]);
  }

  groups.sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: 'base' }));
  return groups;
}

/**
 * Flat union semua file praktik di scope (kompatibilitas). Dipakai oleh
 * pemanggil yang hanya butuh daftar file tanpa memperhatikan grouping.
 * Untuk render yang mempertahankan hierarchy, pakai `collectPracticeGroups`.
 */
export function collectPracticeFiles(nodes: TreeNode[], scope: string): PracticeFile[] {
  return collectPracticeGroups(nodes, scope).flatMap((group) => group.files);
}
