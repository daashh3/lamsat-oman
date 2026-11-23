import { CHAPTERS, NARRATION } from '../app/Config.js';
export class UIManager {
  constructor(onAction) {
    this.onAction = onAction;
    this.subtitle = true;
    this.previous = '';
    document.querySelector('#app').innerHTML = `
      <div id="viewport" aria-label="معرض تراث عُمان ثلاثي الأبعاد"></div>
      <div id="overlay">
        <header class="topbar"><a class="brand" href="#" aria-label="لمسة عمان"><span class="brand-mark">♜</span><span>لمسة عُمان<small>LAMSAT OMAN</small></span></a><section class="audio-controls" aria-label="التحكم بالصوت"><button data-action="effects" aria-pressed="false">◖ كتم المؤثرات</button><span id="audio-feedback" role="status">يبدأ الصوت بعد تفاعلك الأول</span></section><div class="top-meta"><button class="navigation-mode" data-action="navigation" aria-pressed="true">↔ وضع التدوير ٣٦٠°</button><button class="icon-btn" data-action="settings" title="الإعدادات" aria-label="الإعدادات">⚙</button></div></header>
        <main id="welcome">
          <div class="welcome-copy"><div class="eyebrow"><i></i> تراثٌ تلمسه. حكايةٌ تعيشها.</div><h1>لمسة <span>عُمان</span><em>من أثر اليد،<br>تُولد الحكاية.</em></h1><p class="lead">رحلة تفاعلية في عبق التراث العُماني</p><p class="intro">افتح أبواب الماضي بيديك. أبحر، شكّل الطين، وتذوّق معنى الضيافة في رحلة تحتفي بروح عُمان.</p><div class="welcome-actions"><button class="primary" data-action="start">ابدأ الرحلة <span>←</span></button><button class="text-btn" data-action="help">طريقة اللعب <span>↗</span></button></div><button class="xr-entry" data-action="xr" disabled>◈ <span id="xr-label">جارٍ فحص دعم الواقع المختلط…</span></button><div class="status-row"><span><i id="xr-dot"></i><span id="xr-status">فحص المتصفح</span></span><span>◌ <span id="hand-status">الفأرة واللمس متاحان</span></span><span id="audio-status">♫ الصوت اختياري</span></div></div>
          <div class="exhibit-caption"><span class="tiny-label">01 / THE BEGINNING</span><h2>كل حكاية تبدأ من باب</h2><span>بوابة عُمانية محفورة · نموذج تفاعلي ثلاثي الأبعاد</span></div>
          <div class="welcome-footer"><span>٧ محطات <b>·</b> ٥ لمسات <b>·</b> حكاية واحدة</span><span class="desktop-tip">حرّك بالزر الأيمن لاستكشاف المجسم ↔</span><span>الواقع الافتراضي والمختلط <small>QUEST 3 / 3S</small></span></div>
        </main>
        <section id="experience" hidden>
          <div class="chapter-panel"><span id="chapter-tag" class="eyebrow"></span><h1 id="chapter-title"></h1><span id="chapter-en" class="tiny-label"></span><p id="chapter-detail"></p><div class="instruction"><span class="instruction-icon">☝</span><p id="instruction" role="status" aria-live="polite"></p></div><div class="progress-track"><div id="activity-progress"></div></div><div class="progress-caption"><span id="stage-label"></span><span id="activity-percent">0%</span></div><div id="ingredients"></div><div id="shape-controls" hidden><label>ارتفاع الفخار <input id="shape-height" type="range" min="0.12" max="0.36" step="0.005" value="0.14"></label><label>قطر الفخار <input id="shape-width" type="range" min="0.11" max="0.30" step="0.002" value="0.27"></label></div><details id="assist"><summary>أدوات المساعدة والتحكم</summary><p id="assist-help"></p><div id="assist-actions"></div><label id="tilt-label" hidden>إمالة الدلة <input id="coffee-tilt" type="range" min="0" max="90" value="0"></label></details></div>
          <div class="collection"><span>لمسات التراث</span><div id="symbols">${['♧', '△', '♜', '✺', '♧'].map((s, i) => `<span class="symbol" data-symbol="${i}">${s}</span>`).join('')}</div><strong id="count">0 / 5</strong></div>
          <div class="bottom-hud"><p id="subtitle"></p><div class="toolbar"><button data-action="recenter">⌖ إعادة التمركز</button><button data-action="pause" id="pause-btn">Ⅱ إيقاف مؤقت</button><button data-action="restart">↻ إعادة المحطة</button><button data-action="exit">خروج ↗</button></div></div>
          <div id="paused" hidden><div><span>Ⅱ</span><h2>لحظة تأمل</h2><p>رحلتك محفوظة هنا.</p><button class="primary" data-action="pause">متابعة الرحلة</button></div></div>
        </section>
        <div id="vr-entry" aria-label="الدخول إلى الواقع الافتراضي"></div>
        <dialog id="modal"><button class="close" data-action="close" aria-label="إغلاق">×</button><div id="modal-content"></div></dialog>
        <div id="toast" role="status"></div><pre id="debug" hidden></pre>
      </div>`;
    this.root = document.querySelector('#overlay');
    document.querySelector('#assist').insertAdjacentHTML(
      'beforebegin',
      `
      <section id="engraving-controls" hidden aria-label="قوالب نقش الباب"><small>اختر قالباً ثم تتبّع المسار بإصبعك أو المؤشر</small><div class="challenge-actions">${[
        ['star', '☆ نجمة'],
        ['square', '□ مربع'],
        ['random', '◇ شكل عشوائي'],
      ]
        .map(
          ([id, label]) =>
            `<button data-action="shape-slot-${id}" aria-pressed="false">${label}</button>`,
        )
        .join('')}</div></section>
      <section id="coffee-meter" hidden aria-label="تحدّي الفنجان المثالي">
        <div class="fill-caption"><strong>مستوى الفنجان</strong><output id="fill-value">0%</output></div>
        <div id="fill-track" role="progressbar" aria-label="مستوى القهوة" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="fill-level"></span><span id="perfect-zone"></span></div>
        <small>النطاق المثالي: ٦٠٪ إلى ٨٠٪</small>
        <div class="challenge-actions"><button data-action="hold-cup">✋ حمل الفنجان</button><button data-action="pour-coffee">☕ ابدأ السكب</button><button data-action="stop-pour">■ أوقف السكب</button></div>
        <span id="pour-result" role="status"></span>
      </section>
`,
    );
    this.root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (b) {
        e.preventDefault();
        this.action(b.dataset.action);
      }
    });
    this.root.addEventListener('input', (e) => {
      if (e.target.id.startsWith('shape-'))
        this.onAction('shape', {
          height: +document.querySelector('#shape-height').value,
          width: +document.querySelector('#shape-width').value,
        });
      if (e.target.id === 'coffee-tilt')
        this.onAction('tilt', (+e.target.value * Math.PI) / 180);
      if (e.target.id === 'volume') this.onAction('volume', +e.target.value);
    });
    this.root.addEventListener('change', (e) => {
      if (e.target.id === 'reduce-motion')
        this.onAction('motion', e.target.checked);
      if (e.target.id === 'seated') this.onAction('seated', e.target.checked);
      if (e.target.id === 'subtitles') {
        this.subtitle = e.target.checked;
        this.onAction('subtitles', this.subtitle);
      }
      if (e.target.id === 'quality') this.onAction('quality', e.target.value);
    });
    // Press-and-hold assists produce the same time/position samples as physical input.
    this.root.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('[data-hold]');
      if (b) {
        b.setPointerCapture(e.pointerId);
        this.onAction('assist-start', b.dataset.hold);
      }
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
      this.root.addEventListener(type, () => this.onAction('assist-end'));
    this.root.addEventListener('keydown', (e) => {
      const b = e.target.closest('[data-hold]');
      if (b && (e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
        e.preventDefault();
        this.onAction('assist-start', b.dataset.hold);
      }
    });
    this.root.addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') this.onAction('assist-end');
    });
  }
  action(name) {
    if (name === 'close') {
      document.querySelector('#modal').close();
      return;
    }
    if (name === 'settings' || name === 'help') {
      document.querySelector('#modal-content').innerHTML =
        name === 'help'
          ? `<span class="eyebrow">بيديك، تحيا الحكاية</span><h2>طريقة اللعب</h2><p>في الواقع المختلط، قرّب السبابة للمس المسار، واجمع الإبهام والسبابة للإمساك. حرّك القطعة ثم افتح أصابعك لوضعها.</p><p>على الشاشة: اسحب على المجسمات. تتبّع نقاط الباب بالترتيب، ضع اللبان في المبخرة، اسحب الحبل للأسفل، وشكّل الفخار. حرّك العصا في دوائر، ولوّح أمام النار، ثم اسكب القهوة.</p><p>اختر وضع التدوير ٣٦٠° للسحب بالفأرة أو بإصبع واحد حول المجسم، ووضع التفاعل للإمساك به. الزر الأيمن أو إصبعان يديران المشهد أيضاً. في محطة القهوة، اضغط ابدأ السكب ثم أوقفه داخل النطاق الأخضر. المسافة توقف الرحلة، وR يعيد التمركز.</p><p>في Quest: العصا اليسرى للحركة واليمنى للدوران بخطوات ٣٠ درجة. حرّك رأسك للنظر. افتح الحركة والمنظور من اللوحة الثابتة لاختيار المنظور الثالث أو أزرار الحركة باليد.</p>`
          : `<span class="eyebrow">اجعل الرحلة على راحتك</span><h2>الإعدادات</h2><label>مستوى الصوت <input id="volume" type="range" min="0" max="1" step=".05" value="${this.volume ?? 0.6}"></label><label><input type="checkbox" id="reduce-motion" ${this.reduced ? 'checked' : ''}> تقليل الحركة والمؤثرات</label><label><input type="checkbox" id="subtitles" ${this.subtitle ? 'checked' : ''}> عرض النص السردي</label><label><input type="checkbox" id="seated" ${this.seated ? 'checked' : ''}> وضع الجلوس</label><label>جودة العرض <select id="quality"><option value="auto">تلقائية</option><option value="low">اقتصادية</option><option value="high">عالية</option></select></label><p class="muted">تحكّم بأصوات التفاعل من الزر العلوي. التعليمات مكتوبة داخل المشهد والقائمة.</p>`;
      document.querySelector('#modal').showModal();
      return;
    }
    this.onAction(name);
  }
  compatibility(s) {
    document.querySelector('[data-action="xr"]').disabled = !s.supported;
    document.querySelector('#xr-label').textContent = s.supported
      ? 'الدخول إلى الواقع المختلط'
      : 'الواقع المختلط غير متاح — جرّب على Quest';
    document.querySelector('#xr-status').textContent = s.supported
      ? 'الواقع المختلط جاهز'
      : 'وضع سطح المكتب';
    document.querySelector('#xr-dot').classList.toggle('on', s.supported);
  }
  audioState(status) {
    const button = document.querySelector('[data-action="effects"]');
    button.textContent = status.effectsMuted
      ? '◖ تشغيل المؤثرات'
      : '◖ كتم المؤثرات';
    button.setAttribute('aria-pressed', String(status.effectsMuted));
    document.querySelector('#audio-feedback').textContent = !status.unlocked
      ? 'أصوات التفاعل تبدأ بعد أول لمسة'
      : status.audioError
        ? status.audioError
        : !status.effectsAvailable
          ? 'الصوت غير متاح في هذا المتصفح'
          : status.effectsMuted
            ? 'المؤثرات مكتومة'
            : 'الصوت عند التفاعل فقط';
    document.querySelector('#audio-status').textContent = status.effectsEnabled
      ? '◖ المؤثرات مفعّلة'
      : '◖ تحكم بأصوات التفاعل';
  }
  navigation(mode) {
    const button = document.querySelector('[data-action="navigation"]');
    button.setAttribute('aria-pressed', String(mode === 'orbit'));
    button.textContent =
      mode === 'orbit' ? '↔ وضع التدوير ٣٦٠°' : '☝ وضع التفاعل';
    button.title =
      mode === 'orbit'
        ? 'اسحب بالفأرة أو بإصبع واحد للدوران. اضغط للعودة إلى التفاعل.'
        : 'اسحب المجسمات للتفاعل. اضغط لتدوير المشهد بإصبع واحد.';
  }
  toast(message) {
    const t = document.querySelector('#toast');
    t.textContent = message;
    t.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('visible'), 3500);
  }
  render(s) {
    const active = !!CHAPTERS[s.state];
    document.body.classList.toggle('playing', active);
    document.querySelector('#welcome').hidden = active;
    document.querySelector('#experience').hidden = !active;
    if (!active) return;
    const c = CHAPTERS[s.state],
      ch = s.chapter || {},
      progress =
        s.state === 'COFFEE' ? (ch.fillLevel ?? 0) : (ch.progress ?? 0);
    if (this.previous !== s.state) {
      this.previous = s.state;
      document.querySelector('#chapter-tag').textContent = c.tag;
      const title = document.querySelector('#chapter-title');
      title.textContent = c.title.replace('🇴🇲', '');
      if (s.state === 'FINALE') {
        const flag = document.createElement('img');
        flag.src =
          import.meta.env.BASE_URL + 'assets/textures/oman-flag-official.jpg';
        flag.alt = 'علم سلطنة عُمان';
        flag.width = 38;
        flag.style.marginInlineStart = '10px';
        title.append(flag);
      }
      document.querySelector('#chapter-en').textContent = c.english;
      document.querySelector('#chapter-detail').textContent = c.detail;
      this.assistStage = '';
      document.querySelector('.chapter-panel').scrollTop = 0;
      document.querySelector('#assist').open = false;
    }
    document.querySelector('#instruction').textContent =
      ch.instruction || s.instruction || '';
    document.querySelector('#activity-progress').style.width =
      `${Math.round(progress * 100)}%`;
    document.querySelector('#activity-percent').textContent =
      `${Math.round(progress * 100)}%`;
    document.querySelector('#stage-label').textContent = ch.completed
      ? 'اكتملت اللمسة ✦'
      : s.state === 'FINALE' && ch.countdown
        ? `إعادة الرحلة خلال ${Math.ceil(ch.countdown)}`
        : 'تفاعل مع المجسم';
    document.querySelector('#coffee-meter').hidden = s.state !== 'COFFEE';
    document.querySelector('#engraving-controls').hidden = s.state !== 'GATE';
    for (const button of document.querySelectorAll(
      '#engraving-controls button',
    )) {
      const id = button.dataset.action.slice(11);
      button.setAttribute('aria-pressed', String(ch.selectedShape === id));
      button.disabled =
        s.paused || !!ch.finishedShapes?.includes(id) || !!ch.completed;
    }
    if (s.state === 'COFFEE') {
      const fill = Math.round((ch.fillLevel ?? 0) * 100);
      document.querySelector('#fill-value').textContent = fill + '%';
      document.querySelector('#fill-level').style.width = fill + '%';
      document
        .querySelector('#fill-track')
        .setAttribute('aria-valuenow', String(fill));
      document.querySelector('#perfect-zone').style.left =
        ch.perfectMin * 100 + '%';
      document.querySelector('#perfect-zone').style.width =
        (ch.perfectMax - ch.perfectMin) * 100 + '%';
      document.querySelector('#pour-result').textContent =
        ch.lastResult === 'perfect'
          ? '✓ صبّة مثالية'
          : ch.stage === 'RESETTING'
            ? 'أعد المحاولة · يُفرّغ الفنجان…'
            : `المحاولات: ${ch.attempts ?? 0}`;
      const cupButton = document.querySelector('[data-action="hold-cup"]');
      cupButton.textContent = ch.cupHeld
        ? '✋ وضع الفنجان'
        : '✋ حمل الفنجان أولاً';
      cupButton.setAttribute('aria-pressed', String(!!ch.cupHeld));
    }
    const count = s.progress?.count ?? 0;
    document.querySelector('#count').textContent = `${count} / 5`;
    document
      .querySelectorAll('[data-symbol]')
      .forEach((el, i) => el.classList.toggle('earned', i < count));
    document.querySelector('#subtitle').textContent = this.subtitle
      ? NARRATION[s.state]
      : '';
    document.querySelector('#paused').hidden = !s.paused;
    document.querySelector('#pause-btn').textContent = s.paused
      ? '▷ متابعة'
      : 'Ⅱ إيقاف مؤقت';
    document.querySelector('#shape-controls').hidden = !(
      s.state === 'POTTERY' && ch.stage === 'SHAPE'
    );
    document.querySelector('#ingredients').innerHTML =
      s.state === 'HALWA'
        ? ['sugar', 'saffron', 'nuts']
            .map(
              (id, i) =>
                `<span class="ingredient ${(ch.ingredients || []).includes(id) ? 'added' : ''}">${(ch.ingredients || []).includes(id) ? '✓' : '○'} ${['السكر', 'الزعفران', 'المكسرات'][i]}</span>`,
            )
            .join('')
        : '';
    const key = s.state + ch.stage;
    if (this.assistStage !== key) {
      this.assistStage = key;
      this.renderAssist(s);
    }
    for (const action of [
      'pour-coffee',
      'stop-pour',
      'hold-cup',
      'light-coal',
    ]) {
      const button = document.querySelector(
        `#experience [data-action="${action}"]`,
      );
      if (button)
        button.disabled =
          !!ch.completed ||
          s.paused ||
          ch.stage === 'RESETTING' ||
          (action === 'pour-coffee' && !ch.cupHeld);
    }
  }
  renderAssist(s) {
    const stage = s.chapter?.stage;
    let html = '',
      help = 'تُطبّق هذه الأدوات نفس شروط الحركة والتوقيت.';
    const hold = (id, label) => `<button data-hold="${id}">${label}</button>`;
    const btn = (id, label) => `<button data-action="${id}">${label}</button>`;
    if (s.state === 'GATE') {
      html =
        stage === 'ENGRAVE'
          ? hold('trace', 'اضغط باستمرار لتتبّع القالب المحدد')
          : '';
      help =
        'اختر أحد الصناديق الثلاثة، ثم اضغط واسحب على المسار المضيء مباشرة. في VR وجّه المؤشر واضغط الزناد، أو اضمم إصبعيك وتتبع الشكل. أكمل الأشكال الثلاثة لفتح الباب.';
    }
    if (s.state === 'FRANKINCENSE' && stage === 'LIGHT_COAL')
      html = btn('light-coal', '✦ أشعل الفحم');
    if (s.state === 'FRANKINCENSE' && stage === 'SCRAPE_TREE')
      html = hold('scrape-tree', 'أمسك أداة الكشط واكشط اللحاء');
    if (s.state === 'FRANKINCENSE' && stage === 'PLACE_RESIN')
      html =
        btn('assist-resin', 'التقاط اللبان') +
        hold('resin', 'اضغط لتحريكه نحو المبخرة') +
        btn('release', 'وضع القطعة');
    if (s.state === 'DHOW' && stage === 'HOIST')
      html = hold('pull', 'اضغط مطولاً لسحب الحبل');
    if (s.state === 'DHOW' && stage === 'WEAVE')
      help =
        'أمسك طرف كل حبل ومرّره عبر الحلقات المضيئة بالترتيب حتى تثبيته. أكمل الحبال الأربعة، ثم اسحب حبل رفع الشراع.';
    if (s.state === 'POTTERY' && stage === 'IGNITE_KILN')
      html = btn('light-kiln', 'أشعل الفرن');
    if (s.state === 'POTTERY' && stage === 'PLACE_CLAY')
      html =
        btn('assist-clay', 'التقاط الطين') +
        hold('clay', 'تحريك الطين إلى العجلة') +
        btn('release', 'وضع الطين');
    if (s.state === 'POTTERY' && stage === 'SHAPE')
      help =
        'الهدف: ارتفاع ٣٠ سم وقطر ٢٠ سم. طابق الشكل الذهبي، ثم زيّن الأشرطة الثلاثة.';
    if (s.state === 'POTTERY' && stage === 'DECORATE') {
      html = [0, 1, 2]
        .map((id) =>
          btn(
            'decorate-' + id,
            ['زخرفة أسفل الإناء', 'زخرفة وسط الإناء', 'زخرفة عنق الإناء'][id],
          ),
        )
        .join('');
      help = 'المس الأشرطة الثلاثة على الفخار لتزيينها، أو استخدم الأزرار.';
    }
    if (s.state === 'HALWA' && stage?.startsWith('ADD')) {
      const id =
        stage === 'ADD_SUGAR'
          ? 'sugar'
          : stage === 'ADD_SAFFRON'
            ? 'saffron'
            : 'nuts';
      html =
        btn('assist-' + id, 'التقاط المكوّن') +
        hold(id, 'تحريكه نحو القدر') +
        btn('release', 'إضافة المكوّن');
    }
    if (s.state === 'HALWA' && stage === 'STIR')
      html = hold('stir', 'اضغط مطولاً للتحريك الدائري');
    if (s.state === 'HALWA' && stage === 'FAN_FIRE')
      html = hold('fan', 'أمسك المهفّة ولوّح أمام النار');
    if (s.state === 'COFFEE')
      html =
        btn('assist-coffee', 'إمساك الدلة يدوياً') +
        hold('coffee', 'تحريك الفوهة فوق الفنجان') +
        btn('release', 'إفلات الدلة');
    if (s.state === 'FINALE') html = btn('lantern', 'المس الفانوس');
    if (s.state === 'COFFEE')
      help =
        'احمل الفنجان أولاً. في VR أمسكه بيد والدلّة بالأخرى وأمل معصمك. أوقف السكب بين ٦٠ و٨٠٪.';
    document.querySelector('#assist-help').textContent = help;
    document.querySelector('#assist-actions').innerHTML = html;
    document.querySelector('#tilt-label').hidden = s.state !== 'COFFEE';
  }
}
