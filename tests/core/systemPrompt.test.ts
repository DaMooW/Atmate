import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildSystemMessage } from '../../core/systemPrompt';
import { DIRECTIVE_V1 } from '../../core/directive';
import type { Role } from '../../core/types';

const mockRole: Role = {
  id: 'test',
  name: '测试角色',
  systemPrompt: '你是一个测试角色。',
  builtin: false,
};

describe('core/systemPrompt · buildSystemPrompt', () => {
  it('基础指令关闭时只返回角色提示词', () => {
    const result = buildSystemPrompt(mockRole, { baseDirectiveEnabled: false });
    expect(result).toBe('你是一个测试角色。');
  });

  it('基础指令开启时追加基础指令段', () => {
    const result = buildSystemPrompt(mockRole, { baseDirectiveEnabled: true });
    expect(result).toContain('你是一个测试角色。');
    expect(result).toContain(DIRECTIVE_V1);
    expect(result).toContain('\n\n');
  });

  it('角色提示词首尾空白被 trim', () => {
    const roleWithSpaces: Role = {
      ...mockRole,
      systemPrompt: '  你是一个测试角色。  ',
    };
    const result = buildSystemPrompt(roleWithSpaces, { baseDirectiveEnabled: false });
    expect(result).toBe('你是一个测试角色。');
  });

  it('buildSystemMessage 返回正确的 message 对象', () => {
    const msg = buildSystemMessage(mockRole, { baseDirectiveEnabled: true });
    expect(msg.role).toBe('system');
    expect(msg.content).toContain('你是一个测试角色。');
    expect(msg.content).toContain(DIRECTIVE_V1);
  });
});
