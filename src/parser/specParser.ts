import matter from 'gray-matter';

export interface SpecField {
    name: string;
    type: string;
    constraints?: string[];
}

export interface SpecAPI {
    method: string;
    path: string;
    request: SpecField[];
    response: SpecField[];
    rules: string[];
}

export interface SpecDocument {
    title: string;
    version: string;
    apis: SpecAPI[];
}

export class SpecParser {
    parse(content: string): SpecDocument {
        // 解析YAML frontmatter + Markdown
        const parsed = matter(content);
        
        const doc: SpecDocument = {
            title: parsed.data.title || '',
            version: parsed.data.version || '',
            apis: this.parseAPIs(parsed.content)
        };

        return doc;
    }

    private parseAPIs(content: string): SpecAPI[] {
        const apis: SpecAPI[] = [];
        
        // 简单解析：按## API: 分割
        const apiBlocks = content.split(/## API:\s*/).slice(1);
        
        for (const block of apiBlocks) {
            const lines = block.trim().split('\n');
            const apiLine = lines[0]?.trim() || '';
            const [method, path] = apiLine.split(' ');
            
            const api: SpecAPI = {
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
                } else if (line.includes('### Response')) {
                    currentSection = 'response';
                } else if (line.includes('### 业务规则')) {
                    currentSection = 'rules';
                } else if (line.trim().startsWith('- ') && currentSection === 'request') {
                    const field = this.parseField(line);
                    if (field) api.request.push(field);
                } else if (line.trim().startsWith('- ') && currentSection === 'response') {
                    const field = this.parseField(line);
                    if (field) api.response.push(field);
                } else if ((line.trim().startsWith('- ') || line.trim().match(/^\d+\./)) && currentSection === 'rules') {
                    // 支持 "- 规则" 或 "1. 规则" 格式
                    const ruleText = line.trim().replace(/^-\s*/, '').replace(/^\d+\.\s*/, '');
                    api.rules.push(ruleText);
                }
            }

            apis.push(api);
        }

        return apis;
    }

    private parseField(line: string): SpecField | null {
        // 解析格式：- name: type (constraints)
        const match = line.match(/-\s*(\w+):\s*(\w+)\s*(?:\(([^)]+)\))?/);
        if (!match) return null;

        return {
            name: match[1],
            type: match[2],
            constraints: match[3] ? match[3].split(',').map(c => c.trim()) : undefined
        };
    }
}
