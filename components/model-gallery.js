const MANIFEST_URL = "models/models.json";
const VIEWER_MODULE = "./vendor/model-viewer/model-viewer.min.js";
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let viewerReady = null;

function loadViewer() {
  viewerReady ??= import(VIEWER_MODULE).then(() => customElements.whenDefined("model-viewer"));
  return viewerReady;
}

function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  node.append(...children);
  return node;
}

// Only same-site relative paths or https URLs (e.g. an R2 bucket) are allowed.
function safeUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value, document.baseURI);
    const sameOrigin = url.origin === window.location.origin;
    if (url.protocol === "https:" || (sameOrigin && /^https?:$/.test(url.protocol))) return url.href;
  } catch {
    return null;
  }
  return null;
}

function optionalText(value, max = 600) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : "";
}

function validateModel(raw) {
  if (!raw || typeof raw !== "object") throw new Error("entry is not an object");
  const id = raw.id;
  if (typeof id !== "string" || !ID_PATTERN.test(id)) throw new Error(`invalid id ${JSON.stringify(id)}`);
  const title = optionalText(raw.title, 120);
  if (!title) throw new Error(`${id}: missing title`);
  const src = safeUrl(raw.src);
  if (!src) throw new Error(`${id}: missing or unsafe src`);
  const poster = raw.poster === undefined ? null : safeUrl(raw.poster);
  if (raw.poster !== undefined && !poster) throw new Error(`${id}: unsafe poster`);
  const tags = Array.isArray(raw.tags) ? raw.tags.filter((tag) => typeof tag === "string" && tag.trim()).map((tag) => tag.trim().slice(0, 40)).slice(0, 8) : [];
  const fileSize = Number.isFinite(raw.fileSize) && raw.fileSize > 0 ? raw.fileSize : null;
  const triangles = Number.isInteger(raw.triangles) && raw.triangles > 0 ? raw.triangles : null;
  return {
    id,
    title,
    src,
    poster,
    tags,
    fileSize,
    triangles,
    creator: optionalText(raw.creator, 120),
    description: optionalText(raw.description, 1200),
    event: optionalText(raw.event, 120),
    dimensions: optionalText(raw.dimensions, 60),
    alt: optionalText(raw.alt, 300) || `3D model of ${title}`,
  };
}

function parseManifest(data) {
  if (!data || !Array.isArray(data.models)) throw new Error("models.json must contain a models array");
  const models = [];
  const seen = new Set();
  for (const raw of data.models) {
    try {
      const model = validateModel(raw);
      if (seen.has(model.id)) throw new Error(`duplicate id ${model.id}`);
      seen.add(model.id);
      models.push(model);
    } catch (error) {
      console.warn(`Skipping 3D model entry: ${error.message}`);
    }
  }
  return models;
}

function formatSize(bytes) {
  if (!bytes) return "";
  return bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function modelUrl(id) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("model", id);
  return url.href;
}

function renderCard(model, open) {
  const media = model.poster
    ? element("img", { src: model.poster, alt: "", loading: "lazy", decoding: "async", width: 900, height: 900 })
    : element("span", { className: "model-card__placeholder", "aria-hidden": "true", text: "3D" });
  const meta = [model.event, model.creator].filter(Boolean).join(" / ");
  const button = element("button", { className: "model-card__button", type: "button", "aria-haspopup": "dialog" }, [
    element("span", { className: "model-card__media" }, [media, element("span", { className: "model-card__badge", "aria-hidden": "true", text: "3D" })]),
    element("span", { className: "model-card__body" }, [
      element("span", { className: "model-card__title", text: model.title }),
      meta ? element("span", { className: "model-card__meta", text: meta }) : "",
      element("span", { className: "model-card__cta", text: "Open in 3D viewer" }),
    ]),
  ]);
  button.addEventListener("click", () => open(model, button));
  button.addEventListener("pointerenter", loadViewer, { once: true });
  button.addEventListener("focus", loadViewer, { once: true });
  return element("li", { className: "model-card" }, [button]);
}

function setupDialog(dialog) {
  const stage = dialog.querySelector("[data-model-stage]");
  const message = dialog.querySelector("[data-model-message]");
  const field = (name) => dialog.querySelector(`[data-model-${name}]`);
  const rotateButton = field("rotate");
  let viewer = null;
  let returnFocus = null;
  let current = null;

  function setMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("is-error", isError);
  }

  function setRotate(on) {
    rotateButton.setAttribute("aria-pressed", String(on));
    if (viewer) viewer.toggleAttribute("auto-rotate", on);
  }

  function createViewer() {
    viewer = document.createElement("model-viewer");
    viewer.className = "model-viewer";
    for (const [name, value] of Object.entries({
      "camera-controls": "",
      "touch-action": "pan-y",
      "auto-rotate-delay": "1500",
      "rotation-per-second": "18deg",
      "interaction-prompt": "auto",
      "shadow-intensity": "1",
      "shadow-softness": "0.8",
      "environment-image": "neutral",
      exposure: "1",
      ar: "",
      "ar-modes": "webxr scene-viewer quick-look",
      "ar-scale": "auto",
    })) {
      viewer.setAttribute(name, value);
    }

    const progress = element("div", { className: "model-viewer__progress", slot: "progress-bar" }, [element("span")]);
    const arButton = element("button", { className: "model-dialog__button model-viewer__ar", slot: "ar-button", type: "button", text: "View in your space" });
    viewer.append(progress, arButton);

    viewer.addEventListener("progress", (event) => {
      const value = event.detail.totalProgress;
      progress.style.setProperty("--progress", value);
      progress.classList.toggle("is-done", value >= 1);
    });
    viewer.addEventListener("load", () => setMessage(""));
    viewer.addEventListener("error", () => {
      setMessage("This model couldn't be loaded. Check your connection and try again.", true);
    });
    stage.prepend(viewer);
  }

  function fill(model) {
    field("title").textContent = model.title;
    field("event").textContent = model.event;
    field("event").hidden = !model.event;
    field("creator").textContent = model.creator ? `Created by ${model.creator}` : "";
    field("creator").hidden = !model.creator;
    field("description").textContent = model.description;
    field("description").hidden = !model.description;

    const facts = field("facts");
    facts.replaceChildren();
    for (const [label, value] of [
      ["Real-world size", model.dimensions],
      ["Download", formatSize(model.fileSize)],
      ["Triangles", model.triangles ? model.triangles.toLocaleString() : ""],
    ]) {
      if (value) facts.append(element("div", {}, [element("dt", { text: label }), element("dd", { text: value })]));
    }
    facts.hidden = !facts.children.length;

    const tags = field("tags");
    tags.replaceChildren(...model.tags.map((tag) => element("li", { text: tag })));
    tags.hidden = !model.tags.length;
    field("link").href = modelUrl(model.id);
  }

  async function open(model, trigger) {
    current = model;
    returnFocus = trigger ?? null;
    fill(model);
    setMessage("Loading the 3D viewer...");
    if (!dialog.open) dialog.showModal();
    history.replaceState(null, "", modelUrl(model.id));

    try {
      await loadViewer();
    } catch {
      setMessage("The 3D viewer couldn't start. Try refreshing the page.", true);
      return;
    }
    if (current !== model) return;
    if (!viewer) createViewer();
    setMessage("Loading model...");
    viewer.setAttribute("alt", model.alt);
    if (model.poster) viewer.setAttribute("poster", model.poster);
    else viewer.removeAttribute("poster");
    viewer.setAttribute("src", model.src);
    setRotate(!reducedMotion.matches);
  }

  // Runs from both close() and the dialog's async "close" event (Escape key); only the first call does work.
  function cleanUp() {
    if (!current) return;
    current = null;
    if (viewer) viewer.removeAttribute("src");
    setMessage("");
    const url = new URL(window.location.href);
    url.searchParams.delete("model");
    history.replaceState(null, "", url.href);
    returnFocus?.focus();
    returnFocus = null;
  }

  function close() {
    if (dialog.open) dialog.close();
    cleanUp();
  }

  dialog.addEventListener("close", cleanUp);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  field("close").addEventListener("click", close);
  field("reset").addEventListener("click", () => {
    if (!viewer) return;
    viewer.cameraOrbit = "auto auto auto";
    viewer.cameraTarget = "auto auto auto";
    viewer.fieldOfView = "auto";
    viewer.resetTurntableRotation?.();
    viewer.jumpCameraToGoal?.();
  });
  rotateButton.addEventListener("click", () => setRotate(rotateButton.getAttribute("aria-pressed") !== "true"));
  field("link").addEventListener("click", async (event) => {
    if (!navigator.clipboard || !current) return;
    event.preventDefault();
    const link = event.currentTarget;
    try {
      await navigator.clipboard.writeText(modelUrl(current.id));
      link.textContent = "Link copied!";
    } catch {
      window.location.href = modelUrl(current.id);
      return;
    }
    setTimeout(() => (link.textContent = "Link to this model"), 2000);
  });

  return { open };
}

async function initGallery(root) {
  const status = root.querySelector("[data-gallery-status]");
  const retry = root.querySelector("[data-gallery-retry]");
  const results = root.querySelector("[data-gallery-results]");
  const dialog = document.querySelector("[data-model-dialog]");
  const viewer = setupDialog(dialog);

  async function load() {
    root.setAttribute("aria-busy", "true");
    retry.hidden = true;
    status.classList.remove("feed-status--error");
    status.textContent = "Loading models...";
    results.replaceChildren();
    try {
      const response = await fetch(MANIFEST_URL, { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const models = parseManifest(await response.json());
      if (!models.length) {
        status.textContent = "No models are on display yet. Check back soon!";
        return;
      }
      results.append(...models.map((model) => renderCard(model, viewer.open)));
      status.textContent = "";

      const requested = new URLSearchParams(window.location.search).get("model");
      const match = models.find((model) => model.id === requested);
      if (match) viewer.open(match, results.querySelectorAll(".model-card__button")[models.indexOf(match)]);
    } catch (error) {
      console.error("Could not load the 3D gallery", error);
      status.textContent = "The 3D gallery couldn't be loaded right now.";
      status.classList.add("feed-status--error");
      retry.hidden = false;
    } finally {
      root.setAttribute("aria-busy", "false");
    }
  }

  retry.addEventListener("click", load);
  await load();
}

const galleryRoot = document.querySelector("[data-model-gallery]");
if (galleryRoot) initGallery(galleryRoot);

export { parseManifest, validateModel, safeUrl };
