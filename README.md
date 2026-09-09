# ♛ 国际象棋

网页版国际象棋：人机对战或双人对弈，规则完整（王车易位、吃过路兵、升变、将死 / 逼和）。

## 在线玩

打开仓库里的 **play.html**，或发布后的 GitHub Pages 页面。

- 建议用 **Chrome** 打开
- 手机可以直接点按棋盘

## 下载玩

1. 下载 `play.html`
2. 双击打开（Windows 也可双击 `打开游戏.bat`）

## 操作

- 点自己的棋子，再点高亮格子走棋
- 兵走到底线可选择升变
- **悔棋** / **提示** / **翻转棋盘** / **认输**
- 人机可执白或执黑，难度：初级 / 中级 / 高级
- Ctrl+Z 悔棋，Esc 取消选择

## 本地开发

```bash
python3 -m http.server 4173
# 浏览器打开 http://localhost:4173/
```

```bash
node tools/smoke.js      # 规则与 AI 测试
node tools/build-play.js # 打包 play.html 与 docs/index.html
```
