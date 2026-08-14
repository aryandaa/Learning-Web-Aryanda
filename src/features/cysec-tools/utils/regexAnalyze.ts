/**
 * Analisis pola regex: deteksi risiko ReDoS (nested quantifiers), ringkasan
 * token dasar, dan observasi keamanan. Murni heuristik untuk edukasi.
 */

export interface RegexAnalysis {
  pattern: string;
  flags: string;
  valid: boolean;
  error?: string;
  tokens: { token: string; kind: string }[];
  warnings: string[];
  /** heuristik skor risiko 0-100 */
  riskScore: number;
}

// Pola yang sering memicu catastrophic backtracking: quantifier berlapis
// pada grup yang bisa kosong/ambigu, mis. (a+)+, (a|a)*, (.*)*.
const NESTED_QUANTIFIER = /\(([^()]*[+*][^()]*)\)[+*]/;
const QUANT_ON_GROUP_STAR = /\((?:[^()]|\|)*\*\)\*?/;
const AMBIGUOUS_ALTERNATION = /\(([^()|]+\|[^()]*\1[^()]*)\)[+*]/;

const TOKEN_KIND: [RegExp, string][] = [
  [/^\^/, 'anchor start'],
  [/\$$/, 'anchor end'],
  [/^\\d$/, 'digit class'],
  [/^\\w$/, 'word class'],
  [/^\\s$/, 'whitespace class'],
  [/^\\b$/, 'word boundary'],
  [/^\.$/, 'any char'],
  [/^\[/, 'character class'],
  [/^\(/, 'group'],
  [/^\|/, 'alternation'],
  [/[+*?]/, 'quantifier'],
  [/^\\[nrtf0-9xu]/, 'escape'],
  [/^./, 'literal'],
];

export function analyzeRegex(pattern: string, flags = ''): RegexAnalysis {
  const warnings: string[] = [];
  let valid = true;
  let error: string | undefined;
  try {
    new RegExp(pattern, flags);
  } catch (e) {
    valid = false;
    error = e instanceof Error ? e.message : 'Regex tidak valid.';
  }

  if (!valid) {
    return { pattern, flags, valid, error, tokens: [], warnings, riskScore: 0 };
  }

  if (NESTED_QUANTIFIER.test(pattern)) {
    warnings.push('Quantifier berlapis terdeteksi, mis. (a+)+. Potensi catastrophic backtracking (ReDoS).');
  }
  if (QUANT_ON_GROUP_STAR.test(pattern)) {
    warnings.push('Quantifier * di dalam grup berlapis. Input buruk dapat memperlambat pencocokan drastis.');
  }
  if (AMBIGUOUS_ALTERNATION.test(pattern)) {
    warnings.push('Alternation ambigu dengan quantifier. Risiko eksponensial pada input panjang.');
  }
  if (/(\.\*){2,}/.test(pattern)) {
    warnings.push('Beberapa .* berurutan. Pertimbangkan membatasinya agar tidak mahal.');
  }
  if (/\([^)]*\|[^)]*\|[^)]*\)/.test(pattern)) {
    warnings.push('Banyak alternation dalam satu grup. Kombinasi dengan quantifier bisa mahal.');
  }
  if (pattern.length > 80) {
    warnings.push('Pola panjang. Pastikan tidak ada quantifier berlapis.');
  }

  // Token dasar untuk penjelasan
  const tokens: { token: string; kind: string }[] = [];
  const chars = pattern.split('');
  let i = 0;
  while (i < chars.length) {
    let tok = chars[i];
    if (tok === '\\' && i + 1 < chars.length) {
      tok += chars[i + 1];
      i += 2;
    } else {
      i++;
    }
    const kind = TOKEN_KIND.find(([re]) => re.test(tok))?.[1] ?? 'literal';
    tokens.push({ token: tok, kind });
  }

  let risk = 0;
  if (NESTED_QUANTIFIER.test(pattern)) risk += 60;
  if (QUANT_ON_GROUP_STAR.test(pattern)) risk += 40;
  if (AMBIGUOUS_ALTERNATION.test(pattern)) risk += 30;
  if (/(\.\*){2,}/.test(pattern)) risk += 20;
  if (tokens.some((t) => t.kind === 'quantifier')) risk += 5;

  return {
    pattern,
    flags,
    valid,
    tokens: tokens.slice(0, 60),
    warnings,
    riskScore: Math.min(100, risk),
  };
}

export function riskLabel(score: number): 'low' | 'medium' | 'high' {
  if (score >= 50) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}
