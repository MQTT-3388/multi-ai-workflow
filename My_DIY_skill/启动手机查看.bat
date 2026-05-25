@echo off
chcp 65001 >nul
echo.
echo   ╔══════════════════════════════════╗
echo   ║  手机扫码查看文档                  ║
echo   ║  multi-ai-workflow v2.1         ║
echo   ╚══════════════════════════════════╝
echo.
echo   正在获取本机 IP 地址...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do set IP=%%a
set IP=%IP: =%
echo.
echo   ┌──────────────────────────────────┐
echo   │  在手机浏览器打开:                │
echo   │  http://%IP%:3000/index.html     │
echo   └──────────────────────────────────┘
echo.
echo   正在启动服务器...
npx serve . -p 3000 --no-clipboard
pause
