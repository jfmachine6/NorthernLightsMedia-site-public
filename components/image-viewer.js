class NlmImageViewer extends HTMLElement {
  connectedCallback() {
    if (this.dialog) return;

    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host { color: #e8f0e8; font-family: "Space Grotesk", sans-serif; }
        dialog { background: transparent; border: 0; color: inherit; max-height: 92vh; max-width: none; overflow: visible; padding: 0; width: min(1120px, 94vw); }
        dialog::backdrop { backdrop-filter: blur(4px); background: rgba(3, 10, 11, 0.88); }
        .viewer { background: #101b1a; border: 1px solid rgba(232, 240, 232, 0.2); border-radius: 8px; box-shadow: 0 18px 70px rgba(0, 0, 0, 0.55); padding: clamp(12px, 2.5vw, 24px); }
        .toolbar { align-items: center; display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 12px; }
        .toolbar button { align-items: center; background: rgba(232, 240, 232, 0.08); border: 1px solid rgba(232, 240, 232, 0.25); border-radius: 4px; color: #e8f0e8; cursor: pointer; display: inline-flex; font: inherit; height: 40px; justify-content: center; min-width: 42px; padding: 0 12px; }
        .toolbar button:hover, .toolbar button:focus-visible { background: rgba(100, 217, 255, 0.18); border-color: #64d9ff; outline: none; }
        .toolbar button:disabled { cursor: default; opacity: 0.42; }
        .zoom-value { color: #aabbb1; font: 0.75rem "DM Mono", monospace; min-width: 48px; text-align: center; }
        .close { color: #b7f36b !important; font-size: 1.35rem !important; margin-left: 8px; }
        .frame { background: linear-gradient(#101b1a, #101b1a) padding-box, linear-gradient(115deg, #64d9ff, #5ef7d7 36%, #b7f36b 68%, #64d9ff) border-box; border: 1px solid transparent; border-radius: 6px; box-shadow: 0 0 16px rgba(94, 247, 215, 0.2), 0 0 32px rgba(100, 217, 255, 0.12); padding: 3px; }
        .stage { align-items: center; background: #08100f; border-radius: 3px; display: flex; height: min(72vh, 780px); justify-content: center; overflow: hidden; overscroll-behavior: contain; touch-action: none; }
        .stage img { max-height: 100%; max-width: 100%; object-fit: contain; pointer-events: none; transform-origin: center; user-select: none; visibility: hidden; }
        .stage[data-zoomed="true"] { cursor: grab; }
        .stage[data-dragging="true"] { cursor: grabbing; }
        .caption { color: #e8f0e8; font-size: 0.98rem; line-height: 1.5; margin: 14px 2px 0; }
        .viewer :focus-visible { outline: 2px solid #b7f36b; outline-offset: 3px; }
        @media (max-width: 600px) { dialog { width: 96vw; } .stage { height: 68vh; } .toolbar { gap: 5px; } .toolbar button { height: 38px; min-width: 38px; padding: 0 9px; } }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; } }
      </style>
      <dialog aria-label="Artwork viewer">
        <div class="viewer">
          <div class="toolbar" aria-label="Image controls">
            <button type="button" data-action="zoom-out" aria-label="Zoom out" title="Zoom out">−</button>
            <output class="zoom-value" aria-live="polite">100%</output>
            <button type="button" data-action="zoom-in" aria-label="Zoom in" title="Zoom in">+</button>
            <button type="button" data-action="reset" aria-label="Reset zoom and position" title="Reset view">Reset</button>
            <button type="button" class="close" data-action="close" aria-label="Close image viewer" title="Close">×</button>
          </div>
          <div class="frame">
            <div class="stage"><img alt="" draggable="false" /></div>
          </div>
          <p class="caption"></p>
        </div>
      </dialog>
    `;

    this.dialog = this.shadowRoot.querySelector("dialog");
    this.stage = this.shadowRoot.querySelector(".stage");
    this.image = this.shadowRoot.querySelector(".stage img");
    this.zoomValue = this.shadowRoot.querySelector(".zoom-value");
    this.closeButton = this.shadowRoot.querySelector('[data-action="close"]');
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.drag = null;
    this.imageRequest = 0;

    this.handleTrigger = (event) => {
      const trigger = event.target instanceof Element && event.target.closest("[data-image-viewer]");
      if (!trigger) return;
      event.preventDefault();
      this.open(trigger);
    };
    this.handleEscape = (event) => {
      if (event.key === "Escape" && this.dialog.open) {
        event.preventDefault();
        this.dialog.close();
      }
    };
    document.addEventListener("click", this.handleTrigger);
    this.handleNativeDrag = (event) => {
      if (event.target instanceof Element && event.target.closest("[data-image-viewer]")) event.preventDefault();
    };
    document.addEventListener("dragstart", this.handleNativeDrag);
    document.addEventListener("keydown", this.handleEscape);

    this.shadowRoot.querySelector('[data-action="zoom-in"]').addEventListener("click", () => this.setScale(this.scale + 0.5));
    this.shadowRoot.querySelector('[data-action="zoom-out"]').addEventListener("click", () => this.setScale(this.scale - 0.5));
    this.shadowRoot.querySelector('[data-action="reset"]').addEventListener("click", () => this.resetView());
    this.closeButton.addEventListener("click", () => this.dialog.close());
    this.dialog.addEventListener("click", (event) => {
      if (event.target === this.dialog) this.dialog.close();
    });
    this.dialog.addEventListener("close", () => {
      this.imageRequest += 1;
      this.image.removeAttribute("src");
      this.image.style.visibility = "hidden";
      this.resetView();
      if (this.trigger?.isConnected) this.trigger.focus();
    });
    this.stage.addEventListener("wheel", (event) => {
      event.preventDefault();
      this.setScale(this.scale + (event.deltaY < 0 ? 0.25 : -0.25));
    }, { passive: false });
    this.stage.addEventListener("pointerdown", (event) => this.startPan(event));
    this.stage.addEventListener("pointermove", (event) => this.movePan(event));
    this.stage.addEventListener("pointerup", (event) => this.endPan(event));
    this.stage.addEventListener("pointercancel", (event) => this.endPan(event));
  }

  disconnectedCallback() {
    if (this.handleTrigger) document.removeEventListener("click", this.handleTrigger);
    if (this.handleNativeDrag) document.removeEventListener("dragstart", this.handleNativeDrag);
    if (this.handleEscape) document.removeEventListener("keydown", this.handleEscape);
  }

  open(trigger) {
    this.trigger = trigger;
    const thumbnail = trigger.querySelector("img");
    const request = ++this.imageRequest;
    let source = trigger.dataset.viewerSrc || trigger.href;
    this.image.style.visibility = "hidden";
    this.image.onload = () => {
      if (request === this.imageRequest) this.image.style.visibility = "visible";
    };
    this.image.onerror = () => {
      if (request !== this.imageRequest) return;
      if (source !== trigger.href) {
        source = trigger.href;
        this.image.src = source;
      } else {
        this.image.style.visibility = "visible";
      }
    };
    this.image.removeAttribute("src");
    this.image.src = source;
    this.image.alt = thumbnail?.alt || trigger.dataset.caption || "Artwork";
    this.shadowRoot.querySelector(".caption").textContent = trigger.dataset.caption || thumbnail?.alt || "Artwork";
    this.resetView();
    if (!this.dialog.open) this.dialog.showModal();
    this.closeButton.focus();
  }

  setScale(scale) {
    this.scale = Math.max(1, Math.min(5, scale));
    if (this.scale === 1) {
      this.panX = 0;
      this.panY = 0;
    }
    this.updateView();
  }

  resetView() {
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.updateView();
  }

  updateView() {
    this.image.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    this.zoomValue.value = `${Math.round(this.scale * 100)}%`;
    this.stage.dataset.zoomed = String(this.scale > 1);
    this.shadowRoot.querySelector('[data-action="zoom-out"]').disabled = this.scale <= 1;
    this.shadowRoot.querySelector('[data-action="zoom-in"]').disabled = this.scale >= 5;
  }

  startPan(event) {
    if (this.scale <= 1 || event.button !== 0) return;
    event.preventDefault();
    this.drag = { pointerId: event.pointerId, startX: event.clientX - this.panX, startY: event.clientY - this.panY };
    this.stage.dataset.dragging = "true";
    this.stage.setPointerCapture(event.pointerId);
  }

  movePan(event) {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    this.panX = event.clientX - this.drag.startX;
    this.panY = event.clientY - this.drag.startY;
    const maxX = Math.max(0, (this.image.clientWidth * this.scale - this.stage.clientWidth) / 2);
    const maxY = Math.max(0, (this.image.clientHeight * this.scale - this.stage.clientHeight) / 2);
    this.panX = Math.max(-maxX, Math.min(maxX, this.panX));
    this.panY = Math.max(-maxY, Math.min(maxY, this.panY));
    this.updateView();
  }

  endPan(event) {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    this.drag = null;
    delete this.stage.dataset.dragging;
  }
}

if (!customElements.get("nlm-image-viewer")) {
  customElements.define("nlm-image-viewer", NlmImageViewer);
}