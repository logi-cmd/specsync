import * as vscode from 'vscode';

// Simple i18n implementation without vscode-nls complexity
const messages: Record<string, Record<string, string>> = {
  en: {
    'scan.progress.title': 'SpecSync Scanning Workspace',
    'scan.noSpecFiles': 'No Spec files found. Please check specsync.specPatterns configuration.',
    'scan.complete.message': 'Scan complete: {0} Spec(s), found {1} issue(s) (H: {2} / M: {3} / L: {4})',
    'scan.tree.noSpecFiles': 'No Spec files to scan',
    'scan.tree.noIssues': 'Scanned {0} Spec(s), no inconsistencies found',
    'scan.tree.scanned': 'Scanned {0} Spec(s)',
    'welcome.title': 'Welcome to SpecSync',
    'welcome.panel.title': 'Welcome',
    'issue.missing.code': 'Code file not found: {0}.{1}',
    'error.create.example': 'Please open a workspace first',
    'info.panel.opened': "SpecSync panel opened, run 'SpecSync: Scan Sync' to start scanning.",
    'info.example.created': "Example files created! Run 'SpecSync: Scan Sync' to start detection.",
    'severity.high': 'High',
    'severity.medium': 'Medium',
    'severity.low': 'Low',
    'tree.section.overview': 'SCAN OVERVIEW',
    'tree.stat.total': 'Total Issues',
    'tree.stat.specs': 'Spec Files',
    'tree.section.issues': 'ISSUES BY SEVERITY',
    'tree.priority.high': 'PRIORITY',
    'tree.priority.medium': 'PRIORITY',
    'tree.priority.low': 'PRIORITY',
    'tree.status.synced': 'All specs are in sync with code!',
    'tree.status.start': "Run 'SpecSync: Scan Sync' to start",
    'tree.section.actions': 'QUICK ACTIONS',
    'tree.action.scan': 'Scan Workspace',
    'tree.action.welcome': 'Open Welcome Page'
  },
  'zh-cn': {
    'scan.progress.title': 'SpecSync 正在扫描工作区',
    'scan.noSpecFiles': '未找到 Spec 文件，请检查 specsync.specPatterns 配置。',
    'scan.complete.message': '扫描完成：{0} 个 Spec，发现 {1} 个问题（高 {2} / 中 {3} / 低 {4}）。',
    'scan.tree.noSpecFiles': '未找到可扫描的 Spec 文件',
    'scan.tree.noIssues': '已扫描 {0} 个 Spec，未发现不一致项',
    'scan.tree.scanned': '已扫描 {0} 个 Spec',
    'welcome.title': '欢迎使用 SpecSync',
    'welcome.panel.title': '欢迎',
    'issue.missing.code': '未找到对应代码文件：{0}.{1}',
    'error.create.example': '请先打开一个工作区',
    'info.panel.opened': "SpecSync 视图已打开，运行 'SpecSync: 扫描同步' 开始扫描。",
    'info.example.created': "示例文件已创建！运行 'SpecSync: 扫描同步' 开始检测。",
    'severity.high': '高',
    'severity.medium': '中',
    'severity.low': '低',
    'tree.section.overview': '扫描概览',
    'tree.stat.total': '问题总数',
    'tree.stat.specs': 'Spec 文件数',
    'tree.section.issues': '问题分级',
    'tree.priority.high': '优先级',
    'tree.priority.medium': '优先级',
    'tree.priority.low': '优先级',
    'tree.status.synced': '所有 Spec 与代码同步！',
    'tree.status.start': "运行 'SpecSync: 扫描同步' 开始",
    'tree.section.actions': '快速操作',
    'tree.action.scan': '扫描工作区',
    'tree.action.welcome': '打开欢迎页'
  }
};

let currentLocale = vscode.env.language;

// Listen for locale changes
vscode.env.onDidChangeShell(() => {
  currentLocale = vscode.env.language;
});

export function localize(key: string, ...args: (string | number)[]): string {
  // Get messages for current locale, fallback to English
  const localeMessages = messages[currentLocale.toLowerCase()] || messages['en'];
  let message = localeMessages[key] || messages['en'][key] || key;
  
  // Replace placeholders {0}, {1}, etc.
  args.forEach((arg, index) => {
    message = message.replace(`{${index}}`, String(arg));
  });
  
  return message;
}
