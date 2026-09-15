import { describe, expect, it } from 'vitest';
import { decidePdfAction } from '~/core/pdf/navigation';

describe('core/pdf/navigation · decidePdfAction', () => {
  it('viewer 模式返回 redirect', () => {
    const action = decidePdfAction('viewer', 'https://example.com/doc.pdf');
    expect(action.type).toBe('redirect');
    if (action.type === 'redirect') {
      expect(action.viewerUrl).toContain('viewer.html?file=');
      expect(action.viewerUrl).toContain(encodeURIComponent('https://example.com/doc.pdf'));
    }
  });

  it('native 模式返回 ignore', () => {
    const action = decidePdfAction('native', 'https://example.com/doc.pdf');
    expect(action.type).toBe('ignore');
  });

  it('ask 模式返回 ask', () => {
    const action = decidePdfAction('ask', 'https://example.com/doc.pdf');
    expect(action.type).toBe('ask');
  });

  it('自定义 viewer 页面路径', () => {
    const action = decidePdfAction('viewer', 'https://example.com/doc.pdf', 'custom-viewer.html');
    expect(action.type).toBe('redirect');
    if (action.type === 'redirect') {
      expect(action.viewerUrl).toContain('custom-viewer.html?file=');
    }
  });

  it('file:// URL 正确编码', () => {
    const action = decidePdfAction('viewer', 'file:///Users/test/my doc.pdf');
    expect(action.type).toBe('redirect');
    if (action.type === 'redirect') {
      expect(action.viewerUrl).toContain(encodeURIComponent('file:///Users/test/my doc.pdf'));
    }
  });
});
