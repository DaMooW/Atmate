import { describe, it, expect } from 'vitest';
import {
  BUILTIN_ROLES,
  DEFAULT_ROLE_ID,
  createBuiltinRoles,
  getMissingBuiltinRoles,
} from '../../core/builtinRoles';
import type { Role } from '../../core/types';

describe('core/builtinRoles · BUILTIN_ROLES', () => {
  it('包含五个默认角色', () => {
    expect(BUILTIN_ROLES).toHaveLength(5);
  });

  it('五个角色名称正确', () => {
    const names = BUILTIN_ROLES.map((r) => r.name);
    expect(names).toContain('在伴 Atmate');
    expect(names).toContain('翻译官');
    expect(names).toContain('摘要助手');
    expect(names).toContain('代码审查员');
    expect(names).toContain('学术解说员');
  });

  it('默认角色为「在伴 Atmate」，且位于列表首位', () => {
    expect(DEFAULT_ROLE_ID).toBe('builtin-atmate');
    expect(BUILTIN_ROLES[0]!.id).toBe(DEFAULT_ROLE_ID);
  });

  it('「在伴 Atmate」的 prompt 是产品介绍设定（含划词/角色/token 关键词）', () => {
    const atmate = BUILTIN_ROLES.find((r) => r.id === 'builtin-atmate')!;
    expect(atmate.systemPrompt).toContain('划词');
    expect(atmate.systemPrompt).toContain('角色');
    expect(atmate.systemPrompt).toContain('token');
  });

  it('每个角色的 prompt 非空（?raw 导入成功）', () => {
    for (const role of BUILTIN_ROLES) {
      expect(role.systemPrompt.length).toBeGreaterThan(10);
    }
  });

  it('每个角色有稳定 ID', () => {
    for (const role of BUILTIN_ROLES) {
      expect(role.id).toMatch(/^builtin-/);
    }
  });

  it('翻译官 prompt 包含翻译相关关键词', () => {
    const translator = BUILTIN_ROLES.find((r) => r.id === 'builtin-translator')!;
    expect(translator.systemPrompt).toContain('翻译');
  });

  it('代码审查员 prompt 包含审查维度', () => {
    const reviewer = BUILTIN_ROLES.find((r) => r.id === 'builtin-code-reviewer')!;
    expect(reviewer.systemPrompt).toContain('正确性');
    expect(reviewer.systemPrompt).toContain('性能');
    expect(reviewer.systemPrompt).toContain('可读性');
    expect(reviewer.systemPrompt).toContain('安全性');
  });
});

describe('core/builtinRoles · createBuiltinRoles', () => {
  it('生成 Role 实体数组', () => {
    const roles = createBuiltinRoles();
    expect(roles).toHaveLength(5);
    for (const role of roles) {
      expect(role.builtin).toBe(true);
      expect(role.id).toBeTruthy();
      expect(role.name).toBeTruthy();
      expect(role.systemPrompt.length).toBeGreaterThan(10);
    }
  });

  it('每次调用返回独立数组', () => {
    const a = createBuiltinRoles();
    const b = createBuiltinRoles();
    expect(a).not.toBe(b);
    expect(a[0]).not.toBe(b[0]);
  });
});

describe('core/builtinRoles · getMissingBuiltinRoles', () => {
  it('空列表返回全部五个', () => {
    expect(getMissingBuiltinRoles([])).toHaveLength(5);
  });

  it('全部存在时返回空数组', () => {
    const all = createBuiltinRoles();
    expect(getMissingBuiltinRoles(all)).toHaveLength(0);
  });

  it('缺失一个时返回该角色', () => {
    const all = createBuiltinRoles();
    const withoutTranslator = all.filter((r) => r.id !== 'builtin-translator');
    const missing = getMissingBuiltinRoles(withoutTranslator);
    expect(missing).toHaveLength(1);
    expect(missing[0]!.id).toBe('builtin-translator');
  });

  it('按 ID 匹配，不按名称匹配（用户重命名默认角色不算缺失）', () => {
    const renamed: Role[] = [
      {
        id: 'builtin-translator',
        name: '我的翻译官',
        systemPrompt: 'custom',
        builtin: true,
      },
    ];
    // 翻译官 ID 存在，不算缺失；其余四个缺失
    const missing = getMissingBuiltinRoles(renamed);
    expect(missing).toHaveLength(4);
    expect(missing.find((m) => m.id === 'builtin-translator')).toBeUndefined();
  });

  it('用户自建角色不影响缺失判断', () => {
    const custom: Role[] = [
      { id: 'custom-1', name: '自定义', systemPrompt: 'test', builtin: false },
    ];
    expect(getMissingBuiltinRoles(custom)).toHaveLength(5);
  });
});
