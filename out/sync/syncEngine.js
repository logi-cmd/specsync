"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncEngine = void 0;
class SyncEngine {
    check(spec, code) {
        const inconsistencies = [];
        // 检查每个API
        for (const api of spec.apis) {
            const apiInconsistencies = this.checkAPI(api, code);
            inconsistencies.push(...apiInconsistencies);
        }
        // 计算摘要
        const summary = {
            total: inconsistencies.length,
            high: inconsistencies.filter(i => i.severity === 'high').length,
            medium: inconsistencies.filter(i => i.severity === 'medium').length,
            low: inconsistencies.filter(i => i.severity === 'low').length
        };
        return { inconsistencies, summary };
    }
    checkAPI(api, code) {
        const inconsistencies = [];
        // 查找对应的函数
        const functionName = this.inferFunctionName(api.path);
        const codeFunc = code.functions.find(f => f.name === functionName);
        if (!codeFunc) {
            inconsistencies.push({
                type: 'api_missing',
                spec: `${api.method} ${api.path}`,
                code: 'missing',
                severity: 'high',
                message: `未找到API实现: ${functionName}`
            });
            return inconsistencies;
        }
        // 检查请求字段
        const requestInterface = code.interfaces.find(i => i.name.toLowerCase().includes(functionName.toLowerCase()) &&
            i.name.toLowerCase().includes('request'));
        if (requestInterface) {
            for (const specField of api.request) {
                const codeField = requestInterface.fields.find(f => f.name === specField.name);
                if (!codeField) {
                    inconsistencies.push({
                        type: 'field_missing',
                        spec: `${api.path} - ${specField.name}`,
                        code: 'missing',
                        severity: 'high',
                        message: `请求字段缺失: ${specField.name}`
                    });
                }
                else if (!this.typesMatch(specField.type, codeField.type)) {
                    inconsistencies.push({
                        type: 'type_mismatch',
                        spec: `${specField.name}: ${specField.type}`,
                        code: `${codeField.name}: ${codeField.type}`,
                        severity: 'medium',
                        message: `类型不匹配: ${specField.name} (spec: ${specField.type}, code: ${codeField.type})`
                    });
                }
                // 检查约束
                if (specField.constraints && specField.constraints.length > 0) {
                    const hasConstraint = code.interfaces.some(i => i.fields.some(f => f.name === specField.name));
                    // 简单检查：是否有对应的验证逻辑（通过注释判断）
                    const hasValidationComment = code.comments.some(c => c.toLowerCase().includes('验证') &&
                        c.toLowerCase().includes(specField.name.toLowerCase()));
                    if (!hasValidationComment) {
                        inconsistencies.push({
                            type: 'constraint_missing',
                            spec: `${specField.name} (${specField.constraints.join(', ')})`,
                            code: 'no validation found',
                            severity: 'medium',
                            message: `字段约束未实现: ${specField.name} (${specField.constraints.join(', ')})`
                        });
                    }
                }
            }
        }
        // 检查业务规则实现
        for (const rule of api.rules) {
            const hasRuleComment = code.comments.some(c => c.toLowerCase().includes(rule.toLowerCase().substring(0, 10)));
            if (!hasRuleComment) {
                inconsistencies.push({
                    type: 'rule_not_implemented',
                    spec: rule,
                    code: 'no implementation found',
                    severity: 'low',
                    message: `业务规则可能未实现: ${rule}`
                });
            }
        }
        return inconsistencies;
    }
    inferFunctionName(path) {
        // 简单推断：/api/login -> login
        const parts = path.split('/');
        return parts[parts.length - 1] || 'unknown';
    }
    typesMatch(specType, codeType) {
        // 简化匹配逻辑
        const normalize = (t) => t.toLowerCase().trim();
        return normalize(specType) === normalize(codeType);
    }
}
exports.SyncEngine = SyncEngine;
//# sourceMappingURL=syncEngine.js.map