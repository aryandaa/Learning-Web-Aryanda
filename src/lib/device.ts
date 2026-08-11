/**
 * Menampilkan sapaan sesuai jenis perangkat pengunjung.
 *
 * Batasan: browser TIDAK bisa membaca nama asli perangkat (mis. "iPhone milik
 * Aryanda") karena tidak ada API untuk itu — demi privasi. Yang dideteksi di
 * sini adalah *jenis* perangkat dari User-Agent, misalnya iPhone, iPad,
 * Android, Mac, Windows, atau Linux.
 */

function detectFromUserAgent(ua: string, maxTouchPoints: number): string {
  if (/iPad/.test(ua)) return 'iPad';
  // iPhone/iPod dulu — UA iPhone juga mengandung "Mac OS X",
  // jadi aturan iPadOS di bawah tidak boleh mendahuluinya.
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPod/.test(ua)) return 'iPod';
  // iPadOS modern menyamar sebagai Mac; dibedakan lewat dukungan multi-touch.
  if (/Macintosh|Mac OS X/.test(ua) && maxTouchPoints > 1) return 'iPad';
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android' : 'Android Tablet';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Macintosh|Mac OS X/.test(ua)) return 'Mac';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Sobat';
}

/** Nama jenis perangkat untuk sapaan, mis. "iPhone", "Mac", "Windows". */
export function getDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Sobat';

  // User-Agent Client Hints (Chromium) — sumber lebih bersih bila tersedia.
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  if (uaData?.platform) {
    const platform = uaData.platform.toLowerCase();
    const touch = navigator.maxTouchPoints > 1;
    if (platform.includes('android')) return touch ? 'Android' : 'Android Tablet';
    if (platform.includes('iphone')) return 'iPhone';
    if (platform.includes('ipad')) return 'iPad';
    if (platform.includes('mac')) return touch ? 'iPad' : 'Mac';
    if (platform.includes('win')) return 'Windows';
    if (platform.includes('linux')) return 'Linux';
  }

  return detectFromUserAgent(navigator.userAgent, navigator.maxTouchPoints);
}
