import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, LogOut, Trophy, RefreshCw, Play, Diamond } from 'lucide-react';

const GRAVITY = 0.6;
const JUMP_VELOCITY = -10;
const OBSTACLE_SPEED = 5; // pixels per frame

export const WaitingForApproval: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Use refs for game state to avoid React render cycle latency in the game loop
  const gameRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef({ y: 0, velocity: 0 });
  const obstacleRef = useRef({ x: 400, width: 30, height: 40, passed: false });
  const requestRef = useRef<number>();
  const scoreRef = useRef(0);

  // UI state for rendering
  const [playerY, setPlayerY] = useState(0);
  const [obstacleX, setObstacleX] = useState(400);

  const handleJump = () => {
    if (!isPlaying) {
      if (gameOver) {
        // Reset game
        playerRef.current = { y: 0, velocity: 0 };
        obstacleRef.current = { x: 400, width: 30, height: 40, passed: false };
        scoreRef.current = 0;
        setScore(0);
        setGameOver(false);
      }
      setIsPlaying(true);
      playerRef.current.velocity = JUMP_VELOCITY;
    } else {
      // Only jump if on ground
      if (playerRef.current.y >= 0) {
        playerRef.current.velocity = JUMP_VELOCITY;
      }
    }
  };

  const updateGame = () => {
    if (!gameRef.current) return;
    
    // Update player
    playerRef.current.velocity += GRAVITY;
    playerRef.current.y += playerRef.current.velocity;
    
    // Floor collision
    if (playerRef.current.y > 0) {
      playerRef.current.y = 0;
      playerRef.current.velocity = 0;
    }

    // Update obstacle
    obstacleRef.current.x -= OBSTACLE_SPEED + (scoreRef.current * 0.2); // Speed up slightly over time

    if (obstacleRef.current.x < -obstacleRef.current.width) {
      obstacleRef.current.x = gameRef.current.clientWidth;
      obstacleRef.current.passed = false;
      // Vary obstacle height
      obstacleRef.current.height = 30 + Math.random() * 40;
    }

    // Score counting
    if (obstacleRef.current.x < 50 && !obstacleRef.current.passed) { // Player is roughly at x=50
      scoreRef.current += 1;
      setScore(scoreRef.current);
      obstacleRef.current.passed = true;
    }

    // Collision detection
    // Player is roughly at x=50, width=40, height=40
    // Y is relative to bottom. Ground is 0.
    const playerBox = { left: 50, right: 90, bottom: playerRef.current.y, top: playerRef.current.y - 40 };
    const obsBox = { 
      left: obstacleRef.current.x, 
      right: obstacleRef.current.x + obstacleRef.current.width, 
      bottom: 0, 
      top: -obstacleRef.current.height 
    };

    if (
      playerBox.right > obsBox.left &&
      playerBox.left < obsBox.right &&
      playerBox.bottom > obsBox.top
    ) {
      // Game Over
      setGameOver(true);
      setIsPlaying(false);
      setHighScore(prev => Math.max(prev, scoreRef.current));
      return; // Stop loop
    }

    // Trigger re-render for UI
    setPlayerY(playerRef.current.y);
    setObstacleX(obstacleRef.current.x);

    requestRef.current = requestAnimationFrame(updateGame);
  };

  useEffect(() => {
    if (isPlaying && !gameOver) {
      requestRef.current = requestAnimationFrame(updateGame);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, gameOver]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleJump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      
      <div className="max-w-2xl w-full text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-20 h-20 bg-gold-500/20 text-gold-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
          Waiting for Approval
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
          Your account has been created successfully, but your administrator hasn't assigned you to any shop branches yet.
        </p>
        <p className="text-slate-500 dark:text-slate-500 mt-2 font-medium">
          Hang tight! You'll be able to access the system once you're assigned.
        </p>
      </div>

      {/* Mini Game Container */}
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in duration-1000 delay-300">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
            <Trophy className="w-4 h-4 text-gold-500" /> 
            <span>Score: {score}</span>
          </div>
          <div className="text-sm text-slate-500 font-medium">
            High Score: {highScore}
          </div>
        </div>

        <div 
          ref={gameRef}
          className="relative h-64 bg-slate-100 dark:bg-slate-950 overflow-hidden cursor-pointer select-none"
          onClick={handleJump}
        >
          {/* Player */}
          <div 
            className="absolute left-[50px] w-10 h-10 bg-gradient-to-br from-gold-400 to-gold-600 rounded-lg flex items-center justify-center shadow-lg shadow-gold-500/30 z-10"
            style={{ 
              bottom: `${Math.max(0, -playerY)}px`,
              transform: `rotate(${playerY < 0 ? '10deg' : '0deg'})`,
              transition: 'transform 0.1s'
            }}
          >
            <Diamond className="w-6 h-6 text-white" />
          </div>

          {/* Obstacle */}
          {(isPlaying || gameOver) && (
            <div 
              className="absolute bottom-0 bg-slate-700 dark:bg-slate-800 rounded-t-md border-2 border-slate-600 dark:border-slate-700"
              style={{ 
                left: `${obstacleX}px`, 
                width: `${obstacleRef.current.width}px`,
                height: `${obstacleRef.current.height}px` 
              }}
            />
          )}

          {/* Ground Line */}
          <div className="absolute bottom-0 w-full h-[2px] bg-slate-300 dark:bg-slate-800" />

          {/* Start / Game Over Overlay */}
          {!isPlaying && (
            <div className="absolute inset-0 bg-slate-900/10 dark:bg-slate-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center z-20">
              {gameOver ? (
                <>
                  <div className="bg-white dark:bg-slate-800 px-6 py-4 rounded-2xl shadow-xl text-center">
                    <p className="text-xl font-bold text-slate-900 dark:text-white mb-1">Game Over!</p>
                    <p className="text-slate-500 dark:text-slate-400 mb-4">You scored {score}</p>
                    <button 
                      className="bg-gold-500 hover:bg-gold-600 text-slate-950 px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 mx-auto shadow-lg shadow-gold-500/20"
                      onClick={(e) => { e.stopPropagation(); handleJump(); }}
                    >
                      <RefreshCw className="w-4 h-4" /> Try Again
                    </button>
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-slate-800 px-6 py-4 rounded-2xl shadow-xl text-center">
                   <p className="text-slate-600 dark:text-slate-300 mb-4 font-medium">Press Space or click to jump</p>
                   <button 
                      className="bg-gold-500 hover:bg-gold-600 text-slate-950 px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 mx-auto shadow-lg shadow-gold-500/20"
                      onClick={(e) => { e.stopPropagation(); handleJump(); }}
                    >
                      <Play className="w-4 h-4" /> Start Playing
                    </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 text-center animate-in fade-in duration-1000 delay-500">
        <button 
          onClick={() => { localStorage.clear(); window.location.href='/login'; }} 
          className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium flex items-center gap-2 mx-auto transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

    </div>
  );
};

export default WaitingForApproval;
