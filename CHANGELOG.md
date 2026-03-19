# Changelog

All notable changes to SpecSync will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Planned
- [ ] CLI tool for CI/CD integration
- [ ] Team collaboration features
- [ ] Support for more languages (Go, Rust)
- [ ] Auto-fix suggestions
- [ ] Web dashboard for analytics

## [0.0.6] - 2026-03-20

### Added
- **Internationalization (i18n)**: Full support for English and Chinese
  - Auto-detects VS Code language setting
  - All UI elements translated (commands, panels, messages, welcome page)
  - Easy to add more languages

## [0.0.5] - 2026-03-20

### Changed
- **README**: Fix incorrect links and remove misleading information
  - Fix badge URLs to point to correct repository (logi-cmd/specsync)
  - Remove fake contact information (email, Discord)
  - Remove Pro version mentions and specific timeline promises
  - Simplify roadmap to avoid over-promising

## [0.0.4] - 2026-03-20

### Added
- **Welcome Page Command**: Added `SpecSync: Show Welcome Page` command
- **Panel Redesign**: Modular layout with sections
  - SCAN OVERVIEW section
  - ISSUES BY SEVERITY section (expandable categories)
  - QUICK ACTIONS section
- Improved issue display with [H]/[M]/[L] labels

## [0.0.3] - 2026-03-20

### Added
- **Welcome Page Command**: Added `SpecSync: Show Welcome Page` command to manually open welcome page
- **UI Improvements**: 
  - Theme-aware welcome page (dark/light mode support)
  - Categorized issue display in panel (HIGH/MED/LOW)
  - Enhanced tooltips with Markdown formatting
  - Better visual hierarchy in tree view

### Changed
- Improved panel layout with collapsible severity categories
- Updated severity labels to use [H]/[M]/[L] format for clarity

## [0.0.2] - 2026-03-20

### Fixed
- **Critical**: Added `typescript` to dependencies to fix activation error
- Extension now loads correctly after installation

### Changed
- Package now includes TypeScript compiler (11.88MB)
- Publisher ID updated to `logi-cmd`

## [0.0.1] - 2026-03-19

### Added
- **Initial Release**: SpecSync VS Code Extension
- **Core Features**:
  - Detect API documentation inconsistencies
  - Support TypeScript, Python, Java, Kotlin
  - AST-based code analysis
  - Real-time scanning on file save
  - VS Code panel integration
- **5 Detection Types**:
  - API implementation missing
  - Request/response field missing
  - Type mismatch between spec and code
  - Constraints not implemented
  - Business rules not implemented
- **Examples**: Login API and User API samples
