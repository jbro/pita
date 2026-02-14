import { contextBridge } from "electron";
import { preloadApi } from "../shared/preload-api";

contextBridge.exposeInMainWorld("pita", preloadApi.pita);
