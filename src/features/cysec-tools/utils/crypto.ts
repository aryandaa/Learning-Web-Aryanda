/**
 * Kriptografi: Web Crypto API (AES, SHA, HMAC, PBKDF2, random) + implementasi
 * edukasi MD5, SHA-3 (Keccak), ChaCha20, dan RSA textbook.
 *
 * Prioritas: gunakan Web Crypto API bila tersedia; implementasi manual hanya
 * untuk algoritma yang tidak didukung Web Crypto (MD5, SHA3, ChaCha20, RSA)
 * dan ditandai edukasional.
 */

import { toArrayBuffer, utf8ToBytes, bytesToHex } from './bytes';

// ---------------------------------------------------------------------------
// Web Crypto API helpers
// ---------------------------------------------------------------------------

export function assertSubtle(): SubtleCrypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error(
      'Web Crypto API tidak tersedia di konteks ini (butuh HTTPS atau localhost).'
    );
  }
  return crypto.subtle;
}

export function getRandomBytes(n: number): Uint8Array {
  if (n <= 0 || n > 65536) throw new Error('Panjang random bytes harus 1–65536.');
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
}

export function randomHex(n: number): string {
  return bytesToHex(getRandomBytes(n));
}

export function uuidV4(): string {
  const b = getRandomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10
  const h = bytesToHex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export async function shaDigest(data: Uint8Array, alg: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'): Promise<Uint8Array> {
  const subtle = assertSubtle();
  return new Uint8Array(await subtle.digest(alg, toArrayBuffer(data)));
}

export interface HmacOptions {
  alg?: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
}

export async function hmacSign(keyBytes: Uint8Array, data: Uint8Array, opts: HmacOptions = {}): Promise<Uint8Array> {
  const subtle = assertSubtle();
  const alg = opts.alg ?? 'SHA-256';
  const key = await subtle.importKey('raw', toArrayBuffer(keyBytes), { name: 'HMAC', hash: alg }, false, ['sign']);
  return new Uint8Array(await subtle.sign('HMAC', key, toArrayBuffer(data)));
}

export interface Pbkdf2Options {
  hash?: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
  length?: number; // bytes
}

export async function pbkdf2(password: Uint8Array, salt: Uint8Array, iterations: number, opts: Pbkdf2Options = {}): Promise<Uint8Array> {
  const subtle = assertSubtle();
  if (!(iterations >= 1 && iterations <= 10_000_000)) throw new Error('Iterasi PBKDF2 harus 1–10.000.000.');
  const key = await subtle.importKey('raw', toArrayBuffer(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', salt: toArrayBuffer(salt), iterations, hash: opts.hash ?? 'SHA-256' },
    key,
    (opts.length ?? 32) * 8
  );
  return new Uint8Array(bits);
}

// ---------------------------------------------------------------------------
// AES (GCM / CBC). key dari passphrase via PBKDF2
// ---------------------------------------------------------------------------

export interface AesOptions {
  mode: 'GCM' | 'CBC';
  bits?: 128 | 256;
  iterations?: number;
  output?: 'base64' | 'hex';
}

export interface AesResult {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  salt: Uint8Array;
  tag?: Uint8Array;
}

async function deriveAesKey(passphrase: Uint8Array, salt: Uint8Array, iterations: number, bits: 128 | 256) {
  const subtle = assertSubtle();
  const raw = await subtle.importKey('raw', toArrayBuffer(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', salt: toArrayBuffer(salt), iterations, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: bits },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function aesEncrypt(plain: Uint8Array, passphrase: string, opts: AesOptions): Promise<AesResult> {
  const subtle = assertSubtle();
  const mode = opts.mode ?? 'GCM';
  const bits = opts.bits ?? 256;
  const iterations = opts.iterations ?? 100_000;
  const salt = getRandomBytes(16);
  const iv = getRandomBytes(mode === 'GCM' ? 12 : 16);
  const key = await deriveAesKey(utf8ToBytes(passphrase), salt, iterations, bits);
  const ct = new Uint8Array(
    await subtle.encrypt({ name: `AES-${mode}`, iv: toArrayBuffer(iv), ...(mode === 'GCM' ? { tagLength: 128 } : {}) }, key, toArrayBuffer(plain))
  );
  return { ciphertext: ct, iv, salt };
}

export async function aesDecrypt(data: Uint8Array, passphrase: string, opts: AesOptions): Promise<Uint8Array> {
  const subtle = assertSubtle();
  const mode = opts.mode ?? 'GCM';
  const bits = opts.bits ?? 256;
  const iterations = opts.iterations ?? 100_000;
  // Format bungkus: salt(16) || iv(12/16) || ciphertext
  const ivLen = mode === 'GCM' ? 12 : 16;
  if (data.length < 16 + ivLen + 16) throw new Error('Ciphertext terlalu pendek / format tidak valid.');
  const salt = data.slice(0, 16);
  const iv = data.slice(16, 16 + ivLen);
  const ct = data.slice(16 + ivLen);
  const key = await deriveAesKey(utf8ToBytes(passphrase), salt, iterations, bits);
  try {
    return new Uint8Array(
      await subtle.decrypt({ name: `AES-${mode}`, iv: toArrayBuffer(iv), ...(mode === 'GCM' ? { tagLength: 128 } : {}) }, key, toArrayBuffer(ct))
    );
  } catch {
    throw new Error('Dekripsi gagal. Periksa passphrase, mode, dan format ciphertext.');
  }
}

// ---------------------------------------------------------------------------
// MD5 (RFC 1321). untuk compatibility/CTF/forensik, BUKAN untuk password
// ---------------------------------------------------------------------------

const MD5_S: number[] = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const MD5_K: number[] = (() => {
  const k = new Array(64);
  for (let i = 0; i < 64; i++) {
    k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000);
  }
  return k;
})();

function md5Rol(x: number, n: number): number {
  return (x << n) | (x >>> (32 - n));
}

export function md5(data: Uint8Array): string {
  const origLen = data.length;
  const bitLen = origLen * 8;
  // padding: 0x80, zeros, 64-bit little-endian length
  const padded = new Uint8Array((((origLen + 8) >> 6) + 1) << 6);
  padded.set(data);
  padded[origLen] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, bitLen >>> 0, true);
  dv.setUint32(padded.length - 4, Math.floor(bitLen / 0x100000000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let off = 0; off < padded.length; off += 64) {
    const m: number[] = new Array(16);
    for (let i = 0; i < 16; i++) m[i] = dv.getUint32(off + i * 4, true);
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      const tmp = d;
      d = c;
      c = b;
      b = b + md5Rol((a + f + MD5_K[i] + m[g]) >>> 0, MD5_S[i]);
      a = tmp;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  const out = new Uint8Array(16);
  const odv = new DataView(out.buffer);
  odv.setUint32(0, a0, true);
  odv.setUint32(4, b0, true);
  odv.setUint32(8, c0, true);
  odv.setUint32(12, d0, true);
  return bytesToHex(out);
}

// ---------------------------------------------------------------------------
// SHA-3 (Keccak-f[1600]). implementasi TypeScript murni
// ---------------------------------------------------------------------------

const KECCAK_MASK = 0xffffffffffffffffn;

const KECCAK_RC: bigint[] = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];

const KECCAK_RHO: number[] = [
  0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14,
];

function keccakRotl(x: bigint, n: number): bigint {
  const nn = BigInt(n);
  return ((x << nn) | (x >> (64n - nn))) & KECCAK_MASK;
}

function keccakF(state: bigint[]): void {
  for (let round = 0; round < 24; round++) {
    // theta
    const c = new Array<bigint>(5);
    for (let x = 0; x < 5; x++) c[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
    for (let x = 0; x < 5; x++) {
      const d = c[(x + 4) % 5] ^ keccakRotl(c[(x + 1) % 5], 1);
      for (let y = 0; y < 25; y += 5) state[x + y] ^= d;
    }
    // rho + pi
    const b = new Array<bigint>(25);
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const idx = x + 5 * y;
        b[y + 5 * ((2 * x + 3 * y) % 5)] = keccakRotl(state[idx], KECCAK_RHO[idx]);
      }
    }
    // chi
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const idx = x + 5 * y;
        state[idx] = b[idx] ^ (~b[(x + 1) % 5 + 5 * y] & b[(x + 2) % 5 + 5 * y]);
      }
    }
    // iota
    state[0] ^= KECCAK_RC[round];
  }
}

function keccakLoadLane(b: Uint8Array, off: number): bigint {
  let v = 0n;
  for (let i = 7; i >= 0; i--) v = (v << 8n) | BigInt(b[off + i]);
  return v;
}

function keccakStoreLane(b: Uint8Array, off: number, v: bigint): void {
  for (let i = 0; i < 8; i++) b[off + i] = Number((v >> BigInt(8 * i)) & 0xffn);
}

/** SHA-3 (FIPS 202). bits: 224 | 256 | 384 | 512. Domain byte 0x06. */
export function sha3(data: Uint8Array, bits: 224 | 256 | 384 | 512): Uint8Array {
  const rate = (1600 - 2 * bits) / 8;
  const state = new Array<bigint>(25).fill(0n);
  const block = new Uint8Array(rate);

  // absorb
  let pos = 0;
  for (const byte of data) {
    block[pos++] ^= byte;
    if (pos === rate) {
      for (let i = 0; i < rate; i += 8) state[i / 8] ^= keccakLoadLane(block, i);
      keccakF(state);
      block.fill(0);
      pos = 0;
    }
  }
  block[pos] ^= 0x06;
  block[rate - 1] ^= 0x80;
  for (let i = 0; i < rate; i += 8) state[i / 8] ^= keccakLoadLane(block, i);
  keccakF(state);

  // squeeze
  const outLen = bits / 8;
  const out = new Uint8Array(outLen);
  let written = 0;
  while (written < outLen) {
    const chunk = Math.min(rate, outLen - written);
    for (let i = 0; i < chunk; i++) out[written + i] = Number((state[(i / 8) | 0] >> BigInt(8 * (i % 8))) & 0xffn);
    written += chunk;
    if (written < outLen) keccakF(state);
  }
  return out;
}

// ---------------------------------------------------------------------------
// ChaCha20 (RFC 8439) (edukasi)
// ---------------------------------------------------------------------------

const CHACHA_SIGMA = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574];

function chachaQuarterRound(x: Uint32Array, a: number, b: number, c: number, d: number): void {
  x[a] = (x[a] + x[b]) >>> 0;
  x[d] = ((x[d] ^ x[a]) << 16) | ((x[d] ^ x[a]) >>> 16);
  x[c] = (x[c] + x[d]) >>> 0;
  x[b] = ((x[b] ^ x[c]) << 12) | ((x[b] ^ x[c]) >>> 20);
  x[a] = (x[a] + x[b]) >>> 0;
  x[d] = ((x[d] ^ x[a]) << 8) | ((x[d] ^ x[a]) >>> 24);
  x[c] = (x[c] + x[d]) >>> 0;
  x[b] = ((x[b] ^ x[c]) << 7) | ((x[b] ^ x[c]) >>> 25);
}

function chachaBlock(key: Uint8Array, counter: number, nonce: Uint8Array): Uint8Array {
  const state = new Uint32Array(16);
  state[0] = CHACHA_SIGMA[0];
  state[1] = CHACHA_SIGMA[1];
  state[2] = CHACHA_SIGMA[2];
  state[3] = CHACHA_SIGMA[3];
  for (let i = 0; i < 8; i++) state[4 + i] = key[4 * i] | (key[4 * i + 1] << 8) | (key[4 * i + 2] << 16) | (key[4 * i + 3] << 24);
  state[12] = counter >>> 0;
  for (let i = 0; i < 3; i++) state[13 + i] = nonce[4 * i] | (nonce[4 * i + 1] << 8) | (nonce[4 * i + 2] << 16) | (nonce[4 * i + 3] << 24);

  const x = new Uint32Array(state);
  for (let i = 0; i < 10; i++) {
    chachaQuarterRound(x, 0, 4, 8, 12);
    chachaQuarterRound(x, 1, 5, 9, 13);
    chachaQuarterRound(x, 2, 6, 10, 14);
    chachaQuarterRound(x, 3, 7, 11, 15);
    chachaQuarterRound(x, 0, 5, 10, 15);
    chachaQuarterRound(x, 1, 6, 11, 12);
    chachaQuarterRound(x, 2, 7, 8, 13);
    chachaQuarterRound(x, 3, 4, 9, 14);
  }
  const out = new Uint8Array(64);
  for (let i = 0; i < 16; i++) {
    const v = (x[i] + state[i]) >>> 0;
    out[4 * i] = v & 0xff;
    out[4 * i + 1] = (v >>> 8) & 0xff;
    out[4 * i + 2] = (v >>> 16) & 0xff;
    out[4 * i + 3] = (v >>> 24) & 0xff;
  }
  return out;
}

/** ChaCha20 XOR keystream. key=32 byte, nonce=12 byte, counter awal opsional. */
export function chacha20(data: Uint8Array, key: Uint8Array, nonce: Uint8Array, counter = 0): Uint8Array {
  if (key.length !== 32) throw new Error('ChaCha20 membutuhkan key 32 byte.');
  if (nonce.length !== 12) throw new Error('ChaCha20 membutuhkan nonce 12 byte.');
  const out = new Uint8Array(data.length);
  let block = 0;
  for (let i = 0; i < data.length; i += 64) {
    const ks = chachaBlock(key, counter + block, nonce);
    const len = Math.min(64, data.length - i);
    for (let j = 0; j < len; j++) out[i + j] = data[i + j] ^ ks[j];
    block++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// RSA textbook (edukasi)
// ---------------------------------------------------------------------------

function isProbablePrime(n: bigint): boolean {
  if (n < 2n) return false;
  for (const p of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]) {
    if (n % p === 0n) return n === p;
  }
  let d = n - 1n;
  let r = 0;
  while (d % 2n === 0n) {
    d /= 2n;
    r++;
  }
  for (let i = 0; i < 12; i++) {
    const a = 2n + BigInt(Math.floor(Math.random() * 100000)) % (n - 3n);
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    let composite = true;
    for (let j = 0; j < r - 1; j++) {
      x = (x * x) % n;
      if (x === n - 1n) {
        composite = false;
        break;
      }
    }
    if (composite) return false;
  }
  return true;
}

function randomPrime(bits: number): bigint {
  for (;;) {
    let candidate = BigInt('0x' + bytesToHex(getRandomBytes(Math.ceil(bits / 8))));
    candidate |= 1n; // ganjil
    if (candidate < 1n << BigInt(bits - 1)) candidate |= 1n << BigInt(bits - 1);
    if (isProbablePrime(candidate)) return candidate;
  }
}

export function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  let b = base % mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= 1n;
  }
  return result;
}

function modInverse(a: bigint, m: bigint): bigint {
  let [oldR, r] = [a % m, m];
  let [oldS, s] = [1n, 0n];
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  if (oldR !== 1n) throw new Error('Tidak ada inverse (e dan phi tidak koprima).');
  return ((oldS % m) + m) % m;
}

export interface RsaKeyPair {
  p: bigint;
  q: bigint;
  n: bigint;
  e: bigint;
  d: bigint;
  phi: bigint;
  blockBytes: number;
}

export function rsaGenerateKeyPair(primeBits = 16): RsaKeyPair {
  const p = randomPrime(primeBits);
  let q = randomPrime(primeBits);
  while (q === p) q = randomPrime(primeBits);
  const n = p * q;
  const phi = (p - 1n) * (q - 1n);
  const e = 65537n;
  const d = modInverse(e, phi);
  const bitlen = n.toString(2).length;
  const blockBytes = Math.max(1, Math.floor((bitlen - 1) / 8));
  return { p, q, n, e, d, phi, blockBytes };
}

/** Enkripsi teks dengan kunci publik (n, e) (edukasi), blok kecil. */
export function rsaEncryptText(text: string, n: bigint, e: bigint, blockBytes: number): string {
  const bytes = utf8ToBytes(text);
  const blocks: string[] = [];
  for (let i = 0; i < bytes.length; i += blockBytes) {
    const chunk = bytes.subarray(i, i + blockBytes);
    let m = 0n;
    for (const b of chunk) m = (m << 8n) | BigInt(b);
    if (m >= n) throw new Error('Pesan terlalu panjang untuk kunci ini.');
    const c = modPow(m, e, n);
    blocks.push(c.toString(16));
  }
  return blocks.join(':');
}

export function rsaDecryptText(hexBlocks: string, n: bigint, d: bigint, blockBytes: number): string {
  const blocks = hexBlocks.split(':').map((h) => BigInt('0x' + h));
  const bytes: number[] = [];
  for (const c of blocks) {
    const m = modPow(c, d, n);
    let v = m;
    const chunk: number[] = [];
    for (let i = 0; i < blockBytes; i++) {
      chunk.unshift(Number(v & 0xffn));
      v >>= 8n;
    }
    bytes.push(...chunk);
  }
  // trim leading zeros
  let start = 0;
  while (start < bytes.length - 1 && bytes[start] === 0) start++;
  return new TextDecoder().decode(Uint8Array.from(bytes.slice(start)));
}

export function rsaSignText(text: string, n: bigint, d: bigint, blockBytes: number): string {
  return rsaEncryptText(text, n, d, blockBytes);
}

export function rsaVerifyText(sigHex: string, n: bigint, e: bigint, blockBytes: number): string {
  return rsaDecryptText(sigHex, n, e, blockBytes);
}
