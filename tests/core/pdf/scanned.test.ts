import { describe, expect, it } from 'vitest';
import { isScannedPage, isAllScanned, type PdfTextItem } from '~/core/pdf/scanned';

function makeItems(count: number, str = 'hello'): PdfTextItem[] {
  return Array.from({ length: count }, () => ({ str }));
}

describe('core/pdf/scanned · isScannedPage', () => {
  it('空数组返回 true（扫描件）', () => {
    expect(isScannedPage([])).toBe(true);
  });

  it('少于阈值（默认5）的文字项返回 true', () => {
    expect(isScannedPage(makeItems(3))).toBe(true);
  });

  it('等于阈值返回 false（正常文字页）', () => {
    expect(isScannedPage(makeItems(5))).toBe(false);
  });

  it('多于阈值返回 false', () => {
    expect(isScannedPage(makeItems(20))).toBe(false);
  });

  it('自定义阈值', () => {
    expect(isScannedPage(makeItems(3), 10)).toBe(true);
    expect(isScannedPage(makeItems(10), 10)).toBe(false);
  });

  it('过滤纯空白项后判断', () => {
    const items: PdfTextItem[] = [
      { str: '   ' },
      { str: '' },
      { str: '\n' },
      { str: 'hello' },
      { str: 'world' },
    ];
    // 非空白项只有 2 个 < 5 → 扫描件
    expect(isScannedPage(items)).toBe(true);
  });

  it('null/undefined 输入返回 true', () => {
    expect(isScannedPage(null as unknown as PdfTextItem[])).toBe(true);
    expect(isScannedPage(undefined as unknown as PdfTextItem[])).toBe(true);
  });
});

describe('core/pdf/scanned · isAllScanned', () => {
  it('连续 5 页均为扫描件返回 true', () => {
    expect(isAllScanned([true, true, true, true, true])).toBe(true);
  });

  it('不足 5 页返回 false', () => {
    expect(isAllScanned([true, true, true])).toBe(false);
  });

  it('中间有非扫描页打断连续', () => {
    expect(isAllScanned([true, true, false, true, true, true])).toBe(false); // 后 3 个不够 5
    expect(isAllScanned([true, true, true, true, false, true, true, true, true, true])).toBe(true); // 后 5 个连续
  });

  it('全部非扫描页返回 false', () => {
    expect(isAllScanned([false, false, false, false, false])).toBe(false);
  });

  it('自定义连续页数阈值', () => {
    expect(isAllScanned([true, true, true], 3)).toBe(true);
    expect(isAllScanned([true, true], 3)).toBe(false);
  });
});
