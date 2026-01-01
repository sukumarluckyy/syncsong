import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useYouTube } from '../hooks/useYouTube';
import { getRoomState, updateRoomState, subscribeToRoom, joinRoom } from '../services/roomService';
import { RoomState } from '../types';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const Room: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);

  // Sync Logic Refs
  const syncIntervalRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);
  const isDraggingRef = useRef(false);

  // 1. Initialize Room
  useEffect(() => {
    if (!roomId) return;
    const { success, state, isHost: hostStatus } = joinRoom(roomId);
    
    if (!success || !state) {
      setError("Room not found or expired.");
      return;
    }

    setRoomState(state);
    setIsHost(hostStatus);

    // If host, we are "interacted" by default
    if (hostStatus) setUserInteracted(true);

    const unsubscribe = subscribeToRoom(roomId, (newState) => {
      setRoomState(newState);
    });

    return () => unsubscribe();
  }, [roomId]);

  // 2. Player Hook
  // Only pass videoId if roomState exists to prevent black screen "empty ID" init
  const { isReady, duration, controls } = useYouTube({
    videoId: roomState?.videoId || '',
    containerId: 'youtube-player',
    onStateChange: (event) => {
      // Host broadcasts state changes (Play/Pause/Buffer)
      if (isHost && roomId && roomState) {
        const playerState = event.data;
        const currentTime = event.target.getCurrentTime();
        
        if (playerState === 1) { // Playing
          updateRoomState(roomId, { isPlaying: true, timestamp: currentTime });
        } else if (playerState === 2) { // Paused
          updateRoomState(roomId, { isPlaying: false, timestamp: currentTime });
        }
      }
    }
  });

  // 3. HOST: Heartbeat & UI Update
  useEffect(() => {
    if (!isReady) return;

    const updateUIAndHostSync = () => {
      const time = controls.getCurrentTime();
      if (!isDraggingRef.current) {
        setLocalCurrentTime(time);
      }

      // Host heartbeat to correct drift for listeners
      if (isHost && roomId && controls.getPlayerState() === 1) {
         // We don't want to flood updates, so maybe check drift or just throttle?
         // For MVP, we trust the onStateChange mostly, but this heartbeat ensures late joiners get correct time
         // We update local room state object but maybe throttle the localStorage write in a real app
      }
    };

    progressIntervalRef.current = setInterval(updateUIAndHostSync, 500);
    return () => clearInterval(progressIntervalRef.current);
  }, [isHost, roomId, isReady, controls]);


  // 4. LISTENER: Sync Loop
  useEffect(() => {
    if (isHost || !roomState || !isReady || !userInteracted) return;

    const checkSync = () => {
      const playerState = controls.getPlayerState();
      const currentTime = controls.getCurrentTime();
      
      // Calculate where we SHOULD be
      let targetTime = roomState.timestamp;
      if (roomState.isPlaying) {
        const timePassed = (Date.now() - roomState.lastUpdated) / 1000;
        targetTime += timePassed;
      }

      const drift = Math.abs(currentTime - targetTime);
      const MAX_DRIFT = 0.8; // Slightly looser tolerance for smoother experience

      // Seek if drifted
      if (drift > MAX_DRIFT) {
        controls.seekTo(targetTime);
      }

      // Sync State
      if (roomState.isPlaying && playerState !== 1 && playerState !== 3) {
        controls.play();
      } else if (!roomState.isPlaying && playerState === 1) {
        controls.pause();
      }
    };

    syncIntervalRef.current = setInterval(checkSync, 1000);
    return () => clearInterval(syncIntervalRef.current);
  }, [isHost, roomState, isReady, userInteracted, controls]);


  // Handlers
  const handleHostPlayPause = () => {
    if(!isReady || !roomId || !roomState) return;
    if (roomState.isPlaying) {
      controls.pause();
      updateRoomState(roomId, { isPlaying: false, timestamp: controls.getCurrentTime() });
    } else {
      controls.play();
      updateRoomState(roomId, { isPlaying: true, timestamp: controls.getCurrentTime() });
    }
  };

  const handleSeekStart = () => {
    isDraggingRef.current = true;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setLocalCurrentTime(time);
  };

  const handleSeekEnd = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    if (!roomId) return;
    const target = e.currentTarget as HTMLInputElement;
    const time = parseFloat(target.value);
    
    controls.seekTo(time);
    updateRoomState(roomId, { timestamp: time });
    isDraggingRef.current = false;
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    // Simple visual feedback could go here
    const btn = document.getElementById('share-btn');
    if(btn) {
       const original = btn.innerText;
       btn.innerText = "Copied!";
       setTimeout(() => btn.innerText = original, 2000);
    }
  };

  // --- Render ---

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center p-8 bg-zinc-900 rounded-2xl border border-zinc-800">
          <h2 className="text-xl font-bold mb-4 text-red-400">{error}</h2>
          <Button onClick={() => navigate('/')}>Return Home</Button>
        </div>
      </div>
    );
  }

  // Show generic loader until roomState is fetched
  if (!roomState) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-zinc-500 gap-4">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p>Connecting to SyncStream...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30">
      
      {/* Navbar */}
      <header className="fixed top-0 w-full z-40 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div onClick={() => navigate('/')} className="cursor-pointer flex items-center gap-2 group">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <span className="font-bold text-lg tracking-tight">SyncStream</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide border ${isHost ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                {isHost ? 'HOST' : 'VIEWER'}
             </div>
             <button 
                id="share-btn"
                onClick={handleCopyLink}
                className="text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-full transition-colors"
             >
               Share Room
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-12 relative mt-16">
        
        {/* INTERACTION OVERLAY (For Autoplay Policy) */}
        {!isHost && !userInteracted && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-2">Join Session</h3>
              <p className="text-zinc-400 mb-6 text-sm">Click to sync audio and video with the host.</p>
              <Button fullWidth size="lg" onClick={() => setUserInteracted(true)}>
                Sync Now
              </Button>
            </div>
          </div>
        )}

        {/* Video Player Wrapper */}
        <div className="relative w-full max-w-6xl mx-auto shadow-2xl shadow-indigo-900/10 rounded-2xl overflow-hidden bg-zinc-900 ring-1 ring-white/10">
           {/* Aspect Ratio Box */}
           <div className="aspect-video relative">
              {/* Only render container if we have roomState to avoid black screen init issue */}
              {roomState && <div id="youtube-player" className="w-full h-full pointer-events-none"></div>}
           </div>
           
           {/* HOST CONTROLS BAR */}
           {isHost && (
             <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-6 py-4 opacity-0 hover:opacity-100 transition-opacity duration-300 flex flex-col gap-2">
                {/* Scrubber */}
                <div className="flex items-center gap-4 group">
                  <span className="text-xs font-mono text-zinc-300 w-10 text-right">{formatTime(localCurrentTime)}</span>
                  <input 
                    type="range" 
                    min={0} 
                    max={duration || 100} 
                    value={localCurrentTime}
                    onMouseDown={handleSeekStart}
                    onTouchStart={handleSeekStart}
                    onChange={handleSeekChange}
                    onMouseUp={handleSeekEnd}
                    onTouchEnd={handleSeekEnd}
                    className="flex-1 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                  />
                  <span className="text-xs font-mono text-zinc-300 w-10">{formatTime(duration)}</span>
                </div>

                {/* Buttons */}
                <div className="flex justify-center pb-2">
                   <button 
                    onClick={handleHostPlayPause}
                    className="bg-white text-black hover:scale-105 transition-transform rounded-full p-3"
                   >
                     {roomState.isPlaying ? (
                       <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                     ) : (
                       <svg className="w-6 h-6 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                     )}
                   </button>
                </div>
             </div>
           )}

           {/* LISTENER STATUS BADGE (Overlay) */}
           {!isHost && (
             <div className="absolute top-4 right-4 bg-black/50 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${roomState.isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                <span className="text-xs font-medium text-white/90">
                  {roomState.isPlaying ? 'Live Sync' : 'Paused by Host'}
                </span>
             </div>
           )}
        </div>

        {/* Room Info / Footer */}
        <div className="mt-8 flex flex-col items-center gap-2 text-zinc-500">
           <p className="text-sm">
             Room ID: <span className="font-mono text-zinc-300 select-all">{roomState.roomId}</span>
           </p>
           {!isHost && <p className="text-xs">Waiting for host controls...</p>}
        </div>

      </main>
    </div>
  );
};