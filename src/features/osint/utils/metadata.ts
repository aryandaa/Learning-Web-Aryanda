/**
 * Metadata intelligence — bungkus parser cysec (EXIF/PDF/ZIP) + PNG tEXt
 * chunks + Office core.xml (docx/xlsx) — semua lokal.
 */

import { collectFileInfo, parseExif, parsePdfMetadata, parseZipListing, formatDate } from '../../cysec-tools/utils/files';
import { shaDigest, md5 } from '../../cysec-tools/utils/crypto';
import { bytesToHex, readAscii, u16 } from '../../cysec-tools/utils/bytes';
import { detectSignature, mimeFromMagic } from '../../cysec-tools/utils/analysis';
import type { LoadedFile } from '../../cysec-tools/components/FileDrop';

export interface OfficeCoreProps {
  title?: string;
  subject?: string;
  creator?: string;
  lastModifiedBy?: string;
  created?: string;
  modified?: string;
  application?: string;
}

/** Ekstrak core.xml dari ZIP (docx/xlsx/pptx) tanpa library eksternal. */
export function extractOfficeCore(file: LoadedFile): OfficeCoreProps | null {
  const bytes = file.bytes;
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) return null;
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  // Cari XML core properties (biasanya docProps/core.xml)
  const idx = text.indexOf('<cp:coreProperties');
  if (idx === -1) return null;
  const end = text.indexOf('</cp:coreProperties>', idx);
  if (end === -1) return null;
  const xml = text.slice(idx, end + 22);
  const grab = (tag: string): string | undefined => {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
    const m = re.exec(xml);
    if (!m) return undefined;
    const v = m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
    return v || undefined;
  };
  return {
    title: grab('dc:title'),
    subject: grab('dc:subject'),
    creator: grab('dc:creator'),
    lastModifiedBy: grab('cp:lastModifiedBy'),
    created: grab('dcterms:created'),
    modified: grab('dcterms:modified'),
    application: grab('cp:appVersion') ?? grab('application'),
  };
}

export interface PngTextChunk {
  keyword: string;
  text: string;
}

/** PNG tEXt/iTXt/zTXt chunks (metadata teks sederhana). */
export function extractPngTextChunks(bytes: Uint8Array): PngTextChunk[] {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50) return [];
  const out: PngTextChunk[] = [];
  let off = 8; // signature
  while (off + 8 <= bytes.length) {
    // Panjang chunk PNG: big-endian 4 byte
    const len = ((bytes[off] << 24) | (bytes[off + 1] << 16) | (bytes[off + 2] << 8) | bytes[off + 3]) >>> 0;
    const type = readAscii(bytes, off + 4, 4);
    const dataStart = off + 8;
    if (type === 'tEXt') {
      const nullIdx = bytes.indexOf(0, dataStart);
      if (nullIdx > dataStart && nullIdx < dataStart + len) {
        const keyword = readAscii(bytes, dataStart, nullIdx - dataStart);
        const value = readAscii(bytes, nullIdx + 1, dataStart + len - nullIdx - 1);
        out.push({ keyword, text: value });
      }
    } else if (type === 'iTXt') {
      const nullIdx = bytes.indexOf(0, dataStart);
      if (nullIdx > dataStart && nullIdx < dataStart + len) {
        const keyword = readAscii(bytes, dataStart, nullIdx - dataStart);
        // cari text setelah flags (1) + compressed(1) + langLen(1) + transLen(1)
        let p = nullIdx + 1;
        if (p + 3 >= dataStart + len) break;
        const compFlag = bytes[p];
        const langLen = bytes[p + 2];
        const transLen = bytes[p + 3];
        p += 4 + langLen + transLen;
        if (p < dataStart + len) {
          const value = readAscii(bytes, p, dataStart + len - p);
          out.push({ keyword, text: compFlag === 0 ? value : '(compressed — belum di-decompress)' });
        }
      }
    }
    off = dataStart + len + 4; // + CRC
  }
  return out;
}

export interface OsintMetadataResult {
  file: string;
  size: number;
  mime: string;
  extension: string;
  sha256: string;
  sha1: string;
  md5: string;
  signatures: ReturnType<typeof detectSignature>;
  exif?: ReturnType<typeof parseExif>;
  pdf?: Record<string, string>;
  zip?: ReturnType<typeof parseZipListing>;
  office?: OfficeCoreProps | null;
  png?: PngTextChunk[];
  lastModified?: string;
}

export async function analyzeOsintMetadata(file: LoadedFile): Promise<OsintMetadataResult> {
  const info = await collectFileInfo(file.file, file.bytes);
  const [sha256b, sha1b] = await Promise.all([
    shaDigest(file.bytes, 'SHA-256'),
    shaDigest(file.bytes, 'SHA-1'),
  ]);
  const ext = info.extension.toLowerCase();
  const result: OsintMetadataResult = {
    file: info.name,
    size: info.size,
    mime: info.type,
    extension: ext,
    sha256: bytesToHex(sha256b),
    sha1: bytesToHex(sha1b),
    md5: md5(file.bytes),
    signatures: info.signatures,
    lastModified: info.lastModifiedISO ?? undefined,
  };
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'tif' || ext === 'tiff') {
    result.exif = parseExif(file.bytes);
  } else if (ext === 'png') {
    result.png = extractPngTextChunks(file.bytes);
  } else if (ext === 'pdf') {
    result.pdf = parsePdfMetadata(file.bytes);
  } else if (ext === 'zip' || ext === 'jar' || ext === 'docx' || ext === 'xlsx' || ext === 'pptx' || ext === 'epub') {
    result.zip = parseZipListing(file.bytes);
    if (ext === 'docx' || ext === 'xlsx' || ext === 'pptx') {
      result.office = extractOfficeCore(file);
    }
  }
  void mimeFromMagic;
  return result;
}

export { formatDate };
