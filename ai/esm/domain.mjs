/**
 * domain.mjs
 * 领域模型：Memory 词条、双向关联。
 */

import { formatDate } from './core.mjs';

/**
 * 信息条目类（记忆的基本存储单元）
 */
export class Memory {
    constructor(uuid) {
        this.key = uuid;
        this.summary = "";         // 词条简要概括
        this.memory = "";          // 正文内容，Markdown
        this.tags = null;          // 标签
        this.associated = [];      // 关联的其他词条 key
        this.created_at = formatDate();
        this.updated_at = this.created_at;
    }
}

/**
 * 为两个词条建立双向关联
 */
export function addBidirectionalAssociation(infoA, infoB) {
    PuSet.ensureObjectProperty(infoA, "associated", Array);
    PuSet.ensureObjectProperty(infoB, "associated", Array);
    if (!infoA.associated.includes(infoB.key)) infoA.associated.push(infoB.key);
    if (!infoB.associated.includes(infoA.key)) infoB.associated.push(infoA.key);
}