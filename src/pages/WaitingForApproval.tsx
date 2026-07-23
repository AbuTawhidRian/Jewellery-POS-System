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
  const obstacleRef = useRef({ x: 400, width: 30, gapBottom: 60, gapSize: 100, passed: false });
  const requestRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const collectibleRef = useRef({ x: 500, y: -100, active: false });

  // UI state for rendering
  const [playerY, setPlayerY] = useState(0);
  const [obstacleX, setObstacleX] = useState(400);
  const [obstacleGapBottom, setObstacleGapBottom] = useState(60);
  const [collectibleX, setCollectibleX] = useState(-100);
  const [collectibleY, setCollectibleY] = useState(0);
  const [collectibleActive, setCollectibleActive] = useState(false);
  const [showBonus, setShowBonus] = useState(false);

  const handleJump = () => {
    if (!isPlaying) {
      if (gameOver) {
        // Reset game
        playerRef.current = { y: 0, velocity: 0 };
        obstacleRef.current = { x: 400, width: 30, gapBottom: 60, gapSize: 100, passed: false };
        collectibleRef.current = { x: 500, y: -100, active: false };
        scoreRef.current = 0;
        setScore(0);
        setGameOver(false);
      }
      setIsPlaying(true);
      playerRef.current.velocity = JUMP_VELOCITY;
    } else {
      // Allow jumping at any time (Flappy Bird style)
      playerRef.current.velocity = JUMP_VELOCITY;
    }
  };

  const updateGame = () => {
    if (!gameRef.current) return;
    
    // Update player
    playerRef.current.velocity += GRAVITY;
    playerRef.current.y += playerRef.current.velocity;
    
    // Ceiling collision (Container is 256px tall, player is 40px)
    if (playerRef.current.y < -216) {
      playerRef.current.y = -216;
      playerRef.current.velocity = Math.max(0, playerRef.current.velocity);
    }
    
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
      // Vary obstacle gap position (from 30px to 126px from bottom)
      obstacleRef.current.gapBottom = 30 + Math.random() * 96;
      
      // 40% chance to spawn a collectible diamond
      if (!collectibleRef.current.active && Math.random() > 0.6) {
        collectibleRef.current.active = true;
        collectibleRef.current.x = gameRef.current.clientWidth + 150; // behind obstacle
        collectibleRef.current.y = -60 - Math.random() * 100; // random height (negative is up)
      }
    }

    // Update collectible
    if (collectibleRef.current.active) {
      collectibleRef.current.x -= OBSTACLE_SPEED + (scoreRef.current * 0.2);
      if (collectibleRef.current.x < -30) {
        collectibleRef.current.active = false;
      }
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
    
    // Bottom obstacle
    const obsBoxBottom = { 
      left: obstacleRef.current.x, 
      right: obstacleRef.current.x + obstacleRef.current.width, 
      bottom: 0, 
      top: -obstacleRef.current.gapBottom 
    };
    
    // Top obstacle
    const obsBoxTop = { 
      left: obstacleRef.current.x, 
      right: obstacleRef.current.x + obstacleRef.current.width, 
      bottom: -(obstacleRef.current.gapBottom + obstacleRef.current.gapSize), 
      top: -256 
    };

    const isHitBottom = (
      playerBox.right > obsBoxBottom.left &&
      playerBox.left < obsBoxBottom.right &&
      playerBox.bottom > obsBoxBottom.top
    );
    
    const isHitTop = (
      playerBox.right > obsBoxTop.left &&
      playerBox.left < obsBoxTop.right &&
      playerBox.top < obsBoxTop.bottom
    );

    if (isHitBottom || isHitTop) {
      // Game Over
      setGameOver(true);
      setIsPlaying(false);
      setHighScore(prev => Math.max(prev, scoreRef.current));
      return; // Stop loop
    }

    // Collectible collision
    if (collectibleRef.current.active) {
      const colBox = { 
        left: collectibleRef.current.x, 
        right: collectibleRef.current.x + 24, 
        bottom: collectibleRef.current.y + 24, 
        top: collectibleRef.current.y 
      };
      
      // Check intersection
      if (
        playerBox.right > colBox.left &&
        playerBox.left < colBox.right &&
        playerBox.bottom > colBox.top &&
        playerBox.top < colBox.bottom
      ) {
        // Collect!
        collectibleRef.current.active = false;
        scoreRef.current += 5;
        setScore(scoreRef.current);
        setShowBonus(true);
        setTimeout(() => setShowBonus(false), 1000);
      }
    }

    // Trigger re-render for UI
    setPlayerY(playerRef.current.y);
    setObstacleX(obstacleRef.current.x);
    setObstacleGapBottom(obstacleRef.current.gapBottom);
    setCollectibleX(collectibleRef.current.x);
    setCollectibleY(collectibleRef.current.y);
    setCollectibleActive(collectibleRef.current.active);

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
            className="absolute left-[50px] w-10 h-10 rounded-lg flex items-center justify-center shadow-lg shadow-gold-500/30 z-10 overflow-hidden bg-white"
            style={{ 
              bottom: `${Math.max(0, -playerY)}px`,
              transform: `rotate(${playerY < 0 ? '10deg' : '0deg'})`,
              transition: 'transform 0.1s'
            }}
          >
            <img src="/logo.jpg" alt="Al Sema Gold Logo" className="w-full h-full object-cover" />
          </div>

          {/* Obstacle Bottom */}
          {(isPlaying || gameOver) && (
            <div 
              className="absolute bottom-0 rounded-t-md border-x-2 border-t-2 border-gold-600 dark:border-gold-700 bg-gradient-to-t from-gold-600 to-gold-400 shadow-[inset_0_0_10px_rgba(255,255,255,0.5)]"
              style={{ 
                left: `${obstacleX}px`, 
                width: `${obstacleRef.current.width}px`,
                height: `${obstacleGapBottom}px` 
              }}
            >
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-gold-700/50 rounded-full" />
            </div>
          )}
          
          {/* Obstacle Top */}
          {(isPlaying || gameOver) && (
            <div 
              className="absolute top-0 rounded-b-md border-x-2 border-b-2 border-gold-600 dark:border-gold-700 bg-gradient-to-b from-gold-600 to-gold-400 shadow-[inset_0_0_10px_rgba(255,255,255,0.5)] z-10"
              style={{ 
                left: `${obstacleX}px`, 
                width: `${obstacleRef.current.width}px`,
                height: `${256 - obstacleGapBottom - 100}px` 
              }}
            >
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-gold-700/50 rounded-full" />
            </div>
          )}

          {/* Collectible Diamond */}
          {collectibleActive && (
             <div 
               className="absolute z-10 animate-bounce"
               style={{
                 left: `${collectibleX}px`,
                 bottom: `${Math.max(0, -collectibleY)}px`,
               }}
             >
               <Diamond className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] fill-cyan-400/20" />
             </div>
          )}

          {/* Bonus +5 Text */}
          {showBonus && (
             <div className="absolute left-[50px] bottom-[150px] text-gold-500 font-black text-3xl animate-out fade-out slide-out-to-top-12 duration-1000 z-30 drop-shadow-lg">
               +5
             </div>
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

      <div className="mt-6 text-center text-sm text-slate-500 animate-in fade-in duration-1000 delay-400 max-w-md mx-auto">
        <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">How to Play</p>
        <p className="mb-1">Press the <kbd className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-xs mx-1">Spacebar</kbd> or click the game area to jump.</p>
        <p>You can flap multiple times in the air to avoid the obstacles!</p>
      </div>

      <div className="mt-8 text-center animate-in fade-in duration-1000 delay-500">
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
