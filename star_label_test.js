// 针对「选中连线关系说明改为 HTML 浮层」的定点测试：
// 注入 mock ForceGraph3D + 伪 WebGL，模拟点击连线，验证 #star-link-label 浮层正确创建/显示/定位/隐藏。
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
global.window = window;
global.document = window.document;

const store = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  },
  configurable: true
});

// 伪 WebGL：让 webglOk 探测通过
const origGetContext = window.HTMLCanvasElement.prototype.getContext;
window.HTMLCanvasElement.prototype.getContext = function (type) {
  if (type === 'webgl' || type === 'experimental-webgl') return {};
  return origGetContext ? origGetContext.apply(this, arguments) : null;
};

// mock ForceGraph3D：记录事件回调 + 提供 graphData / graph2ScreenCoords
const captured = {};
let lastChain = null;
function makeChain() {
  const o = {};
  const chainable = ['width','height','backgroundColor','nodeId','nodeVal','nodeColor','nodeOpacity',
    'nodeLabel','nodeThreeObjectExtend','linkColor','linkWidth','linkOpacity','linkDirectionalArrowLength',
    'linkDirectionalArrowRelPos','linkDirectionalArrowColor','linkLabel','onNodeClick','onLinkClick',
    'onBackgroundClick','onEngineStop','zoomToFit','cameraPosition'];
  chainable.forEach(m => {
    o[m] = function () {
      if (m.startsWith('on')) { if (arguments.length) captured[m] = arguments[0]; }
      if (m === 'zoomToFit' || m === 'cameraPosition') return o;
      return o;
    };
  });
  o.graphData = function (g) { if (g !== undefined) { o._data = g; return o; } return o._data; };
  o.graph2ScreenCoords = (x, y) => ({ x: 100 + x, y: 100 + y });
  return o;
}
window.ForceGraph3D = () => (mount) => { lastChain = makeChain(); return lastChain; };

const vm = require('vm');
const ctx = {
  window, document: window.document, localStorage: window.localStorage, console,
  setTimeout, clearTimeout,
  alert: () => {}, confirm: () => true,
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window)
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data/kb.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data/plan.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data/graph.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), ctx);
window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } }

const KG = window.KB_GRAPH;
const starBtn = window.document.getElementById('btn-star');
check('存在星图按钮', !!starBtn);
starBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
check('ForceGraph3D 3D 路径被采用(onLinkClick 已捕获)', typeof captured.onLinkClick === 'function');
check('onBackgroundClick 已捕获', typeof captured.onBackgroundClick === 'function');

// 模拟点击一条已解析的连线（source/target 为带坐标的对象），并注入到图数据中以便 find 命中
const n0 = KG.nodes[0], n1 = KG.nodes[1];
const fakeLink = {
  id: 'test_link',
  source: { id: n0.id, x: 10, y: 20, z: 0 },
  target: { id: n1.id, x: 30, y: 40, z: 0 },
  type: '测试类型',
  label: '测试说明文字ABC'
};
if (lastChain && lastChain._data) lastChain._data.links.push(fakeLink);
captured.onLinkClick(fakeLink);
const el = window.document.getElementById('star-link-label');
check('点击连线后创建 #star-link-label 浮层', !!el);
check('浮层含说明文字(类型+说明)', el && el.textContent.includes('测试类型') && el.textContent.includes('测试说明文字ABC'));
check('浮层加 show 类(可见)', el && el.classList.contains('show'));

// 等几帧让 frameLinkLabel 投影定位
setTimeout(() => {
  check('浮层已定位(含 left/top)', el && el.style.left !== '' && el.style.top !== '');
  check('浮层投影坐标合理(约中点 20,30 → 120,130)',
    el && /120px/.test(el.style.left) && /130px/.test(el.style.top));

  // —— 编辑连线：点击连线信息面板的「编辑」按钮 → 改类型/说明 → 保存 ——
  const editBtn = window.document.getElementById('star-edit-link');
  check('连线信息面板含「编辑连线」按钮', !!editBtn);
  if (editBtn) {
    editBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
    const srcSel = window.document.getElementById('f-link-src');
    const tgtSel = window.document.getElementById('f-link-tgt');
    const typeInput = window.document.getElementById('f-link-type');
    const labelInput = window.document.getElementById('f-link-label');
    check('编辑连线表单出现(#f-link-type/#f-link-label)', !!typeInput && !!labelInput);
    check('编辑表单预填原关系类型', typeInput && typeInput.value === '测试类型');
    // jsdom 不会自动选中带 selected 的 option，这里显式指定两端（模拟真实用户选择）
    if (srcSel) srcSel.value = n0.id;
    if (tgtSel) tgtSel.value = n1.id;
    if (typeInput) typeInput.value = '已编辑类型XYZ';
    if (labelInput) labelInput.value = '已编辑说明XYZ';
    const saveBtn = window.document.getElementById('f-link-save');
    check('编辑连线含保存按钮', !!saveBtn);
    if (saveBtn) {
      saveBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
      check('编辑连线写入 localStorage kg_user', !!(store['kg_user'] && store['kg_user'].includes('已编辑类型XYZ') && store['kg_user'].includes('已编辑说明XYZ')));
    }
  }

  // 点背景应隐藏浮层
  captured.onBackgroundClick();
  check('点背景后浮层隐藏', el && !el.classList.contains('show'));
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  process.exit(fail ? 1 : 0);
}, 80);
