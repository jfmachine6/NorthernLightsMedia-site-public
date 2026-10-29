const API_BASE = "https://nlm.jfedders6.workers.dev";
const FEEDS = {
  members: { label: "member profiles", singular: "profile", plural: "profiles", action: "Meet", empty: "Member profiles are on the way. Check back soon to meet our creative community." },
  news: { label: "news", singular: "article", plural: "articles", action: "Read", empty: "No news articles yet. Check back soon for updates from Northern Lights Media." },
  history: { label: "club history", singular: "story", plural: "stories", action: "Explore", empty: "Our story is still taking shape. Check back soon for event recaps and moments from club life." },
};
const TEXT_TYPES = new Set([
  "paragraph", "heading_1", "heading_2", "heading_3", "bulleted_list_item",
  "numbered_list_item", "quote", "callout", "code", "to_do", "toggle",
]);

function requireValue(condition) {
  if (!condition) throw new Error("The feed returned content in an unexpected format.");
}

function isText(value) {
  return typeof value === "string";
}

function urlValue(value) {
  requireValue(isText(value));
  const url = new URL(value);
  requireValue(["http:", "https:"].includes(url.protocol));
  return url.href;
}

function validateText(parts) {
  requireValue(Array.isArray(parts));
  for (const part of parts) {
    requireValue(isText(part?.text));
    if (part.href !== null && part.href !== undefined) urlValue(part.href);
    for (const flag of ["bold", "italic", "strikethrough", "underline", "code"]) {
      requireValue(typeof part[flag] === "boolean");
    }
  }
}

function validateImage(image) {
  urlValue(image?.url);
  requireValue(image.expiresAt === null ||
    (isText(image.expiresAt) && Number.isFinite(Date.parse(image.expiresAt))));
}

function validateBlocks(blocks, depth = 0) {
  requireValue(Array.isArray(blocks) && depth <= 10);
  for (const block of blocks) {
    requireValue(block && isText(block.type));
    if (TEXT_TYPES.has(block.type)) {
      validateText(block.text);
      if (block.type === "code") requireValue(isText(block.language));
      if (block.type === "to_do") requireValue(typeof block.checked === "boolean");
    } else if (block.type === "image") {
      validateImage(block);
      validateText(block.caption);
    } else if (block.type === "link") {
      urlValue(block.url);
      validateText(block.caption);
    } else {
      requireValue(block.type === "divider");
    }
    if (block.children !== undefined) validateBlocks(block.children, depth + 1);
  }
}

function validateFeed(data, kind) {
  requireValue(Array.isArray(data?.[kind]));
  const ids = new Set();
  for (const record of data[kind]) {
    requireValue(record && isText(record.id) && record.id.trim() &&
      !ids.has(record.id) && isText(record.title) && record.title.trim());
    ids.add(record.id);
    validateBlocks(record.content);
    if (kind === "members") {
      requireValue(Array.isArray(record.photos) && Array.isArray(record.roles) &&
        record.roles.every(isText) &&
        (record.graduationSemester === null || isText(record.graduationSemester)));
      record.photos.forEach(validateImage);
    } else if (kind === "history") {
      requireValue(Array.isArray(record.thumbnails) &&
        Array.isArray(record.eventIds) && record.eventIds.every(isText));
      record.thumbnails.forEach(validateImage);
    } else {
      requireValue(Array.isArray(record.authors) &&
        record.authors.every((author) => isText(author?.id) && isText(author.name)));
      if (record.date !== null) {
        requireValue(record.date && isText(record.date.start) && Number.isFinite(Date.parse(record.date.start)));
      }
    }
  }
  return data[kind];
}

function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = value;
  return node;
}

function link(label, href) {
  const node = element("a", "", label);
  node.href = href;
  return node;
}

function externalLink(label, href) {
  const node = link(label, urlValue(href));
  node.rel = "noopener noreferrer";
  return node;
}

function appendText(parent, parts) {
  for (const part of parts) {
    let node = document.createTextNode(part.text);
    for (const [flag, tag] of [["code", "code"], ["bold", "strong"], ["italic", "em"], ["strikethrough", "s"], ["underline", "u"]]) {
      if (part[flag]) {
        const wrapper = element(tag);
        wrapper.append(node);
        node = wrapper;
      }
    }
    if (part.href) {
      const anchor = externalLink("", part.href);
      anchor.append(node);
      node = anchor;
    }
    parent.append(node);
  }
}

function photo(image, alt, className = "") {
  const figure = element("figure", `feed-image ${className}`.trim());
  const img = element("img");
  img.src = urlValue(image.url);
  img.alt = alt;
  img.loading = "lazy";
  img.decoding = "async";
  img.referrerPolicy = "no-referrer";
  img.addEventListener("error", () => {
    img.remove();
    figure.prepend(element("p", "feed-image__error", "Image unavailable. Reload the page to request a fresh image link."));
  }, { once: true });
  figure.append(img);
  return figure;
}

function renderBlocks(parent, blocks) {
  let list;
  let listType;
  for (const block of blocks) {
    const isList = ["bulleted_list_item", "numbered_list_item"].includes(block.type);
    if (!isList || block.type !== listType) list = null;
    let node;
    if (isList) {
      if (!list) {
        list = element(block.type === "bulleted_list_item" ? "ul" : "ol");
        parent.append(list);
      }
      listType = block.type;
      node = element("li");
      appendText(node, block.text);
      list.append(node);
    } else if (block.type === "toggle") {
      node = element("details", "feed-toggle");
      const summary = element("summary");
      appendText(summary, block.text);
      node.append(summary);
    } else if (block.type === "code") {
      node = element("pre");
      node.append(element("code", "", block.text.map((part) => part.text).join("")));
      node.setAttribute("aria-label", `${block.language} code`);
    } else if (TEXT_TYPES.has(block.type)) {
      const tag = { heading_1: "h3", heading_2: "h4", heading_3: "h5", quote: "blockquote", callout: "aside" }[block.type] || "p";
      node = element(tag, block.type === "callout" ? "feed-callout" : "");
      if (block.type === "to_do") node.append(element("span", "feed-todo", block.checked ? "[Done] " : "[To do] "));
      appendText(node, block.text);
    } else if (block.type === "image") {
      const caption = block.caption.map((part) => part.text).join("");
      node = photo(block, caption || "Image accompanying this story");
      if (caption) {
        const text = element("figcaption");
        appendText(text, block.caption);
        node.append(text);
      }
    } else if (block.type === "link") {
      node = element("p", "feed-bookmark");
      node.append(externalLink(block.caption.map((part) => part.text).join("") || block.url, block.url));
    } else {
      node = element("hr");
    }
    if (!isList) parent.append(node);
    if (block.children?.length) {
      const children = element("div", "feed-children");
      if (isList || block.type === "toggle") node.append(children);
      else parent.append(children);
      renderBlocks(children, block.children);
    }
  }
}

function metadata(record, kind) {
  const node = element("div", "feed-meta");
  if (kind === "members") {
    const roles = element("ul", "feed-roles");
    roles.setAttribute("aria-label", "Club roles");
    record.roles.forEach((role) => roles.append(element("li", "", role)));
    if (record.roles.length) node.append(roles);
    if (record.graduationSemester) node.append(element("p", "", `Graduation: ${record.graduationSemester}`));
  } else if (kind === "news") {
    if (record.date) {
      const start = record.date.start;
      // Date-only Notion values are calendar dates, not UTC instants.
      const date = new Date(start.length === 10 ? `${start}T12:00:00` : start);
      const time = element("time", "", new Intl.DateTimeFormat("en-US", {
        year: "numeric", month: "long", day: "numeric",
        timeZone: start.length === 10 ? undefined : "America/New_York",
      }).format(date));
      time.dateTime = start;
      node.append(time);
    }
    if (record.authors.length) {
      const authors = element("p", "feed-authors", "By ");
      record.authors.forEach((author, index) => {
        if (index) authors.append(document.createTextNode(", "));
        authors.append(link(author.name, `members.html?id=${encodeURIComponent(author.id)}`));
      });
      node.append(authors);
    }
  }
  return node;
}

function preview(blocks) {
  const parts = [];
  for (const block of blocks) {
    if (block.text) parts.push(block.text.map((part) => part.text).join(""));
    if (block.children) parts.push(preview(block.children));
    if (parts.join(" ").length > 220) break;
  }
  const value = parts.join(" ").trim();
  return value.length > 220 ? `${value.slice(0, 217)}...` : value;
}

function images(record, kind) {
  return kind === "members" ? record.photos : kind === "history" ? record.thumbnails : [];
}

function card(record, kind) {
  const article = element("article", `feed-card feed-card--${kind}`);
  const pictures = images(record, kind);
  if (pictures.length) article.append(photo(pictures[0], kind === "members" ? `Portrait of ${record.title}` : record.title, "feed-card__image"));
  const body = element("div", "feed-card__body");
  const heading = element("h2");
  const href = `${kind}.html?id=${encodeURIComponent(record.id)}`;
  heading.append(link(record.title, href));
  body.append(heading, metadata(record, kind));
  const excerpt = preview(record.content);
  if (excerpt) body.append(element("p", "feed-excerpt", excerpt));
  const action = link(`${FEEDS[kind].action} ${record.title}`, href);
  action.className = "feed-more";
  body.append(action);
  article.append(body);
  return article;
}

function detail(record, kind) {
  const article = element("article", `feed-detail feed-detail--${kind}`);
  const heading = element("h2", "", record.title);
  article.append(heading, metadata(record, kind));
  const pictures = images(record, kind);
  if (pictures.length) {
    const gallery = element("div", "feed-gallery");
    for (const picture of pictures) {
      gallery.append(photo(picture, kind === "members" ? `Portrait of ${record.title}` : record.title));
    }
    article.append(gallery);
  }
  const content = element("div", "feed-content");
  renderBlocks(content, record.content);
  article.append(content);
  return article;
}

const root = document.querySelector("[data-notion-feed]");
if (root) {
  const kind = root.dataset.notionFeed;
  requireValue(Object.hasOwn(FEEDS, kind));
  const config = FEEDS[kind];
  const status = root.querySelector("[data-feed-status]");
  const results = root.querySelector("[data-feed-results]");
  const retry = root.querySelector("[data-feed-retry]");

  async function load() {
    root.setAttribute("aria-busy", "true");
    status.textContent = `Loading ${config.label}...`;
    status.classList.remove("feed-status--error");
    retry.hidden = true;
    results.replaceChildren();
    try {
      const response = await fetch(`${API_BASE}/${kind}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`The ${kind} feed returned HTTP ${response.status}.`);
      const records = validateFeed(await response.json(), kind);
      const id = new URLSearchParams(location.search).get("id");
      if (id !== null) {
        results.append(link(`Back to all ${config.label}`, `${kind}.html`));
        const record = records.find((item) => item.id === id);
        if (record) {
          results.append(detail(record, kind));
          document.title = `${record.title} | Northern Lights Media`;
          status.textContent = "";
        } else {
          status.textContent = `This ${config.singular} is not available. It may have been unpublished or the link may be incorrect.`;
        }
      } else if (!records.length) {
        status.textContent = config.empty;
      } else {
        const grid = element("div", `feed-grid feed-grid--${kind}`);
        records.forEach((record) => grid.append(card(record, kind)));
        results.append(grid);
        status.textContent = `${records.length} ${records.length === 1 ? config.singular : config.plural}`;
      }
    } catch (error) {
      console.error(`NLM ${kind} feed could not be displayed`, error);
      results.replaceChildren();
      status.textContent = `We couldn't load ${config.label} right now. Please try again.`;
      status.classList.add("feed-status--error");
      retry.hidden = false;
    } finally {
      root.setAttribute("aria-busy", "false");
    }
  }
  retry.addEventListener("click", load);
  load();
}
