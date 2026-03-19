import * as vscode from 'vscode';
import { ScanIssue } from './types';

export class SpecSyncTreeItem extends vscode.TreeItem {
    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        readonly kind: 'header' | 'summary' | 'category' | 'issue' | 'empty',
        readonly issue?: ScanIssue
    ) {
        super(label, collapsibleState);
    }

    // Header section
    static header(title: string, description?: string): SpecSyncTreeItem {
        const item = new SpecSyncTreeItem(title, vscode.TreeItemCollapsibleState.None, 'header');
        item.description = description;
        item.iconPath = new vscode.ThemeIcon('dashboard');
        return item;
    }

    // Summary stat
    static stat(label: string, value: string, iconId: string): SpecSyncTreeItem {
        const item = new SpecSyncTreeItem(label, vscode.TreeItemCollapsibleState.None, 'summary');
        item.description = value;
        item.iconPath = new vscode.ThemeIcon(iconId);
        return item;
    }

    // Category (expandable)
    static category(label: string, count: number, severity: 'high' | 'medium' | 'low'): SpecSyncTreeItem {
        const icons = {
            high: 'error',
            medium: 'warning', 
            low: 'info'
        };
        const colors = {
            high: new vscode.ThemeColor('problemsErrorIcon.foreground'),
            medium: new vscode.ThemeColor('problemsWarningIcon.foreground'),
            low: new vscode.ThemeColor('problemsInfoIcon.foreground')
        };
        
        const item = new SpecSyncTreeItem(
            `${label}`, 
            vscode.TreeItemCollapsibleState.Expanded, 
            'category'
        );
        item.description = `${count} issues`;
        item.iconPath = new vscode.ThemeIcon(icons[severity], colors[severity]);
        return item;
    }

    // Empty state
    static empty(message: string): SpecSyncTreeItem {
        const item = new SpecSyncTreeItem(message, vscode.TreeItemCollapsibleState.None, 'empty');
        item.iconPath = new vscode.ThemeIcon('pass');
        return item;
    }

    // Issue item
    static issue(issue: ScanIssue): SpecSyncTreeItem {
        // Shorten message for display
        const displayText = issue.message.length > 45 
            ? issue.message.substring(0, 45) + '...' 
            : issue.message;
        
        const item = new SpecSyncTreeItem(displayText, vscode.TreeItemCollapsibleState.None, 'issue', issue);
        
        // Get file path
        const targetPath = issue.codeFile 
            ? vscode.workspace.asRelativePath(issue.codeFile) 
            : vscode.workspace.asRelativePath(issue.specFile);

        // Format description: [H] filename.ts
        const severityMark = issue.severity === 'high' ? '[H]' : 
                            issue.severity === 'medium' ? '[M]' : '[L]';
        item.description = `${severityMark} ${targetPath}`;
        
        // Detailed tooltip
        const tooltipLines = [
            `$(error) ${issue.message}`,
            ``,
            `**Type:** ${formatIssueType(issue.type)}`,
            `**Severity:** ${issue.severity.toUpperCase()}`,
            ``,
            `📄 Spec: ${vscode.workspace.asRelativePath(issue.specFile)}`,
        ];
        
        if (issue.codeFile) {
            tooltipLines.push(`💻 Code: ${vscode.workspace.asRelativePath(issue.codeFile)}`);
        }
        
        item.tooltip = new vscode.MarkdownString(tooltipLines.join('\n'));
        item.tooltip.isTrusted = true;
        
        // Click to open
        item.command = {
            command: 'specsync.openIssue',
            title: 'Open Issue',
            arguments: [issue]
        };
        
        // Icon based on severity
        const iconMap = {
            high: 'error',
            medium: 'warning',
            low: 'info'
        };
        item.iconPath = new vscode.ThemeIcon(iconMap[issue.severity]);
        
        return item;
    }
}

function formatIssueType(type: string): string {
    const typeMap: Record<string, string> = {
        'api_missing': 'API Not Implemented',
        'field_missing': 'Field Missing',
        'type_mismatch': 'Type Mismatch',
        'constraint_missing': 'Constraint Not Implemented',
        'rule_not_implemented': 'Rule Not Implemented'
    };
    return typeMap[type] || type;
}