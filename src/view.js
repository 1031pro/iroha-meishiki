import { BRANCHES, STEMS } from "./four-pillars.js";

const PILLAR_LABELS = [
  ["年柱", "生まれた年"], ["月柱", "生まれた月"], ["日柱", "生まれた日"], ["時柱", "生まれた時間"],
];

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

function ruby(char, reading) {
  return `<ruby>${escapeHtml(char)}<rt>${escapeHtml(reading)}</rt></ruby>`;
}

function pillarValue(pillar, kind) {
  if (!pillar) return `<span class="sheet-empty">—</span>`;
  if (kind === "stem") return `${ruby(pillar.stem.char, pillar.stem.reading)}`;
  if (kind === "branch") return `${ruby(pillar.branch.char, pillar.branch.reading)}`;
  return `<span class="kanshi-reading">${escapeHtml(pillar.kanshiReading)}</span><strong>${escapeHtml(pillar.label)}</strong>`;
}

function renderReferenceList(title, items, className) {
  return `<section class="${className}"><h2>${title}</h2><div>${items.map((item) => `<span>${escapeHtml(item.char)}（${escapeHtml(item.reading)}）</span>`).join("")}</div></section>`;
}

export function renderMeishikiSheet(chart) {
  const timeText = chart.input.unknownTime ? "時刻不明" : `${chart.input.hour}時${String(chart.input.minute).padStart(2, "0")}分`;
  const columns = chart.pillars.map((pillar, index) => `
    <th class="pillar-${["year", "month", "day", "hour"][index]}">
      ${PILLAR_LABELS[index][0]}<small>（${PILLAR_LABELS[index][1]}）</small>
    </th>`).join("");
  const row = (label, note, kind) => `<tr><th><strong>${label}</strong><small>${note}</small></th>${chart.pillars.map((pillar) => `<td>${pillarValue(pillar, kind)}</td>`).join("")}</tr>`;
  return `
    <div class="sheet-viewport">
      <article class="meishiki-sheet" aria-label="かんたん命式シート">
        <header class="sheet-heading">
          <div class="sheet-title"><img src="./assets/meishiki-sheet-ornament.png" alt="" /><div><h1>かんたん命式シート</h1></div></div>
          <dl><div><dt>生年月日：</dt><dd>${chart.input.year}年${chart.input.month}月${chart.input.day}日</dd></div><div><dt>生まれた時間：</dt><dd>${escapeHtml(timeText)}</dd></div></dl>
        </header>
        <div class="sheet-table-wrap">
          <table class="sheet-table"><thead><tr><th>柱の種類</th>${columns}</tr></thead><tbody>
            ${row("天干（てんかん）", "10種類のうち1つ", "stem")}
            ${row("地支（ちし）", "12種類のうち1つ", "branch")}
            ${row("干支（かんし）", "天干と地支の組み合わせ", "kanshi")}
          </tbody></table>
        </div>
        <div class="sheet-reference-grid">
          ${renderReferenceList("天干（10種類）", STEMS, "stem-reference")}
          ${renderReferenceList("地支（12種類）", BRANCHES, "branch-reference")}
        </div>
      </article>
    </div>`;
}

function renderPillarCards(chart) {
  return `<section class="detail-card chart-card"><div class="section-heading"><p>命式</p><h2>四つの柱</h2></div><div class="pillar-cards">${chart.pillars.map((pillar, index) => {
    if (!pillar) return `<article><h3>${PILLAR_LABELS[index][0]}</h3><p class="empty-pillar">時刻不明</p></article>`;
    return `<article class="pillar-${["year", "month", "day", "hour"][index]}"><h3>${PILLAR_LABELS[index][0]}</h3><p class="large-kanshi">${ruby(pillar.stem.char, pillar.stem.reading)}${ruby(pillar.branch.char, pillar.branch.reading)}</p><dl><div><dt>通変星</dt><dd>${escapeHtml(pillar.tenGod)}</dd></div><div><dt>蔵干</dt><dd>${ruby(pillar.hiddenStem.char, pillar.hiddenStem.reading)}</dd></div><div><dt>十二運</dt><dd>${escapeHtml(pillar.twelveStage)}</dd></div></dl></article>`;
  }).join("")}</div><p class="chart-note">空亡：${escapeHtml(chart.voidBranches.join("・"))}　／　月柱の節入り：${escapeHtml(chart.monthBoundary.name)}</p></section>`;
}

function renderLuckTable(title, subtitle, rows, type) {
  const body = rows.map((row) => `<tr><td>${type === "major" ? `${row.ageStart}〜${row.ageEnd}歳` : `${row.year}年`}</td><td>${escapeHtml(row.pillar.label)}</td><td>${escapeHtml(row.pillar.tenGod)}</td><td>${escapeHtml(row.pillar.twelveStage)}</td></tr>`).join("");
  return `<section class="detail-card luck-card ${type}-luck-block"><div class="section-heading"><p>${escapeHtml(subtitle)}</p><h2>${escapeHtml(title)}</h2></div><div class="table-scroll"><table><thead><tr><th>${type === "major" ? "年齢" : "年"}</th><th>干支</th><th>通変星</th><th>十二運</th></tr></thead><tbody>${body}</tbody></table></div></section>`;
}

function renderReadingPage(reading) {
  const sections = reading.sections.map((section) => `
    <section class="reading-field reading-field-${escapeHtml(section.id)}">
      <h2>${escapeHtml(section.title)}${section.note ? `<small>（${escapeHtml(section.note)}）</small>` : ""}</h2>
      <div class="reading-copy">${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div>
    </section>`).join("");
  const memoSections = reading.sections.map((section) => `
    <section class="reading-memo-group reading-memo-${escapeHtml(section.id)}">
      <h2>${escapeHtml(section.title)}</h2>
      <ul>${section.memo.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>`).join("");
  return `
    <div class="reading-viewport">
      <div class="reading-layout">
        <article class="reading-sheet" aria-label="四柱推命リーディング">
          <header class="reading-heading"><span>2</span><h1>四柱推命リーディング</h1></header>
          <img class="reading-flower reading-flower-top" src="./assets/meishiki-sheet-ornament.png" alt="" />
          ${sections}
          <img class="reading-flower reading-flower-bottom" src="./assets/meishiki-sheet-ornament.png" alt="" />
        </article>
        <aside class="reading-memo" aria-label="鑑定の判断メモ">
          <header class="reading-memo-heading"><p>鑑定メモ</p><h1>判断に使った命式の要素</h1></header>
          <p class="reading-memo-intro">左の鑑定文を、命式のどの要素から読んだかを項目ごとに示しています。</p>
          ${memoSections}
        </aside>
      </div>
    </div>`;
}

export function renderResult(target, result) {
  target.innerHTML = `
    <header class="screen-header"><strong>四柱推命 鑑定ツール</strong><button type="button" data-edit-input>日付を変更</button></header>
    <nav class="screen-tabs" aria-label="ページ切り替え">
      <button type="button" data-page="chart" aria-current="page"><span>1</span> 命式シート</button>
      <button type="button" data-page="reading"><span>2</span> 鑑定結果</button>
    </nav>
    <section class="result-page is-active" data-page-panel="chart">
      ${renderMeishikiSheet(result.chart)}
      <button class="page-turn page-turn-next" type="button" data-page="reading">鑑定結果を見る <span>›</span></button>
    </section>
    <section class="result-page" data-page-panel="reading" hidden>
      ${renderReadingPage(result.reading)}
      <button class="page-turn page-turn-back" type="button" data-page="chart"><span>‹</span> 命式シートへ戻る</button>
      <details class="calculation-details">
        <summary>命式・大運・年運の詳しい内容を見る</summary>
        <div class="detail-results">
          ${renderPillarCards(result.chart)}
          ${renderLuckTable("大運", "10年ごとの流れ", result.majorLuck, "major")}
          ${renderLuckTable("年運", `${result.annualLuck[0].year}年からの流れ`, result.annualLuck, "annual")}
        </div>
      </details>
    </section>`;
}

export function fitSheet() {
  const viewport = document.querySelector(".sheet-viewport");
  const sheet = viewport?.querySelector(".meishiki-sheet");
  if (!viewport || !sheet) return;
  const naturalWidth = 1120;
  const naturalHeight = 563;
  const availableWidth = Math.max(1, viewport.clientWidth - 24);
  const availableHeight = Math.max(1, viewport.clientHeight - 18);
  const scale = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight);
  sheet.style.setProperty("--sheet-scale", String(scale));
  sheet.style.left = `${Math.max(0, (viewport.clientWidth - naturalWidth * scale) / 2)}px`;
  sheet.style.top = `${Math.max(0, (viewport.clientHeight - naturalHeight * scale) / 2)}px`;
  viewport.classList.add("is-fitted");
}
