import { describe, it, expect } from 'vitest';
import { parseSSE } from '../../infra/llm/sseParser';

/**
 * 将字符串转换为 ReadableStream（模拟 fetch response.body）
 */
function stringToStream(data: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(data));
      controller.close();
    },
  });
}

function sseChunk(json: unknown): string {
  return `data: ${JSON.stringify(json)}\n\n`;
}

describe('infra/llm/sseParser', () => {
  it('正常流式：累积 delta.content', async () => {
    const stream = stringToStream(
      sseChunk({ choices: [{ delta: { content: '你' } }] }) +
        sseChunk({ choices: [{ delta: { content: '好' } }] }) +
        'data: [DONE]\n\n',
    );
    const result = await parseSSE(stream);
    expect(result.content).toBe('你好');
    expect(result.done).toBe(true);
  });

  it('onContent 回调被调用', async () => {
    const chunks: string[] = [];
    const stream = stringToStream(
      sseChunk({ choices: [{ delta: { content: 'A' } }] }) +
        sseChunk({ choices: [{ delta: { content: 'B' } }] }) +
        'data: [DONE]\n\n',
    );
    await parseSSE(stream, { onContent: (d) => chunks.push(d) });
    expect(chunks).toEqual(['A', 'B']);
  });

  it('DeepSeek 系 reasoning_content 采集', async () => {
    const stream = stringToStream(
      sseChunk({ choices: [{ delta: { reasoning_content: '思考中' } }] }) +
        sseChunk({ choices: [{ delta: { content: '答案' } }] }) +
        'data: [DONE]\n\n',
    );
    const result = await parseSSE(stream);
    expect(result.reasoning).toBe('思考中');
    expect(result.content).toBe('答案');
  });

  it('OpenRouter 系 reasoning 采集', async () => {
    const stream = stringToStream(
      sseChunk({ choices: [{ delta: { reasoning: 'thinking' } }] }) + 'data: [DONE]\n\n',
    );
    const result = await parseSSE(stream);
    expect(result.reasoning).toBe('thinking');
  });

  it('onReasoning 回调被调用', async () => {
    const reasoningChunks: string[] = [];
    const stream = stringToStream(
      sseChunk({ choices: [{ delta: { reasoning_content: 'X' } }] }) + 'data: [DONE]\n\n',
    );
    await parseSSE(stream, { onReasoning: (d) => reasoningChunks.push(d) });
    expect(reasoningChunks).toEqual(['X']);
  });

  it('usage chunk 解析', async () => {
    const stream = stringToStream(
      sseChunk({ choices: [{ delta: { content: 'hi' } }] }) +
        sseChunk({ usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } }) +
        'data: [DONE]\n\n',
    );
    const result = await parseSSE(stream);
    expect(result.usage).toEqual({ prompt: 10, completion: 5, total: 15 });
  });

  it('onUsage 回调被调用', async () => {
    let usageData: unknown;
    const stream = stringToStream(
      sseChunk({ usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } }) +
        'data: [DONE]\n\n',
    );
    await parseSSE(stream, { onUsage: (u) => (usageData = u) });
    expect(usageData).toEqual({ prompt: 1, completion: 2, total: 3 });
  });

  it('畸形 JSON 不中断流', async () => {
    const stream = stringToStream(
      'data: {invalid json\n\n' +
        sseChunk({ choices: [{ delta: { content: 'ok' } }] }) +
        'data: [DONE]\n\n',
    );
    const result = await parseSSE(stream);
    expect(result.content).toBe('ok');
    expect(result.done).toBe(true);
  });

  it('空 delta 不影响', async () => {
    const stream = stringToStream(
      sseChunk({ choices: [{ delta: {} }] }) +
        sseChunk({ choices: [{ delta: { content: 'x' } }] }) +
        'data: [DONE]\n\n',
    );
    const result = await parseSSE(stream);
    expect(result.content).toBe('x');
  });

  it('无 [DONE] 时 done=false', async () => {
    const stream = stringToStream(sseChunk({ choices: [{ delta: { content: 'x' } }] }));
    const result = await parseSSE(stream);
    expect(result.done).toBe(false);
    expect(result.content).toBe('x');
  });

  it('空流返回空结果', async () => {
    const stream = stringToStream('');
    const result = await parseSSE(stream);
    expect(result.content).toBe('');
    expect(result.reasoning).toBe('');
    expect(result.done).toBe(false);
  });

  it('忽略非 data 行（event:/id:/retry:）', async () => {
    const stream = stringToStream(
      'event: message\n' +
        'id: 1\n' +
        sseChunk({ choices: [{ delta: { content: 'x' } }] }) +
        'data: [DONE]\n\n',
    );
    const result = await parseSSE(stream);
    expect(result.content).toBe('x');
  });

  it('onDone 回调在 [DONE] 时被调用', async () => {
    let doneCalled = false;
    const stream = stringToStream('data: [DONE]\n\n');
    await parseSSE(stream, { onDone: () => (doneCalled = true) });
    expect(doneCalled).toBe(true);
  });
});
