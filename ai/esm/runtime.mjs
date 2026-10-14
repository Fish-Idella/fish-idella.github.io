/**
 * runtime.mjs
 * 运行时依赖注入容器与预览待确认任务（单例可变对象）。
 *
 * 依赖注入：
 *   runtime.AndroidObject      —— 由 ui.mjs 引导后写入
 *   runtime.currentAgentConfig —— 由 chat/controller.mjs 的 initAgent() 写入
 *   runtime.initAgent          —— 由 chat/controller.mjs 写入，供 tools 层切换主智能体
 *   runtime.saveData           —— 由 chat/store.mjs 写入，供 tools 层持久化
 *   runtime.vm_agent           —— 由 views/memory.mjs 写入，供 tools 层刷新 Agent 列表
 *   runtime.vm_images          —— 由 views/chat-view.mjs 写入
 */

/** 预览待确认任务 */
export const PENDING = {
    tool: null,
    key: '',
    func: null
};

/** 运行时依赖注入容器 */
export const runtime = {
    history: null,
    AndroidObject: null,
    currentAgentConfig: null,
    vm_images: null,
    initAgent: null,
    saveData: null,
    vm_agent: null
};