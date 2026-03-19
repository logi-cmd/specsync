export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    expiresIn: string;
}

// 验证 username 长度
export async function login(request: LoginRequest): Promise<LoginResponse> {
    if (request.username.length < 6) {
        throw new Error('username too short');
    }

    return {
        token: `token-${request.username}`,
        expiresIn: '86400'
    };
}
