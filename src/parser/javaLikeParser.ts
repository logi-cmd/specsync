import {
    CodeApiBinding,
    CodeDecoratorMeta,
    CodeDocument,
    CodeField,
    CodeFunction,
    CodeInterface,
    CodeRule,
    CodeValidation,
    LanguageParser
} from './codeParser';

const SUPPORTED_EXTENSIONS = new Set(['.java', '.kt', '.kts']);

export class JavaLikeParser implements LanguageParser {
    readonly language = 'jvm';

    supports(extension: string): boolean {
        return SUPPORTED_EXTENSIONS.has(extension);
    }

    parse(content: string): CodeDocument {
        const interfaces = this.parseClasses(content);
        const functions = this.parseFunctions(content);
        const comments = this.parseComments(content);
        const validations = this.parseValidations(content);
        const rules = this.parseRules(content);
        const apiBindings = this.parseApiBindings(functions);

        return {
            language: this.language,
            interfaces,
            functions,
            comments,
            validations,
            rules,
            apiBindings
        };
    }

    private parseClasses(content: string): CodeInterface[] {
        const interfaces: CodeInterface[] = [];
        
        // 匹配带大括号的 class/data class
        const classRegex = /(class|data class)\s+(\w+)[^{]*\{([\s\S]*?)\}/gm;
        let match: RegExpExecArray | null;

        while ((match = classRegex.exec(content)) !== null) {
            const body = match[3];
            const fields = this.extractFields(body);

            if (fields.length > 0) {
                interfaces.push({ name: match[2], fields });
            }
        }
        
        // 匹配 Kotlin data class 构造函数参数格式：data class User(val name: String)
        const dataClassRegex = /data\s+class\s+(\w+)\s*\(([^)]*)\)/gm;
        while ((match = dataClassRegex.exec(content)) !== null) {
            const className = match[1];
            const params = match[2];
            const fields = this.parseKotlinConstructorParams(params);
            
            if (fields.length > 0 && !interfaces.some(i => i.name === className)) {
                interfaces.push({ name: className, fields });
            }
        }

        return interfaces;
    }
    
    private extractFields(body: string): CodeField[] {
        const fields: CodeField[] = [];
        const javaFieldRegex = /(private|public|protected)?\s*([\w<>,.?]+)\s+(\w+)\s*;/g;
        const kotlinFieldRegex = /\b(val|var)\s+(\w+)\s*:\s*([\w<>,.?]+)/g;
        let fieldMatch: RegExpExecArray | null;

        while ((fieldMatch = javaFieldRegex.exec(body)) !== null) {
            fields.push({ name: fieldMatch[3], type: fieldMatch[2] });
        }

        while ((fieldMatch = kotlinFieldRegex.exec(body)) !== null) {
            fields.push({ name: fieldMatch[2], type: fieldMatch[3] });
        }
        
        return fields;
    }
    
    private parseKotlinConstructorParams(params: string): CodeField[] {
        const fields: CodeField[] = [];
        // 匹配 val/var name: Type
        const paramRegex = /\b(val|var)?\s*(\w+)\s*:\s*([\w<>,.?]+)/g;
        let match: RegExpExecArray | null;
        
        while ((match = paramRegex.exec(params)) !== null) {
            fields.push({ name: match[2], type: match[3] });
        }
        
        return fields;
    }

    private parseFunctions(content: string): CodeFunction[] {
        const functions: CodeFunction[] = [];
        const regex = /((?:@\w+(?:\([^\n]*\))?\s*\n|\/\*\*[\s\S]*?\*\/\s*)*)(?:public|private|protected|suspend|static|\s)*\s*(?:fun\s+|([\w<>,.?]+)\s+)(\w+)\s*\(([^)]*)\)\s*(?::\s*([\w<>,.?]+))?/gm;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(content)) !== null) {
            const decorators = this.parseDecorators(match[1] ?? '');
            const name = match[3];
            const params = this.parseParams(match[4] ?? '');
            const returnType = match[5]?.trim() ?? match[2]?.trim();

            functions.push({
                name,
                params,
                returnType,
                comments: [],
                decorators
            });
        }

        return functions;
    }

    private parseParams(text: string): CodeField[] {
        return text
            .split(',')
            .map(part => part.trim())
            .filter(Boolean)
            .map(part => {
                const kotlinMatch = part.match(/^(\w+)\s*:\s*([\w<>,.?]+)/);
                if (kotlinMatch) {
                    return { name: kotlinMatch[1], type: kotlinMatch[2] };
                }

                const javaMatch = part.match(/^([\w<>,.?]+)\s+(\w+)$/);
                return {
                    name: javaMatch?.[2] ?? part,
                    type: javaMatch?.[1] ?? 'Object'
                };
            });
    }

    private parseDecorators(block: string): CodeDecoratorMeta[] {
        return block
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.startsWith('@'))
            .map(line => {
                const match = line.match(/^@(\w+)(?:\((.*)\))?$/);
                const args = match?.[2]
                    ? match[2].split(',').map(arg => arg.trim()).filter(Boolean)
                    : [];
                return {
                    name: match?.[1] ?? line.slice(1),
                    arguments: args
                };
            });
    }

    private parseComments(content: string): string[] {
        const comments: string[] = [];
        const lineRegex = /\/\/\s*(.+)$/gm;
        const blockRegex = /\/\*\*?([\s\S]*?)\*\//gm;
        let match: RegExpExecArray | null;

        while ((match = lineRegex.exec(content)) !== null) {
            comments.push(match[1].trim());
        }

        while ((match = blockRegex.exec(content)) !== null) {
            comments.push(
                match[1]
                    .split(/\r?\n/)
                    .map(line => line.replace(/^\s*\*\s?/, '').trim())
                    .filter(Boolean)
                    .join(' ')
            );
        }

        return comments;
    }

    private parseValidations(content: string): CodeValidation[] {
        const validations: CodeValidation[] = [];
        const lengthRegex = /if\s*\(\s*([\w.]+)\.length\(\)?\s*<\s*(\d+)\s*\)/g;
        const requiredRegex = /if\s*\(\s*([\w.]+)\s*==\s*null\s*\|\|\s*\1\.isEmpty\(\)\s*\)/g;
        const regexValidation = /if\s*\(\s*!?Pattern\.matches\(([^,]+),\s*([\w.]+)\)\s*\)/g;
        const enumValidation = /if\s*\(\s*!?listOf\(([^)]+)\)\.contains\(([\w.]+)\)\s*\)/g;
        let match: RegExpExecArray | null;

        while ((match = lengthRegex.exec(content)) !== null) {
            validations.push({
                fieldName: this.lastPathSegment(match[1]),
                kind: 'length',
                source: 'ast',
                min: Number(match[2]),
                evidence: match[0]
            });
        }

        while ((match = requiredRegex.exec(content)) !== null) {
            validations.push({
                fieldName: this.lastPathSegment(match[1]),
                kind: 'required',
                source: 'ast',
                evidence: match[0]
            });
        }

        while ((match = regexValidation.exec(content)) !== null) {
            validations.push({
                fieldName: this.lastPathSegment(match[2]),
                kind: 'pattern',
                source: 'ast',
                pattern: match[1].trim(),
                evidence: match[0]
            });
        }

        while ((match = enumValidation.exec(content)) !== null) {
            validations.push({
                fieldName: this.lastPathSegment(match[2]),
                kind: 'enum',
                source: 'ast',
                values: match[1].split(',').map(item => item.trim().replace(/^['"]|['"]$/g, '')),
                evidence: match[0]
            });
        }

        return validations;
    }

    private parseRules(content: string): CodeRule[] {
        const rules: CodeRule[] = [];
        const ruleRegex = /@Rule\((.+)\)/g;
        let match: RegExpExecArray | null;

        while ((match = ruleRegex.exec(content)) !== null) {
            rules.push({
                description: match[1].replace(/^['"]|['"]$/g, '').trim(),
                source: 'annotation',
                evidence: match[0]
            });
        }

        return rules;
    }

    private parseApiBindings(functions: CodeFunction[]): CodeApiBinding[] {
        const bindings: CodeApiBinding[] = [];

        for (const fn of functions) {
            const spec = fn.decorators.find(item => item.name === 'Spec');
            if (!spec) {
                continue;
            }

            const args = spec.arguments.map(arg => arg.replace(/^['"]|['"]$/g, ''));
            const combined = args.join(' ');
            const method = this.extractNamedArg(args, 'method') ?? combined.match(/\b(GET|POST|PUT|DELETE|PATCH)\b/)?.[1];
            const path = this.extractNamedArg(args, 'path') ?? combined.match(/\/[A-Za-z0-9_:\-\/]+/)?.[0];

            bindings.push({
                functionName: fn.name,
                method,
                path,
                source: 'annotation',
                evidence: `@Spec(${spec.arguments.join(', ')})`
            });
        }

        return bindings;
    }

    private extractNamedArg(args: string[], key: string): string | undefined {
        for (const arg of args) {
            const match = arg.match(new RegExp(`${key}\\s*=\\s*['"]([^'"]+)['"]`));
            if (match) {
                return match[1];
            }
        }
        return undefined;
    }

    private lastPathSegment(value: string): string {
        const parts = value.split('.');
        return parts[parts.length - 1];
    }
}
