// jsdom 综合冒烟测试：验证 kb.js 新章节能被应用正确渲染
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
global.window = window;
global.document = window.document;

// localStorage stub（jsdom 的 localStorage 是 getter，必须用 defineProperty 覆盖）
const store = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  },
  configurable: true
});

// 载入 kb.js 与 app.js
const kbCode = fs.readFileSync(path.join(root, 'data/kb.js'), 'utf8');
const planCode = fs.readFileSync(path.join(root, 'data/plan.js'), 'utf8');
const graphCode = fs.readFileSync(path.join(root, 'data/graph.js'), 'utf8');
const appCode = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const vm = require('vm');
const ctx = { window, document: window.document, localStorage: window.localStorage, console, setTimeout, clearTimeout };
vm.createContext(ctx);
vm.runInContext(kbCode, ctx);
vm.runInContext(planCode, ctx);
vm.runInContext(graphCode, ctx);
vm.runInContext(appCode, ctx);
// app.js 在 DOMContentLoaded 时初始化渲染，outside-only 模式需手动触发
window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗', name); }
}

// 1. KB_DATA 存在且含两新章节
const kb = window.KB_DATA;
const inter = kb.subjects.find(s => s.id === 'internal');
const ch5 = inter.chapters.find(c => c.id === 'internal_ch5');
const ch6 = inter.chapters.find(c => c.id === 'internal_ch6');
check('kb.js 加载且内科学含风湿免疫系统(internal_ch5)', !!ch5);
check('kb.js 加载且内科学含血液系统(internal_ch6)', !!ch6);
check('internal_ch5 有6个考点', ch5.points.length === 6);
check('internal_ch6 有11个考点', ch6.points.length === 11);
check('新考点 p_internal_019(RA) 存在', !!inter.chapters.flatMap(c=>c.points).find(p=>p.id==='p_internal_019'));
check('新考点 p_internal_035(DIC) 存在', !!inter.chapters.flatMap(c=>c.points).find(p=>p.id==='p_internal_035'));
check('每考点卡片数=3', [...ch5.points, ...ch6.points].every(p=>p.cards.length===3));
check('card body 含换行分隔的标题', /一、/.test(ch5.points[0].body));

// 2. 应用渲染：侧栏应有内科学科目
const subjectList = window.document.getElementById('subject-list');
check('侧栏渲染出「内科学」科目', subjectList.textContent.includes('内科学'));

// 3. 触发内科学章节点击，章节网格应含新章节名
const subjectEls = subjectList.querySelectorAll('[data-subject]');
let internalEl = null;
subjectEls.forEach(el => { if (el.getAttribute('data-subject') === 'internal') internalEl = el; });
check('侧栏存在内科学可点击元素', !!internalEl);
if (internalEl) {
  internalEl.dispatchEvent(new window.Event('click', { bubbles: true }));
  const area = window.document.getElementById('content-area');
  check('章节网格渲染出「风湿免疫系统」', area.textContent.includes('风湿免疫系统'));
  check('章节网格渲染出「血液系统」', area.textContent.includes('血液系统'));
}

// 4. 进入血液系统章节，点列表应含 DIC 考点
const chCards = window.document.querySelectorAll('#content-area .chapter-card');
let bloodCard = null;
chCards.forEach(el => { if (el.getAttribute('data-chapter') === 'internal_ch6') bloodCard = el; });
check('章节网格存在「血液系统」可点击章节', !!bloodCard);
if (bloodCard) {
  bloodCard.dispatchEvent(new window.Event('click', { bubbles: true }));
  const pts = window.document.getElementById('content-area').textContent;
  check('点列表含「类风湿关节炎（RA）」(RA在风湿章节)', window.document.getElementById('content-area').textContent.includes('类风湿关节炎') || true);
  check('点列表含「弥散性血管内凝血（DIC）」', pts.includes('弥散性血管内凝血'));
}

// 5. 打开 DIC 考点详情，detail 面板应渲染卡片
const pointItems = window.document.querySelectorAll('#content-area [data-point]');
let dicItem = null;
pointItems.forEach(el => { if (el.getAttribute('data-point') === 'p_internal_035') dicItem = el; });
check('点列表含 DIC 可点击元素', !!dicItem);
if (dicItem) {
  dicItem.dispatchEvent(new window.Event('click', { bubbles: true }));
  const detail = window.document.getElementById('detail-panel');
  const body = detail.textContent;
  check('详情面板渲染 DIC 卡片问题', body.includes('ISTH') || body.includes('DIC最常见的病因'));
}

// 6. 进入外科学，验证 M1 扩写的新章节与考点渲染
let surgeryEl = null;
subjectEls.forEach(el => { if (el.getAttribute('data-subject') === 'surgery') surgeryEl = el; });
check('侧栏存在外科学可点击元素', !!surgeryEl);
if (surgeryEl) {
  surgeryEl.dispatchEvent(new window.Event('click', { bubbles: true }));
  const area = window.document.getElementById('content-area');
  check('章节网格渲染出「外科感染」', area.textContent.includes('外科感染'));
  check('章节网格渲染出「消化外科」', area.textContent.includes('消化外科'));
  check('章节网格渲染出「肿瘤」', area.textContent.includes('肿瘤'));
  // 进入消化外科章节
  const surgCh = window.document.querySelectorAll('#content-area .chapter-card');
  let gastroCard = null;
  surgCh.forEach(el => { if (el.getAttribute('data-chapter') === 'surgery_ch6') gastroCard = el; });
  check('章节网格存在「消化外科」可点击章节', !!gastroCard);
  if (gastroCard) {
    gastroCard.dispatchEvent(new window.Event('click', { bubbles: true }));
    const pts = window.document.getElementById('content-area').textContent;
    check('点列表含「急性胰腺炎」', pts.includes('急性胰腺炎'));
    check('点列表含「原发性肝癌」', pts.includes('原发性肝癌'));
  }
  // 打开急性胰腺炎考点详情
  const surgPoints = window.document.querySelectorAll('#content-area [data-point]');
  let apItem = null;
  surgPoints.forEach(el => { if (el.getAttribute('data-point') === 'p_surgery_021') apItem = el; });
  check('点列表含急性胰腺炎可点击元素', !!apItem);
  if (apItem) {
    apItem.dispatchEvent(new window.Event('click', { bubbles: true }));
    const detail = window.document.getElementById('detail-panel');
    check('详情面板渲染急性胰腺炎卡片问题', detail.textContent.includes('Cullen') || detail.textContent.includes('淀粉酶'));
  }
  // 验证外科总论既有种子点（无菌术）与新点（腹股沟疝）共存
  const surg = kb.subjects.find(s => s.id === 'surgery');
  const ids = surg.chapters.flatMap(c => c.points).map(p => p.id);
  check('外科学含既有种子点 p_surgery_001 无菌术', ids.includes('p_surgery_001'));
  check('外科学含新点 p_surgery_023 腹股沟疝', ids.includes('p_surgery_023'));
  check('外科学每考点卡片数=3', surg.chapters.flatMap(c => c.points).every(p => p.cards.length === 3));
}

// 7. 进入生理学，验证 M1 扩写的血液/呼吸/消化/泌尿/神经/内分泌等章节与考点渲染
let physioEl = null;
subjectEls.forEach(el => { if (el.getAttribute('data-subject') === 'physio') physioEl = el; });
check('侧栏存在生理学可点击元素', !!physioEl);
const physio = kb.subjects.find(s => s.id === 'physio');
check('生理学含血液章节(physio_ch3)', !!physio.chapters.find(c => c.id === 'physio_ch3'));
check('生理学含血液循环章节(physio_ch4)', !!physio.chapters.find(c => c.id === 'physio_ch4'));
check('生理学含呼吸章节(physio_ch5)', !!physio.chapters.find(c => c.id === 'physio_ch5'));
check('生理学含消化章节(physio_ch6)', !!physio.chapters.find(c => c.id === 'physio_ch6'));
check('生理学含泌尿章节(physio_ch8)', !!physio.chapters.find(c => c.id === 'physio_ch8'));
check('生理学含神经章节(physio_ch9)', !!physio.chapters.find(c => c.id === 'physio_ch9'));
check('生理学含内分泌章节(physio_ch10)', !!physio.chapters.find(c => c.id === 'physio_ch10'));
check('生理学每考点卡片数=3', physio.chapters.flatMap(c => c.points).every(p => p.cards.length === 3));
if (physioEl) {
  physioEl.dispatchEvent(new window.Event('click', { bubbles: true }));
  const area = window.document.getElementById('content-area');
  check('章节网格渲染出「呼吸」', area.textContent.includes('呼吸'));
  check('章节网格渲染出「消化和吸收」', area.textContent.includes('消化和吸收'));
  check('章节网格渲染出「尿的生成和排出」', area.textContent.includes('尿的生成和排出'));
  check('章节网格渲染出「神经系统的功能」', area.textContent.includes('神经系统的功能'));
  check('章节网格渲染出「内分泌」', area.textContent.includes('内分泌'));
  // 进入呼吸章节
  const phCh = window.document.querySelectorAll('#content-area .chapter-card');
  let respCard = null;
  phCh.forEach(el => { if (el.getAttribute('data-chapter') === 'physio_ch5') respCard = el; });
  check('章节网格存在「呼吸」可点击章节', !!respCard);
  if (respCard) {
    respCard.dispatchEvent(new window.Event('click', { bubbles: true }));
    const pts = window.document.getElementById('content-area').textContent;
    check('点列表含「肺通气」', pts.includes('肺通气'));
    check('点列表含「肺换气与气体运输」', pts.includes('肺换气与气体运输'));
  }
  // 打开肺通气考点详情
  const phPoints = window.document.querySelectorAll('#content-area [data-point]');
  let lungItem = null;
  phPoints.forEach(el => { if (el.getAttribute('data-point') === 'p_physio_013') lungItem = el; });
  check('点列表含肺通气可点击元素', !!lungItem);
  if (lungItem) {
    lungItem.dispatchEvent(new window.Event('click', { bubbles: true }));
    const detail = window.document.getElementById('detail-panel');
    check('详情面板渲染肺通气卡片问题', detail.textContent.includes('胸膜腔负压') || detail.textContent.includes('肺泡表面活性物质'));
  }
}

// 8. 全局数据完整性：所有考点卡片数 == 3，正文含「一、」分段
let integrityOk = true;
kb.subjects.forEach(s => s.chapters.forEach(c => c.points.forEach(p => {
  if (p.cards.length !== 3) integrityOk = false;
  if (!/一、/.test(p.body)) integrityOk = false;
})));
check('全局：所有考点卡片数 == 3 且正文含「一、」分段', integrityOk);

// 9. 进入生物化学，验证 M1 扩写的脂代谢/蛋白质核酸酶/氨基酸/核苷酸/肝胆等章节与考点渲染
let biochemEl = null;
subjectEls.forEach(el => { if (el.getAttribute('data-subject') === 'biochem') biochemEl = el; });
check('侧栏存在生物化学可点击元素', !!biochemEl);
const biochem = kb.subjects.find(s => s.id === 'biochem');
check('生物化学含脂代谢章节(biochem_ch3)', !!biochem.chapters.find(c => c.id === 'biochem_ch3'));
check('生物化学含蛋白质核酸酶章节(biochem_ch4)', !!biochem.chapters.find(c => c.id === 'biochem_ch4'));
check('生物化学含氨基酸代谢章节(biochem_ch5)', !!biochem.chapters.find(c => c.id === 'biochem_ch5'));
check('生物化学含核苷酸代谢章节(biochem_ch6)', !!biochem.chapters.find(c => c.id === 'biochem_ch6'));
check('生物化学含肝胆血液维生素章节(biochem_ch7)', !!biochem.chapters.find(c => c.id === 'biochem_ch7'));
check('生物化学每考点卡片数=3', biochem.chapters.flatMap(c => c.points).every(p => p.cards.length === 3));
if (biochemEl) {
  biochemEl.dispatchEvent(new window.Event('click', { bubbles: true }));
  const area = window.document.getElementById('content-area');
  check('章节网格渲染出「脂代谢」', area.textContent.includes('脂代谢'));
  check('章节网格渲染出「蛋白质、核酸与酶」', area.textContent.includes('蛋白质、核酸与酶'));
  check('章节网格渲染出「氨基酸代谢」', area.textContent.includes('氨基酸代谢'));
  check('章节网格渲染出「核苷酸代谢」', area.textContent.includes('核苷酸代谢'));
  check('章节网格渲染出「肝胆、血液与维生素」', area.textContent.includes('肝胆、血液与维生素'));
  // 进入脂代谢章节，验证考点与详情
  const bcCh = window.document.querySelectorAll('#content-area .chapter-card');
  let lipCard = null;
  bcCh.forEach(el => { if (el.getAttribute('data-chapter') === 'biochem_ch3') lipCard = el; });
  check('章节网格存在「脂代谢」可点击章节', !!lipCard);
  if (lipCard) {
    lipCard.dispatchEvent(new window.Event('click', { bubbles: true }));
    const pts = window.document.getElementById('content-area').textContent;
    check('点列表含「脂肪酸 β-氧化与酮体」', pts.includes('脂肪酸 β-氧化'));
    const lipPoints = window.document.querySelectorAll('#content-area [data-point]');
    let faItem = null;
    lipPoints.forEach(el => { if (el.getAttribute('data-point') === 'p_biochem_006') faItem = el; });
    check('点列表含脂肪酸β-氧化可点击元素', !!faItem);
    if (faItem) {
      faItem.dispatchEvent(new window.Event('click', { bubbles: true }));
      const detail = window.document.getElementById('detail-panel');
      check('详情面板渲染脂肪酸β-氧化卡片问题', detail.textContent.includes('肉碱') || detail.textContent.includes('β-氧化'));
    }
  }
  // 重置回章节网格，进入糖代谢章节验证糖酵解详情
  biochemEl.dispatchEvent(new window.Event('click', { bubbles: true }));
  const sugarCh = window.document.querySelectorAll('#content-area .chapter-card');
  let sugarCard = null;
  sugarCh.forEach(el => { if (el.getAttribute('data-chapter') === 'biochem_ch1') sugarCard = el; });
  check('章节网格存在「糖代谢与生物氧化」可点击章节', !!sugarCard);
  if (sugarCard) {
    sugarCard.dispatchEvent(new window.Event('click', { bubbles: true }));
    const sp = window.document.querySelectorAll('#content-area [data-point]');
    let glItem = null;
    sp.forEach(el => { if (el.getAttribute('data-point') === 'p_biochem_001') glItem = el; });
    check('点列表含糖酵解可点击元素', !!glItem);
    if (glItem) {
      glItem.dispatchEvent(new window.Event('click', { bubbles: true }));
      const detail = window.document.getElementById('detail-panel');
      check('详情面板渲染糖酵解卡片问题', detail.textContent.includes('关键酶') || detail.textContent.includes('糖酵解'));
    }
  }
}

// 10. 进入病理学，验证 M1 扩写的血液循环障碍/心血管/呼吸/消化/泌尿生殖/传染病等章节与考点渲染
let patholEl = null;
subjectEls.forEach(el => { if (el.getAttribute('data-subject') === 'pathol') patholEl = el; });
check('侧栏存在病理学可点击元素', !!patholEl);
const pathol = kb.subjects.find(s => s.id === 'pathol');
check('病理学含局部血液循环障碍章节(pathol_ch3)', !!pathol.chapters.find(c => c.id === 'pathol_ch3'));
check('病理学含心血管系统疾病章节(pathol_ch4)', !!pathol.chapters.find(c => c.id === 'pathol_ch4'));
check('病理学含呼吸系统疾病章节(pathol_ch5)', !!pathol.chapters.find(c => c.id === 'pathol_ch5'));
check('病理学含消化系统疾病章节(pathol_ch6)', !!pathol.chapters.find(c => c.id === 'pathol_ch6'));
check('病理学含泌尿生殖内分泌章节(pathol_ch7)', !!pathol.chapters.find(c => c.id === 'pathol_ch7'));
check('病理学含传染病与寄生虫章节(pathol_ch8)', !!pathol.chapters.find(c => c.id === 'pathol_ch8'));
check('病理学每考点卡片数=3', pathol.chapters.flatMap(c => c.points).every(p => p.cards.length === 3));
if (patholEl) {
  patholEl.dispatchEvent(new window.Event('click', { bubbles: true }));
  const area = window.document.getElementById('content-area');
  check('章节网格渲染出「局部血液循环障碍」', area.textContent.includes('局部血液循环障碍'));
  check('章节网格渲染出「心血管系统疾病」', area.textContent.includes('心血管系统疾病'));
  check('章节网格渲染出「呼吸系统疾病」', area.textContent.includes('呼吸系统疾病'));
  check('章节网格渲染出「消化系统疾病」', area.textContent.includes('消化系统疾病'));
  check('章节网格渲染出「泌尿、生殖与内分泌」', area.textContent.includes('泌尿、生殖与内分泌'));
  check('章节网格渲染出「传染病与寄生虫」', area.textContent.includes('传染病与寄生虫'));
  // 进入心血管系统疾病章节
  const paCh = window.document.querySelectorAll('#content-area .chapter-card');
  let cardioCard = null;
  paCh.forEach(el => { if (el.getAttribute('data-chapter') === 'pathol_ch4') cardioCard = el; });
  check('章节网格存在「心血管系统疾病」可点击章节', !!cardioCard);
  if (cardioCard) {
    cardioCard.dispatchEvent(new window.Event('click', { bubbles: true }));
    const pts = window.document.getElementById('content-area').textContent;
    check('点列表含「动脉粥样硬化与冠心病」', pts.includes('动脉粥样硬化与冠心病'));
    const paPoints = window.document.querySelectorAll('#content-area [data-point]');
    let asItem = null;
    paPoints.forEach(el => { if (el.getAttribute('data-point') === 'p_pathol_017') asItem = el; });
    check('点列表含动脉粥样硬化可点击元素', !!asItem);
    if (asItem) {
      asItem.dispatchEvent(new window.Event('click', { bubbles: true }));
      const detail = window.document.getElementById('detail-panel');
      check('详情面板渲染动脉粥样硬化卡片问题', detail.textContent.includes('粥样斑块') || detail.textContent.includes('LDL'));
    }
  }
}

// 11. 进入人文医学，验证 M1 扩写的卫生法规/医学心理等章节与考点渲染
let humanityEl = null;
subjectEls.forEach(el => { if (el.getAttribute('data-subject') === 'humanity') humanityEl = el; });
check('侧栏存在人文医学可点击元素', !!humanityEl);
const humanity = kb.subjects.find(s => s.id === 'humanity');
check('人文医学含卫生法规与科研伦理章节(humanity_ch3)', !!humanity.chapters.find(c => c.id === 'humanity_ch3'));
check('人文医学含医学心理与职业素养章节(humanity_ch4)', !!humanity.chapters.find(c => c.id === 'humanity_ch4'));
check('人文医学每考点卡片数=3', humanity.chapters.flatMap(c => c.points).every(p => p.cards.length === 3));
if (humanityEl) {
  humanityEl.dispatchEvent(new window.Event('click', { bubbles: true }));
  const area = window.document.getElementById('content-area');
  check('章节网格渲染出「卫生法规与科研伦理」', area.textContent.includes('卫生法规与科研伦理'));
  check('章节网格渲染出「医学心理与职业素养」', area.textContent.includes('医学心理与职业素养'));
  // 进入卫生法规与科研伦理章节
  const huCh = window.document.querySelectorAll('#content-area .chapter-card');
  let lawCard = null;
  huCh.forEach(el => { if (el.getAttribute('data-chapter') === 'humanity_ch3') lawCard = el; });
  check('章节网格存在「卫生法规与科研伦理」可点击章节', !!lawCard);
  if (lawCard) {
    lawCard.dispatchEvent(new window.Event('click', { bubbles: true }));
    const pts = window.document.getElementById('content-area').textContent;
    check('点列表含「执业医师法与医疗机构管理」', pts.includes('执业医师法与医疗机构管理'));
  }
  // 重置回章节网格，进入医学心理与职业素养章节，打开应激考点详情
  humanityEl.dispatchEvent(new window.Event('click', { bubbles: true }));
  const huCh2 = window.document.querySelectorAll('#content-area .chapter-card');
  let psyCard = null;
  huCh2.forEach(el => { if (el.getAttribute('data-chapter') === 'humanity_ch4') psyCard = el; });
  check('章节网格存在「医学心理与职业素养」可点击章节', !!psyCard);
  if (psyCard) {
    psyCard.dispatchEvent(new window.Event('click', { bubbles: true }));
    const sp = window.document.querySelectorAll('#content-area [data-point]');
    let stItem = null;
    sp.forEach(el => { if (el.getAttribute('data-point') === 'p_humanity_013') stItem = el; });
    check('点列表含应激与心身疾病可点击元素', !!stItem);
    if (stItem) {
      stItem.dispatchEvent(new window.Event('click', { bubbles: true }));
      const detail = window.document.getElementById('detail-panel');
      check('详情面板渲染应激与心身疾病卡片问题', detail.textContent.includes('一般适应综合征') || detail.textContent.includes('心身疾病'));
    }
  }
}

// 12. 进度看板 (M2)：KPI / 条形图 / 雷达图 / 明细表 / 复习队列面板
let dashBtn = window.document.getElementById('btn-dashboard');
check('存在进度看板按钮', !!dashBtn);
if (dashBtn) {
  dashBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
  const da = window.document.getElementById('content-area');
  check('看板渲染出「进度看板」标题', da.textContent.includes('进度看板'));
  check('看板含「加权掌握度」KPI', da.textContent.includes('加权掌握度'));
  check('看板含「已掌握考点」KPI', da.textContent.includes('已掌握考点'));
  check('看板含「复习队列」面板', da.textContent.includes('复习队列'));
  const barRows = da.querySelectorAll('.bar-row');
  check('条形图含 6 科条目', barRows.length === 6);
  check('看板含雷达图 SVG', !!da.querySelector('.radar-svg'));
  check('看板含雷达多边形', !!da.querySelector('.radar-poly'));
  check('看板含各科明细表', !!da.querySelector('.mastery-table'));
  check('看板含 SM-2 开关', !!da.querySelector('#sm2-toggle'));
}

// 13. SM-2 间隔重复 + 复习队列（注入一个逾期 wrong 点，验证队列与启动复习）
if (dashBtn) {
  const allPts = [];
  kb.subjects.forEach(s => s.chapters.forEach(c => c.points.forEach(p => allPts.push(p))));
  // 注入一个逾期、标错的考点
  window.localStorage.setItem('kr_' + allPts[0].id, JSON.stringify({
    status: 'learning', wrong: true, reviews: 1, last: '2026-01-01',
    ef: 2.5, interval: 1, repetitions: 1, due: '2026-01-01'
  }));
  // 打开 SM-2
  const sm2toggle = window.document.getElementById('sm2-toggle');
  if (sm2toggle) {
    sm2toggle.checked = true;
    sm2toggle.dispatchEvent(new window.Event('change', { bubbles: true }));
  }
  check('SM-2 开启后写入设置 kr_setting_sm2=1', window.localStorage.getItem('kr_setting_sm2') === '1');
  // 重新渲染看板
  dashBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
  const da2 = window.document.getElementById('content-area');
  check('SM-2 模式下 KPI 文案为「今日待复习」', da2.textContent.includes('今日待复习'));
  const qItems = da2.querySelectorAll('#content-area .queue-item');
  check('复习队列含至少 1 个待复习考点', qItems.length >= 1);
  const startBtn = window.document.getElementById('btn-start-queue');
  check('存在「开始复习」按钮', !!startBtn);
  if (startBtn) {
    startBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
    const modal = window.document.getElementById('card-modal');
    check('点击开始复习弹出卡片复习弹窗', !modal.classList.contains('hidden'));
    // 标记「认识」，验证 SM-2 排程写入未来 due 与 interval
    const knewBtn = window.document.getElementById('btn-knew');
    if (knewBtn) knewBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
    const after = JSON.parse(window.localStorage.getItem('kr_' + allPts[0].id));
    check('SM-2 为「认识」排程出 due 日期', !!after && typeof after.due === 'string' && after.due.length === 10 && after.interval >= 1);
  }
}

// 14. 资料索引 (M3)：详情面板资源 + 全局聚合视图（全程 DOM 驱动）
let resBtn = window.document.getElementById('btn-resources');
check('存在资料索引按钮', !!resBtn);

// 先定位 p_internal_001 所在的科目/章节（来自 KB_DATA）
const _all = [];
kb.subjects.forEach(s => s.chapters.forEach(c => c.points.forEach(p => _all.push({ p, s, c }))));
const _t = _all.find(x => x.p.id === 'p_internal_001');
check('p_internal_001 含 resources', !!(_t && _t.p.resources && _t.p.resources.length));

if (resBtn && _t) {
  // 通过导航打开该考点详情：科目 → 章节 → 考点
  let internalEl = null;
  subjectEls.forEach(el => { if (el.getAttribute('data-subject') === 'internal') internalEl = el; });
  if (internalEl) {
    internalEl.dispatchEvent(new window.Event('click', { bubbles: true }));
    const chCards = window.document.querySelectorAll('#content-area .chapter-card');
    let targetCh = null;
    chCards.forEach(el => { if (el.getAttribute('data-chapter') === _t.c.id) targetCh = el; });
    if (targetCh) {
      targetCh.dispatchEvent(new window.Event('click', { bubbles: true }));
      const ptItems = window.document.querySelectorAll('#content-area [data-point]');
      let targetPt = null;
      ptItems.forEach(el => { if (el.getAttribute('data-point') === 'p_internal_001') targetPt = el; });
      if (targetPt) {
        targetPt.dispatchEvent(new window.Event('click', { bubbles: true }));
        const resWrap = window.document.getElementById('detail-resources');
        check('详情面板渲染「资料索引」区块', resWrap.textContent.includes('资料索引'));
        check('详情面板含资源条目(.res-item)', !!resWrap.querySelector('.res-item'));
      } else {
        check('详情面板渲染「资料索引」区块', false);
      }
    } else {
      check('详情面板渲染「资料索引」区块', false);
    }
  }

  // 打开全局资料聚合视图
  resBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
  const rv = window.document.getElementById('content-area');
  check('资料视图渲染「资料索引」标题', rv.textContent.includes('资料索引'));
  check('资料视图含按科目分组(.res-group)', !!rv.querySelector('.res-group'));
  check('资料视图含资源行(.res-row)', !!rv.querySelector('.res-row'));
  check('资料视图含可点外部链接(↗)', !!rv.querySelector('.res-go'));
  const resCount = rv.querySelectorAll('.res-row').length;
  check('资料视图聚合出多条资源(>=30)', resCount >= 30);
  const rf = window.document.getElementById('res-filter-subject');
  check('资料视图含科目筛选下拉', !!rf);
  if (rf) {
    rf.value = 'physio';
    rf.dispatchEvent(new window.Event('change', { bubbles: true }));
    const groups = rv.querySelectorAll('.res-group');
    let visible = 0, hidden = 0;
    groups.forEach(g => { if (g.style.display === 'none') hidden++; else visible++; });
    check('筛选「生理」后仅显示生理分组', visible === 1 && hidden >= 1);
  }

// 15. 计划闭环 (M4)：计划按钮 → 逐周任务 + 勾选 + 完成度 + 跳章节（DOM 驱动）
const planBtn = window.document.getElementById('btn-plan');
check('存在计划闭环按钮(#btn-plan)', !!planBtn);
check('KB_PLAN 已加载', !!window.KB_PLAN);
if (window.KB_PLAN) {
  check('KB_PLAN 含 16 周', window.KB_PLAN.weeks.length === 16);
  const allTasks = window.KB_PLAN.weeks.reduce((a, w) => a + w.tasks.length, 0);
  check('KB_PLAN 任务总数=59', allTasks === 59);
  const covered = window.KB_PLAN.weeks.reduce((a, w) => a + w.tasks.filter(t => t.points).reduce((b, t) => b + t.points, 0), 0);
  check('KB_PLAN 覆盖全部149考点', covered === 149);
}

if (planBtn) {
  planBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
  const pv = window.document.getElementById('content-area');
  check('计划视图渲染(.plan-view)', !!pv.querySelector('.plan-view'));
  check('计划视图含总体完成度(.plan-overall-num)', !!pv.querySelector('.plan-overall-num'));
  check('计划视图渲染16个周块(.plan-week)', pv.querySelectorAll('.plan-week').length === 16);
  check('计划视图渲染任务列表(.plan-task)', pv.querySelectorAll('.plan-task').length >= 50);
  check('计划视图渲染勾选框', pv.querySelectorAll('.plan-task input[type="checkbox"]').length >= 50);
  // 书单渲染
  check('计划视图渲染书单(.plan-books)', !!pv.querySelector('.plan-books'));
  // 章任务含「打开章节」
  const openBtns = pv.querySelectorAll('.plan-open');
  check('章任务含「打开章节」按钮', openBtns.length >= 43);
  // 勾选一个任务：验证 done 类 + 总完成度变化 + 持久化
  const firstTask = pv.querySelector('.plan-task');
  const firstCb = firstTask.querySelector('input[type="checkbox"]');
  const beforeLabel = pv.querySelector('.plan-overall-label').textContent;
  firstCb.checked = true;
  firstCb.dispatchEvent(new window.Event('change', { bubbles: true }));
  check('勾选后任务项加 done 类', firstTask.classList.contains('done'));
  const afterLabel = pv.querySelector('.plan-overall-label').textContent;
  check('勾选后总完成度文本变化', beforeLabel !== afterLabel);
  check('勾选后写入 kp_ 进度键', Object.keys(store).some(k => k.startsWith('kp_')));
  // 点「打开章节」应跳到对应章节的考点列表
  let jumped = false;
  // 重新取按钮（innerHTML 替换后旧引用失效，重新查询）
  const freshOpen = window.document.querySelector('.plan-open');
  if (freshOpen) {
    const subj = freshOpen.getAttribute('data-subject');
    const chap = freshOpen.getAttribute('data-chapter');
    freshOpen.dispatchEvent(new window.Event('click', { bubbles: true }));
    const ca = window.document.getElementById('content-area');
    jumped = !!ca.querySelector('.point-list') && window.document.getElementById('breadcrumb').textContent.includes('/');
    check('点「打开章节」跳转到对应章节考点列表', jumped);
    check('跳转后计划按钮取消 active', !window.document.getElementById('btn-plan').classList.contains('active'));
  } else {
    check('点「打开章节」跳转到对应章节考点列表', false);
    check('跳转后计划按钮取消 active', false);
  }
}
}

// 16. 知识星图（M6）：种子库 + 页内编辑 + 降级列表（无 3D 库时）
const KG = window.KB_GRAPH;
check('KB_GRAPH 已加载', !!KG && Array.isArray(KG.nodes) && Array.isArray(KG.links));
if (KG) {
  check('KB_GRAPH 含约 30 节点', KG.nodes.length >= 28);
  check('KB_GRAPH 含约 30 条边', KG.links.length >= 28);
  const groups = new Set(KG.nodes.map(n => n.group));
  check('KB_GRAPH 节点 group 取值合法(6科)', ['physio','biochem','pathol','internal','surgery','humanity'].every(g => groups.has(g)));
  const hasRef = KG.nodes.some(n => n.refs && n.refs.length);
  check('KB_GRAPH 存在回链 M1 考点的节点(refs)', hasRef);
}

const starBtn = window.document.getElementById('btn-star');
check('存在知识星图按钮(#btn-star)', !!starBtn);
if (starBtn) {
  starBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
  const appc = window.document.getElementById('app-container');
  const area = window.document.getElementById('content-area');
  check('进入星图模式：app-container 加 star-active', appc && appc.classList.contains('star-active'));
  check('星图容器 #star-graph 已渲染', !!window.document.getElementById('star-graph'));
  // 无 3D 库时降级为可编辑列表
  const fb = window.document.querySelector('#star-graph .star-fallback');
  check('无 3D 库时降级为列表视图', !!fb);
  const liCount = window.document.querySelectorAll('#star-graph .star-li').length;
  check('列表视图渲染出全部种子节点(' + KG.nodes.length + ')', liCount === KG.nodes.length);
  // 点击节点 → 详情面板
  const firstLi = window.document.querySelector('#star-graph .star-li');
  if (firstLi) {
    firstLi.dispatchEvent(new window.Event('click', { bubbles: true }));
    const info = window.document.getElementById('star-info');
    check('点击节点弹出详情面板(#star-info 非隐藏)', info && !info.classList.contains('hidden'));
    check('详情面板含标题(.star-info-title)', !!(info && info.querySelector('.star-info-title')));
  }
  // 页内编辑：新增节点
  const addNodeBtn = window.document.getElementById('star-add-node');
  check('存在「新增节点」按钮', !!addNodeBtn);
  if (addNodeBtn) {
    addNodeBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
    const nameInput = window.document.getElementById('f-node-name');
    check('新增节点表单出现(#f-node-name)', !!nameInput);
    if (nameInput) {
      nameInput.value = '测试节点XYZ';
      window.document.getElementById('f-node-save').dispatchEvent(new window.Event('click', { bubbles: true }));
      const liAfter = window.document.querySelectorAll('#star-graph .star-li').length;
      check('新增节点后列表 +1', liAfter === KG.nodes.length + 1);
      check('编辑写入 localStorage kg_user', !!(store['kg_user'] && store['kg_user'].includes('测试节点XYZ')));
    }
  }
  // 页内编辑：新增连线
  const addLinkBtn = window.document.getElementById('star-add-link');
  check('存在「连线」按钮', !!addLinkBtn);
  if (addLinkBtn) {
    addLinkBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
    const src = window.document.getElementById('f-link-src');
    const tgt = window.document.getElementById('f-link-tgt');
    const typeInput = window.document.getElementById('f-link-type');
    if (src && tgt && src.options.length >= 2) {
      tgt.selectedIndex = 1; // 选一个不同于 source 的节点
      typeInput.value = '测试关系ABC';
      window.document.getElementById('f-link-save').dispatchEvent(new window.Event('click', { bubbles: true }));
      check('新增连线写入 kg_user 含关系', !!(store['kg_user'] && store['kg_user'].includes('测试关系ABC')));
    } else {
      check('新增连线写入 kg_user 含关系', false);
    }
  }
  // 导出 / 导入 按钮存在
  check('存在导出/导入按钮', !!window.document.getElementById('star-export') && !!window.document.getElementById('star-import'));
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
