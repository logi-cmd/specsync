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
exports.SpecSyncTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
const treeItem_1 = require("./treeItem");
class SpecSyncTreeProvider {
    constructor() {
        this.onDidChangeTreeDataEmitter = new vscode.EventEmitter();
        this.onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;
        this.result = {
            issues: [],
            summary: { total: 0, high: 0, medium: 0, low: 0 },
            specCount: 0
        };
    }
    setResult(result) {
        this.result = result;
        this.onDidChangeTreeDataEmitter.fire();
    }
    isEmpty() {
        return this.result.specCount === 0 && this.result.summary.total === 0;
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        // If element is provided, return its children
        if (element) {
            if (element.kind === 'category') {
                // Return issues for this category
                const label = element.label?.toString() || '';
                let severity;
                if (label.includes('HIGH'))
                    severity = 'high';
                else if (label.includes('MEDIUM'))
                    severity = 'medium';
                else
                    severity = 'low';
                return this.result.issues
                    .filter(i => i.severity === severity)
                    .map(i => treeItem_1.SpecSyncTreeItem.issue(i));
            }
            return [];
        }
        // Root level - build structured view
        const items = [];
        // === SECTION 1: OVERVIEW ===
        items.push(treeItem_1.SpecSyncTreeItem.header('📊 SCAN OVERVIEW'));
        items.push(treeItem_1.SpecSyncTreeItem.stat('Total Issues', String(this.result.summary.total), 'list-unordered'));
        items.push(treeItem_1.SpecSyncTreeItem.stat('Spec Files', String(this.result.specCount), 'file-code'));
        // Separator line effect with empty item
        if (this.result.summary.total > 0) {
            items.push(new treeItem_1.SpecSyncTreeItem('', vscode.TreeItemCollapsibleState.None, 'empty'));
            // === SECTION 2: ISSUES BY SEVERITY ===
            items.push(treeItem_1.SpecSyncTreeItem.header('⚠️ ISSUES BY SEVERITY'));
            if (this.result.summary.high > 0) {
                items.push(treeItem_1.SpecSyncTreeItem.category('HIGH PRIORITY', this.result.summary.high, 'high'));
            }
            if (this.result.summary.medium > 0) {
                items.push(treeItem_1.SpecSyncTreeItem.category('MEDIUM PRIORITY', this.result.summary.medium, 'medium'));
            }
            if (this.result.summary.low > 0) {
                items.push(treeItem_1.SpecSyncTreeItem.category('LOW PRIORITY', this.result.summary.low, 'low'));
            }
        }
        else if (this.result.specCount > 0) {
            // No issues found
            items.push(new treeItem_1.SpecSyncTreeItem('', vscode.TreeItemCollapsibleState.None, 'empty'));
            items.push(treeItem_1.SpecSyncTreeItem.empty('✅ All specs are in sync with code!'));
        }
        else {
            // No scan yet
            items.push(new treeItem_1.SpecSyncTreeItem('', vscode.TreeItemCollapsibleState.None, 'empty'));
            items.push(treeItem_1.SpecSyncTreeItem.empty('Run "SpecSync: Scan Sync" to start'));
        }
        // === SECTION 3: ACTIONS ===
        items.push(new treeItem_1.SpecSyncTreeItem('', vscode.TreeItemCollapsibleState.None, 'empty'));
        items.push(treeItem_1.SpecSyncTreeItem.header('🚀 QUICK ACTIONS'));
        const scanItem = new treeItem_1.SpecSyncTreeItem('Scan Workspace', vscode.TreeItemCollapsibleState.None, 'summary');
        scanItem.iconPath = new vscode.ThemeIcon('play');
        scanItem.command = { command: 'specsync.scanSync', title: 'Scan' };
        items.push(scanItem);
        const welcomeItem = new treeItem_1.SpecSyncTreeItem('Open Welcome Page', vscode.TreeItemCollapsibleState.None, 'summary');
        welcomeItem.iconPath = new vscode.ThemeIcon('book');
        welcomeItem.command = { command: 'specsync.showWelcome', title: 'Welcome' };
        items.push(welcomeItem);
        return items;
    }
}
exports.SpecSyncTreeProvider = SpecSyncTreeProvider;
//# sourceMappingURL=treeProvider.js.map