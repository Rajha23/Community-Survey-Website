import React, { useEffect, useRef } from 'react';

export default function BackgroundCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let w, h;
    let grid = 50; 
    let runners = [];
    let mouse = { x: -100, y: -100 };
    
    const colors = [
      'rgba(247, 226, 192, 0.3)', // brand-yellow
      'rgba(74, 222, 128, 0.3)',  // brand-green
      'rgba(224, 242, 254, 0.3)', // light blue
      'rgba(255, 105, 180, 0.3)'  // pink
    ]; 
    
    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    
    const onMouseMove = (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', onMouseMove);

    class Runner {
      constructor() {
        this.reset();
      }
      
      reset() {
        this.x = Math.floor(Math.random() * (w/grid)) * grid;
        this.y = Math.floor(Math.random() * (h/grid)) * grid;
        
        const dir = Math.floor(Math.random() * 4);
        this.speed = 0.5; 
        this.vx = (dir === 0 ? 1 : dir === 1 ? -1 : 0) * this.speed;
        this.vy = (dir === 2 ? 1 : dir === 3 ? -1 : 0) * this.speed;
        
        this.history = [];
        this.maxHistory = Math.random() * 20 + 10;
        this.life = Math.random() * 100 + 50;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.thickness = Math.random() > 0.8 ? 2 : 1;
      }
      
      update() {
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.x % grid === 0 && this.y % grid === 0) {
           if (Math.random() < 0.15) {
               if (this.vx !== 0) {
                   this.vx = 0;
                   this.vy = (Math.random() > 0.5 ? 1 : -1) * this.speed;
               } else {
                   this.vy = 0;
                   this.vx = (Math.random() > 0.5 ? 1 : -1) * this.speed;
               }
           }
        }
        
        this.life--;
        
        if (this.x < -grid || this.x > w+grid || this.y < -grid || this.y > h+grid || this.life <= 0) {
            this.reset();
        }
        
        this.history.push({x: this.x, y: this.y});
        if(this.history.length > this.maxHistory) {
            this.history.shift();
        }
      }
      
      draw() {
        if(this.history.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(this.history[0].x, this.history[0].y);
        for(let i=1; i<this.history.length; i++) {
            ctx.lineTo(this.history[i].x, this.history[i].y);
        }
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.thickness;
        ctx.stroke();

        // Draw head
        ctx.beginPath();
        ctx.fillStyle = this.color.replace('0.3', '0.8');
        ctx.arc(this.x, this.y, this.thickness * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function init() {
      resize();
      window.addEventListener('resize', resize);
      runners = [];
      for (let i = 0; i < 40; i++) {
        runners.push(new Runner());
      }
    }

    let animationFrameId;

    function animate() {
      ctx.fillStyle = 'rgba(5, 5, 5, 0.2)'; // brand-bg trail effect
      ctx.fillRect(0, 0, w, h);
      
      runners.forEach(r => {
        r.update();
        r.draw();
      });

      // Mouse interaction
      if (mouse.x > 0 && mouse.y > 0) {
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 100, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 100);
        gradient.addColorStop(0, 'rgba(247, 226, 192, 0.05)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      
      animationFrameId = requestAnimationFrame(animate);
    }

    init();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full z-0 block"
      />
      <div className="fixed top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-transparent to-[#050505] z-0 pointer-events-none"></div>
    </>
  );
}
