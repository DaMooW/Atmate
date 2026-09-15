// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MaterialCard } from '../../components/chat/MaterialCard';
import type { MaterialCard as MaterialCardType } from '../../components/chat/materialTypes';

// 每个测试后清理 DOM，避免多个组件渲染导致选择器匹配多个元素
afterEach(() => {
  cleanup();
});

/**
 * L3 组件测试：MaterialCard（M2 T2.4，D3）。
 *
 * 覆盖：渲染、来源角标、原文编辑、档位切换、补充说明、采用/丢弃。
 */

function makeCard(overrides: Partial<MaterialCardType> = {}): MaterialCardType {
  return {
    id: 'card-1',
    text: '这是选中的文本',
    title: '测试页面',
    url: 'https://example.com',
    source: 'float-button',
    contextScope: 'nearby',
    userNote: '',
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('chat/MaterialCard', () => {
  it('渲染来源角标、页面标题、URL 和原文', () => {
    const card = makeCard();
    render(<MaterialCard card={card} onAdopt={vi.fn()} onDiscard={vi.fn()} onUpdate={vi.fn()} />);

    expect(screen.getByText('浮动按钮')).toBeInTheDocument();
    expect(screen.getByText('测试页面')).toBeInTheDocument();
    expect(screen.getByText('https://example.com')).toBeInTheDocument();
    expect(screen.getByTitle('点击编辑原文')).toHaveTextContent('这是选中的文本');
  });

  it('右键菜单来源显示正确角标', () => {
    const card = makeCard({ source: 'context-menu' });
    render(<MaterialCard card={card} onAdopt={vi.fn()} onDiscard={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText('右键菜单')).toBeInTheDocument();
  });

  it('点击原文进入编辑模式', () => {
    const card = makeCard();
    render(<MaterialCard card={card} onAdopt={vi.fn()} onDiscard={vi.fn()} onUpdate={vi.fn()} />);

    // 点击原文 div（通过 title 定位）
    fireEvent.click(screen.getByTitle('点击编辑原文'));

    // 应该出现 textarea
    const textarea = screen.getByLabelText('编辑原文') as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe('这是选中的文本');
  });

  it('编辑原文触发 onUpdate', () => {
    const onUpdate = vi.fn();
    const card = makeCard();
    render(<MaterialCard card={card} onAdopt={vi.fn()} onDiscard={vi.fn()} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByTitle('点击编辑原文'));
    const textarea = screen.getByLabelText('编辑原文') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '修改后的文本' } });

    expect(onUpdate).toHaveBeenCalledWith('card-1', { text: '修改后的文本' });
  });

  it('切换上下文档位触发 onUpdate', () => {
    const onUpdate = vi.fn();
    const card = makeCard({ contextScope: 'nearby' });
    render(<MaterialCard card={card} onAdopt={vi.fn()} onDiscard={vi.fn()} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: '仅选区' }));
    expect(onUpdate).toHaveBeenCalledWith('card-1', { contextScope: 'selection' });
  });

  it('当前档位按钮高亮显示', () => {
    const card = makeCard({ contextScope: 'nearby' });
    render(<MaterialCard card={card} onAdopt={vi.fn()} onDiscard={vi.fn()} onUpdate={vi.fn()} />);

    const nearbyBtn = screen.getByRole('button', { name: '±相邻段落' });
    expect(nearbyBtn.className).toContain('bg-primary');
  });

  it('输入补充说明触发 onUpdate', () => {
    const onUpdate = vi.fn();
    const card = makeCard();
    render(<MaterialCard card={card} onAdopt={vi.fn()} onDiscard={vi.fn()} onUpdate={onUpdate} />);

    const input = screen.getByPlaceholderText('补充说明（可选）...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '请翻译成英文' } });

    expect(onUpdate).toHaveBeenCalledWith('card-1', { userNote: '请翻译成英文' });
  });

  it('点击采用触发 onAdopt', () => {
    const onAdopt = vi.fn();
    const card = makeCard();
    render(<MaterialCard card={card} onAdopt={onAdopt} onDiscard={vi.fn()} onUpdate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '采用' }));
    expect(onAdopt).toHaveBeenCalledWith(card);
  });

  it('点击丢弃触发 onDiscard', () => {
    const onDiscard = vi.fn();
    const card = makeCard();
    render(<MaterialCard card={card} onAdopt={vi.fn()} onDiscard={onDiscard} onUpdate={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('丢弃素材卡片'));
    expect(onDiscard).toHaveBeenCalledWith('card-1');
  });

  it('显示 token 估算', () => {
    const card = makeCard({ text: 'a'.repeat(40) }); // 40 英文 ≈ 10 tokens
    render(<MaterialCard card={card} onAdopt={vi.fn()} onDiscard={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText(/约.*tokens/)).toBeInTheDocument();
  });
});
