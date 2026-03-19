import * as vscode from 'vscode';
import { ScanIssue } from './types';

export class SpecSyncTreeItem extends vscode.TreeItem {
    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        readonly kind: 'summary' | 'issue' | 'empty' | 'category',
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

    static category(label: string, count: number, iconId: string): SpecSyncTreeItem {
        const item = new SpecSyncTreeItem(`${label} (${count})`, vscode.TreeItemCollapsibleState.Collapsed, 'category');
        item.iconPath = new vscode.ThemeIcon(iconId);
        return item;
    }

    static empty(message: string): SpecSyncTreeItem {
        const item = new SpecSyncTreeItem(message, vscode.TreeItemCollapsibleState.None, 'empty');
        item.iconPath = new vscode.ThemeIcon('info');
        return item;
    }

    static issue(issue: ScanIssue): SpecSyncTreeItem {
        const shortMessage = issue.message.length > 50 
            ? issue.message.substring(0, 50) + '...' 
            : issue.message;
        
        const item = new SpecSyncTreeItem(shortMessage, vscode.TreeItemCollapsibleState.None, 'issue', issue);
        
        const targetPath = issue.codeFile 
            ? vscode.workspace.asRelativePath(issue.codeFile) 
            : vscode.workspace.asRelativePath(issue.specFile);

        item.description = `${severityShort(issue.severity)} ${targetPath}`;
        
        const lines = [
            `**${severityLabel(issue.severity)}: ${issue.message}**`,
            '',
            `Type: ${issueTypeLabel(issue.type)}`,
            '',
            `Spec: \`${vscode.workspace.asRelativePath(issue.specFile)}\``,
        ];
        
        if (issue.codeFile) {
            lines.push(`Code: \`${vscode.workspace.asRelativePath(issue.codeFile)}\``);
        }
        
        lines.push('', 'Click to navigate to issue location');
        
        item.tooltip = new vscode.MarkdownString(lines.join('\n'));
        item.tooltip.isTrusted = true;
        
        item.command = {
            command: 'specsync.openIssue',
            title: 'Open Issue',
            arguments: [issue]
        };
        
        item.contextValue = 'specsync.issue';
        item.iconPath = new vscode.ThemeIcon(severityIcon(issue.severity), severityColor(issue.severity));
        return item;
    }
}

function severityLabel(severity: ScanIssue['severity']): string {
    switch (severity) {
        case 'high':
            return '[HIGH]';
        case 'medium':
            return '[MED]';
        case 'low':
            return '[LOW]';
    }
}

function severityShort(severity: ScanIssue['severity']): string {
    switch (severity) {
        case 'high':
            return '[H]';
        case 'medium':
            return '[M]';
        case 'low':
            return '[L]';
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

function severityColor(severity: ScanIssue['severity']): vscode.ThemeColor | undefined {
    switch (severity) {
        case 'high':
            return new vscode.ThemeColor('problemsErrorIcon.foreground');
        case 'medium':
            return new vscode.ThemeColor('problemsWarningIcon.foreground');
        case 'low':
            return new vscode.ThemeColor('problemsInfoIcon.foreground');
    }
}

function issueTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        'api_missing': 'API Missing',
        'field_missing': 'Field Missing',
        'type_mismatch': 'Type Mismatch',
        'constraint_missing': 'Constraint Not Implemented',
        'rule_not_implemented': 'Rule Not Implemented'
    };
    return labels[type] || type;
}