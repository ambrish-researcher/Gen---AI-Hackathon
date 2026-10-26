import { create } from "zustand";
import type { Mission } from "../types";
export type CameraMode =
  "Isometric" | "Follow" | "Top down" | "Free" | "Inspect" | "Presentation";
export const useStudio = create<{
  mission: Mission | null;
  connected: boolean;
  camera: CameraMode;
  quality: boolean;
  fps: number;
  setMission: (m: Mission | null) => void;
  setConnected: (b: boolean) => void;
  setCamera: (c: CameraMode) => void;
  setQuality: (b: boolean) => void;
  setFps: (n: number) => void;
}>((set) => ({
  mission: null,
  connected: false,
  camera: "Isometric",
  quality: true,
  fps: 0,
  setMission: (mission) => set({ mission }),
  setConnected: (connected) => set({ connected }),
  setCamera: (camera) => set({ camera }),
  setQuality: (quality) => set({ quality }),
  setFps: (fps) => set({ fps }),
}));
