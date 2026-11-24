const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// В portable всё лежит в app.asar: main.js в корне, сайт — в app/index.html.
// Сборка React лежит в ../dist и подхватывается после npm run build.
const webRoot = () => {
  if (app.isPackaged) return path.join(__dirname, 'app');
  const dist = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(path.join(dist, 'index.html'))) return dist;
  return path.join(__dirname, '..');
};

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 640,
    autoHideMenuBar: true,
    backgroundColor: '#f1f8e9',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const indexHtml = path.join(webRoot(), 'index.html');
  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('did-fail-load', code, desc, url, 'tried', indexHtml);
  });
  win.loadFile(indexHtml).catch((err) => {
    console.error('loadFile failed', indexHtml, err);
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
