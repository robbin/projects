#!/usr/bin/env node
// Build script: refresh star / language data from the public GitHub API,
// then render projects.json into a fully static index.html.
//
// Usage:
//   node build.mjs            # fetch GitHub metadata, then write index.html
//   node build.mjs --offline  # skip the network, render from projects.json
//
// No dependencies. Anonymous GitHub API access (60 requests/hour per IP).

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(ROOT, "projects.json");
const OUT_FILE = join(ROOT, "index.html");
const API = "https://api.github.com/repos/";

const offline = process.argv.includes("--offline");
const data = JSON.parse(await readFile(DATA_FILE, "utf8"));

// ---------------------------------------------------------------------------
// 1. GitHub metadata
// ---------------------------------------------------------------------------

async function fetchMeta(repo) {
  const res = await fetch(API + repo, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "projects-site-build",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return {
    stars: Number.isFinite(json.stargazers_count) ? json.stargazers_count : undefined,
    language: json.language ?? null,
  };
}

if (!offline) {
  for (const section of data.sections) {
    for (const project of section.projects) {
      try {
        const meta = await fetchMeta(project.repo);
        if (meta.stars !== undefined) project.stars = meta.stars;
        project.language = meta.language;
        console.log(`ok   ${project.repo}  ★${project.stars}  ${project.language ?? "-"}`);
      } catch (error) {
        // Keep whatever was cached in projects.json; never invent a number.
        // A missing value is simply not rendered.
        console.warn(`skip ${project.repo} (${error.message}) — keeping cached value`);
      }
    }
  }
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// 2. HTML rendering
// ---------------------------------------------------------------------------

const ARROW_UP_RIGHT =
  '<svg class="icon-arrow" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M3.2 8.8 8.8 3.2M4.4 3.2h4.4v4.4"/></svg>';

const escapeHtml = (value = "") =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );

const LANGUAGE_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572a5",
  Shell: "#89e051",
  Bash: "#89e051",
  Ruby: "#701516",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Go: "#00add8",
  Rust: "#dea584",
  Java: "#b07219",
  "C++": "#f34b7d",
};

const formatStars = (stars) => (stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : String(stars));

const ICONS = {
  x: '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
  youtube:
    '<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>',
  github:
    '<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>',
};

function renderSocial({ name, href, icon }) {
  return `<a class="social-link" href="${escapeHtml(href)}" title="${escapeHtml(name)}" aria-label="${escapeHtml(name)}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[icon] ?? ""}</svg>
        </a>`;
}

function renderCard(project) {
  const repoUrl = `https://github.com/${project.repo}`;
  const isFeatured = Boolean(project.featured);

  const highlights = project.highlights
    .map((item) => `          <li>${escapeHtml(item)}</li>`)
    .join("\n");

  const stack = project.stack
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const extraLinks = (project.links ?? [])
    .map(
      (link) =>
        `<a class="meta-link" href="${escapeHtml(link.href)}" target="_blank" rel="noopener">${escapeHtml(link.label)}${ARROW_UP_RIGHT}</a>`,
    )
    .join("\n        ");

  const stats = [];
  if (Number.isFinite(project.stars)) {
    stats.push(`<span class="stat" title="GitHub stars">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 2.5 2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96z"/></svg>
          ${formatStars(project.stars)}
        </span>`);
  }
  if (project.language) {
    const color = LANGUAGE_COLORS[project.language] ?? "var(--lang-fallback)";
    stats.push(`<span class="stat" title="主要语言">
          <span class="lang-dot" style="--lang-color:${color}"></span>${escapeHtml(project.language)}
        </span>`);
  }

  return `      <article class="card${isFeatured ? " card-featured" : ""}" id="${escapeHtml(project.name)}">
        <header class="card-head">
          <h3><a href="${repoUrl}" target="_blank" rel="noopener">${escapeHtml(project.name)}</a></h3>
          <a class="anchor" href="#${escapeHtml(project.name)}" aria-label="复制 ${escapeHtml(project.name)} 的链接" title="本项目链接">#</a>
          ${isFeatured ? '<span class="badge">精选</span>' : ""}
        </header>
        <p class="tagline">${escapeHtml(project.tagline).replace(/\n/g, "<br>")}</p>
        <ul class="highlights">
${highlights}
        </ul>
        <ul class="stack" aria-label="技术栈">
          ${stack}
        </ul>
        <footer class="card-foot">
          <a class="meta-link" href="${repoUrl}" target="_blank" rel="noopener">GitHub${ARROW_UP_RIGHT}</a>
        ${extraLinks}
          <div class="stats">
          ${stats.join("\n          ")}
          </div>
        </footer>
      </article>`;
}

function renderSection(section) {
  const cards = section.projects.map(renderCard).join("\n");
  return `    <section class="section" id="${escapeHtml(section.id)}" aria-labelledby="${escapeHtml(section.id)}-title">
      <div class="section-head">
        <h2 id="${escapeHtml(section.id)}-title"><span class="section-count">${String(section.projects.length).padStart(2, "0")}</span>${escapeHtml(section.title)}</h2>
        ${section.description ? `<p class="section-desc">${escapeHtml(section.description)}</p>` : ""}
      </div>
      <div class="list">
${cards}
      </div>
    </section>`;
}

const { site } = data;
const nav = site.nav
  .map(
    (item) =>
      `<a href="${escapeHtml(item.href)}" target="_blank" rel="noopener">${escapeHtml(item.label)}<span class="nav-arrow" aria-hidden="true">↗</span></a>`,
  )
  .join("\n        ");
const social = site.social.map(renderSocial).join("\n        ");
const sections = data.sections.map(renderSection).join("\n\n");
const allProjects = data.sections.flatMap((s) => s.projects);
const totalProjects = allProjects.length;
const totalStars = allProjects.reduce((n, p) => n + (Number.isFinite(p.stars) ? p.stars : 0), 0);
const recentCount = data.sections.find((s) => s.id === "recent")?.projects.length ?? 0;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-L73LSS6JJ1"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-L73LSS6JJ1');
  </script>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(site.title)}</title>
  <meta name="description" content="${escapeHtml(site.description)}">
  <link rel="icon" href="assets/favicon.png">
  <meta property="og:title" content="${escapeHtml(site.title)}">
  <meta property="og:description" content="${escapeHtml(site.description)}">
  <meta property="og:url" content="https://projects.fankai.me/">
  <meta name="twitter:card" content="summary">
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>
  <header class="site-header">
    <div class="header-bar">
      <a class="brand" href="/"><span class="brand-mark" aria-hidden="true">范</span>范凯<span class="brand-sep">/</span><span class="brand-en">Robbin</span></a>
      <nav class="site-nav" aria-label="主站导航">
        ${nav}
      </nav>
      <div class="social" aria-label="社交账号">
        ${social}
      </div>
    </div>
  </header>

  <section class="hero">
    <p class="hero-kicker">PROJECTS · 开源项目</p>
    <h1 class="hero-title">范凯 <span class="hero-en">Robbin</span></h1>
    <p class="identity">${escapeHtml(site.identity)}</p>
    <dl class="hero-stats">
      <div><dt>开源项目</dt><dd>${totalProjects}</dd></div>
      <div><dt>GitHub Stars</dt><dd>${totalStars.toLocaleString("en-US")}</dd></div>
      <div><dt>近期 AI / Agent</dt><dd>${recentCount}</dd></div>
    </dl>
  </section>

  <main>
${sections}
  </main>

  <footer class="site-footer">
    <span>${escapeHtml(site.domain)}</span>
    <span class="footer-sep" aria-hidden="true">·</span>
    <span>项目数据来自 <a href="https://github.com/robbin" target="_blank" rel="noopener">GitHub</a></span>
  </footer>
</body>
</html>
`;

await writeFile(OUT_FILE, html);
console.log(`wrote index.html (${data.sections.reduce((n, s) => n + s.projects.length, 0)} projects)`);
