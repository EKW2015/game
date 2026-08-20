# 🎮 小游戏合集

| 游戏 | 单文件（下载双击玩） | 开发版 |
| --- | --- | --- |
| 🏎️ 霓虹夜城飙车 3D | [racing.html](https://github.com/EKW2015/game/raw/main/racing.html) | `racing/index.html` |
| 🦖 恐龙生存 3D | [play.html](https://github.com/EKW2015/game/raw/main/play.html) | `index.html` |

---

## 🏎️ 霓虹夜城飙车 3D（新）

夜晚的霓虹都市，开着跑车在无限延伸的街道上狂飙：手刹甩尾攒氮气，穿过青色光门换取时间。

### 怎么玩

1. 下载 **https://github.com/EKW2015/game/raw/main/racing.html** （约 750KB）
2. **双击** `racing.html`（Windows 也可双击 `打开赛车游戏.bat`）
3. 用 **Chrome** 打开，不要用微信内置浏览器

### 操作

| 按键 | 作用 |
| --- | --- |
| `W` / `↑` | 油门 |
| `S` / `↓` | 刹车、倒车 |
| `A` `D` / `←` `→` | 转向 |
| `空格` | 手刹漂移 |
| `Shift` | 氮气加速 |
| `C` | 跟车 / 车内视角 |
| `R` | 卡住了就回到路面 |
| `P` | 暂停 |

手机横屏打开会自动出现触屏按钮。

### 两种模式

- **计时冲关**：60 秒起步，每穿过一个光门 +16 秒。光门位置看屏幕顶部的箭头、小地图上的绿点，或者天上那道冲天的青色光柱。
- **自由驾驶**：没有计时，随便逛、随便甩尾。

### 得分

- 穿过光门：`150 × 连击` + 速度奖励，连击最高 x9（撞车会清零）
- 漂移：滑移角越大、速度越快，攒的分越多，脱离漂移时结算
- 漂移同时回充氮气，氮气能把极速从 190 拉到 210+ km/h

想看效果又懒得开车？打开 `racing/index.html#demo`，AI 会自己开给你看。

---

## 🦖 恐龙生存 3D

第一人称无限恐龙世界：吃掉比自己小的恐龙，不断进化变大。

- 下载 **https://github.com/EKW2015/game/raw/main/play.html**（约 700KB），双击打开
- 方向键 / WASD 移动，空格咬击

---

## 开发

纯静态项目，没有依赖，改完源码重新打包即可：

```bash
node tools/build-racing.js   # racing/ -> racing.html + docs/racing.html
node tools/build-play.js     # js/ -> play.html
node tools/smoke-racing.js   # 赛车逻辑自测（物理 / 碰撞 / 计分）
node tools/smoke.js          # 恐龙游戏自测
```

- 赛车源码在 `racing/`：`citymap.js` 城市网格与碰撞、`car.js` 车辆物理、`racegame.js` 规则、
  `city3d.js` 夜城场景、`rrender.js` 渲染与相机、`rmain.js` 输入与 HUD
- 物理、碰撞、计分都不依赖 THREE，所以能在 Node 里直接跑测试
