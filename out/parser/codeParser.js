"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeParser = void 0;
class CodeParser {
    parse(content) {
        const doc = {
            interfaces: [],
            functions: [],
            comments: []
        };
        // 解析接口定义
        doc.interfaces = this.parseInterfaces(content);
        // 解析函数定义
        doc.functions = this.parseFunctions(content);
        // 提取注释
        doc.comments = this.parseComments(content);
        return doc;
    }
    parseInterfaces(content) {
        const interfaces = [];
        // 匹配 interface Name { ... }
        const interfaceRegex = /interface\s+(\w+)\s*\{([^}]+)\}/g;
        let match;
        while ((match = interfaceRegex.exec(content)) !== null) {
            const name = match[1];
            const body = match[2];
            const fields = [];
            const fieldLines = body.split(';');
            for (const line of fieldLines) {
                const fieldMatch = line.match(/(\w+)\??\s*:\s*(\w+)/);
                if (fieldMatch) {
                    fields.push({
                        name: fieldMatch[1],
                        type: fieldMatch[2]
                    });
                }
            }
            interfaces.push({ name, fields });
        }
        return interfaces;
    }
    parseFunctions(content) {
        const functions = [];
        // 匹配 async function name(params): returnType
        const funcRegex = /(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\w+))?/g;
        let match;
        while ((match = funcRegex.exec(content)) !== null) {
            const name = match[1];
            const paramsStr = match[2] || '';
            const returnType = match[3];
            const params = [];
            if (paramsStr.trim()) {
                const paramPairs = paramsStr.split(',');
                for (const pair of paramPairs) {
                    const paramMatch = pair.match(/(\w+)\??\s*:\s*(\w+)/);
                    if (paramMatch) {
                        params.push({
                            name: paramMatch[1],
                            type: paramMatch[2]
                        });
                    }
                }
            }
            functions.push({
                name,
                params,
                returnType,
                comments: []
            });
        }
        return functions;
    }
    parseComments(content) {
        const comments = [];
        // 匹配 // 注释（去掉 // 前缀）
        const commentRegex = /\/\/\s*(.+)/g;
        let match;
        while ((match = commentRegex.exec(content)) !== null) {
            comments.push(match[1].trim());
        }
        // 匹配 /* */ 多行注释
        const blockCommentRegex = /\/\*[\s\S]*?\*\//g;
        while ((match = blockCommentRegex.exec(content)) !== null) {
            const blockContent = match[0];
            // 提取每行内容（去掉 * 前缀）
            const lines = blockContent.split('\n');
            for (const line of lines) {
                const cleaned = line.replace(/^\s*\/\*/, '')
                    .replace(/^\s*\*\//, '')
                    .replace(/^\s*\*/, '')
                    .trim();
                if (cleaned) {
                    comments.push(cleaned);
                }
            }
        }
        return comments;
    }
}
exports.CodeParser = CodeParser;
//# sourceMappingURL=codeParser.js.map