import * as vscode from 'vscode';
import { SpecSyncTreeItem } from './treeItem';
import { ScanResult } from './types';

export class SpecSyncTreeProvider implements vscode.TreeDataProvider<SpecSyncTreeItem> {
    private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<SpecSyncTreeItem | undefined | void>();
    readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

    private result: ScanResult = {
        issues: [],
        summary: {
            total: 0,
            high: 0,
            medium: 0,
            low: 0
        },
        specCount: 0
    };

    setResult(result: ScanResult): void {
        this.result = result;
        this.onDidChangeTreeDataEmitter.fire();
    }

    isEmpty(): boolean {
        return this.result.specCount === 0 && this.result.summary.total === 0;
    }

    getTreeItem(element: SpecSyncTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SpecSyncTreeItem): vscode.ProviderResult<SpecSyncTreeItem[]> {
        if (element) {
            return [];
        }

        const summaryItems = [
            SpecSyncTreeItem.summary('总问题数', String(this.result.summary.total), 'list-unordered'),
            SpecSyncTreeItem.summary('高风险', String(this.result.summary.high), 'error'),
            SpecSyncTreeItem.summary('中风险', String(this.result.summary.medium), 'warning'),
            SpecSyncTreeItem.summary('低风险', String(this.result.summary.low), 'info')
        ];

        if (this.result.specCount === 0) {
            return [
                ...summaryItems,
                SpecSyncTreeItem.empty('还没有扫描结果')
            ];
        }

        if (this.result.issues.length === 0) {
            return [
                ...summaryItems,
                SpecSyncTreeItem.empty('扫描完成，未发现不一致项')
            ];
        }

        return [
            ...summaryItems,
            ...this.result.issues.map(issue => SpecSyncTreeItem.issue(issue))
        ];
    }
}
