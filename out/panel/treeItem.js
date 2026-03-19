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
exports.SpecSyncTreeItem = void 0;
const vscode = __importStar(require("vscode"));
class SpecSyncTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, kind, issue) {
        super(label, collapsibleState);
        this.kind = kind;
        this.issue = issue;
    }
    // Header section
    static header(title, description) {
        const item = new SpecSyncTreeItem(title, vscode.TreeItemCollapsibleState.None, 'header');
        item.description = description;
        item.iconPath = new vscode.ThemeIcon('dashboard');
        return item;
    }
    // Summary stat
    static stat(label, value, iconId) {
        const item = new SpecSyncTreeItem(label, vscode.TreeItemCollapsibleState.None, 'summary');
        item.description = value;
        item.iconPath = new vscode.ThemeIcon(iconId);
        return item;
    }
    // Category (expandable)
    static category(label, count, severity) {
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
        const item = new SpecSyncTreeItem(`${label}`, vscode.TreeItemCollapsibleState.Expanded, 'category');
        item.description = `${count} issues`;
        item.iconPath = new vscode.ThemeIcon(icons[severity], colors[severity]);
        return item;
    }
    // Empty state
    static empty(message) {
        const item = new SpecSyncTreeItem(message, vscode.TreeItemCollapsibleState.None, 'empty');
        item.iconPath = new vscode.ThemeIcon('pass');
        return item;
    }
    // Issue item
    static issue(issue) {
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
exports.SpecSyncTreeItem = SpecSyncTreeItem;
function formatIssueType(type) {
    const typeMap = {
        'api_missing': 'API Not Implemented',
        'field_missing': 'Field Missing',
        'type_mismatch': 'Type Mismatch',
        'constraint_missing': 'Constraint Not Implemented',
        'rule_not_implemented': 'Rule Not Implemented'
    };
    return typeMap[type] || type;
}
//# sourceMappingURL=treeItem.js.map