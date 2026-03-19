// User Management API - 故意留有不一致用于测试

interface User {
    id: string;
    name: string;
    email: string;
    age?: number;
    role: 'admin' | 'user' | 'guest';
    createdAt: string;
}

interface CreateUserRequest {
    name: string;
    email: string;
    age?: number;
    role?: string;  // 问题1: 应该是 enum，但这里是 string
}

// 问题2: 缺少 GET /api/users 的实现

// POST /api/users
@Spec('POST', '/api/users')
@Rule('Email must be unique')
async function createUser(request: CreateUserRequest): Promise<User> {
    // 问题3: 缺少 name 长度验证 (2-50 characters)
    // 问题4: 缺少 email 格式验证
    
    if (!request.email) {
        throw new Error('Email required');
    }
    
    // 问题5: 缺少 role 验证 (应该是 enum)
    
    return {
        id: '123',
        name: request.name,
        email: request.email,
        role: (request.role as any) || 'user',
        createdAt: new Date().toISOString()
    };
}

// DELETE /api/users/:id
// 问题6: 缺少 @Spec 装饰器
async function deleteUser(userId: string): Promise<{success: boolean}> {
    // 问题7: 缺少权限验证（不能删除自己等）
    return { success: true };
}

// 问题8: 缺少接口中的 total 字段返回类型定义
