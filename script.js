(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motionButton = document.querySelector('[data-motion]');
  const savedMotion = localStorage.getItem('deatin-motion');
  let motionEnabled = !reducedMotion.matches && savedMotion !== 'off';

  const setMotionUI = () => {
    document.documentElement.classList.toggle('motion-off', !motionEnabled);
    if (!motionButton) return;
    motionButton.setAttribute('aria-pressed', String(motionEnabled));
    motionButton.setAttribute('aria-label', motionEnabled ? 'Отключить анимацию' : 'Включить анимацию');
  };
  setMotionUI();

  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  const header = document.querySelector('[data-header]');
  const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 24);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const menuButton = document.querySelector('[data-menu]');
  const nav = document.querySelector('[data-nav]');
  const setMenu = (open) => {
    if (!menuButton || !nav) return;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    nav.classList.toggle('open', open);
  };
  menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
  });
  document.addEventListener('pointerdown', (event) => {
    if (!nav?.classList.contains('open')) return;
    if (!nav.contains(event.target) && !menuButton?.contains(event.target)) setMenu(false);
  });

  const revealNodes = [...document.querySelectorAll('.reveal')];
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        instance.unobserve(entry.target);
      });
    }, { threshold: 0.11, rootMargin: '0px 0px -6% 0px' });
    revealNodes.forEach((node) => observer.observe(node));
  } else {
    revealNodes.forEach((node) => node.classList.add('visible'));
  }

  const rotator = document.querySelector('[data-rotator]');
  const roles = ['enterprise-архитектура', 'интеграции и MDM', 'цифровые продукты', 'delivery end-to-end'];
  let roleIndex = 0;
  let roleTimer = 0;
  const startRotator = () => {
    window.clearInterval(roleTimer);
    if (!rotator || !motionEnabled) return;
    roleTimer = window.setInterval(() => {
      rotator.style.opacity = '0';
      rotator.style.transform = 'translateY(6px)';
      window.setTimeout(() => {
        roleIndex = (roleIndex + 1) % roles.length;
        rotator.textContent = roles[roleIndex];
        rotator.style.opacity = '1';
        rotator.style.transform = 'none';
      }, 220);
    }, 2800);
  };
  if (rotator) rotator.style.transition = 'opacity .22s ease, transform .22s ease';
  startRotator();

  const setupTilt = () => {
    if (!finePointer.matches) return;
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        if (!motionEnabled) return;
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        const rotateY = (px - 0.5) * 8;
        const rotateX = (0.5 - py) * 7;
        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
        card.style.setProperty('--shine-x', `${(px * 100).toFixed(1)}%`);
        card.style.setProperty('--shine-y', `${(py * 100).toFixed(1)}%`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
        card.style.removeProperty('--shine-x');
        card.style.removeProperty('--shine-y');
      });
    });
  };
  setupTilt();

  if (finePointer.matches) {
    document.querySelectorAll('.magnetic').forEach((element) => {
      element.addEventListener('pointermove', (event) => {
        if (!motionEnabled) return;
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        element.style.transform = `translate(${(x * 0.12).toFixed(1)}px, ${(y * 0.15).toFixed(1)}px)`;
      });
      element.addEventListener('pointerleave', () => { element.style.transform = ''; });
    });
  }

  class NeuralBackground {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.nodes = [];
      this.frame = 0;
      this.lastTime = 0;
      this.pointer = { x: 0, y: 0, active: false };
      this.resizeTimer = 0;
      this.boundTick = this.tick.bind(this);
      this.resize();
      this.bind();
      this.setEnabled(motionEnabled);
    }

    bind() {
      window.addEventListener('resize', () => {
        window.clearTimeout(this.resizeTimer);
        this.resizeTimer = window.setTimeout(() => this.resize(), 120);
      }, { passive: true });
      window.addEventListener('pointermove', (event) => {
        this.pointer.x = event.clientX;
        this.pointer.y = event.clientY;
        this.pointer.active = true;
      }, { passive: true });
      document.documentElement.addEventListener('pointerleave', () => { this.pointer.active = false; });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.stop();
        else if (this.enabled) this.start();
      });
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.65);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.createNodes();
      this.draw(performance.now(), 0);
    }

    createNodes() {
      const area = this.width * this.height;
      const mobile = this.width < 700;
      const count = Math.round(Math.max(mobile ? 32 : 46, Math.min(mobile ? 54 : 96, area / (mobile ? 17500 : 14500))));
      this.nodes = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        phase: Math.random() * Math.PI * 2,
        size: 0.7 + Math.random() * 1.6,
        accent: index % 5 === 0
      }));
    }

    setEnabled(enabled) {
      this.enabled = Boolean(enabled) && !reducedMotion.matches;
      this.enabled ? this.start() : this.stop(true);
    }

    start() {
      if (this.frame || document.hidden) return;
      this.lastTime = performance.now();
      this.frame = requestAnimationFrame(this.boundTick);
    }

    stop(redraw = false) {
      if (this.frame) cancelAnimationFrame(this.frame);
      this.frame = 0;
      if (redraw) this.draw(performance.now(), 0);
    }

    tick(time) {
      const delta = Math.min(32, time - this.lastTime) / 16.667;
      this.lastTime = time;
      this.draw(time, delta);
      this.frame = requestAnimationFrame(this.boundTick);
    }

    draw(time, delta) {
      const ctx = this.ctx;
      const t = time * 0.00022;
      ctx.clearRect(0, 0, this.width, this.height);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      this.drawFlow(ctx, t);

      if (delta && this.enabled) {
        this.nodes.forEach((node, index) => {
          node.x += (node.vx + Math.sin(t * 2 + node.phase) * 0.035) * delta;
          node.y += (node.vy + Math.cos(t * 1.7 + node.phase) * 0.035) * delta;

          if (this.pointer.active) {
            const dx = node.x - this.pointer.x;
            const dy = node.y - this.pointer.y;
            const distance = Math.hypot(dx, dy) || 1;
            if (distance < 190) {
              const force = (1 - distance / 190) * 0.34 * delta;
              node.x += (dx / distance) * force;
              node.y += (dy / distance) * force;
            }
          }

          const margin = 30;
          if (node.x < -margin) node.x = this.width + margin;
          if (node.x > this.width + margin) node.x = -margin;
          if (node.y < -margin) node.y = this.height + margin;
          if (node.y > this.height + margin) node.y = -margin;
          node.phase += 0.0007 * (index % 3 + 1) * delta;
        });
      }

      const maxDistance = this.width < 700 ? 112 : 148;
      for (let i = 0; i < this.nodes.length; i += 1) {
        const a = this.nodes[i];
        for (let j = i + 1; j < this.nodes.length; j += 1) {
          const b = this.nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.hypot(dx, dy);
          if (distance > maxDistance) continue;
          const alpha = (1 - distance / maxDistance) * 0.16;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = (a.accent || b.accent) ? `rgba(140,255,122,${alpha})` : `rgba(53,215,255,${alpha})`;
          ctx.lineWidth = 0.65;
          ctx.stroke();
        }

        if (this.pointer.active) {
          const pd = Math.hypot(a.x - this.pointer.x, a.y - this.pointer.y);
          if (pd < 135) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(this.pointer.x, this.pointer.y);
            ctx.strokeStyle = `rgba(140,255,122,${(1 - pd / 135) * 0.2})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      this.nodes.forEach((node) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fillStyle = node.accent ? 'rgba(140,255,122,.68)' : 'rgba(53,215,255,.55)';
        ctx.shadowBlur = node.accent ? 9 : 7;
        ctx.shadowColor = node.accent ? '#8cff7a' : '#35d7ff';
        ctx.fill();
      });
      ctx.restore();
    }

    drawFlow(ctx, t) {
      const bands = 4;
      for (let i = 0; i < bands; i += 1) {
        const offset = (i - 1.5) * 145;
        const wave = Math.sin(t * (1.2 + i * 0.1) + i) * 75;
        ctx.beginPath();
        ctx.moveTo(-80, this.height * 0.56 + offset);
        ctx.bezierCurveTo(
          this.width * 0.22, this.height * 0.14 + offset + wave,
          this.width * 0.7, this.height * 0.92 - offset * 0.45 - wave,
          this.width + 90, this.height * 0.42 + offset * 0.18
        );
        ctx.strokeStyle = i % 2 ? 'rgba(140,255,122,.035)' : 'rgba(53,215,255,.045)';
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
    }
  }

  const canvas = document.getElementById('neural-canvas');
  const neural = canvas ? new NeuralBackground(canvas) : null;

  motionButton?.addEventListener('click', () => {
    motionEnabled = !motionEnabled;
    localStorage.setItem('deatin-motion', motionEnabled ? 'on' : 'off');
    setMotionUI();
    neural?.setEnabled(motionEnabled);
    startRotator();
    if (!motionEnabled) {
      document.querySelectorAll('[data-tilt],.magnetic').forEach((node) => { node.style.transform = ''; });
    }
  });

  reducedMotion.addEventListener?.('change', (event) => {
    if (event.matches) motionEnabled = false;
    else motionEnabled = localStorage.getItem('deatin-motion') !== 'off';
    setMotionUI();
    neural?.setEnabled(motionEnabled);
    startRotator();
  });
})();
