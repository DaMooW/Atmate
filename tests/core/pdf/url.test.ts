import { describe, expect, it } from 'vitest';
import { isPdfUrl, extractFileName, parseViewerUrl, isFileUrl } from '~/core/pdf/url';

describe('core/pdf/url · isPdfUrl', () => {
  it('普通 .pdf 结尾返回 true', () => {
    expect(isPdfUrl('https://example.com/doc.pdf')).toBe(true);
  });

  it('大写 .PDF 结尾返回 true', () => {
    expect(isPdfUrl('https://example.com/DOC.PDF')).toBe(true);
  });

  it('带 query 参数的 .pdf 返回 true', () => {
    expect(isPdfUrl('https://example.com/doc.pdf?download=true')).toBe(true);
  });

  it('带 hash 的 .pdf 返回 true', () => {
    expect(isPdfUrl('https://example.com/doc.pdf#page=2')).toBe(true);
  });

  it('file:// 协议的 .pdf 返回 true', () => {
    expect(isPdfUrl('file:///Users/test/doc.pdf')).toBe(true);
  });

  it('非 .pdf 扩展名返回 false', () => {
    expect(isPdfUrl('https://example.com/doc.html')).toBe(false);
  });

  it('无扩展名返回 false', () => {
    expect(isPdfUrl('https://example.com/document')).toBe(false);
  });

  it('无效 URL 返回 false', () => {
    expect(isPdfUrl('not a url')).toBe(false);
  });

  it('路径中含 .pdf 但非结尾返回 false', () => {
    expect(isPdfUrl('https://example.com/pdf/file.html')).toBe(false);
  });
});

describe('core/pdf/url · extractFileName', () => {
  it('从 http URL 提取文件名', () => {
    expect(extractFileName('https://example.com/path/to/document.pdf')).toBe('document.pdf');
  });

  it('从 file URL 提取文件名', () => {
    expect(extractFileName('file:///Users/test/my%20doc.pdf')).toBe('my doc.pdf');
  });

  it('带 query 参数时忽略 query', () => {
    expect(extractFileName('https://example.com/doc.pdf?a=b')).toBe('doc.pdf');
  });

  it('带 hash 时忽略 hash', () => {
    expect(extractFileName('https://example.com/doc.pdf#page=1')).toBe('doc.pdf');
  });

  it('根路径无文件名返回 unknown.pdf', () => {
    expect(extractFileName('https://example.com/')).toBe('unknown.pdf');
  });

  it('无效 URL 返回 unknown.pdf', () => {
    expect(extractFileName('not a url')).toBe('unknown.pdf');
  });
});

describe('core/pdf/url · parseViewerUrl', () => {
  it('解析正常 file 参数', () => {
    expect(parseViewerUrl('?file=https%3A%2F%2Fexample.com%2Fdoc.pdf')).toBe(
      'https://example.com/doc.pdf',
    );
  });

  it('无 file 参数返回 null', () => {
    expect(parseViewerUrl('?other=value')).toBeNull();
  });

  it('空 search 返回 null', () => {
    expect(parseViewerUrl('')).toBeNull();
  });

  it('file 参数为无效 URL 返回 null', () => {
    expect(parseViewerUrl('?file=not-a-url')).toBeNull();
  });
});

describe('core/pdf/url · isFileUrl', () => {
  it('file:// 协议返回 true', () => {
    expect(isFileUrl('file:///Users/test/doc.pdf')).toBe(true);
  });

  it('https 协议返回 false', () => {
    expect(isFileUrl('https://example.com/doc.pdf')).toBe(false);
  });

  it('http 协议返回 false', () => {
    expect(isFileUrl('http://example.com/doc.pdf')).toBe(false);
  });
});
