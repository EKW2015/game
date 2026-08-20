@echo off
chcp 65001 >nul
echo 正在打开霓虹夜城飙车...
start "" "%~dp0racing.html"
if errorlevel 1 (
  echo 请用 Chrome 浏览器手动打开 racing.html
  pause
)
