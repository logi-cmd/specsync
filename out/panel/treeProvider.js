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
            summary: {
                total: 0,
                high: 0,
                medium: 0,
                low: 0
            },
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
        if (element) {
            if (element.kind === 'category') {
                const label = element.label?.toString() || '';
                const severity = label.includes('HIGH') ? 'high' :
                    label.includes('MED') ? 'medium' : 'low';
                return this.result.issues
                    .filter(issue => issue.severity === severity)
                    .map(issue => treeItem_1.SpecSyncTreeItem.issue(issue));
            }
            return [];
        }
        if (this.result.specCount === 0 && this.result.summary.total === 0) {
            return [treeItem_1.SpecSyncTreeItem.empty('No scan results yet. Run "SpecSync: Scan Sync" to start')];
        }
        const items = [];
        items.push(treeItem_1.SpecSyncTreeItem.summary('Scan Summary', '', 'dashboard'));
        items.push(treeItem_1.SpecSyncTreeItem.summary('  Total Issues', String(this.result.summary.total), 'list-unordered'));
        if (this.result.summary.high > 0) {
            items.push(treeItem_1.SpecSyncTreeItem.category('HIGH Risk', this.result.summary.high, 'error'));
        }
        if (this.result.summary.medium > 0) {
            items.push(treeItem_1.SpecSyncTreeItem.category('MED Risk', this.result.summary.medium, 'warning'));
        }
        if (this.result.summary.low > 0) {
            items.push(treeItem_1.SpecSyncTreeItem.category('LOW Risk', this.result.summary.low, 'info'));
        }
        if (this.result.summary.total === 0) {
            items.push(treeItem_1.SpecSyncTreeItem.empty('No issues found - Code and Spec are in sync'));
        }
        return items;
    }
}
exports.SpecSyncTreeProvider = SpecSyncTreeProvider;
//# sourceMappingURL=treeProvider.js.map