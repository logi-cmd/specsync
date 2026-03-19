import * as vscode from 'vscode';
import { Inconsistency } from '../sync/syncEngine';

export interface ScanIssueLocation {
    uri: vscode.Uri;
    line: number;
    column?: number;
}

export interface ScanIssue extends Inconsistency {
    id: string;
    specFile: vscode.Uri;
    codeFile?: vscode.Uri;
    specLocation: ScanIssueLocation;
    codeLocation?: ScanIssueLocation;
    target: ScanIssueLocation;
}

export interface ScanSummary {
    total: number;
    high: number;
    medium: number;
    low: number;
}

export interface ScanResult {
    issues: ScanIssue[];
    summary: ScanSummary;
    specCount: number;
}
