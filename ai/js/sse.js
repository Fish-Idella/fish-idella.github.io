// ============================================================
// OpenAI-compatible SSE Parser for Streaming Chat Completions
// ============================================================

/**
 * 解析标准 OpenAI /chat/completions stream 响应
 *
 * 用法：
 *   const parser = new LLMSSEParser({ onThink, onResponse, onToolCall });
 *   parser.feed(rawTextOrChunk);
 *   const result = parser.getResult();
 *
 * 或直接消费 fetch Response 的 ReadableStream：
 *   const result = await parser.consumeStream(resp.body);
 */
class LLMSSEParser {
  constructor(options = {}) {
    this.options = options;

    // -------- 回调 --------
    this.onThink        = options.onThink        || null; // (chunk: string, ctx) => void  推理增量
    this.onResponse     = options.onResponse     || null; // (chunk: string, ctx) => void  正文增量
    this.onToolCallDelta= options.onToolCallDelta|| null; // (delta, merged, ctx) => void  原始 tool_call 增量
    this.onToolCall     = options.onToolCall     || null; // (merged, ctx) => void         合并后的 tool_call（每次变化时触发）
    this.onFinish       = options.onFinish       || null; // (finishReason, ctx) => void
    this.onDone         = options.onDone         || null; // () => void                    收到 [DONE]
    this.onUsage        = options.onUsage        || null; // (usage) => void
    this.onChunk        = options.onChunk        || null; // (data, eventType) => void     每个 data JSON 分片
    this.onError        = options.onError        || null; // (error) => void

    // -------- 内部状态 --------
    this._buffer = '';
    this._finished = false;

    // -------- 输出汇总 --------
    this.thinkingContent = '';            // 推理内容拼接
    this.responseContent = '';            // 正文内容拼接
    this.toolCalls = [];                  // 最终合并后的 tool calls
    this._toolCallsByIndex = new Map();   // index -> merged tool call（流式聚合）

    this.metadata = {
      id: null,
      model: null,
      created: null,
      finishReason: null,
      usage: null,
    };
  }

  // ============================================================
  //  1. SSE 行级解析
  // ============================================================

  /**
   * 喂入原始 SSE 文本（可分多次）
   */
  feed(chunk) {
    this._buffer += chunk;

    // 兼容 \n\n 和 \r\n\r\n
    const blocks = this._buffer.split(/\r?\n\r?\n/);
    this._buffer = blocks.pop(); // 最后一段可能不完整

    for (const block of blocks) {
      if (block.trim()) this._processBlock(block);
    }
  }

  /**
   * 处理一个完整 SSE block
   */
  _processBlock(block) {
    let eventType = 'message';
    const dataLines = [];

    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        // 去掉 "data:" 后的第一个空格
        dataLines.push(line.slice(5).replace(/^ /, ''));
      }
      // 忽略 id / retry / comment
    }

    if (dataLines.length === 0) return;

    const raw = dataLines.join('\n').trim();

    // OpenAI 结束标志
    if (raw === '[DONE]') {
      this._finished = true;
      this._finalizeToolCalls();
      this.onDone?.();
      return;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.warn('[LLMSSEParser] JSON parse error:', e, raw);
      return;
    }

    this._dispatch(eventType, data);
  }

  // ============================================================
  //  2. 事件分发
  // ============================================================

  _dispatch(eventType, data) {
    this.onChunk?.(data, eventType);

    // ---- 顶层错误 ----
    if (data.error) {
      this.onError?.(data.error);
      return;
    }

    // ---- 顶层元信息 ----
    if (data.id)      this.metadata.id = data.id;
    if (data.model)   this.metadata.model = data.model;
    if (data.created) this.metadata.created = data.created;

    // ---- usage（stream_options.include_usage = true 时最后一个 chunk 才有）----
    if (data.usage) {
      this.metadata.usage = data.usage;
      this.onUsage?.(data.usage);
    }

    // ---- choices ----
    const choices = data.choices;
    if (!Array.isArray(choices) || choices.length === 0) return;

    for (const choice of choices) {
      this._handleChoice(choice);
    }
  }

  // ============================================================
  //  3. Choice / Delta 处理
  // ============================================================

  _handleChoice(choice) {
    const delta = choice.delta || {};

    // ---- 3.1 推理内容（DeepSeek-R1 / GLM / Qwen 等）----
    // 常见字段：reasoning_content, reasoning, thinking
    const reasoning =
      delta.reasoning_content ??
      delta.reasoning ??
      delta.thinking;

    if (typeof reasoning === 'string' && reasoning.length > 0) {
      this.thinkingContent += reasoning;
      this.onThink?.(reasoning, { content: this.thinkingContent });
    }

    // ---- 3.2 正文内容 ----
    if (typeof delta.content === 'string' && delta.content.length > 0) {
      this.responseContent += delta.content;
      this.onResponse?.(delta.content, { content: this.responseContent });
    }

    // ---- 3.3 Tool Calls ----
    if (Array.isArray(delta.tool_calls)) {
      for (const tc of delta.tool_calls) {
        this._handleToolCallDelta(tc);
      }
    }

    // ---- 3.4 finish_reason ----
    const finish = choice.finish_reason;
    if (finish) {
      this.metadata.finishReason = finish;
      // 收尾时把 tool calls 最终化一次
      if (finish === 'tool_calls' || finish === 'stop' || finish === 'length') {
        this._finalizeToolCalls();
      }
      this.onFinish?.(finish, { finishReason: finish });
    }
  }

  // ============================================================
  //  4. Tool Call 增量聚合
  // ============================================================

  /**
   * OpenAI 的 tool_calls 是按 index 分片到达的：
   *   第一片： { index:0, id:"call_xxx", type:"function", function:{ name:"get_weather", arguments:"" } }
   *   后续片： { index:0, function:{ arguments:"{\"loc" } }
   *   再后续： { index:0, function:{ arguments:"ation\":\"SF\"}" } }
   */
  _handleToolCallDelta(tc) {
    const index = tc.index ?? 0;

    let entry = this._toolCallsByIndex.get(index);
    if (!entry) {
      entry = {
        index,
        id: '',
        type: 'function',
        function: { name: '', arguments: '' },
      };
      this._toolCallsByIndex.set(index, entry);
    }

    // id / type 通常只在第一片出现
    if (tc.id)   entry.id = tc.id;
    if (tc.type) entry.type = tc.type;

    if (tc.function) {
      if (typeof tc.function.name === 'string') {
        // name 一般只发一次；但用 += 兼容少量厂商分片发送的情况
        entry.function.name += tc.function.name;
      }
      if (typeof tc.function.arguments === 'string') {
        entry.function.arguments += tc.function.arguments;
      }
    }

    // 原始增量回调
    this.onToolCallDelta?.(tc, entry, { index });

    // 合并后的整体状态回调（每收到一次增量就触发一次）
    this.onToolCall?.(entry, { index, delta: tc });
  }

  /**
   * 收尾：整理 toolCalls 数组、尝试解析 arguments JSON
   */
  _finalizeToolCalls() {
    const list = Array.from(this._toolCallsByIndex.values())
      .sort((a, b) => a.index - b.index);

    for (const tc of list) {
      if (tc.function.parsedArguments === undefined) {
        const raw = tc.function.arguments || '';
        try {
          tc.function.parsedArguments = raw ? JSON.parse(raw) : {};
        } catch {
          tc.function.parsedArguments = null; // 解析失败保留 null，由调用方决定
        }
      }
    }

    this.toolCalls = list;
  }

  // ============================================================
  //  5. 结果获取
  // ============================================================

  getResult() {
    return {
      thinkingContent: this.thinkingContent,
      responseContent: this.responseContent,
      toolCalls: this.toolCalls,
      metadata: { ...this.metadata },
      finished: this._finished,
    };
  }

  // ============================================================
  //  6. 直接消费 fetch Response 的 ReadableStream
  // ============================================================

  async consumeStream(readableStream) {
    const reader = readableStream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        this.feed(decoder.decode(value, { stream: true }));
      }
      // 处理 buffer 中剩余内容
      if (this._buffer.trim()) {
        this._processBlock(this._buffer);
        this._buffer = '';
      }
    } finally {
      reader.releaseLock();
    }

    // 有些服务端不发 [DONE]，这里兜底收尾
    if (!this._finished) {
      this._finished = true;
      this._finalizeToolCalls();
    }

    return this.getResult();
  }
}

// ============================================================
//  使用示例
// ============================================================

/*
// ---- 示例 1：流式对话 + 思维链 ----
const parser = new LLMSSEParser({
  onThink(chunk)     { process.stdout.write('[思考] ' + chunk); },
  onResponse(chunk)  { process.stdout.write('[回复] ' + chunk); },
  onToolCall(tc)     {
    console.log(`\n[tool_call #${tc.index}] ${tc.function.name}`);
    console.log('  args so far:', tc.function.arguments);
  },
  onFinish(reason)   { console.log('\n[完成]', reason); },
  onUsage(u)         { console.log('[tokens]', u); },
  onError(err)       { console.error('[错误]', err); },
});

const resp = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    stream: true,
    stream_options: { include_usage: true },
    messages: [{ role: 'user', content: '北京今天天气如何？' }],
    tools: [{
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get weather for a city',
        parameters: {
          type: 'object',
          properties: { city: { type: 'string' } },
          required: ['city'],
        },
      },
    }],
  }),
});

const result = await parser.consumeStream(resp.body);

console.log('\n--- 完成 ---');
console.log('推理:', result.thinkingContent);
console.log('回复:', result.responseContent);
console.log('工具调用:', result.toolCalls);

// result.toolCalls 形如：
// [
//   {
//     index: 0,
//     id: 'call_abc',
//     type: 'function',
//     function: {
//       name: 'get_weather',
//       arguments: '{"city":"北京"}',
//       parsedArguments: { city: '北京' }  // 已解析
//     }
//   }
// ]

// ---- 示例 2：直接喂文本 ----
const raw = [
  'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","created":1,"model":"gpt-4o-mini","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}',
  '',
  'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{"content":"你好"},"finish_reason":null}]}',
  '',
  'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"id":"call_x","type":"function","function":{"name":"get_weather","arguments":""}}]},"finish_reason":null}]}',
  '',
  'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"city\\":\\"北京\\"}"}}]},"finish_reason":null}]}',
  '',
  'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{},"finish_reason":"tool_calls"}]}',
  '',
  'data: [DONE]',
  '',
].join('\n');

const p2 = new LLMSSEParser();
p2.feed(raw);
console.log(p2.getResult());
*/