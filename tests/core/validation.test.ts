import { describe, it, expect } from 'vitest';
import {
  validateBaseUrl,
  validateApiKey,
  validateModelId,
  validateName,
  validateContextLimit,
  validateCustomTemplate,
  validateApiConfigForm,
} from '../../core/validation';

describe('core/validation · validateBaseUrl', () => {
  it('空字符串报错', () => {
    expect(validateBaseUrl('')).not.toBeNull();
  });

  it('合法 https URL 通过', () => {
    expect(validateBaseUrl('https://api.deepseek.com/v1')).toBeNull();
  });

  it('合法 http URL 通过', () => {
    expect(validateBaseUrl('http://localhost:11434/v1')).toBeNull();
  });

  it('非 http/https 协议报错', () => {
    expect(validateBaseUrl('ftp://example.com')).not.toBeNull();
  });

  it('非法格式报错', () => {
    expect(validateBaseUrl('not-a-url')).not.toBeNull();
  });

  it('前后空格被 trim', () => {
    expect(validateBaseUrl('  https://api.x.com/v1  ')).toBeNull();
  });
});

describe('core/validation · validateApiKey', () => {
  it('空字符串报错', () => {
    expect(validateApiKey('')).not.toBeNull();
  });

  it('非空通过', () => {
    expect(validateApiKey('sk-123')).toBeNull();
  });
});

describe('core/validation · validateModelId', () => {
  it('空字符串报错', () => {
    expect(validateModelId('')).not.toBeNull();
  });

  it('非空通过', () => {
    expect(validateModelId('deepseek-chat')).toBeNull();
  });
});

describe('core/validation · validateName', () => {
  it('空字符串报错', () => {
    expect(validateName('')).not.toBeNull();
  });

  it('正常名称通过', () => {
    expect(validateName('DeepSeek')).toBeNull();
  });

  it('超过 50 字符报错', () => {
    expect(validateName('a'.repeat(51))).not.toBeNull();
  });

  it('恰好 50 字符通过', () => {
    expect(validateName('a'.repeat(50))).toBeNull();
  });
});

describe('core/validation · validateContextLimit', () => {
  it('正整数通过', () => {
    expect(validateContextLimit(128000)).toBeNull();
  });

  it('0 报错', () => {
    expect(validateContextLimit(0)).not.toBeNull();
  });

  it('负数报错', () => {
    expect(validateContextLimit(-100)).not.toBeNull();
  });

  it('小数报错', () => {
    expect(validateContextLimit(128000.5)).not.toBeNull();
  });

  it('NaN 报错', () => {
    expect(validateContextLimit(NaN)).not.toBeNull();
  });
});

describe('core/validation · validateCustomTemplate', () => {
  it('undefined 通过（非 custom 模式）', () => {
    expect(validateCustomTemplate(undefined)).toBeNull();
  });

  it('包含 {{level}} 的合法模板通过', () => {
    expect(validateCustomTemplate('{"reasoning_effort":"{{level}}"}')).toBeNull();
  });

  it('空字符串报错', () => {
    expect(validateCustomTemplate('   ')).not.toBeNull();
  });

  it('缺少 {{level}} 报错', () => {
    expect(validateCustomTemplate('{"reasoning_effort":"medium"}')).not.toBeNull();
  });
});

describe('core/validation · validateApiConfigForm', () => {
  const validData = {
    name: 'Test',
    baseUrl: 'https://api.x.com/v1',
    apiKey: 'sk-123',
    modelId: 'model-x',
    contextLimit: 128000,
    thinkingMapping: 'reasoning_effort' as const,
  };

  it('合法数据无错误', () => {
    expect(validateApiConfigForm(validData)).toEqual([]);
  });

  it('名称重复报错', () => {
    const errors = validateApiConfigForm(validData, ['Test']);
    expect(errors.some((e) => e.field === 'name')).toBe(true);
  });

  it('编辑时排除自身名称', () => {
    // existingNames 中不包含当前编辑的名称时不报错
    expect(validateApiConfigForm(validData, ['Other'])).toEqual([]);
  });

  it('custom 模式缺少 {{level}} 报错', () => {
    const errors = validateApiConfigForm({
      ...validData,
      thinkingMapping: 'custom',
      customTemplate: '{"key":"value"}',
    });
    expect(errors.some((e) => e.field === 'customTemplate')).toBe(true);
  });

  it('custom 模式合法模板通过', () => {
    const errors = validateApiConfigForm({
      ...validData,
      thinkingMapping: 'custom',
      customTemplate: '{"key":"{{level}}"}',
    });
    expect(errors).toEqual([]);
  });

  it('多个字段错误全部返回', () => {
    const errors = validateApiConfigForm({
      name: '',
      baseUrl: 'bad',
      apiKey: '',
      modelId: '',
      contextLimit: 0,
      thinkingMapping: 'reasoning_effort',
    });
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });
});
