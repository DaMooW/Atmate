import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  estimateMessagesTokens,
  contextPercent,
  contextLevel,
  isContextLimitReached,
} from '../../core/tokens';

describe('core/tokens · estimateTokens', () => {
  it('空字符串返回 0', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('纯中文：1 字符 ≈ 1 token', () => {
    expect(estimateTokens('你好世界')).toBe(4);
  });

  it('纯英文：4 字符 ≈ 1 token', () => {
    expect(estimateTokens('hello')).toBe(2); // 5 字符 → ceil(5/4) = 2
    expect(estimateTokens('test')).toBe(1); // 4 字符 → 1
  });

  it('中英混合', () => {
    // "你好hello" = 2 中文 + 5 英文 = 2 + ceil(5/4) = 2 + 2 = 4
    expect(estimateTokens('你好hello')).toBe(4);
  });

  it('数字和标点按英文计算', () => {
    expect(estimateTokens('12345')).toBe(2); // 5 字符 → ceil(5/4) = 2
  });

  it('空白字符按英文计算', () => {
    expect(estimateTokens('    ')).toBe(1); // 4 空格 → 1
  });

  it('长文本估算', () => {
    const longText = '中'.repeat(1000) + 'a'.repeat(4000);
    expect(estimateTokens(longText)).toBe(1000 + 1000); // 1000 中文 + 4000/4 英文
  });

  it('日文假名按 CJK 计算', () => {
    expect(estimateTokens('こんにちは')).toBe(5);
  });

  it('韩文按 CJK 计算', () => {
    expect(estimateTokens('안녕하세요')).toBe(5);
  });
});

describe('core/tokens · estimateMessagesTokens', () => {
  it('空数组返回 0', () => {
    expect(estimateMessagesTokens([])).toBe(0);
  });

  it('多条消息累加', () => {
    const messages = [{ content: '你好' }, { content: 'hello' }];
    expect(estimateMessagesTokens(messages)).toBe(2 + 2);
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
