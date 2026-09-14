import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  estimateMessagesTokens,
  estimateRoundTokens,
  contextPercent,
  contextLevel,
  isContextLimitReached,
  DEFAULT_TOKEN_RATIO,
} from '../../core/tokens';

describe('core/tokens · estimateTokens（ceil(字符数 / 3.2)）', () => {
  it('空字符串返回 0', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('纯中文：4 字符 → ceil(4/3.2) = 2', () => {
    expect(estimateTokens('你好世界')).toBe(2);
  });

  it('纯英文：4 字符 → ceil(4/3.2) = 2', () => {
    expect(estimateTokens('test')).toBe(2);
  });

  it('纯英文：3 字符 → ceil(3/3.2) = 1', () => {
    expect(estimateTokens('abc')).toBe(1);
  });

  it('中英混合：按总字符数计算', () => {
    // "你好hello" = 7 字符 → ceil(7/3.2) = 3
    expect(estimateTokens('你好hello')).toBe(3);
  });

  it('数字和标点按字符计算', () => {
    // "12345" = 5 字符 → ceil(5/3.2) = 2
    expect(estimateTokens('12345')).toBe(2);
  });

  it('仅空白字符', () => {
    // "    " = 4 空格 → ceil(4/3.2) = 2
    expect(estimateTokens('    ')).toBe(2);
  });

  it('超长文本（100k+ 字符）', () => {
    const longText = 'a'.repeat(100000);
    const expected = Math.ceil(100000 / DEFAULT_TOKEN_RATIO);
    expect(estimateTokens(longText)).toBe(expected);
  });

  it('自定义 ratio', () => {
    expect(estimateTokens('hello', 4)).toBe(2); // ceil(5/4) = 2
    expect(estimateTokens('hello', 2)).toBe(3); // ceil(5/2) = 3
  });
});

describe('core/tokens · estimateMessagesTokens（含结构开销）', () => {
  it('空数组返回 0', () => {
    expect(estimateMessagesTokens([])).toBe(0);
  });

  it('单条消息：content 估算 + 4 结构开销', () => {
    // "user: 你好" = 7 字符 → ceil(7/3.2) = 3 + 4 = 7
    expect(estimateMessagesTokens([{ role: 'user', content: '你好' }])).toBe(7);
  });

  it('多条消息累加', () => {
    const messages = [
      { role: 'user', content: '你好' },
      { role: 'assistant', content: '你好！有什么可以帮你？' },
    ];
    // 序列化后 "user: 你好\nassistant: 你好！有什么可以帮你？"
    const result = estimateMessagesTokens(messages);
    expect(result).toBeGreaterThan(0);
    // 至少包含两条消息的结构开销
    expect(result).toBeGreaterThanOrEqual(8);
  });

  it('自定义 ratio', () => {
    const result = estimateMessagesTokens([{ role: 'user', content: 'hello' }], 4);
    expect(result).toBe(estimateTokens('user: hello', 4) + 4);
  });
});

describe('core/tokens · estimateRoundTokens（估算与精确混合）', () => {
  it('无 usage 时估算 user + assistant', () => {
    const result = estimateRoundTokens({ content: '你好' }, { content: '你好！' });
    expect(result).toBe(estimateTokens('你好') + estimateTokens('你好！'));
  });

  it('有 usage 时用精确值', () => {
    const result = estimateRoundTokens(
      { content: '你好' },
      { content: '你好！', usage: { total: 100 } },
    );
    expect(result).toBe(100);
  });

  it('usage.total 为 0 时回退到估算', () => {
    const result = estimateRoundTokens(
      { content: '你好' },
      { content: '你好！', usage: { total: 0 } },
    );
    expect(result).toBe(estimateTokens('你好') + estimateTokens('你好！'));
  });
});

describe('core/tokens · contextPercent', () => {
  it('正常计算', () => {
    expect(contextPercent(50, 100)).toBe(50);
    expect(contextPercent(75, 100)).toBe(75);
  });

  it('超过 100% 时截断为 100', () => {
    expect(contextPercent(150, 100)).toBe(100);
  });

  it('limit 为 0 时返回 100', () => {
    expect(contextPercent(0, 0)).toBe(100);
  });

  it('limit 为负数时返回 100', () => {
    expect(contextPercent(10, -1)).toBe(100);
  });
});

describe('core/tokens · contextLevel（三段变色阈值）', () => {
  it('69% → normal', () => {
    expect(contextLevel(69)).toBe('normal');
  });

  it('70% → warning', () => {
    expect(contextLevel(70)).toBe('warning');
  });

  it('71% → warning', () => {
    expect(contextLevel(71)).toBe('warning');
  });

  it('89% → warning', () => {
    expect(contextLevel(89)).toBe('warning');
  });

  it('90% → danger', () => {
    expect(contextLevel(90)).toBe('danger');
  });

  it('91% → danger', () => {
    expect(contextLevel(91)).toBe('danger');
  });

  it('0% → normal', () => {
    expect(contextLevel(0)).toBe('normal');
  });

  it('100% → danger', () => {
    expect(contextLevel(100)).toBe('danger');
  });
});

describe('core/tokens · isContextLimitReached', () => {
  it('未达限返回 false', () => {
    expect(isContextLimitReached(50, 100)).toBe(false);
  });

  it('刚好达限返回 true', () => {
    expect(isContextLimitReached(100, 100)).toBe(true);
  });

  it('超过限返回 true', () => {
    expect(isContextLimitReached(150, 100)).toBe(true);
  });
});
