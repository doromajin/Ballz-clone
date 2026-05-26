import re

def update_game():
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add FLOOR_Y constant
    content = content.replace(
        "const LOGICAL_HEIGHT = 1000;",
        "const LOGICAL_HEIGHT = 1000;\n    const FLOOR_Y = LOGICAL_HEIGHT - 60;"
    )

    # 2. Add clamping helper right after FLOOR_Y
    clamping_helper = """
    const getClampedAimDir = (startX, targetX, targetY) => {
        let dx = targetX - startX;
        let dy = targetY - FLOOR_Y;
        let angle = Math.atan2(dy, dx);
        
        // dy is negative when aiming UP (since y=0 is top).
        // 15 degrees in radians = 0.2618
        const minAngle = 15 * Math.PI / 180;
        
        // Clamp to minimum 15 degrees above the horizontal floor.
        // angle goes from 0 to -PI when aiming upwards.
        if (angle > -minAngle) { // Dragged too far right or downwards
            angle = dx >= 0 ? -minAngle : (-Math.PI + minAngle);
        } else if (angle < -Math.PI + minAngle) {
            angle = -Math.PI + minAngle;
        }
        
        return {
            dirX: Math.cos(angle),
            dirY: Math.sin(angle),
            dx, dy
        };
    };
"""
    content = content.replace(
        "const FLOOR_Y = LOGICAL_HEIGHT - 60;",
        "const FLOOR_Y = LOGICAL_HEIGHT - 60;\n" + clamping_helper
    )

    # 3. Update `shoot`
    shoot_old = """    const shoot = () => {
      if (state.status !== 'AIMING' || !state.targetPoint) return;
      
      const dx = state.targetPoint.x - state.startX;
      const dy = state.targetPoint.y - LOGICAL_HEIGHT;
      const dist = Math.hypot(dx, dy);
      
      if (dist < 10 || dy > -10) return; 

      const vx = (dx / dist) * BALL_SPEED;
      const vy = (dy / dist) * BALL_SPEED;

      state.balls = Array.from({ length: state.ballsTotal }).map((_, idx) => ({
        x: state.startX,
        y: LOGICAL_HEIGHT - BALL_RADIUS,"""

    shoot_new = """    const shoot = () => {
      if (state.status !== 'AIMING' || !state.targetPoint) return;
      
      const aim = getClampedAimDir(state.startX, state.targetPoint.x, state.targetPoint.y);
      if (Math.hypot(aim.dx, aim.dy) < 10 || aim.dy > -10) return;

      const vx = aim.dirX * BALL_SPEED;
      const vy = aim.dirY * BALL_SPEED;

      state.balls = Array.from({ length: state.ballsTotal }).map((_, idx) => ({
        x: state.startX,
        y: FLOOR_Y - BALL_RADIUS,"""
    content = content.replace(shoot_old, shoot_new)

    # 4. Update aiming render
    aiming_render_old = """      if (state.status === 'AIMING' && state.targetPoint) {
          const dx = state.targetPoint.x - state.startX;
          const dy = state.targetPoint.y - LOGICAL_HEIGHT;
          
          if (dy < -10) {
              const length = 2000;
              const dist = Math.hypot(dx, dy);
              const dirX = dx / dist;
              const dirY = dy / dist;
              
              ctx.beginPath();
              ctx.moveTo(state.startX, LOGICAL_HEIGHT - 30);
              ctx.lineTo(state.startX + dirX * length, LOGICAL_HEIGHT - 30 + dirY * length);
              ctx.strokeStyle = 'rgba(216, 180, 254, 0.7)';
              ctx.lineWidth = 6;
              ctx.setLineDash([20, 15]);
              ctx.stroke();
              ctx.setLineDash([]);
              
              ctx.beginPath();
              ctx.arc(state.startX + dirX * Math.min(dist, length), LOGICAL_HEIGHT - 30 + dirY * Math.min(dist, length), 15, 0, Math.PI*2);"""

    aiming_render_new = """      if (state.status === 'AIMING' && state.targetPoint) {
          const aim = getClampedAimDir(state.startX, state.targetPoint.x, state.targetPoint.y);
          
          if (aim.dy < -10) {
              const length = 2000;
              const dist = Math.hypot(aim.dx, aim.dy);
              const dirX = aim.dirX;
              const dirY = aim.dirY;
              
              ctx.beginPath();
              ctx.moveTo(state.startX, FLOOR_Y);
              ctx.lineTo(state.startX + dirX * length, FLOOR_Y + dirY * length);
              ctx.strokeStyle = 'rgba(216, 180, 254, 0.7)';
              ctx.lineWidth = 6;
              ctx.setLineDash([20, 15]);
              ctx.stroke();
              ctx.setLineDash([]);
              
              ctx.beginPath();
              ctx.arc(state.startX + dirX * Math.min(dist, length), FLOOR_Y + dirY * Math.min(dist, length), 15, 0, Math.PI*2);"""
    content = content.replace(aiming_render_old, aiming_render_new)

    # 5. Fast drop logic y override
    content = content.replace("b.y = LOGICAL_HEIGHT - BALL_RADIUS;", "b.y = FLOOR_Y - BALL_RADIUS;")
    
    # 6. Bounce logic checks `if (b.y + BALL_RADIUS > LOGICAL_HEIGHT)`
    content = content.replace(
        "if (b.y + BALL_RADIUS > LOGICAL_HEIGHT) {", 
        "if (b.y + BALL_RADIUS > FLOOR_Y) {"
    )

    # 7. Draw dotted floor
    floor_render = """      // Draw dotted floor
      ctx.beginPath();
      ctx.moveTo(0, FLOOR_Y);
      ctx.lineTo(LOGICAL_WIDTH, FLOOR_Y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Particles"""
    content = content.replace("      // Particles", floor_render)

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Update complete")

if __name__ == '__main__':
    update_game()
