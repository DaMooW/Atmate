import { describe, expect, it } from 'vitest';

/** M0：管道冒烟（T0.3 要求 vitest 可空跑；真实单测随 M1 的 core 域层而来）。 */
describe('vitest pipeline', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
