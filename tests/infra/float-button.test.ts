// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createFloatButton } from '../../entrypoints/content/float-button';

/**
 * L2 单测：浮动按钮 Shadow DOM 创建与交互（M2 T2.2）。
 *
 * 覆盖：Shadow DOM 创建、show/hide/isVisible、点击回调、destroy 移除 DOM。
 */

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('content/float-button · createFloatButton', () => {
  it('创建浮动按钮并挂载到 document.body', () => {
    const onClick = vi.fn();
    const button = createFloatButton(onClick);

    // 宿主元素应挂载到 body
    const host = document.querySelector('.atmate-float-button-host');
    expect(host).not.toBeNull();
    expect(host?.parentElement).toBe(document.body);

    // Shadow DOM 应存在
    const shadowRoot = host?.shadowRoot;
    expect(shadowRoot).not.toBeNull();

    // 按钮元素应存在
    const btn = shadowRoot?.querySelector('.atmate-float-button');
    expect(btn).not.toBeNull();

    // tooltip 应存在
    const tooltip = shadowRoot?.querySelector('.atmate-float-button-tooltip');
    expect(tooltip).not.toBeNull();
    expect(tooltip?.textContent).toBe('发送到在伴');

    button.destroy();
  });

  it('show() 显示按钮并设置位置', () => {
    const onClick = vi.fn();
    const button = createFloatButton(onClick);

    button.show(100, 200);

    expect(button.isVisible()).toBe(true);
    const host = document.querySelector('.atmate-float-button-host') as HTMLElement;
    expect(host.classList.contains('visible')).toBe(true);
    expect(host.style.left).toBe('100px');
    expect(host.style.top).toBe('200px');

    button.destroy();
  });

  it('hide() 隐藏按钮', () => {
    const onClick = vi.fn();
    const button = createFloatButton(onClick);

    button.show(100, 200);
    expect(button.isVisible()).toBe(true);

    button.hide();
    expect(button.isVisible()).toBe(false);
    const host = document.querySelector('.atmate-float-button-host') as HTMLElement;
    expect(host.classList.contains('visible')).toBe(false);

    button.destroy();
  });

  it('初始状态不可见', () => {
    const onClick = vi.fn();
    const button = createFloatButton(onClick);

    expect(button.isVisible()).toBe(false);

    button.destroy();
  });

  it('点击按钮触发 onClick 回调', () => {
    const onClick = vi.fn();
    const button = createFloatButton(onClick);

    const host = document.querySelector('.atmate-float-button-host') as HTMLElement;
    const btn = host.shadowRoot?.querySelector('.atmate-float-button') as HTMLButtonElement;
    btn.click();

    expect(onClick).toHaveBeenCalledTimes(1);

    button.destroy();
  });

  it('destroy() 移除 DOM 元素', () => {
    const onClick = vi.fn();
    const button = createFloatButton(onClick);

    expect(document.querySelector('.atmate-float-button-host')).not.toBeNull();

    button.destroy();

    expect(document.querySelector('.atmate-float-button-host')).toBeNull();
  });

  it('按钮有 aria-label 无障碍属性', () => {
    const onClick = vi.fn();
    const button = createFloatButton(onClick);

    const host = document.querySelector('.atmate-float-button-host') as HTMLElement;
    const btn = host.shadowRoot?.querySelector('.atmate-float-button') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBe('发送到在伴 AI 侧边栏');

    button.destroy();
  });

  it('按钮类型为 button（不提交表单）', () => {
    const onClick = vi.fn();
    const button = createFloatButton(onClick);

    const host = document.querySelector('.atmate-float-button-host') as HTMLElement;
    const btn = host.shadowRoot?.querySelector('.atmate-float-button') as HTMLButtonElement;
    expect(btn.type).toBe('button');

    button.destroy();
  });
});
