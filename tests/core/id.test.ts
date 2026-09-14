import { describe, it, expect } from 'vitest';
import { generateId } from '../../core/id';

describe('core/id · generateId', () => {
  it('生成默认长度 12 的 ID', () => {
    const id = generateId();
    expect(id).toHaveLength(12);
  });

  it('生成指定长度的 ID', () => {
    expect(generateId(8)).toHaveLength(8);
    expect(generateId(21)).toHaveLength(21);
  });

  it('只包含 URL 安全字符', () => {
    const id = generateId(100);
    expect(id).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it('多次生成不重复（1000 次采样）', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(1000);
  });

  it('length <= 0 时抛错', () => {
    expect(() => generateId(0)).toThrow();
    expect(() => generateId(-1)).toThrow();
  });
});
