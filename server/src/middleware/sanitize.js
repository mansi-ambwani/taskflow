// Input sanitization middleware.
// Runs on every request BEFORE validation:
//  - trims strings and removes null bytes / control characters
//  - strips HTML tags (blocks stored XSS like <script>…</script>)
//  - drops prototype-pollution keys (__proto__, constructor, prototype)
//  - caps string length so oversized payloads can't reach the database
// SQL injection is handled separately: every query uses parameter placeholders (?).

const MAX_STRING = 5000;
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function cleanString(str) {
  return str
    .replace(/\0/g, '')
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '') // remove script/style blocks with content
    .replace(/<\/?[a-z][^>]*>/gi, '') // remove any remaining HTML tags
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // control chars (keeps \n, \r, \t)
    .trim()
    .slice(0, MAX_STRING);
}

function deepClean(value, depth = 0) {
  if (depth > 5) return undefined;
  if (typeof value === 'string') return cleanString(value);
  if (Array.isArray(value)) return value.slice(0, 100).map((v) => deepClean(v, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (BLOCKED_KEYS.has(k)) continue;
      out[k] = deepClean(v, depth + 1);
    }
    return out;
  }
  return value;
}

function sanitizeInput(req, res, next) {
  if (req.body) req.body = deepClean(req.body);
  if (req.params) req.params = deepClean(req.params);
  // req.query is a getter in newer Express versions, so clean it in place
  if (req.query) {
    const cleaned = deepClean(req.query);
    for (const key of Object.keys(req.query)) delete req.query[key];
    Object.assign(req.query, cleaned);
  }
  next();
}

module.exports = { sanitizeInput, cleanString };
