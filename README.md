# Asker · Personal Archive 2.0

一个用来分享个人喜好、生活片段与小项目的个人网站。以档案、杂志式版面为视觉方向，使用灰白纸面、细线、等宽编号和浅绿色点缀，记录喜欢的作品，也记录正在发生的生活。

**访问网站：[ch20070319-glitch.github.io](https://ch20070319-glitch.github.io/)**

## 主要内容

| 导航 | 内容 |
| --- | --- |
| Home | 个人头像、签名、首页插画与站点介绍 |
| Collection | 漫画、轻小说收藏，点击查看个人感想 |
| Gallery | 生活照片与图片预览，支持前后切换 |
| Games | 游戏推荐、个人评分、感想与 Steam 主页 |
| Music | 网易云歌单、年份合集、歌曲分页与全站播放器 |
| Explore | 正在完善的 noter 日常账本、MOYUKER 摸鱼小测试，以及 Asker 的 OC 人设图 |
| Contact | 邮箱、GitHub、QQ 等联系入口 |

顶部显示北京时间与沈阳天气；支持深浅主题切换。页面适配桌面与手机，图片预览、按钮和导航提供键盘操作及必要的无障碍标签。

## 技术栈

- **HTML5 / CSS3**：语义化页面，Grid、Flexbox、媒体查询、CSS 变量与动画实现版式、响应式布局和主题切换。
- **原生 JavaScript**：Hash 路由、收藏内容渲染、相册预览、歌单筛选、分页与播放控制，不依赖前端框架或打包工具。
- **HTMLAudioElement**：原生音频播放，配合自定义播放器实现播放暂停、上一首、下一首、进度、音量与循环模式。
- **Python 3 标准库**：站长在本机同步网易云公开歌单，生成静态数据；也提供可选的本地静态预览服务。
- **GitHub Pages**：托管 HTML、脚本、样式、图片与歌单数据。访客访问时不需要 Python、数据库或管理员服务。
- **外部数据源**：Open-Meteo 提供天气；网易云公开接口用于本机同步歌单，公开音源用于播放。

## 工作原理

### 页面切换与持续播放

导航使用 `#home`、`#music` 等 URL Hash。脚本根据 Hash 显示对应的页面区块，并更新导航状态和页面标题，不重新加载整个文档。

全站只保留一个位于页面区块之外的 `<audio>` 元素。因此，切换首页、相册或探索计划时，正在播放的音乐会继续。浏览其他歌单与切换分页不会立即更换播放队列；点击歌曲或“播放此歌单”后才切换。刷新网页或关闭浏览器会结束本次播放。

### 歌单文件配置

```text
站长编辑 playlists.json
          ↓
本机运行 sync_playlists.py
          ↓
读取公开歌单名称、封面和歌曲信息
          ↓
生成 music-config.js 与 music-data/*.js
          ↓
提交到 GitHub → GitHub Pages 发布 → 所有访客读取相同数据
```

`playlists.json` 是站长维护的歌单清单，`music-config.js` 是生成的索引；每张歌单的歌曲单独保存于 `music-data/`，选择歌单时再加载。浏览歌单不依赖实时歌单 API，也不依赖访客浏览器的 localStorage。

网站没有在线添加、删除或管理员登录入口。修改权由 GitHub 仓库权限控制；访客只能浏览和播放。关闭网页、换浏览器后，已发布的歌单仍然存在。网易云中的修改不会自动同步到本站，需要站长重新运行脚本并发布。

### 年份合集与分页

歌单名中的 `26 chapter1`、`2026 Chapter 1` 等格式会被识别为年份与月份，自动归入对应年份合集。年份从新到旧，同一年按 12 月至 1 月排序；没有月份的年度合集排在该年月份歌单之后，无法识别年份的歌单归入“其他歌单”。新年份会自动生成对应合集。

歌单封面每页显示 8 张，歌曲列表每页显示 30 首。

## 本地运行

克隆仓库后，可以直接打开 `index.html`；推荐使用 Python 3 启动预览：

```bash
python preview.py --port 8765
```

访问 [本地预览](http://127.0.0.1:8765/)。Windows 用户也可以双击 `start-preview.cmd`。预览服务仅监听本机，提供静态文件，没有登录或写入接口。

## 管理歌单

Windows 用户双击 `manage-playlists.cmd`，可在终端中添加、移除或同步歌单；双击 `update-playlists.cmd` 可同步全部歌单。

也可以编辑 `playlists.json`：

```json
{
  "playlists": [
    { "id": "3208030727", "label": "我的默认歌单" }
  ]
}
```

`id` 为网易云歌单 ID；`label` 是方便自己识别的备注，不会覆盖同步得到的原歌单名。请在现有数组里增删条目，保留需要的其他歌单。

```bash
python sync_playlists.py
python sync_playlists.py --add 3208030727
python sync_playlists.py --remove 3208030727
```

同步需要网络和公开歌单。脚本会读取名称、封面与歌曲信息；同步失败时保留原索引，并提示失败的歌单。修改后应将 `playlists.json`、`music-config.js`、`music-data/` 以及脚本更新的 `index.html` 一起提交发布。

## 目录结构

```text
index.html             页面结构、主要样式与 Hash 路由
personal.js            时钟与天气
books.js               漫画、轻小说收藏数据
album.js               相册预览交互
music.css / music.js    歌单页面与全站播放器
playlist-groups.js     年份、月份识别和排序
playlists.json         站长维护的歌单清单
music-config.js        自动生成的歌单索引
music-data/            自动生成的歌曲快照
assets/                图片、原背景音乐、项目 Logo 与 OC 图
sync_playlists.py      本机歌单同步脚本
preview.py             可选的本地静态服务器
.nojekyll              让 GitHub Pages 直接提供静态文件
```

仓库中可能仍保留早期版本的素材与文件；当前页面使用的资源集中在 `assets/`。`.private/`、缓存和本地数据库不参与发布，也不应提交。

## 部署与更新

本站发布于用户站点仓库 `ch20070319-glitch/ch20070319-glitch.github.io`。GitHub Pages 使用 `main` 分支根目录作为来源，提交推送后自动构建部署。可以在仓库的 **Actions** 中查看 `pages build and deployment` 状态。

在与远端同步的本地仓库中完成修改后：

```bash
git add index.html assets music.js music.css personal.js album.js books.js playlist-groups.js playlists.json music-config.js music-data README.md
git commit -m "Update personal archive"
git push origin main
```

首次部署还需将其余运行文件和 `.nojekyll` 一起提交。本项目不需要 npm 安装、前端构建命令或常驻后端服务。

## 播放与素材说明

歌单快照保存的是歌曲名称、歌手、封面与公开音源链接，不会批量下载音乐。部分歌曲可能因版权、区域、会员限制或音源失效无法播放，可切换歌曲或前往网易云收听；浏览器通常需要用户点击播放后才允许发声。

站内收藏封面、游戏图片、音乐与插画属于相应权利人，用于个人展示与分享。noter 项目图标使用 AI 辅助创作；MOYUKER 项目形象与 Asker OC 设定图用于展示个人项目和角色设定。
