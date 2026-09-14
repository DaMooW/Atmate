import { describe, it, expect } from 'vitest';
import {
  generateSessionTitle,
  sortSessionsByUpdatedAt,
  updateSessionMessages,
  deleteSession,
  renameSession,
} from '../../core/session';
import type { ChatMessage, Session } from '../../core/types';

const mockMessages: ChatMessage[] = [
  { id: 'm1', role: 'user', content: '你好，请翻译这段文字', createdAt: 1 },
  { id: 'm2', role: 'assistant', content: '好的', createdAt: 2 },
];

const mockSessions: Session[] = [
  {
    id: 's1',
    roleId: 'r1',
    title: '会话1',
    messages: [],
    cumulativeTokens: 0,
    createdAt: 100,
    updatedAt: 300,
  },
  {
    id: 's2',
    roleId: 'r1',
    title: '会话2',
    messages: [],
    cumulativeTokens: 0,
    createdAt: 200,
    updatedAt: 100,
  },
  {
    id: 's3',
    roleId: 'r1',
    title: '会话3',
    messages: [],
    cumulativeTokens: 0,
    createdAt: 300,
    updatedAt: 200,
  },
];

describe('core/session · generateSessionTitle', () => {
  it('取首条用户消息前 20 字', () => {
    expect(generateSessionTitle(mockMessages)).toBe('你好，请翻译这段文字');
  });

  it('超过 20 字时截断并加省略号', () => {
    const longMsg: ChatMessage[] = [
      {
        id: 'm1',
        role: 'user',
        content: '一二三四五六七八九十一二三四五六七八九十extra',
        createdAt: 1,
      },
    ];
    expect(generateSessionTitle(longMsg)).toBe('一二三四五六七八九十一二三四五六七八九十...');
  });

  it('无消息时返回"新会话"', () => {
    expect(generateSessionTitle([])).toBe('新会话');
  });

  it('首条用户消息为空时返回"新会话"', () => {
    const emptyMsg: ChatMessage[] = [{ id: 'm1', role: 'user', content: '   ', createdAt: 1 }];
    expect(generateSessionTitle(emptyMsg)).toBe('新会话');
  });

  it('只有 assistant 消息时返回"新会话"', () => {
    const onlyAssistant: ChatMessage[] = [
      { id: 'm1', role: 'assistant', content: '你好', createdAt: 1 },
    ];
    expect(generateSessionTitle(onlyAssistant)).toBe('新会话');
  });

  it('system 消息不算首条用户消息', () => {
    const withSystem: ChatMessage[] = [
      { id: 'm0', role: 'system', content: 'system', createdAt: 0 },
      { id: 'm1', role: 'user', content: '用户消息', createdAt: 1 },
    ];
    expect(generateSessionTitle(withSystem)).toBe('用户消息');
  });
});

describe('core/session · sortSessionsByUpdatedAt', () => {
  it('按 updatedAt 降序', () => {
    const sorted = sortSessionsByUpdatedAt(mockSessions);
    expect(sorted.map((s) => s.id)).toEqual(['s1', 's3', 's2']);
  });

  it('不修改原数组', () => {
    const original = [...mockSessions];
    sortSessionsByUpdatedAt(mockSessions);
    expect(mockSessions).toEqual(original);
  });
});

describe('core/session · updateSessionMessages', () => {
  it('更新指定会话的消息', () => {
    const updated = updateSessionMessages(mockSessions, 's1', mockMessages);
    const s1 = updated.find((s) => s.id === 's1')!;
    expect(s1.messages).toHaveLength(2);
    expect(s1.updatedAt).toBeGreaterThan(300);
  });

  it('可同时更新标题', () => {
    const updated = updateSessionMessages(mockSessions, 's1', mockMessages, '新标题');
    const s1 = updated.find((s) => s.id === 's1')!;
    expect(s1.title).toBe('新标题');
  });

  it('不修改其他会话', () => {
    const updated = updateSessionMessages(mockSessions, 's1', mockMessages);
    expect(updated.find((s) => s.id === 's2')!.messages).toHaveLength(0);
  });
});

describe('core/session · deleteSession', () => {
  it('删除指定会话', () => {
    const result = deleteSession(mockSessions, 's2');
    expect(result).toHaveLength(2);
    expect(result.find((s) => s.id === 's2')).toBeUndefined();
  });

  it('删除不存在的会话不报错', () => {
    const result = deleteSession(mockSessions, 'nonexistent');
    expect(result).toHaveLength(3);
  });
});

describe('core/session · renameSession', () => {
  it('重命名指定会话', () => {
    const result = renameSession(mockSessions, 's1', '新名称');
    expect(result.find((s) => s.id === 's1')!.title).toBe('新名称');
  });

  it('更新 updatedAt', () => {
    const result = renameSession(mockSessions, 's1', '新名称');
    expect(result.find((s) => s.id === 's1')!.updatedAt).toBeGreaterThan(300);
  });
});
