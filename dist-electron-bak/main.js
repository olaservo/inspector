import { app as o, BrowserWindow as s } from "electron";
import e from "path";
process.env.DIST_ELECTRON = e.join(__dirname, "..");
process.env.DIST = e.join(process.env.DIST_ELECTRON, "../dist");
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL ? e.join(process.env.DIST_ELECTRON, "../public") : process.env.DIST;
function r() {
  const n = new s({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: e.join(__dirname, "preload.js"),
      nodeIntegration: !0,
      contextIsolation: !1
    }
  });
  if (process.env.VITE_DEV_SERVER_URL)
    n.loadURL(process.env.VITE_DEV_SERVER_URL), n.webContents.openDevTools();
  else {
    if (!process.env.DIST)
      throw new Error("DIST environment variable is not set");
    n.loadFile(e.join(process.env.DIST, "index.html"));
  }
}
o.whenReady().then(r);
o.on("window-all-closed", () => {
  process.platform !== "darwin" && o.quit();
});
o.on("activate", () => {
  s.getAllWindows().length === 0 && r();
});
