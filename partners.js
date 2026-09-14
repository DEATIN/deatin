(() => {
  'use strict';

  const scene = document.querySelector('[data-partner-scene]');
  const canvas = document.getElementById('partner-network');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const nodes = [...document.querySelectorAll('.partner-node')];
  const cards = [...document.querySelectorAll('[data-partner-card]')];
  const hub = document.querySelector('[data-hub]');
  let activePartner = null;

  const setActive = (id) => {
    activePartner = id || null;
    nodes.forEach((node) => node.classList.toggle('active', node.dataset.partner === activePartner));
    cards.forEach((card) => card.classList.toggle('highlight', card.dataset.partnerCard === activePartner));
  };

  nodes.forEach((node) => {
    node.addEventListener('mouseenter', () => setActive(node.dataset.partner));
    node.addEventListener('focus', () => setActive(node.dataset.partner));
    node.addEventListener('mouseleave', () => setActive(null));
    node.addEventListener('blur', () => setActive(null));
    node.addEventListener('click', () => {
      const target = document.querySelector(`[data-partner-card="${node.dataset.partner}"]`);
      setActive(node.dataset.partner);
      target?.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'center' });
    });
  });

  cards.forEach((card) => {
    card.addEventListener('mouseenter', () => setActive(card.dataset.partnerCard));
    card.addEventListener('mouseleave', () => setActive(null));
  });

  class PartnerNetwork {
    constructor(canvas, scene, hub, nodes) {
      this.canvas = canvas;
      this.scene = scene;
      this.hub = hub;
      this.nodes = nodes;
      this.ctx = canvas.getContext('2d');
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      this.width = 0;
      this.height = 0;
      this.stars = [];
      this.frame = 0;
      this.pointer = { x: 0, y: 0, active: false };
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(scene);
      this.resize();
      this.bind();
      if (!reduced.matches) this.start();
      else this.draw(performance.now());
    }

    bind() {
      if (finePointer.matches) {
        this.scene.addEventListener('pointermove', (event) => {
          const rect = this.scene.getBoundingClientRect();
          this.pointer.x = event.clientX - rect.left;
          this.pointer.y = event.clientY - rect.top;
          this.pointer.active = true;
          const nx = this.pointer.x / rect.width - .5;
          const ny = this.pointer.y / rect.height - .5;
          this.scene.style.setProperty('--scene-x', `${(nx * 10).toFixed(2)}px`);
          this.scene.style.setProperty('--scene-y', `${(ny * 10).toFixed(2)}px`);
          this.hub.style.transform = `translate(calc(-50% + ${(nx * 8).toFixed(1)}px), calc(-50% + ${(ny * 8).toFixed(1)}px))`;
        }, { passive: true });
        this.scene.addEventListener('pointerleave', () => {
          this.pointer.active = false;
          this.hub.style.transform = '';
        });
      }
      reduced.addEventListener?.('change', (event) => event.matches ? this.stop() : this.start());
    }

    resize() {
      const rect = this.scene.getBoundingClientRect();
      this.width = Math.max(1, rect.width);
      this.height = Math.max(1, rect.height);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const count = Math.max(26, Math.min(58, Math.round(this.width * this.height / 10500)));
      this.stars = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: .35 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
        accent: index % 7 === 0
      }));
      this.draw(performance.now());
    }

    point(element) {
      const er = element.getBoundingClientRect();
      const sr = this.scene.getBoundingClientRect();
      return { x: er.left - sr.left + er.width / 2, y: er.top - sr.top + er.height / 2 };
    }

    curve(ctx, a, b, bend) {
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const cx = mx - dy / len * bend;
      const cy = my + dx / len * bend;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(cx, cy, b.x, b.y);
      return { cx, cy };
    }

    bezierPoint(t, a, c, b) {
      const m = 1 - t;
      return { x: m * m * a.x + 2 * m * t * c.x + t * t * b.x, y: m * m * a.y + 2 * m * t * c.y + t * t * b.y };
    }

    draw(time) {
      const ctx = this.ctx;
      const t = time * .001;
      ctx.clearRect(0, 0, this.width, this.height);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      this.stars.forEach((star) => {
        const pulse = .35 + Math.sin(t * .8 + star.phase) * .18;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = star.accent ? `rgba(140,255,122,${pulse})` : `rgba(53,215,255,${pulse * .85})`;
        ctx.fill();
      });

      const center = this.point(this.hub);
      this.nodes.forEach((node, index) => {
        const end = this.point(node);
        const active = node.dataset.partner === activePartner;
        const bend = (index % 2 ? 1 : -1) * (34 + index * 5);
        const c = this.curve(ctx, center, end, bend);
        const gradient = ctx.createLinearGradient(center.x, center.y, end.x, end.y);
        gradient.addColorStop(0, active ? 'rgba(140,255,122,.62)' : 'rgba(53,215,255,.21)');
        gradient.addColorStop(1, active ? 'rgba(53,215,255,.8)' : 'rgba(140,255,122,.13)');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = active ? 1.8 : .75;
        ctx.stroke();

        const phase = ((t * (.13 + index * .012) + index * .22) % 1);
        const p = this.bezierPoint(phase, center, c, end);
        ctx.beginPath();
        ctx.arc(p.x, p.y, active ? 3.4 : 2.2, 0, Math.PI * 2);
        ctx.fillStyle = active ? 'rgba(140,255,122,.95)' : 'rgba(53,215,255,.72)';
        ctx.shadowBlur = active ? 16 : 9;
        ctx.shadowColor = active ? '#8cff7a' : '#35d7ff';
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      if (this.pointer.active) {
        const radius = 72 + Math.sin(t * 2) * 5;
        const g = ctx.createRadialGradient(this.pointer.x, this.pointer.y, 0, this.pointer.x, this.pointer.y, radius);
        g.addColorStop(0, 'rgba(53,215,255,.08)');
        g.addColorStop(1, 'rgba(53,215,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(this.pointer.x, this.pointer.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    tick = (time) => {
      this.draw(time);
      this.frame = requestAnimationFrame(this.tick);
    };

    start() {
      if (!this.frame) this.frame = requestAnimationFrame(this.tick);
    }

    stop() {
      if (this.frame) cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.draw(performance.now());
    }
  }

  if (scene && canvas && hub && nodes.length) new PartnerNetwork(canvas, scene, hub, nodes);

  const wipe = document.querySelector('[data-page-wipe]');
  document.querySelectorAll('a[href]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (reduced.matches || !wipe || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('http')) return;
      event.preventDefault();
      wipe.style.setProperty('--wipe-x', `${event.clientX || innerWidth / 2}px`);
      wipe.style.setProperty('--wipe-y', `${event.clientY || innerHeight / 2}px`);
      wipe.classList.add('go');
      setTimeout(() => { window.location.href = href; }, 430);
    });
  });
})();
