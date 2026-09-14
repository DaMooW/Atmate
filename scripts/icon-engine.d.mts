/**
 * icon-engine.mjs 的类型声明。
 * 脚本保持 .mjs（纯 Node 运行、不经过 WXT/tsc 构建），
 * 测试文件 import 时需要此声明文件通过 tsc --noEmit。
 */

export interface RoundRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  r: number;
}

export type Point = readonly [number, number];
export type Triangle = readonly [Point, Point, Point];
export type Dot = [number, number, number];

export const GRADIENT_TOP: [number, number, number];
export const GRADIENT_BOTTOM: [number, number, number];
export const WHITE: [number, number, number];
export const BADGE: RoundRect;
export const BUBBLE: RoundRect;
export const TAIL: Triangle;
export const DOTS: Dot[];

export function insideRoundRect(px: number, py: number, rect: RoundRect): boolean;
export function insideTriangle(px: number, py: number, tri: Triangle): boolean;
export function crc32(buf: Buffer): number;
export function chunk(type: string, data: Buffer): Buffer;
export function encodePng(size: number, rgba: Buffer): Buffer;
export function render(size: number): Buffer;
