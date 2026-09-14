import { describe, expect, it } from 'vitest';
import wxtConfig from '../../wxt.config';

/**
 * M0 manifest 关键约束验证（tech §3 / spec 修订 D8/D9）。
 * 直接 import wxt.config 的静态 manifest 字段，不跑完整构建。
 */
// wxt.config 的 manifest 类型是联合类型（对象/Promise/函数），本项目用静态对象，断言为对象
const manifest = wxtConfig.manifest as Record<string, unknown> & {
  permissions: string[];
  action: { default_title: string; default_icon: Record<number, string> };
  icons: Record<number, string>;
  minimum_chrome_version: string;
  name: string;
  short_name: string;
  description: string;
};

describe('wxt.config manifest', () => {
  it('权限最小化：仅 sidePanel', () => {
    expect(manifest.permissions).toEqual(['sidePanel']);
  });

  it('action 存在且无 default_popup（D8：否则 onClicked 不触发）', () => {
    expect(manifest.action).toBeDefined();
    expect(manifest.action).not.toHaveProperty('default_popup');
  });

  it('action.default_title 为产品名', () => {
    expect(manifest.action!.default_title).toBe('在伴 Atmate');
  });

  it('icons 声明 16/32/48/128 四个尺寸（D9）', () => {
    expect(manifest.icons).toEqual({
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    });
  });

  it('action.default_icon 与 icons 一致', () => {
    expect(manifest.action!.default_icon).toEqual(manifest.icons);
  });

  it('minimum_chrome_version 为 114（Side Panel API 最低版本）', () => {
    expect(manifest.minimum_chrome_version).toBe('114');
  });

  it('name / short_name / description 非空', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.description).toBeTruthy();
  });

  it('outDir 为非隐藏的 dist/（D10）', () => {
    expect(wxtConfig.outDir).toBe('dist');
  });
});
