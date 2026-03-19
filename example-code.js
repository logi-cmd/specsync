"use strict";
// 示例TypeScript代码 - 对应example-spec.md中的登录API
// 注意：这里没有实现username长度验证（6-20字符）
// 注意：这里没有实现password复杂度验证（必须包含字母和数字）
// 注意：没有实现token有效期7天的逻辑
async function login(request) {
    // TODO: 验证逻辑缺失
    const token = generateToken(request.username);
    return {
        token,
        expires: Date.now() + 86400000 // 1天，不是7天
    };
}
function generateToken(username) {
    return `token_${username}_${Date.now()}`;
}
// 注册API - 完全缺失实现
// 缺失：register函数
// 缺失：邮箱验证逻辑
//# sourceMappingURL=example-code.js.map