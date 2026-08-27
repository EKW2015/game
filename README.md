# 🦖 无限恐龙世界 3D

浏览器里就能玩的第一人称恐龙生存游戏：在无限草地上探索、捕食、进化。

仓库里还有一款未合并的 **霓虹夜城飙车**（见下方）。

---

## 立刻玩（最稳）

1. 下载恐龙游戏：**https://github.com/EKW2015/game/raw/main/play.html**
2. 文件大约 **700KB**
3. **用 Chrome 双击打开**（Windows 也可双击 `打开游戏.bat`）
4. **不要用微信内置浏览器**

赛车（还在 Pull Request 里，未进 main）：

- 下载：**https://github.com/EKW2015/game/raw/cursor/night-city-racing-cd71/racing.html**
- PR：https://github.com/EKW2015/game/pull/13

---

## 为什么网页版打不开

- README 里以前的 Cloudflare 临时隧道会过期，现在已经失效。
- GitHub Pages **还没在仓库设置里打开**，所以  
  https://ekw2015.github.io/game/ 会 **404**。

要让网页永久在线，仓库主人打开一次即可：

1. 打开 https://github.com/EKW2015/game/settings/pages
2. **Source** 选 **Deploy from a branch**
3. **Branch** 选 `gh-pages`，文件夹选 `/ (root)`
4. 点 **Save**
5. 一两分钟后访问：**https://ekw2015.github.io/game/**

`gh-pages` 分支上已有 `index.html`（恐龙）和 `racing.html`（赛车）。

---

## 操作（恐龙）

- 方向键 / WASD：移动
- 空格：咬击
- 吃比自己小的恐龙会变大进化：幼龙 → 猎手 → 霸主 → 传说

---

## 源码结构

- `index.html` + `js/` + `css/`：模块版
- `play.html`：打包好的单文件，离线可玩
- `docs/`：给 GitHub Pages 用的拷贝
- `tools/build-play.js`：重新打包 `play.html`
