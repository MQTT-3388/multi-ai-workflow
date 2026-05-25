@echo off
chcp 65001 >nul
echo.
echo   ╔══════════════════════════════════╗
echo   ║  文档查看器 · 本地服务器          ║
echo   ║  multi-ai-workflow v2.1         ║
echo   ╚══════════════════════════════════╝
echo.
echo   启动本地服务器...
echo   浏览器将自动打开 http://localhost:3000/multi-ai-workflow.html
echo   按 Ctrl+C 停止服务器
echo.
npx serve . -p 3000 --no-clipboard
pause
