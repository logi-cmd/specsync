"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecParser = void 0;
const gray_matter_1 = __importDefault(require("gray-matter"));
class SpecParser {
    parse(content) {
        // 解析YAML frontmatter + Markdown
        const parsed = (0, gray_matter_1.default)(content);
        const doc = {
            title: parsed.data.title || '',
            version: parsed.data.version || '',
            apis: this.parseAPIs(parsed.content)
        };
        return doc;
    }
    parseAPIs(content) {
        const apis = [];
        // 简单解析：按## API: 分割
        const apiBlocks = content.split(/## API:\s*/).slice(1);
        for (const block of apiBlocks) {
            const lines = block.trim().split('\n');
            const apiLine = lines[0]?.trim() || '';
            const [method, path] = apiLine.split(' ');
            const api = {
                method: method || 'GET',
                path: path || '/',
                request: [],
                response: [],
                rules: []
            };
            // 解析Request、Response、业务规则
            let currentSection = '';
            for (const line of lines.slice(1)) {
                if (line.includes('### Request')) {
                    currentSection = 'request';
                }
                else if (line.includes('### Response')) {
                    currentSection = 'response';
                }
                else if (line.includes('### 业务规则')) {
                    currentSection = 'rules';
                }
                else if (line.trim().startsWith('- ') && currentSection === 'request') {
                    const field = this.parseField(line);
                    if (field)
                        api.request.push(field);
                }
                else if (line.trim().startsWith('- ') && currentSection === 'response') {
                    const field = this.parseField(line);
                    if (field)
                        api.response.push(field);
                }
                else if ((line.trim().startsWith('- ') || line.trim().match(/^\d+\./)) && currentSection === 'rules') {
                    // 支持 "- 规则" 或 "1. 规则" 格式
                    const ruleText = line.trim().replace(/^-\s*/, '').replace(/^\d+\.\s*/, '');
                    api.rules.push(ruleText);
                }
            }
            apis.push(api);
        }
        return apis;
    }
    parseField(line) {
        // 解析格式：- name: type (constraints)
        const match = line.match(/-\s*(\w+):\s*(\w+)\s*(?:\(([^)]+)\))?/);
        if (!match)
            return null;
        return {
            name: match[1],
            type: match[2],
            constraints: match[3] ? match[3].split(',').map(c => c.trim()) : undefined
        };
    }
}
exports.SpecParser = SpecParser;
//# sourceMappingURL=specParser.js.map