import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useYouTube } from '../hooks/useYouTube';
import { getRoomState, updateRoomState, subscribeToRoom, joinRoom } from '../services/roomService';
import { RoomState } from '../types';

export const Room: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync Logic Refs
  const syncIntervalRef = useRef<any>(null);

  // Initialize Room
  useEffect(() => {
    if (!roomId) return;
    const { success, state, isHost: hostStatus } = joinRoom(roomId);
    
    if (!success || !state) {
      setError("Room not found. It may have expired or never existed.");
      return;
    }

    setRoomState(state);
    setIsHost(hostStatus);

    // Subscribe to changes (Listener pattern)
    const unsubscribe = subscribeToRoom(roomId, (newState) => {
      setRoomState(newState);
    });

    return () => unsubscribe();
  }, [roomId]);

  // Player Hook
  const { isReady, controls } = useYouTube({
    videoId: roomState?.videoId || '',
    containerId: 'youtube-player',
    onStateChange: (event) => {
      // Host Logic: If I am host, I broadcast my state changes
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

  // HOST: Periodic State Broadcast (Heartbeat)
  // Ensures precise time is saved even if no events fire (drift correction source)
  useEffect(() => {
    if (!isHost || !roomId || !isReady) return;

    const interval = setInterval(() => {
      const currentTime = controls.getCurrentTime();
      // Only update if playing to avoid spamming localstorage when paused
      if (controls.getPlayerState() === 1) {
         updateRoomState(roomId, { timestamp: currentTime });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isHost, roomId, isReady, controls]);


  // LISTENER: Sync Loop
  // Checks strictly against roomState and adjusts player
  useEffect(() => {
    if (isHost || !roomState || !isReady || !userInteracted) return;

    const checkSync = () => {
      const playerState = controls.getPlayerState();
      const currentTime = controls.getCurrentTime();
      
      // 1. Calculate Target Time
      // If playing, target is: timestamp + (now - lastUpdated)
      // If paused, target is: timestamp
      let targetTime = roomState.timestamp;
      if (roomState.isPlaying) {
        const timePassed = (Date.now() - roomState.lastUpdated) / 1000;
        targetTime += timePassed;
      }

      // 2. Drift Correction
      const drift = Math.abs(currentTime - targetTime);
      const MAX_DRIFT = 0.5; // 500ms tolerance

      if (drift > MAX_DRIFT) {
        console.log(`Syncing: Drift ${drift.toFixed(2)}s detected.`);
        controls.seekTo(targetTime);
      }

      // 3. Play/Pause State Sync
      // playerState: 1 = playing, 2 = paused, -1 = unstarted, 3 = buffering
      if (roomState.isPlaying && playerState !== 1 && playerState !== 3) {
        controls.play();
      } else if (!roomState.isPlaying && playerState === 1) {
        controls.pause();
      }
    };

    // Run sync check frequently
    syncIntervalRef.current = setInterval(checkSync, 1000);
    return () => clearInterval(syncIntervalRef.current);
  }, [isHost, roomState, isReady, userInteracted, controls]);


  // Manual Controls for Host
  const handleHostPlay = () => {
    if(!isReady) return;
    controls.play();
    // Update immediately for responsiveness
    if (roomId) updateRoomState(roomId, { isPlaying: true, timestamp: controls.getCurrentTime() });
  };

  const handleHostPause = () => {
    if(!isReady) return;
    controls.pause();
    if (roomId) updateRoomState(roomId, { isPlaying: false, timestamp: controls.getCurrentTime() });
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard!");
  };

  // Render Loading / Error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">{error}</h2>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  if (!roomState) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Loading Room...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              onClick={() => navigate('/')} 
              className="font-bold text-xl tracking-tight cursor-pointer hover:text-indigo-400 transition-colors"
            >
              SyncStream
            </div>
            <div className="h-6 w-px bg-zinc-800 hidden sm:block"></div>
            <div className="hidden sm:flex items-center gap-2 text-sm text-zinc-400">
              <span>Room:</span>
              <code className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-200 font-mono">{roomState.roomId}</code>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className={`px-3 py-1 rounded-full text-xs font-medium border ${isHost ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                {isHost ? 'YOU ARE HOST' : 'LISTENER'}
             </div>
             <Button variant="secondary" size="sm" onClick={handleCopyLink}>
               Share
             </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative">
        
        {/* Interaction Overlay for Listeners (Autoplay Policy) */}
        {!isHost && !userInteracted && (
          <div className="absolute inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-2xl max-w-md w-full text-center space-y-6 shadow-2xl">
              <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto text-indigo-400">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Ready to Join?</h3>
                <p className="text-zinc-400">Click below to enable audio and sync with the host.</p>
              </div>
              <Button fullWidth size="lg" onClick={() => setUserInteracted(true)}>
                Join Sync
              </Button>
            </div>
          </div>
        )}

        {/* Video Player Container */}
        <div className="w-full max-w-5xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-zinc-800 relative group">
          <div id="youtube-player" className="w-full h-full pointer-events-none"></div>
          
          {/* Host Controls Overlay - Only show on hover/interaction if needed, but for MVP keep it simple below */}
          {/* We block clicks on the iframe using pointer-events-none above to force usage of our controls */}
        </div>

        {/* Control Bar */}
        <div className="w-full max-w-5xl mt-6 bg-zinc-900/50 border border-zinc-800 backdrop-blur rounded-xl p-4 flex items-center gap-6 transition-all">
          {isHost ? (
            <>
               <button 
                onClick={roomState.isPlaying ? handleHostPause : handleHostPlay}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-indigo-500"
              >
                {roomState.isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              
              <div className="flex-1 flex flex-col justify-center">
                 <div className="flex justify-between text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wide">
                   <span>Playback Control</span>
                   <span>Host Active</span>
                 </div>
                 <div className="h-2 bg-zinc-800 rounded-full overflow-hidden relative">
                   <div className={`absolute top-0 bottom-0 left-0 bg-indigo-500/50 w-full animate-pulse ${roomState.isPlaying ? 'opacity-100' : 'opacity-0'}`}></div>
                 </div>
              </div>
            </>
          ) : (
             <div className="w-full flex items-center justify-center gap-3 text-zinc-500 py-1">
                <div className="relative flex h-3 w-3">
                  {roomState.isPlaying && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${roomState.isPlaying ? 'bg-emerald-500' : 'bg-zinc-600'}`}></span>
                </div>
                <span className="text-sm font-medium">
                  {roomState.isPlaying ? 'Synced & Playing' : 'Host Paused'}
                </span>
             </div>
          )}
        </div>

        {/* Status Log / Info */}
        <div className="mt-8 max-w-2xl text-center">
          <p className="text-zinc-600 text-sm">
            {isHost 
              ? "You are the Host. Play, pause, and seek to control everyone's playback." 
              : "Relax! The video will automatically sync with the host."}
          </p>
        </div>

      </main>
    </div>
  );
};
