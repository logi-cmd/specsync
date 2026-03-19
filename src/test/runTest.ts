import * as assert from 'assert';
import { CodeParser } from '../parser/codeParser';
import { SpecParser } from '../parser/specParser';
import { SyncEngine } from '../sync/syncEngine';

function testSpecParser(): void {
    const parser = new SpecParser();
    const content = `---
title: 用户登录API
version: 1.0.0
---

## API: POST /api/login

### Request
- username: string (6-20字符)
- password: string (8-32字符, 必须包含字母和数字)

### Response
- token: string

### 业务规则
1. 用户名不能为空
2. 密码必须包含字母和数字
`;

    const doc = parser.parse(content);
    assert.strictEqual(doc.apis.length, 1);
    assert.strictEqual(doc.apis[0].request.length, 2);
    assert.strictEqual(doc.apis[0].rules.length, 2);
    assert.deepStrictEqual(doc.apis[0].request[1].constraints, ['8-32字符', '必须包含字母和数字']);
}

function testTypeScriptAstParser(): void {
    const parser = new CodeParser();
    const content = `
interface LoginRequest {
    username: string;
    password: string;
    status: 'pending' | 'paid' | 'shipped';
}

interface LoginResponse {
    token: string;
}

@Spec('POST', '/api/login')
@Rule('用户名不能为空')
async function login(request: LoginRequest): Promise<LoginResponse> {
    if (!request.username) {
        throw new Error('required');
    }

    if (request.password.length < 8 || request.password.length > 32) {
        throw new Error('length');
    }

    if (!PASSWORD_REGEX.test(request.password)) {
        throw new Error('pattern');
    }

    if (!['pending', 'paid', 'shipped'].includes(request.status)) {
        throw new Error('enum');
    }

    return { token: 'ok' };
}
`;

    const doc = parser.parse(content, 'login.ts');
    assert.strictEqual(doc.language, 'typescript');
    assert.strictEqual(doc.interfaces.length, 2);
    assert.strictEqual(doc.functions.length, 1);
    assert.strictEqual(doc.apiBindings[0].path, '/api/login');
    assert.ok(doc.validations.some(item => item.kind === 'required' && item.fieldName === 'username'));
    assert.ok(doc.validations.some(item => item.kind === 'length' && item.fieldName === 'password' && item.min === 8));
    assert.ok(doc.validations.some(item => item.kind === 'length' && item.fieldName === 'password' && item.max === 32));
    assert.ok(doc.validations.some(item => item.kind === 'pattern' && item.fieldName === 'password'));
    assert.ok(doc.validations.some(item => item.kind === 'enum' && item.fieldName === 'status'));
    assert.ok(doc.rules.some(item => item.description.includes('用户名不能为空')));
}

function testDecoratorAndFallbackMatching(): void {
    const specParser = new SpecParser();
    const codeParser = new CodeParser();
    const syncEngine = new SyncEngine();

    const spec = specParser.parse(`---
title: 用户API
version: 1.0.0
---

## API: POST /api/session/login

### Request
- username: string (必填)
`);

    const decoratedCode = `
interface AuthPayload {
    username: string;
}

@Spec('POST', '/api/session/login')
function handleAuth(payload: AuthPayload): void {
    if (!payload.username) {
        throw new Error('required');
    }
}
`;

    const report = syncEngine.check(spec, codeParser.parse(decoratedCode, 'auth.ts'));
    assert.strictEqual(report.summary.total, 0, '装饰器应覆盖命名不一致的函数名');

    const fallbackCode = `
interface LoginRequest {
    username: string;
}

function login(request: LoginRequest): void {
    if (!request.username) {
        throw new Error('required');
    }
}
`;

    const fallbackReport = syncEngine.check(specParser.parse(`---
title: 用户API
version: 1.0.0
---

## API: POST /api/login

### Request
- username: string (必填)
`), codeParser.parse(fallbackCode, 'login.ts'));

    assert.strictEqual(fallbackReport.summary.total, 0, '命名推断仍应作为 fallback 生效');
}

function testPythonParser(): void {
    const parser = new CodeParser();
    const content = `
class RegisterRequest:
    email: str
    status: str

@Spec("POST", "/api/register")
@Rule("邮箱必须唯一")
def register(request: RegisterRequest) -> dict:
    """注册接口"""
    if not request.email:
        raise ValueError("required")
    if request.status not in ["pending", "paid", "shipped"]:
        raise ValueError("enum")
    return {"ok": True}
`;

    const doc = parser.parse(content, 'register.py');
    assert.strictEqual(doc.language, 'python');
    assert.strictEqual(doc.interfaces[0].name, 'RegisterRequest');
    assert.ok(doc.apiBindings.some(item => item.path === '/api/register'));
    assert.ok(doc.validations.some(item => item.kind === 'required' && item.fieldName === 'email'));
    assert.ok(doc.validations.some(item => item.kind === 'enum' && item.fieldName === 'status'));
    assert.ok(doc.rules.some(item => item.description.includes('邮箱必须唯一')));
}

function testDeepConstraintValidation(): void {
    const specParser = new SpecParser();
    const codeParser = new CodeParser();
    const syncEngine = new SyncEngine();

    const spec = specParser.parse(`---
title: 订单API
version: 1.0.0
---

## API: POST /api/orders

### Request
- quantity: number (1-100)
- status: enum (pending, paid, shipped)
- email: string (邮箱格式)

### 业务规则
1. 状态必须属于支付流程
`);

    const code = `
interface CreateOrdersRequest {
    quantity: number;
    status: string;
    email: string;
}

@Spec('POST /api/orders')
@Rule('状态必须属于支付流程')
function orders(request: CreateOrdersRequest): void {
    if (request.quantity < 1 || request.quantity > 100) {
        throw new Error('range');
    }
    if (!['pending', 'paid', 'shipped'].includes(request.status)) {
        throw new Error('enum');
    }
    if (!EMAIL_REGEX.test(request.email)) {
        throw new Error('pattern');
    }
}
`;

    const report = syncEngine.check(spec, codeParser.parse(code, 'orders.ts'));
    assert.strictEqual(report.summary.total, 0, '范围、枚举、正则和规则都应被识别');
}

function testMissingConstraintDetection(): void {
    const specParser = new SpecParser();
    const codeParser = new CodeParser();
    const syncEngine = new SyncEngine();

    const spec = specParser.parse(`---
title: 注册API
version: 1.0.0
---

## API: POST /api/register

### Request
- password: string (8-32字符, 必须包含字母和数字)
`);

    const code = `
interface RegisterRequest {
    password: string;
}

function register(request: RegisterRequest): void {
    if (request.password.length < 8 || request.password.length > 32) {
        throw new Error('length');
    }
}
`;

    const report = syncEngine.check(spec, codeParser.parse(code, 'register.ts'));
    assert.ok(report.inconsistencies.some(item =>
        item.type === 'constraint_missing' && item.message.includes('必须包含字母和数字')
    ));
}

function run(): void {
    testSpecParser();
    testTypeScriptAstParser();
    testDecoratorAndFallbackMatching();
    testPythonParser();
    testDeepConstraintValidation();
    testMissingConstraintDetection();
    console.log('All SpecSync tests passed.');
}

try {
    run();
} catch (error) {
    console.error('SpecSync tests failed:', error);
    process.exit(1);
}
