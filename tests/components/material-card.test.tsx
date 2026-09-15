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
 * L3 组件测试：MaterialCard（M2 T2.4，D3/D18/D19/D20/D24）。
 *
 * 覆盖：渲染、已采用标识、来源角标、原文编辑、档位切换（含所在段落）、
 * 移除按钮、token 预览、发送时自动带入提示。
 * D24：移除补充说明输入框。
 */

function makeCard(overrides: Partial<MaterialCardType> = {}): MaterialCardType {
  return {
    id: 'card-1',
    text: '这是选中的文本',
    title: '测试页面',
    url: 'https://example.com',
    source: 'float-button',
    contextScope: 'containing-paragraph', // D20：默认所在段落
    adopted: true, // D18：默认已采用
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('chat/MaterialCard', () => {
  it('渲染已采用标识、来源角标、页面标题、URL 和原文', () => {
    const card = makeCard();
    render(<MaterialCard card={card} onRemove={vi.fn()} onUpdate={vi.fn()} />);

    // D18：已采用标识
    expect(screen.getByText('已采用')).toBeInTheDocument();
    expect(screen.getByText('浮动按钮')).toBeInTheDocument();
    expect(screen.getByText('测试页面')).toBeInTheDocument();
    expect(screen.getByText('https://example.com')).toBeInTheDocument();
    expect(screen.getByTitle('点击编辑原文')).toHaveTextContent('这是选中的文本');
  });

  it('右键菜单来源显示正确角标', () => {
    const card = makeCard({ source: 'context-menu' });
    render(<MaterialCard card={card} onRemove={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText('右键菜单')).toBeInTheDocument();
  });

  it('自动填充来源显示正确角标', () => {
    const card = makeCard({ source: 'auto-fill' });
    render(<MaterialCard card={card} onRemove={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText('自动填充')).toBeInTheDocument();
  });

  it('点击原文进入编辑模式', () => {
    const card = makeCard();
    render(<MaterialCard card={card} onRemove={vi.fn()} onUpdate={vi.fn()} />);

    fireEvent.click(screen.getByTitle('点击编辑原文'));

    const textarea = screen.getByLabelText('编辑原文') as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe('这是选中的文本');
  });

  it('编辑原文触发 onUpdate', () => {
    const onUpdate = vi.fn();
    const card = makeCard();
    render(<MaterialCard card={card} onRemove={vi.fn()} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByTitle('点击编辑原文'));
    const textarea = screen.getByLabelText('编辑原文') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '修改后的文本' } });

    expect(onUpdate).toHaveBeenCalledWith('card-1', { text: '修改后的文本' });
  });

  it('切换上下文档位触发 onUpdate（D20：所在段落为默认）', () => {
    const onUpdate = vi.fn();
    const card = makeCard({ contextScope: 'containing-paragraph' });
    render(<MaterialCard card={card} onRemove={vi.fn()} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: '仅选区' }));
    expect(onUpdate).toHaveBeenCalledWith('card-1', { contextScope: 'selection' });
  });

  it('显示四个上下文档位选项（D20）', () => {
    const card = makeCard();
    render(<MaterialCard card={card} onRemove={vi.fn()} onUpdate={vi.fn()} />);

    expect(screen.getByRole('button', { name: '仅选区' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '所在段落' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '±相邻段落' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '整页正文' })).toBeInTheDocument();
  });

  it('当前档位按钮高亮显示', () => {
    const card = makeCard({ contextScope: 'containing-paragraph' });
    render(<MaterialCard card={card} onRemove={vi.fn()} onUpdate={vi.fn()} />);

    const containingBtn = screen.getByRole('button', { name: '所在段落' });
    expect(containingBtn.className).toContain('bg-primary');
  });

  it('不显示补充说明输入框（D24：已移除）', () => {
    const card = makeCard();
    render(<MaterialCard card={card} onRemove={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.queryByPlaceholderText('补充说明（可选）...')).not.toBeInTheDocument();
  });

  it('点击移除触发 onRemove（D19：移除后不参与发送）', () => {
    const onRemove = vi.fn();
    const card = makeCard();
    render(<MaterialCard card={card} onRemove={onRemove} onUpdate={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('移除素材卡片'));
    expect(onRemove).toHaveBeenCalledWith('card-1');
  });

  it('不显示"采用"按钮（D18：默认已采用，无需手动采用）', () => {
    const card = makeCard();
    render(<MaterialCard card={card} onRemove={vi.fn()} onUpdate={vi.fn()} />);

    expect(screen.queryByRole('button', { name: '采用' })).not.toBeInTheDocument();
  });

  it('显示"发送时自动带入"提示（D19）', () => {
    const card = makeCard();
    render(<MaterialCard card={card} onRemove={vi.fn()} onUpdate={vi.fn()} />);

    expect(screen.getByText('发送时自动带入')).toBeInTheDocument();
  });

  it('显示 token 估算', () => {
    const card = makeCard({ text: 'a'.repeat(40) }); // 40 英文 ≈ 10 tokens
    render(<MaterialCard card={card} onRemove={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText(/约.*tokens/)).toBeInTheDocument();
  });
});
