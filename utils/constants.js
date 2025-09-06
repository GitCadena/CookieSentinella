export const SENSITIVE_COOKIE_NAMES = [
  'session',
  'auth',
  'token',
  'csrf',
  'jwt',
  'identity',
  'login',
  'credential'
];

export const XSS_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /javascript:[^'"]*/i,
  /on\w+\s*=/i,
  /eval\(/i,
  /expression\(/i,
  /data:text\/html/i,
  /%3Cscript%3E/i
];

export const MALICIOUS_URL_PATTERNS = [
  /javascript:/i,
  /data:text\/html/i,
  /eval\(/i,
  /%3Cscript%3E/i
];