@echo off
chcp 65001 >nul
echo 正在打开台球游戏...
start "" "%~dp0pool.html"
if errorlevel 1 (
  echo 请用 Chrome 浏览器手动打开 pool.html
  pause
)
