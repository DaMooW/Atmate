/**
 * API 配置字段校验（spec M1 T1.2）
 * 纯函数，可单测。
 */

export interface ValidationError {
  field: string;
  message: string;
}

/** 校验 Base URL 格式 */
export function validateBaseUrl(url: string): ValidationError | null {
  if (!url.trim()) {
    return { field: 'baseUrl', message: 'Base URL 不能为空' };
  }
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { field: 'baseUrl', message: 'Base URL 必须以 http:// 或 https:// 开头' };
    }
    return null;
  } catch {
    return { field: 'baseUrl', message: 'Base URL 格式不正确' };
  }
}

/** 校验 API Key */
export function validateApiKey(key: string): ValidationError | null {
  if (!key.trim()) {
    return { field: 'apiKey', message: 'API Key 不能为空' };
  }
  return null;
}

/** 校验模型 ID */
export function validateModelId(modelId: string): ValidationError | null {
  if (!modelId.trim()) {
    return { field: 'modelId', message: '模型 ID 不能为空' };
  }
  return null;
}

/** 校验配置名称 */
export function validateName(name: string): ValidationError | null {
  if (!name.trim()) {
    return { field: 'name', message: '名称不能为空' };
  }
  if (name.length > 50) {
    return { field: 'name', message: '名称不能超过 50 个字符' };
  }
  return null;
}

/** 校验 contextLimit */
export function validateContextLimit(limit: number): ValidationError | null {
  if (!Number.isFinite(limit) || limit <= 0) {
    return { field: 'contextLimit', message: '上下文上限必须为正整数' };
  }
  if (!Number.isInteger(limit)) {
    return { field: 'contextLimit', message: '上下文上限必须为整数' };
  }
  return null;
}

/** 校验思维强度 custom 模板（仅当 mapping=custom 时） */
export function validateCustomTemplate(template: string | undefined): ValidationError | null {
  if (template === undefined) return null;
  if (!template.trim()) {
    return { field: 'customTemplate', message: '自定义模板不能为空' };
  }
  if (!template.includes('{{level}}')) {
    return { field: 'customTemplate', message: '自定义模板必须包含 {{level}} 变量' };
  }
  return null;
}

/**
 * 校验完整 API 配置表单，返回所有错误。
 * @param data 表单数据
 * @param existingNames 已有配置名称列表（用于重名检查，编辑时排除自身）
 */
export function validateApiConfigForm(
  data: {
    name: string;
    baseUrl: string;
    apiKey: string;
    modelId: string;
    contextLimit: number;
    thinkingMapping: string;
    customTemplate?: string;
  },
  existingNames: string[] = [],
): ValidationError[] {
  const errors: ValidationError[] = [];

  const nameErr = validateName(data.name);
  if (nameErr) errors.push(nameErr);
  else if (existingNames.includes(data.name.trim())) {
    errors.push({ field: 'name', message: '已存在同名配置' });
  }

  const urlErr = validateBaseUrl(data.baseUrl);
  if (urlErr) errors.push(urlErr);

  const keyErr = validateApiKey(data.apiKey);
  if (keyErr) errors.push(keyErr);

  const modelErr = validateModelId(data.modelId);
  if (modelErr) errors.push(modelErr);

  const limitErr = validateContextLimit(data.contextLimit);
  if (limitErr) errors.push(limitErr);

  if (data.thinkingMapping === 'custom') {
    const tplErr = validateCustomTemplate(data.customTemplate);
    if (tplErr) errors.push(tplErr);
  }

  return errors;
}
