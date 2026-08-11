<div align="center">

# CS Conference Logo Maintainer

Maintain CCF conference logo assets with a one-shot code agent workflow.

<p>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-0f766e"></a>
  <a href="https://xinbaoqiao.github.io/CS-Conference-Logo-Maintainer/"><img alt="Live Logo Finder" src="https://img.shields.io/badge/live-Logo%20Finder-e3a329"></a>
  <img alt="Scope: CCF A/B/C" src="https://img.shields.io/badge/scope-CCF%20A%2FB%2FC-2563eb">
  <img alt="Mode: One Shot" src="https://img.shields.io/badge/mode-One--Shot-7c2d92">
  <img alt="Output: Logos and Reports" src="https://img.shields.io/badge/output-Logos%20%2B%20Reports-a21d16">
</p>

<p>
  <a href="#english">English</a> ·
  <a href="#zh-cn">中文</a> ·
  <a href="https://xinbaoqiao.github.io/CS-Conference-Logo-Maintainer/">Live Logo Index</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#master-prompt">Master Prompt</a>
</p>

</div>

<a id="english"></a>

## English

CS Conference Logo Maintainer helps a code agent maintain CCF conference logo assets end to end.

It is designed for users who want a clean, reusable logo asset set without manually visiting hundreds of conference websites or running maintenance scripts themselves.

If you do not want to maintain the assets yourself, bookmark this repository and its reports; the included GitHub Actions workflow refreshes year/city/venue-sensitive logos to a staging branch on the first day of each month, merges that branch into `main` on the 10th, and runs a full logo refresh once per year.

### Live Logo Index

**[Open the conference Logo Finder →](https://xinbaoqiao.github.io/CS-Conference-Logo-Maintainer/)**

Search by acronym, full conference name, DBLP key, conference ID, or topic; then filter by the latest indexed conference edition and CCF rank. Available records link directly to the maintained local asset, the conference site, and the recorded logo source.

The site reads `manifest.json` and `assets/logos/` directly from the Pages artifact, so there is no second conference list to keep in sync. `conference_year` is shown as the latest indexed conference edition, not as proof that the image itself was created for that year. Historical-year retrieval will require a future manifest and UI extension that explicitly records each archived year-to-file mapping; the current collection is a latest-snapshot catalog.

### Highlights

| Feature | Why it helps |
|---|---|
| One-shot maintenance | The agent handles refresh, repair, audit, reporting, and optional downstream sync in one request. |
| Scheduled GitHub updates | The repository refreshes focus logos to a staging branch on the first day of each month, merges them on the 10th, and runs a full refresh annually. |
| CCF-focused coverage | The workflow targets CCF A/B/C conference records instead of arbitrary web search results. |
| Manual correction support | Confirmed logo URLs are used directly, while conferences marked as logo-unavailable remain intentionally blank. |
| False-positive resistance | The agent avoids speaker portraits, venue photos, sponsor marks, generic society logos, UI icons, and unrelated acronym matches. |
| Annual refresh tracking | Logos with year, city, or venue signals are surfaced for future updates. |
| White-logo warning | White or transparent logos are flagged because they may disappear on white backgrounds. |

### Update Workflow

| Time | What happens | Result |
|---|---|---|
| Every month, day 1 | The scheduled workflow refreshes logos already marked as year/city/venue-sensitive. | Changes are committed to the `scheduled-logo-maintenance` staging branch, and an email review reminder is sent if notification secrets are configured. |
| Every month, day 10 | If no manual action is taken, the staging branch is merged into `main` automatically. | The public asset set and reports receive the monthly refresh, and the staging branch is deleted. |
| Every January | The day-1 update uses a full refresh instead of only the sensitive-logo subset. | All CCF A/B/C conference logos are reconsidered once per year. |
| Any time | Manual correction records can pin exact logo URLs or mark conferences as intentionally blank. | Hard-to-resolve conferences stay stable and known false positives do not return. |

Each update regenerates the manifest, maintenance checklist, yearly-refresh report, white-logo watchlist, and integrity audit report before publishing changes.
The branch policy is intentionally simple: outside the review window there is only `main`; between day 1 and day 10 there may be one extra branch, `scheduled-logo-maintenance`.

To enable email reminders, configure the repository variable `NOTIFY_EMAIL` and SMTP secrets `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and optionally `SMTP_FROM`.

### At A Glance

| You provide | The agent prepares |
|---|---|
| This repository | Updated CCF conference logo assets |
| Optional manual correction notes | Exact-logo overrides or intentionally blank entries |
| Optional downstream project path | Synchronized logo copy when available |
| One maintenance request | Final summary with asset counts, skipped entries, and remaining manual checks |

### What This Project Provides

| Area | What you get |
|---|---|
| Assets | Maintained CCF conference logo files under `assets/logos` |
| Metadata | A machine-readable manifest for downstream automation |
| Website | A dependency-free search interface deployed from the same manifest and assets |
| Checklist | A human-readable maintenance list for missing or yearly-sensitive logos |
| Reports | Yearly-refresh priorities, white-logo warnings, and integrity audit results |
| Integration | Optional asset sync for Better-Poster-Skill when both projects are in the same workspace |

<a id="quick-start"></a>

### Quick Start

Install this repository for Codex:

```bash
mkdir -p ~/.codex/skills
cp -R CS-Conference-Logo-Maintainer ~/.codex/skills/conference-logo-maintainer
```

Then ask the code agent to update the conference logo assets:

```text
Use $conference-logo-maintainer to update the CCF conference logo assets.

Please complete the whole workflow automatically:
- refresh or repair conference logos;
- apply manual correction records;
- keep hard-to-resolve logo entries blank when required;
- flag year/city/venue-sensitive logos;
- flag white or transparent logos;
- sync the final assets to Better-Poster-Skill if available;
- report the final asset count, skipped entries, validation result, and remaining manual-review items.
```

The agent will use the bundled instructions to complete the maintenance run and report the final result.

To publish the search interface, select **Settings → Pages → Build and deployment → GitHub Actions** once. The bundled Pages workflow then rebuilds the site whenever `main` receives changes to the UI, manifest, or logo assets. For a local artifact check, run:

```bash
python scripts/build_site.py --check
python scripts/build_site.py --output .site-preview
python -m http.server --directory .site-preview 8000
```

Remove `.site-preview` after reviewing it; the directory is build output and must not be committed.

<a id="master-prompt"></a>

### Master Prompt

Copy this prompt into your code agent when you want a full one-shot maintenance run:

```text
You are maintaining CS Conference Logo Maintainer.

Goal:
Update the CCF conference logo assets end to end and produce a final, validated asset set.

Requirements:
1. Refresh CCF A/B/C conference logo assets using the existing CS Conference Logo Maintainer logic.
2. Preserve confirmed good existing logos unless a better official source is found.
3. Apply manual correction records:
   - Conferences absent from manual corrections must continue through the normal automated tracking flow.
   - Conferences marked as having an exact logo must use the configured official logo URL or yearly URL template first.
   - Yearly URL templates must be rendered from the latest CCFDDL conference year, not from a previously downloaded logo URL.
   - Conferences marked as having only a website and no reliable logo must remain blank and must not be crawled.
4. Detect and avoid false positives such as speaker portraits, venue photos, sponsor marks, society logos, UI icons, and unrelated acronym matches.
5. Identify logos that should be prioritized for future yearly refresh because they contain year, city, or venue signals.
6. Identify white or transparent logos that may be invisible on white backgrounds and report them clearly.
7. Sync the final logo assets into the downstream project logo directory if one is present.
8. Validate that the maintained logo directory and downstream copy have matching file names and hashes.

Deliverables:
- Updated logo assets.
- Updated machine-readable manifest.
- Updated human-readable maintenance checklist.
- Updated yearly-refresh and white-logo watchlist report.
- Final summary with processed count, asset count, skipped/blank conferences, validation result, and any remaining manual review items.
```

### Outputs

Depending on workspace state and network access, the agent can return:

- Updated conference logo files.
- A machine-readable logo manifest.
- A human-readable maintenance checklist.
- A yearly-refresh priority report.
- A white-logo visual QA watchlist.
- A short summary of updated assets, intentionally blank entries, validation status, and remaining manual checks.

### User Check

Before using the logos in posters, websites, or redistributed assets, manually verify:

| Check | Why it matters |
|---|---|
| Logo identity | The asset should match the intended conference, not an organization, sponsor, speaker, or venue. |
| Year, city, and venue text | Annual conference logos may become stale quickly. |
| Background visibility | White or transparent logos may be invisible on white poster or web backgrounds. |
| Trademark and copyright | Conference branding may have redistribution or attribution requirements. |
| Downstream rendering | Always inspect the final poster, page, or asset bundle where the logo is used. |

### License

This repository is MIT licensed.

Review conference logo copyright, trademark, and attribution requirements before redistributing generated or downloaded logo files.

<p align="right"><a href="#cs-conference-logo-maintainer">Back to top</a> · <a href="#zh-cn">中文</a></p>

---

<a id="zh-cn"></a>

## 中文

CS Conference Logo Maintainer 用于帮助 code agent 端到端维护 CCF 会议 Logo 资产。

它适合希望获得干净、可复用会议 Logo 资产集的用户，而不是手动访问上百个会议官网、手动运行维护脚本。

如果你不想自己维护这些 Logo，可以收藏本仓库和报告；仓库内置的 GitHub Actions 会在每月 1 号把带年份、城市、地点信息的重点 Logo 刷新到暂存分支，在每月 10 号自动合并到 `main`，并每年执行一次全量 Logo 更新。

### 在线 Logo 检索

**[打开会议 Logo Finder →](https://xinbaoqiao.github.io/CS-Conference-Logo-Maintainer/)**

可以使用会议简称、完整英文名、DBLP key、会议 ID 或研究主题检索，再按最新收录的会议届次和 CCF 等级筛选。存在可靠资产时，结果会直接提供本地 Logo 下载、会议官网和已记录的 Logo 来源。

网站直接读取 Pages 构建产物中的 `manifest.json` 和 `assets/logos/`，不会再维护第二份会议清单。页面把 `conference_year` 明确显示为“最新收录届次”，不会把它当成 Logo 图片年份的证明。历史年份检索需要未来同时扩展 manifest 与界面，明确记录每个归档年份到文件的映射；当前数据是最新快照目录。

### 核心特点

| 特点 | 价值 |
|---|---|
| 一次请求完成维护 | agent 会在一次调用中完成刷新、修复、审计、报告生成和可选下游同步。 |
| GitHub 定时更新 | 仓库会在每月 1 号把重点 Logo 刷新到暂存分支，在每月 10 号合并，并每年执行一次全量刷新。 |
| 面向 CCF 会议范围 | 工作流聚焦 CCF A/B/C 会议记录，而不是泛化网页搜索结果。 |
| 支持手工修正 | 已确认的 Logo URL 会被优先使用；确认难以获取 Logo 的会议会被明确留空。 |
| 降低误匹配风险 | agent 会排除演讲者头像、会场照片、赞助商标识、泛组织 Logo、页面 UI 图标和无关缩写匹配。 |
| 跟踪年度更新目标 | 带有年份、城市或地点信息的 Logo 会被标记，方便后续年度刷新。 |
| 提醒白色 Logo 风险 | 白色或透明 Logo 会被单独提醒，因为它们在白底上可能不可见。 |

### 更新流程

| 时间 | 自动执行内容 | 结果 |
|---|---|---|
| 每月 1 号 | 定时任务刷新已经标记为年份、城市、地点敏感的 Logo。 | 变更会提交到 `scheduled-logo-maintenance` 暂存分支；如果配置了邮件通知密钥，会同时发送邮件提醒检查。 |
| 每月 10 号 | 如果没有人工操作，自动把暂存分支合并到 `main`。 | 公开资产集和报告获得当月更新，并删除暂存分支。 |
| 每年 1 月 | 1 号任务从重点刷新切换为全量刷新。 | 所有 CCF A/B/C 会议 Logo 每年至少重新检查一次。 |
| 任意时间 | 手工修正记录可以固定精确 Logo URL，或把难以获取 Logo 的会议标记为留空。 | 难处理会议保持稳定，已知误匹配不会反复出现。 |

每次更新都会在发布前重新生成 manifest、维护清单、年度更新报告、白色 Logo 提醒清单和完整性审计报告。
分支策略会尽量保持简单：平时只有 `main`；每月 1 号到 10 号之间最多额外存在一个 `scheduled-logo-maintenance` 暂存分支。

如需发送邮件提醒，请在 GitHub 仓库中配置变量 `NOTIFY_EMAIL`，以及 SMTP secrets：`SMTP_HOST`、`SMTP_PORT`、`SMTP_USERNAME`、`SMTP_PASSWORD`，可选配置 `SMTP_FROM`。

### 快速概览

| 你提供 | agent 生成 |
|---|---|
| 这个仓库 | 更新后的 CCF 会议 Logo 资产 |
| 可选的手工修正说明 | 精确 Logo 覆盖或明确留空条目 |
| 可选的下游项目路径 | 在可用时同步 Logo 副本 |
| 一次维护请求 | 包含资产数量、跳过条目和剩余人工检查项的最终汇报 |

### 这个项目提供什么

| 模块 | 内容 |
|---|---|
| 资产 | `assets/logos` 下维护好的 CCF 会议 Logo 文件 |
| 元数据 | 方便下游自动化读取的机器可读 manifest |
| 网站 | 与 manifest 和 Logo 资产同源维护的无依赖检索页面 |
| 清单 | 面向人工维护的缺失项和年度敏感 Logo 检查列表 |
| 报告 | 年度更新优先级、白色 Logo 提醒和完整性审计结果 |
| 集成 | 当同一工作区存在 Better-Poster-Skill 时，可自动同步 Logo 资产 |

### 快速开始

先把本仓库安装到 Codex：

```bash
mkdir -p ~/.codex/skills
cp -R CS-Conference-Logo-Maintainer ~/.codex/skills/conference-logo-maintainer
```

然后让 code agent 自动更新会议 Logo：

```text
Use $conference-logo-maintainer to update the CCF conference logo assets.

Please complete the whole workflow automatically:
- refresh or repair conference logos;
- apply manual correction records;
- keep hard-to-resolve logo entries blank when required;
- flag year/city/venue-sensitive logos;
- flag white or transparent logos;
- sync the final assets to Better-Poster-Skill if available;
- report the final asset count, skipped entries, validation result, and remaining manual-review items.
```

agent 会根据仓库内置说明完成维护，并汇报最终结果。

首次发布检索网站时，需要在 GitHub 仓库中选择 **Settings → Pages → Build and deployment → GitHub Actions**。此后只要 `main` 中的界面、manifest 或 Logo 资产变化，仓库内置的 Pages workflow 会自动重新构建。可用以下命令做本地预览：

```bash
python scripts/build_site.py --check
python scripts/build_site.py --output .site-preview
python -m http.server --directory .site-preview 8000
```

检查完成后请删除 `.site-preview`；它是构建产物，不应提交到仓库。

### Master Prompt

需要完整一键维护时，可以直接复制下面的 Prompt 给 code agent：

```text
You are maintaining CS Conference Logo Maintainer.

Goal:
Update the CCF conference logo assets end to end and produce a final, validated asset set.

Requirements:
1. Refresh CCF A/B/C conference logo assets using the existing CS Conference Logo Maintainer logic.
2. Preserve confirmed good existing logos unless a better official source is found.
3. Apply manual correction records:
   - Conferences absent from manual corrections must continue through the normal automated tracking flow.
   - Conferences marked as having an exact logo must use the configured official logo URL or yearly URL template first.
   - Yearly URL templates must be rendered from the latest CCFDDL conference year, not from a previously downloaded logo URL.
   - Conferences marked as having only a website and no reliable logo must remain blank and must not be crawled.
4. Detect and avoid false positives such as speaker portraits, venue photos, sponsor marks, society logos, UI icons, and unrelated acronym matches.
5. Identify logos that should be prioritized for future yearly refresh because they contain year, city, or venue signals.
6. Identify white or transparent logos that may be invisible on white backgrounds and report them clearly.
7. Sync the final logo assets into the downstream project logo directory if one is present.
8. Validate that the maintained logo directory and downstream copy have matching file names and hashes.

Deliverables:
- Updated logo assets.
- Updated machine-readable manifest.
- Updated human-readable maintenance checklist.
- Updated yearly-refresh and white-logo watchlist report.
- Final summary with processed count, asset count, skipped/blank conferences, validation result, and any remaining manual review items.
```

### 输出什么

根据工作区状态和网络可用性，agent 可以返回：

- 更新后的会议 Logo 文件。
- 机器可读的 Logo manifest。
- 人工可读的维护清单。
- 年度更新优先级报告。
- 白色 Logo 视觉检查提醒清单。
- 简短的资产更新数量、留空条目、验证状态和剩余人工检查项说明。

### 人工检查

在将 Logo 用于海报、网站或重新分发前，请人工确认：

| 检查项 | 原因 |
|---|---|
| Logo 身份 | 资产应对应目标会议，而不是组织、赞助商、演讲者或会场。 |
| 年份、城市和地点文字 | 年度会议 Logo 很容易随年份变旧。 |
| 背景可见性 | 白色或透明 Logo 在白底海报或网页中可能不可见。 |
| 商标和版权 | 会议品牌材料可能有重新分发或署名要求。 |
| 下游渲染效果 | 请始终检查最终海报、网页或资产包中的实际显示效果。 |

### License

This repository is MIT licensed.

重新分发生成或下载的会议 Logo 文件前，请检查对应会议的版权、商标和署名要求。

<p align="right"><a href="#cs-conference-logo-maintainer">Back to top</a> · <a href="#english">English</a></p>
