export interface RoomState {
  roomId: string;
  hostId: string;
  videoId: string;
  isPlaying: boolean;
  timestamp: number; // Video playback time in seconds
  lastUpdated: number; // Date.now() when the update occurred
}

export interface User {
  id: string;
  isHost: boolean;
}

export interface PlayerControls {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getPlayerState: () => number; // 1 = playing, 2 = paused
}

// YT API Types (Partial)
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}
