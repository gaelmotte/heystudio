const electron = require('electron')
const ipc = require('node-ipc');

const app = electron.app
const protocol = electron.protocol
const BrowserWindow = electron.BrowserWindow

const PROTOCOL_PREFIX = "hey"
const HEY_SERVER_URL = "https://heyserver.herokuapp.com/"
let window = null
let deeplinkingUrl = null;

// IPC for sharing data between onstances

ipc.config.retry = 1500;
ipc.config.silent = true;

// Protocol handler for win32
  if (process.platform == 'win32') {
     logEverywhere(process.argv)
    // Keep only command line / deep linked arguments
    let u = process.argv.filter(arg => arg.startsWith(PROTOCOL_PREFIX+"://"))
    if(u && u[0]){
      u = u[0].slice((PROTOCOL_PREFIX+"://").length)
    }
    logEverywhere(u)
    deeplinkingUrl = HEY_SERVER_URL+encodeURI(u)
    logEverywhere(deeplinkingUrl)
  }
  logEverywhere("createWindow# " + deeplinkingUrl)


const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  ipc.config.id = "secondInstanceOfHey";
  ipc.connectTo('singleInstanceOfHey', () => {
  ipc.of['singleInstanceOfHey'].on('connect', () => {
    ipc.of['singleInstanceOfHey'].emit('a-unique-message-name', deeplinkingUrl);
  });
});
  app.quit()
} else {
  ipc.config.id = "singleInstanceOfHey";
  ipc.serve(() => ipc.server.on('a-unique-message-name', message => {
    window.loadURL(message);
  }));
  ipc.server.start();
  

  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (window) {
      if (window.isMinimized()) window.restore()
      window.focus()
      
    }
  })

  // Create window, load the rest of the app, etc...
  app.on('ready', () => {


    // Create a new window
    window = new BrowserWindow({
      // Set the initial width to 800px
      width: 800,
      // Set the initial height to 600px
      height: 600,
      // Don't show the window until it ready, this prevents any white flickering
      show: false,
      webPreferences: {
        // Disable node integration in remote page
        nodeIntegration: true
      }
    })

    // URL is argument to npm start
    window.loadURL(deeplinkingUrl)

    window.webContents.openDevTools()

    // Show window when page is ready
    window.once('ready-to-show', () => {
      window.maximize()
      window.show()
    })

    if(!app.isDefaultProtocolClient('hey')) {
          app.setAsDefaultProtocolClient("hey", process.execPath, "--")
      }


    app.on('window-all-closed', () => {
      app.quit()
    })


  })
}




// Log both at dev console and at running node console instance
function logEverywhere(s) {
    console.log(s)
    if (window && window.webContents) {
        window.webContents.executeJavaScript(`console.log("${s}")`)
    }
}
