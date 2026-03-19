# SpecSync - Spec与代码同步工具

## 项目概述
VS Code插件，实现Spec文件和代码的双向同步检测。

## 技术栈
- TypeScript + VS Code Extension API
- Tree-sitter（代码解析）
- gray-matter（YAML frontmatter解析）

## MVP目标
实现能解析Spec和代码，并检测不一致的基础引擎。

## 验收标准
- [ ] 能正确解析示例Spec文件
- [ ] 能正确解析示例TypeScript代码
- [ ] 能输出不一致检测报告
- [ ] 所有核心函数有单元测试

## 本周任务
1. 创建项目结构（使用yo code生成）
2. 实现Spec解析器（解析Markdown+YAML格式）
3. 实现代码解析器（用Tree-sitter解析TypeScript）
4. 实现同步引擎（对比两者，检测不一致）
5. 写单元测试

## 交付物
- 完整代码提交到GitHub
- README（如何运行）
- 测试报告
