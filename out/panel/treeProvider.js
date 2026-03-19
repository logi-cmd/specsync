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
            return [];
        }
        const summaryItems = [
            treeItem_1.SpecSyncTreeItem.summary('总问题数', String(this.result.summary.total), 'list-unordered'),
            treeItem_1.SpecSyncTreeItem.summary('高风险', String(this.result.summary.high), 'error'),
            treeItem_1.SpecSyncTreeItem.summary('中风险', String(this.result.summary.medium), 'warning'),
            treeItem_1.SpecSyncTreeItem.summary('低风险', String(this.result.summary.low), 'info')
        ];
        if (this.result.specCount === 0) {
            return [
                ...summaryItems,
                treeItem_1.SpecSyncTreeItem.empty('还没有扫描结果')
            ];
        }
        if (this.result.issues.length === 0) {
            return [
                ...summaryItems,
                treeItem_1.SpecSyncTreeItem.empty('扫描完成，未发现不一致项')
            ];
        }
        return [
            ...summaryItems,
            ...this.result.issues.map(issue => treeItem_1.SpecSyncTreeItem.issue(issue))
        ];
    }
}
exports.SpecSyncTreeProvider = SpecSyncTreeProvider;
//# sourceMappingURL=treeProvider.js.map