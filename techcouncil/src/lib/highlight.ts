/**
 * A deliberately small TypeScript highlighter for the code windows. It only
 * needs to handle the short excerpts on this site: comments, strings, numbers,
 * keywords and function calls. Everything else is plain text.
 */
export type TokenKind = 'keyword' | 'string' | 'number' | 'comment' | 'fn' | 'plain';
export type Token = [TokenKind, string];

const KEYWORDS = new Set([
  'const', 'let', 'await', 'async', 'return', 'if', 'else', 'export', 'import', 'from',
  'new', 'null', 'true', 'false', 'function', 'typeof', 'type', 'interface',
]);

const RULES: [TokenKind | 'word', RegExp][] = [
  ['comment', /^\/\/.*/],
  ['string', /^'(?:[^'\\]|\\.)*'|^"(?:[^"\\]|\\.)*"|^`(?:[^`\\]|\\.)*`/],
  ['number', /^\d+(?:\.\d+)?/],
  ['word', /^[A-Za-z_$][\w$]*/],
  ['plain', /^\s+/],
  ['plain', /^./],
];

export function highlightLine(line: string): Token[] {
  const out: Token[] = [];
  let rest = line;
  while (rest.length) {
    for (const [kind, re] of RULES) {
      const m = re.exec(rest);
      if (!m) continue;
      const text = m[0];
      let k: TokenKind = kind === 'word' ? 'plain' : kind;
      if (kind === 'word') {
        if (KEYWORDS.has(text)) k = 'keyword';
        else if (/^\s*\(/.test(rest.slice(text.length))) k = 'fn';
      }
      const last = out[out.length - 1];
      if (last && last[0] === k && k === 'plain') last[1] += text;
      else out.push([k, text]);
      rest = rest.slice(text.length);
      break;
    }
  }
  return out;
}
