/**
 * Email intelligence. validasi sintaks, normalisasi, disposable-domain
 * (dataset lokal kecil), role-based, klasifikasi provider. Tanpa permintaan
 * eksternal; HIBP hanya sebagai link (tanpa memasukkan password).
 */

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'sharklasers.com', 'grr.la',
  'temp-mail.org', 'tempmail.com', 'temp-mail.io', 'throwawaymail.com', 'yopmail.com',
  'getnada.com', 'nada.email', 'discard.email', 'maildrop.cc', 'mailnesia.com',
  'mailcatch.com', 'spam4.me', 'mytemp.email', 'tmail.ws', 'mailtemp.net',
  '33mail.com', 'anonaddy.com', 'simplelogin.io', 'duck.com', 'firefox.com', // alias/pelindung
  'emailondeck.com', 'mintemail.com', 'mohmal.com', 'trashmail.com', 'trashmail.de',
  'dispostable.com', 'inboxbear.com', 'fakemail.net', 'fakeinbox.com', 'mailmetrash.com',
  'tempinbox.com', 'tempr.email', 'emailsilo.net', 'maileater.com', 'mailsac.com',
]);

const ROLE_PREFIXES = [
  'admin', 'administrator', 'support', 'info', 'contact', 'hello', 'help', 'service',
  'sales', 'marketing', 'press', 'media', 'legal', 'privacy', 'abuse', 'security',
  'noc', 'webmaster', 'hostmaster', 'postmaster', 'root', 'billing', 'team', 'office',
  'hr', 'jobs', 'careers', 'newsletter', 'no-reply', 'noreply', 'donotreply', 'feedback',
  'enquiries', 'inquiries', 'complaints', 'accounts', 'billing', 'ceo', 'manager',
];

const PROVIDERS: Record<string, string> = {
  'gmail.com': 'Google (Gmail)',
  'googlemail.com': 'Google (Gmail)',
  'yahoo.com': 'Yahoo',
  'yahoo.co.id': 'Yahoo',
  'outlook.com': 'Microsoft (Outlook)',
  'hotmail.com': 'Microsoft (Hotmail)',
  'live.com': 'Microsoft (Live)',
  'msn.com': 'Microsoft (MSN)',
  'proton.me': 'Proton',
  'protonmail.com': 'Proton',
  'pm.me': 'Proton',
  'icloud.com': 'Apple (iCloud)',
  'me.com': 'Apple (iCloud)',
  'mac.com': 'Apple (iCloud)',
  'aol.com': 'AOL',
  'zoho.com': 'Zoho',
  'gmx.com': 'GMX',
  'mail.com': 'mail.com',
  'yandex.com': 'Yandex',
  'yandex.ru': 'Yandex',
  'fastmail.com': 'Fastmail',
  'tutanota.com': 'Tuta (Tutanota)',
  'hey.com': 'HEY (Basecamp)',
  'runbox.com': 'Runbox',
  'posteo.de': 'Posteo',
  'mailbox.org': 'Mailbox.org',
};

export interface EmailAnalysis {
  input: string;
  valid: boolean;
  error?: string;
  normalized?: string;
  localPart?: string;
  domain?: string;
  tld?: string;
  provider?: string;
  disposable: boolean;
  disposableName?: string;
  roleBased: boolean;
  roleName?: string;
  issues: string[];
}

export function analyzeEmail(input: string): EmailAnalysis {
  const raw = input.trim();
  const issues: string[] = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    return { input: raw, valid: false, error: 'Format email tidak valid. Gunakan user@domain.tld.', disposable: false, roleBased: false, issues: [] };
  }
  const at = raw.lastIndexOf('@');
  const localPart = raw.slice(0, at);
  const domain = raw.slice(at + 1).toLowerCase();
  const normalized = `${localPart}@${domain}`;
  if (localPart.length > 64) issues.push('Local part terlalu panjang (>64 karakter).');
  if (domain.length > 253) issues.push('Domain terlalu panjang.');
  if (!/^[a-z0-9.-]+$/i.test(domain)) issues.push('Domain mengandung karakter tidak valid.');
  const labels = domain.split('.');
  if (labels.length < 2) issues.push('Domain harus memiliki minimal 2 label.');
  const tld = labels[labels.length - 1];
  if (tld.length < 2) issues.push('TLD terlalu pendek.');
  if (/^-|-$/.test(domain) || labels.some((l) => !l || l.length > 63)) issues.push('Format label domain tidak valid.');

  const disposable = DISPOSABLE_DOMAINS.has(domain);
  const provider = PROVIDERS[domain] ?? 'Custom / unknown domain';
  const role = ROLE_PREFIXES.find((p) => localPart.toLowerCase() === p || localPart.toLowerCase().startsWith(p + '+') || localPart.toLowerCase().startsWith(p + '.'));
  const roleBased = !!role;

  return {
    input: raw,
    valid: true,
    normalized,
    localPart,
    domain,
    tld,
    provider,
    disposable,
    disposableName: disposable ? domain : undefined,
    roleBased,
    roleName: role,
    issues,
  };
}

/** Link HIBP (tanpa password). */
export function hibpLink(domainOrEmail: string): string {
  return `https://haveibeenpwned.com/DomainSearch?domain=${encodeURIComponent(domainOrEmail)}`;
}
