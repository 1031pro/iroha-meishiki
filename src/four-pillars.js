const STEM_ROWS = [
  ["甲", "きのえ", "木", "陽"], ["乙", "きのと", "木", "陰"],
  ["丙", "ひのえ", "火", "陽"], ["丁", "ひのと", "火", "陰"],
  ["戊", "つちのえ", "土", "陽"], ["己", "つちのと", "土", "陰"],
  ["庚", "かのえ", "金", "陽"], ["辛", "かのと", "金", "陰"],
  ["壬", "みずのえ", "水", "陽"], ["癸", "みずのと", "水", "陰"],
];

const BRANCH_ROWS = [
  ["子", "ね", "水", "陽"], ["丑", "うし", "土", "陰"], ["寅", "とら", "木", "陽"], ["卯", "う", "木", "陰"],
  ["辰", "たつ", "土", "陽"], ["巳", "み", "火", "陰"], ["午", "うま", "火", "陽"], ["未", "ひつじ", "土", "陰"],
  ["申", "さる", "金", "陽"], ["酉", "とり", "金", "陰"], ["戌", "いぬ", "土", "陽"], ["亥", "い", "水", "陰"],
];

export const STEMS = STEM_ROWS.map(([char, reading, element, polarity], index) => ({ char, reading, element, polarity, index }));
export const BRANCHES = BRANCH_ROWS.map(([char, reading, element, polarity], index) => ({ char, reading, element, polarity, index }));

export const ELEMENT_INDEX = { 木: 0, 火: 1, 土: 2, 金: 3, 水: 4 };
const MAIN_HIDDEN = { 子: "癸", 丑: "己", 寅: "甲", 卯: "乙", 辰: "戊", 巳: "丙", 午: "丁", 未: "己", 申: "庚", 酉: "辛", 戌: "戊", 亥: "壬" };
const HIDDEN_STEMS = {
  子: ["癸"], 丑: ["己", "癸", "辛"], 寅: ["甲", "丙", "戊"], 卯: ["乙"],
  辰: ["戊", "乙", "癸"], 巳: ["丙", "戊", "庚"], 午: ["丁", "己"], 未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"], 酉: ["辛"], 戌: ["戊", "辛", "丁"], 亥: ["壬", "甲"],
};
const STAGE_NAMES = ["長生", "沐浴", "冠帯", "建禄", "帝旺", "衰", "病", "死", "墓", "絶", "胎", "養"];
const STAGE_START = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];
const TERM_NAMES = ["小寒", "立春", "啓蟄", "清明", "立夏", "芒種", "小暑", "立秋", "白露", "寒露", "立冬", "大雪"];
const TERM_CENTURY = {
  20: [6.11, 4.6295, 6.3826, 5.59, 6.318, 6.5, 7.928, 8.35, 8.44, 9.098, 8.218, 7.9],
  21: [5.4055, 3.87, 5.63, 4.81, 5.52, 5.678, 7.108, 7.5, 7.646, 8.318, 7.438, 7.18],
};

const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;

export function cycleAt(index) {
  const value = mod(index, 60);
  const stem = STEMS[value % 10];
  const branch = BRANCHES[value % 12];
  return { index: value, stem, branch, label: `${stem.char}${branch.char}` };
}

function cycleIndexFor(stemIndex, branchIndex) {
  for (let index = 0; index < 60; index += 1) {
    if (index % 10 === stemIndex && index % 12 === branchIndex) return index;
  }
  throw new Error("干支の組み合わせが不正です");
}

function termDay(year, month) {
  const century = year < 2000 ? 20 : 21;
  const shortYear = mod(year, 100);
  const constant = TERM_CENTURY[century][month - 1];
  return Math.floor(shortYear * 0.2422 + constant) - Math.floor((shortYear - 1) / 4);
}

function termDate(year, month) {
  return new Date(year, month - 1, termDay(year, month), 12, 0, 0, 0);
}

function surroundingTerms(date) {
  const candidates = [];
  for (let year = date.getFullYear() - 1; year <= date.getFullYear() + 1; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      candidates.push({ year, month, name: TERM_NAMES[month - 1], date: termDate(year, month) });
    }
  }
  candidates.sort((a, b) => a.date - b.date);
  const previous = [...candidates].reverse().find((term) => term.date <= date);
  const next = candidates.find((term) => term.date > date);
  return { previous, next };
}

function jdn(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

export function tenGod(dayStemIndex, targetStemIndex) {
  if (dayStemIndex === targetStemIndex) return "比肩";
  const day = STEMS[dayStemIndex];
  const target = STEMS[targetStemIndex];
  const relation = mod(ELEMENT_INDEX[target.element] - ELEMENT_INDEX[day.element], 5);
  const samePolarity = day.polarity === target.polarity;
  if (relation === 0) return samePolarity ? "比肩" : "劫財";
  if (relation === 1) return samePolarity ? "食神" : "傷官";
  if (relation === 2) return samePolarity ? "偏財" : "正財";
  if (relation === 3) return samePolarity ? "偏官" : "正官";
  return samePolarity ? "偏印" : "印綬";
}

export function twelveStage(dayStemIndex, branchIndex) {
  const direction = STEMS[dayStemIndex].polarity === "陽" ? 1 : -1;
  return STAGE_NAMES[mod(direction * (branchIndex - STAGE_START[dayStemIndex]), 12)];
}

function enrich(key, basic, dayStemIndex) {
  const hiddenStemIndex = STEMS.findIndex((item) => item.char === MAIN_HIDDEN[basic.branch.char]);
  const hiddenStems = HIDDEN_STEMS[basic.branch.char].map((char) => {
    const stem = STEMS.find((item) => item.char === char);
    return { ...stem, tenGod: tenGod(dayStemIndex, stem.index) };
  });
  return {
    key,
    ...basic,
    kanshiReading: `${basic.stem.reading}・${basic.branch.reading}`,
    tenGod: key === "day" ? "—" : tenGod(dayStemIndex, basic.stem.index),
    hiddenStem: STEMS[hiddenStemIndex],
    hiddenTenGod: tenGod(dayStemIndex, hiddenStemIndex),
    hiddenStems,
    twelveStage: twelveStage(dayStemIndex, basic.branch.index),
  };
}

function yearPillar(date) {
  const risshun = termDate(date.getFullYear(), 2);
  const effectiveYear = date < risshun ? date.getFullYear() - 1 : date.getFullYear();
  return { ...cycleAt(effectiveYear - 4), effectiveYear };
}

function monthPillar(date, effectiveYearStemIndex) {
  const boundary = surroundingTerms(date).previous;
  const ordinal = boundary.month === 1 ? 11 : boundary.month - 2;
  const branchIndex = mod(2 + ordinal, 12);
  const firstStem = mod((effectiveYearStemIndex % 5) * 2 + 2, 10);
  const stemIndex = mod(firstStem + ordinal, 10);
  return { ...cycleAt(cycleIndexFor(stemIndex, branchIndex)), boundary };
}

function dayPillar(date) {
  return cycleAt(jdn(date.getFullYear(), date.getMonth() + 1, date.getDate()) + 49);
}

function hourPillar(date, dayStemIndex) {
  const branchIndex = mod(Math.floor((date.getHours() + 1) / 2), 12);
  const stemIndex = mod(dayStemIndex * 2 + branchIndex, 10);
  return cycleAt(cycleIndexFor(stemIndex, branchIndex));
}

function voidBranches(dayCycleIndex) {
  const group = Math.floor(dayCycleIndex / 10);
  const first = mod(10 - group * 2, 12);
  return [BRANCHES[first].char, BRANCHES[mod(first + 1, 12)].char];
}

export function calculateChart(input) {
  const hour = input.unknownTime ? 12 : input.hour;
  const minute = input.unknownTime ? 0 : input.minute;
  const date = new Date(input.year, input.month - 1, input.day, hour, minute, 0, 0);
  if (Number.isNaN(date.getTime()) || date.getMonth() !== input.month - 1 || date.getDate() !== input.day) {
    throw new Error("正しい生年月日を入力してください");
  }
  const year = yearPillar(date);
  const month = monthPillar(date, year.stem.index);
  const day = dayPillar(date);
  const hourBasic = input.unknownTime ? null : hourPillar(date, day.stem.index);
  const pillars = [
    enrich("year", year, day.stem.index),
    enrich("month", month, day.stem.index),
    enrich("day", day, day.stem.index),
    hourBasic ? enrich("hour", hourBasic, day.stem.index) : null,
  ];
  return {
    input,
    date,
    pillars,
    pillarMap: { year: pillars[0], month: pillars[1], day: pillars[2], hour: pillars[3] },
    monthBoundary: month.boundary,
    voidBranches: voidBranches(day.index),
  };
}

function majorDirection(chart) {
  const yangYear = chart.pillarMap.year.stem.polarity === "陽";
  return (chart.input.sex === "male" && yangYear) || (chart.input.sex === "female" && !yangYear) ? 1 : -1;
}

export function calculateMajorLuck(chart) {
  const direction = majorDirection(chart);
  const terms = surroundingTerms(chart.date);
  const target = direction === 1 ? terms.next.date : terms.previous.date;
  const days = Math.abs(target - chart.date) / 86400000;
  const startAge = Math.max(1, Math.round(days / 3));
  const base = chart.pillarMap.month.index;
  return Array.from({ length: 8 }, (_, index) => {
    const pillar = enrich("luck", cycleAt(base + direction * (index + 1)), chart.pillarMap.day.stem.index);
    return { ageStart: startAge + index * 10, ageEnd: startAge + index * 10 + 9, pillar };
  });
}

export function calculateAnnualLuck(chart, baseYear) {
  return Array.from({ length: 10 }, (_, index) => {
    const year = baseYear + index;
    return { year, age: year - chart.input.year, pillar: enrich("annual", cycleAt(year - 4), chart.pillarMap.day.stem.index) };
  });
}

export function createInterpretation(chart, majorLuck, annualLuck) {
  const day = chart.pillarMap.day.stem;
  const boundary = chart.monthBoundary;
  const active = majorLuck.find((row) => row.ageStart <= annualLuck[0].age && row.ageEnd >= annualLuck[0].age) || majorLuck[0];
  return [
    { title: "日干から見る基本傾向", body: `日干は${day.char}（${day.reading}）で、${day.polarity}の${day.element}に属します。自分の中心となる性質を表す場所として読みます。` },
    { title: "生まれた季節", body: `月柱は${boundary.name}以降の節として計算しています。月支は${chart.pillarMap.month.branch.char}（${chart.pillarMap.month.branch.reading}）です。` },
    { title: "現在の大運", body: `${active.ageStart}歳から${active.ageEnd}歳までは${active.pillar.label}の大運です。通変星は${active.pillar.tenGod}、十二運は${active.pillar.twelveStage}として確認できます。` },
    { title: "年運の見方", body: `${annualLuck[0].year}年から10年間の干支を表示しています。大運と重ね、変化の時期を確認するための基礎資料としてお使いください。` },
  ];
}
