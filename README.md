# SpecSync

<p align="center">
  <img src="https://raw.githubusercontent.com/specsync/specsync/main/docs/logo.png" alt="SpecSync Logo" width="120">
</p>

<p align="center">
  <strong>Keep Your API Spec and Code in Sync</strong>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=specsync.specsync"><img src="https://img.shields.io/badge/VS%20Code-Download-blue?logo=visualstudiocode" alt="VS Code Extension"></a>
  <a href="https://github.com/specsync/specsync/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License"></a>
  <a href="https://www.postman.com/state-of-api/2025/"><img src="https://img.shields.io/badge/Postman-55%25%20Docs%20Issues-orange" alt="Postman State of API"></a>
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

- 📉 **55% of developers** struggle with outdated API documentation
- ⏱️ **2-8 hours** wasted per documentation inconsistency
- 🐛 **Production bugs** caused by docs not matching code

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

```bash
# Via VS Code Marketplace
code --install-extension specsync.specsync
```

Or search "SpecSync" in VS Code Extensions panel.

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

Or the scan runs automatically when you save files.

### 📊 Why SpecSync?

| Without SpecSync | With SpecSync |
|------------------|---------------|
| Deploy → Users find inconsistency → Emergency fix | Detect → Fix immediately → Clean deploy |
| 2-8 hours debugging | < 5 minutes to fix |
| 40-50% documentation drift | < 5% drift |

### 🛣️ Roadmap

| Feature | Status | ETA |
|---------|--------|-----|
| TypeScript Support | ✅ Ready | Now |
| Python Support | ✅ Ready | Now |
| Java/Kotlin Support | ✅ Ready | Now |
| CI/CD Integration | 🚧 In Progress | Next Month |
| Team Workspace | 🚧 In Progress | Next Month |
| Smart Auto-fix | 📅 Planned | Q2 2026 |

### 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<a name="中文"></a>
## 🇨🇳 中文

### 问题背景

根据 [Postman State of the API 2025](https://www.postman.com/state-of-api/2025/) 报告，**55% 的开发者苦于文档不一致** - 这是 API 开发中的头号痛点。

**代价：**
- 数小时浪费在调试集成失败上
- 过时文档导致的生产事故
- 前后端团队之间的信任损失

### 解决方案

SpecSync 在您的 API 文档（Spec）和代码实现之间 **实时检测不一致性** - 在它们成为生产问题之前。

### ✨ 功能特性

- 🔍 **实时检测** - 保存文件时即时反馈
- 📊 **多语言支持** - TypeScript、Python、Java/Kotlin
- 🎯 **AST 深度分析** - 检测验证逻辑（不只是注释）
- 📝 **装饰器支持** - `@Spec`、`@Validate`、`@Rule` 注解
- 🔄 **CI/CD 集成** - GitHub Actions、GitLab CI 插件（Pro 版）
- 👥 **团队协作** - 共享工作区配置（Pro 版）

### 🚀 快速开始

#### 安装

```bash
# 通过 VS Code 应用商店
code --install-extension specsync.specsync
```

或在 VS Code 扩展面板中搜索 "SpecSync"。

#### 编写第一个 Spec

创建 `login.spec.md`：

```markdown
---
title: 登录 API
version: 1.0.0
---

## API: POST /api/login

### Request
- username: string (6-20 字符)
- password: string (8-32 字符, 必须包含字母和数字)

### Response
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

或在保存文件时自动运行扫描。

### 📊 为什么选择 SpecSync？

| 没有 SpecSync | 使用 SpecSync |
|--------------|---------------|
| 部署 → 用户发现不一致 → 紧急修复 | 检测 → 立即修复 → 干净部署 |
| 2-8 小时调试 | < 5 分钟修复 |
| 40-50% 文档漂移 | < 5% 漂移 |

### 🛣️ 路线图

| 功能 | 状态 | 预计时间 |
|---------|--------|-----|
| TypeScript 支持 | ✅ 已就绪 | 现在 |
| Python 支持 | ✅ 已就绪 | 现在 |
| Java/Kotlin 支持 | ✅ 已就绪 | 现在 |
| CI/CD 集成 | 🚧 进行中 | 下个月 |
| 团队工作区 | 🚧 进行中 | 下个月 |
| 智能自动修复 | 📅 计划中 | 2026年Q2 |

### 🤝 贡献

我们欢迎贡献！详情请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。

### 📄 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE)。

---

## 💬 支持 / Support

- 📧 Email: support@specsync.io
- 💬 Discord: [Join our community](https://discord.gg/specsync)
- 🐛 Issues: [GitHub Issues](https://github.com/specsync/specsync/issues)

---

## 📊 市场数据 / Market Data

- **55%** of developers struggle with inconsistent API documentation ([Postman 2025](https://www.postman.com/state-of-api/2025/))
- **75.9%** of developers use VS Code ([Stack Overflow 2024](https://survey.stackoverflow.co/2024/))
- **$6.61B** global developer tools market (2024)

---

<p align="center">
  Made with ❤️ for developers who care about documentation
</p>
