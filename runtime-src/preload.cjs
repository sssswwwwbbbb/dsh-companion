const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('companion', {
  ready: value => ipcRenderer.send('companion:ready', value),
  introReady: () => ipcRenderer.send('companion:intro-ready'),
  introControl: value => ipcRenderer.send('companion:intro-control', value),
  onIntroState(callback) {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('companion:intro-state', listener);
    return () => ipcRenderer.removeListener('companion:intro-state', listener);
  },
  hit: hit => ipcRenderer.send('companion:hit', hit === true),
  drag: phase => ipcRenderer.send('companion:drag', phase),
  interact: action => ipcRenderer.send('companion:action', action),
  menu: () => ipcRenderer.send('companion:menu'),
  onState(callback) {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('companion:state', listener);
    return () => ipcRenderer.removeListener('companion:state', listener);
  },
});
