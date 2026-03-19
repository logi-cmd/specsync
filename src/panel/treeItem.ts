import * as vscode from 'vscode';
import { ScanIssue } from './types';

export class SpecSyncTreeItem extends vscode.TreeItem {
    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        readonly kind: 'summary' | 'issue' | 'empty',
        readonly issue?: ScanIssue
    ) {
        super(label, collapsibleState);
    }

    static summary(label: string, value: string, iconId: string): SpecSyncTreeItem {
        const item = new SpecSyncTreeItem(label, vscode.TreeItemCollapsibleState.None, 'summary');
        item.description = value;
        item.iconPath = new vscode.ThemeIcon(iconId);
        return item;
    }

    static empty(message: string): SpecSyncTreeItem {
        const item = new SpecSyncTreeItem(message, vscode.TreeItemCollapsibleState.None, 'empty');
        item.iconPath = new vscode.ThemeIcon('info');
        return item;
    }

    static issue(issue: ScanIssue): SpecSyncTreeItem {
        const item = new SpecSyncTreeItem(issue.message, vscode.TreeItemCollapsibleState.None, 'issue', issue);
        const targetPath = issue.codeFile ? vscode.workspace.asRelativePath(issue.codeFile) : vscode.workspace.asRelativePath(issue.specFile);

        item.description = `${severityLabel(issue.severity)} · ${targetPath}`;
        item.tooltip = new vscode.MarkdownString([
            `**${issue.message}**`,
            ``,
            `Spec: \`${vscode.workspace.asRelativePath(issue.specFile)}\``,
            issue.codeFile ? `Code: \`${vscode.workspace.asRelativePath(issue.codeFile)}\`` : 'Code: `未匹配`'
        ].join('\n'));
        item.command = {
            command: 'specsync.openIssue',
            title: 'Open Issue',
            arguments: [issue]
        };
        item.contextValue = 'specsync.issue';
        item.iconPath = new vscode.ThemeIcon(severityIcon(issue.severity));
        return item;
    }
}

function severityLabel(severity: ScanIssue['severity']): string {
    switch (severity) {
        case 'high':
            return '高风险';
        case 'medium':
            return '中风险';
        case 'low':
            return '低风险';
    }
}

function severityIcon(severity: ScanIssue['severity']): string {
    switch (severity) {
        case 'high':
            return 'error';
        case 'medium':
            return 'warning';
        case 'low':
            return 'info';
    }
}
