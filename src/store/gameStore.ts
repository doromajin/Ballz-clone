import { create } from 'zustand';

export interface Point { x: number; y: number; }
export interface Ball { x: number; y: number; vx: number; vy: number; active: boolean; launched: boolean; }
export interface Block { id: string; col: number; row: number; hp: number; maxHp: number; }

export type GameStatus = 'AIMING' | 'SHOOTING' | 'RESOLVING' | 'GAME_OVER';

export const LOGICAL_WIDTH = 700;
export const LOGICAL_HEIGHT = 1000;
export const GRID_COLS = 7;
export const GRID_ROWS = 10;
export const BLOCK_SIZE = LOGICAL_WIDTH / GRID_COLS;
export const BALL_RADIUS = 8;
export const BALL_SPEED = 1500; // ボールの速度（ピクセル/秒）
export const SHOOT_DELAY = 0.06; // ボール発射間隔（秒）

interface GameState {
  status: GameStatus;
  balls: Ball[];
  blocks: Block[];
  score: number;
  ballsTotal: number;
  startX: number;
  firstReturnX: number | null;
  targetPoint: Point | null;
  shootTimer: number;
  ballsLaunched: number;

  setTargetPoint: (p: Point | null) => void;
  shoot: () => void;
  tick: (dt: number) => void;
  restart: () => void;
}

const generateBlocks = (row: number, score: number): Block[] => {
  const blocks: Block[] = [];
  for (let c = 0; c < GRID_COLS; c++) {
    // 50%の確率でブロックを生成
    if (Math.random() > 0.5) {
      // HPはスコアの1倍〜2倍でランダム
      const hp = score + Math.floor(Math.random() * (score * 0.5));
      blocks.push({ id: Math.random().toString(36).substring(7), col: c, row, hp, maxHp: hp });
    }
  }
  return blocks;
}

export const useGameStore = create<GameState>((set, get) => ({
  status: 'AIMING',
  balls: [],
  blocks: generateBlocks(1, 1), // 初期ブロック（1行目）
  score: 1,
  ballsTotal: 1,
  startX: LOGICAL_WIDTH / 2,
  firstReturnX: null,
  targetPoint: null,
  shootTimer: 0,
  ballsLaunched: 0,

  setTargetPoint: (p) => {
    if (get().status === 'AIMING') {
      set({ targetPoint: p });
    }
  },

  shoot: () => {
    const state = get();
    if (state.status !== 'AIMING' || !state.targetPoint) return;
    
    // スワイプのベクトル計算（指の位置から発射位置へ引いたベクトルの逆）
    const dx = state.startX - state.targetPoint.x;
    const dy = LOGICAL_HEIGHT - state.targetPoint.y;
    const dist = Math.hypot(dx, dy);
    
    // スワイプ量が少なすぎるか、下向きに撃とうとした場合はキャンセル
    if (dist < 10 || dy > -20) return; 

    const vx = (dx / dist) * BALL_SPEED;
    const vy = (dy / dist) * BALL_SPEED;

    const newBalls: Ball[] = Array.from({ length: state.ballsTotal }).map(() => ({
      x: state.startX,
      y: LOGICAL_HEIGHT - BALL_RADIUS,
      vx,
      vy,
      active: false,
      launched: false
    }));

    set({ 
      status: 'SHOOTING', 
      balls: newBalls, 
      shootTimer: 0, 
      ballsLaunched: 0,
      firstReturnX: null,
      targetPoint: null
    });
  },

  tick: (dt) => set((state) => {
    if (state.status === 'GAME_OVER') return state;

    let { status, balls, blocks, shootTimer, ballsLaunched, firstReturnX, score, ballsTotal, startX } = state;
    const newBalls = [...balls];
    const newBlocks = [...blocks];

    if (status === 'SHOOTING') {
      shootTimer += dt;
      // ディレイごとにボールを発射状態にする
      while (shootTimer > SHOOT_DELAY && ballsLaunched < ballsTotal) {
        newBalls[ballsLaunched].active = true;
        newBalls[ballsLaunched].launched = true;
        ballsLaunched++;
        shootTimer -= SHOOT_DELAY;
      }
      if (ballsLaunched === ballsTotal) {
        status = 'RESOLVING';
      }
    }

    if (status === 'SHOOTING' || status === 'RESOLVING') {
      let activeCount = 0;

      for (let i = 0; i < newBalls.length; i++) {
        const b = newBalls[i];
        if (!b.active) continue;

        activeCount++;
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // 壁との衝突（左右上）
        if (b.x - BALL_RADIUS < 0) { b.x = BALL_RADIUS; b.vx *= -1; }
        if (b.x + BALL_RADIUS > LOGICAL_WIDTH) { b.x = LOGICAL_WIDTH - BALL_RADIUS; b.vx *= -1; }
        if (b.y - BALL_RADIUS < 0) { b.y = BALL_RADIUS; b.vy *= -1; }

        // 底辺との衝突（帰還）
        if (b.y + BALL_RADIUS > LOGICAL_HEIGHT) {
          b.active = false;
          b.y = LOGICAL_HEIGHT - BALL_RADIUS;
          if (firstReturnX === null) {
            firstReturnX = b.x;
          }
        }

        // ブロックとの衝突（AABB）
        for (let j = 0; j < newBlocks.length; j++) {
          const block = newBlocks[j];
          if (block.hp <= 0) continue;

          const blockLeft = block.col * BLOCK_SIZE;
          const blockRight = blockLeft + BLOCK_SIZE;
          const blockTop = block.row * BLOCK_SIZE;
          const blockBottom = blockTop + BLOCK_SIZE;

          const closestX = Math.max(blockLeft, Math.min(b.x, blockRight));
          const closestY = Math.max(blockTop, Math.min(b.y, blockBottom));

          const distanceX = b.x - closestX;
          const distanceY = b.y - closestY;
          const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

          if (distanceSquared < BALL_RADIUS * BALL_RADIUS) {
            block.hp -= 1;
            
            // 反射処理
            if (Math.abs(distanceX) > Math.abs(distanceY)) {
                b.vx *= -1;
                // 食い込み防止
                b.x = b.x > closestX ? blockRight + BALL_RADIUS : blockLeft - BALL_RADIUS;
            } else {
                b.vy *= -1;
                b.y = b.y > closestY ? blockBottom + BALL_RADIUS : blockTop - BALL_RADIUS;
            }
          }
        }
      }

      // HP0のブロックを削除
      const remainingBlocks = newBlocks.filter(b => b.hp > 0);

      // 全ボールが帰還したらターン終了処理
      if (status === 'RESOLVING' && activeCount === 0) {
        score++;
        ballsTotal++; // 毎ターンボールを1つ増やす
        startX = firstReturnX !== null ? firstReturnX : startX;
        
        // ブロックを1段下げる
        let gameOver = false;
        const nextBlocks = remainingBlocks.map(b => {
          if (b.row + 1 >= GRID_ROWS) gameOver = true;
          return { ...b, row: b.row + 1 };
        });

        if (gameOver) {
          return { status: 'GAME_OVER', blocks: nextBlocks };
        } else {
          // 新しい行（row: 0）にブロックを生成
          nextBlocks.push(...generateBlocks(0, score));
          return {
            status: 'AIMING',
            blocks: nextBlocks,
            balls: [],
            score,
            ballsTotal,
            startX,
            firstReturnX: null
          };
        }
      }

      return { balls: newBalls, blocks: remainingBlocks, shootTimer, ballsLaunched, status, firstReturnX };
    }

    return state;
  }),
  
  restart: () => {
    set({
      status: 'AIMING',
      balls: [],
      blocks: generateBlocks(1, 1),
      score: 1,
      ballsTotal: 1,
      startX: LOGICAL_WIDTH / 2,
      firstReturnX: null,
      targetPoint: null,
      shootTimer: 0,
      ballsLaunched: 0,
    });
  }
}));
