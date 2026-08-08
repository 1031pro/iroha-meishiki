import { ELEMENT_INDEX } from "./four-pillars.js";
import {
  DAY_STEM_TEXT,
  LIFE_PHASE_LEAD,
  LUCK_TEXT,
  PARTNER_TEXT,
  RELATION_TEXT,
  STRENGTH_TEXT,
  TEN_GOD_TEXT,
  TWELVE_STAGE_TEXT,
  UNKNOWN_TIME_TEXT,
} from "./interpretation-data.js";

const STEM_COMBINES = ["甲己", "乙庚", "丙辛", "丁壬", "戊癸"];
const BRANCH_COMBINES = ["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"];
const BRANCH_CLASHES = ["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"];
const THREE_HARMONIES = ["申子辰", "亥卯未", "寅午戌", "巳酉丑"];
const PILLAR_NAMES = { year: "年柱", month: "月柱", day: "日柱", hour: "時柱" };
const STRENGTH_LABELS = { strong: "強め", balanced: "中庸", gentle: "穏やか" };
const PARTNER_LEVEL_LABELS = { strong: "強く表れる", present: "命式内に表れる", subtle: "表れ方は控えめ" };

function samePair(pair, left, right) {
  return pair.includes(left) && pair.includes(right) && left !== right;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function relationEvents(pillars) {
  const existing = pillars.filter(Boolean);
  const events = [];
  for (let leftIndex = 0; leftIndex < existing.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < existing.length; rightIndex += 1) {
      const left = existing[leftIndex];
      const right = existing[rightIndex];
      if (STEM_COMBINES.some((pair) => samePair(pair, left.stem.char, right.stem.char))) {
        events.push({ type: "combine", layer: "stem", pillars: [left.key, right.key] });
      }
      if (BRANCH_COMBINES.some((pair) => samePair(pair, left.branch.char, right.branch.char))) {
        events.push({ type: "combine", layer: "branch", pillars: [left.key, right.key] });
      }
      if (BRANCH_CLASHES.some((pair) => samePair(pair, left.branch.char, right.branch.char))) {
        events.push({ type: "clash", layer: "branch", pillars: [left.key, right.key] });
      }
    }
  }
  const branchChars = existing.map((pillar) => pillar.branch.char);
  for (const group of THREE_HARMONIES) {
    if ([...group].every((char) => branchChars.includes(char))) {
      events.push({
        type: "harmony",
        layer: "branch",
        pillars: existing.filter((pillar) => group.includes(pillar.branch.char)).map((pillar) => pillar.key),
      });
    }
  }
  return events;
}

function luckRelationKind(luckPillar, natalPillars) {
  const temporary = { ...luckPillar, key: "luck" };
  const events = relationEvents([...natalPillars.filter(Boolean), temporary])
    .filter((event) => event.pillars.includes("luck"));
  if (events.some((event) => event.type === "clash")) return "clash";
  if (events.some((event) => event.type === "harmony")) return "harmony";
  if (events.some((event) => event.type === "combine")) return "combine";
  return "steady";
}

function countTenGods(chart) {
  const counts = Object.fromEntries(Object.keys(TEN_GOD_TEXT).map((name) => [name, 0]));
  for (const pillar of chart.pillars.filter(Boolean)) {
    const pillarWeight = pillar.key === "month" ? 1.45 : 1;
    const visibleGod = pillar.key === "day" ? "比肩" : pillar.tenGod;
    counts[visibleGod] += pillarWeight;
    pillar.hiddenStems.forEach((stem, index) => {
      counts[stem.tenGod] += pillarWeight * [0.9, 0.38, 0.24][index];
    });
  }
  return counts;
}

function elementBalance(chart) {
  const weights = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const pillar of chart.pillars.filter(Boolean)) {
    const branchWeight = pillar.key === "month" ? 2.2 : 1;
    weights[pillar.stem.element] += 1;
    weights[pillar.branch.element] += branchWeight;
    pillar.hiddenStems.forEach((stem, index) => {
      weights[stem.element] += branchWeight * [0.72, 0.26, 0.16][index];
    });
  }
  const dayElement = chart.pillarMap.day.stem.element;
  const dayIndex = ELEMENT_INDEX[dayElement];
  const resourceElement = Object.keys(ELEMENT_INDEX).find((element) => (ELEMENT_INDEX[element] + 1) % 5 === dayIndex);
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const supportRatio = (weights[dayElement] + weights[resourceElement]) / total;
  const strength = supportRatio >= 0.52 ? "strong" : supportRatio >= 0.37 ? "balanced" : "gentle";
  return { weights, supportRatio, strength };
}

function mainGods(counts) {
  return Object.entries(counts).sort((left, right) => right[1] - left[1]).slice(0, 3).map(([name]) => name);
}

function partnerLevel(chart, counts) {
  const target = chart.input.sex === "male" ? ["偏財", "正財"] : ["偏官", "正官"];
  const score = target.reduce((sum, name) => sum + counts[name], 0);
  if (score >= 2.5) return "strong";
  if (score >= 1) return "present";
  return "subtle";
}

function natalRelationKind(events) {
  const dayEvents = events.filter((event) => event.pillars.includes("day"));
  const relevant = dayEvents.length ? dayEvents : events;
  if (relevant.some((event) => event.type === "clash")) return "clash";
  if (relevant.some((event) => event.type === "harmony")) return "harmony";
  if (relevant.some((event) => event.type === "combine")) return "combine";
  return "steady";
}

function activeMajorLuck(majorLuck, age) {
  return majorLuck.find((row) => row.ageStart <= age && row.ageEnd >= age)
    || majorLuck.find((row) => row.ageStart > age)
    || majorLuck.at(-1);
}

function describePhase(pillar) {
  if (!pillar) return UNKNOWN_TIME_TEXT;
  return `${LIFE_PHASE_LEAD[pillar.key]}${PILLAR_NAMES[pillar.key]}は${pillar.label}で、内側に表れる通変星は${pillar.hiddenTenGod}です。${TEN_GOD_TEXT[pillar.hiddenTenGod].personality}`;
}

function describeRelation(event) {
  const pillarNames = event.pillars.map((key) => PILLAR_NAMES[key] || "運").join(event.type === "harmony" ? "・" : "―");
  if (event.type === "harmony") return `${pillarNames}：地支の三合`;
  if (event.type === "clash") return `${pillarNames}：地支の冲`;
  return `${pillarNames}：${event.layer === "stem" ? "天干の合" : "地支の六合"}`;
}

function relationMemo(events, targetKey) {
  const selected = targetKey ? events.filter((event) => event.pillars.includes(targetKey)) : events;
  if (!selected.length) return targetKey
    ? `${PILLAR_NAMES[targetKey]}に関わる大きな合・冲なし`
    : "命式内に大きな合・冲なし";
  return selected.map(describeRelation).join("／");
}

function hiddenGodMemo(pillars) {
  return pillars.filter(Boolean).map((pillar) => `${PILLAR_NAMES[pillar.key]}：${pillar.hiddenTenGod}`).join("／");
}

export function analyzeChart(chart, majorLuck, annualLuck) {
  const counts = countTenGods(chart);
  const balance = elementBalance(chart);
  const relationships = relationEvents(chart.pillars);
  const dominantGods = mainGods(counts);
  const relationKind = natalRelationKind(relationships);
  const currentAge = annualLuck[0].age;
  const currentMajor = activeMajorLuck(majorLuck, currentAge);
  const currentMajorIndex = majorLuck.indexOf(currentMajor);
  const nextMajor = majorLuck[Math.min(currentMajorIndex + 1, majorLuck.length - 1)];
  const lateMajor = activeMajorLuck(majorLuck, 65);
  return {
    counts,
    balance,
    relationships,
    dominantGods,
    relationKind,
    partnerLevel: partnerLevel(chart, counts),
    currentMajor,
    nextMajor,
    lateMajor,
    currentAnnual: annualLuck[0],
    currentLuckRelation: luckRelationKind(currentMajor.pillar, chart.pillars),
    annualRelation: luckRelationKind(annualLuck[0].pillar, chart.pillars),
  };
}

export function createOfflineReading(chart, majorLuck, annualLuck) {
  const analysis = analyzeChart(chart, majorLuck, annualLuck);
  const day = chart.pillarMap.day;
  const month = chart.pillarMap.month;
  const year = chart.pillarMap.year;
  const hour = chart.pillarMap.hour;
  const [firstGod, secondGod] = analysis.dominantGods;
  const currentLuck = LUCK_TEXT[analysis.currentMajor.pillar.tenGod];
  const nextLuck = LUCK_TEXT[analysis.nextMajor.pillar.tenGod];
  const annualTheme = LUCK_TEXT[analysis.currentAnnual.pillar.tenGod];
  const lateLuck = LUCK_TEXT[analysis.lateMajor.pillar.tenGod];
  const partnerStars = chart.input.sex === "male" ? "正財・偏財" : "正官・偏官";

  const personality = unique([
    DAY_STEM_TEXT[day.stem.char],
    `${TEN_GOD_TEXT[month.hiddenTenGod].personality}${TWELVE_STAGE_TEXT[day.twelveStage].energy}`,
    STRENGTH_TEXT[analysis.balance.strength].personality,
  ]);

  const love = unique([
    TEN_GOD_TEXT[day.hiddenTenGod].love,
    PARTNER_TEXT[analysis.partnerLevel],
    RELATION_TEXT[analysis.relationKind].love,
  ]);

  const workMoney = unique([
    `${TEN_GOD_TEXT[month.hiddenTenGod].work}${TEN_GOD_TEXT[firstGod].work}`,
    `${TEN_GOD_TEXT[month.hiddenTenGod].money}${TEN_GOD_TEXT[secondGod].money}`,
    STRENGTH_TEXT[analysis.balance.strength].work,
  ]);

  const people = unique([
    `${TEN_GOD_TEXT[year.hiddenTenGod].people}${TEN_GOD_TEXT[month.hiddenTenGod].people}`,
    hour ? TEN_GOD_TEXT[hour.hiddenTenGod].people : "出生時刻が不明のため、目下や後進との関係は他の三柱を中心に読んでいます。",
    RELATION_TEXT[analysis.relationKind].people,
  ]);

  const lifePhases = [describePhase(year), describePhase(month), describePhase(day), describePhase(hour)];
  const lateLife = hour
    ? `時柱の十二運は${hour.twelveStage}です。${TWELVE_STAGE_TEXT[hour.twelveStage].late}65歳前後に巡る大運は${analysis.lateMajor.pillar.label}・${analysis.lateMajor.pillar.tenGod}で、${lateLuck.theme}が晩年の大きな題材になります。${lateLuck.action}を意識すると持ち味を活かせます。`
    : `${UNKNOWN_TIME_TEXT}65歳前後に巡る大運は${analysis.lateMajor.pillar.label}・${analysis.lateMajor.pillar.tenGod}で、${lateLuck.theme}が大きな題材になります。`;
  const future = unique([
    `${lifePhases[0]} ${lifePhases[1]}`,
    `${lifePhases[2]} ${lifePhases[3]}`,
    `現在の${analysis.currentMajor.ageStart}〜${analysis.currentMajor.ageEnd}歳は${analysis.currentMajor.pillar.label}・${analysis.currentMajor.pillar.tenGod}の大運で、${currentLuck.theme}です。${currentLuck.action}が運を活かす行動になり、${currentLuck.caution}が注意点です。${RELATION_TEXT[analysis.currentLuckRelation].future}`,
    `次の${analysis.nextMajor.ageStart}〜${analysis.nextMajor.ageEnd}歳は${analysis.nextMajor.pillar.label}・${analysis.nextMajor.pillar.tenGod}の大運です。${nextLuck.theme}へ移るため、${nextLuck.action}を少しずつ準備すると流れに乗りやすくなります。`,
    `${analysis.currentAnnual.year}年は${analysis.currentAnnual.pillar.label}・${analysis.currentAnnual.pillar.tenGod}の年運で、${annualTheme.theme}です。${annualTheme.action}を大切にし、${annualTheme.caution}を心がけてください。${RELATION_TEXT[analysis.annualRelation].future}`,
    lateLife,
  ]);

  return {
    analysis,
    sections: [
      {
        id: "personality",
        title: "あなたの本質・性格",
        paragraphs: personality,
        memo: [
          `日干：${day.stem.char}（${day.stem.reading}／${day.stem.polarity}の${day.stem.element}）`,
          `月柱・月令：${month.label}／${month.branch.char}（${month.branch.reading}・${month.branch.element}）、${chart.monthBoundary.name}から判定`,
          `日柱の十二運：${day.twelveStage}`,
          `日主の状態：${STRENGTH_LABELS[analysis.balance.strength]}`,
          `中心となる通変星：${analysis.dominantGods.join("・")}`,
        ],
      },
      {
        id: "love",
        title: "恋愛運・結婚運",
        paragraphs: love,
        memo: [
          `日支（配偶者宮）：${day.branch.char}（${day.branch.reading}）`,
          `日支の蔵干・通変星：${day.hiddenStem.char}（${day.hiddenStem.reading}）／${day.hiddenTenGod}`,
          `配偶者星：${partnerStars}（${PARTNER_LEVEL_LABELS[analysis.partnerLevel]}）`,
          `関係性の動き：${relationMemo(analysis.relationships, "day")}`,
        ],
      },
      {
        id: "work-money",
        title: "仕事運・金運",
        paragraphs: workMoney,
        memo: [
          `社会運を見る月柱：${month.label}`,
          `月柱の通変星：天干 ${month.tenGod}／蔵干 ${month.hiddenTenGod}`,
          `命式で強く表れる通変星：${analysis.dominantGods.join("・")}`,
          `日主の状態：${STRENGTH_LABELS[analysis.balance.strength]}`,
        ],
      },
      {
        id: "relationships",
        title: "人間関係運",
        paragraphs: people,
        memo: [
          `各柱の蔵干通変星：${hiddenGodMemo([year, month, day, hour])}`,
          `命式内の関係：${relationMemo(analysis.relationships)}`,
          hour ? `時柱：${hour.label}（目下・後進との関係も反映）` : "時柱：出生時刻不明のため判定に含めず",
        ],
      },
      {
        id: "future",
        title: "今後の運気の流れ",
        note: "大まかな流れ・転機・晩年",
        paragraphs: future,
        memo: [
          `現在の大運：${analysis.currentMajor.ageStart}〜${analysis.currentMajor.ageEnd}歳 ${analysis.currentMajor.pillar.label}／${analysis.currentMajor.pillar.tenGod}／${analysis.currentMajor.pillar.twelveStage}`,
          `次の大運：${analysis.nextMajor.ageStart}〜${analysis.nextMajor.ageEnd}歳 ${analysis.nextMajor.pillar.label}／${analysis.nextMajor.pillar.tenGod}／${analysis.nextMajor.pillar.twelveStage}`,
          `現在の年運：${analysis.currentAnnual.year}年 ${analysis.currentAnnual.pillar.label}／${analysis.currentAnnual.pillar.tenGod}／${analysis.currentAnnual.pillar.twelveStage}`,
          hour ? `晩年を見る時柱：${hour.label}／${hour.hiddenTenGod}／${hour.twelveStage}` : "晩年を見る時柱：出生時刻不明のため限定的に判定",
          `65歳前後の大運：${analysis.lateMajor.ageStart}〜${analysis.lateMajor.ageEnd}歳 ${analysis.lateMajor.pillar.label}／${analysis.lateMajor.pillar.tenGod}`,
        ],
      },
    ],
  };
}
