const electron = require('electron');
const path = require('path')
const {dialog,ipcMain} = require('electron')

const app = electron.app;

var BrowserWindow = electron.BrowserWindow;

let mainWindow;

app.on('window-all-closed', function () {
    app.quit();
});

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on('ready', function () {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1281,
        minHeight: 800,
        icon: path.join(__dirname,"/assets/static/images/logo.ico"),
        backgroundColor: '#ffffff',
        webPreferences: {
            // devTools: false,
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false,
            nativeWindowOpen: true,
        },
        show: false
    });

    mainWindow.once("ready-to-show",()=>{
        mainWindow.show()
    })

    //hide menubar
    mainWindow.setMenuBarVisibility(false)

    // and load the index.html of the app.
    mainWindow.loadURL(`file://${__dirname}/index.html`);

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
});

ipcMain.on('save-dialog',event => {
    const options = {
        title: 'Save Report',
        filters: [
            {name: 'Report', extensions:['xlsx']}
        ]
    }
    dialog.showSaveDialog(options,(filename) => {
        event.sender.send('saved-file', filename)
    })
})

