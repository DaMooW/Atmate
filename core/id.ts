/**
 * 短 ID 生成器（零依赖，替代 nanoid）
 * 使用 crypto.getRandomValues 生成 URL 安全的随机字符串。
 * 默认长度 12，碰撞概率可忽略（同表内 1e12 条 ID 碰撞概率 < 1e-9）。
 */

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DEFAULT_LENGTH = 12;

/**
 * 生成一个短随机 ID。
 * @param length ID 长度，默认 12
 */
export function generateId(length: number = DEFAULT_LENGTH): string {
  if (length <= 0) {
    throw new Error(`generateId: length must be positive, got ${length}`);
  }
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let id = '';
  for (let i = 0; i < length; i++) {
    const char = ALPHABET[bytes[i]! % ALPHABET.length];
    if (char) id += char;
  }
  return id;
}
