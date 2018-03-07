function escape(str: string): string {
  return str.replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function base64encode(email: string): string {
  return escape(Buffer.from(email, 'utf8').toString('base64'));
}

function unescape(str: string): string {
  return (str + '==='.slice((str.length + 3) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
}

export function base64decode(str) {
  return Buffer.from(unescape(str), 'base64').toString('utf8');
}
