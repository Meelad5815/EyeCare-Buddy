const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let breakWindow;
let tray;
let timer;

const statePath = () => path.join(app.getPath('userData'), 'eyecare-state.json');

const defaultState = {
  settings: {
    sessionDurationMin: 50,
    breakDurationMin: 3,
    warningBeforeSec: 60,
    forcedLockMode: true,
    strictness: 'standard'
  },
  runtime: {
    running: false,
    sessionElapsedSec: 0,
    breakRemainingSec: 0,
    inBreak: false
  },
  analytics: {
    sessions: [],
    breaksTaken: 0,
    breaksSkipped: 0,
    screenMinutesToday: 0
  }
};

let state = loadState();

function loadState() {
  try {
    const raw = fs.readFileSync(statePath(), 'utf8');
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  fs.writeFileSync(statePath(), JSON.stringify(state, null, 2));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });
  mainWindow.loadFile('index.html');
  mainWindow.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createBreakWindow() {
  if (breakWindow) return;
  breakWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  breakWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  breakWindow.setAlwaysOnTop(true, 'screen-saver');
  breakWindow.loadFile('break.html');
  breakWindow.on('closed', () => {
    breakWindow = null;
  });
}

function showBreakLock() {
  if (!state.settings.forcedLockMode) return;
  createBreakWindow();
  breakWindow.show();
  breakWindow.focus();
  breakWindow.setKiosk(true);
  state.runtime.inBreak = true;
  state.runtime.breakRemainingSec = state.settings.breakDurationMin * 60;
  sendTick();
}

function hideBreakLock() {
  if (!breakWindow) return;
  breakWindow.setKiosk(false);
  breakWindow.hide();
  state.runtime.inBreak = false;
  state.runtime.sessionElapsedSec = 0;
  saveState();
  sendBreakEnd();
}

function sendTick() {
  if (mainWindow) mainWindow.webContents.send('timer:tick', state);
  if (breakWindow) breakWindow.webContents.send('timer:tick', state);
}

function sendBreakStart() {
  if (mainWindow) mainWindow.webContents.send('break:start', state);
  if (breakWindow) breakWindow.webContents.send('break:start', state);
}

function sendBreakEnd() {
  if (mainWindow) mainWindow.webContents.send('break:end', state);
}

function notify(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

function tick() {
  if (!state.runtime.running) return;

  if (!state.runtime.inBreak) {
    state.runtime.sessionElapsedSec += 1;
    const sessionLimit = state.settings.sessionDurationMin * 60;
    const warningAt = Math.max(1, sessionLimit - state.settings.warningBeforeSec);

    if (state.runtime.sessionElapsedSec === warningAt) {
      notify('EyeCare Buddy', 'Break lock is coming soon. Save your work and prepare to pause.');
      if (mainWindow) mainWindow.webContents.send('break:warning', state);
    }

    if (state.runtime.sessionElapsedSec >= sessionLimit) {
      state.analytics.screenMinutesToday += Math.round(state.runtime.sessionElapsedSec / 60);
      showBreakLock();
      sendBreakStart();
      notify('EyeCare Buddy', 'Stop! Take a Break');
    }
  } else {
    state.runtime.breakRemainingSec -= 1;
    if (state.runtime.breakRemainingSec <= 0) {
      state.analytics.breaksTaken += 1;
      hideBreakLock();
    }
  }

  saveState();
  sendTick();
}

function startEngine() {
  clearInterval(timer);
  timer = setInterval(tick, 1000);
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('EyeCare Buddy');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open EyeCare Buddy', click: () => mainWindow.show() },
    { label: 'Start Session', click: () => { state.runtime.running = true; saveState(); sendTick(); } },
    { label: 'Stop Session', click: () => { state.runtime.running = false; state.runtime.inBreak = false; saveState(); sendTick(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } }
  ]));
}

app.whenReady().then(() => {
  createMainWindow();
  createTray();
  startEngine();
});

ipcMain.handle('state:get', () => state);
ipcMain.on('session:start', () => {
  state.runtime.running = true;
  if (state.runtime.inBreak) hideBreakLock();
  saveState();
  sendTick();
});
ipcMain.on('session:stop', () => {
  state.runtime.running = false;
  state.runtime.inBreak = false;
  state.runtime.sessionElapsedSec = 0;
  hideBreakLock();
  saveState();
  sendTick();
});
ipcMain.on('settings:update', (_event, settings) => {
  state.settings = { ...state.settings, ...settings };
  saveState();
  sendTick();
});
ipcMain.on('break:complete', () => {
  state.analytics.breaksTaken += 1;
  hideBreakLock();
});
ipcMain.on('break:skip', () => {
  if (state.settings.strictness === 'strict') return;
  state.analytics.breaksSkipped += 1;
  hideBreakLock();
});

app.on('window-all-closed', () => {});
