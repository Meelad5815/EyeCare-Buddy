const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('eyeCareAPI', {
  getState: () => ipcRenderer.invoke('state:get'),
  startSession: () => ipcRenderer.send('session:start'),
  stopSession: () => ipcRenderer.send('session:stop'),
  updateSettings: (settings) => ipcRenderer.send('settings:update', settings),
  completeBreak: () => ipcRenderer.send('break:complete'),
  skipBreak: () => ipcRenderer.send('break:skip'),
  onTick: (cb) => ipcRenderer.on('timer:tick', (_e, s) => cb(s)),
  onBreakStart: (cb) => ipcRenderer.on('break:start', (_e, s) => cb(s)),
  onBreakEnd: (cb) => ipcRenderer.on('break:end', (_e, s) => cb(s)),
  onBreakWarning: (cb) => ipcRenderer.on('break:warning', (_e, s) => cb(s))
});
