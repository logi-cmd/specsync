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
            if (element.kind === 'category') {
                const label = element.label?.toString() || '';
                const severity = label.includes('HIGH') ? 'high' :
                                label.includes('MED') ? 'medium' : 'low';
                return this.result.issues
                    .filter(issue => issue.severity === severity)
                    .map(issue => SpecSyncTreeItem.issue(issue));
            }
            return [];
        }

        if (this.result.specCount === 0 && this.result.summary.total === 0) {
            return [SpecSyncTreeItem.empty('No scan results yet. Run "SpecSync: Scan Sync" to start')];
        }

        const items: SpecSyncTreeItem[] = [];

        items.push(SpecSyncTreeItem.summary('Scan Summary', '', 'dashboard'));
        items.push(SpecSyncTreeItem.summary('  Total Issues', String(this.result.summary.total), 'list-unordered'));

        if (this.result.summary.high > 0) {
            items.push(SpecSyncTreeItem.category('HIGH Risk', this.result.summary.high, 'error'));
        }
        if (this.result.summary.medium > 0) {
            items.push(SpecSyncTreeItem.category('MED Risk', this.result.summary.medium, 'warning'));
        }
        if (this.result.summary.low > 0) {
            items.push(SpecSyncTreeItem.category('LOW Risk', this.result.summary.low, 'info'));
        }

        if (this.result.summary.total === 0) {
            items.push(SpecSyncTreeItem.empty('No issues found - Code and Spec are in sync'));
        }

        return items;
    }
}