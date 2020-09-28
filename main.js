const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  contentTracing
} = require('electron');
const log = require('electron-log');
const fs = require('fs');
const path = require('path');

log.info('App starting...');

//-------------------------------------------------------------------
// Define the menu
//
// THIS SECTION IS NOT REQUIRED
//-------------------------------------------------------------------
let template = [];
if (process.platform === 'darwin') {
  // OS X
  const name = app.getName();
  template.unshift({
    label: name,
    submenu: [
      {
        label: 'About ' + name,
        role: 'about'
      },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click() {
          app.quit();
        }
      }
    ]
  });
}

//-------------------------------------------------------------------
// Open a window that displays the version
//
// THIS SECTION IS NOT REQUIRED
//
// This isn't required for auto-updates to work, but it's easier
// for the app to show a window than to have to click "About" to see
// that updates are working.
//-------------------------------------------------------------------
let win;

function createDefaultWindow() {
  win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true
    }
  });
  win.webContents.openDevTools();
  win.on('closed', () => {
    win = null;
  });
  win.loadURL(`file://${__dirname}/version.html#v${app.getVersion()}`);

  return win;
}

app.on('ready', function() {
  // Create the Menu
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  ipcMain.on('save-log', () => {
    console.log('save log..');
    saveLog();
  });
  createDefaultWindow();
});
app.on('window-all-closed', () => {
  app.quit();
});

let processInfos = [];
app.on('ready', function() {
  setInterval(() => {
    getProcessInfo().then(info => processInfos.push(info));
  }, 10 * 1000);
});

function getProcessInfo() {
  return process.getProcessMemoryInfo().then(processMemoryInfo => {
    const processInfo = {
      systemMemoryInfo: process.getSystemMemoryInfo(),
      processMemoryInfo,
      memoryUsage: process.memoryUsage()
    };

    return processInfo;
  });
}

function recordMemory() {
  return contentTracing
    .startRecording({
      included_categories: [
        'v8',
        'v8.execute',
        // unable to load in chrome://tracing when using with 'disabled-by-default-memory-infra',
        // chrome://tracing will raise error "Conflict id in the profile tree" when load exported data.
        // 'disabled-by-default-v8.cpu_profiler',
        'disabled-by-default-v8.cpu_profiler.hires',
        'disabled-by-default-memory-infra',
        'memory',
        'gpu',
        'blink',
        'cc',
        'sequence_manager',
        'toplevel',
        'viz',
        'netlog'
      ],
      excluded_categories: ['*'],
      memory_dump_config: {
        triggers: [
          { mode: 'light', periodic_interval_ms: 50 },
          { mode: 'detailed', periodic_interval_ms: 1000 }
        ]
      }
    })
    .then(() => {
      return new Promise(resolve => setTimeout(resolve, 3000));
    })
    .then(() => {
      return contentTracing.stopRecording();
    })
    .then(path => {
      return new Promise((resolve, reject) => {
        fs.readFile(
          path,
          {
            encoding: 'utf8'
          },
          (err, data) => {
            if (err) {
              reject(err);
              return;
            }

            resolve(data);
          }
        );
      }).finally(() => {
        fs.unlinkSync(path);
      });
    });
}

function saveLog() {
  const homedir = require('os').homedir();

  recordMemory().then(records => {
    const tracingFile = path.join(
      homedir,
      'electron-memory-issue-content-tracing.json'
    );
    const infoFile = path.join(
      homedir,
      'electron-memory-issue-process-infos.json'
    );

    fs.writeFileSync(tracingFile, records);

    fs.writeFileSync(infoFile, JSON.stringify(processInfos, null, '    '));

    win.webContents.send(
      'message',
      'logs saved to "' + tracingFile + '" and "' + infoFile + '"'
    );
  });
}
