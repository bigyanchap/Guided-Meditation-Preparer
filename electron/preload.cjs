const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("meditationApp", {
  name: "Guided Meditation Preparer",
  version: "0.1.0",
});
