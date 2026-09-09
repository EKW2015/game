@echo off
chcp 65001 >nul
echo 正在打开国际象棋...
start "" "%~dp0play.html"
if errorlevel 1 (
  echo 请用浏览器手动打开 play.html
  pause
)
