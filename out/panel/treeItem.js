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
    static summary(label, value, iconId) {
        const item = new SpecSyncTreeItem(label, vscode.TreeItemCollapsibleState.None, 'summary');
        item.description = value;
        item.iconPath = new vscode.ThemeIcon(iconId);
        return item;
    }
    static category(label, count, iconId) {
        const item = new SpecSyncTreeItem(`${label} (${count})`, vscode.TreeItemCollapsibleState.Collapsed, 'category');
        item.iconPath = new vscode.ThemeIcon(iconId);
        return item;
    }
    static empty(message) {
        const item = new SpecSyncTreeItem(message, vscode.TreeItemCollapsibleState.None, 'empty');
        item.iconPath = new vscode.ThemeIcon('info');
        return item;
    }
    static issue(issue) {
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
exports.SpecSyncTreeItem = SpecSyncTreeItem;
function severityLabel(severity) {
    switch (severity) {
        case 'high':
            return '[HIGH]';
        case 'medium':
            return '[MED]';
        case 'low':
            return '[LOW]';
    }
}
function severityShort(severity) {
    switch (severity) {
        case 'high':
            return '[H]';
        case 'medium':
            return '[M]';
        case 'low':
            return '[L]';
    }
}
function severityIcon(severity) {
    switch (severity) {
        case 'high':
            return 'error';
        case 'medium':
            return 'warning';
        case 'low':
            return 'info';
    }
}
function severityColor(severity) {
    switch (severity) {
        case 'high':
            return new vscode.ThemeColor('problemsErrorIcon.foreground');
        case 'medium':
            return new vscode.ThemeColor('problemsWarningIcon.foreground');
        case 'low':
            return new vscode.ThemeColor('problemsInfoIcon.foreground');
    }
}
function issueTypeLabel(type) {
    const labels = {
        'api_missing': 'API Missing',
        'field_missing': 'Field Missing',
        'type_mismatch': 'Type Mismatch',
        'constraint_missing': 'Constraint Not Implemented',
        'rule_not_implemented': 'Rule Not Implemented'
    };
    return labels[type] || type;
}
//# sourceMappingURL=treeItem.js.map