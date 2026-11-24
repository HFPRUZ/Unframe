const api = globalThis.browser ?? globalThis.chrome;

// Dominios de reproductores de vídeo conocidos. Añade aquí los que uses.
const VIDEO_HOSTS = [
  "streamtape", "streamwish", "hgcloud", "voe.", "filemoon", "bysekoze",
  "mixdrop", "mp4upload", "dood", "dsvplay", "mega.nz", "mega.io",
  "vidhide", "streamhub", "uqload", "yourupload", "okru", "ok.ru",
  "fembed", "vidoza", "upstream", "swiftplayers", "sendvid", "vk.com/video"
];

const $results = document.getElementById("results");
const $others = document.getElementById("others");
const $toggle = document.getElementById("toggle-others");
const $summary = document.getElementById("summary");
const $status = document.getElementById("status");
const $best = document.getElementById("open-best");

/**
 * Se inyecta en la página y en sus frames, por eso debe ser autocontenida.
 * Busca:
 *  1. <iframe> (src / data-src), decodificando parámetros en base64.
 *  2. <video> y <source>.
 *  3. Enlaces de servidores escondidos en los <script> de la página
 *     (en texto plano o en base64), aunque el iframe aún no esté cargado.
 */
function scanPage(hosts) {
  const found = [];
  const seen = new Set();
  const isKnown = (u) => hosts.some((h) => u.toLowerCase().includes(h));

  const add = (raw, type, html) => {
    try {
      const url = new URL(raw, location.href).href;
      if (!/^https?:/i.test(url) || seen.has(url)) return;
      seen.add(url);
      found.push({ url, type, html: html || "" });
    } catch (_) { /* url inválida */ }
  };

  const fromBase64 = (value) => {
    try {
      const d = atob(value.replace(/ /g, "+")).trim();
      return /^https?:\/\/[^\s]+$/i.test(d) ? d : null;
    } catch (_) { return null; }
  };

  const decodeParam = (raw) => {
    try {
      const u = new URL(raw, location.href);
      for (const [, value] of u.searchParams) {
        const d = fromBase64(value);
        if (d) return d;
      }
    } catch (_) { /* ignorar */ }
    return null;
  };

  const iframeHtml = (u) =>
    `<iframe width="100%" height="100%" src="${u}" frameborder="0" allowfullscreen></iframe>`;

  document.querySelectorAll("iframe").forEach((f) => {
    const src = f.getAttribute("src") || f.getAttribute("data-src") || "";
    if (!src || src.startsWith("about:") || src.startsWith("javascript:")) return;
    const decoded = decodeParam(src);
    if (decoded) add(decoded, "decoded", iframeHtml(decoded));
    add(src, "iframe", f.outerHTML);
  });

  document.querySelectorAll("video").forEach((v) => {
    if (v.currentSrc || v.src) add(v.currentSrc || v.src, "video", v.outerHTML);
    v.querySelectorAll("source[src]").forEach((s) => add(s.src, "video", s.outerHTML));
  });

  document.querySelectorAll("script:not([src])").forEach((s) => {
    const text = s.textContent || "";
    if (text.length > 2_000_000) return;

    for (const m of text.matchAll(/https?:\/\/[^\s"'<>\\)]+/g)) {
      if (isKnown(m[0])) add(m[0], "script", iframeHtml(m[0]));
    }
    for (const m of text.matchAll(/[A-Za-z0-9+/]{24,}={0,2}/g)) {
      const d = fromBase64(m[0]);
      if (d && isKnown(d)) add(d, "script", iframeHtml(d));
    }
  });

  return found;
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch (_) { return url; }
}

function isVideoHost(url) {
  const u = url.toLowerCase();
  return VIDEO_HOSTS.some((k) => u.includes(k));
}

function isVideo(item) { return item.type === "video" || isVideoHost(item.url); }

function score(item) {
  let s = 0;
  if (isVideoHost(item.url)) s += 4;
  if (item.type === "decoded") s += 3;
  if (item.type === "script") s += 2;
  if (item.type === "video") s += 5;
  if (item.type === "iframe") s += 1;
  return s;
}

const LABELS = {
  decoded: "enlace directo",
  script: "servidor detectado",
  iframe: "iframe de la página"
};

function setStatus(msg) {
  $status.textContent = msg;
  if (msg) setTimeout(() => { if ($status.textContent === msg) $status.textContent = ""; }, 2500);
}

async function copy(text, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
    setStatus(okMsg);
  } catch (_) {
    setStatus("No se pudo copiar");
  }
}

function openUrl(url) {
  api.tabs.create({ url });
  window.close();
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  return n;
}

function makeCard(item, isBest) {
  const card = el("div", "card" + (isBest ? " best" : ""));

  const top = el("div", "card-top");
  top.appendChild(el("span", "host", hostOf(item.url)));
  if (isVideo(item)) top.appendChild(el("span", "badge video", "vídeo"));
  if (LABELS[item.type]) top.appendChild(el("span", "badge", LABELS[item.type]));

  const url = el("div", "url", item.url);
  url.title = item.url;

  const actions = el("div", "actions");

  const open = el("button", "open", "Abrir");
  open.onclick = () => openUrl(item.url);

  const copyLink = el("button", "", "Copiar enlace");
  copyLink.onclick = () => copy(item.url, "Enlace copiado");

  const copyHtml = el("button", "", "Copiar iframe");
  copyHtml.onclick = () =>
    copy(item.html || `<iframe src="${item.url}" allowfullscreen></iframe>`, "Iframe copiado");

  actions.append(open, copyLink, copyHtml);
  card.append(top, url, actions);
  return card;
}

async function scan() {
  $results.textContent = "";
  $others.textContent = "";
  $others.hidden = true;
  $toggle.hidden = true;
  $best.hidden = true;
  $summary.textContent = "";
  setStatus("Buscando…");

  const items = [];
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    const injections = await api.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: scanPage,
      args: [VIDEO_HOSTS]
    });
    const seen = new Set();
    for (const r of injections) {
      for (const it of r.result || []) {
        if (!seen.has(it.url)) { seen.add(it.url); items.push(it); }
      }
    }
  } catch (err) {
    setStatus("No se puede analizar esta página");
    return;
  }

  if (!items.length) {
    $summary.textContent = "No se encontró ningún vídeo incrustado en esta página.";
    setStatus("");
    return;
  }

  items.sort((a, b) => score(b) - score(a));
  const videos = items.filter(isVideo);
  const others = items.filter((i) => !isVideo(i));
  const main = videos.length ? videos : items;
  const rest = videos.length ? others : [];

  $best.hidden = false;
  $best.onclick = () => openUrl(main[0].url);
  $summary.textContent = `${main.length} reproductor${main.length === 1 ? "" : "es"} encontrado${main.length === 1 ? "" : "s"}`;
  main.forEach((it, i) => $results.appendChild(makeCard(it, i === 0)));

  if (rest.length) {
    rest.forEach((it) => $others.appendChild(makeCard(it, false)));
    $toggle.hidden = false;
    $toggle.textContent = `Mostrar otros enlaces (${rest.length})`;
    $toggle.onclick = () => {
      $others.hidden = !$others.hidden;
      $toggle.textContent = $others.hidden
        ? `Mostrar otros enlaces (${rest.length})`
        : "Ocultar otros enlaces";
    };
  }
  setStatus("");
}

document.getElementById("rescan").addEventListener("click", scan);
scan();
