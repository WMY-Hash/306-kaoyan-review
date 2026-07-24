/* 306 考研复习辅助 — Electron 主进程
 * 加载本仓库的纯前端单页应用，零网络依赖。
 * - 开发模式：直接打开 ../index.html（file://）
 * - 打包模式：electron-builder 通过 extraResources 把仓库拷到 resources/app/，这里按需拼接路径
 * - 不开 NodeIntegration，安全；不进 sandbox 之外的远程；离线可用
 */
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

let win = null;

function indexPath() {
  if (app.isPackaged) {
    // 打包后 resources/app/index.html
    return path.join(process.resourcesPath, 'app', 'index.html');
  }
  // 开发模式：本目录的上一级就是仓库根
  return path.join(__dirname, '..', 'index.html');
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    title: '306 考研复习',
    backgroundColor: '#11111b',
    icon: app.isPackaged
      ? path.join(process.resourcesPath, 'app', 'icons', 'icon.ico')
      : path.join(__dirname, '..', 'icons', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // 我们只用 file:// 加载本地静态资源，不需要沙盒
      webSecurity: true,
      // 关闭本地缓存带来的怪问题（service worker 仍按 index.html 自身协议注册）
      spellcheck: false
    },
    show: false
  });

  win.once('ready-to-show', () => win.show());

  // 拦截所有外链：用系统默认浏览器打开，桌面窗口里不导航
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    const idx = indexPath();
    if (url !== 'file:///' + idx.replace(/\\/g, '/')) {
      e.preventDefault();
      if (url.startsWith('http')) shell.openExternal(url);
    }
  });

  win.loadFile(indexPath());

  // 顶部菜单精简
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '刷新' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    { role: 'windowMenu' }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});