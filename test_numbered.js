0001: 
0002:     const LOGICAL_WIDTH = 700;
0003:     const LOGICAL_HEIGHT = 1000;
0004:     const GRID_COLS = 7;
0005:     const GRID_ROWS = 10;
0006:     const BLOCK_SIZE = LOGICAL_WIDTH / GRID_COLS;
0007:     const BALL_RADIUS = 10;
0008:     const BALL_SPEED = 2000;
0009:     const SHOOT_DELAY = 0.05;
0010: 
0011:     let highScore = localStorage.getItem('dinoHighScore') || 1;
0012: 
0013:     const generateRow = (row, score) => {
0014:       const blocks = [];
0015:       const items = [];
0016:       
0017:       if (score > 0 && score % 50 === 0) {
0018:           blocks.push({
0019:               id: Math.random().toString(36).substring(7),
0020:               col: 2,
0021:               row,
0022:               hp: 5000 + score * 50,
0023:               maxHp: 5000 + score * 50,
0024:               type: 'boss',
0025:               shape: 'square',
0026:               width: 3,
0027:               isTransparent: false,
0028:               hitTimer: 0
0029:           });
0030:           return { blocks, items };
0031:       }
0032:       
0033:       let blockCols = [];
0034:       for (let c = 0; c < GRID_COLS; c++) {
0035:          if (Math.random() > 0.5) blockCols.push(c);
0036:       }
0037:       if (blockCols.length === 0) {
0038:          blockCols.push(Math.floor(Math.random() * GRID_COLS));
0039:       }
0040: 
0041:       for (let c = 0; c < GRID_COLS; c++) {
0042:         if (blockCols.includes(c)) {
0043:           const hp = score + Math.floor(Math.random() * (score * 0.5));
0044:           let type = 'normal';
0045:           let shape = 'square';
0046:           let shield = null;
0047: 
0048:           const typeRand = Math.random();
0049:           if (score > 10) {
0050:               if (typeRand < 0.05) type = 'shield';
0051:               else if (typeRand < 0.10) type = 'ghost';
0052:               else if (typeRand < 0.15) type = 'muddy';
0053:           }
0054: 
0055:           if (score >= 200 && Math.random() < 0.05) {
0056:               type = 'iron';
0057:           }
0058: 
0059:           if (type === 'iron' || type === 'shield') {
0060:               shape = 'square'; // Force square for iron and shield
0061:           } else if (Math.random() < 0.20) {
0062:               const shapes = ['triangle_tl', 'triangle_tr', 'triangle_bl', 'triangle_br'];
0063:               shape = shapes[Math.floor(Math.random() * shapes.length)];
0064:           }
0065: 
0066:           let actualHp = hp;
0067:           if (type === 'iron') {
0068:               actualHp = 700 + score + Math.floor(Math.random() * 300);
0069:           }
0070:           
0071:           if (type === 'shield') {
0072:               const sides = ['top', 'right', 'bottom', 'left'];
0073:               shield = sides[Math.floor(Math.random() * sides.length)];
0074:           }
0075: 
0076:           blocks.push({ id: Math.random().toString(36).substring(7), col: c, row, hp: actualHp, maxHp: actualHp, type, shape, shield, isTransparent: false, hitTimer: 0 });
0077:         } else if (Math.random() < 0.25) { 
0078:           let type = 'add_ball';
0079:           const itemRand = Math.random();
0080:           if (score > 5) {
0081:              if (itemRand < 0.15) type = 'thunder_v';
0082:              else if (itemRand < 0.3) type = 'thunder_h';
0083:              else if (itemRand < 0.45) type = 'split';
0084:           }
0085:           items.push({ id: Math.random().toString(36).substring(7), col: c, row, type, collected: false });
0086:         }
0087:       }
0088:       return { blocks, items };
0089:     };
0090: 
0091:     let state = {
0092:       status: 'START_SCREEN',
0093:       previousStatus: null,
0094:       selectedChar: localStorage.getItem('dinoSelectedChar') || 'original',
0095:       particles: [],
0096:       warpBlocks: [],
0097:       effects: [],
0098:       blocks: [],
0099:       items: [],
0100:       balls: [],
0101:       score: 0,
0102:       bossWarningTimer: 0,
0103:       ballsTotal: 1,
0104:       addedBallsNextTurn: 0,
0105:       startX: LOGICAL_WIDTH / 2,
0106:       firstReturnX: null,
0107:       targetPoint: null,
0108:       shootTimer: 0,
0109:       ballsLaunched: 0,
0110:       blocksCountAtStart: 0,
0111:       warpCounter: 0,
0112:       warpTimer: 0,
0113:       turnTimer: 0,
0114:       speedMult: 1.0,
0115:       username: localStorage.getItem('dinoUsername') || 'Player',
0116:       lastPlayTimestamp: null
0117:     };
0118: 
0119:     let leaderboard = JSON.parse(localStorage.getItem('dinoLeaderboard'));
0120:     if (!leaderboard) {
0121:         leaderboard = [];
0122:         const names = ['Alpha', 'Beta', 'GamerX', 'DinoMaster', 'BlockBreaker', 'Shadow', 'Ninja', 'ProPlayer', 'Noob', 'Speedy'];
0123:         for (let i = 0; i < 40; i++) {
0124:             leaderboard.push({
0125:                 name: names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random()*999),
0126:                 score: Math.floor(Math.random() * 80) + 10
0127:             });
0128:         }
0129:         leaderboard.sort((a, b) => b.score - a.score);
0130:         localStorage.setItem('dinoLeaderboard', JSON.stringify(leaderboard));
0131:     }
0132: 
0133:     const canvas = document.getElementById('gameCanvas');
0134:     const ctx = canvas.getContext('2d');
0135:     const scoreText = document.getElementById('scoreText');
0136:     const highScoreText = document.getElementById('highScoreText');
0137:     const gameOverOverlay = document.getElementById('gameOverOverlay');
0138:     const retryButton = document.getElementById('retryButton');
0139:     const overlayTitle = document.getElementById('overlayTitle');
0140:     const charButtons = document.querySelectorAll('.char-btn');
0141:     const menuBtn = document.getElementById('menuBtn');
0142:     const pauseOverlay = document.getElementById('pauseOverlay');
0143:     const resumeBtn = document.getElementById('resumeBtn');
0144:     const quitBtn = document.getElementById('quitBtn');
0145: 
0146:     const updateCharSelectionUI = () => {
0147:       charButtons.forEach(b => {
0148:          if (b.dataset.char === state.selectedChar) {
0149:              b.classList.add('active');
0150:          } else {
0151:              b.classList.remove('active');
0152:          }
0153:       });
0154:     };
0155:     updateCharSelectionUI();
0156: 
0157:     const usernameInput = document.getElementById('usernameInput');
0158:     usernameInput.value = state.username;
0159:     usernameInput.addEventListener('input', (e) => {
0160:         state.username = e.target.value || 'Player';
0161:         localStorage.setItem('dinoUsername', state.username);
0162:     });
0163: 
0164:     const rankingOverlay = document.getElementById('rankingOverlay');
0165:     const rankingList = document.getElementById('rankingList');
0166:     const rankingBtn = document.getElementById('rankingBtn');
0167:     const closeRankingBtn = document.getElementById('closeRankingBtn');
0168: 
0169:     rankingBtn.addEventListener('click', () => {
0170:         rankingList.innerHTML = '';
0171:         leaderboard.forEach((entry, index) => {
0172:             const item = document.createElement('div');
0173:             const isMe = entry.timestamp && entry.timestamp === state.lastPlayTimestamp;
0174:             item.style.display = 'flex';
0175:             item.style.justifyContent = 'space-between';
0176:             item.style.padding = '0.8rem 1rem';
0177:             item.style.borderRadius = '8px';
0178:             item.style.background = isMe ? 'rgba(250, 204, 21, 0.2)' : 'rgba(255, 255, 255, 0.05)';
0179:             item.style.border = isMe ? '1px solid #facc15' : 'none';
0180:             item.style.boxShadow = isMe ? '0 0 10px rgba(250, 204, 21, 0.5)' : 'none';
0181:             
0182:             let rankColor = '#94a3b8';
0183:             if (index === 0) rankColor = '#facc15'; 
0184:             else if (index === 1) rankColor = '#e2e8f0'; 
0185:             else if (index === 2) rankColor = '#b45309'; 
0186:             
0187:             item.innerHTML = `
0188:                 <div style="display: flex; gap: 1rem; align-items: center;">
0189:                     <span style="color: ${rankColor}; font-weight: 900; font-size: 1.2rem; width: 30px;">#${index + 1}</span>
0190:                     <span style="color: #fff; font-weight: 700; font-size: 1.1rem;">${entry.name}</span>
0191:                 </div>
0192:                 <span style="color: #38bdf8; font-weight: 900; font-size: 1.2rem;">Lv.${entry.score}</span>
0193:             `;
0194:             rankingList.appendChild(item);
0195:         });
0196:         
0197:         gameOverOverlay.classList.remove('active');
0198:         pauseOverlay.classList.remove('active');
0199:         rankingOverlay.classList.add('active');
0200:     });
0201: 
0202:     closeRankingBtn.addEventListener('click', () => {
0203:         rankingOverlay.classList.remove('active');
0204:         updateUI(); 
0205:     });
0206: 
0207:     menuBtn.addEventListener('click', () => {
0208:       if (state.status !== 'START_SCREEN' && state.status !== 'GAME_OVER' && state.status !== 'PAUSED') {
0209:         state.previousStatus = state.status;
0210:         state.status = 'PAUSED';
0211:         updateUI();
0212:       }
0213:     });
0214: 
0215:     resumeBtn.addEventListener('click', () => {
0216:       if (state.status === 'PAUSED') {
0217:         state.status = state.previousStatus;
0218:         updateUI();
0219:       }
0220:     });
0221: 
0222:     quitBtn.addEventListener('click', () => {
0223:       state.status = 'START_SCREEN';
0224:       updateUI();
0225:     });
0226: 
0227:     charButtons.forEach(btn => {
0228:       btn.addEventListener('click', () => {
0229:         state.selectedChar = btn.dataset.char;
0230:         localStorage.setItem('dinoSelectedChar', state.selectedChar);
0231:         updateCharSelectionUI();
0232:       });
0233:     });
0234: 
0235:     const updateUI = () => {
0236:       scoreText.innerText = state.score;
0237:       highScoreText.innerText = highScore;
0238:       if (state.status === 'GAME_OVER' || state.status === 'START_SCREEN') {
0239:         overlayTitle.innerText = state.status === 'GAME_OVER' ? 'GAME OVER' : 'DINO BALLZ';
0240:         gameOverOverlay.classList.add('active');
0241:         pauseOverlay.classList.remove('active');
0242:         rankingOverlay.classList.remove('active');
0243:       } else if (state.status === 'PAUSED') {
0244:         gameOverOverlay.classList.remove('active');
0245:         pauseOverlay.classList.add('active');
0246:         rankingOverlay.classList.remove('active');
0247:       } else {
0248:         gameOverOverlay.classList.remove('active');
0249:         pauseOverlay.classList.remove('active');
0250:         rankingOverlay.classList.remove('active');
0251:       }
0252:     };
0253: 
0254:     const setTargetPoint = (e) => {
0255:       const rect = canvas.getBoundingClientRect();
0256:       const scaleX = LOGICAL_WIDTH / rect.width;
0257:       const scaleY = LOGICAL_HEIGHT / rect.height;
0258:       return {
0259:         x: (e.clientX - rect.left) * scaleX,
0260:         y: (e.clientY - rect.top) * scaleY
0261:       };
0262:     };
0263: 
0264:     const shoot = () => {
0265:       if (state.status !== 'AIMING' || !state.targetPoint) return;
0266:       
0267:       const dx = state.targetPoint.x - state.startX;
0268:       const dy = state.targetPoint.y - LOGICAL_HEIGHT;
0269:       const dist = Math.hypot(dx, dy);
0270:       
0271:       if (dist < 10 || dy > -10) return; 
0272: 
0273:       const vx = (dx / dist) * BALL_SPEED;
0274:       const vy = (dy / dist) * BALL_SPEED;
0275: 
0276:       state.balls = Array.from({ length: state.ballsTotal }).map((_, idx) => ({
0277:         x: state.startX,
0278:         y: LOGICAL_HEIGHT - BALL_RADIUS,
0279:         vx,
0280:         vy,
0281:         active: false,
0282:         launched: false,
0283:         isLeader: idx === 0,
0284:         bounceCount: 0,
0285:         history: [] // For ball trails
0286:       }));
0287: 
0288:       state.status = 'SHOOTING';
0289:       state.shootTimer = 0;
0290:       state.ballsLaunched = 0;
0291:       state.firstReturnX = null;
0292:       state.targetPoint = null;
0293:       state.blocksCountAtStart = state.blocks.length;
0294:       state.turnTimer = 0;
0295:       state.speedMult = 1.0;
0296:     };
0297: 
0298:     let isDragging = false; 
0299: 
0300:     canvas.addEventListener('pointerdown', (e) => {
0301:       const pt = setTargetPoint(e);
0302:       
0303:       // Fast drop button logic
0304:       if ((state.status === 'SHOOTING' || state.status === 'RESOLVING') && pt.y > LOGICAL_HEIGHT - 120 && pt.x > LOGICAL_WIDTH - 120) {
0305:           state.balls.forEach(b => {
0306:              if(b.active || !b.launched) {
0307:                 b.active = false;
0308:                 b.history = [];
0309:                 b.y = LOGICAL_HEIGHT - BALL_RADIUS;
0310:                 if (state.firstReturnX === null) {
0311:                     state.firstReturnX = b.x;
0312:                 }
0313:              }
0314:           });
0315:           state.ballsLaunched = state.ballsTotal;
0316:           state.status = 'RESOLVING';
0317:           return;
0318:       }
0319: 
0320:       if (state.status === 'AIMING') {
0321:         isDragging = true;
0322:         state.targetPoint = pt;
0323:         canvas.setPointerCapture(e.pointerId);
0324:       }
0325:     });
0326: 
0327:     canvas.addEventListener('pointermove', (e) => {
0328:       if (e.buttons !== 1 || state.status !== 'AIMING' || !isDragging) return;
0329:       state.targetPoint = setTargetPoint(e);
0330:     });
0331: 
0332:     canvas.addEventListener('pointerup', (e) => {
0333:       if (state.status === 'AIMING' && isDragging) {
0334:         shoot();
0335:         canvas.releasePointerCapture(e.pointerId);
0336:       }
0337:       isDragging = false;
0338:     });
0339: 
0340:     retryButton.addEventListener('click', () => {
0341:       const initRow = generateRow(1, 1);
0342:       const startingBalls = state.selectedChar === 'orange' ? 11 : 1;
0343:       
0344:       state = {
0345:         selectedChar: state.selectedChar,
0346:         status: 'AIMING',
0347:         particles: [],
0348:         warpBlocks: [],
0349:         balls: [],
0350:         blocks: initRow.blocks,
0351:         items: initRow.items,
0352:         effects: [],
0353:         score: 1,
0354:         bossWarningTimer: 0,
0355:         ballsTotal: startingBalls,
0356:         addedBallsNextTurn: 0,
0357:         startX: LOGICAL_WIDTH / 2,
0358:         firstReturnX: null,
0359:         targetPoint: null,
0360:         shootTimer: 0,
0361:         ballsLaunched: 0,
0362:         blocksCountAtStart: 0,
0363:         warpCounter: 0,
0364:         warpTimer: 0,
0365:         turnTimer: 0,
0366:         speedMult: 1.0,
0367:         username: state.username,
0368:         lastPlayTimestamp: state.lastPlayTimestamp
0369:       };
0370:       updateUI();
0371:     });
0372: 
0373:     const triggerThunder = (item) => {
0374:         const isVertical = item.type === 'thunder_v';
0375:         const baseDamage = 5; // Thunder damage
0376:         
0377:         state.effects.push({
0378:             type: item.type,
0379:             x: item.col * BLOCK_SIZE + BLOCK_SIZE / 2,
0380:             y: item.row * BLOCK_SIZE + BLOCK_SIZE / 2,
0381:             timer: 0.8
0382:         });
0383: 
0384:         state.blocks.forEach(blk => {
0385:             if (blk.isTransparent) return; // Skip transparent ghost blocks
0386:             if (isVertical && blk.col === item.col) {
0387:                 blk.hp -= baseDamage;
0388:                 blk.hitTimer = 0.15;
0389:             }
0390:             else if (!isVertical && blk.row === item.row) {
0391:                 blk.hp -= baseDamage;
0392:                 blk.hitTimer = 0.15;
0393:             }
0394:         });
0395:     };
0396: 
0397:     const spawnParticles = (x, y, color, count = 15) => {
0398:         for (let i = 0; i < count; i++) {
0399:             const angle = Math.random() * Math.PI * 2;
0400:             const speed = Math.random() * 400 + 100;
0401:             state.particles.push({
0402:                 x, y,
0403:                 vx: Math.cos(angle) * speed,
0404:                 vy: Math.sin(angle) * speed - 200,
0405:                 life: Math.random() * 0.4 + 0.2,
0406:                 maxLife: 0.6,
0407:                 color,
0408:                 size: Math.random() * 6 + 3
0409:             });
0410:         }
0411:     };
0412: 
0413:     const tick = (dt) => {
0414:       if (state.bossWarningTimer > 0) state.bossWarningTimer -= dt;
0415:       if (state.status === 'GAME_OVER' || state.status === 'START_SCREEN' || state.status === 'PAUSED') return;
0416: 
0417:       if (state.status === 'WARPING') {
0418:           state.warpBlocks.forEach(b => {
0419:               b.y += 1500 * dt;
0420:           });
0421:           
0422:           state.warpBlocks = state.warpBlocks.filter(b => {
0423:               if (b.y >= LOGICAL_HEIGHT / 2) {
0424:                   spawnParticles(b.x, LOGICAL_HEIGHT / 2, b.color, b.isItem ? 6 : 12);
0425:                   if (b.isItem && b.type === 'add_ball') {
0426:                       state.addedBallsNextTurn++;
0427:                   }
0428:                   return false; 
0429:               }
0430:               return true;
0431:           });
0432: 
0433:           state.warpTimer += dt;
0434:           while (state.warpTimer >= 0.1 && state.warpCounter < 10) {
0435:               state.warpTimer -= 0.1;
0436:               state.score++;
0437:               if (state.score > 0 && state.score % 50 === 49) {
0438:                   state.bossWarningTimer = 2.0;
0439:               }
0440:               state.warpCounter++;
0441:               if (state.score > highScore) {
0442:                  highScore = state.score;
0443:                  localStorage.setItem('dinoHighScore', highScore);
0444:               }
0445:               
0446:               const newRow = generateRow(0, state.score);
0447:               newRow.blocks.forEach(b => {
0448:                   let mainColor = '#38bdf8';
0449:                   if (b.type === 'iron') mainColor = '#94a3b8';
0450:                   else if (b.type === 'muddy' || b.type === 'slime') mainColor = '#4ade80';
0451:                   else if (b.type === 'ghost') mainColor = '#c084fc';
0452:                   else mainColor = `hsl(${Math.max(0, 200 - b.maxHp * 2)}, 80%, 60%)`;
0453:                   
0454:                   state.warpBlocks.push({
0455:                       x: b.col * BLOCK_SIZE + BLOCK_SIZE / 2,
0456:                       y: -BLOCK_SIZE,
0457:                       hp: b.hp,
0458:                       color: mainColor,
0459:                       type: b.type,
0460:                       isItem: false
0461:                   });
0462:               });
0463: 
0464:               newRow.items.forEach(i => {
0465:                   state.warpBlocks.push({
0466:                       x: i.col * BLOCK_SIZE + BLOCK_SIZE / 2,
0467:                       y: -BLOCK_SIZE,
0468:                       hp: '',
0469:                       color: '#facc15',
0470:                       type: i.type,
0471:                       isItem: true
0472:                   });
0473:               });
0474: 
0475:               updateUI();
0476:           }
0477:           
0478:           if (state.warpCounter >= 10 && state.warpBlocks.length === 0) {
0479:               state.startX = state.firstReturnX !== null ? state.firstReturnX : state.startX;
0480:               state.ballsTotal += state.addedBallsNextTurn;
0481:               state.addedBallsNextTurn = 0;
0482:               
0483:               const newRow = generateRow(0, state.score);
0484:               state.blocks.push(...newRow.blocks);
0485:               state.items.push(...newRow.items);
0486:               state.status = 'AIMING';
0487:               state.balls = [];
0488:               state.firstReturnX = null;
0489:               updateUI();
0490:           }
0491:           return; 
0492:       }
0493: 
0494:       if (state.status === 'SHOOTING') {
0495:         state.shootTimer += dt * state.speedMult;
0496:         while (state.shootTimer > SHOOT_DELAY && state.ballsLaunched < state.ballsTotal) {
0497:           state.balls[state.ballsLaunched].active = true;
0498:           state.balls[state.ballsLaunched].launched = true;
0499:           state.ballsLaunched++;
0500:           state.shootTimer -= SHOOT_DELAY;
0501:         }
0502:         if (state.ballsLaunched === state.ballsTotal) {
0503:           state.status = 'RESOLVING';
0504:         }
0505:       }
0506: 
0507:       if (state.status === 'SHOOTING' || state.status === 'RESOLVING') {
0508:          state.turnTimer += dt;
0509:          if (state.speedMult < 2.5) {
0510:             state.speedMult = Math.min(2.5, state.speedMult + dt * 0.3);
0511:          }
0512:       }
0513: 
0514:       state.particles.forEach(p => {
0515:           p.x += p.vx * dt * state.speedMult;
0516:           p.y += p.vy * dt * state.speedMult;
0517:           p.vy += 1500 * dt * state.speedMult;
0518:           p.life -= dt * state.speedMult;
0519:       });
0520:       state.particles = state.particles.filter(p => p.life > 0);
0521: 
0522:       state.blocks.forEach(b => {
0523:           if (b.hitTimer > 0) b.hitTimer -= dt;
0524:       });
0525: 
0526:       if (state.status === 'SHOOTING' || state.status === 'RESOLVING') {
0527:         let activeCount = 0;
0528: 
0529:         for (let i = 0; i < state.balls.length; i++) {
0530:           const b = state.balls[i];
0531:           if (!b.active) continue;
0532: 
0533:           activeCount++;
0534:           
0535:           b.history.push({x: b.x, y: b.y});
0536:           if (b.history.length > 5) b.history.shift();
0537: 
0538:         let subSteps = Math.ceil(2 * state.speedMult); 
0539:         let subDt = (dt * state.speedMult) / subSteps;
0540:         
0541:         for (let s = 0; s < subSteps; s++) {
0542:            if (!b.active) break;
0543:            b.x += b.vx * subDt;
0544:            b.y += b.vy * subDt;
0545: 
0546:              if (b.x - BALL_RADIUS < 0) { b.x = BALL_RADIUS; b.vx *= -1; }
0547:              if (b.x + BALL_RADIUS > LOGICAL_WIDTH) { b.x = LOGICAL_WIDTH - BALL_RADIUS; b.vx *= -1; }
0548:              if (b.y - BALL_RADIUS < 0) { b.y = BALL_RADIUS; b.vy *= -1; }
0549: 
0550:              if (b.y + BALL_RADIUS > LOGICAL_HEIGHT) {
0551:                let shouldBounce = false;
0552:                if (state.selectedChar === 'dino' && b.bounceCount < 2) {
0553:                    shouldBounce = true;
0554:                    b.bounceCount++;
0555:                }
0556: 
0557:                if (shouldBounce) {
0558:                    b.y = LOGICAL_HEIGHT - BALL_RADIUS;
0559:                    b.vy *= -1;
0560:                } else {
0561:                    b.active = false;
0562:                    b.history = []; // Clear trail
0563:                    b.y = LOGICAL_HEIGHT - BALL_RADIUS;
0564:                    if (state.firstReturnX === null) {
0565:                      state.firstReturnX = b.x;
0566:                    }
0567:                    break;
0568:                }
0569:              }
0570: 
0571:              // Item Collision
0572:              for (let j = 0; j < state.items.length; j++) {
0573:                 const item = state.items[j];
0574:                 if (item.collected && item.type !== 'split') continue;
0575:                 
0576:                 const ix = item.col * BLOCK_SIZE + BLOCK_SIZE / 2;
0577:                 const iy = item.row * BLOCK_SIZE + BLOCK_SIZE / 2;
0578:                 const itemRadius = 15;
0579:                 const distSq = (b.x - ix) ** 2 + (b.y - iy) ** 2;
0580:                 
0581:                 if (distSq < (BALL_RADIUS + itemRadius) ** 2) {
0582:                     if (item.type === 'split') {
0583:                         if (b.lastSplitItemId !== item.id) {
0584:                             item.collected = true; // Flags for removal at turn end
0585:                             b.lastSplitItemId = item.id;
0586:                             
0587:                             const angle = Math.atan2(b.vy, b.vx);
0588:                             const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
0589:                             const jitter1 = (Math.PI / 6) + Math.random() * (Math.PI / 6);
0590:                             const jitter2 = (Math.PI / 6) + Math.random() * (Math.PI / 6);
0591:                             const angle1 = angle + jitter1;
0592:                             const angle2 = angle - jitter2;
0593:                             
0594:                             state.balls.push({
0595:                                 x: b.x, y: b.y,
0596:                                 vx: Math.cos(angle1) * speed,
0597:                                 vy: Math.sin(angle1) * speed,
0598:                                 active: true, launched: true, history: [],
0599:                                 isLeader: false,
0600:                                 lastSplitItemId: item.id,
0601:                                 isSplitClone: true
0602:                             });
0603:                             
0604:                             state.balls.push({
0605:                                 x: b.x, y: b.y,
0606:                                 vx: Math.cos(angle2) * speed,
0607:                                 vy: Math.sin(angle2) * speed,
0608:                                 active: true, launched: true, history: [],
0609:                                 isLeader: false,
0610:                                 lastSplitItemId: item.id,
0611:                                 isSplitClone: true
0612:                             });
0613:                         }
0614:                     } else {
0615:                         item.collected = true;
0616:                         if (item.type === 'add_ball') {
0617:                             state.addedBallsNextTurn++;
0618:                         } else if (item.type === 'thunder_v' || item.type === 'thunder_h') {
0619:                             triggerThunder(item);
0620:                         }
0621:                     }
0622:                 }
0623:              }
0624: 
0625:              // Block Collision
0626:              for (let j = 0; j < state.blocks.length; j++) {
0627:                const block = state.blocks[j];
0628:                if (block.hp <= 0 || block.isTransparent) continue;
0629: 
0630:                const blockLeft = block.col * BLOCK_SIZE;
0631:                const blockRight = blockLeft + BLOCK_SIZE * (block.width || 1);
0632:                const blockTop = block.row * BLOCK_SIZE;
0633:                const blockBottom = blockTop + BLOCK_SIZE;
0634: 
0635:                if (b.x + BALL_RADIUS < blockLeft || b.x - BALL_RADIUS > blockRight ||
0636:                    b.y + BALL_RADIUS < blockTop || b.y - BALL_RADIUS > blockBottom) {
0637:                    continue;
0638:                }
0639: 
0640:                let hitHypotenuse = false;
0641:                let isColliding = false;
0642: 
0643:                if (block.shape && block.shape !== 'square') {
0644:                    const rx = b.x - blockLeft;
0645:                    const ry = b.y - blockTop;
0646:                    const w = BLOCK_SIZE;
0647:                    const rDiag = BALL_RADIUS * 1.4142; 
0648: 
0649:                    if (block.shape === 'triangle_tl') {
0650:                        if (rx + ry > w && rx + ry - w < rDiag) {
0651:                            hitHypotenuse = true; isColliding = true;
0652:                            const distOut = rDiag - (rx + ry - w);
0653:                            b.x += distOut / 2; b.y += distOut / 2;
0654:                        } else if (rx + ry <= w) isColliding = true;
0655:                    } else if (block.shape === 'triangle_tr') {
0656:                        if (ry > rx && ry - rx < rDiag) {
0657:                            hitHypotenuse = true; isColliding = true;
0658:                            const distOut = rDiag - (ry - rx);
0659:                            b.x -= distOut / 2; b.y += distOut / 2;
0660:                        } else if (ry <= rx) isColliding = true;
0661:                    } else if (block.shape === 'triangle_bl') {
0662:                        if (rx > ry && rx - ry < rDiag) {
0663:                            hitHypotenuse = true; isColliding = true;
0664:                            const distOut = rDiag - (rx - ry);
0665:                            b.x += distOut / 2; b.y -= distOut / 2;
0666:                        } else if (rx <= ry) isColliding = true;
0667:                    } else if (block.shape === 'triangle_br') {
0668:                        if (rx + ry < w && w - (rx + ry) < rDiag) {
0669:                            hitHypotenuse = true; isColliding = true;
0670:                            const distOut = rDiag - (w - (rx + ry));
0671:                            b.x -= distOut / 2; b.y -= distOut / 2;
0672:                        } else if (rx + ry >= w) isColliding = true;
0673:                    }
0674:                    
0675:                    if (!isColliding) continue;
0676:                } else {
0677:                    isColliding = true;
0678:                }
0679: 
0680:                const closestX = Math.max(blockLeft, Math.min(b.x, blockRight));
0681:                const closestY = Math.max(blockTop, Math.min(b.y, blockBottom));
0682:                const distanceX = b.x - closestX;
0683:                const distanceY = b.y - closestY;
0684:                const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
0685: 
0686:                if (!hitHypotenuse && distanceSquared >= BALL_RADIUS * BALL_RADIUS) {
0687:                    continue;
0688:                }
0689:                  
0690:                let damage = b.isLeader ? 2 : 1;
0691:                if (state.selectedChar === 'punch') damage = 2; 
0692:                if (state.selectedChar === 'dino' && b.isLeader) damage = 4; 
0693: 
0694:                let instantKill = false;
0695:                if (state.selectedChar === 'reaper' && Math.random() < 0.05) { 
0696:                    instantKill = true;
0697:                }
0698: 
0699:                let hitEdge = null;
0700:                if (!hitHypotenuse) {
0701:                    if (Math.abs(distanceX) > Math.abs(distanceY)) {
0702:                        hitEdge = distanceX > 0 ? 'right' : 'left';
0703:                    } else {
0704:                        hitEdge = distanceY > 0 ? 'bottom' : 'top';
0705:                    }
0706:                }
0707: 
0708:                if (block.shield && block.shield === hitEdge) {
0709:                    damage = 0;
0710:                    instantKill = false;
0711:                }
0712: 
0713:                const prevHp = block.hp;
0714:                if (instantKill) {
0715:                    block.hp = 0;
0716:                } else {
0717:                    block.hp -= damage;
0718:                }
0719:                
0720:                if (damage > 0 || instantKill) {
0721:                    block.hitTimer = 0.1; // Trigger flash only if damaged
0722:                }
0723:                
0724:                if (block.type === 'muddy' || block.type === 'slime') {
0725:                   b.active = false;
0726:                   b.history = [];
0727:                   b.y = LOGICAL_HEIGHT - BALL_RADIUS;
0728:                   if (state.firstReturnX === null) state.firstReturnX = b.x;
0729:                   break; 
0730:                }
0731: 
0732:                let penetrate = false;
0733:                if (state.selectedChar === 'punch' && prevHp <= damage) {
0734:                    penetrate = true; 
0735:                }
0736: 
0737:                if (!penetrate) {
0738:                    if (hitHypotenuse) {
0739:                        const temp = b.vx;
0740:                        if (block.shape === 'triangle_tl' || block.shape === 'triangle_br') {
0741:                            b.vx = -b.vy;
0742:                            b.vy = -temp;
0743:                        } else {
0744:                            b.vx = b.vy;
0745:                            b.vy = temp;
0746:                        }
0747:                    } else {
0748:                        if (Math.abs(distanceX) > Math.abs(distanceY)) {
0749:                            if (distanceX > 0) {
0750:                                b.vx = Math.abs(b.vx);
0751:                                b.x = blockRight + BALL_RADIUS;
0752:                            } else {
0753:                                b.vx = -Math.abs(b.vx);
0754:                                b.x = blockLeft - BALL_RADIUS;
0755:                            }
0756:                        } else {
0757:                            if (distanceY > 0) {
0758:                                b.vy = Math.abs(b.vy);
0759:                                b.y = blockBottom + BALL_RADIUS;
0760:                            } else {
0761:                                b.vy = -Math.abs(b.vy);
0762:                                b.y = blockTop - BALL_RADIUS;
0763:                            }
0764:                        }
0765:                    }
0766:                }
0767:                break;
0768:              }
0769:         }
0770:       }
0771:     }
0772: 
0773:     const deadBlocks = state.blocks.filter(b => b.hp <= 0);
0774:         let bossDefeated = false;
0775:         
0776:         deadBlocks.forEach(b => {
0777:              const bx = b.col * BLOCK_SIZE + BLOCK_SIZE / 2;
0778:              const by = b.row * BLOCK_SIZE + BLOCK_SIZE / 2;
0779:              
0780:              let mainColor = '#38bdf8';
0781:              if (b.type === 'iron') mainColor = '#94a3b8';
0782:              else if (b.type === 'muddy' || b.type === 'slime') mainColor = '#4ade80';
0783:              else if (b.type === 'ghost') mainColor = '#c084fc';
0784:              else if (b.type === 'boss') { mainColor = '#f43f5e'; bossDefeated = true; }
0785:              else mainColor = `hsl(${Math.max(0, 200 - b.maxHp * 2)}, 80%, 60%)`;
0786:              
0787:              spawnParticles(bx, by, mainColor, 15);
0788:         });
0789: 
0790:         state.blocks = state.blocks.filter(b => b.hp > 0);
0791: 
0792:         if (state.status === 'RESOLVING' && (state.blocks.length === 0 || bossDefeated)) {
0793:             state.balls.forEach(b => {
0794:                 if (b.active) {
0795:                     b.active = false;
0796:                     b.history = [];
0797:                     b.y = LOGICAL_HEIGHT - BALL_RADIUS;
0798:                     if (state.firstReturnX === null) state.firstReturnX = b.x;
0799:                 }
0800:             });
0801:             activeCount = 0;
0802:         }
0803: 
0804:         if (state.status === 'RESOLVING' && activeCount === 0) {
0805:           const blocksRemaining = state.blocks.length;
0806:           const blocksDestroyed = state.blocksCountAtStart - blocksRemaining;
0807: 
0808:           let evalText = '';
0809:           let evalColor = '';
0810:           let skipStages = 0;
0811: 
0812:           if ((blocksRemaining === 0 && state.blocksCountAtStart > 0) || bossDefeated) {
0813:               state.status = 'WARPING';
0814:               state.warpCounter = 0;
0815:               state.warpTimer = 0;
0816:               state.effects.push({ type: 'warp_lightning', timer: 1.5, y: LOGICAL_HEIGHT / 2 });
0817:               state.effects.push({ type: 'eval_text_warp', text: 'FANTASTIC', color: '#facc15', timer: 1.5, y: LOGICAL_HEIGHT / 2 });
0818:           } else if (blocksDestroyed >= 7) {
0819:               evalText = 'EXCELLENT';
0820:               evalColor = '#10b981'; // Emerald Green
0821:           } else if (blocksDestroyed >= 5) {
0822:               evalText = 'AMAZING';
0823:               evalColor = '#c084fc'; // Purple
0824:           } else if (blocksDestroyed >= 3) {
0825:               evalText = 'GREAT';
0826:               evalColor = '#3b82f6'; // Blue
0827:           } else if (blocksDestroyed >= 1) {
0828:               evalText = 'GOOD';
0829:               evalColor = '#34d399'; // Green
0830:           }
0831: 
0832:           if (evalText !== '') {
0833:               state.effects.push({ type: 'eval_text', text: evalText, color: evalColor, timer: 1.5, y: LOGICAL_HEIGHT / 2 });
0834:           }
0835: 
0836:           if (state.status === 'WARPING') {
0837:              state.items = []; // Items fly away due to warp
0838:           } else {
0839:              state.score += 1;
0840:              if (state.score > 0 && state.score % 50 === 49) {
0841:                  state.bossWarningTimer = 2.0;
0842:              }
0843:              state.ballsTotal += state.addedBallsNextTurn;
0844:              state.addedBallsNextTurn = 0;
0845: 
0846:              if (state.score > highScore) {
0847:                 highScore = state.score;
0848:                 localStorage.setItem('dinoHighScore', highScore);
0849:              }
0850: 
0851:              state.startX = state.firstReturnX !== null ? state.firstReturnX : state.startX;
0852:              
0853:              let gameOver = false;
0854:              state.blocks = state.blocks.map(b => {
0855:                if (b.row + 1 >= GRID_ROWS) gameOver = true;
0856:                
0857:                let newShield = b.shield;
0858:                if (newShield) {
0859:                    if (b.row + 1 === GRID_ROWS - 1) {
0860:                        newShield = null; // Last row, shield disappears
0861:                    } else {
0862:                        const nextShield = { 'top': 'right', 'right': 'bottom', 'bottom': 'left', 'left': 'top' };
0863:                        newShield = nextShield[newShield];
0864:                    }
0865:                }
0866:                let newCol = b.col;
0867:                if (b.type === 'boss') {
0868:                    const slide = Math.floor(Math.random() * 3) - 1;
0869:                    newCol += slide;
0870:                    if (newCol < 0) newCol = 0;
0871:                    if (newCol > GRID_COLS - (b.width || 1)) newCol = GRID_COLS - (b.width || 1);
0872:                }
0873:                
0874:                return { ...b, row: b.row + 1, col: newCol, shield: newShield, isTransparent: b.type === 'ghost' ? !b.isTransparent : false };
0875:              });
0876:              state.items = state.items.filter(i => !i.collected).map(i => {
0877:                 return { ...i, row: i.row + 1 };
0878:              });
0879: 
0880:              if (gameOver) {
0881:                state.status = 'GAME_OVER';
0882:                
0883:                const currentEntry = { name: state.username, score: state.score, timestamp: Date.now() };
0884:                leaderboard.push(currentEntry);
0885:                leaderboard.sort((a, b) => b.score - a.score);
0886:                if (leaderboard.length > 100) leaderboard = leaderboard.slice(0, 100);
0887:                localStorage.setItem('dinoLeaderboard', JSON.stringify(leaderboard));
0888:                state.lastPlayTimestamp = currentEntry.timestamp;
0889:                
0890:                updateUI();
0891:              } else {
0892:                const newRow = generateRow(0, state.score);
0893:                state.blocks.push(...newRow.blocks);
0894:                state.items.push(...newRow.items);
0895:                state.status = 'AIMING';
0896:                state.balls = [];
0897:                state.firstReturnX = null;
0898:              }
0899:              updateUI();
0900:           }
0901:         }
0902:       }
0903:     };
0904: 
0905:     let lastTime = performance.now();
0906:     updateUI();
0907: 
0908:     const drawDino = (ctx, x, y, isOpen, charId, scale) => {
0909:       ctx.save();
0910:       ctx.translate(x, y);
0911:       ctx.scale(scale, scale);
0912:       
0913:       let bodyColor, hornColor;
0914:       switch(charId) {
0915:           case 'orange': bodyColor = '#f97316'; hornColor = '#fff'; break;
0916:           case 'reaper': bodyColor = '#7e22ce'; hornColor = '#d8b4fe'; break;
0917:           case 'punch': bodyColor = '#ec4899'; hornColor = '#fff'; break;
0918:           case 'dino': bodyColor = '#2dd4bf'; hornColor = '#fff'; break; // Teal
0919:           default: bodyColor = '#38bdf8'; hornColor = '#fff'; break; // Light blue
0920:       }
0921: 
0922:       // Spikes on back (drawn behind body)
0923:       ctx.fillStyle = hornColor;
0924:       ctx.beginPath();
0925:       ctx.moveTo(-22, -10); ctx.lineTo(-35, -20); ctx.lineTo(-15, -20);
0926:       ctx.moveTo(-28, 5); ctx.lineTo(-40, -5); ctx.lineTo(-25, -2);
0927:       ctx.moveTo(22, -10); ctx.lineTo(35, -20); ctx.lineTo(15, -20);
0928:       ctx.moveTo(28, 5); ctx.lineTo(40, -5); ctx.lineTo(25, -2);
0929:       ctx.fill();
0930: 
0931:       // Body (Gumdrop shape)
0932:       ctx.fillStyle = bodyColor;
0933:       ctx.beginPath();
0934:       ctx.arc(0, -5, 32, Math.PI, 0); // Top arc
0935:       ctx.rect(-32, -5, 64, 35); // Lower rectangle
0936:       ctx.fill();
0937: 
0938:       // Top Horns
0939:       ctx.fillStyle = hornColor;
0940:       ctx.beginPath();
0941:       ctx.moveTo(-15, -32); ctx.lineTo(-20, -45); ctx.lineTo(-5, -35); // Left horn
0942:       ctx.moveTo(15, -32); ctx.lineTo(20, -45); ctx.lineTo(5, -35); // Right horn
0943:       ctx.fill();
0944: 
0945:       // Eyes (Big Ovals)
0946:       ctx.fillStyle = '#fff';
0947:       if (charId === 'reaper') {
0948:           ctx.beginPath(); ctx.ellipse(-12, -8, 8, 12, 0, 0, Math.PI*2); ctx.fill();
0949:           ctx.beginPath(); ctx.ellipse(12, -8, 8, 12, 0, 0, Math.PI*2); ctx.fill();
0950:           ctx.fillStyle = '#0f172a'; // Dead pupil
0951:           ctx.beginPath(); ctx.ellipse(-12, -6, 4, 6, 0, 0, Math.PI*2); ctx.fill();
0952:           ctx.beginPath(); ctx.ellipse(12, -6, 4, 6, 0, 0, Math.PI*2); ctx.fill();
0953:       } else {
0954:           ctx.beginPath(); ctx.ellipse(-12, -10, 9, 14, 0, 0, Math.PI*2); ctx.fill();
0955:           ctx.beginPath(); ctx.ellipse(12, -10, 9, 14, 0, 0, Math.PI*2); ctx.fill();
0956:           ctx.fillStyle = '#0f172a'; // Pupil looking forward
0957:           ctx.beginPath(); ctx.ellipse(-12, -12, 4, 6, 0, 0, Math.PI*2); ctx.fill();
0958:           ctx.beginPath(); ctx.ellipse(12, -12, 4, 6, 0, 0, Math.PI*2); ctx.fill();
0959:       }
0960: 
0961:       // Mouth
0962:       ctx.fillStyle = '#1e1b4b'; // dark mouth interior
0963:       ctx.beginPath();
0964:       if (isOpen) {
0965:         // Aiming - big open mouth
0966:         ctx.arc(0, 12, 16, 0, Math.PI, false);
0967:         ctx.fill();
0968:       } else {
0969:         // Smiling mouth
0970:         ctx.arc(0, 10, 12, 0, Math.PI, false);
0971:         ctx.fill();
0972:         // Tooth (white square on bottom)
0973:         ctx.fillStyle = '#fff';
0974:         ctx.fillRect(-5, 17, 10, 5);
0975:       }
0976: 
0977:       ctx.restore();
0978:     };
0979: 
0980:     const drawLightningIcon = (ctx, x, y, isHorizontal) => {
0981:         ctx.save();
0982:         ctx.translate(x, y);
0983:         if (isHorizontal) ctx.rotate(Math.PI / 2);
0984:         ctx.scale(1.5, 1.5);
0985:         ctx.beginPath();
0986:         ctx.moveTo(2, -6);
0987:         ctx.lineTo(-4, 0);
0988:         ctx.lineTo(0, 0);
0989:         ctx.lineTo(-2, 6);
0990:         ctx.lineTo(4, -1);
0991:         ctx.lineTo(0, -1);
0992:         ctx.closePath();
0993:         ctx.fillStyle = '#fff';
0994:         ctx.fill();
0995:         ctx.strokeStyle = '#60a5fa'; // Light blue glow
0996:         ctx.lineWidth = 1;
0997:         ctx.stroke();
0998:         ctx.restore();
0999:     };
1000: 
1001:     const drawItemOrb = (ctx, type, time = 0) => {
1002:         if (type === 'thunder_v' || type === 'thunder_h') {
1003:              ctx.fillStyle = `rgba(56, 189, 248, ${0.4 + Math.random() * 0.4})`;
1004:              ctx.beginPath(); ctx.arc(0, 0, 22 + Math.random() * 4, 0, Math.PI * 2); ctx.fill();
1005:              
1006:              ctx.strokeStyle = '#fff';
1007:              ctx.lineWidth = 1.5;
1008:              ctx.lineCap = 'round';
1009:              ctx.lineJoin = 'round';
1010:              ctx.beginPath();
1011:              
1012:              // Draw realistic erratic sparks
1013:              const drawSpark = (angle) => {
1014:                  let cx = Math.cos(angle) * 10;
1015:                  let cy = Math.sin(angle) * 10;
1016:                  ctx.moveTo(cx, cy);
1017:                  const maxLen = 15 + Math.random() * 15;
1018:                  const segments = 6;
1019:                  let currentAngle = angle;
1020:                  for (let j = 0; j < segments; j++) {
1021:                      currentAngle += (Math.random() - 0.5) * 2.0; // erratic sharp turns
1022:                      const step = maxLen / segments;
1023:                      cx += Math.cos(currentAngle) * step;
1024:                      cy += Math.sin(currentAngle) * step;
1025:                      ctx.lineTo(cx, cy);
1026:                  }
1027:              };
1028: 
1029:              for(let i=0; i<4; i++) {
1030:                  drawSpark(Math.random() * Math.PI * 2);
1031:              }
1032:              ctx.stroke();
1033: 
1034:              ctx.fillStyle = '#bae6fd';
1035:              ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
1036:              drawLightningIcon(ctx, 0, 0, type === 'thunder_h');
1037:         } else if (type === 'split') {
1038:              ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
1039:              ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
1040:              
1041:              ctx.fillStyle = '#e0f2fe';
1042:              ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
1043:              
1044:              ctx.strokeStyle = '#0369a1';
1045:              ctx.lineWidth = 3.5;
1046:              ctx.lineCap = 'round';
1047:              ctx.lineJoin = 'round';
1048:              ctx.beginPath();
1049:              
1050:              // Down arrow
1051:              ctx.moveTo(0, 1); ctx.lineTo(0, 8);
1052:              ctx.moveTo(-4, 4); ctx.lineTo(0, 8); ctx.lineTo(4, 4);
1053:              
1054:              // Top left arrow
1055:              ctx.moveTo(0, -1); ctx.lineTo(-7, -7);
1056:              ctx.moveTo(-3, -8); ctx.lineTo(-8, -8); ctx.lineTo(-8, -3);
1057:              
1058:              // Top right arrow
1059:              ctx.moveTo(0, -1); ctx.lineTo(7, -7);
1060:              ctx.moveTo(3, -8); ctx.lineTo(8, -8); ctx.lineTo(8, -3);
1061:              
1062:              ctx.stroke();
1063:         } else {
1064:              ctx.fillStyle = 'rgba(52, 211, 153, 0.3)';
1065:              ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
1066:              
1067:              ctx.fillStyle = '#a7f3d0';
1068:              ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
1069:              
1070:              if (type === 'add_ball') {
1071:                  ctx.fillStyle = '#064e3b';
1072:                  ctx.font = 'bold 24px "Nunito", sans-serif';
1073:                  ctx.textAlign = 'center';
1074:                  ctx.textBaseline = 'middle';
1075:                  ctx.fillText("+", 0, 2);
1076:              }
1077:         }
1078:     };
1079: 
1080:     const render = (time) => {
1081:       const dt = Math.min((time - lastTime) / 1000, 0.05); 
1082:       lastTime = time;
1083: 
1084:       const steps = 5;
1085:       const subDt = dt / steps;
1086:       for (let i = 0; i < steps; i++) {
1087:         tick(subDt);
1088:       }
1089: 
1090:       // Background Gradient
1091:       const grad = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
1092:       grad.addColorStop(0, '#0f172a');
1093:       grad.addColorStop(0.5, '#1e1b4b');
1094:       grad.addColorStop(1, '#4c1d95');
1095:       ctx.fillStyle = grad;
1096:       ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
1097: 
1098:       // Stars
1099:       ctx.fillStyle = 'rgba(255,255,255,0.5)';
1100:       for(let i=0; i<30; i++) {
1101:           const sx = (Math.sin(i * 123) * 0.5 + 0.5) * LOGICAL_WIDTH;
1102:           const sy = (Math.cos(i * 321) * 0.5 + 0.5) * (LOGICAL_HEIGHT - 300);
1103:           const r = Math.abs(Math.sin(time / 1000 + i)) * 2;
1104:           ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2); ctx.fill();
1105:       }
1106: 
1107:       // Mountains
1108:       ctx.fillStyle = 'rgba(2, 6, 23, 0.7)';
1109:       ctx.beginPath();
1110:       ctx.moveTo(0, LOGICAL_HEIGHT);
1111:       ctx.lineTo(0, LOGICAL_HEIGHT - 120);
1112:       ctx.lineTo(80, LOGICAL_HEIGHT - 220);
1113:       ctx.lineTo(200, LOGICAL_HEIGHT - 100);
1114:       ctx.lineTo(350, LOGICAL_HEIGHT - 250);
1115:       ctx.lineTo(500, LOGICAL_HEIGHT - 80);
1116:       ctx.lineTo(650, LOGICAL_HEIGHT - 180);
1117:       ctx.lineTo(700, LOGICAL_HEIGHT - 120);
1118:       ctx.lineTo(700, LOGICAL_HEIGHT);
1119:       ctx.fill();
1120: 
1121:       // Aiming Line (Laser pointer)
1122:       if (state.status === 'AIMING' && state.targetPoint) {
1123:           const dx = state.targetPoint.x - state.startX;
1124:           const dy = state.targetPoint.y - LOGICAL_HEIGHT;
1125:           
1126:           if (dy < -10) {
1127:               const length = 2000;
1128:               const dist = Math.hypot(dx, dy);
1129:               const dirX = dx / dist;
1130:               const dirY = dy / dist;
1131:               
1132:               ctx.beginPath();
1133:               ctx.moveTo(state.startX, LOGICAL_HEIGHT - 30);
1134:               ctx.lineTo(state.startX + dirX * length, LOGICAL_HEIGHT - 30 + dirY * length);
1135:               ctx.strokeStyle = 'rgba(216, 180, 254, 0.7)';
1136:               ctx.lineWidth = 6;
1137:               ctx.setLineDash([20, 15]);
1138:               ctx.stroke();
1139:               ctx.setLineDash([]);
1140:               
1141:               ctx.beginPath();
1142:               ctx.arc(state.startX + dirX * Math.min(dist, length), LOGICAL_HEIGHT - 30 + dirY * Math.min(dist, length), 15, 0, Math.PI*2);
1143:               ctx.strokeStyle = '#fff';
1144:               ctx.lineWidth = 3;
1145:               ctx.stroke();
1146:           }
1147:       }
1148: 
1149:       state.particles.forEach(p => {
1150:           ctx.save();
1151:           ctx.globalAlpha = p.life / p.maxLife;
1152:           ctx.fillStyle = p.color;
1153:           ctx.shadowColor = p.color;
1154:           ctx.shadowBlur = 10;
1155:           ctx.beginPath();
1156:           ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
1157:           ctx.fill();
1158:           ctx.restore();
1159:       });
1160: 
1161:       // Items
1162:       const floatOffset = Math.sin(time / 200) * 5;
1163:       state.items.forEach(item => {
1164:          if (item.collected) return;
1165:          const x = item.col * BLOCK_SIZE + BLOCK_SIZE / 2;
1166:          const y = item.row * BLOCK_SIZE + BLOCK_SIZE / 2 + floatOffset;
1167:          
1168:          ctx.save();
1169:          ctx.translate(x, y);
1170:          drawItemOrb(ctx, item.type, time);
1171:          ctx.restore();
1172:       });
1173: 
1174:       // Blocks
1175:       state.blocks.forEach(block => {
1176:         const x = block.col * BLOCK_SIZE;
1177:         const y = block.row * BLOCK_SIZE;
1178:         const margin = 3;
1179:         const blockWidth = block.width || 1;
1180:         const sizeW = BLOCK_SIZE * blockWidth - margin * 2;
1181:         const sizeH = BLOCK_SIZE - margin * 2;
1182:         
1183:         ctx.save();
1184:         if (block.isTransparent) {
1185:            ctx.globalAlpha = 0.3;
1186:         }
1187: 
1188:         let mainColor, highlightColor;
1189:         if (block.type === 'iron') {
1190:            mainColor = '#475569'; highlightColor = '#64748b';
1191:         } else if (block.type === 'boss') {
1192:            mainColor = '#9f1239'; highlightColor = '#e11d48'; // Dark red
1193:         } else if (block.type === 'slime') {
1194:            mainColor = '#22c55e'; highlightColor = '#4ade80';
1195:         } else if (block.type === 'ghost') {
1196:            mainColor = '#a855f7'; highlightColor = '#c084fc';
1197:         } else {
1198:            // Normal blocks change color slightly based on HP
1199:            const hue = Math.max(0, 200 - block.hp * 2); // Blue to Red
1200:            mainColor = `hsl(${hue}, 80%, 50%)`;
1201:            highlightColor = `hsl(${hue}, 80%, 65%)`;
1202:         }
1203:         
1204:         const drawShape = () => {
1205:             ctx.beginPath();
1206:             if (block.shape === 'square' || !block.shape) {
1207:                 ctx.roundRect(x + margin, y + margin, sizeW, sizeH, 8);
1208:             } else if (block.shape === 'triangle_tl') {
1209:                 ctx.moveTo(x + margin, y + margin);
1210:                 ctx.lineTo(x + sizeW + margin, y + margin);
1211:                 ctx.lineTo(x + margin, y + sizeH + margin);
1212:                 ctx.closePath();
1213:             } else if (block.shape === 'triangle_tr') {
1214:                 ctx.moveTo(x + margin, y + margin);
1215:                 ctx.lineTo(x + sizeW + margin, y + margin);
1216:                 ctx.lineTo(x + sizeW + margin, y + sizeH + margin);
1217:                 ctx.closePath();
1218:             } else if (block.shape === 'triangle_bl') {
1219:                 ctx.moveTo(x + margin, y + margin);
1220:                 ctx.lineTo(x + margin, y + sizeH + margin);
1221:                 ctx.lineTo(x + sizeW + margin, y + sizeH + margin);
1222:                 ctx.closePath();
1223:             } else if (block.shape === 'triangle_br') {
1224:                 ctx.moveTo(x + sizeW + margin, y + margin);
1225:                 ctx.lineTo(x + sizeW + margin, y + sizeH + margin);
1226:                 ctx.lineTo(x + margin, y + sizeH + margin);
1227:                 ctx.closePath();
1228:             }
1229:         };
1230: 
1231:         // Base fill
1232:         ctx.fillStyle = mainColor;
1233:         drawShape();
1234:         ctx.fill();
1235: 
1236:         // Highlight
1237:         if (block.shape === 'square' || !block.shape) {
1238:             ctx.fillStyle = highlightColor;
1239:             ctx.beginPath();
1240:             ctx.moveTo(x + margin + 8, y + margin);
1241:             ctx.lineTo(x + sizeW + margin - 8, y + margin);
1242:             ctx.lineTo(x + sizeW + margin - 15, y + margin + 15);
1243:             ctx.lineTo(x + margin + 15, y + margin + 15);
1244:             ctx.fill();
1245:         } else {
1246:             // Simple highlight for triangles
1247:             ctx.fillStyle = highlightColor;
1248:             ctx.globalAlpha = 0.5;
1249:             drawShape();
1250:             ctx.fill();
1251:             ctx.globalAlpha = block.isTransparent ? 0.3 : 1.0;
1252:         }
1253: 
1254:         // White flash when hit
1255:         if (block.hitTimer > 0) {
1256:            ctx.fillStyle = `rgba(255, 255, 255, ${block.hitTimer / 0.1})`;
1257:            drawShape();
1258:            ctx.fill();
1259:         }
1260: 
1261:         let tx = x + (BLOCK_SIZE * blockWidth) / 2;
1262:         let ty = y + BLOCK_SIZE / 2;
1263:         let fontSize = 28;
1264:         
1265:         if (block.shape && block.shape !== 'square') {
1266:             fontSize = 22;
1267:             if (block.shape === 'triangle_tl') { tx = x + BLOCK_SIZE * 0.35; ty = y + BLOCK_SIZE * 0.35; }
1268:             else if (block.shape === 'triangle_tr') { tx = x + BLOCK_SIZE * 0.65; ty = y + BLOCK_SIZE * 0.35; }
1269:             else if (block.shape === 'triangle_bl') { tx = x + BLOCK_SIZE * 0.35; ty = y + BLOCK_SIZE * 0.65; }
1270:             else if (block.shape === 'triangle_br') { tx = x + BLOCK_SIZE * 0.65; ty = y + BLOCK_SIZE * 0.65; }
1271:         }
1272: 
1273:         ctx.fillStyle = '#fff';
1274:         ctx.font = `bold ${fontSize}px "Nunito", sans-serif`;
1275:         ctx.textAlign = 'center';
1276:         ctx.textBaseline = 'middle';
1277:         ctx.shadowColor = '#000';
1278:         ctx.shadowBlur = 4;
1279:         ctx.fillText(block.hp.toString(), tx, ty);
1280:         ctx.shadowBlur = 0;
1281:         
1282:         if (block.shield) {
1283:             ctx.strokeStyle = '#22d3ee'; // bright cyan
1284:             ctx.lineWidth = 5;
1285:             ctx.lineCap = 'round';
1286:             ctx.shadowColor = '#06b6d4';
1287:             ctx.shadowBlur = 15;
1288:             ctx.beginPath();
1289:             
1290:             const L = x + margin;
1291:             const R = x + margin + sizeW;
1292:             const T = y + margin;
1293:             const B = y + margin + sizeH;
1294: 
1295:             if (block.shield === 'top') {
1296:                 ctx.moveTo(L, T); ctx.lineTo(R, T);
1297:             } else if (block.shield === 'right') {
1298:                 ctx.moveTo(R, T); ctx.lineTo(R, B);
1299:             } else if (block.shield === 'bottom') {
1300:                 ctx.moveTo(R, B); ctx.lineTo(L, B);
1301:             } else if (block.shield === 'left') {
1302:                 ctx.moveTo(L, B); ctx.lineTo(L, T);
1303:             }
1304:             ctx.stroke();
1305:             ctx.shadowBlur = 0;
1306:         }
1307: 
1308:         ctx.restore();
1309:       });
1310: 
1311:       if (state.status === 'WARPING') {
1312:           state.warpBlocks.forEach(b => {
1313:               ctx.save();
1314:               ctx.translate(b.x, b.y);
1315:               
1316:               if (b.isItem) {
1317:                   drawItemOrb(ctx, b.type, time);
1318:               } else {
1319:                   ctx.fillStyle = b.color;
1320:                   ctx.beginPath();
1321:                   ctx.roundRect(-BLOCK_SIZE/2 + 2, -BLOCK_SIZE/2 + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4, 8);
1322:                   ctx.fill();
1323:                   
1324:                   ctx.fillStyle = 'rgba(255,255,255,0.2)';
1325:                   ctx.beginPath();
1326:                   ctx.roundRect(-BLOCK_SIZE/2 + 2, -BLOCK_SIZE/2 + 2, BLOCK_SIZE - 4, (BLOCK_SIZE - 4)/2, 8);
1327:                   ctx.fill();
1328: 
1329:                   ctx.fillStyle = '#fff';
1330:                   ctx.font = 'bold 24px "Nunito", sans-serif';
1331:                   ctx.textAlign = 'center';
1332:                   ctx.textBaseline = 'middle';
1333:                   ctx.shadowColor = 'rgba(0,0,0,0.5)';
1334:                   ctx.shadowBlur = 4;
1335:                   ctx.fillText(b.hp, 0, 0);
1336:               }
1337:               
1338:               ctx.restore();
1339:           });
1340:       }
1341: 
1342:       // Render Thunder Effects
1343:       state.effects.forEach(eff => {
1344:           let alpha = eff.timer / 0.4;
1345:           if (eff.type === 'thunder_v' || eff.type === 'thunder_h') alpha = eff.timer / 0.8;
1346:           else if (eff.type === 'warp_lightning' || eff.type === 'eval_text') alpha = eff.timer / 1.5;
1347:           
1348:           ctx.save();
1349:           if (eff.type === 'thunder_v' || eff.type === 'thunder_h') {
1350:               const drawLightning = (x1, y1, x2, y2, color, width, glow) => {
1351:                   ctx.strokeStyle = color;
1352:                   ctx.lineWidth = width;
1353:                   ctx.lineCap = 'round';
1354:                   ctx.lineJoin = 'round';
1355:                   ctx.shadowColor = color;
1356:                   ctx.shadowBlur = glow;
1357:                   ctx.beginPath();
1358:                   ctx.moveTo(x1, y1);
1359:                   const segments = 20;
1360:                   for (let i = 1; i <= segments; i++) {
1361:                       let t = i / segments;
1362:                       let mx = x1 + (x2 - x1) * t;
1363:                       let my = y1 + (y2 - y1) * t;
1364:                       if (i < segments) {
1365:                           const offset = (Math.random() - 0.5) * 60; // Jagged jitter
1366:                           if (eff.type === 'thunder_v') mx += offset;
1367:                           else my += offset;
1368:                       }
1369:                       ctx.lineTo(mx, my);
1370:                   }
1371:                   ctx.stroke();
1372:               };
1373: 
1374:               const startX = eff.type === 'thunder_v' ? eff.x : 0;
1375:               const startY = eff.type === 'thunder_h' ? eff.y : 0;
1376:               const endX = eff.type === 'thunder_v' ? eff.x : LOGICAL_WIDTH;
1377:               const endY = eff.type === 'thunder_h' ? eff.y : LOGICAL_HEIGHT;
1378: 
1379:               // Draw multiple bolts
1380:               for (let j = 0; j < 3; j++) {
1381:                   drawLightning(startX, startY, endX, endY, `rgba(56, 189, 248, ${alpha * 0.8})`, 8, 30);
1382:                   drawLightning(startX, startY, endX, endY, `rgba(255, 255, 255, ${alpha})`, 3, 10);
1383:               }
1384:           } else if (eff.type === 'eval_text') {
1385:               const p = eff.timer / 1.5; // 1 to 0
1386:               const scale = p > 0.8 ? 1.0 + (p - 0.8) * 5 : 1.0; 
1387:               const textAlpha = p < 0.2 ? p / 0.2 : 1;
1388:               const yOffset = p < 0.5 ? (0.5 - p) * -50 : 0;
1389:               
1390:               ctx.translate(LOGICAL_WIDTH / 2, eff.y + yOffset);
1391:               ctx.scale(scale, scale);
1392:               ctx.globalAlpha = textAlpha;
1393:               
1394:               ctx.fillStyle = eff.color;
1395:               ctx.font = '900 60px "Nunito", sans-serif';
1396:               ctx.textAlign = 'center';
1397:               ctx.textBaseline = 'middle';
1398:               
1399:               ctx.shadowColor = eff.color;
1400:               ctx.shadowBlur = 20;
1401:               ctx.fillText(eff.text, 0, 0);
1402:               
1403:               ctx.fillStyle = '#fff';
1404:               ctx.shadowBlur = 0;
1405:               ctx.fillText(eff.text, 0, 0);
1406:           } else if (eff.type === 'eval_text_warp') {
1407:               const p = eff.timer / 1.5; 
1408:               const scale = p > 0.8 ? 1.0 + (p - 0.8) * 5 : (p < 0.2 ? 1.0 - (0.2 - p) * 2 : 1.0); 
1409:               const textAlpha = p < 0.2 ? p / 0.2 : 1;
1410:               
1411:               ctx.translate(LOGICAL_WIDTH / 2, eff.y);
1412:               ctx.scale(scale, scale);
1413:               ctx.globalAlpha = textAlpha;
1414:               
1415:               ctx.fillStyle = eff.color;
1416:               ctx.font = '900 60px "Nunito", sans-serif';
1417:               ctx.textAlign = 'center';
1418:               ctx.textBaseline = 'middle';
1419:               
1420:               ctx.shadowColor = eff.color;
1421:               ctx.shadowBlur = 30;
1422:               ctx.fillText(eff.text, 0, 0);
1423:               
1424:               ctx.fillStyle = '#fff';
1425:               ctx.shadowBlur = 0;
1426:               ctx.fillText(eff.text, 0, 0);
1427:               
1428:               ctx.font = '900 30px "Nunito", sans-serif';
1429:               ctx.fillStyle = '#fef08a';
1430:               ctx.fillText("+10 STAGES SKIP!", 0, 50);
1431:           } else if (eff.type === 'warp_lightning') {
1432:               const p = eff.timer / 1.5;
1433:               const alpha = p < 0.2 ? p / 0.2 : 1;
1434:               for (let i = 0; i < 3; i++) {
1435:                  const yOffset = (Math.random() - 0.5) * 60;
1436:                  ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.8})`;
1437:                  ctx.lineWidth = 10 + Math.random() * 10;
1438:                  ctx.beginPath(); 
1439:                  ctx.moveTo(0, eff.y + yOffset); 
1440:                  ctx.lineTo(LOGICAL_WIDTH, eff.y + yOffset + (Math.random()-0.5)*20); 
1441:                  ctx.stroke();
1442:                  
1443:                  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
1444:                  ctx.lineWidth = 4;
1445:                  ctx.stroke();
1446:               }
1447:           }
1448:           ctx.restore();
1449:       });
1450:       // Remove finished effects
1451:       state.effects = state.effects.filter(e => e.timer > 0);
1452:       state.effects.forEach(e => e.timer -= (time - lastTime)/1000 || dt); // Ensure correct timing subtraction
1453: 
1454:       // Dinosaur Launcher
1455:       if (state.status !== 'START_SCREEN') {
1456:          const isAiming = state.status === 'AIMING';
1457:          const dinoScale = isAiming ? 1.0 + Math.sin(time / 200) * 0.05 : 1.0; // Breathing animation
1458:          drawDino(ctx, state.startX, LOGICAL_HEIGHT - 30, isAiming, state.selectedChar, dinoScale);
1459: 
1460:          if (isAiming) {
1461:              ctx.fillStyle = '#fff';
1462:              ctx.font = '900 24px "Nunito", sans-serif';
1463:              ctx.textAlign = 'center';
1464:              ctx.shadowColor = '#000';
1465:              ctx.shadowBlur = 5;
1466:              ctx.fillText(`x${state.ballsTotal}`, state.startX, LOGICAL_HEIGHT - 80);
1467:              ctx.shadowBlur = 0;
1468:          }
1469:       }
1470: 
1471:       // Balls & Trails
1472:       if (state.status === 'AIMING') {
1473:           // Do not draw balls when aiming, just the dino text
1474:       } else {
1475:           state.balls.forEach(ball => {
1476:               if (!ball.launched) return;
1477:               
1478:               // Draw Trail
1479:               if (ball.active && ball.history && ball.history.length > 0) {
1480:                   ctx.beginPath();
1481:                   ctx.moveTo(ball.history[0].x, ball.history[0].y);
1482:                   for(let k=1; k<ball.history.length; k++){
1483:                      ctx.lineTo(ball.history[k].x, ball.history[k].y);
1484:                   }
1485:                   ctx.lineTo(ball.x, ball.y);
1486:                   
1487:                   let trailColor = ball.isLeader ? 'rgba(250, 204, 21, 0.4)' : 'rgba(255, 255, 255, 0.3)';
1488:                   ctx.strokeStyle = trailColor;
1489:                   ctx.lineWidth = ball.isLeader ? BALL_RADIUS * 3 : BALL_RADIUS * 2;
1490:                   ctx.lineCap = 'round';
1491:                   ctx.lineJoin = 'round';
1492:                   ctx.stroke();
1493:               }
1494: 
1495:               // Draw Ball
1496:               const radius = ball.isLeader ? BALL_RADIUS * 1.5 : BALL_RADIUS;
1497:               if (ball.isLeader) {
1498:                   ctx.fillStyle = '#fef08a';
1499:                   ctx.shadowColor = '#facc15';
1500:               } else {
1501:                   if (state.selectedChar === 'orange') ctx.fillStyle = '#ffedd5';
1502:                   else if (state.selectedChar === 'reaper') ctx.fillStyle = '#f3e8ff';
1503:                   else if (state.selectedChar === 'punch') ctx.fillStyle = '#fce7f3';
1504:                   else ctx.fillStyle = '#fdf4ff';
1505:                   ctx.shadowColor = '#c084fc';
1506:               }
1507:               
1508:               ctx.shadowBlur = 10;
1509:               ctx.beginPath();
1510:               if (!ball.active) {
1511:                 const drawX = state.firstReturnX !== null ? state.firstReturnX : ball.x;
1512:                 ctx.arc(drawX, LOGICAL_HEIGHT - 20, radius, 0, Math.PI * 2);
1513:               } else {
1514:                 ctx.arc(ball.x, ball.y, radius, 0, Math.PI * 2);
1515:               }
1516:               ctx.fill();
1517:               ctx.shadowBlur = 0;
1518:           });
1519:       }
1520: 
1521:       // Retrieve Balls Button
1522:       if (state.status === 'SHOOTING' || state.status === 'RESOLVING') {
1523:         const btnX = LOGICAL_WIDTH - 60;
1524:         const btnY = LOGICAL_HEIGHT - 60;
1525:         
1526:         ctx.fillStyle = 'rgba(14, 165, 233, 0.8)';
1527:         ctx.strokeStyle = '#7dd3fc';
1528:         ctx.lineWidth = 3;
1529:         ctx.beginPath();
1530:         ctx.arc(btnX, btnY, 40, 0, Math.PI * 2);
1531:         ctx.fill();
1532:         ctx.stroke();
1533: 
1534:         ctx.fillStyle = '#fff';
1535:         ctx.font = 'bold 16px "Nunito", sans-serif';
1536:         ctx.textAlign = 'center';
1537:         ctx.textBaseline = 'middle';
1538:         ctx.fillText("DOWN", btnX, btnY - 5);
1539:         
1540:         ctx.beginPath();
1541:         ctx.moveTo(btnX - 10, btnY + 8);
1542:         ctx.lineTo(btnX + 10, btnY + 8);
1543:         ctx.lineTo(btnX, btnY + 20);
1544:         ctx.fill();
1545:       }
1546:       if (state.bossWarningTimer > 0) {
1547:           ctx.save();
1548:           ctx.fillStyle = `rgba(0,0,0,${Math.min(0.7, state.bossWarningTimer)})`;
1549:           ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
1550: 
1551:           const bannerY = LOGICAL_HEIGHT / 2 - 50;
1552:           ctx.fillStyle = `rgba(236, 72, 153, ${Math.min(0.9, state.bossWarningTimer)})`;
1553:           ctx.fillRect(0, bannerY, LOGICAL_WIDTH, 100);
1554: 
1555:           ctx.fillStyle = '#fff';
1556:           ctx.font = '900 40px "Nunito", sans-serif';
1557:           ctx.textAlign = 'center';
1558:           ctx.textBaseline = 'middle';
1559:           ctx.shadowColor = '#be185d';
1560:           ctx.shadowBlur = 10;
1561:           
1562:           if (Math.floor(state.bossWarningTimer * 10) % 2 === 0) {
1563:              ctx.fillText("WARNING!!", LOGICAL_WIDTH / 2, bannerY + 30);
1564:              ctx.fillText("BOSS INCOMING", LOGICAL_WIDTH / 2, bannerY + 70);
1565:           }
1566:           ctx.restore();
1567:       }
1568: 
1569:       requestAnimationFrame(render);
1570:     };
1571: 
1572:     requestAnimationFrame(render);
1573:   
