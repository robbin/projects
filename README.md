# projects.fankai.me

范凯（Robbin）的项目展示页。纯静态单页，中文，支持深浅色（`prefers-color-scheme`），响应式。

`projects.json` 是唯一数据源；`build.mjs` 用匿名 GitHub API 刷新 star 数和主语言，并把数据渲染成静态 `index.html`。页面运行时**不发任何请求**（无 fetch、无框架、无第三方依赖）。

## 目录结构

```text
.
├── projects.json      # 站点文案 + 项目数据（唯一需要改的数据文件）
├── build.mjs          # 构建脚本：拉 GitHub 元数据 + 渲染 index.html
├── index.html         # 构建产物（生成，勿手改）
├── assets/style.css   # 样式（含浅色 / 深色主题）
├── shots/             # 截图：desktop.png (1280) / mobile.png (390)
├── NOTES.md           # README 与简报描述的差异记录
└── README.md
```

## 构建

```bash
node build.mjs            # 拉取 star / 主语言，然后生成 index.html
node build.mjs --offline  # 跳过网络，直接用 projects.json 渲染
```

- 只使用 Node 内置模块（Node 18+，当前在 Node 22 验证），没有 `package.json`，无需 `npm install`。
- 匿名访问 `api.github.com`，限额 60 次/小时/IP，本项目 7 个仓库足够。
- 某个仓库请求失败时**保留 `projects.json` 里已有的 star / language**，不写 0、不编造；字段缺失时卡片自动不显示该项，构建继续。加 `--offline` 可以在无法联网时稳定出页。
- 每次成功构建会把最新数据写回 `projects.json`；该文件应与 `index.html` 一起提交。

## 本地预览

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000/
```

## 加项目

编辑 `projects.json`，在对应 `sections[].projects` 里加一项：

```json
{
  "id": "example",
  "name": "example",
  "repo": "robbin/example",
  "featured": false,
  "tagline": "一句话说明解决什么问题。",
  "highlights": ["亮点 1", "亮点 2", "亮点 3"],
  "stack": ["Node.js", "SQLite"],
  "links": [{ "label": "在线站点", "href": "https://example.com/" }],
  "stars": 0,
  "language": null
}
```

| 字段 | 说明 |
| --- | --- |
| `id` | 唯一标识，用于锚点；建议与仓库名一致 |
| `name` | 卡片标题 |
| `repo` | `owner/name`，构建时据此取 star 和主语言，并生成 GitHub 链接 |
| `featured` | 可选，`true` 显示“精选”标识 |
| `tagline` | 一句话：解决什么问题 |
| `highlights` | 2–3 条亮点，纯文本 |
| `stack` | 技术栈标签数组 |
| `links` | 可选，额外链接（在线站点、文档等） |
| `stars` / `language` | 构建时自动覆盖；`language` 为 `null` 时隐藏语言 |

新增整个分区则在 `sections` 里加一项：`id`、`title`、`description`、`projects`。

站点标题、身份介绍、顶部导航和社交图标在 `projects.json` 的 `site` 字段里。社交图标目前支持 `x`、`youtube`、`github`（内联 SVG 在 `build.mjs` 的 `ICONS` 中）。

改完重新跑 `node build.mjs`，提交 `projects.json` 和 `index.html`。

## 截图

```bash
python3 -m http.server 8123 &
python3 - <<'PY'
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")  # 或去掉 channel 用 playwright 自带 chromium
    for name, width, height, scale in [("desktop", 1280, 900, 1), ("mobile", 390, 844, 2)]:
        ctx = b.new_context(viewport={"width": width, "height": height}, device_scale_factor=scale)
        page = ctx.new_page()
        page.goto("http://127.0.0.1:8123/", wait_until="networkidle")
        page.screenshot(path=f"shots/{name}.png", full_page=True)
        ctx.close()
    b.close()
PY
```

## Cloudflare Pages 设置

| 项目 | 值 |
| --- | --- |
| Framework preset | None |
| Build command | `node build.mjs` |
| Build output directory | `/` |
| Node version | 22（可用 `NODE_VERSION=22` 环境变量固定） |
| 自定义域名 | `projects.fankai.me` |

仓库根目录即站点根目录：`index.html`、`assets/style.css` 会被直接发布。构建时对 GitHub API 的匿名请求若被限速，会沿用仓库里上次写入的 star / 语言数据，页面照常生成；需要绝对可重复构建时可把构建命令改为 `node build.mjs --offline`，定期在本地跑完整构建并提交数据。

## 部署边界

本仓库不包含部署配置自动推送；没有 `git push`、没有 DNS 变更。域名与 Pages 项目由所有者手动绑定。
