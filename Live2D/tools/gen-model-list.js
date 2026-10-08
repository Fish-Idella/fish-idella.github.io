#!/usr/bin/env node
/**
 * 扫描 assets/ 下的所有 Live2D 模型配置，生成 model-list.js。
 *
 * 用法：  node tools/gen-model-list.js
 *
 * 判定规则（主配置）：
 *   - 内容是合法 JSON
 *   - 同时含字符串字段 "model" 与数组/字段 "textures"
 *   - 排除 expressions/*.exp.json、physics.json、pose.json 等
 *
 * 生成结果写入项目根的 model-list.js，形如：
 *   window.LIVE2D_MODEL_LIST = [ { name, path }, ... ];
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "model-list.js");

// 扫描起始目录（相对项目根）
const SCAN_DIRS = [
    "assets/live2d",
    "assets/Live2d-model-master",
];

// 明确排除的文件名 / 后缀
const SKIP_NAMES = new Set([
    "physics.json", "pose.json", "externalParam.json",
]);
const SKIP_SUFFIX = [".exp.json", ".physics.json", ".pose.json"];

function readJson(filePath) {
    let raw;
    try {
        raw = fs.readFileSync(filePath, "utf8");
    } catch (e) {
        return null;
    }
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); // 去 BOM
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function isModelConfig(filePath) {
    const base = path.basename(filePath);
    if (SKIP_NAMES.has(base)) return false;
    const lower = base.toLowerCase();
    if (SKIP_SUFFIX.some(s => lower.endsWith(s))) return false;

    const json = readJson(filePath);
    if (!json) return false;
    // 主配置：有 "model" 字符串，且有 "textures"
    return typeof json.model === "string" && json.textures != null;
}

function walk(dir, out) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
        return; // 目录不存在则跳过
    }
    for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name === "node_modules" || ent.name === ".git") continue;
            walk(full, out);
        } else if (ent.isFile() && ent.name.toLowerCase().endsWith(".json")) {
            if (isModelConfig(full)) out.push(full);
        }
    }
}

// 由相对路径生成较友好的显示名，并保证唯一
function makeName(relPath, usedNames) {
    let rel = relPath.replace(/\\/g, "/").replace(/^assets\//, "");
    // 去掉前面的固定前缀，缩短显示名
    rel = rel.replace(/^Live2d-model-master\//, "").replace(/^live2d\//, "");
    // 去掉扩展名
    rel = rel.replace(/\.model\.json$/i, "").replace(/\.json$/i, "");

    // 拆段并剔除空段（如 ".model.json" 去后缀后产生的空文件名）
    let parts = rel.split("/").filter(function (p) { return p !== ""; });
    // 若最后一段就是 "model"（多数游戏的通用名），则省略它
    if (parts.length > 1 && /^model$/i.test(parts[parts.length - 1])) {
        parts = parts.slice(0, -1);
    }
    // 取最后 3 段拼接
    let name = parts.slice(-3).join(" / ");
    if (!name) name = rel;

    if (usedNames.has(name)) {
        let i = 2;
        while (usedNames.has(name + " #" + i)) i++;
        name = name + " #" + i;
    }
    usedNames.add(name);
    return name;
}

function main() {
    const files = [];
    for (const d of SCAN_DIRS) {
        walk(path.join(ROOT, d), files);
    }
    files.sort();

    const usedNames = new Set();
    const lines = [];
    lines.push("// 本文件由 tools/gen-model-list.js 自动生成，请勿手动编辑。");
    lines.push("// 重新生成：  node tools/gen-model-list.js");
    lines.push("window.LIVE2D_MODEL_LIST = [");

    for (const f of files) {
        const rel = path.relative(ROOT, f).replace(/\\/g, "/");
        const name = makeName(rel, usedNames);
        // 路径可能含空格、[]、#、中文等，XHR 需要编码，否则会被截断/404
        const urlPath = encodeURI(rel);
        lines.push(`    { name : ${JSON.stringify(name)}, path : ${JSON.stringify(urlPath)} },`);
    }
    lines.push("];");
    lines.push("");

    fs.writeFileSync(OUT, lines.join("\n"), "utf8");
    console.log(`已生成 ${OUT}`);
    console.log(`共 ${files.length} 个模型。`);
}

main();