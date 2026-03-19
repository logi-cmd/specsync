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
    static empty(message) {
        const item = new SpecSyncTreeItem(message, vscode.TreeItemCollapsibleState.None, 'empty');
        item.iconPath = new vscode.ThemeIcon('info');
        return item;
    }
    static issue(issue) {
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
exports.SpecSyncTreeItem = SpecSyncTreeItem;
function severityLabel(severity) {
    switch (severity) {
        case 'high':
            return '高风险';
        case 'medium':
            return '中风险';
        case 'low':
            return '低风险';
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
//# sourceMappingURL=treeItem.js.map