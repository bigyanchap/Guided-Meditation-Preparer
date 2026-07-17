const { app, BrowserWindow, nativeImage } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;

function resolveLogoPath() {
  if (isDev) {
    return path.join(__dirname, "..", "assets", "logo.png");
  }
  return path.join(process.resourcesPath, "logo.png");
}

function createWindow() {
  const logoPath = resolveLogoPath();
  const icon = nativeImage.createFromPath(logoPath);

  const win = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 880,
    minHeight: 600,
    title: "Guided Meditation Preparer",
    icon,
    backgroundColor: "#f4f1ec",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  win.once("ready-to-show", () => win.show());

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  if (process.platform === "darwin") {
    const logoPath = resolveLogoPath();
    const icon = nativeImage.createFromPath(logoPath);
    if (!icon.isEmpty()) {
      app.dock.setIcon(icon);
    }
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
