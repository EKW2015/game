@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在用浏览器打开 3D 斗罗大陆（play.html）...
where chrome >nul 2>nul && (
  start "" chrome "%cd%\play.html"
) || where msedge >nul 2>nul && (
  start "" msedge "%cd%\play.html"
) || (
  start "" "%cd%\play.html"
)
echo 如果没有出现游戏画面：请右键 play.html - 打开方式 - Google Chrome
echo 不要用微信，也不要打开 GitHub 源码页。
pause
