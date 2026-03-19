import * as path from 'path';
import * as vscode from 'vscode';
import { localize } from './i18n';
import { CodeParser } from './parser/codeParser';
import { SpecParser } from './parser/specParser';
import { SpecSyncTreeProvider } from './panel/treeProvider';
import { ScanIssue, ScanIssueLocation, ScanResult } from './panel/types';
import { Inconsistency, SyncEngine } from './sync/syncEngine';
import { showWelcomePage } from './welcome';

const DEFAULT_SPEC_PATTERNS = ['**/*.spec.md', '**/spec/*.md'];
const CODE_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'kt', 'kts'];
const EXCLUDE_GLOB = '**/{node_modules,out,dist,.git}/**';

export async function activate(context: vscode.ExtensionContext) {
    // 显示欢迎页面（首次使用）
    await showWelcomePage(context);

    const treeProvider = new SpecSyncTreeProvider();
    const treeView = vscode.window.createTreeView('specsync.view', {
        treeDataProvider: treeProvider,
        showCollapseAll: false
    });

    const refreshContext = async () => {
        const specFiles = await findSpecFiles();
        await vscode.commands.executeCommand('setContext', 'workspaceHasSpecFiles', specFiles.length > 0);
    };

    const runScan = async (resource?: vscode.Uri) => {
        const result = await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: localize('scan.progress.title'),
                cancellable: false
            },
            async () => scanWorkspace(resource)
        );

        treeProvider.setResult(result);
        treeView.message = buildTreeMessage(result);
        await vscode.commands.executeCommand('setContext', 'specsync.hasIssues', result.summary.total > 0);
        await vscode.commands.executeCommand('workbench.view.explorer');

        if (result.specCount === 0) {
            void vscode.window.showWarningMessage(localize('scan.noSpecFiles'));
            return;
        }

        void vscode.window.showInformationMessage(
            localize('scan.complete.message', result.specCount, result.summary.total, result.summary.high, result.summary.medium, result.summary.low)
        );
    };

    const showPanel = vscode.commands.registerCommand('specsync.showPanel', async () => {
        await vscode.commands.executeCommand('workbench.view.explorer');
        if (treeProvider.isEmpty()) {
            void vscode.window.showInformationMessage(localize('info.panel.opened'));
        }
    });

    const scanSync = vscode.commands.registerCommand('specsync.scanSync', async (resource?: vscode.Uri) => {
        await runScan(resource);
    });

    const showWelcome = vscode.commands.registerCommand('specsync.showWelcome', async () => {
        await showWelcomePage(context, true); // true = force show
    });

    const openIssue = vscode.commands.registerCommand('specsync.openIssue', async (issue: ScanIssue) => {
        await openIssueLocation(issue.target);
    });

    context.subscriptions.push(
        treeView,
        showPanel,
        scanSync,
        showWelcome,
        openIssue,
        vscode.workspace.onDidSaveTextDocument(async document => {
            const config = vscode.workspace.getConfiguration('specsync');
            if (config.get<boolean>('autoScanOnSave', false)) {
                if (isSpecFile(document.uri) || isCodeFile(document.uri)) {
                    await runScan();
                }
            }
        }),
        vscode.workspace.onDidChangeConfiguration(async event => {
            if (event.affectsConfiguration('specsync.specPatterns')) {
                await refreshContext();
            }

            if (event.affectsConfiguration('specsync.autoScan')) {
                const config = vscode.workspace.getConfiguration('specsync');
                if (config.get<boolean>('autoScan', false)) {
                    await runScan();
                }
            }
        }),
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            void refreshContext();
        })
    );

    await refreshContext();

    if (vscode.workspace.getConfiguration('specsync').get<boolean>('autoScan', false)) {
        await runScan();
    }
}

export function deactivate() {
    // Extension cleanup (if needed in the future)
}

async function scanWorkspace(resource?: vscode.Uri): Promise<ScanResult> {
    const specParser = new SpecParser();
    const codeParser = new CodeParser();
    const syncEngine = new SyncEngine();
    const specFiles = await findSpecFiles(resource ? [resource] : undefined);
    const issues: ScanIssue[] = [];

    for (const specFile of specFiles) {
        const specContent = await readFile(specFile);
        const specDoc = specParser.parse(specContent);
        const codeFile = await findMatchingCodeFile(specFile);

        if (!codeFile) {
            issues.push(createMissingCodeIssue(specFile, specContent));
            continue;
        }

        const codeContent = await readFile(codeFile);
        const report = syncEngine.check(specDoc, codeParser.parse(codeContent, codeFile.fsPath));
        issues.push(...mapIssues(report.inconsistencies, specFile, specContent, codeFile, codeContent));
    }

    return {
        issues,
        summary: summarize(issues),
        specCount: specFiles.length
    };
}

async function findSpecFiles(resources?: vscode.Uri[]): Promise<vscode.Uri[]> {
    if (resources && resources.length > 0) {
        return resources.filter(isSpecFile);
    }

    const patterns = getSpecPatterns();
    const found = new Map<string, vscode.Uri>();

    for (const pattern of patterns) {
        const files = await vscode.workspace.findFiles(pattern, EXCLUDE_GLOB);
        for (const file of files) {
            found.set(file.fsPath, file);
        }
    }

    return Array.from(found.values()).sort((left, right) => left.fsPath.localeCompare(right.fsPath));
}

function getSpecPatterns(): string[] {
    const configured = vscode.workspace.getConfiguration('specsync').get<string[]>('specPatterns', DEFAULT_SPEC_PATTERNS);
    const patterns = configured.filter(pattern => typeof pattern === 'string' && pattern.trim().length > 0);
    return patterns.length > 0 ? patterns : DEFAULT_SPEC_PATTERNS;
}

function isSpecFile(uri: vscode.Uri): boolean {
    return uri.fsPath.endsWith('.spec.md') || /[\\\/]spec[\\\/][^\\\/]+\.md$/i.test(uri.fsPath);
}

async function findMatchingCodeFile(specFile: vscode.Uri): Promise<vscode.Uri | undefined> {
    const baseName = getSpecBaseName(specFile);
    const directory = path.dirname(specFile.fsPath);
    const folderName = path.basename(directory).toLowerCase();
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(specFile);
    const rankedCandidates: vscode.Uri[] = [];

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

    const matches: vscode.Uri[] = [];
    for (const extension of CODE_EXTENSIONS) {
        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(workspaceFolder, `**/${baseName}.${extension}`),
            EXCLUDE_GLOB,
            20
        );
        matches.push(...files);
    }

    return matches
        .sort((left, right) => scoreCodeMatch(left, specFile) - scoreCodeMatch(right, specFile))[0];
}

function scoreCodeMatch(candidate: vscode.Uri, specFile: vscode.Uri): number {
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

function getSpecBaseName(specFile: vscode.Uri): string {
    const fileName = path.basename(specFile.fsPath);
    if (fileName.endsWith('.spec.md')) {
        return fileName.slice(0, -'.spec.md'.length);
    }

    return fileName.replace(/\.md$/i, '');
}

async function exists(uri: vscode.Uri): Promise<boolean> {
    try {
        await vscode.workspace.fs.stat(uri);
        return true;
    } catch {
        return false;
    }
}

async function readFile(uri: vscode.Uri): Promise<string> {
    const content = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(content).toString('utf8');
}

function createMissingCodeIssue(specFile: vscode.Uri, specContent: string): ScanIssue {
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
        message: localize('issue.missing.code', baseName, '{ts,tsx,js,jsx,py,java,kt,kts}'),
        specFile,
        specLocation,
        target: locateByPatterns(specFile, specContent, [`## API:`, baseName]) ?? specLocation
    };
}

function mapIssues(
    inconsistencies: Inconsistency[],
    specFile: vscode.Uri,
    specContent: string,
    codeFile: vscode.Uri,
    codeContent: string
): ScanIssue[] {
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

function chooseTarget(
    issue: Inconsistency,
    specLocation: ScanIssueLocation,
    codeLocation?: ScanIssueLocation
): ScanIssueLocation {
    if (!codeLocation) {
        return specLocation;
    }

    if (issue.type === 'rule_not_implemented') {
        return specLocation;
    }

    return codeLocation;
}

function locateSpecIssue(specFile: vscode.Uri, content: string, issue: Inconsistency): ScanIssueLocation {
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

function locateCodeIssue(codeFile: vscode.Uri, content: string, issue: Inconsistency): ScanIssueLocation | undefined {
    switch (issue.type) {
        case 'api_missing': {
            const functionName = issue.message.split(':').pop()?.trim();
            return functionName
                ? locateByPatterns(codeFile, content, [
                    '@Spec(',
                    `function ${functionName}`,
                    `def ${functionName}`,
                    `fun ${functionName}`,
                    `${functionName}(`
                ]) ?? firstLine(codeFile)
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

function extractFieldName(issue: Inconsistency): string {
    if (issue.type === 'field_missing') {
        return issue.spec.split(' - ').pop()?.trim() ?? '';
    }

    return issue.spec.split(':')[0].split('(')[0].trim();
}

function locateByPatterns(uri: vscode.Uri, content: string, patterns: string[]): ScanIssueLocation | undefined {
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

function firstLine(uri: vscode.Uri): ScanIssueLocation {
    return {
        uri,
        line: 1,
        column: 1
    };
}

function summarize(issues: ScanIssue[]): ScanResult['summary'] {
    return {
        total: issues.length,
        high: issues.filter(issue => issue.severity === 'high').length,
        medium: issues.filter(issue => issue.severity === 'medium').length,
        low: issues.filter(issue => issue.severity === 'low').length
    };
}

function buildTreeMessage(result: ScanResult): string {
    if (result.specCount === 0) {
        return localize('scan.tree.noSpecFiles');
    }

    if (result.summary.total === 0) {
        return localize('scan.tree.noIssues', result.specCount);
    }

    return localize('scan.tree.scanned', result.specCount);
}

async function openIssueLocation(location: ScanIssueLocation): Promise<void> {
    const document = await vscode.workspace.openTextDocument(location.uri);
    const editor = await vscode.window.showTextDocument(document, {
        preview: false,
        preserveFocus: false
    });

    const position = new vscode.Position(Math.max(location.line - 1, 0), Math.max((location.column ?? 1) - 1, 0));
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
}

function isCodeFile(uri: vscode.Uri): boolean {
    const ext = path.extname(uri.fsPath).toLowerCase();
    return ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.kt', '.kts'].includes(ext);
}
