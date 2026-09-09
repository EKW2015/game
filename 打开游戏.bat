@echo off
chcp 65001 >nul
echo 正在打开 3D 斗罗大陆：光明圣龙...
start "" "%~dp0play.html"
if errorlevel 1 (
  echo 请用 Chrome 浏览器手动打开 play.html
  pause
)
