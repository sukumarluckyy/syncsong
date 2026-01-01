import { useEffect, useRef, useState, useCallback } from 'react';
import { PlayerControls } from '../types';

interface UseYouTubeProps {
  videoId: string;
  containerId: string;
  onStateChange?: (event: any) => void;
  onReady?: (event: any) => void;
}

export const useYouTube = ({ videoId, containerId, onStateChange, onReady }: UseYouTubeProps) => {
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    // 1. Guard: Don't initialize if no videoId
    if (!videoId) return;

    // 2. Load API if not present
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      // Prevent duplicate init
      if (playerRef.current) return;

      if (window.YT && window.YT.Player) {
        playerRef.current = new window.YT.Player(containerId, {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            autoplay: 0, // We handle play manually for sync
            controls: 0, // Hide default controls
            modestbranding: 1,
            rel: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3, // Hide annotations
            playsinline: 1,
          },
          events: {
            onReady: (event: any) => {
              setIsReady(true);
              setDuration(event.target.getDuration());
              if (onReady) onReady(event);
            },
            onStateChange: (event: any) => {
              if (onStateChange) onStateChange(event);
            },
          },
        });
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      // Handle the global callback
      const existingCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (existingCallback) existingCallback();
        initPlayer();
      };
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch(e) { 
          // ignore cleanup errors 
        }
        playerRef.current = null;
      }
      setIsReady(false);
    };
  }, [videoId, containerId]); // Re-run if videoId changes

  const controls: PlayerControls = {
    play: useCallback(() => playerRef.current?.playVideo(), []),
    pause: useCallback(() => playerRef.current?.pauseVideo(), []),
    seekTo: useCallback((seconds: number) => playerRef.current?.seekTo(seconds, true), []),
    getCurrentTime: useCallback(() => playerRef.current?.getCurrentTime() || 0, []),
    getPlayerState: useCallback(() => playerRef.current?.getPlayerState(), []),
  };

  return { isReady, duration, controls };
};