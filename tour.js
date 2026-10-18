/* PREVIEW TOUR: remove before launch. Guided demo tour for the HOCC preview site. Vanilla JS, no libraries. */
(function () {
  'use strict';

  var KEY = 'hocc-tour-banner-dismissed';
  var PAD = 8;
  var params = new URLSearchParams(location.search);
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var isHome = page === 'index.html' || page === '';
  var isMembership = page === 'membership.html';

  function isMobile() { return window.matchMedia('(max-width: 700px)').matches; }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    var cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
  }

  function firstVisible(sels) {
    for (var i = 0; i < sels.length; i++) {
      var el = document.querySelector(sels[i]);
      if (visible(el)) return el;
    }
    return null;
  }

  function make(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text) el.textContent = text;
    return el;
  }

  function isPinned(el) {
    for (var n = el; n && n !== document.body; n = n.parentElement) {
      var p = getComputedStyle(n).position;
      if (p === 'fixed' || p === 'sticky') return true;
    }
    return false;
  }

  /* ---------- tour definitions ---------- */

  var HOME = [
    { id: 'welcome', title: 'Welcome', text: 'This is your new club website. We’ll show you the main parts. Tap Next.', none: true },
    { id: 'register', title: 'Register / Renew', text: 'New and renewing members tap this button to join or renew online.', targets: ['.join-btn'] },
    { id: 'menu', title: 'The menu', targets: ['.nav', '.menu > summary'],
      text: function (m) { return m ? 'Tap Menu to see About, Events, Photos and Contact.' : 'Use the menu to get to About, Events, Photos and Contact.'; } },
    { id: 'events', title: 'Upcoming events', text: 'Upcoming events. Past events disappear by themselves as dates go by, so this list stays up to date.', targets: ['.events'] },
    { id: 'photos', title: 'Photos', text: 'Club photos. Tap ‘See all photos’ for the full gallery.', targets: ['main .grid'] },
    { id: 'bar', title: 'Join / Renew bar', text: 'This Join / Renew bar stays at the bottom of the screen on phones.', targets: ['.join-bar'], only: 'mobile' },
    { id: 'footer', title: 'Contact information', text: 'Contact information is at the bottom of every page.', targets: ['.site-footer'], only: 'desktop' },
    { id: 'last', title: 'One more thing', text: 'Want to see how registering works?', none: true,
      actions: [{ label: 'Show me how registering works', href: 'membership.html?tour=register', primary: true }, { label: 'Finish', exit: true }] }
  ];

  var REGISTER = [
    { id: 'overview', title: 'Three easy steps', text: 'Joining takes three easy steps.', targets: ['.steps'] },
    { id: 'form', title: 'Step 1: Your information', text: 'Fill in your name, address, phone, email and your Corvette.', targets: ['#form form', '#form'] },
    { id: 'pay', title: 'Step 2: Pay securely', text: 'You do not need a PayPal account. You can pay with any credit or debit card.', targets: ['#pay .big-note', '#pay'] },
    { id: 'check', title: 'Pay by check', text: 'Prefer a check? You can still mail one.', targets: ['#pay .check', '.check'] },
    { id: 'todo', title: 'Yellow notes', text: 'These yellow notes are things we need from you, like your PayPal links.', targets: ['.todo'],
      actions: [{ label: 'Finish', exit: true, primary: true }, { label: 'Back to home page', href: 'index.html' }] }
  ];

  /* ---------- tour engine ---------- */

  var T = null; // active tour state

  function buildSteps(defs) {
    var mobile = isMobile(), out = [];
    var running = document.body.classList.contains('pt-running');
    document.body.classList.remove('pt-running');   // measure with the page's normal UI visible
    defs.forEach(function (d) {
      if (d.only === 'mobile' && !mobile) return;
      if (d.only === 'desktop' && mobile) return;
      var el = null;
      if (!d.none) {
        el = firstVisible(d.targets);
        if (!el) return;
      }
      out.push({ def: d, el: el, matchedMobile: !!(el && el.matches && el.matches('.menu > summary')) });
    });
    if (running) document.body.classList.add('pt-running');
    return out;
  }

  function startTour(defs) {
    if (T) return;
    var steps = buildSteps(defs);
    if (!steps.length) return;

    var backdrop = make('div', 'pt-backdrop');
    var spot = make('div', 'pt-spot');
    var card = make('div', 'pt-card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'pt-title');
    card.tabIndex = -1;
    var count = make('p', 'pt-count');
    var title = make('h2', 'pt-title'); title.id = 'pt-title';
    var text = make('p', 'pt-text');
    text.setAttribute('aria-live', 'polite');
    var btns = make('div', 'pt-btns');
    card.appendChild(count); card.appendChild(title); card.appendChild(text); card.appendChild(btns);
    document.body.appendChild(backdrop);
    document.body.appendChild(spot);
    document.body.appendChild(card);

    T = { defs: defs, steps: steps, i: 0, backdrop: backdrop, spot: spot, card: card, count: count, title: title, text: text, btns: btns, dockTop: false, raf: 0 };
    var launcher = document.querySelector('.pt-launch');
    if (launcher) launcher.hidden = true;

    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('orientationchange', onResize);
    window.addEventListener('load', onResize);
    Array.prototype.forEach.call(document.images, function (im) { if (!im.complete) im.addEventListener('load', onResize, { once: true }); });
    render(true);
  }

  function btn(label, cls, fn) {
    var b = make('button', 'pt-btn ' + cls, label);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  function render(focus) {
    var s = T.steps[T.i], d = s.def, n = T.steps.length;
    T.count.textContent = 'Step ' + (T.i + 1) + ' of ' + n;
    T.title.textContent = d.title;
    T.text.textContent = typeof d.text === 'function' ? d.text(s.matchedMobile) : d.text;

    T.btns.textContent = '';
    T.btns.className = 'pt-btns' + (d.actions ? ' pt-final' : '');
    var back = btn('Back', 'pt-secondary', prev);
    back.disabled = T.i === 0;
    if (d.actions) {
      d.actions.forEach(function (a) {
        T.btns.appendChild(btn(a.label, a.primary ? 'pt-primary' : 'pt-secondary', function () {
          if (a.href) { location.href = a.href; } else { exit(); }
        }));
      });
      T.btns.appendChild(back);
      back.classList.add('pt-back');
    } else {
      T.btns.appendChild(back);
      T.btns.appendChild(btn('Next', 'pt-primary', next));
      T.btns.appendChild(btn('Exit', 'pt-secondary', exit));
    }

    T.backdrop.classList.toggle('pt-dim', !s.el);
    T.spot.style.display = s.el ? 'block' : 'none';
    T.card.classList.remove('pt-top');
    T.dockTop = false;
    T.card.classList.toggle('pt-center', !s.el);
    T.card.style.visibility = 'hidden';
    T.card.style.left = T.card.style.top = '0px';

    var isBar = !!(s.el && s.el.matches('.join-bar'));
    document.body.classList.add('pt-running');
    document.body.classList.toggle('pt-bar-step', isBar);
    T.card.classList.remove('pt-compact');
    T.card.style.bottom = '';
    if (isMobile()) layoutMobile(s, isBar);
    else { if (s.el) bringIntoView(s.el); decideDock(); }
    place();
    T.card.style.visibility = '';
    T.card.focus({ preventScroll: true });
  }

  function rectsOverlap(a, b) {
    return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
  }

  /* Mobile: dock the card top or bottom, and scroll the target into the free part of the screen. */
  function layoutMobile(s, isBar) {
    var vh = window.innerHeight;
    T.card.classList.add('pt-mob');
    T.dockTop = false;
    T.card.classList.remove('pt-top');
    if (!s.el) return;
    if (isBar) {                       // card sits just above the bar
      T.card.style.bottom = (s.el.getBoundingClientRect().height + PAD + 6) + 'px';
      return;
    }
    if (isPinned(s.el)) {              // header items: target is at the top, so card goes to the bottom
      var pr = s.el.getBoundingClientRect();
      T.dockTop = pr.top + pr.height / 2 > vh / 2;
      T.card.classList.toggle('pt-top', T.dockTop);
      return;
    }
    s.el.scrollIntoView({ block: 'center', inline: 'nearest' });
    var r0 = s.el.getBoundingClientRect();
    T.dockTop = (r0.top + r0.height / 2) > vh / 2 + 1;
    for (var attempt = 0; attempt < 2; attempt++) {
      T.card.classList.toggle('pt-top', T.dockTop);
      var cardH = T.card.offsetHeight;
      var freeTop = T.dockTop ? cardH + 8 : headerBottom() + 8;
      var freeBot = T.dockTop ? vh - 8 : vh - cardH - 8;
      var r = s.el.getBoundingClientRect();
      if (r.height + 2 * PAD > freeBot - freeTop && !T.card.classList.contains('pt-compact')) {
        T.card.classList.add('pt-compact');
        cardH = T.card.offsetHeight;
        freeTop = T.dockTop ? cardH + 8 : headerBottom() + 8;
        freeBot = T.dockTop ? vh - 8 : vh - cardH - 8;
      }
      if (r.height + 2 * PAD > freeBot - freeTop) window.scrollBy(0, r.top - PAD - freeTop);
      else window.scrollBy(0, (r.top + r.height / 2) - (freeTop + freeBot) / 2);
      r = s.el.getBoundingClientRect();
      var c = T.card.getBoundingClientRect();
      var visTop = Math.max(r.top, 0), visBot = Math.min(r.bottom, vh);
      if (!rectsOverlap({ left: r.left, right: r.right, top: visTop, bottom: visBot }, c)) return;
      T.dockTop = !T.dockTop;          // page could not scroll far enough: try the other side
    }
  }

  function headerBottom() {
    var h = document.querySelector('.site-header');
    if (!h || getComputedStyle(h).position === 'static') return 0;
    return Math.max(0, h.getBoundingClientRect().bottom);
  }

  function bringIntoView(el) {
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    if (isPinned(el)) return;
    var vh = window.innerHeight, gap = 16, m = 16, hb = headerBottom();
    var r = el.getBoundingClientRect();
    var ch = T.card.offsetHeight;
    var vw = window.innerWidth, cw = T.card.offsetWidth;
    var sideRoom = (vw - r.right >= cw + gap + m) || (r.left >= cw + gap + m);
    if (r.height + 2 * PAD + gap + ch <= vh - hb - 2 * m) {
      // room for target + card below it: put the target just under the header
      if (r.bottom + PAD + gap + ch > vh - m) window.scrollBy(0, r.top - PAD - hb - m);
    } else if (!sideRoom) {
      // too tall: compact card at the bottom, target's top under the header, spotlight clipped above the card
      T.card.classList.add('pt-compact');
      window.scrollBy(0, r.top - PAD - hb - m);
    }
  }

  function decideDock() {
    var s = T.steps[T.i];
    if (!isMobile() || !s.el) return;
    var r = s.el.getBoundingClientRect();
    var cardH = T.card.offsetHeight;
    if (Math.min(r.bottom, window.innerHeight) > window.innerHeight - cardH - 4) {
      T.dockTop = true;
    }
  }

  function place() {
    if (!T) return;
    var s = T.steps[T.i], vw = window.innerWidth, vh = window.innerHeight;
    var mobile = isMobile();
    T.card.classList.toggle('pt-mob', mobile);
    T.card.classList.toggle('pt-top', mobile && T.dockTop);

    var r = null;
    if (s.el) {
      var b = s.el.getBoundingClientRect();
      var x1 = Math.max(b.left - PAD, 4), y1 = Math.max(b.top - PAD, 4);
      var x2 = Math.min(b.right + PAD, vw - 4), y2 = Math.min(b.bottom + PAD, vh - 4);
      if (x2 > x1 && y2 > y1) {
        r = { left: x1, top: y1, width: x2 - x1, height: y2 - y1 };
        T.spot.style.display = 'block';
        T.spot.style.left = r.left + 'px'; T.spot.style.top = r.top + 'px';
        T.spot.style.width = r.width + 'px'; T.spot.style.height = r.height + 'px';
      } else {
        T.spot.style.display = 'none';
      }
    }

    if (mobile) { T.card.style.left = T.card.style.top = ''; var cr = T.card.getBoundingClientRect(); if (!T.dockTop) clipSpot(cr.top); else clipSpotTop(cr.bottom); return; }
    if (!s.el) { T.card.style.left = T.card.style.top = ''; return; }

    var cw = T.card.offsetWidth, ch = T.card.offsetHeight, gap = 16, m = 16;
    var left, topPos;
    if (r) {
      left = Math.min(Math.max(r.left, m), vw - cw - m);
      if (r.top + r.height + gap + ch <= vh - m) topPos = r.top + r.height + gap;
      else if (r.top - gap - ch >= m) topPos = r.top - gap - ch;
      else if (vw - (r.left + r.width) >= cw + gap + m) { left = r.left + r.width + gap; topPos = Math.min(Math.max(r.top, headerBottom() + m), vh - ch - m); }
      else if (r.left >= cw + gap + m) { left = r.left - gap - cw; topPos = Math.min(Math.max(r.top, headerBottom() + m), vh - ch - m); }
      else { left = (vw - cw) / 2; topPos = vh - ch - m; }   // no room anywhere: last resort
    } else {
      left = (vw - cw) / 2; topPos = vh - ch - m;
    }
    T.card.style.left = left + 'px';
    T.card.style.top = topPos + 'px';
    clipSpot(topPos);
  }

  function clipSpot(cardTop) {
    var st = parseFloat(T.spot.style.top), sh = parseFloat(T.spot.style.height);
    if (T.spot.style.display === 'none' || isNaN(st)) return;
    var cr = T.card.getBoundingClientRect(), sl = parseFloat(T.spot.style.left), sw = parseFloat(T.spot.style.width);
    var hOverlap = !(cr.right <= sl || sl + sw <= cr.left);
    if (hOverlap && st + sh > cardTop - 8 && st < cardTop) T.spot.style.height = Math.max(cardTop - 8 - st, 0) + 'px';
  }
  function clipSpotTop(cardBottom) {
    var st = parseFloat(T.spot.style.top), sh = parseFloat(T.spot.style.height);
    if (T.spot.style.display === 'none' || isNaN(st)) return;
    if (st < cardBottom + 8 && st + sh > cardBottom) { T.spot.style.top = (cardBottom + 8) + 'px'; T.spot.style.height = Math.max(st + sh - cardBottom - 8, 0) + 'px'; }
  }

  function schedule() {
    if (!T || T.raf) return;
    T.raf = requestAnimationFrame(function () { if (T) { T.raf = 0; place(); } });
  }

  function onResize() {
    if (!T) return;
    var curId = T.steps[T.i].def.id;
    T.steps = buildSteps(T.defs);
    if (!T.steps.length) { exit(); return; }
    var idx = 0;
    T.steps.forEach(function (s, k) { if (s.def.id === curId) idx = k; });
    T.i = idx;
    render(false);
  }

  function next() { if (T && T.i < T.steps.length - 1) { T.i++; render(true); } }
  function prev() { if (T && T.i > 0) { T.i--; render(true); } }

  function exit() {
    if (!T) return;
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', schedule, true);
    [T.backdrop, T.spot, T.card].forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    T = null;
    document.body.classList.remove('pt-running', 'pt-bar-step');
    var launcher = document.querySelector('.pt-launch');
    if (launcher) { launcher.hidden = false; positionLauncher(); launcher.focus({ preventScroll: true }); }
    if (params.has('tour') && window.history && history.replaceState) {
      history.replaceState(null, '', location.pathname + location.hash);
      params.delete('tour');
    }
  }

  function onKey(e) {
    if (!T) return;
    if (e.key === 'Escape') { e.preventDefault(); exit(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    else if (e.key === 'Tab') {
      var f = Array.prototype.filter.call(T.card.querySelectorAll('button'), function (b) { return !b.disabled; });
      if (!f.length) { e.preventDefault(); return; }
      var first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (e.shiftKey && (a === first || a === T.card)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
      else if (!T.card.contains(a)) { e.preventDefault(); first.focus(); }
    }
  }

  /* ---------- entry points ---------- */

  function startForPage() {
    if (isHome) startTour(HOME);
    else if (isMembership) startTour(REGISTER);
    else location.href = 'index.html?tour=1';
  }

  function positionLauncher() {
    var l = document.querySelector('.pt-launch');
    if (!l) return;
    var bottom = 20;
    if (isMobile()) {
      var bar = document.querySelector('.join-bar');
      bottom = (visible(bar) ? bar.getBoundingClientRect().height : 0) + 12;
    }
    l.style.bottom = bottom + 'px';
  }

  function addLauncher() {
    var l = make('button', 'pt-launch', 'Take the Tour');
    l.type = 'button';
    l.addEventListener('click', startForPage);
    document.body.appendChild(l);
    positionLauncher();
    window.addEventListener('resize', positionLauncher);
    window.addEventListener('load', positionLauncher);
  }

  function addMenuLink() {
    var ul = document.querySelector('.menu ul');
    if (!ul) return;
    var li = make('li', 'pt-menu-item');
    var a = make('a', '', 'Take the tour');
    a.href = '#tour';
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var d = a.closest('details'); if (d) d.open = false;
      startForPage();
    });
    li.appendChild(a); ul.appendChild(li);
  }

  function addBanner() {
    var dismissed = false;
    try { dismissed = localStorage.getItem(KEY) === '1'; } catch (e) {}
    if (dismissed) return;
    var header = document.querySelector('.site-header');
    if (!header) return;
    var bar = make('div', 'pt-banner');
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Preview notice');
    bar.appendChild(make('span', 'pt-banner-text', 'This is a preview of your new website.'));
    bar.appendChild(btn('Take the 1-minute tour', 'pt-banner-go', function () { startTour(HOME); }));
    var close = btn('×', 'pt-banner-x', function () {
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
      if (bar.parentNode) bar.parentNode.removeChild(bar);
      positionLauncher();
    });
    close.setAttribute('aria-label', 'Close this notice');
    close.title = 'Close';
    bar.appendChild(close);
    header.parentNode.insertBefore(bar, header);
  }

  function init() {
    addLauncher();
    addMenuLink();
    if (isHome) addBanner();
    var t = params.get('tour');
    if (t === '1' && isHome) startTour(HOME);
    else if (t === 'register' && isMembership) startTour(REGISTER);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
