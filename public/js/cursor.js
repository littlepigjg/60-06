class CursorManager {
  constructor(container, signaling, myClientId, myName, myColor) {
    this.container = container;
    this.signaling = signaling;
    this.myClientId = myClientId;
    this.myName = myName;
    this.myColor = myColor;
    this.cursors = new Map();
    this.lastSentX = -1;
    this.lastSentY = -1;
    this.lastSendTime = 0;
    this.throttleMs = 16;
    this.isMouseInWindow = true;
    this._setupLayers();
    this._bindLocalEvents();
  }

  _setupLayers() {
    this.cursorLayer = document.createElement('div');
    this.cursorLayer.className = 'cursor-layer';
    this.container.appendChild(this.cursorLayer);

    this.rippleLayer = document.createElement('div');
    this.rippleLayer.className = 'ripple-layer';
    this.container.appendChild(this.rippleLayer);
  }

  _bindLocalEvents() {
    const sendMove = Utils.debounce((x, y) => {
      this.signaling.sendCursorMove(x, y);
    }, this.throttleMs);

    this.container.addEventListener('mousemove', (e) => {
      if (!this.isMouseInWindow) {
        this.isMouseInWindow = true;
        this.signaling.sendCursorVisibility(true);
      }
      const rect = this.container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      sendMove(x, y);
    });

    this.container.addEventListener('mousedown', (e) => {
      const rect = this.container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this._createRipple(x, y, this.myColor);
      this.signaling.sendCursorClick(x, y);
    });

    document.addEventListener('mouseleave', () => {
      this.isMouseInWindow = false;
      this.signaling.sendCursorVisibility(false);
    });

    document.addEventListener('mouseenter', () => {
      if (!this.isMouseInWindow) {
        this.isMouseInWindow = true;
        this.signaling.sendCursorVisibility(true);
      }
    });

    window.addEventListener('blur', () => {
      this.isMouseInWindow = false;
      this.signaling.sendCursorVisibility(false);
    });
  }

  _createOrGetCursor(peerId, name, color) {
    let cursor = this.cursors.get(peerId);
    if (cursor) {
      if (name) cursor.nameEl.textContent = name;
      if (color) {
        cursor.pointer.style.borderColor = color;
        cursor.pointer.style.background = color;
        cursor.nameEl.style.background = color;
      }
      return cursor;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'remote-cursor';
    wrapper.style.pointerEvents = 'none';

    const pointer = document.createElement('div');
    pointer.className = 'cursor-pointer';
    if (color) {
      pointer.style.borderColor = color;
      pointer.style.background = color;
    }

    const nameEl = document.createElement('div');
    nameEl.className = 'cursor-name';
    nameEl.textContent = name || '未知用户';
    if (color) {
      nameEl.style.background = color;
    }

    wrapper.appendChild(pointer);
    wrapper.appendChild(nameEl);
    this.cursorLayer.appendChild(wrapper);

    cursor = { wrapper, pointer, nameEl, visible: true };
    this.cursors.set(peerId, cursor);
    return cursor;
  }

  handleCursorMove(msg) {
    if (msg.peerId === this.myClientId) return;
    const cursor = this._createOrGetCursor(msg.peerId, msg.name, msg.color);
    cursor.wrapper.style.transform = `translate(${msg.x}px, ${msg.y}px)`;
    if (!cursor.visible) {
      cursor.wrapper.style.opacity = '1';
      cursor.visible = true;
    }
  }

  handleCursorClick(msg) {
    if (msg.peerId === this.myClientId) return;
    this._createOrGetCursor(msg.peerId, msg.name, msg.color);
    this._createRipple(msg.x, msg.y, msg.color);
  }

  handleCursorVisibility(msg) {
    if (msg.peerId === this.myClientId) return;
    const cursor = this.cursors.get(msg.peerId);
    if (cursor) {
      cursor.visible = msg.visible;
      cursor.wrapper.style.opacity = msg.visible ? '1' : '0';
    }
  }

  removeCursor(peerId) {
    const cursor = this.cursors.get(peerId);
    if (cursor) {
      cursor.wrapper.remove();
      this.cursors.delete(peerId);
    }
  }

  _createRipple(x, y, color) {
    const ripple = document.createElement('div');
    ripple.className = 'cursor-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    if (color) {
      ripple.style.borderColor = color;
    }
    this.rippleLayer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  destroy() {
    this.cursorLayer.remove();
    this.rippleLayer.remove();
    this.cursors.clear();
  }
}

window.CursorManager = CursorManager;
