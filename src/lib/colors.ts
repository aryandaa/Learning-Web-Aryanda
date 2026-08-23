/**
 * Warna per folder level-1 (skill). dipakai konsisten di graph,
 * roadmap, dan legenda. Folder baru otomatis mendapat warna fallback.
 *
 * Palet muted (neutral + green identity): tanpa purple/violet/indigo,
 * tanpa neon. Hanya hue yang redup untuk membedakan topik.
 */
export const FOLDER_COLORS: Record<string, string> = {
  CyberSecurity: '#B86B68',
  DevOps: '#6F9B78',
  Jaringan: '#6E9CB8',
  Pemrograman: '#C49A5A',
};
export const FALLBACK_COLOR = '#8A938A';

export function folderColor(folder: string): string {
  const top = folder.split('/')[0];
  return FOLDER_COLORS[top] ?? FALLBACK_COLOR;
}
