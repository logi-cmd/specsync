"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
// 验证 username 长度
async function login(request) {
    if (request.username.length < 6) {
        throw new Error('username too short');
    }
    return {
        token: `token-${request.username}`,
        expiresIn: '86400'
    };
}
exports.login = login;
//# sourceMappingURL=login.js.map