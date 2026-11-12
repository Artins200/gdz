(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => s.toLowerCase().replace(/ё/g, 'е');

  let DB = null;
  const SOL = window.GDZ_SOLUTIONS || {};
  let explain = true;
  try { explain = localStorage.getItem('gdz-explain') !== '0'; } catch { /* пусто */ }
  // 5/6 и 1_2/5 → дроби
  const math = (s) => esc(s).replace(/(\d+)_(\d+)\/(\d+)|(\d+)\/(\d+)/g, (m, w, a, b, c, d) =>
    `<span class="fr">${w ? `<i>${w}</i>` : ''}<span><b>${a || c}</b><b>${b || d}</b></span></span>`);

  function renderBook(r) {
    const b = DB.books[r.id];
    const sol = SOL[b.u];
    const tasks = sol.sections.flatMap((sec) => sec.tasks.map((t) => ({ ...t, sec })));
    const idx = tasks.findIndex((t) => t.n === r.n);
    const toggle = `<label class="switch"><input type="checkbox" id="explain"${explain ? ' checked' : ''}><span></span>Режим объяснения</label>`;
    let html = `<p class="crumbs"><a href="#/class/${b.cl[0]}">← Каталог</a>${idx >= 0 ? ` · <a href="#/book/${b.id}">Все номера</a>` : ''}</p>
      <div class="book-head"><h1>${esc(sol.title)}</h1>${toggle}</div>`;
    if (idx < 0) {
      html += `<p class="muted">Решено ${tasks.length} из ${sol.total} заданий: № ${tasks[0].n}–${tasks[tasks.length - 1].n}. Остальные добавляются по частям.
        <a href="${esc(DB.source + b.u)}" target="_blank" rel="noopener">Страница на reshak.ru</a></p>`;
      html += sol.sections.map((sec) => `<h2>${esc(sec.title)}</h2>
        ${explain ? `<details class="theory"><summary>Что нужно знать</summary><ul>${sec.theory.map((x) => `<li>${math(x)}</li>`).join('')}</ul></details>` : ''}
        <div class="nums">${sec.tasks.map((t) => `<a href="#/book/${b.id}/${t.n}" title="${esc(t.topic)}">${t.n}</a>`).join('')}</div>`).join('');
    } else {
      const t = tasks[idx], prev = tasks[idx - 1], next = tasks[idx + 1];
      html += `<article class="task">
        <h2>№ ${t.n}</h2><p class="muted">${esc(t.sec.title)} · ${esc(t.topic)}</p>
        ${explain ? `<div class="why"><b>Как рассуждать.</b> ${math(t.why)}</div>` : ''}
        <ol class="parts">${t.items.map(([l, a, e]) => `<li>${l ? `<span class="l">${math(l)}${/^[а-я]$/.test(l) ? ')' : ':'}</span>` : ''}
          <div><div class="ans">${math(a)}</div>${explain ? `<div class="ex">${math(e)}</div>` : ''}</div></li>`).join('')}</ol>
        ${explain ? `<details class="theory"><summary>Правила по теме</summary><ul>${t.sec.theory.map((x) => `<li>${math(x)}</li>`).join('')}</ul></details>` : ''}
        <nav class="pn">${prev ? `<a class="btn" href="#/book/${b.id}/${prev.n}">← № ${prev.n}</a>` : '<span></span>'}
          ${next ? `<a class="btn primary" href="#/book/${b.id}/${next.n}">№ ${next.n} →</a>` : ''}</nav>
      </article>`;
    }
    $('book').innerHTML = html;
    $('explain').addEventListener('change', (e) => {
      explain = e.target.checked;
      try { localStorage.setItem('gdz-explain', explain ? '1' : '0'); } catch { /* пусто */ }
      render();
    });
    document.title = `${idx >= 0 ? `№ ${r.n} — ` : ''}${sol.title}`;
  }

  let fav = new Set();
  try { fav = new Set(JSON.parse(localStorage.getItem('gdz-fav') || '[]')); } catch { /* пусто */ }
  const saveFav = () => { try { localStorage.setItem('gdz-fav', JSON.stringify([...fav])); } catch { /* пусто */ } };

  // Маршруты: #/ | #/class/9 | #/class/9/algebra | #/fav | #/search/запрос
  function route() {
    const p = decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/');
    if (p[0] === 'fav') return { view: 'fav' };
    if (p[0] === 'book' && DB.books[p[1]] && SOL[DB.books[p[1]].u]) return { view: 'book', id: +p[1], n: parseInt(p[2], 10) || null };
    if (p[0] === 'search' && p[1]) return { view: 'search', q: p.slice(1).join('/') };
    let cl = parseInt(p[1], 10);
    if (p[0] !== 'class' || !DB.classes.includes(cl)) {
      cl = parseInt(localStorage.getItem('gdz-class'), 10);
      if (!DB.classes.includes(cl)) cl = DB.classes[0];
    }
    const subj = DB.subjects[p[2]] ? p[2] : null;
    return { view: 'class', cl, subj };
  }

  const hue = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };

  function card(b, showClass) {
    const subj = DB.subjects[b.s];
    const cls = b.cl.length > 1 ? `${Math.min(...b.cl)}–${Math.max(...b.cl)}` : b.cl[0];
    const h = hue(b.t + b.s);
    const local = !!SOL[b.u];
    return `<a class="card" href="${local ? `#/book/${b.id}` : esc(DB.source + b.u)}"${local ? '' : ' target="_blank" rel="noopener"'} data-id="${b.id}">
      <div class="cover" style="background:linear-gradient(160deg,hsl(${h} 55% 45%),hsl(${(h + 40) % 360} 55% 32%))">
        ${esc(b.t.slice(0, 1))}
        <img src="${esc(DB.coverBase + b.c)}.jpg" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">
        <div class="badges">${b.y ? `<span class="badge">уч. ${esc(b.y)}</span>` : ''}${b.ai ? '<span class="badge ai">✦ ИИ</span>' : ''}${local ? '<span class="badge loc">Решения офлайн</span>' : ''}</div>
        <button class="fav${fav.has(b.u) ? ' on' : ''}" type="button" aria-label="В избранное" title="В избранное">★</button>
      </div>
      <div class="meta">
        <span class="t">${esc(b.t)}</span>
        <span class="a">${esc(b.a)}</span>
        <span class="s">${esc(subj)}${showClass ? ` · ${cls} класс` : ''}</span>
      </div>
    </a>`;
  }

  function render() {
    const r = route();
    const q = $('q');
    $('book').hidden = r.view !== 'book';
    $('catalogView').hidden = r.view === 'book';
    if (r.view === 'book') {
      $('classes').innerHTML = DB.classes.map((c) => `<a href="#/class/${c}">${c}</a>`).join('') + '<a href="#/fav">★ Избранное</a>';
      return renderBook(r);
    }
    let list = [], title = '', showClass = false;

    $('classes').innerHTML =
      DB.classes.map((c) => `<a href="#/class/${c}" class="${r.view === 'class' && r.cl === c ? 'on' : ''}">${c}</a>`).join('') +
      `<a href="#/fav" class="${r.view === 'fav' ? 'on' : ''}">★ Избранное${fav.size ? ` ${fav.size}` : ''}</a>`;

    if (r.view === 'class') {
      try { localStorage.setItem('gdz-class', r.cl); } catch { /* пусто */ }
      const all = DB.byClass[r.cl].map((i) => DB.books[i]);
      const counts = {};
      all.forEach((b) => { counts[b.s] = (counts[b.s] || 0) + 1; });
      $('subjects').innerHTML =
        `<a href="#/class/${r.cl}" class="${r.subj ? '' : 'on'}">Все<small>${all.length}</small></a>` +
        Object.keys(DB.subjects).filter((s) => counts[s]).map((s) =>
          `<a href="#/class/${r.cl}/${s}" class="${r.subj === s ? 'on' : ''}">${esc(DB.subjects[s])}<small>${counts[s]}</small></a>`).join('');
      list = r.subj ? all.filter((b) => b.s === r.subj) : all;
      title = `ГДЗ ${r.cl} класс${r.subj ? ` — ${DB.subjects[r.subj]}` : ''}`;
      if (document.activeElement !== q) q.value = '';
    } else {
      $('subjects').innerHTML = '';
      showClass = true;
      if (r.view === 'fav') {
        list = DB.books.filter((b) => fav.has(b.u));
        title = 'Избранное';
      } else {
        const words = norm(r.q).split(/\s+/).filter(Boolean);
        list = DB.books.filter((b) => words.every((w) => b._k.includes(w)));
        title = `Поиск: «${r.q}»`;
        if (document.activeElement !== q) q.value = r.q;
      }
    }

    $('title').textContent = title;
    $('count').textContent = list.length ? `Решебников: ${list.length}` : '';
    $('grid').innerHTML = list.map((b) => card(b, showClass)).join('');
    $('empty').hidden = list.length > 0;
    $('empty').textContent = r.view === 'fav'
      ? 'В избранном пока пусто. Нажмите ★ на обложке, чтобы добавить учебник.'
      : 'Ничего не найдено. Попробуйте изменить запрос или выбрать другой класс.';
    document.title = `${title} — ГДЗ Каталог`;
  }

  async function init() {
    DB = window.GDZ_CATALOG || await (await fetch('data/catalog.json')).json();
    DB.books.forEach((b) => {
      b._k = norm(`${b.t} ${b.a} ${DB.subjects[b.s]} ${b.cl.map((c) => `${c} класс`).join(' ')} ${b.u}`);
    });
    $('total').textContent = DB.books.length;
    $('updated').textContent = DB.updated.split('-').reverse().join('.');

    window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

    let timer;
    $('q').addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const v = e.target.value.trim();
        const target = v ? `#/search/${encodeURIComponent(v)}` : '#/';
        if (location.hash.startsWith('#/search/') || !v) history.replaceState(null, '', target), render();
        else location.hash = target;
      }, 150);
    });

    $('grid').addEventListener('click', (e) => {
      const btn = e.target.closest('.fav');
      if (!btn) return;
      e.preventDefault();
      const b = DB.books[btn.closest('.card').dataset.id];
      fav.has(b.u) ? fav.delete(b.u) : fav.add(b.u);
      saveFav();
      render();
    });

    render();
  }

  // Сеть
  const net = () => { $('offline').hidden = navigator.onLine; };
  window.addEventListener('online', net);
  window.addEventListener('offline', net);
  net();

  // Установка PWA
  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; $('install').hidden = false; });
  $('install').addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    $('install').hidden = true;
  });
  window.addEventListener('appinstalled', () => { $('install').hidden = true; });
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone) $('iosHint').hidden = false;

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  init().catch((err) => {
    $('title').textContent = 'Не удалось загрузить каталог';
    $('count').textContent = String(err);
  });
})();
