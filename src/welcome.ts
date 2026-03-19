import * as vscode from 'vscode';
import { localize } from './i18n';

export async function showWelcomePage(context: vscode.ExtensionContext, force: boolean = false): Promise<void> {
    const hasShownWelcome = context.globalState.get<boolean>('specsync.welcomeShown', false);
    
    if (hasShownWelcome && !force) {
        return;
    }
    
    const panel = vscode.window.createWebviewPanel(
        'specsyncWelcome',
        localize('welcome.panel.title'),
        vscode.ViewColumn.One,
        { enableScripts: true }
    );
    
    panel.webview.html = getWelcomeContent();
    
    panel.webview.onDidReceiveMessage(
        async message => {
            switch (message.command) {
                case 'createExample':
                    await createExampleFiles();
                    panel.dispose();
                    break;
                case 'openSettings':
                    await vscode.commands.executeCommand('workbench.action.openSettings', 'specsync');
                    break;
                case 'dismiss':
                    panel.dispose();
                    break;
            }
        },
        undefined,
        context.subscriptions
    );
    
    await context.globalState.update('specsync.welcomeShown', true);
}

async function createExampleFiles(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage(localize('error.create.example'));
        return;
    }
    
    const specContent = `---
title: Example API
version: 1.0.0
---

## API: POST /api/example

### Request
- name: string (required)
- age: number (18-120)

### Response
- id: string
- createdAt: string

### Business Rules
1. Name must not be empty
2. Age must be between 18 and 120
`;

    const codeContent = `// Example API implementation\n\ninterface ExampleRequest {\n    name: string;\n    age: number;\n}\n\ninterface ExampleResponse {\n    id: string;\n    createdAt: string;\n}\n\n// Try implementing this function and see SpecSync detect inconsistencies!\nasync function createExample(request: ExampleRequest): Promise<ExampleResponse> {\n    // TODO: Implement validation and return response\n    return {\n        id: '123',\n        createdAt: new Date().toISOString()\n    };\n}\n`;

    const specUri = vscode.Uri.joinPath(workspaceFolder.uri, 'example.spec.md');
    const codeUri = vscode.Uri.joinPath(workspaceFolder.uri, 'example.ts');
    
    try {
        await vscode.workspace.fs.writeFile(specUri, Buffer.from(specContent, 'utf8'));
        await vscode.workspace.fs.writeFile(codeUri, Buffer.from(codeContent, 'utf8'));
        
        vscode.window.showInformationMessage(localize('info.example.created'));
        
        // 打开示例文件
        const document = await vscode.workspace.openTextDocument(specUri);
        await vscode.window.showTextDocument(document);
    } catch (error) {
        vscode.window.showErrorMessage(localize('error.create.example'));
    }
}

function getWelcomeContent(): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>欢迎使用 SpecSync</title>
    <style>
        :root {
            --vscode-foreground: var(--vscode-editor-foreground, #333);
            --vscode-background: var(--vscode-editor-background, #fff);
            --vscode-button-background: var(--vscode-button-background, #1976d2);
            --vscode-button-foreground: var(--vscode-button-foreground, #fff);
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            line-height: 1.6;
            color: var(--vscode-foreground);
            background-color: var(--vscode-background);
        }
        h1 {
            color: var(--vscode-button-background);
            border-bottom: 2px solid var(--vscode-button-background);
            padding-bottom: 10px;
        }
        h2 {
            color: var(--vscode-foreground);
            margin-top: 30px;
            opacity: 0.9;
        }
        h3 {
            color: var(--vscode-foreground);
            opacity: 0.85;
        }
        .feature {
            background: var(--vscode-editor-inactiveSelectionBackground, #f5f5f5);
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            border: 1px solid var(--vscode-panel-border, #e0e0e0);
        }
        .feature h3 {
            margin-top: 0;
            color: var(--vscode-button-background);
            opacity: 1;
        }
        .button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin: 5px;
            font-weight: 500;
        }
        .button:hover {
            opacity: 0.9;
        }
        .button.secondary {
            background: var(--vscode-button-secondaryBackground, #757575);
            color: var(--vscode-button-secondaryForeground, #fff);
        }
        .steps {
            counter-reset: step;
        }
        .step {
            margin: 20px 0;
            padding-left: 50px;
            position: relative;
            color: var(--vscode-foreground);
        }
        .step::before {
            counter-increment: step;
            content: counter(step);
            position: absolute;
            left: 0;
            top: 0;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }
        code {
            background: var(--vscode-textCodeBlock-background, #e3f2fd);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            color: var(--vscode-button-background);
        }
        pre {
            background: var(--vscode-editor-background);
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            border: 1px solid var(--vscode-panel-border, #e0e0e0);
        }
        pre code {
            background: transparent;
            padding: 0;
        }
        ul, ol {
            color: var(--vscode-foreground);
        }
        li {
            margin: 8px 0;
        }
    </style>
</head>
        .button:hover {
            background: #1565c0;
        }
        .button.secondary {
            background: #757575;
        }
        .button.secondary:hover {
            background: #616161;
        }
        .steps {
            counter-reset: step;
        }
        .step {
            margin: 20px 0;
            padding-left: 50px;
            position: relative;
        }
        .step::before {
            counter-increment: step;
            content: counter(step);
            position: absolute;
            left: 0;
            top: 0;
            background: #1976d2;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }
        code {
            background: #e3f2fd;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            color: #1976d2;
        }
    </style>
</head>
<body>
    <h1>🚀 欢迎使用 SpecSync</h1>
    
    <p>SpecSync 帮助您保持 API 文档与代码实现的一致性。当文档和代码不同步时，我们会立即提醒您。</p>
    
    <div class="feature">
        <h3>✨ 核心功能</h3>
        <ul>
            <li><strong>实时检测</strong>：保存文件时自动检测不一致</li>
            <li><strong>精准定位</strong>：点击问题直接跳转到代码位置</li>
            <li><strong>多语言支持</strong>：TypeScript、Python、Java/Kotlin</li>
            <li><strong>AST 分析</strong>：深度分析代码验证逻辑</li>
        </ul>
    </div>
    
    <h2>📝 快速开始</h2>
    
    <div class="steps">
        <div class="step">
            <strong>创建 Spec 文件</strong>
            <p>创建一个 <code>*.spec.md</code> 文件，使用 Markdown 描述 API：</p>
            <pre><code>---
title: Login API
version: 1.0.0
---

## API: POST /api/login

### Request
- username: string (6-20 characters)
- password: string (required)

### Response
- token: string</code></pre>
        </div>
        
        <div class="step">
            <strong>编写代码</strong>
            <p>创建对应的代码文件（如 <code>login.ts</code>）实现 API。</p>
        </div>
        
        <div class="step">
            <strong>运行检测</strong>
            <p>按 <code>Ctrl+Shift+P</code> 打开命令面板，输入 <code>SpecSync: Scan Sync</code>。</p>
        </div>
        
        <div class="step">
            <strong>查看结果</strong>
            <p>不一致项会显示在左侧 SpecSync 面板中，点击可跳转到具体位置。</p>
        </div>
    </div>
    
    <h2>🎯 开始体验</h2>
    
    <p>创建示例文件，立即体验 SpecSync：</p>
    
    <button class="button" onclick="createExample()">创建示例文件</button>
    <button class="button secondary" onclick="openSettings()">打开设置</button>
    <button class="button secondary" onclick="dismiss()">关闭</button>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function createExample() {
            vscode.postMessage({ command: 'createExample' });
        }
        
        function openSettings() {
            vscode.postMessage({ command: 'openSettings' });
        }
        
        function dismiss() {
            vscode.postMessage({ command: 'dismiss' });
        }
    </script>
</body>
</html>`;
}
