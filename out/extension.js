"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const codeParser_1 = require("./parser/codeParser");
const specParser_1 = require("./parser/specParser");
const treeProvider_1 = require("./panel/treeProvider");
const syncEngine_1 = require("./sync/syncEngine");
const DEFAULT_SPEC_PATTERNS = ['**/*.spec.md', '**/spec/*.md'];
const CODE_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx'];
const EXCLUDE_GLOB = '**/{node_modules,out,dist,.git}/**';
async function activate(context) {
    const treeProvider = new treeProvider_1.SpecSyncTreeProvider();
    const treeView = vscode.window.createTreeView('specsync.view', {
        treeDataProvider: treeProvider,
        showCollapseAll: false
    });
    const refreshContext = async () => {
        const specFiles = await findSpecFiles();
        await vscode.commands.executeCommand('setContext', 'workspaceHasSpecFiles', specFiles.length > 0);
    };
    const runScan = async (resource) => {
        const result = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'SpecSync 正在扫描工作区',
            cancellable: false
        }, async () => scanWorkspace(resource));
        treeProvider.setResult(result);
        treeView.message = buildTreeMessage(result);
        await vscode.commands.executeCommand('setContext', 'specsync.hasIssues', result.summary.total > 0);
        await vscode.commands.executeCommand('workbench.view.explorer');
        if (result.specCount === 0) {
            void vscode.window.showWarningMessage('未找到 Spec 文件，请检查 specsync.specPatterns 配置。');
            return;
        }
        void vscode.window.showInformationMessage(`扫描完成：${result.specCount} 个 Spec，发现 ${result.summary.total} 个问题（高 ${result.summary.high} / 中 ${result.summary.medium} / 低 ${result.summary.low}）。`);
    };
    const showPanel = vscode.commands.registerCommand('specsync.showPanel', async () => {
        await vscode.commands.executeCommand('workbench.view.explorer');
        if (treeProvider.isEmpty()) {
            void vscode.window.showInformationMessage('SpecSync 视图已打开，运行 “SpecSync: Scan Sync” 开始扫描。');
        }
    });
    const scanSync = vscode.commands.registerCommand('specsync.scanSync', async (resource) => {
        await runScan(resource);
    });
    const openIssue = vscode.commands.registerCommand('specsync.openIssue', async (issue) => {
        await openIssueLocation(issue.target);
    });
    context.subscriptions.push(treeView, showPanel, scanSync, openIssue, vscode.workspace.onDidChangeConfiguration(async (event) => {
        if (event.affectsConfiguration('specsync.specPatterns')) {
            await refreshContext();
        }
        if (event.affectsConfiguration('specsync.autoScan')) {
            const config = vscode.workspace.getConfiguration('specsync');
            if (config.get('autoScan', false)) {
                await runScan();
            }
        }
    }), vscode.workspace.onDidChangeWorkspaceFolders(() => {
        void refreshContext();
    }));
    await refreshContext();
    if (vscode.workspace.getConfiguration('specsync').get('autoScan', false)) {
        await runScan();
    }
}
exports.activate = activate;
function deactivate() {
    // Extension cleanup (if needed in the future)
}
exports.deactivate = deactivate;
async function scanWorkspace(resource) {
    const specParser = new specParser_1.SpecParser();
    const codeParser = new codeParser_1.CodeParser();
    const syncEngine = new syncEngine_1.SyncEngine();
    const specFiles = await findSpecFiles(resource ? [resource] : undefined);
    const issues = [];
    for (const specFile of specFiles) {
        const specContent = await readFile(specFile);
        const specDoc = specParser.parse(specContent);
        const codeFile = await findMatchingCodeFile(specFile);
        if (!codeFile) {
            issues.push(createMissingCodeIssue(specFile, specContent));
            continue;
        }
        const codeContent = await readFile(codeFile);
        const report = syncEngine.check(specDoc, codeParser.parse(codeContent));
        issues.push(...mapIssues(report.inconsistencies, specFile, specContent, codeFile, codeContent));
    }
    return {
        issues,
        summary: summarize(issues),
        specCount: specFiles.length
    };
}
async function findSpecFiles(resources) {
    if (resources && resources.length > 0) {
        return resources.filter(isSpecFile);
    }
    const patterns = getSpecPatterns();
    const found = new Map();
    for (const pattern of patterns) {
        const files = await vscode.workspace.findFiles(pattern, EXCLUDE_GLOB);
        for (const file of files) {
            found.set(file.fsPath, file);
        }
    }
    return Array.from(found.values()).sort((left, right) => left.fsPath.localeCompare(right.fsPath));
}
function getSpecPatterns() {
    const configured = vscode.workspace.getConfiguration('specsync').get('specPatterns', DEFAULT_SPEC_PATTERNS);
    const patterns = configured.filter(pattern => typeof pattern === 'string' && pattern.trim().length > 0);
    return patterns.length > 0 ? patterns : DEFAULT_SPEC_PATTERNS;
}
function isSpecFile(uri) {
    return uri.fsPath.endsWith('.spec.md') || /[\\\/]spec[\\\/][^\\\/]+\.md$/i.test(uri.fsPath);
}
async function findMatchingCodeFile(specFile) {
    const baseName = getSpecBaseName(specFile);
    const directory = path.dirname(specFile.fsPath);
    const folderName = path.basename(directory).toLowerCase();
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(specFile);
    const rankedCandidates = [];
    for (const extension of CODE_EXTENSIONS) {
        rankedCandidates.push(vscode.Uri.file(path.join(directory, `${baseName}.${extension}`)));
        if (folderName === 'spec') {
            rankedCandidates.push(vscode.Uri.file(path.join(path.dirname(directory), `${baseName}.${extension}`)));
        }
        if (workspaceFolder) {
            rankedCandidates.push(vscode.Uri.joinPath(workspaceFolder.uri, 'src', `${baseName}.${extension}`));
        }
    }
    for (const candidate of rankedCandidates) {
        if (await exists(candidate)) {
            return candidate;
        }
    }
    if (!workspaceFolder) {
        return undefined;
    }
    const matches = [];
    for (const extension of CODE_EXTENSIONS) {
        const files = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder, `**/${baseName}.${extension}`), EXCLUDE_GLOB, 20);
        matches.push(...files);
    }
    return matches
        .sort((left, right) => scoreCodeMatch(left, specFile) - scoreCodeMatch(right, specFile))[0];
}
function scoreCodeMatch(candidate, specFile) {
    const candidateDir = path.dirname(candidate.fsPath);
    const specDir = path.dirname(specFile.fsPath);
    const specParent = path.dirname(specDir);
    if (candidateDir === specDir) {
        return 0;
    }
    if (candidateDir === specParent) {
        return 1;
    }
    return candidate.fsPath.length;
}
function getSpecBaseName(specFile) {
    const fileName = path.basename(specFile.fsPath);
    if (fileName.endsWith('.spec.md')) {
        return fileName.slice(0, -'.spec.md'.length);
    }
    return fileName.replace(/\.md$/i, '');
}
async function exists(uri) {
    try {
        await vscode.workspace.fs.stat(uri);
        return true;
    }
    catch {
        return false;
    }
}
async function readFile(uri) {
    const content = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(content).toString('utf8');
}
function createMissingCodeIssue(specFile, specContent) {
    const specLocation = {
        uri: specFile,
        line: 1,
        column: 1
    };
    const baseName = getSpecBaseName(specFile);
    return {
        id: `missing-code:${specFile.fsPath}`,
        type: 'api_missing',
        spec: vscode.workspace.asRelativePath(specFile),
        code: 'missing',
        severity: 'high',
        message: `未找到对应代码文件：${baseName}.{ts,tsx,js,jsx}`,
        specFile,
        specLocation,
        target: locateByPatterns(specFile, specContent, [`## API:`, baseName]) ?? specLocation
    };
}
function mapIssues(inconsistencies, specFile, specContent, codeFile, codeContent) {
    return inconsistencies.map((issue, index) => {
        const specLocation = locateSpecIssue(specFile, specContent, issue);
        const codeLocation = locateCodeIssue(codeFile, codeContent, issue);
        return {
            id: `${specFile.fsPath}:${codeFile.fsPath}:${index}`,
            ...issue,
            specFile,
            codeFile,
            specLocation,
            codeLocation,
            target: chooseTarget(issue, specLocation, codeLocation)
        };
    });
}
function chooseTarget(issue, specLocation, codeLocation) {
    if (!codeLocation) {
        return specLocation;
    }
    if (issue.type === 'rule_not_implemented') {
        return specLocation;
    }
    return codeLocation;
}
function locateSpecIssue(specFile, content, issue) {
    switch (issue.type) {
        case 'api_missing':
            return locateByPatterns(specFile, content, [`## API: ${issue.spec}`]) ?? firstLine(specFile);
        case 'field_missing': {
            const [, fieldName = ''] = issue.spec.split(' - ');
            return locateByPatterns(specFile, content, [`- ${fieldName}:`, fieldName]) ?? firstLine(specFile);
        }
        case 'type_mismatch':
        case 'constraint_missing': {
            const fieldName = issue.spec.split(':')[0].split('(')[0].trim();
            return locateByPatterns(specFile, content, [`- ${fieldName}:`, fieldName]) ?? firstLine(specFile);
        }
        case 'rule_not_implemented':
            return locateByPatterns(specFile, content, [issue.spec]) ?? firstLine(specFile);
        default:
            return firstLine(specFile);
    }
}
function locateCodeIssue(codeFile, content, issue) {
    switch (issue.type) {
        case 'api_missing': {
            const functionName = issue.message.split(':').pop()?.trim();
            return functionName
                ? locateByPatterns(codeFile, content, [`function ${functionName}`, `${functionName}(`]) ?? firstLine(codeFile)
                : firstLine(codeFile);
        }
        case 'field_missing':
        case 'type_mismatch':
        case 'constraint_missing': {
            const fieldName = extractFieldName(issue);
            return locateByPatterns(codeFile, content, [`${fieldName}:`, `.${fieldName}`, fieldName]) ?? firstLine(codeFile);
        }
        case 'rule_not_implemented':
            return locateByPatterns(codeFile, content, [issue.spec]) ?? firstLine(codeFile);
        default:
            return firstLine(codeFile);
    }
}
function extractFieldName(issue) {
    if (issue.type === 'field_missing') {
        return issue.spec.split(' - ').pop()?.trim() ?? '';
    }
    return issue.spec.split(':')[0].split('(')[0].trim();
}
function locateByPatterns(uri, content, patterns) {
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        if (patterns.some(pattern => pattern.length > 0 && line.includes(pattern))) {
            return {
                uri,
                line: index + 1,
                column: 1
            };
        }
    }
    return undefined;
}
function firstLine(uri) {
    return {
        uri,
        line: 1,
        column: 1
    };
}
function summarize(issues) {
    return {
        total: issues.length,
        high: issues.filter(issue => issue.severity === 'high').length,
        medium: issues.filter(issue => issue.severity === 'medium').length,
        low: issues.filter(issue => issue.severity === 'low').length
    };
}
function buildTreeMessage(result) {
    if (result.specCount === 0) {
        return '未找到可扫描的 Spec 文件';
    }
    if (result.summary.total === 0) {
        return `已扫描 ${result.specCount} 个 Spec，未发现不一致项`;
    }
    return `已扫描 ${result.specCount} 个 Spec`;
}
async function openIssueLocation(location) {
    const document = await vscode.workspace.openTextDocument(location.uri);
    const editor = await vscode.window.showTextDocument(document, {
        preview: false,
        preserveFocus: false
    });
    const position = new vscode.Position(Math.max(location.line - 1, 0), Math.max((location.column ?? 1) - 1, 0));
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
}
//# sourceMappingURL=extension.js.map