/**
 * Forensics file: metadata, EXIF (JPEG), PDF metadata, ZIP listing, timestamp.
 * Semua parsing murni client-side di atas Uint8Array.
 */

import { bytesToHex, readAscii, u16, u32 } from './bytes';
import { detectSignature, mimeFromMagic } from './analysis';
import { md5 } from './crypto';
import { shaDigest } from './crypto';

export interface FileInfo {
  name: string;
  size: number;
  sizeHuman: string;
  type: string;
  extension: string;
  lastModified: number | null;
  lastModifiedISO: string | null;
  magicHex: string;
  signatures: ReturnType<typeof detectSignature>;
  sha256: string;
  sha1: string;
  md5: string;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n;
  let u = -1;
  do {
    v /= 1024;
    u++;
  } while (v >= 1024 && u < units.length - 1);
  return `${v.toFixed(v >= 100 ? 0 : 2)} ${units[u]}`;
}

export function formatDate(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

export async function collectFileInfo(file: File, bytes: Uint8Array): Promise<FileInfo> {
  const [sha256, sha1] = await Promise.all([
    shaDigest(bytes, 'SHA-256'),
    shaDigest(bytes, 'SHA-1'),
  ]);
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  return {
    name: file.name,
    size: file.size,
    sizeHuman: formatBytes(file.size),
    type: file.type || mimeFromMagic(bytes),
    extension: ext,
    lastModified: file.lastModified || null,
    lastModifiedISO: file.lastModified ? formatDate(file.lastModified) : null,
    magicHex: bytesToHex(bytes.slice(0, Math.min(16, bytes.length))),
    signatures: detectSignature(bytes),
    sha256: bytesToHex(sha256),
    sha1: bytesToHex(sha1),
    md5: md5(bytes),
  };
}

// ---------------------------------------------------------------------------
// EXIF (JPEG APP1 + TIFF)
// ---------------------------------------------------------------------------

const EXIF_TAGS: Record<number, string> = {
  0x0100: 'ImageWidth', 0x0101: 'ImageHeight', 0x0102: 'BitsPerSample',
  0x0103: 'Compression', 0x0106: 'PhotometricInterpretation', 0x010e: 'ImageDescription',
  0x010f: 'Make', 0x0110: 'Model', 0x0112: 'Orientation', 0x0115: 'SamplesPerPixel',
  0x011a: 'XResolution', 0x011b: 'YResolution', 0x0128: 'ResolutionUnit',
  0x0131: 'Software', 0x0132: 'DateTime', 0x013b: 'Artist', 0x013e: 'WhitePoint',
  0x013f: 'PrimaryChromaticities', 0x0211: 'YCbCrCoefficients', 0x0212: 'YCbCrSubSampling',
  0x0213: 'YCbCrPositioning', 0x0214: 'ReferenceBlackWhite', 0x8298: 'Copyright',
  0x829a: 'ExposureTime', 0x829d: 'FNumber', 0x8769: 'ExifIFD',
  0x8822: 'ExposureProgram', 0x8824: 'SpectralSensitivity', 0x8827: 'ISOSpeedRatings',
  0x8828: 'OECF', 0x9000: 'ExifVersion', 0x9003: 'DateTimeOriginal',
  0x9004: 'DateTimeDigitized', 0x9101: 'ComponentsConfiguration', 0x9102: 'CompressedBitsPerPixel',
  0x9201: 'ShutterSpeedValue', 0x9202: 'ApertureValue', 0x9203: 'BrightnessValue',
  0x9204: 'ExposureBiasValue', 0x9205: 'MaxApertureValue', 0x9206: 'SubjectDistance',
  0x9207: 'MeteringMode', 0x9208: 'LightSource', 0x9209: 'Flash', 0x920a: 'FocalLength',
  0x927c: 'MakerNote', 0x9286: 'UserComment', 0xa000: 'FlashpixVersion',
  0xa001: 'ColorSpace', 0xa002: 'PixelXDimension', 0xa003: 'PixelYDimension',
  0xa005: 'InteroperabilityIFD', 0xa20e: 'FocalPlaneXResolution', 0xa20f: 'FocalPlaneYResolution',
  0xa210: 'FocalPlaneResolutionUnit', 0xa217: 'SensingMethod', 0xa300: 'FileSource',
  0xa301: 'SceneType', 0xa401: 'CustomRendered', 0xa402: 'ExposureMode',
  0xa403: 'WhiteBalance', 0xa404: 'DigitalZoomRatio', 0xa405: 'FocalLengthIn35mmFilm',
  0xa406: 'SceneCaptureType', 0xa407: 'GainControl', 0xa408: 'Contrast',
  0xa409: 'Saturation', 0xa40a: 'Sharpness', 0xa40b: 'DeviceSettingDescription',
  0xa40c: 'SubjectDistanceRange', 0x8825: 'GPSInfoIFD',
};

const GPS_TAGS: Record<number, string> = {
  0x0000: 'GPSVersionID', 0x0001: 'GPSLatitudeRef', 0x0002: 'GPSLatitude',
  0x0003: 'GPSLongitudeRef', 0x0004: 'GPSLongitude', 0x0005: 'GPSAltitudeRef',
  0x0006: 'GPSAltitude', 0x0007: 'GPSTimeStamp', 0x0008: 'GPSSatellites',
  0x0009: 'GPSStatus', 0x000a: 'GPSMeasureMode', 0x000b: 'GPSDOP',
  0x000c: 'GPSSpeedRef', 0x000d: 'GPSSpeed', 0x000e: 'GPSTrackRef', 0x000f: 'GPSTrack',
  0x0010: 'GPSImgDirectionRef', 0x0011: 'GPSImgDirection', 0x0012: 'GPSMapDatum',
  0x0013: 'GPSDestLatitudeRef', 0x0014: 'GPSDestLatitude', 0x0015: 'GPSDestLongitudeRef',
  0x0016: 'GPSDestLongitude', 0x0017: 'GPSDestBearingRef', 0x0018: 'GPSDestBearing',
  0x0019: 'GPSDestDistanceRef', 0x001a: 'GPSDestDistance', 0x001b: 'GPSProcessingMethod',
  0x001c: 'GPSAreaInformation', 0x001d: 'GPSDateStamp', 0x001e: 'GPSDifferential',
};

export interface ExifEntry {
  tag: string;
  tagId: string;
  value: string;
  type: string;
}

export interface ExifResult {
  found: boolean;
  entries: ExifEntry[];
  gps: { lat: string | null; lon: string | null; alt: string | null; refs: Record<string, string> };
  error?: string;
}

function tiffValue(bytes: Uint8Array, type: number, count: number, valuePtr: number, little: boolean, tiffBase: number): string {
  const readNum = (off: number, size: number): string => {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    switch (size) {
      case 1: return String(dv.getUint8(off));
      case 2: return String(dv.getUint16(off, little));
      case 4: return String(dv.getUint32(off, little));
      case 8: return String(dv.getBigUint64(off, little));
      default: return '?';
    }
  };
  const sizes: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8, 11: 4, 12: 8 };
  const size = sizes[type] ?? 1;
  const total = size * count;
  // Untuk data > 4 byte, field value menyimpan offset relatif awal TIFF.
  const dataOff = total <= 4 ? valuePtr : tiffBase + u32(bytes, valuePtr, little);
  if (dataOff + total > bytes.length) return '<data out of range>';
  if (type === 2) return `"${readAscii(bytes, dataOff, count)}"`;
  if (type === 7) return `<${count} bytes>`;
  if (type === 5 || type === 10) {
    // rational: numerator/denominator
    if (count > 1) {
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const num = u32(bytes, dataOff + i * 8, little);
        const den = u32(bytes, dataOff + i * 8 + 4, little);
        parts.push(den ? (num / den).toFixed(4) : '∞');
      }
      return parts.join(', ');
    }
    const num = u32(bytes, dataOff, little);
    const den = u32(bytes, dataOff + 4, little);
    return den ? (num / den).toFixed(4) : '∞';
  }
  if (count > 4) {
    const parts: string[] = [];
    for (let i = 0; i < Math.min(count, 32); i++) parts.push(readNum(dataOff + i * size, size));
    return parts.join(', ') + (count > 32 ? ` … (${count})` : '');
  }
  return readNum(dataOff, size);
}

export function parseExif(bytes: Uint8Array): ExifResult {
  const entries: ExifEntry[] = [];
  const gpsRefs: Record<string, string> = {};
  let gpsLat: string | null = null;
  let gpsLon: string | null = null;
  let gpsAlt: string | null = null;

  const parseIFD = (base: number, isGps: boolean, tiffBase: number) => {
    if (base + 2 > bytes.length) return;
    const count = u16(bytes, base, true);
    const tagNames = isGps ? GPS_TAGS : EXIF_TAGS;
    for (let i = 0; i < count; i++) {
      const off = base + 2 + i * 12;
      if (off + 12 > bytes.length) break;
      const tag = u16(bytes, off, true);
      const type = u16(bytes, off + 2, true);
      const n = u32(bytes, off + 4, true);
      const valuePtr = off + 8;
      let value: string;
      try {
        value = tiffValue(bytes, type, n, valuePtr, true, tiffBase);
      } catch {
        value = '<parse error>';
      }
      const name = tagNames[tag] ?? `0x${tag.toString(16).padStart(4, '0')}`;
      if (!isGps) entries.push({ tag: name, tagId: `0x${tag.toString(16).padStart(4, '0')}`, value, type: String(type) });
      else gpsRefs[name] = value;

      // follow sub-IFD pointers
      if (tag === 0x8769 && !isGps && n === 1) {
        const ptr = u32(bytes, valuePtr, true);
        if (ptr) parseIFD(tiffBase + ptr, false, tiffBase);
      }
      if (tag === 0x8825 && !isGps && n === 1) {
        const ptr = u32(bytes, valuePtr, true);
        if (ptr) parseIFD(tiffBase + ptr, true, tiffBase);
      }
    }
  };

  // Temukan APP1 EXIF di JPEG
  let found = false;
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = bytes[i + 1];
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = u16(bytes, i + 2, true);
    if (
      marker === 0xe1 &&
      len >= 8 &&
      bytes[i + 4] === 0x45 && // E
      bytes[i + 5] === 0x78 && // x
      bytes[i + 6] === 0x69 && // i
      bytes[i + 7] === 0x66 && // f
      bytes[i + 8] === 0x00 &&
      bytes[i + 9] === 0x00
    ) {
      found = true;
      const tiffBase = i + 10;
      // TIFF header
      if (bytes[tiffBase] === 0x49 && bytes[tiffBase + 1] === 0x49) {
        const magic = u16(bytes, tiffBase + 2, true);
        if (magic === 42) {
          const ifd0 = u32(bytes, tiffBase + 4, true);
          parseIFD(tiffBase + ifd0, false, tiffBase);
        }
      } else if (bytes[tiffBase] === 0x4d && bytes[tiffBase + 1] === 0x4d) {
        const magic = u16(bytes, tiffBase + 2, false);
        if (magic === 42) {
          const ifd0 = u32(bytes, tiffBase + 4, false);
          // big-endian IFD parsing (sederhana)
          const base = tiffBase + ifd0;
          const count = u16(bytes, base, false);
          for (let k = 0; k < count; k++) {
            const off = base + 2 + k * 12;
            const tag = u16(bytes, off, false);
            const type = u16(bytes, off + 2, false);
            const n = u32(bytes, off + 4, false);
            const valuePtr = off + 8;
            const name = EXIF_TAGS[tag] ?? `0x${tag.toString(16).padStart(4, '0')}`;
            let value: string;
            try {
              const sizes: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8, 11: 4, 12: 8 };
              const size = sizes[type] ?? 1;
              const dataOff = size * n <= 4 ? valuePtr : tiffBase + u32(bytes, valuePtr, false);
              if (type === 2) value = `"${readAscii(bytes, dataOff, n)}"`;
              else if (type === 3) value = String(u16(bytes, dataOff, false));
              else if (type === 4) value = String(u32(bytes, dataOff, false));
              else if (type === 5) {
                const num = u32(bytes, dataOff, false);
                const den = u32(bytes, dataOff + 4, false);
                value = den ? (num / den).toFixed(4) : '∞';
              } else value = `<type ${type}>`;
            } catch {
              value = '<parse error>';
            }
            entries.push({ tag: name, tagId: `0x${tag.toString(16).padStart(4, '0')}`, value, type: String(type) });
            if (tag === 0x8825) {
              const ptr = u32(bytes, valuePtr, false);
              if (ptr) {
                const gbase = tiffBase + ptr;
                const gcount = u16(bytes, gbase, false);
                for (let g = 0; g < gcount; g++) {
                  const goff = gbase + 2 + g * 12;
                  const gtag = u16(bytes, goff, false);
                  const gtype = u16(bytes, goff + 2, false);
                  const gn = u32(bytes, goff + 4, false);
                  const gname = GPS_TAGS[gtag] ?? `0x${gtag.toString(16).padStart(4, '0')}`;
                  try {
                    const sizes: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 };
                    const gsize = sizes[gtype] ?? 1;
                    const dataOff = gsize * gn <= 4 ? goff + 8 : tiffBase + u32(bytes, goff + 8, false);
                    let value: string;
                    if (gtype === 2) value = readAscii(bytes, dataOff, gn);
                    else if (gtype === 5) {
                      const num = u32(bytes, dataOff, false);
                      const den = u32(bytes, dataOff + 4, false);
                      value = den ? (num / den).toFixed(4) : '∞';
                    } else value = String(gtype === 3 ? u16(bytes, dataOff, false) : u32(bytes, dataOff, false));
                    gpsRefs[gname] = value;
                  } catch {
                    /* abaikan */
                  }
                }
              }
            }
          }
        }
      }
      break;
    }
    i += 2 + len;
  }

  // Hitung koordinat GPS
  const parseCoord = (ref: string | undefined, val: string | undefined): string | null => {
    if (!ref || !val) return null;
    const parts = val.split(',').map((p) => parseFloat(p.trim()));
    if (parts.length !== 3 || parts.some(Number.isNaN)) return val;
    const [deg, min, sec] = parts;
    const dec = deg + min / 60 + sec / 3600;
    const sign = ref.startsWith('S') || ref.startsWith('W') ? -1 : 1;
    return `${(dec * sign).toFixed(6)}° ${ref}`;
  };
  gpsLat = parseCoord(gpsRefs['GPSLatitudeRef'], gpsRefs['GPSLatitude']);
  gpsLon = parseCoord(gpsRefs['GPSLongitudeRef'], gpsRefs['GPSLongitude']);
  if (gpsRefs['GPSAltitude']) gpsAlt = `${gpsRefs['GPSAltitude']} m (ref ${gpsRefs['GPSAltitudeRef'] ?? '?'})`;

  return { found, entries, gps: { lat: gpsLat, lon: gpsLon, alt: gpsAlt, refs: gpsRefs } };
}

// ---------------------------------------------------------------------------
// PDF metadata (byte-scan literal)
// ---------------------------------------------------------------------------

export function parsePdfMetadata(bytes: Uint8Array): Record<string, string> {
  const text = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 4_000_000)));
  const result: Record<string, string> = {};
  const patterns: [string, RegExp][] = [
    ['Title', /\/Title\s*\(([^)]*)\)/i],
    ['Author', /\/Author\s*\(([^)]*)\)/i],
    ['Subject', /\/Subject\s*\(([^)]*)\)/i],
    ['Keywords', /\/Keywords\s*\(([^)]*)\)/i],
    ['Creator', /\/Creator\s*\(([^)]*)\)/i],
    ['Producer', /\/Producer\s*\(([^)]*)\)/i],
    ['CreationDate', /\/CreationDate\s*\(([^)]*)\)/i],
    ['ModDate', /\/ModDate\s*\(([^)]*)\)/i],
    ['Trapped', /\/Trapped\s*\/?([^/\s>]*)/i],
    ['PageCount', /\/Count\s+(\d+)/],
  ];
  for (const [name, re] of patterns) {
    const m = re.exec(text);
    if (m) result[name] = m[1];
  }
  return result;
}

/** Konversi tanggal PDF (D:20240101120000+07'00') → ISO. */
export function pdfDateToISO(d: string): string {
  const m = /^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?/.exec(d);
  if (!m) return d;
  const [, y, mo = '01', da = '01', h = '00', mi = '00', s = '00'] = m;
  const tz = /([+-]\d{2})'?(\d{2})?'?$/.exec(d);
  const tzSuffix = tz ? tz[1] + ':' + (tz[2] ?? '00') : 'Z';
  const iso = `${y}-${mo}-${da}T${h}:${mi}:${s}`;
  try {
    const date = new Date(iso + (tz ? tzSuffix : 'Z'));
    return Number.isNaN(date.getTime()) ? d : date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
  } catch {
    return d;
  }
}

// ---------------------------------------------------------------------------
// ZIP listing
// ---------------------------------------------------------------------------

export interface ZipEntryInfo {
  name: string;
  method: string;
  compressedSize: number;
  uncompressedSize: number;
  crc32: string;
  date: string;
  isDirectory: boolean;
}

export function parseZipListing(bytes: Uint8Array): ZipEntryInfo[] {
  const entries: ZipEntryInfo[] = [];
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const METHODS: Record<number, string> = { 0: 'Stored', 8: 'Deflate', 12: 'BZip2', 14: 'LZMA', 93: 'Zstandard', 99: 'AES' };
  for (let i = 0; i + 30 <= bytes.length; i++) {
    if (dv.getUint32(i, true) !== 0x04034b50) continue; // local file header
    const method = dv.getUint16(i + 8, true);
    const crc = dv.getUint32(i + 14, true);
    const comp = dv.getUint32(i + 18, true);
    const uncomp = dv.getUint32(i + 22, true);
    const nameLen = dv.getUint16(i + 26, true);
    const extraLen = dv.getUint16(i + 28, true);
    if (i + 30 + nameLen > bytes.length) break;
    const name = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(i + 30, i + 30 + nameLen));
    const dosTime = dv.getUint16(i + 10, true);
    const dosDate = dv.getUint16(i + 12, true);
    const date = new Date(
      1980 + (dosDate >> 9),
      ((dosDate >> 5) & 0xf) - 1,
      dosDate & 0x1f,
      dosTime >> 11,
      (dosTime >> 5) & 0x3f,
      (dosTime & 0x1f) * 2
    );
    entries.push({
      name,
      method: METHODS[method] ?? `0x${method.toString(16)}`,
      compressedSize: comp,
      uncompressedSize: uncomp,
      crc32: crc.toString(16).padStart(8, '0'),
      date: formatDate(date.getTime()),
      isDirectory: name.endsWith('/'),
    });
    i += 30 + nameLen + extraLen + comp - 1;
    if (entries.length > 2000) break;
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Timestamp
// ---------------------------------------------------------------------------

export interface TimestampResult {
  unixSeconds: string;
  unixMillis: string;
  iso: string;
  local: string;
  relative: string;
  hexSeconds: string;
}

export function parseTimestamp(input: string): TimestampResult {
  const clean = input.trim();
  let ms: number;

  if (/^\d{10}$/.test(clean)) ms = parseInt(clean, 10) * 1000;
  else if (/^\d{13}$/.test(clean)) ms = parseInt(clean, 10);
  else if (/^\d{16}$/.test(clean)) ms = Math.floor(parseInt(clean, 10) / 1000); // microseconds
  else if (/^\d{19}$/.test(clean)) ms = Math.floor(parseInt(clean, 10) / 1e6); // nanoseconds
  else {
    const d = new Date(clean);
    if (Number.isNaN(d.getTime())) throw new Error('Format timestamp tidak dikenali. Gunakan Unix seconds/ms, ISO 8601, atau tanggal.');
    ms = d.getTime();
  }

  const d = new Date(ms);
  const seconds = Math.floor(ms / 1000);
  const diff = Date.now() - ms;
  const relative =
    diff < 0 ? `dalam ${Math.abs(Math.round(diff / 1000))} detik` :
    diff < 60_000 ? `${Math.round(diff / 1000)} detik lalu` :
    diff < 3_600_000 ? `${Math.round(diff / 60_000)} menit lalu` :
    diff < 86_400_000 ? `${Math.round(diff / 3_600_000)} jam lalu` :
    `${Math.round(diff / 86_400_000)} hari lalu`;

  return {
    unixSeconds: String(seconds),
    unixMillis: String(ms),
    iso: d.toISOString(),
    local: d.toString(),
    relative,
    hexSeconds: seconds.toString(16),
  };
}

export interface FileCompareResult {
  equalSize: boolean;
  equalSha256: boolean;
  equalSha1: boolean;
  equalMd5: boolean;
  equalFirstBytes: boolean;
  firstBytesA: string;
  firstBytesB: string;
}
