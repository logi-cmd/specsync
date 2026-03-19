# SpecSync

<p align="center">
  <strong>Keep Your API Spec and Code in Sync</strong>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=logi-cmd.specsync"><img src="https://img.shields.io/badge/VS%20Code-Download-blue?logo=visualstudiocode" alt="VS Code Extension"></a>
  <a href="https://github.com/logi-cmd/specsync/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License"></a>
</p>

[English](#english) | [中文](#中文)

---

<a name="english"></a>
## 🇺🇸 English

### What is SpecSync?

SpecSync is a **VS Code extension** that automatically detects inconsistencies between your API documentation (Spec files) and code implementation.

**Example:**
```markdown
<!-- login.spec.md -->
### Request
- username: string (6-20 characters)
- password: string (required)
```

```typescript
// login.ts
interface LoginRequest {
    username: string;
    // ❌ Missing 'password' field - SpecSync will warn you!
}
```

### Why SpecSync?

- 📉 **55% of developers** struggle with outdated API documentation ([Postman 2025](https://www.postman.com/state-of-api/2025/))
- ⏱️ Hours wasted debugging integration failures
- 🐛 Production bugs caused by docs not matching code

### ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 **Real-time Detection** | Auto-scan when you save files |
| 📊 **Multi-language** | TypeScript, Python, Java, Kotlin |
| 🎯 **Deep Analysis** | AST-based validation detection |
| 📍 **Click to Navigate** | Jump directly to issue locations |
| 🚀 **Zero Config** | Works out of the box |

### 🚀 Quick Start

#### Install

Search "SpecSync" in VS Code Extensions panel and install `logi-cmd.specsync`.

Or via command line:
```bash
code --install-extension logi-cmd.specsync
```

#### Write Your First Spec

Create `login.spec.md`:

```markdown
---
title: Login API
version: 1.0.0
---

## API: POST /api/login

### Request
- username: string (6-20 characters)
- password: string (8-32 characters, must contain letters and numbers)

### Response
- token: string
- expiresIn: number

### Business Rules
1. Username cannot be empty
2. Password must contain both letters and numbers
```

#### Implement Your Code

Create `login.ts`:

```typescript
interface LoginRequest {
    username: string;
    password: string;
}

// SpecSync will detect if this doesn't match the spec
async function login(request: LoginRequest): Promise<{token: string}> {
    // Your implementation
}
```

#### See Issues Instantly

Open VS Code Command Palette (`Ctrl+Shift+P`) → `SpecSync: Scan Sync`

Or enable auto-scan in settings: `specsync.autoScanOnSave: true`

### 🛣️ Roadmap

| Feature | Status |
|---------|--------|
| TypeScript Support | ✅ Ready |
| Python Support | ✅ Ready |
| Java/Kotlin Support | ✅ Ready |
| CI/CD Integration | 📅 Planned |
| Team Workspace | 📅 Planned |
| Smart Auto-fix | 📅 Planned |

### 🤝 Contributing

We welcome contributions! Please open an issue or submit a PR.

### 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<a name="中文"></a>
## 🇨🇳 中文

### SpecSync 是什么？

SpecSync 是一个 **VS Code 扩展**，自动检测 API 文档（Spec 文件）与代码实现之间的不一致。

**示例：**
```markdown
<!-- login.spec.md -->
### 请求
- username: string (6-20 字符)
- password: string (必填)
```

```typescript
// login.ts
interface LoginRequest {
    username: string;
    // ❌ 缺少 'password' 字段 - SpecSync 会提醒你！
}
```

### 为什么选择 SpecSync？

- 📉 **55% 的开发者** 苦于 API 文档过时 ([Postman 2025](https://www.postman.com/state-of-api/2025/))
- ⏱️ 数小时浪费在调试集成失败上
- 🐛 文档与代码不符导致的生产 bug

### ✨ 功能特性

| 特性 | 说明 |
|------|------|
| 🔍 **实时检测** | 保存文件时自动扫描 |
| 📊 **多语言** | TypeScript、Python、Java、Kotlin |
| 🎯 **深度分析** | 基于 AST 的验证检测 |
| 📍 **点击跳转** | 直接跳转到问题位置 |
| 🚀 **零配置** | 开箱即用 |

### 🚀 快速开始

#### 安装

在 VS Code 扩展面板中搜索 "SpecSync"，安装 `logi-cmd.specsync`。

或通过命令行：
```bash
code --install-extension logi-cmd.specsync
```

#### 编写第一个 Spec

创建 `login.spec.md`：

```markdown
---
title: 登录 API
version: 1.0.0
---

## API: POST /api/login

### 请求
- username: string (6-20 字符)
- password: string (8-32 字符, 必须包含字母和数字)

### 响应
- token: string
- expiresIn: number

### 业务规则
1. 用户名不能为空
2. 密码必须包含字母和数字
```

#### 实现代码

创建 `login.ts`：

```typescript
interface LoginRequest {
    username: string;
    password: string;
}

// SpecSync 会检测是否与 spec 匹配
async function login(request: LoginRequest): Promise<{token: string}> {
    // 你的实现
}
```

#### 立即查看问题

打开 VS Code 命令面板（`Ctrl+Shift+P`）→ `SpecSync: Scan Sync`

或在设置中启用自动扫描：`specsync.autoScanOnSave: true`

### 🛣️ 路线图

| 功能 | 状态 |
|------|------|
| TypeScript 支持 | ✅ 已就绪 |
| Python 支持 | ✅ 已就绪 |
| Java/Kotlin 支持 | ✅ 已就绪 |
| CI/CD 集成 | 📅 计划中 |
| 团队工作区 | 📅 计划中 |
| 智能自动修复 | 📅 计划中 |

### 🤝 贡献

欢迎贡献！请提交 Issue 或 Pull Request。

### 📄 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE)。

---

## 💬 支持 / Support

- 🐛 Issues: [GitHub Issues](https://github.com/logi-cmd/specsync/issues)

---

<p align="center">
  Made with ❤️ for developers who care about documentation
</p>
