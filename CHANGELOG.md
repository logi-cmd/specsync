# Changelog

All notable changes to the SpecSync extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.0.2] - 2026-03-20

### Fixed
- **Critical**: Added `typescript` to dependencies to fix "Cannot find module 'typescript'" error
- Extension now activates correctly after installation

### Changed
- Package size increased to include TypeScript compiler for AST parsing
- Updated publisher ID from `specsync` to `logi-cmd`

## [0.0.1] - 2026-03-19

### Added
- **Initial Release**: SpecSync VS Code Extension
- **Multi-language Support**: TypeScript, Python, Java, Kotlin
- **AST Deep Analysis**: Detect validation logic in code
- **Real-time Sync Detection**: Find inconsistencies between Spec and Code
- **5 Inconsistency Types**:
  - API missing
  - Field missing
  - Type mismatch
  - Constraint not implemented
  - Business rule not implemented
- **VS Code Integration**: Native tree view panel
- **Welcome Page**: First-time user guide
- **Auto-scan on Save**: Optional automatic scanning
- **Click to Navigate**: Jump to issue locations
- **Examples**: Login API and User API samples

### Features
- Spec file pattern: `**/*.spec.md` and `**/spec/*.md`
- Support for decorators: `@Spec`, `@Validate`, `@Rule`
- Risk levels: High, Medium, Low
- Configuration options in VS Code settings

### Technical
- TypeScript Compiler API for AST parsing
- Language Parser architecture for extensibility
- 97.6% test coverage
- Performance: <50ms for 100 APIs
