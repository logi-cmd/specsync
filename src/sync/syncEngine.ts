import { CodeApiBinding, CodeDocument, CodeFunction, CodeInterface, CodeValidation } from '../parser/codeParser';
import { SpecAPI, SpecDocument, SpecField } from '../parser/specParser';
import { localize } from '../i18n';

export interface Inconsistency {
    type: 'field_missing' | 'type_mismatch' | 'constraint_missing' | 'api_missing' | 'rule_not_implemented';
    spec: string;
    code: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
}

export interface SyncReport {
    inconsistencies: Inconsistency[];
    summary: {
        total: number;
        high: number;
        medium: number;
        low: number;
    };
}

export class SyncEngine {
    check(spec: SpecDocument, code: CodeDocument): SyncReport {
        const inconsistencies: Inconsistency[] = [];

        for (const api of spec.apis) {
            inconsistencies.push(...this.checkAPI(api, code));
        }

        const summary = {
            total: inconsistencies.length,
            high: inconsistencies.filter(i => i.severity === 'high').length,
            medium: inconsistencies.filter(i => i.severity === 'medium').length,
            low: inconsistencies.filter(i => i.severity === 'low').length
        };

        return { inconsistencies, summary };
    }

    private checkAPI(api: SpecAPI, code: CodeDocument): Inconsistency[] {
        const inconsistencies: Inconsistency[] = [];
        const codeFunc = this.findFunctionForApi(api, code);

        if (!codeFunc) {
            inconsistencies.push({
                type: 'api_missing',
                spec: `${api.method} ${api.path}`,
                code: 'missing',
                severity: 'high',
                message: localize('issue.api.missing', this.inferFunctionName(api.path))
            });
            return inconsistencies;
        }

        const requestShape = this.findPayloadShape(api, code, codeFunc, 'request');
        const responseShape = this.findPayloadShape(api, code, codeFunc, 'response');

        inconsistencies.push(...this.checkFields(api.path, api.request, requestShape, code, codeFunc, localize('label.request')));
        inconsistencies.push(...this.checkFields(api.path, api.response, responseShape, code, codeFunc, localize('label.response')));
        inconsistencies.push(...this.checkRules(api.rules, code, codeFunc));

        return inconsistencies;
    }

    private findFunctionForApi(api: SpecAPI, code: CodeDocument): CodeFunction | undefined {
        const binding = code.apiBindings.find(item => this.bindingMatchesApi(item, api));
        if (binding) {
            return code.functions.find(fn => fn.name === binding.functionName);
        }

        const inferredName = this.inferFunctionName(api.path);
        return code.functions.find(fn => this.normalize(fn.name) === this.normalize(inferredName));
    }

    private bindingMatchesApi(binding: CodeApiBinding, api: SpecAPI): boolean {
        const bindingMethod = binding.method ? this.normalize(binding.method) : undefined;
        const bindingPath = binding.path ? this.normalizePath(binding.path) : undefined;
        return (!bindingMethod || bindingMethod === this.normalize(api.method)) &&
            (!bindingPath || bindingPath === this.normalizePath(api.path));
    }

    private findPayloadShape(
        api: SpecAPI,
        code: CodeDocument,
        codeFunc: CodeFunction,
        kind: 'request' | 'response'
    ): CodeInterface | undefined {
        if (kind === 'request') {
            const requestParam = codeFunc.params[0];
            const directMatch = requestParam
                ? code.interfaces.find(i => this.normalize(i.name) === this.normalize(this.unwrapType(requestParam.type)))
                : undefined;
            if (directMatch) {
                return directMatch;
            }
        }

        if (kind === 'response' && codeFunc.returnType) {
            const directMatch = code.interfaces.find(i =>
                this.normalize(i.name) === this.normalize(this.unwrapType(codeFunc.returnType ?? ''))
            );
            if (directMatch) {
                return directMatch;
            }
        }

        const functionName = this.normalize(this.inferFunctionName(api.path));
        return code.interfaces.find(i => {
            const name = this.normalize(i.name);
            return name.includes(functionName) && name.includes(kind);
        });
    }

    private checkFields(
        apiPath: string,
        specFields: SpecField[],
        payloadShape: CodeInterface | undefined,
        code: CodeDocument,
        codeFunc: CodeFunction,
        label: string
    ): Inconsistency[] {
        const inconsistencies: Inconsistency[] = [];

        for (const specField of specFields) {
            const codeField = payloadShape?.fields.find(field =>
                this.normalize(field.name) === this.normalize(specField.name)
            );

            if (!codeField) {
                inconsistencies.push({
                    type: 'field_missing',
                    spec: `${apiPath} - ${specField.name}`,
                    code: 'missing',
                    severity: 'high',
                    message: localize('issue.field.missing', label, specField.name)
                });
                continue;
            }

            if (!this.typesMatch(specField.type, codeField.type)) {
                inconsistencies.push({
                    type: 'type_mismatch',
                    spec: `${specField.name}: ${specField.type}`,
                    code: `${codeField.name}: ${codeField.type}`,
                    severity: 'medium',
                    message: localize('issue.type.mismatch', specField.name, specField.type, codeField.type)
                });
            }

            for (const constraint of specField.constraints ?? []) {
                if (!this.hasConstraintImplementation(specField, constraint, code, codeFunc)) {
                    inconsistencies.push({
                        type: 'constraint_missing',
                        spec: `${specField.name} (${constraint})`,
                        code: 'no matching validation found',
                        severity: 'medium',
                        message: localize('issue.constraint.missing', specField.name, constraint)
                    });
                }
            }
        }

        return inconsistencies;
    }

    private hasConstraintImplementation(
        specField: SpecField,
        constraint: string,
        code: CodeDocument,
        codeFunc: CodeFunction
    ): boolean {
        const fieldName = this.normalize(specField.name);
        const fieldValidations = code.validations.filter(validation =>
            this.normalize(validation.fieldName ?? '') === fieldName &&
            (!validation.functionName || this.normalize(validation.functionName) === this.normalize(codeFunc.name))
        );

        if (fieldValidations.some(validation => this.validationMatchesConstraint(validation, constraint))) {
            return true;
        }

        return code.comments.some(comment =>
            this.normalize(comment).includes(fieldName) && this.normalize(comment).includes(this.normalize(constraint))
        );
    }

    private validationMatchesConstraint(validation: CodeValidation, constraint: string): boolean {
        const normalized = this.normalize(constraint);
        const rangeMatch = constraint.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
        if (rangeMatch) {
            const min = Number(rangeMatch[1]);
            const max = Number(rangeMatch[2]);

            if (validation.kind === 'length' || validation.kind === 'range') {
                const minMatches = validation.min === undefined || validation.min <= min;
                const maxMatches = validation.max === undefined || validation.max >= max;
                return minMatches && maxMatches;
            }
        }

        if (/必填|不能为空|required/i.test(constraint)) {
            return validation.kind === 'required';
        }

        if (/邮箱|regex|pattern|格式|字母和数字/i.test(constraint)) {
            return validation.kind === 'pattern' || this.normalize(validation.evidence).includes(normalized);
        }

        if (/pending|paid|shipped|completed|enum|取值|可选值/i.test(constraint)) {
            const expected = this.extractEnumValues(constraint);
            if (validation.kind !== 'enum' || expected.length === 0) {
                return false;
            }

            const actual = (validation.values ?? []).map(value => this.normalize(value));
            return expected.every(value => actual.includes(value));
        }

        if (validation.kind === 'pattern') {
            return true;
        }

        return this.normalize(validation.evidence).includes(normalized);
    }

    private checkRules(rules: string[], code: CodeDocument, codeFunc: CodeFunction): Inconsistency[] {
        const inconsistencies: Inconsistency[] = [];
        const normalizedComments = code.comments.map(comment => this.normalize(comment));
        const ruleMarkers = code.rules
            .filter(rule => !rule.functionName || this.normalize(rule.functionName) === this.normalize(codeFunc.name))
            .map(rule => this.normalize(rule.description));

        for (const rule of rules) {
            const normalizedRule = this.normalize(rule);
            const keywords = this.extractRuleKeywords(rule);
            const implemented = ruleMarkers.some(marker => this.ruleMatches(marker, normalizedRule, keywords)) ||
                normalizedComments.some(comment => this.ruleMatches(comment, normalizedRule, keywords));

            if (!implemented) {
                inconsistencies.push({
                    type: 'rule_not_implemented',
                    spec: rule,
                    code: 'no implementation found',
                    severity: 'low',
                    message: localize('issue.rule.missing', rule)
                });
            }
        }

        return inconsistencies;
    }

    private ruleMatches(text: string, normalizedRule: string, keywords: string[]): boolean {
        if (text.includes(normalizedRule)) {
            return true;
        }

        return keywords.length > 0 && keywords.every(keyword => text.includes(keyword));
    }

    private extractRuleKeywords(rule: string): string[] {
        return rule
            .split(/[\s,，、/]+/)
            .map(word => this.normalize(word))
            .filter(word => word.length >= 2)
            .slice(0, 5);
    }

    private inferFunctionName(path: string): string {
        const sanitized = path
            .split('/')
            .filter(Boolean)
            .filter(part => !part.startsWith(':'))
            .pop() ?? 'unknown';
        return sanitized.replace(/[^a-zA-Z0-9_]/g, '');
    }

    private unwrapType(type: string): string {
        const promiseMatch = type.match(/^Promise<(.+)>$/);
        if (promiseMatch) {
            return promiseMatch[1].trim();
        }

        return type.replace(/\[\]$/, '').trim();
    }

    private typesMatch(specType: string, codeType: string): boolean {
        const spec = this.normalizeType(specType);
        const codeNormalized = this.normalizeType(codeType);
        return spec === codeNormalized;
    }

    private normalizeType(type: string): string {
        const normalized = this.normalize(type);
        if (['string', 'str'].includes(normalized)) {
            return 'string';
        }
        if (['number', 'int', 'float', 'double', 'long', 'decimal'].includes(normalized)) {
            return 'number';
        }
        if (['boolean', 'bool'].includes(normalized)) {
            return 'boolean';
        }
        if (normalized === 'enum') {
            return 'string';
        }
        if (normalized.endsWith('[]') || ['array', 'list'].includes(normalized)) {
            return 'array';
        }
        return normalized;
    }

    private normalize(value: string): string {
        return value.toLowerCase().trim();
    }

    private normalizePath(path: string): string {
        return path.replace(/:[^/]+/g, ':param').toLowerCase().trim();
    }

    private extractEnumValues(constraint: string): string[] {
        const match = constraint.match(/\(([^)]+)\)/);
        const source = match?.[1] ?? constraint;
        return source
            .split(/[,\s/]+/)
            .map(item => this.normalize(item))
            .filter(item => item.length > 0 && !item.includes('enum') && !/^\d/.test(item));
    }
}
