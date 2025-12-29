import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_SIZE = 40;
const ENEMY_SIZE = 35;
const BULLET_SIZE = 5;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 7;
const ENEMY_SPEED = 2;
const ENEMY_SPAWN_RATE = 1500;

function App() {
  const [gameState, setGameState] = useState('menu'); // menu, playing, gameOver
  const [player, setPlayer] = useState({ x: GAME_WIDTH / 2, y: GAME_HEIGHT - 80, health: 100 });
  const [enemies, setEnemies] = useState([]);
  const [bullets, setBullets] = useState([]);
  const [score, setScore] = useState(0);
  const [keys, setKeys] = useState({});
  
  const gameLoopRef = useRef();
  const enemySpawnRef = useRef();
  const lastShotRef = useRef(0);

  // Start game
  const startGame = () => {
    setGameState('playing');
    setPlayer({ x: GAME_WIDTH / 2, y: GAME_HEIGHT - 80, health: 100 });
    setEnemies([]);
    setBullets([]);
    setScore(0);
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      setKeys(prev => ({ ...prev, [e.key]: true }));
    };

    const handleKeyUp = (e) => {
      setKeys(prev => ({ ...prev, [e.key]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Spawn enemies
  useEffect(() => {
    if (gameState === 'playing') {
      enemySpawnRef.current = setInterval(() => {
        const newEnemy = {
          id: Date.now(),
          x: Math.random() * (GAME_WIDTH - ENEMY_SIZE),
          y: -ENEMY_SIZE,
          health: 30
        };
        setEnemies(prev => [...prev, newEnemy]);
      }, ENEMY_SPAWN_RATE);
    }

    return () => {
      if (enemySpawnRef.current) {
        clearInterval(enemySpawnRef.current);
      }
    };
  }, [gameState]);

  // Shoot bullets
  const shoot = useCallback(() => {
    const now = Date.now();
    if (now - lastShotRef.current > 250) { // Fire rate limit
      lastShotRef.current = now;
      setBullets(prev => [...prev, {
        id: now,
        x: player.x + PLAYER_SIZE / 2 - BULLET_SIZE / 2,
        y: player.y
      }]);
    }
  }, [player.x, player.y]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    gameLoopRef.current = setInterval(() => {
      // Move player
      setPlayer(prev => {
        let newX = prev.x;
        let newY = prev.y;

        if (keys['ArrowLeft'] || keys['a']) newX -= PLAYER_SPEED;
        if (keys['ArrowRight'] || keys['d']) newX += PLAYER_SPEED;
        if (keys['ArrowUp'] || keys['w']) newY -= PLAYER_SPEED;
        if (keys['ArrowDown'] || keys['s']) newY += PLAYER_SPEED;

        // Boundary checking
        newX = Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, newX));
        newY = Math.max(0, Math.min(GAME_HEIGHT - PLAYER_SIZE, newY));

        return { ...prev, x: newX, y: newY };
      });

      // Shoot if space is pressed
      if (keys[' ']) {
        shoot();
      }

      // Move bullets
      setBullets(prev => 
        prev
          .map(bullet => ({ ...bullet, y: bullet.y - BULLET_SPEED }))
          .filter(bullet => bullet.y > -BULLET_SIZE)
      );

      // Move enemies
      setEnemies(prev => {
        const movedEnemies = prev.map(enemy => ({
          ...enemy,
          y: enemy.y + ENEMY_SPEED
        }));

        // Check if any enemy reached the bottom
        const enemiesReachedBottom = movedEnemies.some(enemy => enemy.y > GAME_HEIGHT);
        if (enemiesReachedBottom) {
          setPlayer(p => {
            const newHealth = p.health - 10;
            if (newHealth <= 0) {
              setGameState('gameOver');
            }
            return { ...p, health: newHealth };
          });
        }

        return movedEnemies.filter(enemy => enemy.y < GAME_HEIGHT);
      });

      // Check collisions between bullets and enemies
      setBullets(prevBullets => {
        const remainingBullets = [...prevBullets];
        
        setEnemies(prevEnemies => {
          const remainingEnemies = prevEnemies.map(enemy => {
            const hitBulletIndex = remainingBullets.findIndex(bullet =>
              bullet.x < enemy.x + ENEMY_SIZE &&
              bullet.x + BULLET_SIZE > enemy.x &&
              bullet.y < enemy.y + ENEMY_SIZE &&
              bullet.y + BULLET_SIZE > enemy.y
            );

            if (hitBulletIndex !== -1) {
              remainingBullets.splice(hitBulletIndex, 1);
              const newHealth = enemy.health - 10;
              
              if (newHealth <= 0) {
                setScore(s => s + 10);
                return null; // Remove enemy
              }
              
              return { ...enemy, health: newHealth };
            }
            
            return enemy;
          }).filter(Boolean);

          return remainingEnemies;
        });

        return remainingBullets;
      });

      // Check collisions between player and enemies
      setEnemies(prevEnemies => {
        const hitEnemyIndex = prevEnemies.findIndex(enemy =>
          player.x < enemy.x + ENEMY_SIZE &&
          player.x + PLAYER_SIZE > enemy.x &&
          player.y < enemy.y + ENEMY_SIZE &&
          player.y + PLAYER_SIZE > enemy.y
        );

        if (hitEnemyIndex !== -1) {
          setPlayer(p => {
            const newHealth = p.health - 20;
            if (newHealth <= 0) {
              setGameState('gameOver');
            }
            return { ...p, health: newHealth };
          });
          
          const newEnemies = [...prevEnemies];
          newEnemies.splice(hitEnemyIndex, 1);
          return newEnemies;
        }

        return prevEnemies;
      });

    }, 1000 / 60); // 60 FPS

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState, keys, player.x, player.y, shoot]);

  return (
    <div className="App">
      {gameState === 'menu' && (
        <div className="menu">
          <h1>🚀 SPACE BATTLE 🚀</h1>
          <div className="instructions">
            <h2>How to Play:</h2>
            <p>🎮 Move: Arrow Keys or WASD</p>
            <p>🔫 Shoot: Spacebar</p>
            <p>💥 Destroy enemies before they reach the bottom!</p>
            <p>⚡ Each enemy destroyed: +10 points</p>
          </div>
          <button onClick={startGame} className="start-button">
            START GAME
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="game-container">
          <div className="hud">
            <div className="score">Score: {score}</div>
            <div className="health">
              Health: 
              <div className="health-bar">
                <div 
                  className="health-fill" 
                  style={{ width: `${player.health}%` }}
                />
              </div>
              {player.health}%
            </div>
          </div>

          <div className="game-board" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
            {/* Player */}
            <div 
              className="player"
              style={{
                left: player.x,
                top: player.y,
                width: PLAYER_SIZE,
                height: PLAYER_SIZE
              }}
            >
              🚀
            </div>

            {/* Enemies */}
            {enemies.map(enemy => (
              <div
                key={enemy.id}
                className="enemy"
                style={{
                  left: enemy.x,
                  top: enemy.y,
                  width: ENEMY_SIZE,
                  height: ENEMY_SIZE
                }}
              >
                👾
              </div>
            ))}

            {/* Bullets */}
            {bullets.map(bullet => (
              <div
                key={bullet.id}
                className="bullet"
                style={{
                  left: bullet.x,
                  top: bullet.y,
                  width: BULLET_SIZE,
                  height: BULLET_SIZE * 2
                }}
              />
            ))}
          </div>
        </div>
      )}

      {gameState === 'gameOver' && (
        <div className="game-over">
          <h1>💀 GAME OVER 💀</h1>
          <h2>Final Score: {score}</h2>
          <button onClick={startGame} className="start-button">
            PLAY AGAIN
          </button>
        </div>
      )}

      <div className="stars"></div>
    </div>
  );
}

export default App;
