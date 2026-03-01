import { useReducer, useCallback } from "react";

export type LiveTransport = "livekit" | "websocket" | null;
export type WsConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";
export type EngineMode = "idle" | "live" | "playback";

export interface EngineState {
  mode: EngineMode;
  liveTransport: LiveTransport;
  wsConnection: WsConnectionStatus;
}

type EngineAction =
  | { type: "REWIND" }
  | { type: "SET_MODE"; mode: EngineMode }
  | { type: "SET_WS_CONNECTION"; status: WsConnectionStatus }
  | { type: "SET_LIVE_TRANSPORT"; transport: LiveTransport }
  | { type: "RESET" };

const initialState: EngineState = {
  mode: "idle",
  liveTransport: null,
  wsConnection: "idle",
};

function engineReducer(state: EngineState, action: EngineAction): EngineState {
  switch (action.type) {
    case "REWIND":
      return { ...state, mode: "idle", wsConnection: "idle" };
    case "SET_MODE":
      return { ...state, mode: action.mode };
    case "SET_WS_CONNECTION":
      return { ...state, wsConnection: action.status };
    case "SET_LIVE_TRANSPORT":
      return { ...state, liveTransport: action.transport };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function useEngine() {
  const [state, dispatch] = useReducer(engineReducer, initialState);

  const startLiveKit = useCallback(() => {
    dispatch({ type: "SET_LIVE_TRANSPORT", transport: "livekit" });
    dispatch({ type: "REWIND" });
    dispatch({ type: "SET_MODE", mode: "live" });
    dispatch({ type: "SET_WS_CONNECTION", status: "connecting" });
  }, []);

  const stopLiveKit = useCallback(() => {
    dispatch({ type: "SET_WS_CONNECTION", status: "disconnected" });
    dispatch({ type: "SET_MODE", mode: "idle" });
    dispatch({ type: "SET_LIVE_TRANSPORT", transport: null });
  }, []);

  return { state, dispatch, startLiveKit, stopLiveKit };
}
