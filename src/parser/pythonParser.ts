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

export class PythonParser implements LanguageParser {
    readonly language = 'python';

    supports(extension: string): boolean {
        return extension === '.py';
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
        const classRegex = /^class\s+(\w+)(?:\([^)]*\))?:\s*\n((?:^[ \t]+.+\n?)*)/gm;
        let match: RegExpExecArray | null;

        while ((match = classRegex.exec(content)) !== null) {
            const [, name, body] = match;
            const fields: CodeField[] = [];
            const fieldRegex = /^[ \t]+(\w+):\s*([^\n=]+)(?:\s*=.+)?$/gm;
            let fieldMatch: RegExpExecArray | null;

            while ((fieldMatch = fieldRegex.exec(body)) !== null) {
                fields.push({
                    name: fieldMatch[1],
                    type: fieldMatch[2].trim(),
                    optional: /Optional\[/.test(fieldMatch[2]) || /\|\s*None/.test(fieldMatch[2])
                });
            }

            if (fields.length > 0) {
                interfaces.push({ name, fields });
            }
        }

        return interfaces;
    }

    private parseFunctions(content: string): CodeFunction[] {
        const functions: CodeFunction[] = [];
        const functionRegex = /((?:@\w+(?:\([^\n]*\))?\s*\n)*)^(async\s+def|def)\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:\n]+))?:/gm;
        let match: RegExpExecArray | null;

        while ((match = functionRegex.exec(content)) !== null) {
            const decoratorsBlock = match[1] ?? '';
            const name = match[3];
            const params = this.parseParams(match[4] ?? '');
            const returnType = match[5]?.trim();
            const decorators = this.parseDecorators(decoratorsBlock);

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

    private parseParams(paramsText: string): CodeField[] {
        return paramsText
            .split(',')
            .map(part => part.trim())
            .filter(Boolean)
            .filter(part => part !== 'self' && part !== 'cls')
            .map(part => {
                const match = part.match(/^(\w+)(?::\s*([^=]+))?/);
                return {
                    name: match?.[1] ?? part,
                    type: match?.[2]?.trim() ?? 'Any',
                    optional: part.includes('=')
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
        const lineRegex = /#\s*(.+)$/gm;
        const docstringRegex = /("""|''')([\s\S]*?)\1/gm;
        let match: RegExpExecArray | null;

        while ((match = lineRegex.exec(content)) !== null) {
            comments.push(match[1].trim());
        }

        while ((match = docstringRegex.exec(content)) !== null) {
            comments.push(match[2].trim());
        }

        return comments;
    }

    private parseValidations(content: string): CodeValidation[] {
        const validations: CodeValidation[] = [];
        const lengthRegex = /if\s+len\(([\w\.]+)\)\s*<\s*(\d+)\s*:/g;
        const maxLengthRegex = /if\s+len\(([\w\.]+)\)\s*>\s*(\d+)\s*:/g;
        const requiredRegex = /if\s+not\s+([\w\.]+)\s*:/g;
        const regexMatch = /if\s+not\s+([A-Z_][A-Z0-9_]*)\.(?:match|search|fullmatch)\(([\w\.]+)\)\s*:/g;
        const enumRegex = /if\s+([\w\.]+)\s+not\s+in\s+\[([^\]]+)\]\s*:/g;

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

        while ((match = maxLengthRegex.exec(content)) !== null) {
            validations.push({
                fieldName: this.lastPathSegment(match[1]),
                kind: 'length',
                source: 'ast',
                max: Number(match[2]),
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

        while ((match = regexMatch.exec(content)) !== null) {
            validations.push({
                fieldName: this.lastPathSegment(match[2]),
                kind: 'pattern',
                source: 'ast',
                pattern: match[1],
                evidence: match[0]
            });
        }

        while ((match = enumRegex.exec(content)) !== null) {
            validations.push({
                fieldName: this.lastPathSegment(match[1]),
                kind: 'enum',
                source: 'ast',
                values: match[2].split(',').map(item => item.trim().replace(/^['"]|['"]$/g, '')),
                evidence: match[0]
            });
        }

        return validations;
    }

    private parseRules(content: string): CodeRule[] {
        const rules: CodeRule[] = [];
        const decoratorRegex = /@Rule\((.+)\)/g;
        let match: RegExpExecArray | null;

        while ((match = decoratorRegex.exec(content)) !== null) {
            rules.push({
                description: match[1].replace(/^['"]|['"]$/g, '').trim(),
                source: 'decorator',
                evidence: match[0]
            });
        }

        return rules;
    }

    private parseApiBindings(functions: CodeFunction[]): CodeApiBinding[] {
        const bindings: CodeApiBinding[] = [];
        for (const fn of functions) {
            const decorator = fn.decorators.find(item => item.name === 'Spec');
            if (!decorator) {
                continue;
            }

            const args = decorator.arguments.map(arg => arg.replace(/^['"]|['"]$/g, ''));
            const [first, second] = args;
            const descriptor = second ? `${first} ${second}` : first;
            const match = descriptor?.match(/^([A-Z]+)\s+(.+)$/);

            bindings.push({
                functionName: fn.name,
                method: match?.[1] ?? first,
                path: match?.[2] ?? second,
                source: 'decorator',
                evidence: `@Spec(${decorator.arguments.join(', ')})`
            });
        }
        return bindings;
    }

    private lastPathSegment(value: string): string {
        const parts = value.split('.');
        return parts[parts.length - 1];
    }
}
