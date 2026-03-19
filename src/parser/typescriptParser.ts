import * as ts from 'typescript';
import {
    CodeApiBinding,
    CodeDecoratorMeta,
    CodeDocument,
    CodeFunction,
    CodeInterface,
    CodeRule,
    CodeValidation,
    LanguageParser
} from './codeParser';

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

export class TypeScriptParser implements LanguageParser {
    readonly language = 'typescript';

    supports(extension: string): boolean {
        return SUPPORTED_EXTENSIONS.has(extension);
    }

    parse(content: string, filePath = 'inline.ts'): CodeDocument {
        const sourceFile = ts.createSourceFile(
            filePath,
            content,
            ts.ScriptTarget.Latest,
            true,
            this.resolveScriptKind(filePath)
        );

        const interfaces: CodeInterface[] = [];
        const functions: CodeFunction[] = [];
        const comments = this.collectComments(sourceFile, content);
        const validations: CodeValidation[] = [];
        const rules: CodeRule[] = [];
        const apiBindings: CodeApiBinding[] = [];

        const visit = (node: ts.Node) => {
            if (ts.isInterfaceDeclaration(node)) {
                interfaces.push(this.parseInterface(node));
            } else if (ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type)) {
                interfaces.push(this.parseTypeAlias(node));
            } else if (ts.isClassDeclaration(node) && node.name) {
                interfaces.push(this.parseClass(node));
                this.parseClassMembers(node, functions, validations, rules, apiBindings);
            } else if (ts.isFunctionDeclaration(node) && node.name) {
                const fn = this.parseFunction(node, sourceFile, content);
                functions.push(fn);
                validations.push(...this.collectFunctionValidations(node, fn.name));
                rules.push(...this.collectRuleDecorators(fn.decorators, fn.name));
                const apiBinding = this.collectApiBinding(fn.decorators, fn.name);
                if (apiBinding) {
                    apiBindings.push(apiBinding);
                }
            }

            ts.forEachChild(node, visit);
        };

        visit(sourceFile);

        const annotationMap = this.collectStandaloneAnnotations(content);
        for (const fn of functions) {
            const annotatedDecorators = annotationMap.get(fn.name);
            if (!annotatedDecorators) {
                continue;
            }

            fn.decorators = this.mergeDecorators([...fn.decorators, ...annotatedDecorators]);
            validations.push(...this.collectValidateDecorators(annotatedDecorators, fn.name));
            rules.push(...this.collectRuleDecorators(annotatedDecorators, fn.name));

            const apiBinding = this.collectApiBinding(annotatedDecorators, fn.name);
            if (apiBinding) {
                apiBindings.push(apiBinding);
            }
        }

        return {
            language: this.language,
            interfaces,
            functions,
            comments,
            validations: this.deduplicateValidations(validations),
            rules: this.deduplicateRules(rules),
            apiBindings: this.deduplicateBindings(apiBindings)
        };
    }

    private resolveScriptKind(filePath: string): ts.ScriptKind {
        if (filePath.endsWith('.tsx')) {
            return ts.ScriptKind.TSX;
        }
        if (filePath.endsWith('.jsx')) {
            return ts.ScriptKind.JSX;
        }
        if (filePath.endsWith('.js')) {
            return ts.ScriptKind.JS;
        }
        return ts.ScriptKind.TS;
    }

    private parseInterface(node: ts.InterfaceDeclaration): CodeInterface {
        return {
            name: node.name.text,
            fields: node.members
                .filter(ts.isPropertySignature)
                .map(member => ({
                    name: this.propertyName(member.name),
                    type: member.type ? member.type.getText() : 'any',
                    optional: Boolean(member.questionToken)
                }))
        };
    }

    private parseTypeAlias(node: ts.TypeAliasDeclaration): CodeInterface {
        const typeLiteral = node.type as ts.TypeLiteralNode;
        return {
            name: node.name.text,
            fields: typeLiteral.members
                .filter(ts.isPropertySignature)
                .map(member => ({
                    name: this.propertyName(member.name),
                    type: member.type ? member.type.getText() : 'any',
                    optional: Boolean(member.questionToken)
                }))
        };
    }

    private parseClass(node: ts.ClassDeclaration): CodeInterface {
        return {
            name: node.name?.text ?? 'AnonymousClass',
            fields: node.members
                .filter(ts.isPropertyDeclaration)
                .filter(member => member.name !== undefined)
                .map(member => ({
                    name: this.propertyName(member.name),
                    type: member.type ? member.type.getText() : 'any',
                    optional: Boolean(member.questionToken)
                }))
        };
    }

    private parseClassMembers(
        node: ts.ClassDeclaration,
        functions: CodeFunction[],
        validations: CodeValidation[],
        rules: CodeRule[],
        apiBindings: CodeApiBinding[]
    ): void {
        for (const member of node.members) {
            if (!ts.isMethodDeclaration(member) || !member.name) {
                continue;
            }

            const fn = this.parseFunction(member, node.getSourceFile(), node.getSourceFile().getFullText());
            functions.push(fn);
            validations.push(...this.collectFunctionValidations(member, fn.name));
            rules.push(...this.collectRuleDecorators(fn.decorators, fn.name));

            const apiBinding = this.collectApiBinding(fn.decorators, fn.name);
            if (apiBinding) {
                apiBindings.push(apiBinding);
            }
        }
    }

    private parseFunction(
        node: ts.FunctionLikeDeclarationBase & { name?: ts.PropertyName | ts.BindingName },
        sourceFile: ts.SourceFile,
        content: string
    ): CodeFunction {
        const nameNode = node.name;
        const name = nameNode && (ts.isIdentifier(nameNode) || ts.isStringLiteral(nameNode))
            ? nameNode.text
            : 'anonymous';

        return {
            name,
            params: node.parameters.map(parameter => ({
                name: parameter.name.getText(sourceFile),
                type: parameter.type ? parameter.type.getText(sourceFile) : 'any',
                optional: Boolean(parameter.questionToken || parameter.initializer)
            })),
            returnType: node.type ? node.type.getText(sourceFile) : undefined,
            comments: this.collectNodeComments(node, content),
            decorators: this.collectDecorators(node, content)
        };
    }

    private collectComments(sourceFile: ts.SourceFile, content: string): string[] {
        const comments: string[] = [];
        const seen = new Set<string>();

        const visit = (node: ts.Node) => {
            for (const range of ts.getLeadingCommentRanges(content, node.getFullStart()) ?? []) {
                const cleaned = this.cleanComment(content.slice(range.pos, range.end));
                if (cleaned && !seen.has(cleaned)) {
                    comments.push(cleaned);
                    seen.add(cleaned);
                }
            }

            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        return comments;
    }

    private collectNodeComments(node: ts.Node, content: string): string[] {
        const comments: string[] = [];
        for (const range of ts.getLeadingCommentRanges(content, node.getFullStart()) ?? []) {
            const cleaned = this.cleanComment(content.slice(range.pos, range.end));
            if (cleaned) {
                comments.push(cleaned);
            }
        }
        return comments;
    }

    private cleanComment(text: string): string {
        return text
            .replace(/^\/\//gm, '')
            .replace(/^\/\*/gm, '')
            .replace(/\*\/$/gm, '')
            .replace(/^\s*\*\s?/gm, '')
            .trim();
    }

    private collectDecorators(node: ts.Node, content?: string): CodeDecoratorMeta[] {
        const decorators = (ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : []).map(decorator => {
            const expression = decorator.expression;
            if (ts.isCallExpression(expression)) {
                return {
                    name: expression.expression.getText(),
                    arguments: expression.arguments.map(argument => this.literalText(argument))
                };
            }

            return {
                name: expression.getText(),
                arguments: []
            };
        });

        const pseudoDecorators = content ? this.collectPseudoDecorators(node, content) : [];
        return this.mergeDecorators([...decorators, ...pseudoDecorators]);
    }

    private collectApiBinding(decorators: CodeDecoratorMeta[], functionName: string): CodeApiBinding | undefined {
        const specDecorator = decorators.find(decorator => decorator.name === 'Spec');
        if (!specDecorator) {
            return undefined;
        }

        const parsed = this.parseSpecDecorator(specDecorator.arguments);
        return {
            functionName,
            method: parsed.method,
            path: parsed.path,
            source: 'decorator',
            evidence: `@Spec(${specDecorator.arguments.join(', ')})`
        };
    }

    private parseSpecDecorator(args: string[]): { method?: string; path?: string } {
        if (args.length === 0) {
            return {};
        }

        if (args[0].startsWith('{')) {
            return {
                method: this.extractNamedArgument(args[0], 'method'),
                path: this.extractNamedArgument(args[0], 'path')
            };
        }

        if (args.length >= 2) {
            return {
                method: this.stripQuotes(args[0]),
                path: this.stripQuotes(args[1])
            };
        }

        const descriptor = this.stripQuotes(args[0]);
        const match = descriptor.match(/^([A-Z]+)\s+(.+)$/);
        if (match) {
            return { method: match[1], path: match[2] };
        }

        return { path: descriptor };
    }

    private collectRuleDecorators(decorators: CodeDecoratorMeta[], functionName: string): CodeRule[] {
        return decorators
            .filter(decorator => decorator.name === 'Rule')
            .map(decorator => ({
                description: decorator.arguments.map(argument => this.stripQuotes(argument)).join(' ').trim(),
                source: 'decorator' as const,
                functionName,
                evidence: `@Rule(${decorator.arguments.join(', ')})`
            }))
            .filter(rule => rule.description.length > 0);
    }

    private collectFunctionValidations(node: ts.FunctionLikeDeclarationBase, functionName: string): CodeValidation[] {
        const validations: CodeValidation[] = [];
        validations.push(...this.collectValidateDecorators(this.collectDecorators(node, node.getSourceFile().getFullText()), functionName));

        const visit = (child: ts.Node) => {
            if (ts.isIfStatement(child)) {
                validations.push(...this.analyzeCondition(child.expression, functionName));
            }
            ts.forEachChild(child, visit);
        };

        if (node.body) {
            ts.forEachChild(node.body, visit);
        }

        return this.deduplicateValidations(validations);
    }

    private collectValidateDecorators(decorators: CodeDecoratorMeta[], functionName: string): CodeValidation[] {
        return decorators
            .filter(decorator => decorator.name === 'Validate')
            .map(decorator => this.parseValidateDecorator(decorator, functionName))
            .filter((validation): validation is CodeValidation => validation !== undefined);
    }

    private parseValidateDecorator(decorator: CodeDecoratorMeta, functionName: string): CodeValidation | undefined {
        const [fieldArg, ruleArg, extraArg] = decorator.arguments;
        const fieldName = fieldArg ? this.stripQuotes(fieldArg) : undefined;
        const ruleText = [ruleArg, extraArg].filter(Boolean).map(arg => this.stripQuotes(arg)).join(' ').trim();
        if (!ruleText) {
            return fieldName ? {
                fieldName,
                kind: 'custom',
                source: 'decorator',
                functionName,
                evidence: `@Validate(${decorator.arguments.join(', ')})`
            } : undefined;
        }

        return {
            ...this.parseConstraintText(fieldName, ruleText),
            source: 'decorator',
            functionName,
            evidence: `@Validate(${decorator.arguments.join(', ')})`
        };
    }

    private analyzeCondition(expression: ts.Expression, functionName: string): CodeValidation[] {
        if (ts.isPrefixUnaryExpression(expression) && expression.operator === ts.SyntaxKind.ExclamationToken) {
            if (ts.isCallExpression(expression.operand)) {
                const regexValidation = this.parseRegexValidation(expression.operand, functionName);
                if (regexValidation) {
                    return [regexValidation];
                }

                const enumValidation = this.parseEnumValidation(expression.operand, functionName);
                if (enumValidation) {
                    return [enumValidation];
                }
            }

            const fieldName = this.extractFieldName(expression.operand);
            if (fieldName) {
                return [{
                    fieldName,
                    kind: 'required',
                    source: 'ast',
                    functionName,
                    evidence: expression.getText()
                }];
            }
        }

        if (ts.isBinaryExpression(expression)) {
            if (expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
                expression.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
                return [
                    ...this.analyzeCondition(expression.left, functionName),
                    ...this.analyzeCondition(expression.right, functionName)
                ];
            }

            const validation = this.parseLengthOrRangeValidation(expression, functionName);
            if (validation) {
                return [validation];
            }
        }

        if (ts.isCallExpression(expression)) {
            const regexValidation = this.parseRegexValidation(expression, functionName);
            if (regexValidation) {
                return [regexValidation];
            }

            const enumValidation = this.parseEnumValidation(expression, functionName);
            if (enumValidation) {
                return [enumValidation];
            }
        }

        return [];
    }

    private parseLengthOrRangeValidation(expression: ts.BinaryExpression, functionName: string): CodeValidation | undefined {
        const operator = expression.operatorToken.kind;
        const leftNumber = this.extractNumericLiteral(expression.left);
        const rightNumber = this.extractNumericLiteral(expression.right);
        const numericValue = leftNumber ?? rightNumber;

        if (numericValue === undefined) {
            return undefined;
        }

        const inspectedNode = leftNumber === undefined ? expression.left : expression.right;
        const fieldName = this.extractFieldName(inspectedNode);
        if (!fieldName) {
            return undefined;
        }

        const isLength = inspectedNode.getText().includes('.length');
        const isMinimum = operator === ts.SyntaxKind.LessThanToken || operator === ts.SyntaxKind.LessThanEqualsToken;
        const isMaximum = operator === ts.SyntaxKind.GreaterThanToken || operator === ts.SyntaxKind.GreaterThanEqualsToken;
        if (!isMinimum && !isMaximum) {
            return undefined;
        }

        const delta = operator === ts.SyntaxKind.LessThanEqualsToken || operator === ts.SyntaxKind.GreaterThanEqualsToken ? 1 : 0;
        return {
            fieldName,
            kind: isLength ? 'length' : 'range',
            source: 'ast',
            functionName,
            min: isMinimum ? numericValue + delta : undefined,
            max: isMaximum ? numericValue - delta : undefined,
            evidence: expression.getText()
        };
    }

    private parseRegexValidation(call: ts.CallExpression, functionName: string): CodeValidation | undefined {
        const expression = call.expression;
        if (!ts.isPropertyAccessExpression(expression) || expression.name.text !== 'test') {
            return undefined;
        }

        const fieldName = this.extractFieldName(call.arguments[0]);
        if (!fieldName) {
            return undefined;
        }

        return {
            fieldName,
            kind: 'pattern',
            source: 'ast',
            functionName,
            pattern: expression.expression.getText(),
            evidence: call.getText()
        };
    }

    private parseEnumValidation(call: ts.CallExpression, functionName: string): CodeValidation | undefined {
        const expression = call.expression;
        if (!ts.isPropertyAccessExpression(expression) || expression.name.text !== 'includes') {
            return undefined;
        }

        const target = expression.expression;
        if (!ts.isArrayLiteralExpression(target)) {
            return undefined;
        }

        const fieldName = this.extractFieldName(call.arguments[0]);
        if (!fieldName) {
            return undefined;
        }

        return {
            fieldName,
            kind: 'enum',
            source: 'ast',
            functionName,
            values: target.elements.map(element => this.stripQuotes(element.getText())),
            evidence: call.getText()
        };
    }

    private deduplicateValidations(validations: CodeValidation[]): CodeValidation[] {
        const seen = new Set<string>();
        return validations.filter(validation => {
            const key = [
                validation.functionName ?? '',
                validation.fieldName ?? '',
                validation.kind,
                validation.min ?? '',
                validation.max ?? '',
                validation.pattern ?? '',
                (validation.values ?? []).join('|'),
                validation.evidence
            ].join(':');

            if (seen.has(key)) {
                return false;
            }

            seen.add(key);
            return true;
        });
    }

    private collectPseudoDecorators(node: ts.Node, content: string): CodeDecoratorMeta[] {
        const snippet = content.slice(node.getFullStart(), node.getStart());
        return this.parseDecoratorLines(snippet);
    }

    private parseDecoratorLines(snippet: string): CodeDecoratorMeta[] {
        const lines = snippet
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean)
            .filter(line => line.startsWith('@'));

        return lines.map(line => {
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

    private mergeDecorators(decorators: CodeDecoratorMeta[]): CodeDecoratorMeta[] {
        const seen = new Set<string>();
        return decorators.filter(decorator => {
            const key = `${decorator.name}:${decorator.arguments.join(',')}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    private collectStandaloneAnnotations(content: string): Map<string, CodeDecoratorMeta[]> {
        const annotations = new Map<string, CodeDecoratorMeta[]>();
        const regex = /((?:^\s*@\w+(?:\([^\n]*\))?\s*\r?\n)+)^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/gm;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(content)) !== null) {
            annotations.set(match[2], this.parseDecoratorLines(match[1]));
        }

        return annotations;
    }

    private deduplicateRules(rules: CodeRule[]): CodeRule[] {
        const seen = new Set<string>();
        return rules.filter(rule => {
            const key = `${rule.functionName ?? ''}:${rule.description}:${rule.evidence}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    private deduplicateBindings(bindings: CodeApiBinding[]): CodeApiBinding[] {
        const seen = new Set<string>();
        return bindings.filter(binding => {
            const key = `${binding.functionName}:${binding.method ?? ''}:${binding.path ?? ''}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    private parseConstraintText(fieldName: string | undefined, text: string): Omit<CodeValidation, 'source' | 'functionName' | 'evidence'> {
        const rangeMatch = text.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
        if (rangeMatch) {
            const min = Number(rangeMatch[1]);
            const max = Number(rangeMatch[2]);
            return {
                fieldName,
                kind: /字符|length|len/i.test(text) ? 'length' : 'range',
                min,
                max
            };
        }

        const enumMatch = text.match(/(?:enum|可选值|取值)\s*[:：]?\s*(.+)/i);
        if (enumMatch) {
            return {
                fieldName,
                kind: 'enum',
                values: enumMatch[1].split(/[,\s/]+/).map(item => item.trim()).filter(Boolean)
            };
        }

        if (/正则|regex|pattern|邮箱格式/i.test(text)) {
            return {
                fieldName,
                kind: 'pattern',
                pattern: text
            };
        }

        if (/必填|不能为空|required/i.test(text)) {
            return {
                fieldName,
                kind: 'required'
            };
        }

        return {
            fieldName,
            kind: 'custom'
        };
    }

    private extractNamedArgument(objectLiteralText: string, key: string): string | undefined {
        const match = objectLiteralText.match(new RegExp(`${key}\\s*:\\s*['"\`]([^'"\`]+)['"\`]`));
        return match?.[1];
    }

    private propertyName(name: ts.PropertyName): string {
        if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
            return name.text;
        }
        return name.getText();
    }

    private extractFieldName(node: ts.Node | undefined): string | undefined {
        if (!node) {
            return undefined;
        }

        if (ts.isPropertyAccessExpression(node)) {
            const nested = this.extractFieldName(node.expression);
            return node.name.text === 'length' ? nested : node.name.text;
        }

        if (ts.isIdentifier(node)) {
            return node.text;
        }

        if (ts.isCallExpression(node) && node.arguments.length > 0) {
            return this.extractFieldName(node.arguments[0]);
        }

        return undefined;
    }

    private extractNumericLiteral(node: ts.Expression): number | undefined {
        if (ts.isNumericLiteral(node)) {
            return Number(node.text);
        }
        if (ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand)) {
            return node.operator === ts.SyntaxKind.MinusToken ? -Number(node.operand.text) : Number(node.operand.text);
        }
        return undefined;
    }

    private literalText(node: ts.Expression): string {
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
            return JSON.stringify(node.text);
        }
        return node.getText();
    }

    private stripQuotes(value: string): string {
        return value.replace(/^['"`]/, '').replace(/['"`]$/, '');
    }
}
