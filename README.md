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

## Cloudflare Pages 发布

| 项目 | 值 |
| --- | --- |
| Pages 项目 | `fankai-projects` |
| 默认域名 | `fankai-projects.pages.dev` |
| 自定义域名 | `projects.fankai.me` |
| 生产分支 | `main` |
| 发布方式 | Wrangler Direct Upload，未关联 Git Provider |

更新时先运行 `node build.mjs`，检查并提交 `projects.json` 和生成的 `index.html`，再推送 GitHub。**仅 `git push` 不会更新线上站点。** GitHub API 请求失败时构建会保留旧值，因此发布前还须检查构建日志，不能把旧值称为本次已刷新。

只发布 `index.html` 与 `assets/` 中的静态资源，不上传整个仓库、源码、凭据或本地缓存。将这两项复制到仓库外的专用发布目录后执行：

```bash
wrangler pages deploy /absolute/path/to/public \
  --project-name fankai-projects \
  --branch main \
  --commit-hash "$(git rev-parse HEAD)" \
  --commit-dirty=false
```

命令需从本仓库已提交且无待发布修改的工作区运行，并使用已有的 Cloudflare 授权；不要把凭据写入仓库。发布后读取精确 deployment，确认生产环境、完整提交 SHA 和成功状态，再核对自定义域名上的页面与静态资源。

## 部署边界

构建脚本不执行 `git push`、部署或 DNS 变更。发布需要明确授权；本次更新不改变域名绑定、账户权限或部署方式。
