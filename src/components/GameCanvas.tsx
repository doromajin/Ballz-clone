import React, { useEffect, useRef } from 'react';
import { useGameStore, LOGICAL_WIDTH, LOGICAL_HEIGHT, BLOCK_SIZE, BALL_RADIUS } from '../store/gameStore';

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const status = useGameStore(s => s.status);
  const score = useGameStore(s => s.score);
  const ballsTotal = useGameStore(s => s.ballsTotal);

  // ポインターイベントによるスワイプ操作
  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = LOGICAL_WIDTH / rect.width;
    const scaleY = LOGICAL_HEIGHT / rect.height;
    useGameStore.getState().setTargetPoint({
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = LOGICAL_WIDTH / rect.width;
    const scaleY = LOGICAL_HEIGHT / rect.height;
    useGameStore.getState().setTargetPoint({
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    useGameStore.getState().shoot();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // requestAnimationFrame での描画ループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();
    let animationFrameId: number;

    const render = (time: number) => {
      // タブ非アクティブ時などの巨大なdtを制限
      const dt = Math.min((time - lastTime) / 1000, 0.05); 
      lastTime = time;

      useGameStore.getState().tick(dt);
      const state = useGameStore.getState();

      // 背景クリア
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      // ガイドライン（予測線）の描画
      if (state.status === 'AIMING' && state.targetPoint) {
          ctx.beginPath();
          ctx.moveTo(state.startX, LOGICAL_HEIGHT);
          const dx = state.startX - state.targetPoint.x;
          const dy = LOGICAL_HEIGHT - state.targetPoint.y;
          
          if (dy < -10) {
              const length = 2000;
              const dist = Math.hypot(dx, dy);
              const dirX = dx / dist;
              const dirY = dy / dist;
              ctx.lineTo(state.startX + dirX * length, LOGICAL_HEIGHT + dirY * length);
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
              ctx.lineWidth = 4;
              ctx.setLineDash([15, 15]);
              ctx.stroke();
              ctx.setLineDash([]);
          }
      }

      // ブロックの描画
      state.blocks.forEach(block => {
        const x = block.col * BLOCK_SIZE;
        const y = block.row * BLOCK_SIZE;
        const margin = 2;
        const size = BLOCK_SIZE - margin * 2;
        
        // スコア（現在ターン）に対するHPの割合で色を変える
        const ratio = Math.min(1, block.hp / Math.max(state.score, 1));
        const hue = 220 - ratio * 200; // 青(220) から オレンジ(20) へ変化
        ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
        
        ctx.beginPath();
        ctx.roundRect(x + margin, y + margin, size, size, 12);
        ctx.fill();

        // HPテキスト
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(block.hp.toString(), x + BLOCK_SIZE / 2, y + BLOCK_SIZE / 2);
      });

      // ボールの描画
      ctx.fillStyle = '#fff';
      if (state.status === 'AIMING') {
          ctx.beginPath();
          ctx.arc(state.startX, LOGICAL_HEIGHT - BALL_RADIUS, BALL_RADIUS, 0, Math.PI * 2);
          ctx.fill();
      } else {
          state.balls.forEach(ball => {
              if (!ball.launched) return;
              ctx.beginPath();
              if (!ball.active) {
                // 帰還したボールは発射予定位置に待機
                const drawX = state.firstReturnX !== null ? state.firstReturnX : ball.x;
                ctx.arc(drawX, LOGICAL_HEIGHT - BALL_RADIUS, BALL_RADIUS, 0, Math.PI * 2);
              } else {
                ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
              }
              ctx.fill();
          });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="game-container">
      <canvas
        ref={canvasRef}
        width={LOGICAL_WIDTH}
        height={LOGICAL_HEIGHT}
        className="game-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <div className="ui-layer">
        <div className="score-text">SCORE: {score}</div>
        <div className="balls-text">BALLS: {ballsTotal}</div>
      </div>
      {status === 'GAME_OVER' && (
        <div className="game-over-overlay">
          <h2 className="game-over-title">GAME OVER</h2>
          <button 
            onClick={() => useGameStore.getState().restart()}
            className="retry-button"
          >
            RETRY
          </button>
        </div>
      )}
    </div>
  );
};
