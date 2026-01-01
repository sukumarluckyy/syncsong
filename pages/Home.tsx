import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { createRoom } from '../services/roomService';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [videoUrl, setVideoUrl] = useState('');
  const [joinId, setJoinId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Default to a scenic video if empty for demo purposes
  const DEMO_VIDEO = 'https://www.youtube.com/watch?v=LXb3EKWsInQ';

  const extractVideoId = (url: string) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const handleCreate = () => {
    const urlToUse = videoUrl.trim() || DEMO_VIDEO;
    const id = extractVideoId(urlToUse);
    if (!id) {
      alert('Please enter a valid YouTube URL');
      return;
    }
    setIsCreating(true);
    // Simulate decent network UX
    setTimeout(() => {
      const room = createRoom(id);
      navigate(`/room/${room.roomId}`);
    }, 500);
  };

  const handleJoin = () => {
    if (!joinId.trim()) return;
    navigate(`/room/${joinId}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black text-white relative overflow-hidden">
      
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        
        {/* Logo Area */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/5 mb-2 shadow-xl shadow-indigo-500/10">
            <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">SyncStream</h1>
            <p className="text-zinc-400 text-lg mt-2">Real-time video synchronization.</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          
          {/* Create Section */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Create Room</h2>
            <div className="space-y-3">
              <Input 
                placeholder="Paste YouTube URL (or leave empty for demo)" 
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="bg-black/50 border-zinc-700 focus:border-indigo-500"
              />
              <Button fullWidth onClick={handleCreate} disabled={isCreating} className="bg-indigo-600 hover:bg-indigo-500 text-white py-3">
                {isCreating ? 'Creating Room...' : 'Start Watching'}
              </Button>
            </div>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest">
              <span className="px-3 bg-zinc-900/50 text-zinc-600 backdrop-blur-xl">Or Join</span>
            </div>
          </div>

          {/* Join Section */}
          <div className="flex gap-2">
            <Input 
              placeholder="Room ID" 
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              className="bg-black/50 border-zinc-700 text-center uppercase font-mono tracking-widest"
            />
            <Button variant="secondary" onClick={handleJoin} className="whitespace-nowrap">
              Join Room
            </Button>
          </div>
        </div>
        
        <p className="text-center text-zinc-700 text-xs hover:text-zinc-500 transition-colors">
          Built for the modern web using React & Tailwind.
        </p>
      </div>
    </div>
  );
};