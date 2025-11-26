
export class InputManager {
  constructor() {
    this.keys = {};
    this.touchState = {
      left: false,
      right: false,
      rightPressedAt: 0,
      startX: 0,
      startY: 0,
      startTime: 0
    };
    this.handlers = {
      jump: [],
      shoot: [],
      ult: [],
      dash: [],
      guard: []
    };
    this.enabled = false;
  }

  init(canvas) {
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));

    if (this.canvas) {
      this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
      this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
      this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
      // Mouse support for canvas (optional, if not handled by touch)
      this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
      this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    this.enabled = true;
  }

  // Helper for React to bind buttons
  bindButton(button, action) {
    if (!button) return;
    const handler = () => this.trigger(action);
    const activate = (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      handler();
    };
    button.addEventListener('pointerdown', activate);
    button.addEventListener('click', (e) => e.preventDefault());

    if (action === 'ult') {
      button.addEventListener('touchstart', (e) => {
        if (!this.enabled || button.disabled) return;
        e.preventDefault();
        handler();
      }, { passive: false });
    }
  }

  handleMouseDown(e) {
    if (!this.enabled) return;
    // Simple mouse support mirroring touch
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeft = x < rect.width / 2;
    if (isLeft) this.trigger('jump');
    else this.trigger('shoot');
  }

  handleMouseUp(e) {
    // No-op for now
  }


  handleKeyDown(e) {
    if (!this.enabled) return;
    this.keys[e.code] = true;

    if (e.code === 'Space' || e.code === 'ArrowUp') this.trigger('jump');
    // Z: Guard, X: Shoot, C: Dash, V: Ult
    if (e.key === 'x' || e.key === 'X') this.trigger('shoot');
    if (e.key === 'z' || e.key === 'Z') this.trigger('guard');
    if (e.key === 'c' || e.key === 'C') this.trigger('dash');
    if (e.key === 'v' || e.key === 'V') this.trigger('ult');
  }

  handleKeyUp(e) {
    this.keys[e.code] = false;
  }

  handleTouchStart(e) {
    if (!this.enabled) return;
    e.preventDefault();
    const touch = e.changedTouches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const isLeft = x < rect.width / 2;

    // Store start position for swipe detection
    this.touchState.startX = x;
    this.touchState.startY = y;
    this.touchState.startTime = performance.now();

    if (isLeft) {
      this.trigger('jump');
      this.touchState.right = false;
    } else {
      this.touchState.right = true;
      this.touchState.rightPressedAt = performance.now();

      // Long press detection for ult
      setTimeout(() => {
        if (this.touchState.right) {
          this.trigger('ult');
        }
      }, 350);

      this.trigger('shoot');
    }
  }

  handleTouchMove(e) {
    if (!this.enabled || !this.touchState.startTime) return;
    e.preventDefault(); // Prevent scrolling
  }

  handleTouchEnd(e) {
    if (!this.enabled) return;
    const touch = e.changedTouches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // Swipe Detection
    if (this.touchState.startTime) {
      const dx = x - this.touchState.startX;
      const dy = y - this.touchState.startY;
      const dt = performance.now() - this.touchState.startTime;

      // Thresholds: Min distance 30px, Max time 300ms, Horizontal dominance
      if (dt < 300 && Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
          this.trigger('dash'); // Swipe Right -> Dash
        } else {
          this.trigger('guard'); // Swipe Left -> Guard
        }
      }
    }

    this.touchState.right = false;
    this.touchState.startTime = 0;
  }

  on(event, handler) {
    if (this.handlers[event]) {
      this.handlers[event].push(handler);
    }
  }

  trigger(event) {
    if (this.handlers[event]) {
      this.handlers[event].forEach(h => h());
    }
  }
}
