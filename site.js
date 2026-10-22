(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];

  // Keep scroll driven elements in their final visible state and update navigation,
  // progress, and the horizontal mural as the visitor moves through the page.
  qa('.reveal-motion').forEach(el => { el.classList.remove('reveal-motion'); el.classList.add('in-view'); });
  const hub = q('.hub'), quickNav = q('#quickNav'), progress = q('#scrollProgress');
  const navItems = quickNav ? qa('a[href^="#"]', quickNav).map(link => ({link, target: q(link.getAttribute('href'))})).filter(item => item.target) : [];
  const mural = q('.mural-horizontal'), muralTrack = q('.mural-track');
  let rafPending = false;
  const update = () => {
    const y = scrollY, max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    document.body.classList.toggle('scrolled', y > 40);
    if (progress) progress.style.height = `${Math.min(100, y / max * 100)}%`;
    if (!reduceMotion) q('.cover-title')?.style.setProperty('--drift', `${Math.min(innerHeight, y) * .13}px`);
    if (hub) {
      const cards = qa('.chapter', hub), desktop = innerWidth > 900 && !reduceMotion;
      const raw = desktop ? Math.max(0, Math.min(1, (y - (hub.offsetTop - innerHeight * .78)) / (innerHeight * .96))) : 1;
      const p = raw * raw * (3 - 2 * raw), rest = 1 - p;
      hub.style.setProperty('--hub-copy-y', `${28 * rest}px`);
      hub.style.setProperty('--hub-copy-opacity', `${.38 + .62 * p}`);
      const offsets = [[-175,-95,-4,.82],[0,-155,2.5,.86],[175,-105,4,.82],[-155,175,3.5,.84],[0,220,-2.5,.86],[170,185,5,.82]];
      cards.forEach((card, i) => {
        const [x, dy, rot, scale] = offsets[i] || [0,80,0,.9];
        card.style.setProperty('--dir-x', `${x * rest}px`); card.style.setProperty('--dir-y', `${dy * rest}px`);
        card.style.setProperty('--dir-r', `${rot * rest}deg`); card.style.setProperty('--dir-s', `${scale + (1-scale)*p}`);
        card.style.setProperty('--dir-opacity', `${.2 + .8*p}`); card.style.setProperty('--dir-blur', `${2.2*rest}px`);
      });
    }
    if (quickNav && hub) {
      const visible = y >= hub.offsetTop + hub.offsetHeight - innerHeight * .08;
      quickNav.classList.toggle('is-visible', visible); quickNav.setAttribute('aria-hidden', String(!visible));
      const marker = y + innerHeight * .32; let current = '#top';
      navItems.forEach(({link,target}) => { if (target.offsetTop <= marker) current = link.getAttribute('href'); });
      navItems.forEach(({link}) => link.classList.toggle('is-current', link.getAttribute('href') === current));
    }
    if (mural && muralTrack) {
      const distance = Math.max(1, mural.offsetHeight - innerHeight);
      const p = Math.max(0, Math.min(1, (y - mural.offsetTop) / distance));
      muralTrack.style.transform = `translate3d(${-p * Math.max(0, muralTrack.scrollWidth - innerWidth)}px,0,0)`;
      const indicator = q('.mural-progress i', mural), count = q('.mural-progress span', mural);
      if (indicator) indicator.style.width = `${p * 100}%`;
      if (count) { const total = qa('.mural-panel', muralTrack).length; const current = Math.min(total, Math.floor(p * (total - .001)) + 1); count.textContent = `${String(current).padStart(2,'0')} / ${String(total).padStart(2,'0')}`; }
    }
    rafPending = false;
  };
  const scheduleUpdate = () => { if (!rafPending) { rafPending = true; requestAnimationFrame(update); } };
  addEventListener('scroll', scheduleUpdate, {passive:true}); addEventListener('resize', scheduleUpdate, {passive:true}); update();

  // The IP project expansion remains available without the editing application.
  const showcaseToggle = q('.ip-showcase-toggle'), showcaseContent = q('.ip-showcase-content');
  showcaseToggle?.addEventListener('click', () => {
    const open = showcaseToggle.getAttribute('aria-expanded') !== 'true';
    showcaseToggle.setAttribute('aria-expanded', String(open));
    showcaseToggle.innerHTML = open ? '更多视觉延展 <span aria-hidden="true">↑</span>' : '更多视觉延展 <span aria-hidden="true">↓</span>';
    q('#ip-showcase')?.classList.toggle('is-expanded', open);
    if (showcaseContent) showcaseContent.hidden = !open;
  });

  // Copy the contact detail selected by each copy button.
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-copy]');
    if (!button) return;
    const value = button.dataset.copyValue || '';
    if (!value) return;
    let copied = false;
    try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); copied = true; } } catch {}
    if (!copied) {
      const field = document.createElement('textarea'); field.value = value; field.setAttribute('readonly','');
      field.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.append(field); field.select();
      try { copied = document.execCommand('copy'); } catch {} field.remove();
    }
    const label = button.dataset.originalLabel || button.textContent; button.dataset.originalLabel = label;
    button.textContent = copied ? '已复制 ✓' : '复制失败'; button.classList.toggle('is-copied', copied);
    clearTimeout(button._copyTimer); button._copyTimer = setTimeout(() => { button.textContent = label; button.classList.remove('is-copied'); }, 1600);
  });

  // Open a project card's uploaded detail images in a lightweight overlay.
  const viewport = q('.asset-carousel-viewport'), marquee = q('.asset-carousel-marquee');
  const socialKey = 'zhong-asset-carousel-social-v1';
  let socialData = [];
  try { socialData = JSON.parse(localStorage.getItem(socialKey) || 'null'); } catch {}
  const socialGroups = qa('[data-social-card]');
  const cardCount = socialGroups.reduce((max, group) => Math.max(max, Number(group.dataset.socialCard) || 0), 0);
  if (!Array.isArray(socialData) || socialData.length !== cardCount) {
    const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    socialData = Array.from({length:cardCount}, () => ({views:randomBetween(1000,5000),likes:randomBetween(100,600),favorites:randomBetween(100,600),liked:false,favorited:false}));
    try { localStorage.setItem(socialKey, JSON.stringify(socialData)); } catch {}
  }
  const syncSocial = () => socialGroups.forEach(group => {
    const item = socialData[Number(group.dataset.socialCard) - 1]; if (!item) return;
    Object.entries({views:item.views,likes:item.likes,favorites:item.favorites}).forEach(([name,value]) => {
      const target = q(`[data-social-count="${name}"]`, group); if (target) target.textContent = Number(value).toLocaleString('zh-CN');
    });
    qa('[data-social-action]', group).forEach(button => {
      const active = button.dataset.socialAction === 'like' ? item.liked : item.favorited;
      button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active));
    });
  });
  syncSocial();
  const slideViewer = document.createElement('div'); slideViewer.className = 'asset-detail-viewer'; slideViewer.hidden = true;
  slideViewer.setAttribute('role','dialog'); slideViewer.setAttribute('aria-modal','true'); slideViewer.setAttribute('aria-label','作品详情图片');
  slideViewer.innerHTML = '<div class="asset-detail-viewer-card"><div class="asset-detail-viewer-image"></div><div class="asset-detail-viewer-controls"><small class="asset-detail-viewer-hint">点击任意空白返回</small><span class="asset-detail-viewer-count"></span><button type="button" class="asset-detail-viewer-next">下一张 →</button></div></div>';
  document.body.append(slideViewer);
  const viewerImage = q('.asset-detail-viewer-image', slideViewer), viewerCount = q('.asset-detail-viewer-count', slideViewer), nextSlide = q('.asset-detail-viewer-next', slideViewer);
  let slides = [], slideIndex = 0;
  const paintSlide = () => { viewerImage.style.backgroundImage = slides[slideIndex] || 'none'; viewerCount.textContent = `${String(slideIndex+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`; nextSlide.hidden = slides.length < 2; };
  const closeViewer = () => { slideViewer.hidden = true; viewerImage.style.backgroundImage = 'none'; slides = []; };
  viewport?.addEventListener('click', event => {
    const action = event.target.closest('[data-social-action]');
    if (action) {
      const group = action.closest('[data-social-card]'), type = action.dataset.socialAction;
      const item = group && socialData[Number(group.dataset.socialCard) - 1];
      if (item) {
        const liked = type === 'like', state = liked ? 'liked' : 'favorited', count = liked ? 'likes' : 'favorites';
        item[state] = !item[state]; item[count] = Math.max(0, item[count] + (item[state] ? 1 : -1));
        try { localStorage.setItem(socialKey, JSON.stringify(socialData)); } catch {}
        syncSocial();
      }
      return;
    }
    const card = event.target.closest('.asset-carousel-card'); if (!card) return;
    const slots = qa('.asset-carousel-detail-slot', card).filter(slot => slot.classList.contains('has-image'));
    slides = slots.map(slot => getComputedStyle(slot).backgroundImage).filter(value => value && value !== 'none');
    if (!slides.length) return;
    slideIndex = 0; paintSlide(); slideViewer.hidden = false;
  });
  nextSlide.addEventListener('click', () => { slideIndex = (slideIndex + 1) % slides.length; paintSlide(); });
  slideViewer.addEventListener('click', event => { if (event.target === slideViewer) closeViewer(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !slideViewer.hidden) closeViewer(); });
  const shift = direction => {
    const animation = marquee?.getAnimations().find(item => item.effect?.getTiming().iterations === Infinity);
    if (!animation) return;
    animation.pause(); const duration = Number(animation.effect.getTiming().duration) || 72000;
    const count = qa('.asset-carousel-track:not(.asset-carousel-track-copy) .asset-carousel-card', viewport).length || 1;
    animation.currentTime = ((Number(animation.currentTime) || 0) + direction * duration / count + duration) % duration;
    clearTimeout(marquee._resumeTimer); marquee._resumeTimer = setTimeout(() => animation.play(), 900);
  };
  q('.asset-carousel-float-prev')?.addEventListener('click', () => shift(-1));
  q('.asset-carousel-float-next')?.addEventListener('click', () => shift(1));

  // Videos are muted and played only while visible; all static image backgrounds
  // are already present in the page, so reaching a section does not trigger hydration.
  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      const video = entry.target; if (entry.isIntersecting) video.play().catch(() => {}); else video.pause();
    }), {rootMargin:'200px'});
    qa('video').forEach(video => { video.muted = true; video.playsInline = true; videoObserver.observe(video); });
  }
})();
