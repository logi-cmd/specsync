import * as vscode from 'vscode';
import { localize } from '../i18n';
import { SpecSyncTreeItem } from './treeItem';
import { ScanResult } from './types';

export class SpecSyncTreeProvider implements vscode.TreeDataProvider<SpecSyncTreeItem> {
    private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<SpecSyncTreeItem | undefined | void>();
    readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

    private result: ScanResult = {
        issues: [],
        summary: { total: 0, high: 0, medium: 0, low: 0 },
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
        // If element is provided, return its children
        if (element) {
            if (element.kind === 'category') {
                // Return issues for this category
                const label = element.label?.toString() || '';
                let severity: 'high' | 'medium' | 'low';
                
                if (label.includes('HIGH') || label.includes(localize('severity.high'))) severity = 'high';
                else if (label.includes('MEDIUM') || label.includes(localize('severity.medium'))) severity = 'medium';
                else severity = 'low';
                
                return this.result.issues
                    .filter(i => i.severity === severity)
                    .map(i => SpecSyncTreeItem.issue(i));
            }
            return [];
        }

        // Root level - build structured view
        const items: SpecSyncTreeItem[] = [];

        // === SECTION 1: OVERVIEW ===
        items.push(SpecSyncTreeItem.header('📊 ' + localize('tree.section.overview')));
        items.push(SpecSyncTreeItem.stat(localize('tree.stat.total'), String(this.result.summary.total), 'list-unordered'));
        items.push(SpecSyncTreeItem.stat(localize('tree.stat.specs'), String(this.result.specCount), 'file-code'));
        
        // Separator line effect with empty item
        if (this.result.summary.total > 0) {
            items.push(new SpecSyncTreeItem('', vscode.TreeItemCollapsibleState.None, 'empty'));
            
            // === SECTION 2: ISSUES BY SEVERITY ===
            items.push(SpecSyncTreeItem.header('⚠️ ' + localize('tree.section.issues')));
            
            if (this.result.summary.high > 0) {
                items.push(SpecSyncTreeItem.category(`[${localize('severity.high')}] ` + localize('tree.priority.high'), this.result.summary.high, 'high'));
            }
            if (this.result.summary.medium > 0) {
                items.push(SpecSyncTreeItem.category(`[${localize('severity.medium')}] ` + localize('tree.priority.medium'), this.result.summary.medium, 'medium'));
            }
            if (this.result.summary.low > 0) {
                items.push(SpecSyncTreeItem.category(`[${localize('severity.low')}] ` + localize('tree.priority.low'), this.result.summary.low, 'low'));
            }
        } else if (this.result.specCount > 0) {
            // No issues found
            items.push(new SpecSyncTreeItem('', vscode.TreeItemCollapsibleState.None, 'empty'));
            items.push(SpecSyncTreeItem.empty('✅ ' + localize('tree.status.synced')));
        } else {
            // No scan yet
            items.push(new SpecSyncTreeItem('', vscode.TreeItemCollapsibleState.None, 'empty'));
            items.push(SpecSyncTreeItem.empty(localize('tree.status.start')));
        }

        // === SECTION 3: ACTIONS ===
        items.push(new SpecSyncTreeItem('', vscode.TreeItemCollapsibleState.None, 'empty'));
        items.push(SpecSyncTreeItem.header('🚀 ' + localize('tree.section.actions')));
        
        const scanItem = new SpecSyncTreeItem(localize('tree.action.scan'), vscode.TreeItemCollapsibleState.None, 'summary');
        scanItem.iconPath = new vscode.ThemeIcon('play');
        scanItem.command = { command: 'specsync.scanSync', title: localize('command.scanSync') };
        items.push(scanItem);
        
        const welcomeItem = new SpecSyncTreeItem(localize('tree.action.welcome'), vscode.TreeItemCollapsibleState.None, 'summary');
        welcomeItem.iconPath = new vscode.ThemeIcon('book');
        welcomeItem.command = { command: 'specsync.showWelcome', title: localize('command.showWelcome') };
        items.push(welcomeItem);

        return items;
    }
}