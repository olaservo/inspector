import { contextBridge as o } from "electron";
o.exposeInMainWorld(
  "api",
  {
    // Add any electron API methods you want to expose to the renderer process
  }
);
