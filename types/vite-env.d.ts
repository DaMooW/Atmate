/// <reference types="vite/client" />

/**
 * Vite ?raw 导入声明
 * 允许 import prompt from './prompts/xxx.md?raw' 得到字符串
 */
declare module '*?raw' {
  const content: string;
  export default content;
}
