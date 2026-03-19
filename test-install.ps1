# SpecSync 安装测试脚本

## 1. 卸载旧版本
code --uninstall-extension logi-cmd.specsync

## 2. 安装新版本
code --install-extension "C:\Users\97504\.openclaw\workspace\projects\specsync\specsync-0.0.2.vsix"

## 3. 重启 VS Code（完全关闭再打开）
## 手动操作：关闭所有 VS Code 窗口，重新打开

## 4. 创建测试文件
# 创建 test.spec.md
@"
---
title: Test API
version: 1.0.0
---

## API: POST /api/test

### Request
- name: string (required)
"@ | Set-Content -Path "test.spec.md" -Encoding UTF8

# 创建 test.ts
@"
interface TestRequest {
    name: string;
}

async function test(request: TestRequest) {
    return { success: true };
}
"@ | Set-Content -Path "test.ts" -Encoding UTF8

Write-Host "✅ 测试文件已创建"
Write-Host ""
Write-Host "请在 VS Code 中："
Write-Host "1. 打开包含 test.spec.md 和 test.ts 的文件夹"
Write-Host "2. 按 Ctrl+Shift+P"
Write-Host "3. 运行 'SpecSync: Scan Sync'"
Write-Host ""
Write-Host "如果看到左侧 SpecSync 面板显示结果，说明安装成功！"
