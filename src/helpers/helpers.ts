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

/**
 * Convert plain array into chunked array.
 *
 * @param srcArray
 * @param size
 */
export function chunkArray<T>(srcArray: T[], size: number): T[][] {
  return Array.from(
    Array(Math.ceil(srcArray.length / size)),
    (_, i) => srcArray.slice(i * size, i * size + size)
  );
}

/**
 * Process items in chunked manner.
 * Use it when items is not so large.
 * @param items
 * @param chunkSize
 * @param mapFunc
 */
export async function processAsyncItemsByChunks<T, R>(
  items: T[], chunkSize: number, mapFunc: (item: T) => Promise<R>
): Promise<R[]> {
  let data: R[] = [];
  const parts = chunkArray(items, Math.min(Math.max(chunkSize, 1), items.length));

  for (let i = 0; i < parts.length; i++) {
    data = data.concat(await Promise.all(parts[i].map(mapFunc)));
  }

  return data;
}

/**
 *
 * @param items
 * @param chunkSize
 * @param mapFunc
 */
export async function processAsyncIteratorByChunks<T, R>(
  items: any, chunkSize: number, mapFunc: (item: T) => Promise<R>
): Promise<R[]> {
  let data: R[] = [];
  chunkSize = Math.max(chunkSize, 1);

  for (let i of items) {
    (await Promise.all(i.map(mapFunc))).forEach((r: R) => data.push(r));
  }

  return data;
}
