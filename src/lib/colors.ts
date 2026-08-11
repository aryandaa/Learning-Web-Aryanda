/**
 * Warna per folder level-1 (skill) — dipakai konsisten di graph,
 * roadmap, dan legenda. Folder baru otomatis mendapat warna fallback.
 */
export const FOLDER_COLORS: Record<string, string> = {
  CyberSecurity: '#fb7185',
  DevOps: '#a78bfa',
  Jaringan: '#38bdf8',
  Pemrograman: '#34d399',
};
export const FALLBACK_COLOR = '#94a3b8';

export function folderColor(folder: string): string {
  const top = folder.split('/')[0];
  return FOLDER_COLORS[top] ?? FALLBACK_COLOR;
}
