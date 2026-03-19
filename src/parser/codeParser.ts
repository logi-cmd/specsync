export interface CodeField {
    name: string;
    type: string;
}

export interface CodeFunction {
    name: string;
    params: CodeField[];
    returnType?: string;
    comments: string[];
}

export interface CodeInterface {
    name: string;
    fields: CodeField[];
}

export interface CodeDocument {
    interfaces: CodeInterface[];
    functions: CodeFunction[];
    comments: string[];
}

export class CodeParser {
    parse(content: string): CodeDocument {
        const doc: CodeDocument = {
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

    private parseInterfaces(content: string): CodeInterface[] {
        const interfaces: CodeInterface[] = [];
        
        // 匹配 interface Name { ... }
        const interfaceRegex = /interface\s+(\w+)\s*\{([^}]+)\}/g;
        let match;
        
        while ((match = interfaceRegex.exec(content)) !== null) {
            const name = match[1];
            const body = match[2];
            
            const fields: CodeField[] = [];
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

    private parseFunctions(content: string): CodeFunction[] {
        const functions: CodeFunction[] = [];
        
        // 匹配 async function name(params): returnType
        const funcRegex = /(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\w+))?/g;
        let match;
        
        while ((match = funcRegex.exec(content)) !== null) {
            const name = match[1];
            const paramsStr = match[2] || '';
            const returnType = match[3];
            
            const params: CodeField[] = [];
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

    private parseComments(content: string): string[] {
        const comments: string[] = [];
        
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
