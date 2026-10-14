/**
 * chat/messages.mjs
 * 消息流式累加器与消息工具函数。
 */

export function setupMessages(ctx) {
    const { vm_message, messages } = ctx;

    // ---------- 消息流式累加器 ----------
    class MessageBox {
        constructor(message, index) {
            this.message = message;
            this.index = index;
            this.reasoningContent = [message.reasoner];
            this.messageContent = [message.content[0].text];
            this.tool_calls = [];
        }
        setUsage(usage) {
            this.message.usage = usage;
        }
        // 流式期间只做「纯文本 + 状态行」更新，不做 markdown 解析与代码高亮：
        // 中间态的高亮没有任何意义，而每个 token 都调 Prism.highlightAllUnder 会全量重扫，
        // 长回答必然卡顿。唯一一次完整渲染（含高亮）由 done() 触发。
        addReasoningChunk(chunk) {
            if (!chunk) return;
            this.reasoningContent.push(chunk);
            this.message.reasoner = this.getReasoningChunk();
            vm_message.render(vm_message.activeItem, this.message, this.index, '思考中…');
        }
        addContentChunk(chunk) {
            if (!chunk) return;
            this.messageContent.push(chunk);
            this.message.content = this.getContentChunk();
            vm_message.render(vm_message.activeItem, this.message, this.index, '回答中…');
        }
        getContentChunk() {
            return this.messageContent.join('');
        }
        getReasoningChunk() {
            return this.reasoningContent.join('');
        }
        addToolCalls(tool_calls) {
            const fns = this.tool_calls;
            tool_calls.forEach(function (tc) {
                const idx = tc.index;
                let fn = fns[idx];
                if (!fn) {
                    fn = Object.assign({ ass: [] }, tc);
                    fns[idx] = fn;
                }
                fn.ass.push(tc.function.arguments);
            });
        }
        setToolCalls() {
            this.tool_calls.forEach(fn => {
                fn.function.arguments = fn.ass.join("");
                Reflect.deleteProperty(fn, "ass");
            });
            this.message.tool_calls = this.tool_calls;
        }
        done() {
            // 流式结束信号：这一 render 是整轮唯一一次完整渲染，
            // markdown 解析 + 代码高亮都在这里发生。
            vm_message.render(vm_message.activeItem, this.message, this.index, '已完成');
            this.message.not_done = false;
        }
    }
    ctx.MessageBox = MessageBox;

    // ---------- 消息工具函数 ----------
    ctx.messagePurifying = function messagePurifying(msgs) {
        ctx.aiRequestConfig.messages = msgs.map(m => ({
            "role": m.role,
            "content": m.content,
            "reasoning_content": m.reasoner,
            "tool_calls": m.tool_calls,
            "tool_call_id": m.tool_call_id
        }));
        return JSON.stringify(ctx.aiRequestConfig);
    };

    ctx.addMessage = function addMessage(role, inputContent) {
        const index = messages.length;
        const last = index - 1;
        const message = {
            role: role,
            main: true,
            reasoner: '',
            content: [{ type: 'text', text: inputContent }],
            thinkStartTime: performance.now(),
            not_done: role !== 'user',
            branch: []
        };
        message.state = message.not_done ? '就绪' : "已完成";
        const group = messages.at(last).branch;
        group.forEach(item => item.main = false);
        group.push(message);
        messages.push(message);
        return new MessageBox(message, index);
    };

    ctx.initMessageList = function initMessageList(branch) {
        let currentBranch = branch;
        // 环防护：branch 链由 LLM 与导入配置写入，理论上可能成环（A.branch 含 B、B.branch 含 A），
        // 原先 while(length) 会直接死循环卡死页面。用 visited 记录已走过的节点，遇到重复立即停。
        const visited = new Set();
        while (currentBranch && currentBranch.length > 0) {
            const message = currentBranch.find(msg => msg.main) || currentBranch[currentBranch.length - 1];
            if (!message || visited.has(message)) break;
            visited.add(message);
            message.main = true;
            messages.push(message);
            currentBranch = message.branch;
        }
    };
}