import { useEffect, useRef, useState, useCallback } from 'react';
import { PlayerControls } from '../types';

interface UseYouTubeProps {
  videoId: string;
  containerId: string;
  onStateChange?: (event: any) => void;
  onReady?: () => void;
}

export const useYouTube = ({ videoId, containerId, onStateChange, onReady }: UseYouTubeProps) => {
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Load API if not present
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (window.YT && window.YT.Player) {
        playerRef.current = new window.YT.Player(containerId, {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            autoplay: 0,
            controls: 0, // Hide default controls for custom sync UI
            modestbranding: 1,
            rel: 0,
            disablekb: 1, // Disable keyboard to prevent listener interference
            fs: 0, // Handle fullscreen manually if needed
          },
          events: {
            onReady: () => {
              setIsReady(true);
              if (onReady) onReady();
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
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoId, containerId]);

  const controls: PlayerControls = {
    play: useCallback(() => playerRef.current?.playVideo(), []),
    pause: useCallback(() => playerRef.current?.pauseVideo(), []),
    seekTo: useCallback((seconds: number) => playerRef.current?.seekTo(seconds, true), []),
    getCurrentTime: useCallback(() => playerRef.current?.getCurrentTime() || 0, []),
    getPlayerState: useCallback(() => playerRef.current?.getPlayerState(), []),
  };

  return { isReady, controls };
};
