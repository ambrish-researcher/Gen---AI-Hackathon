import { useEffect } from "react";
import { useStudio } from "../stores/studio";
export function useStream() {
  useEffect(() => {
    let socket: WebSocket;
    let retry: ReturnType<typeof setTimeout>;
    let disposed = false;
    const connect = () => {
      socket = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/stream`,
      );
      socket.onopen = () => useStudio.getState().setConnected(true);
      socket.onmessage = (e) => {
        if (!disposed) useStudio.getState().setMission(JSON.parse(e.data));
      };
      socket.onclose = () => {
        useStudio.getState().setConnected(false);
        if (!disposed) retry = setTimeout(connect, 1500);
      };
      socket.onerror = () => socket.close();
    };
    connect();
    return () => {
      disposed = true;
      clearTimeout(retry);
      socket?.close();
    };
  }, []);
}
