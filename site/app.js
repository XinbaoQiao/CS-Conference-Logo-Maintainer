const MANIFEST_URL = "./manifest.json";
const PAGE_SIZE = 24;
const AVAILABLE_STATUSES = new Set(["downloaded", "existing_target", "reused_existing"]);
const VALID_RANKS = new Set(["all", "A", "B", "C"]);
const VALID_AVAILABILITY = new Set(["available", "all", "unavailable"]);
const VALID_PREVIEWS = new Set(["dark", "light", "checker"]);

const elements = {
  app: document.querySelector("#app"),
  form: document.querySelector("#search-form"),
  catalogStatus: document.querySelector("#catalog-status"),
  search: document.querySelector("#search-input"),
  year: document.querySelector("#year-filter"),
  rank: document.querySelector("#rank-filter"),
  availability: document.querySelector("#availability-filter"),
  preview: document.querySelector("#preview-toggle"),
  summary: document.querySelector("#result-summary"),
  results: document.querySelector("#results"),
  loadingState: document.querySelector("#loading-state"),
  loadMore: document.querySelector("#load-more"),
  error: document.querySelector("#error-state"),
  retry: document.querySelector("#retry-button"),
  clear: document.querySelector("#clear-search"),
  statConferences: document.querySelector("#stat-conferences"),
  statLogos: document.querySelector("#stat-logos"),
  statUnavailable: document.querySelector("#stat-unavailable"),
  catalogUpdated: document.querySelector("#catalog-updated"),
};

const state = {
  entries: [],
  loading: true,
  query: "",
  year: "latest",
  rank: "all",
  availability: "available",
  preview: "dark",
  visibleCount: PAGE_SIZE,
};

function normalizeWords(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compact(value) {
  return normalizeWords(value).replace(/\s+/g, "");
}

function safeYear(value) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : null;
}

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value ?? ""));
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function localLogoUrl(filename) {
  const name = String(filename ?? "").trim();
  if (!name || name.includes("/") || name.includes("\\") || name.includes("..")) {
    return null;
  }
  return `./assets/logos/${encodeURIComponent(name)}`;
}

function stableId(entry, index) {
  const source = String(entry.source_path ?? "").trim();
  const title = String(entry.title ?? "").trim();
  return `${source || `entry-${index}`}#${title}`;
}

function normalizeEntry(entry, index) {
  const title = String(entry.title ?? "").trim() || "Untitled conference";
  const description = String(entry.description ?? "").trim();
  const dblp = String(entry.dblp ?? "").trim();
  const conferenceId = String(entry.conference_id ?? "").trim();
  const sourcePath = String(entry.source_path ?? "").trim();
  const sourceStem = sourcePath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
  const fields = [title, description, dblp, conferenceId, entry.sub, sourceStem].filter(Boolean);
  const status = String(entry.status ?? "unknown");
  const logoUrl = localLogoUrl(entry.logo_file);
  const available = Boolean(logoUrl && AVAILABLE_STATUSES.has(status));
  const assetYears = [...new Set((Array.isArray(entry.asset_years) ? entry.asset_years : [])
    .map(safeYear)
    .filter(Boolean))].sort((a, b) => b - a);

  return {
    raw: entry,
    id: stableId(entry, index),
    title,
    description,
    dblp,
    conferenceId,
    sourcePath,
    rank: String(entry.ccf_rank ?? "").toUpperCase(),
    area: String(entry.sub ?? "").trim(),
    year: safeYear(entry.conference_year),
    date: String(entry.conference_date ?? "").trim(),
    place: String(entry.conference_place ?? "").trim(),
    status,
    available,
    logoFile: available ? String(entry.logo_file) : null,
    logoUrl: available ? logoUrl : null,
    officialUrl: safeExternalUrl(entry.official_link),
    sourceUrl: safeExternalUrl(entry.source_url),
    assetYears,
    needsAnnualUpdate: Boolean(entry.needs_annual_update),
    searchWords: normalizeWords(fields.join(" ")),
    searchCompact: compact(fields.join(" ")),
    exactTitle: compact(title),
    exactDblp: compact(dblp),
    exactConferenceId: compact(conferenceId),
  };
}

function rankOrder(rank) {
  return { A: 0, B: 1, C: 2 }[rank] ?? 3;
}

function scoreEntry(entry, query) {
  if (!query) return 0;

  const words = normalizeWords(query);
  const queryCompact = compact(query);
  const tokens = words.split(/\s+/).filter(Boolean);
  if (!queryCompact) return 0;

  if (entry.exactTitle === queryCompact) return 1000;
  if (entry.exactDblp === queryCompact || entry.exactConferenceId === queryCompact) return 950;
  if (entry.exactTitle.startsWith(queryCompact)) return 850;

  const allTokensMatch = tokens.every((token) => entry.searchWords.includes(token));
  if (!allTokensMatch && !entry.searchCompact.includes(queryCompact)) return -1;

  if (entry.exactTitle.includes(queryCompact)) return 760;
  if (normalizeWords(entry.description).includes(words)) return 680;
  if (entry.searchCompact.includes(queryCompact)) return 600;
  return 500 + tokens.length;
}

function compareEntries(left, right) {
  if (right.score !== left.score) return right.score - left.score;
  const rankDelta = rankOrder(left.entry.rank) - rankOrder(right.entry.rank);
  if (rankDelta !== 0) return rankDelta;
  return left.entry.title.localeCompare(right.entry.title, "en", { sensitivity: "base" });
}

function filteredResults(options = {}) {
  const ignoreYear = Boolean(options.ignoreYear);
  const ignoreAvailability = Boolean(options.ignoreAvailability);
  const selectedYear = safeYear(state.year);
  let scored = state.entries
    .map((entry) => ({ entry, score: scoreEntry(entry, state.query) }))
    .filter(({ score }) => score >= 0);

  if (state.query && scored.some(({ score }) => score >= 950)) {
    scored = scored.filter(({ score }) => score >= 950);
  }

  return scored
    .filter(({ entry }) => state.rank === "all" || entry.rank === state.rank)
    .filter(({ entry }) => ignoreYear || state.year === "latest" || entry.year === selectedYear)
    .filter(({ entry }) => {
      if (ignoreAvailability || state.availability === "all") return true;
      return state.availability === "available" ? entry.available : !entry.available;
    })
    .sort(compareEntries);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function metadataItem(term, value) {
  const wrapper = element("div");
  wrapper.append(element("dt", "", term), element("dd", "", value || "未收录"));
  return wrapper;
}

function statusLabel(entry) {
  if (entry.available) return "已维护资产";
  if (entry.status === "page_error") return "上次刷新源页不可用";
  if (entry.raw.manual_override_action === "manual_skip") return "经人工确认暂不收录";
  if (entry.status === "no_logo_candidate") return "暂无可靠 Logo";
  return "暂不可下载";
}

function assetYearLabel(entry) {
  if (!entry.assetYears.length) return "Logo 年份未确认";
  return `Logo 年份线索 ${entry.assetYears.join(" / ")}`;
}

function createCard(entry) {
  const template = document.querySelector("#result-card-template");
  const card = template.content.firstElementChild.cloneNode(true);
  card.dataset.entryId = entry.id;
  card.classList.toggle("is-available", entry.available);
  card.classList.toggle("is-unavailable", !entry.available);

  const rank = card.querySelector('[data-field="rank"]');
  rank.textContent = entry.rank ? `CCF ${entry.rank}` : "CCF —";
  const status = card.querySelector('[data-field="status"]');
  status.textContent = statusLabel(entry);
  status.dataset.status = entry.available ? "available" : entry.status;
  card.querySelector('[data-field="title"]').textContent = entry.title;
  card.querySelector('[data-field="description"]').textContent = entry.description || "会议全称未收录";
  card.querySelector('[data-field="edition"]').textContent = entry.year ? String(entry.year) : "未标注";
  card.querySelector('[data-field="asset-years"]').textContent = assetYearLabel(entry);
  card.querySelector('[data-field="area"]').textContent = entry.area || "未分类";

  const metadata = card.querySelector(".logo-card__metadata");
  if (entry.date) metadata.append(metadataItem("会议日期 / Date", entry.date));
  if (entry.place) metadata.append(metadataItem("会议地点 / Place", entry.place));

  const stage = card.querySelector('[data-field="stage"]');
  stage.dataset.preview = state.preview;
  stage.classList.remove("logo-stage--dark", "logo-stage--light", "logo-stage--checker");
  stage.classList.add(`logo-stage--${state.preview}`);
  const image = card.querySelector('[data-field="logo"]');
  const fallback = card.querySelector('[data-field="fallback"]');
  fallback.textContent = entry.available ? "" : `${entry.title} · ${statusLabel(entry)}`;
  fallback.hidden = entry.available;
  image.hidden = !entry.available;
  if (entry.available) {
    image.src = entry.logoUrl;
    image.alt = `${entry.description || entry.title} Logo；当前收录${entry.year ? `，会议届次 ${entry.year}` : ""}`;
    image.addEventListener("error", () => {
      image.hidden = true;
      fallback.hidden = false;
      fallback.textContent = `${entry.title} · 图片加载失败`;
      fallback.setAttribute("role", "status");
    }, { once: true });
  } else {
    image.removeAttribute("src");
    image.alt = "";
  }

  const download = card.querySelector('[data-field="download"]');
  download.hidden = !entry.available;
  if (entry.available) {
    download.href = entry.logoUrl;
    download.download = entry.logoFile;
    download.setAttribute("aria-label", `下载 ${entry.title} Logo`);
  }
  const official = card.querySelector('[data-field="official"]');
  official.hidden = !entry.officialUrl;
  if (entry.officialUrl) {
    official.href = entry.officialUrl;
    official.setAttribute("aria-label", `${entry.title} 会议官网（新窗口）`);
  }
  const source = card.querySelector('[data-field="source"]');
  source.hidden = !entry.sourceUrl;
  if (entry.sourceUrl) {
    source.href = entry.sourceUrl;
    source.setAttribute("aria-label", `${entry.title} Logo 来源（新窗口）`);
  }
  return card;
}

function editDistance(left, right) {
  if (!left) return right.length;
  if (!right) return left.length;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function suggestionsFor(query) {
  const needle = compact(query);
  if (!needle || needle.length < 2) return [];
  return state.entries
    .map((entry) => ({
      entry,
      distance: Math.min(editDistance(needle, entry.exactTitle), editDistance(needle, entry.exactDblp)),
    }))
    .filter(({ distance }) => distance <= Math.max(2, Math.floor(needle.length / 3)))
    .sort((left, right) => left.distance - right.distance || left.entry.title.localeCompare(right.entry.title))
    .filter((item, index, items) => items.findIndex((other) => other.entry.title === item.entry.title) === index)
    .slice(0, 3)
    .map(({ entry }) => entry.title);
}

function createEmptyState() {
  const wrapper = element("section", "state-panel state-panel--empty empty-state");
  wrapper.setAttribute("aria-labelledby", "empty-state-title");
  const copy = element("div", "state-panel__copy");
  const title = element("h3", "empty-state-title", "没有符合当前条件的记录");
  title.id = "empty-state-title";
  const message = element("p", "empty-state-copy");
  const actions = element("div", "state-panel__actions");
  const allYears = state.year === "latest" ? [] : filteredResults({ ignoreYear: true });
  const allAvailability = filteredResults({ ignoreAvailability: true });

  if (state.year !== "latest" && allYears.length) {
    message.textContent = `“${state.query || "当前筛选"}”在 ${state.year} 届次没有收录；不会用其他年份的 Logo 自动替代。`;
    const latest = element("button", "button button--quiet", "查看最新收录");
    latest.type = "button";
    latest.addEventListener("click", () => {
      state.year = "latest";
      elements.year.value = "latest";
      resetAndRender();
    });
    copy.append(title, message);
    actions.append(latest);
    wrapper.append(copy, actions);
    return wrapper;
  }

  if (state.availability !== "all" && allAvailability.length) {
    message.textContent = state.availability === "available"
      ? "找到了会议记录，但当前目录没有可下载的可靠 Logo。"
      : "匹配记录目前都有可下载的维护资产。";
    const showAll = element("button", "button button--quiet", "显示全部会议记录");
    showAll.type = "button";
    showAll.addEventListener("click", () => {
      state.availability = "all";
      elements.availability.value = "all";
      resetAndRender();
    });
    copy.append(title, message);
    actions.append(showAll);
    wrapper.append(copy, actions);
    return wrapper;
  }

  message.textContent = state.query
    ? `没有找到“${state.query}”。可尝试会议简称、完整英文名、DBLP key 或会议 ID。`
    : "当前筛选没有记录。";
  copy.append(title, message);
  wrapper.append(copy);

  const suggestions = suggestionsFor(state.query);
  if (suggestions.length) {
    const suggestionGroup = element("div", "suggestion-group");
    suggestionGroup.append(element("span", "suggestion-label", "你是否想找："));
    for (const suggestion of suggestions) {
      const button = element("button", "button button--quiet suggestion-button", suggestion);
      button.type = "button";
      button.addEventListener("click", () => {
        state.query = suggestion;
        elements.search.value = suggestion;
        resetAndRender();
      });
      suggestionGroup.append(button);
    }
    copy.append(suggestionGroup);
  }

  const clear = element("button", "button button--quiet", "清除搜索与筛选");
  clear.type = "button";
  clear.addEventListener("click", clearFilters);
  actions.append(clear);
  wrapper.append(actions);
  return wrapper;
}

function updateSummary(total) {
  const availableCount = filteredResults({ ignoreAvailability: true })
    .filter(({ entry }) => entry.available).length;
  const parts = [`找到 ${total} 条记录`];
  if (state.query) parts.push(`关键词“${state.query}”`);
  if (state.year !== "latest") parts.push(`会议届次 ${state.year}`);
  if (state.rank !== "all") parts.push(`CCF ${state.rank}`);
  if (state.availability === "all") parts.push(`${availableCount} 条可下载`);
  elements.summary.textContent = parts.join(" · ");
}

function updateUrl() {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.year !== "latest") params.set("year", state.year);
  if (state.rank !== "all") params.set("rank", state.rank);
  if (state.availability !== "available") params.set("availability", state.availability);
  if (state.preview !== "dark") params.set("preview", state.preview);
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
}

function render() {
  if (state.loading) return;
  const results = filteredResults();
  const visible = results.slice(0, state.visibleCount);
  const fragment = document.createDocumentFragment();
  for (const { entry } of visible) fragment.append(createCard(entry));

  elements.results.replaceChildren();
  if (visible.length) elements.results.append(fragment);
  else elements.results.append(createEmptyState());

  updateSummary(results.length);
  elements.loadMore.hidden = results.length <= state.visibleCount;
  if (!elements.loadMore.hidden) {
    elements.loadMore.textContent = `继续显示（剩余 ${results.length - state.visibleCount} 条）`;
  }
  elements.app.dataset.preview = state.preview;
  elements.results.setAttribute("aria-busy", "false");
  updateUrl();
}

function resetAndRender() {
  state.visibleCount = PAGE_SIZE;
  render();
}

function clearFilters() {
  state.query = "";
  state.year = "latest";
  state.rank = "all";
  state.availability = "available";
  elements.search.value = "";
  elements.year.value = "latest";
  elements.rank.value = "all";
  elements.availability.value = "available";
  resetAndRender();
  elements.search.focus();
}

function populateYears(entries) {
  const years = [...new Set(entries.map((entry) => entry.year).filter(Boolean))].sort((a, b) => b - a);
  elements.year.replaceChildren();
  const latest = document.createElement("option");
  latest.value = "latest";
  latest.textContent = "最新收录届次";
  elements.year.append(latest);
  for (const year of years) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = `${year} 会议届次`;
    elements.year.append(option);
  }
  if (state.year !== "latest" && !years.includes(Number(state.year))) state.year = "latest";
  elements.year.value = state.year;
}

function formatCatalogDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "更新时间未知";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

function applyInitialUrlState() {
  const params = new URLSearchParams(window.location.search);
  state.query = String(params.get("q") ?? "").trim().slice(0, 160);
  state.year = params.get("year") ?? "latest";
  const rank = params.get("rank") ?? "all";
  const availability = params.get("availability") ?? "available";
  const preview = params.get("preview") ?? "dark";
  state.rank = VALID_RANKS.has(rank) ? rank : "all";
  state.availability = VALID_AVAILABILITY.has(availability) ? availability : "available";
  state.preview = VALID_PREVIEWS.has(preview) ? preview : "dark";
  elements.search.value = state.query;
  elements.rank.value = state.rank;
  elements.availability.value = state.availability;
  elements.preview.value = state.preview;
}

function showLoadError(error) {
  state.loading = false;
  elements.app.setAttribute("aria-busy", "false");
  elements.catalogStatus.hidden = true;
  elements.loadingState.hidden = true;
  elements.results.replaceChildren();
  elements.error.hidden = false;
  elements.summary.textContent = "目录载入失败";
  elements.loadMore.hidden = true;
  const detail = elements.error.querySelector("[data-error-detail]");
  if (detail) detail.textContent = error instanceof Error ? error.message : "未知错误";
}

async function loadCatalog() {
  state.loading = true;
  elements.app.setAttribute("aria-busy", "true");
  elements.results.setAttribute("aria-busy", "true");
  elements.error.hidden = true;
  elements.loadingState.hidden = false;
  elements.catalogStatus.hidden = false;
  elements.summary.textContent = "正在载入会议目录…";

  try {
    const response = await fetch(MANIFEST_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(`manifest.json 返回 ${response.status}`);
    const manifest = await response.json();
    if (!manifest || !Array.isArray(manifest.entries)) throw new Error("manifest.json 缺少 entries 数组");

    state.entries = manifest.entries.map(normalizeEntry);
    populateYears(state.entries);

    const available = state.entries.filter((entry) => entry.available);
    elements.statConferences.textContent = String(state.entries.length);
    elements.statLogos.textContent = String(available.length);
    elements.statUnavailable.textContent = String(state.entries.length - available.length);
    elements.catalogUpdated.textContent = formatCatalogDate(manifest.generated_at);
    elements.catalogUpdated.dateTime = String(manifest.generated_at ?? "");

    state.loading = false;
    elements.app.setAttribute("aria-busy", "false");
    elements.catalogStatus.hidden = true;
    elements.loadingState.hidden = true;
    render();
  } catch (error) {
    showLoadError(error);
  }
}

function bindEvents() {
  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    resetAndRender();
  });
  elements.search.addEventListener("input", (event) => {
    state.query = event.currentTarget.value.trimStart().slice(0, 160);
    resetAndRender();
  });
  elements.year.addEventListener("change", (event) => {
    state.year = event.currentTarget.value;
    resetAndRender();
  });
  elements.rank.addEventListener("change", (event) => {
    state.rank = event.currentTarget.value;
    resetAndRender();
  });
  elements.availability.addEventListener("change", (event) => {
    state.availability = event.currentTarget.value;
    resetAndRender();
  });
  elements.preview.addEventListener("change", (event) => {
    state.preview = event.currentTarget.value;
    resetAndRender();
  });
  elements.loadMore.addEventListener("click", () => {
    state.visibleCount += PAGE_SIZE;
    render();
  });
  elements.retry.addEventListener("click", loadCatalog);
  elements.clear?.addEventListener("click", clearFilters);

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isEditing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
    if (event.key === "/" && !isEditing) {
      event.preventDefault();
      elements.search.focus();
    }
    if (event.key === "Escape" && state.query) {
      event.preventDefault();
      state.query = "";
      elements.search.value = "";
      resetAndRender();
      elements.search.focus();
    }
  });
}

applyInitialUrlState();
bindEvents();
loadCatalog();
