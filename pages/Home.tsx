import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { createRoom } from '../services/roomService';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [videoUrl, setVideoUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [joinId, setJoinId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const extractVideoId = (url: string) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const handleCreate = () => {
    const id = extractVideoId(videoUrl);
    if (!id) {
      alert('Invalid YouTube URL');
      return;
    }
    setIsCreating(true);
    // Simulate API delay
    setTimeout(() => {
      const room = createRoom(id);
      navigate(`/room/${room.roomId}`);
    }, 600);
  };

  const handleJoin = () => {
    if (!joinId.trim()) return;
    navigate(`/room/${joinId}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-950 to-zinc-950">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 mb-4">
            <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">SyncStream</h1>
          <p className="text-zinc-400 text-lg">Watch together, perfectly synchronized.</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
          
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Create a Room</h2>
            <div className="space-y-3">
              <Input 
                placeholder="Paste YouTube URL..." 
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              <Button fullWidth onClick={handleCreate} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Room'}
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-zinc-900 text-zinc-500">Or join existing</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Input 
                placeholder="Enter Room ID" 
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
              />
              <Button variant="secondary" onClick={handleJoin}>
                Join
              </Button>
            </div>
          </div>
        </div>
        
        <p className="text-center text-zinc-600 text-xs">
          By using SyncStream, you agree that you are watching content publicly available on YouTube.
        </p>
      </div>
    </div>
  );
};