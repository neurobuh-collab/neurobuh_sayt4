/* ============================================================
   НейроБухгалтерия — script.js
   1. Мобильное меню
   2. Форма обратной связи
   3. Копейка — плавающий кот
   ============================================================ */

/* ---------- 0. Волна по точечной сетке ---------- */
(function () {
  const cvs = document.querySelector('.hero__wave');
  const hero = document.querySelector('.hero');
  if (!cvs || !hero || !cvs.getContext) return;

  const ctx = cvs.getContext('2d');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- ручки настройки --- */
  const STEP = 30;        // расстояние между точками
  const WAVE = 190;       // длина волны: больше — шире гребни
  const PERIOD = 7000;    // за сколько мс волна проходит одну длину, мс
  const BREATH = 19000;   // «вдох-выдох»: волна то сильнее, то слабее
  const R_MIN = 1.2;      // радиус спокойной точки
  const R_MAX = 3.6;      // радиус точки на гребне
  const A_MIN = 0.10;     // прозрачность спокойной точки
  const A_MAX = 0.55;     // прозрачность на гребне

  const CALM = [0, 138, 170];        // бирюза: точки в покое
  const CREST_IN = [43, 182, 217];   // циан: гребень ближе к центру
  const CREST_OUT = [209, 136, 79];  // терракота: гребень у краёв

  let W = 0, H = 0, dots = [], ox = 0, oy = 0;
  let running = false, raf = null, t0 = 0;

  const inner = hero.querySelector('.hero__inner');
  const PAD = 26;    // отступ от текста, где точки не оживают
  const FADE = 130;  // дистанция, на которой они набирают полную силу
  let safe = null;

  function measureSafe() {
    const h = hero.getBoundingClientRect();
    const i = inner.getBoundingClientRect();
    safe = { l: i.left - h.left - PAD, t: i.top - h.top - PAD,
             r: i.right - h.left + PAD, b: i.bottom - h.top + PAD };
  }

  function falloff(x, y) {
    if (!safe) return 1;
    const dx = Math.max(safe.l - x, 0, x - safe.r);
    const dy = Math.max(safe.t - y, 0, y - safe.b);
    const d = Math.sqrt(dx * dx + dy * dy);
    return d >= FADE ? 1 : d / FADE;
  }

  function build() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = hero.getBoundingClientRect();
    W = Math.ceil(r.width);
    H = Math.ceil(r.height);
    cvs.width = W * dpr;
    cvs.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ox = W / 2;            // волна расходится из-за заголовка
    oy = H * 0.42;
    measureSafe();

    dots = [];
    const offX = ((W % STEP) / 2) + STEP / 2;
    const offY = ((H % STEP) / 2) + STEP / 2;
    const far = Math.sqrt(W * W + H * H) / 2;
    for (let x = offX; x < W; x += STEP) {
      for (let y = offY; y < H; y += STEP) {
        const k = falloff(x, y);
        if (k <= 0.01) continue;                       // под текстом точек нет
        const d = Math.hypot(x - ox, y - oy);
        dots.push({ x: x, y: y, d: d, k: k, m: Math.min(d / far, 1) });
      }
    }
  }

  function mix(a, b, p) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * p),
      Math.round(a[1] + (b[1] - a[1]) * p),
      Math.round(a[2] + (b[2] - a[2]) * p)
    ];
  }

  function draw(ms) {
    ctx.clearRect(0, 0, W, H);
    const phase = (ms / PERIOD) * Math.PI * 2;
    const breath = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin((ms / BREATH) * Math.PI * 2));

    for (let i = 0; i < dots.length; i++) {
      const p = dots[i];
      const w = Math.sin((p.d / WAVE) * Math.PI * 2 - phase);
      let crest = Math.pow((w + 1) / 2, 3);            // узкий гребень вместо плавной синусоиды
      crest *= breath * p.k;

      const rad = R_MIN + (R_MAX - R_MIN) * crest;
      const alpha = A_MIN * p.k + (A_MAX - A_MIN) * crest;
      const hot = mix(CREST_IN, CREST_OUT, p.m);       // ближе к краю гребень теплеет
      const col = mix(CALM, hot, crest);

      ctx.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + alpha + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame(ts) {
    if (!running) return;
    draw(ts - t0);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || still) return;
    running = true;
    if (!t0) t0 = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  build();
  draw(0);

  if (still) return;      // «меньше движения»: остаётся ровное поле точек

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((e) => (e[0].isIntersecting ? start() : stop()), { threshold: 0.01 }).observe(hero);
  } else {
    start();
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  let tid;
  window.addEventListener('resize', () => {
    clearTimeout(tid);
    tid = setTimeout(() => { build(); draw(performance.now() - t0); }, 180);
  });
})();

/* ---------- 1. Мобильное меню ---------- */
(function () {
  const burger = document.querySelector('.burger');
  const nav = document.getElementById('nav');
  if (!burger || !nav) return;

  const close = () => {
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  };

  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });

  nav.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
})();

/* ---------- 1.5. Появление секций при прокрутке ---------- */
(function () {
  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still || !('IntersectionObserver' in window)) return; // без анимации всё просто видно

  // класс ставим из JS: если скрипт не выполнится, контент останется на виду
  document.documentElement.classList.add('js-reveal');

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-visible');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });

  items.forEach((el) => io.observe(el));
})();

/* ---------- 2. Форма ---------- */
(function () {
  const form = document.getElementById('contact-form');
  const done = document.getElementById('form-done');
  const errBox = document.getElementById('form-error');
  if (!form) return;

  const showError = (text) => {
    errBox.textContent = text;
    errBox.hidden = false;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.hidden = true;

    if (!form.reportValidity()) return;

    // Форма ещё не подключена к сервису приёма заявок
    if (form.action.indexOf('%D0%92%D0%90%D0%A8_ID') !== -1 || form.action.indexOf('ВАШ_ID') !== -1) {
      showError('Форма пока не подключена. Напишите, пожалуйста, в Telegram — отвечу быстрее.');
      console.warn('Укажите свой endpoint Formspree в атрибуте action формы #contact-form. Инструкция в README.md');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Отправляю…';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) throw new Error('bad status');
      form.hidden = true;
      done.hidden = false;
    } catch (err) {
      showError('Не получилось отправить. Попробуйте ещё раз или напишите в Telegram.');
      btn.disabled = false;
      btn.textContent = label;
    }
  });
})();

/* ---------- 3. Копейка ---------- */
(function () {
  const root = document.getElementById('kopeyka');
  if (!root) return;
  root.hidden = false;

  const PURR = ['Мур-р…', 'Пуррр…', 'Мрр…', 'Мяу…'];
  const LINES = [
    'Мяу… Бухгалтер нннадо?',
    'Мур… квартал скоро закрывать',
    'Миу… пора оформить вычет по НДФЛ',
    'Мрр… а отчётность сдали?',
    'Мяу… порядок в цифрах — это уютно'
  ];

  const state = {
    open: false,
    satiety: 55,
    affection: 35,
    mood: 'idle',      // idle | happy | eating | playing | sleeping | grumpy
    bubble: null,
    blink: false,
    foodType: 'milk',
    toyType: 'yarn'
  };

  let feedCount = 0;
  let playCount = 0;
  let moodTimer, bubbleTimer;
  let returning = false;

  /* --- хранилище --- */
  try {
    const raw = localStorage.getItem('kopeyka');
    if (raw) {
      const d = JSON.parse(raw);
      if (typeof d.satiety === 'number') state.satiety = d.satiety;
      if (typeof d.affection === 'number') state.affection = d.affection;
      returning = d.last && Date.now() - d.last > 6 * 3600 * 1000;
    }
  } catch (e) {}

  const persist = () => {
    try {
      localStorage.setItem('kopeyka', JSON.stringify({
        satiety: state.satiety, affection: state.affection, last: Date.now()
      }));
    } catch (e) {}
  };

  const isNight = () => {
    const h = new Date().getHours();
    return h >= 23 || h < 7;
  };

  /* --- SVG кота --- */
  function eyesFor(mood, blink, cx1, cx2, y) {
    const sleeping = mood === 'sleeping';
    const happy = blink || mood === 'happy' || mood === 'eating' || mood === 'playing';
    if (sleeping) {
      return `<path d="M${cx1 - 7} ${y} q7 7 14 0" fill="none" stroke="#3a3226" stroke-width="3" stroke-linecap="round"/>
              <path d="M${cx2 - 7} ${y} q7 7 14 0" fill="none" stroke="#3a3226" stroke-width="3" stroke-linecap="round"/>`;
    }
    if (mood === 'grumpy') {
      return `<rect x="${cx1 - 7}" y="${y - 2}" width="14" height="3.6" rx="1.8" fill="#3a3226"/>
              <rect x="${cx2 - 7}" y="${y - 2}" width="14" height="3.6" rx="1.8" fill="#3a3226"/>`;
    }
    if (happy) {
      return `<path d="M${cx1 - 7} ${y + 2} q7 -7 14 0" fill="none" stroke="#3a3226" stroke-width="3" stroke-linecap="round"/>
              <path d="M${cx2 - 7} ${y + 2} q7 -7 14 0" fill="none" stroke="#3a3226" stroke-width="3" stroke-linecap="round"/>`;
    }
    return `<ellipse cx="${cx1}" cy="${y}" rx="5.4" ry="7.4" fill="#2e2820"/><circle cx="${cx1 - 2}" cy="${y - 3}" r="1.7" fill="#fff"/>
            <ellipse cx="${cx2}" cy="${y}" rx="5.4" ry="7.4" fill="#2e2820"/><circle cx="${cx2 - 2}" cy="${y - 3}" r="1.7" fill="#fff"/>`;
  }

  const zzz = (x, y) =>
    `<g opacity="0.85"><text x="${x}" y="${y}" font-size="15" font-weight="700" fill="#C9A46A" font-family="Inter,sans-serif">Z</text>` +
    `<text x="${x + 11}" y="${y - 10}" font-size="10" font-weight="700" fill="#D8BE93" font-family="Inter,sans-serif">z</text></g>`;

  function catSvg() {
    const { mood, blink } = state;
    const eyes = eyesFor(mood, blink, 63, 87, 55);
    const tongue = mood === 'eating' ? '<ellipse cx="75" cy="76" rx="5" ry="4" fill="#E38F86"/>' : '';
    const sleepZ = mood === 'sleeping' ? zzz(108, 30) : '';
    const headAnim = mood === 'eating' ? 'koEatHead .75s ease-in-out infinite'
      : mood === 'playing' ? 'koHeadWiggle .65s ease-in-out infinite' : 'none';

    const running = mood === 'playing' && state.toyType === 'mouse';

    if (running) {
      const leg = (anim, delay) =>
        `transform-box:fill-box; transform-origin:50% 8%; animation:${anim} .8s ease-in-out infinite${delay ? '; animation-delay:' + delay : ''}`;
      const mouse = `<g style="animation:koMouseFlee 8s linear both">
        <path d="M53 156 q16 3 18 -9" fill="none" stroke="#AEB6BD" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M14 158 Q16 146 32 146 Q52 146 53 158 Q52 166 34 166 Q18 166 14 158 Z" fill="#AEB6BD"/>
        <circle cx="26" cy="143" r="6.5" fill="#C7CDD3"/><circle cx="26" cy="143" r="3.4" fill="#E7C7C7"/>
        <circle cx="19" cy="153" r="1.5" fill="#333"/><circle cx="13" cy="157" r="1.8" fill="#E38F86"/>
        <path d="M16 159 q-5 -1 -8 1 M16 161 q-4 2 -7 4" stroke="#C6CCD1" stroke-width="1.2" fill="none" stroke-linecap="round"/>
        <line x1="44" y1="149" x2="44" y2="140" stroke="#8A9298" stroke-width="1.8"/>
        <circle cx="44" cy="136.5" r="4" fill="none" stroke="#8A9298" stroke-width="1.8"/>
        <line x1="40" y1="136.5" x2="48" y2="136.5" stroke="#8A9298" stroke-width="1.8"/>
        <line x1="44" y1="132.5" x2="44" y2="140.5" stroke="#8A9298" stroke-width="1.8"/></g>`;
      const cat = `<g style="transform-box:fill-box; transform-origin:50% 50%; animation:koRunBob .8s ease-in-out infinite">
        <path d="M136 126 C152 118 154 100 142 100 C132 100 134 112 142 113" fill="none" stroke="#C9A46A" stroke-width="11" stroke-linecap="round" style="transform-box:fill-box; transform-origin:10% 90%; animation:koTail 1.6s ease-in-out infinite"/>
        <g stroke="#C9A46A" stroke-width="12" stroke-linecap="round" fill="none">
          <path d="M124 138 v20" style="${leg('koLegBack', '')}"/>
          <path d="M110 140 v20" style="${leg('koLegBack', '-.2s')}"/>
          <path d="M92 140 v20" style="${leg('koLegFront', '')}"/>
          <path d="M78 138 v20" style="${leg('koLegFront', '-.2s')}"/>
        </g>
        <ellipse cx="103" cy="130" rx="40" ry="19" fill="#C9A46A"/>
        <ellipse cx="103" cy="136" rx="30" ry="11" fill="#E7C79A" opacity="0.75"/>
        <path d="M56 106 L48 84 L70 96 Z" fill="#C9A46A"/><path d="M80 104 L86 84 L66 94 Z" fill="#C9A46A"/>
        <path d="M58 103 L53 89 L67 97 Z" fill="#E7C79A"/><path d="M78 101 L81 89 L68 95 Z" fill="#E7C79A"/>
        <circle cx="66" cy="118" r="22" fill="#C9A46A"/>
        <path d="M50 121 q-4 -4 -8 -2 M50 125 q-4 0 -7 3" stroke="#cbb78f" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <path d="M52 116 q5 -5 10 0" fill="none" stroke="#3a3226" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M68 116 q5 -5 10 0" fill="none" stroke="#3a3226" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M48 126 L54 126 L51 130 Z" fill="#B76E5A"/></g>`;
      return `<svg viewBox="0 0 150 178" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Копейка гоняется за мышкой">${mouse}${cat}</svg>`;
    }

    const tail = '<path d="M108 142 C140 140 142 100 118 98 C102 97 104 118 118 118" fill="none" stroke="#C9A46A" stroke-width="16" stroke-linecap="round" style="transform-box:fill-box; transform-origin:12% 92%; animation:koTail 3.2s ease-in-out infinite"/>';
    const body = '<path d="M75 74 C40 74 33 120 40 146 C45 164 62 170 75 170 C88 170 105 164 110 146 C117 120 110 74 75 74 Z" fill="#C9A46A"/>';
    const belly = '<ellipse cx="75" cy="130" rx="26" ry="34" fill="#E7C79A" opacity="0.85"/>';

    const kicking = mood === 'playing' && state.toyType === 'yarn';
    const rightLeg = '<rect x="78" y="134" width="15" height="32" rx="7" fill="#C9A46A"/><ellipse cx="86" cy="166" rx="11" ry="7" fill="#D8BE93"/>';
    const legs = '<rect x="57" y="134" width="15" height="32" rx="7" fill="#C9A46A"/>' +
      (kicking
        ? `<g style="transform-box:fill-box; transform-origin:50% 6%; animation:koPawKick 2.6s ease-in-out">${rightLeg}</g>`
        : rightLeg);
    const paws = '<ellipse cx="64" cy="166" rx="11" ry="7" fill="#D8BE93"/>';

    let food = '';
    if (mood === 'eating') {
      food = state.foodType === 'fish'
        ? '<g><ellipse cx="75" cy="110" rx="31" ry="7.5" fill="#E4EBED"/><ellipse cx="75" cy="108" rx="25" ry="5" fill="#F4F8FA"/><ellipse cx="73" cy="105" rx="16" ry="6" fill="#C3D2DB"/><path d="M89 105 l10 -5 v10 z" fill="#C3D2DB"/><path d="M63 105 q5 -4 10 0 q-5 4 -10 0" fill="#A9BCC7"/><circle cx="64" cy="103" r="1.5" fill="#333"/><path d="M69 102 q7 3 14 0 M69 108 q7 -3 14 0" stroke="#9BB0BD" stroke-width="1" fill="none"/></g>'
        : '<g><ellipse cx="75" cy="104" rx="27" ry="7" fill="#3BBADB"/><path d="M48 104 A27 7 0 0 0 102 104 L96 117 A22 6 0 0 1 54 117 Z" fill="#018DB0"/><ellipse cx="75" cy="103" rx="22" ry="5" fill="#F7FCFE"/><path d="M62 100 q13 -6 26 0" fill="none" stroke="#DCE6EC" stroke-width="2" stroke-linecap="round"/></g>';
    }

    let toy = '';
    if (mood === 'playing') {
      toy = state.toyType === 'mouse'
        ? '<g style="transform-box:fill-box; transform-origin:50% 50%; animation:koScoot 1.1s ease-in-out infinite"><path d="M99 155 q19 2 21 -9" fill="none" stroke="#AEB6BD" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="88" cy="154" rx="17" ry="11" fill="#AEB6BD"/><path d="M71 154 q-16 -1 -18 4 q2 6 18 5 z" fill="#B7BEC4"/><circle cx="82" cy="145" r="6" fill="#C7CDD3"/><circle cx="82" cy="145" r="3" fill="#E7C7C7"/><circle cx="61" cy="153" r="1.6" fill="#333"/><circle cx="53" cy="157" r="1.8" fill="#E38F86"/></g>'
        : '<g style="transform-box:fill-box; transform-origin:50% 50%; animation:koKick 2.6s ease-in-out"><circle cx="112" cy="152" r="14" fill="#D1884F"/><path d="M100 149 a14 14 0 0 1 24 -4 M101 156 a14 14 0 0 0 22 2 M104 143 a14 14 0 0 1 16 16" fill="none" stroke="#B5713C" stroke-width="1.6" stroke-linecap="round"/></g>';
    }

    const head = `<g style="transform-box:fill-box; transform-origin:50% 90%; animation:${headAnim}">
      <path d="M50 42 L44 10 L74 32 Z" fill="#C9A46A"/><path d="M100 42 L106 10 L76 32 Z" fill="#C9A46A"/>
      <path d="M54 38 L50 19 L69 32 Z" fill="#E7C79A"/><path d="M96 38 L100 19 L81 32 Z" fill="#E7C79A"/>
      <ellipse cx="75" cy="56" rx="35" ry="31" fill="#C9A46A"/>
      <path d="M75 27 v13" stroke="#B08A50" stroke-width="4" stroke-linecap="round"/>
      <path d="M63 30 q3 8 1 12" stroke="#B08A50" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <path d="M87 30 q-3 8 -1 12" stroke="#B08A50" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <ellipse cx="75" cy="66" rx="24" ry="15" fill="#E7C79A" opacity="0.5"/>
      ${eyes}
      <path d="M70 64 L80 64 L75 70 Z" fill="#B76E5A"/>
      <path d="M75 70 q-6 6 -12 3" fill="none" stroke="#8a6a3f" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M75 70 q6 6 12 3" fill="none" stroke="#8a6a3f" stroke-width="2.4" stroke-linecap="round"/>
      ${tongue}
      <g stroke="#cbb78f" stroke-width="1.7" stroke-linecap="round"><path d="M55 62 L30 58"/><path d="M55 67 L31 70"/><path d="M95 62 L120 58"/><path d="M95 67 L119 70"/></g>
      ${sleepZ}
    </g>`;

    return `<svg viewBox="0 0 150 178" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Кот Копейка">${tail}${body}${belly}${legs}${paws}${food}${toy}${head}</svg>`;
  }

  function faceSvg() {
    const eyes = eyesFor(state.mood, state.blink, 45, 75, 62);
    const sleepZ = state.mood === 'sleeping' ? zzz(92, 34) : '';
    return `<svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Кот Копейка">
      <path d="M30 42 L24 15 L54 34 Z" fill="#C9A46A"/><path d="M90 42 L96 15 L66 34 Z" fill="#C9A46A"/>
      <path d="M33 38 L30 22 L47 33 Z" fill="#E7C79A"/><path d="M87 38 L90 22 L73 33 Z" fill="#E7C79A"/>
      <ellipse cx="60" cy="66" rx="41" ry="37" fill="#C9A46A"/>
      <path d="M60 33 v13" stroke="#B08A50" stroke-width="4" stroke-linecap="round"/>
      <path d="M50 35 q3 7 1 12" stroke="#B08A50" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <path d="M70 35 q-3 7 -1 12" stroke="#B08A50" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <ellipse cx="60" cy="75" rx="25" ry="16" fill="#E7C79A" opacity="0.5"/>
      ${eyes}
      <path d="M55 74 L65 74 L60 80 Z" fill="#B76E5A"/>
      <path d="M60 80 q-6 6 -12 3" fill="none" stroke="#8a6a3f" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M60 80 q6 6 12 3" fill="none" stroke="#8a6a3f" stroke-width="2.4" stroke-linecap="round"/>
      <g stroke="#cbb78f" stroke-width="1.8" stroke-linecap="round"><path d="M40 72 L14 68"/><path d="M40 77 L15 80"/><path d="M80 72 L106 68"/><path d="M80 77 L105 80"/></g>
      ${sleepZ}
    </svg>`;
  }

  /* --- DOM --- */
  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'ko-bubble';
  bubbleEl.hidden = true;

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'ko-toggle';
  toggleBtn.type = 'button';
  toggleBtn.setAttribute('aria-label', 'Открыть Копейку');
  const faceHolder = document.createElement('div');
  faceHolder.style.width = '100%';
  faceHolder.style.height = '100%';
  faceHolder.style.transformOrigin = '50% 70%';
  toggleBtn.appendChild(faceHolder);

  const panel = document.createElement('div');
  panel.className = 'ko-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <button class="ko-close" type="button" aria-label="Свернуть Копейку">×</button>
    <button class="ko-stage" type="button" aria-label="Погладить Копейку"><div class="ko-anim" style="width:100%;height:100%;transform-origin:50% 80%"></div></button>
    <p class="ko-hint">Погладьте Копейку</p>
    <div class="ko-bars">
      <div class="ko-bar"><span class="ko-bar__name">Сытость</span><span class="ko-bar__track"><span class="ko-bar__fill" data-fill="satiety" style="background:#C9A46A"></span></span></div>
      <div class="ko-bar"><span class="ko-bar__name">Ласка</span><span class="ko-bar__track"><span class="ko-bar__fill" data-fill="affection" style="background:#D1884F"></span></span></div>
    </div>
    <div class="ko-actions">
      <button class="ko-pill" type="button" data-act="feed">
        <svg viewBox="0 0 24 24" fill="#C9A46A" aria-hidden="true"><path d="M2 12c4-6 12-6 15 0-3 6-11 6-15 0z"/><path d="M17 12l5-3.5v7z"/><circle cx="7" cy="10.5" r="1.2" fill="#fff"/></svg>Покормить</button>
      <button class="ko-pill" type="button" data-act="play">
        <svg viewBox="0 0 24 24" fill="none" stroke="#C9A46A" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M5 9c4 2 9 4 13 6M8 4.5c3.5 3 6.5 6 9 9.5M4.5 13c3 2 5 4 7 6"/></svg>Поиграть</button>
    </div>`;

  root.append(bubbleEl, toggleBtn, panel);

  const bodyHolder = panel.querySelector('.ko-anim');
  const stage = panel.querySelector('.ko-stage');

  /* --- отрисовка --- */
  function paint() {
    toggleBtn.hidden = state.open;
    panel.hidden = !state.open;

    if (state.open) {
      bodyHolder.innerHTML = catSvg();
      bodyHolder.style.animation =
        state.mood === 'sleeping' ? 'koBreathe 3.2s ease-in-out infinite'
        : state.mood === 'happy' ? 'koBob .5s ease-in-out'
        : state.mood === 'idle' ? 'koBob 3.8s ease-in-out infinite'
        : (state.mood === 'playing' && state.toyType === 'mouse') ? 'koChase 8s ease-in-out'
        : 'none';
      panel.querySelector('[data-fill="satiety"]').style.width = state.satiety + '%';
      panel.querySelector('[data-fill="affection"]').style.width = state.affection + '%';
    } else {
      faceHolder.innerHTML = faceSvg();
      faceHolder.style.animation =
        state.mood === 'sleeping' ? 'koBreathe 3.2s ease-in-out infinite' : 'koBob 3.8s ease-in-out infinite';
    }

    if (state.bubble) {
      bubbleEl.textContent = state.bubble;
      bubbleEl.hidden = false;
    } else {
      bubbleEl.hidden = true;
    }
  }

  /* --- поведение --- */
  function say(text, ms) {
    clearTimeout(bubbleTimer);
    state.bubble = text;
    paint();
    bubbleTimer = setTimeout(() => { state.bubble = null; paint(); }, ms || 3500);
  }

  function react(mood, text, ms) {
    clearTimeout(moodTimer);
    state.mood = mood;
    say(text, ms || 2200);
    moodTimer = setTimeout(() => {
      state.mood = isNight() ? 'sleeping' : 'idle';
      paint();
    }, ms || 1800);
    paint();
  }

  function grumble() {
    clearTimeout(moodTimer);
    state.mood = 'grumpy';
    say('Тс-с, дайте поспать…', 2000);
    moodTimer = setTimeout(() => { state.mood = 'sleeping'; paint(); }, 2000);
    paint();
  }

  function applyNight() {
    if (isNight() && state.mood !== 'sleeping' && state.mood !== 'grumpy') {
      state.mood = 'sleeping';
      paint();
    } else if (!isNight() && state.mood === 'sleeping') {
      state.mood = 'idle';
      paint();
    }
  }

  const pet = () => {
    if (isNight()) return grumble();
    state.affection = Math.min(100, state.affection + 8);
    persist();
    react('happy', PURR[Math.floor(Math.random() * PURR.length)], 1600);
  };

  const feed = () => {
    if (isNight()) return grumble();
    feedCount += 1;
    state.foodType = feedCount % 2 === 1 ? 'milk' : 'fish';
    state.satiety = Math.min(100, state.satiety + 16);
    persist();
    react('eating', state.foodType === 'milk' ? 'Молоко! Ням…' : 'Рыбка! Ням-ням…', 1700);
  };

  const play = () => {
    if (isNight()) return grumble();
    playCount += 1;
    state.toyType = playCount % 2 === 1 ? 'yarn' : 'mouse';
    state.affection = Math.min(100, state.affection + 6);
    persist();
    react('playing', state.toyType === 'yarn' ? 'Мяу! Лови клубок!' : 'Мышка! Держись!', state.toyType === 'mouse' ? 8000 : 2600);
  };

  toggleBtn.addEventListener('click', () => { state.open = true; paint(); });
  panel.querySelector('.ko-close').addEventListener('click', () => { state.open = false; paint(); });
  stage.addEventListener('click', pet);
  panel.querySelectorAll('.ko-pill').forEach((b) => {
    b.addEventListener('click', () => (b.dataset.act === 'feed' ? feed() : play()));
  });

  /* --- таймеры --- */
  applyNight();
  paint();

  if (returning) {
    setTimeout(() => { if (state.mood === 'idle') say('Мур… соскучилась по вам', 5000); }, 1400);
  }

  setInterval(applyNight, 60 * 1000);

  setInterval(() => {
    if (state.mood !== 'idle') return;
    state.blink = true;
    paint();
    setTimeout(() => { state.blink = false; paint(); }, 160);
  }, 5200);

  // Болтовня: первая фраза через 10 секунд после загрузки, дальше каждые 30
  let lastLine = null;
  const chat = () => {
    if (state.mood !== 'idle') return;              // молчит, если ест, играет или спит
    const pool = Math.random() < 0.5 ? PURR : LINES;
    let line = pool[Math.floor(Math.random() * pool.length)];
    if (line === lastLine) {                        // не повторяем реплику дважды подряд
      line = pool[(pool.indexOf(line) + 1) % pool.length];
    }
    lastLine = line;
    say(line, 5000);
  };

  setTimeout(() => {
    chat();
    setInterval(chat, 95 * 1000);   // шаг между фразами
  }, 10 * 1000);                    // задержка первой фразы
})();
