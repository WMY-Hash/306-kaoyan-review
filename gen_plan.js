// 生成 data/plan.js —— 由 kb.js 的章节结构按权重派生的默认逐周计划骨架。
// 真实计划内容（postgrad_plan_mingyuan.md）可整体替换 window.KB_PLAN.weeks 数组。
const vm = require("vm");
const fs = require("fs");
const code = fs.readFileSync("data/kb.js", "utf8");
const ctx = { window: {} };
vm.runInNewContext(code, ctx);
const KB = ctx.window.KB_DATA;

const subjMap = {};
KB.subjects.forEach(s => { subjMap[s.id] = s; });

// 周 -> 章节分配（按权重优先级：内33 > 外23 > 生14 > 化12 > 病12 > 文6）
const plan = [
  { id: "w1",  range: "9月·第1周",  phase: "一轮·内科", books: ["人卫第10版《内科学》循环/呼吸/消化/肾", "贺银成讲义 内科对应篇"], chapters: ["internal_ch1", "internal_ch2"] },
  { id: "w2",  range: "9月·第2周",  phase: "一轮·内科", books: ["人卫第10版《内科学》内分泌", "贺银成讲义 内分泌篇"], chapters: ["internal_ch3"] },
  { id: "w3",  range: "9月·第3周",  phase: "一轮·内科", books: ["人卫第10版《内科学》泌尿/风湿免疫", "贺银成讲义 对应篇"], chapters: ["internal_ch4", "internal_ch5"] },
  { id: "w4",  range: "9月·第4周",  phase: "一轮·内科", books: ["人卫第10版《内科学》血液系统", "贺银成讲义 血液篇"], chapters: ["internal_ch6"] },
  { id: "w5",  range: "10月·第1周", phase: "一轮·外科", books: ["人卫第10版《外科学》总论/创伤骨科", "贺银成讲义 外科总论篇"], chapters: ["surgery_ch1", "surgery_ch2"] },
  { id: "w6",  range: "10月·第2周", phase: "一轮·外科", books: ["人卫第10版《外科学》感染/围术期", "贺银成讲义 对应篇"], chapters: ["surgery_ch3", "surgery_ch4"] },
  { id: "w7",  range: "10月·第3周", phase: "一轮·外科", books: ["人卫第10版《外科学》腹部损伤/消化外科", "贺银成讲义 消化外科篇"], chapters: ["surgery_ch5", "surgery_ch6"] },
  { id: "w8",  range: "10月·第4周", phase: "一轮·外科", books: ["人卫第10版《外科学》疝/血管/肿瘤", "贺银成讲义 对应篇"], chapters: ["surgery_ch7", "surgery_ch8"] },
  { id: "w9",  range: "11月·第1周", phase: "一轮·生理", books: ["人卫第10版《生理学》前3章", "贺银成讲义 生理篇"], chapters: ["physio_ch1", "physio_ch2", "physio_ch3"] },
  { id: "w10", range: "11月·第2周", phase: "一轮·生理", books: ["人卫第10版《生理学》循环电生理/呼吸/消化", "贺银成讲义 生理篇"], chapters: ["physio_ch4", "physio_ch5", "physio_ch6"] },
  { id: "w11", range: "11月·第3周", phase: "一轮·生理", books: ["人卫第10版《生理学》能量/泌尿/神经/内分泌", "贺银成讲义 生理篇"], chapters: ["physio_ch7", "physio_ch8", "physio_ch9", "physio_ch10"] },
  { id: "w12", range: "11月·第4周", phase: "一轮·生化", books: ["人卫第10版《生物化学》糖/基因/脂代谢", "贺银成讲义 生化篇"], chapters: ["biochem_ch1", "biochem_ch2", "biochem_ch3"] },
  { id: "w13", range: "12月·第1周", phase: "一轮·生化", books: ["人卫第10版《生物化学》蛋白/氨基酸/核苷酸/肝胆", "贺银成讲义 生化篇"], chapters: ["biochem_ch4", "biochem_ch5", "biochem_ch6", "biochem_ch7"] },
  { id: "w14", range: "12月·第2周", phase: "一轮·病理", books: ["人卫第10版《病理学》适应损伤/循环/心血管", "贺银成讲义 病理篇"], chapters: ["pathol_ch1", "pathol_ch2", "pathol_ch3", "pathol_ch4"] },
  { id: "w15", range: "12月·第3周", phase: "一轮·病理", books: ["人卫第10版《病理学》呼吸/消化/泌尿生殖/传染病", "贺银成讲义 病理篇"], chapters: ["pathol_ch5", "pathol_ch6", "pathol_ch7", "pathol_ch8"] },
  { id: "w16", range: "12月·第4周", phase: "一轮·人文 + 二轮启动", books: ["人卫第10版《医学人文》全章", "贺银成人文讲义", "开始二轮：错题本 + 看板复习队列"], chapters: ["humanity_ch1", "humanity_ch2", "humanity_ch3", "humanity_ch4"] },
];

const weeks = plan.map(w => {
  const tasks = [];
  for (const chId of w.chapters) {
    const subj = KB.subjects.find(s => s.chapters.some(c => c.id === chId));
    const ch = subj.chapters.find(c => c.id === chId);
    tasks.push({
      id: "t_" + chId,
      subject: subj.id,
      chapter: chId,
      title: ch.name,
      note: "通读考点正文 + 卡片自测 + 标记错题",
      points: ch.points.length
    });
  }
  tasks.push({
    id: "t_" + w.id + "_drill",
    subject: null,
    chapter: null,
    title: "本周真题自测 + 错题整理",
    note: "配套真题/贺银成，做完进错题本，周末回看",
    points: 0
  });
  return {
    id: w.id,
    label: w.id.toUpperCase(),
    range: w.range,
    phase: w.phase,
    books: w.books,
    tasks: tasks
  };
});

const out =
`// ============================================================================
//  M4 计划闭环 —— 逐周复习计划（window.KB_PLAN）
//  默认骨架：由 kb.js 章节按 306 权重（内33/外23/生14/化12/病12/文6）派生。
//  替换为真实计划：直接改写下面 KB_PLAN.weeks 数组即可（结构见 README 的 M4 节）。
//  字段：week{ id,label,range,phase,books[],tasks[] }
//        task{ id,subject?,chapter?,title,note,points }
//  任务完成态存 localStorage（key=kp_<taskId>），与考点进度分离。
// ============================================================================
window.KB_PLAN = {
  meta: {
    title: "大四上 306 逐周复习计划（默认骨架）",
    note: "由现有考点库章节按权重生成；替换为真实 postgrad_plan_mingyuan.md 内容时只改 weeks 数组。",
    updated: "${KB.meta.updated}"
  },
  weeks: ${JSON.stringify(weeks, null, 2)}
};
`;

fs.writeFileSync("data/plan.js", out);
const totalTasks = weeks.reduce((a, w) => a + w.tasks.length, 0);
const totalPoints = weeks.reduce((a, w) => a + w.tasks.filter(t => t.points).reduce((b, t) => b + t.points, 0), 0);
console.log("weeks:", weeks.length, "tasks:", totalTasks, "coveredPoints:", totalPoints);
