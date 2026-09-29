// On-screen controls for phones and tablets.
//
// Each button presses a key: it sends the same keydown / keyup the keyboard
// would, so the game handles a tap exactly like the key it stands for. The
// buttons only show on a touch screen, and only on the screens that need them;
// the menus themselves are tapped like they are clicked.

(function () {
  const BUTTONS = [
    { id: 'touchLeft',    code: 'ArrowLeft', key: 'ArrowLeft', label: '◀' },
    { id: 'touchRight',   code: 'ArrowRight', key: 'ArrowRight', label: '▶' },
    { id: 'touchJump',    code: 'Space',     key: ' ',         label: '▲' },
    { id: 'touchRestart', code: 'KeyR',      key: 'r',         label: 'R' },
    { id: 'touchBack',    code: 'Escape',    key: 'Escape',    label: '❚❚' }
  ];

  // Which buttons each screen shows. The back button is Escape: pause while
  // playing, and back on the screens that have no Back button of their own.
  const SHOWN = {
    playing:            ['touchLeft', 'touchRight', 'touchJump', 'touchRestart', 'touchBack'],
    paused:             ['touchBack'],
    unlockNotification: ['touchJump'],
    chapterSelect:      ['touchBack'],
    levelSelect:        ['touchBack'],
    settings:           ['touchBack'],
    customize:          ['touchBack']
  };

  const root = document.createElement('div');
  root.id = 'touchControls';
  document.body.appendChild(root);

  const elements = {};
  for (const b of BUTTONS) {
    const el = document.createElement('button');
    el.id = b.id;
    el.type = 'button';
    el.className = 'touchButton';
    el.textContent = b.label;
    root.appendChild(el);
    elements[b.id] = el;

    let down = false;
    const send = (type) => window.dispatchEvent(new KeyboardEvent(type, { code: b.code, key: b.key, bubbles: true }));
    const press = (e) => {
      e.preventDefault();
      if (down) return;
      down = true;
      el.classList.add('down');
      try { el.setPointerCapture(e.pointerId); } catch (x) { }
      send('keydown');
    };
    const release = () => {
      if (!down) return;
      down = false;
      el.classList.remove('down');
      send('keyup');
      // Browsers let sound start on a touch's release, not its press
      if (typeof tryEnableAudio === 'function') tryEnableAudio();
    };
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Touch mode starts with the first touch, or right away on a device whose
  // main pointer is a finger.
  let touchMode = false;
  function enterTouchMode() {
    if (touchMode) return;
    touchMode = true;
    document.body.classList.add('touch');
    // Glow (shadowBlur) is by far the most expensive thing the game draws, and
    // on a phone it makes the frame rate drop: draw without it.
    try {
      Object.defineProperty(ctx, 'shadowBlur', { get() { return 0; }, set() { }, configurable: true });
    } catch (x) { }
    // The keyboard help above the game is hidden now: give its room to the game
    window.dispatchEvent(new Event('resize'));
  }
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) enterTouchMode();
  window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') enterTouchMode(); });
  // A tap on the canvas ends in a click, which is when sound may start
  window.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch' && typeof tryEnableAudio === 'function') tryEnableAudio();
  });

  // Show the buttons the current screen needs
  let lastState = null;
  function update() {
    const state = touchMode ? gameState : null;
    if (state !== lastState) {
      lastState = state;
      const shown = (state && SHOWN[state]) || [];
      for (const id in elements) {
        const visible = shown.includes(id);
        elements[id].style.display = visible ? '' : 'none';
        // A button that disappears while held must not leave its key pressed
        if (!visible && elements[id].classList.contains('down')) {
          elements[id].dispatchEvent(new PointerEvent('pointercancel'));
        }
      }
    }
    requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
})();
