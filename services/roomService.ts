import { RoomState } from '../types';

/**
 * NOTE: In a real production app, this service would communicate with a WebSocket server (e.g., Socket.io, Pusher).
 * For this MVP demo environment, we use localStorage and the 'storage' event to simulate real-time sync across tabs.
 * This allows you to test the sync by opening the app in two different tabs/windows of the same browser.
 */

const STORAGE_PREFIX = 'syncstream_room_';

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const getRoomState = (roomId: string): RoomState | null => {
  const data = localStorage.getItem(STORAGE_PREFIX + roomId);
  return data ? JSON.parse(data) : null;
};

export const createRoom = (videoId: string): RoomState => {
  const roomId = generateId();
  const hostId = generateId(); // In real app, this is user session ID
  
  const initialState: RoomState = {
    roomId,
    hostId,
    videoId,
    isPlaying: false,
    timestamp: 0,
    lastUpdated: Date.now(),
  };

  localStorage.setItem(STORAGE_PREFIX + roomId, JSON.stringify(initialState));
  
  // Save current user as host for this room
  sessionStorage.setItem(`role_${roomId}`, 'host');
  sessionStorage.setItem(`userId`, hostId);

  return initialState;
};

export const joinRoom = (roomId: string): { success: boolean; state?: RoomState; isHost: boolean } => {
  const state = getRoomState(roomId);
  if (!state) return { success: false, isHost: false };

  // Check if we are the host (re-joining/refresh)
  const storedRole = sessionStorage.getItem(`role_${roomId}`);
  let isHost = storedRole === 'host';
  
  // If no user ID, generate one (listener)
  let userId = sessionStorage.getItem('userId');
  if (!userId) {
    userId = generateId();
    sessionStorage.setItem('userId', userId);
  }

  return { success: true, state, isHost };
};

export const updateRoomState = (roomId: string, updates: Partial<RoomState>) => {
  const current = getRoomState(roomId);
  if (!current) return;

  const newState = { ...current, ...updates, lastUpdated: Date.now() };
  localStorage.setItem(STORAGE_PREFIX + roomId, JSON.stringify(newState));
};

export const subscribeToRoom = (roomId: string, callback: (state: RoomState) => void) => {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_PREFIX + roomId && e.newValue) {
      callback(JSON.parse(e.newValue));
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
};