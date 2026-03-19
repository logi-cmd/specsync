@echo off
REM SpecSync项目初始化脚本

echo ==========================================
echo SpecSync 项目初始化
echo ==========================================

REM 进入项目目录
cd /d C:\Users\97504\.openclaw\workspace\projects\specsync

echo.
echo [1/4] 检查Node.js...
node --version
if errorlevel 1 (
    echo 错误：Node.js未安装，请先安装Node.js
    exit /b 1
)

echo.
echo [2/4] 安装yo和generator-code...
npm install -g yo generator-code

echo.
echo [3/4] 生成VS Code插件脚手架...
npx yo code

echo.
echo [4/4] 安装项目依赖...
if exist package.json (
    npm install
    npm install tree-sitter tree-sitter-typescript gray-matter
    echo.
    echo 安装完成！
) else (
    echo 警告：未找到package.json，请先运行yo code生成项目
)

echo.
echo ==========================================
echo 初始化完成！
echo 下一步：请运行 'npm run compile' 编译项目
echo ==========================================
pause
