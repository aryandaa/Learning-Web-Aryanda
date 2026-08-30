import type { CodeFileData, CodeFolderData, VaultCodeFile } from './types';

/**
 * Pipeline code-file: mengelompokkan source code file per folder dan
 * menghasilkan SATU data JSON per folder (spec: grouping by folder).
 *
 * Isi file dipertahankan 100% asli — tidak ada formatting, prettier,
 * normalisasi line-ending, atau transformasi apa pun.
 */

/** Id folder code untuk routing: lowercase + spasi -> hyphen (konsisten dgn id dokumen). */
export function codeFolderId(folderRelativePath: string): string {
  return folderRelativePath.replace(/\\/g, '/').toLowerCase().replace(/ /g, '-');
}

/** Id file code untuk routing: <folder-id>/<nama-file lowercase, spasi -> hyphen>. */
export function codeFileId(folderRelativePath: string, fileName: string): string {
  const fileKey = fileName.toLowerCase().replace(/ /g, '-');
  const folder = codeFolderId(folderRelativePath);
  return folder ? `${folder}/${fileKey}` : fileKey;
}

/** Nama folder terakhir dari sebuah path relatif. */
export function folderName(relativePath: string): string {
  const parts = relativePath.split('/');
  return parts[parts.length - 1] ?? relativePath;
}

/**
 * Group code files by folder (folder = direktori yang MENGAKUI file tsb).
 * Satu folder = satu CodeFolderData. Folder dengan subfolder tetap punya
 * data sendiri untuk file yang langsung berada di dalamnya.
 */
export function groupCodeFiles(codeFiles: VaultCodeFile[]): CodeFolderData[] {
  const byFolder = new Map<string, VaultCodeFile[]>();

  for (const file of codeFiles) {
    const parts = file.relativePath.split('/');
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    const list = byFolder.get(folder) ?? [];
    list.push(file);
    byFolder.set(folder, list);
  }

  const folders: CodeFolderData[] = [];
  for (const [folder, files] of byFolder) {
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    const data: CodeFileData[] = files.map((file) => ({
      name: file.name,
      path: file.relativePath,
      extension: file.extension,
      language: file.language,
      size: file.size,
      content: file.content,
      contentHash: file.contentHash,
    }));

    // parentPath = folder induk langsung ("" jika folder sudah di root vault).
    // Identity collection = `path` (full path), BUKAN nama folder terakhir.
    const parentPath = folder.includes('/') ? folder.split('/').slice(0, -1).join('/') : '';

    folders.push({
      schemaVersion: 1,
      type: 'code-folder',
      folder: folderName(folder),
      path: folder,
      parentPath,
      outputPath: `code/${folder}`, // relative public/docs, tanpa .json
      files: data,
    });
  }

  folders.sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: 'base' }));
  return folders;
}

/** Jumlah total file code di seluruh folder. */
export function countCodeFiles(folders: CodeFolderData[]): number {
  return folders.reduce((sum, folder) => sum + folder.files.length, 0);
}
