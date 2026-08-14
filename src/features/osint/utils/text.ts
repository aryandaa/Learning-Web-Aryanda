/**
 * Text intelligence. statistik + ekstraksi entitas + normalisasi + dedup.
 */

import { extractIocs } from './ioc';

export interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  lines: number;
  sentences: number;
  paragraphs: number;
  bytes: number;
}

export function textStats(text: string): TextStats {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const lines = text.split('\n').length;
  const sentences = (text.match(/[.!?…]+(\s|$)/g) ?? []).length;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  return {
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, '').length,
    words,
    lines,
    sentences,
    paragraphs,
    bytes: new TextEncoder().encode(text).length,
  };
}

const RE_URL = /\bhttps?:\/\/[^\s<>"']+/gi;
const RE_EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const RE_IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const RE_DOMAIN = /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b/g;
const RE_HASH = /\b[a-fA-F0-9]{32,128}\b/g;
const RE_DATE = /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?\b/g;
const RE_USERNAME = /\b@[a-zA-Z0-9_]{2,30}\b/g;

export interface EntityGroup {
  label: string;
  values: string[];
}

export function extractEntities(text: string): EntityGroup[] {
  const collect = (re: RegExp): string[] => {
    const set = new Set<string>();
    let m: RegExpExecArray | null;
    const r = new RegExp(re.source, re.flags);
    while ((m = r.exec(text)) !== null) {
      set.add(m[0]);
      if (m[0] === '') r.lastIndex++;
    }
    return Array.from(set);
  };
  const urls = collect(RE_URL);
  const emails = collect(RE_EMAIL);
  const ips = collect(RE_IPV4);
  const domains = collect(RE_DOMAIN).filter((d) => !emails.some((e) => e.endsWith('@' + d)) && !urls.some((u) => u.includes('//' + d + '/')));
  const hashes = collect(RE_HASH);
  const dates = collect(RE_DATE);
  const usernames = collect(RE_USERNAME);
  return [
    { label: 'URLs', values: urls },
    { label: 'Emails', values: emails },
    { label: 'Domains', values: domains },
    { label: 'IP addresses', values: ips },
    { label: 'Hashes', values: hashes },
    { label: 'Dates', values: dates },
    { label: '@usernames', values: usernames },
  ].filter((g) => g.values.length > 0);
}

export function normalizeText(text: string, opts: { collapseWhitespace?: boolean; trimLines?: boolean; lower?: boolean }): string {
  let out = text.replace(/\r\n/g, '\n');
  if (opts.trimLines) out = out.split('\n').map((l) => l.trim()).join('\n');
  if (opts.collapseWhitespace) out = out.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  if (opts.lower) out = out.toLowerCase();
  return out;
}

export function dedupeLines(text: string): string {
  return Array.from(new Set(text.replace(/\r\n/g, '\n').split('\n'))).join('\n');
}

export function regexExtract(text: string, pattern: string, flags = 'g'): { matches: string[]; error: string | null } {
  let re: RegExp;
  try {
    re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
  } catch (e) {
    return { matches: [], error: e instanceof Error ? e.message : 'Regex tidak valid.' };
  }
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = re.exec(text)) !== null && guard++ < 10000) {
    matches.push(m[0]);
    if (m[0] === '') re.lastIndex++;
  }
  return { matches, error: null };
}

export { extractIocs };
