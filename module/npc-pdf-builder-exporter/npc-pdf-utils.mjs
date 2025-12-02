export const cap = (s='') => s.replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1));
export const rid = () => (foundry?.utils?.randomID ? foundry.utils.randomID() : Math.random().toString(36).slice(2, 10));
export const get = (o, p, d=undefined) => p.split('.').reduce((a, c) => (a && a[c] !== undefined ? a[c] : undefined), o) ?? d;

export async function Html2PDFisaWorking() {
  if (window.html2pdf) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    // Core PDF builder, aslo note: I locked the version so when update happens it shouldnt break core logic pdf export will still work, there is a version 0.12.1 but it broke things
    s.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';
    s.crossOrigin = 'anonymous';
    s.referrerPolicy = 'no-referrer';
    s.onload = () => resolve();
    s.onerror = e => reject(e);
    document.head.appendChild(s);
  });
}

// Derive PD/AD triplet (Normal/Heavy/Brutal) as +0/+5/+10 like th core rules or bestiary or other ones...
export function DefenseExpansion(defVal) {
  const n = Number(defVal) || 10;
  return `${n} / ${n + 5} / ${n + 10}`;
}

export function escapeDaHtml(s='') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Strip item uuids links and onyl use labels
export function stripThosePeskyFoundryUuidLinks(html='') {
  let out = String(html);
  out = out.replace(/@UUID\[[^\]]+\]\{([^}]+)\}/gi, '$1');
  out = out.replace(/@Compendium\[[^\]]+\]\{([^}]+)\}/gi, '$1');
  out = out.replace(/@UUID\[[^\]]+\]/gi, '');
  out = out.replace(/@Compendium\[[^\]]+\]/gi, '');
  return out;
}

// Lightweight sanitizer for embedded item descriptions
export function sanitizeDaHtml(html='') {
  try {
    // Strip Foundry link tokens down to labels
    html = stripThosePeskyFoundryUuidLinks(html);

    const tmp = document.createElement('div');
    tmp.innerHTML = String(html);
    // Remove risky nodes
    tmp.querySelectorAll('script,style,iframe,object,embed').forEach(n => n.remove());
    // Remove inline event handlers
    tmp.querySelectorAll('*').forEach(el => {
      for (const attr of Array.from(el.attributes)) {
        if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
      }
    });
    return tmp.innerHTML;
  } catch (_) {
    return escapeDaHtml(String(html));
  }
}

// Neutralize cross-origin images to prevent macOS "The operation is insecure" errors reported by chosen
export function isDaSameOrigiunUrl(u='') {
  try {
    const url = new URL(u, window.location.href);
    return url.origin === window.location.origin;
  } catch {
    return true; 
  }
}

export async function pleaseMacOsFixitIguess(root) {
  const createdUrls = [];
  const waiters = [];
  // 1x1 transparent gif
  const fallbackPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

  const imgs = root.querySelectorAll('img');
  imgs.forEach(img => {
    img.setAttribute('crossorigin', 'anonymous');
    const src = img.getAttribute('src') || '';
    if (!src || src.startsWith('data:') || src.startsWith('blob:') || isDaSameOrigiunUrl(src)) return;

    waiters.push((async () => {
      try {
        const abs = new URL(src, window.location.href).href;
        const res = await fetch(abs, { mode: 'cors', credentials: 'omit' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        createdUrls.push(objUrl);
        
        await new Promise(r => {
          const done = () => r();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          img.src = objUrl;
        });
      } catch (err) {
        console.warn('Failed to load cross-origin image:', src, err);
        img.src = fallbackPixel;
      }
    })());
  });

  await Promise.all(waiters);
  return () => { 
    createdUrls.forEach(u => URL.revokeObjectURL(u)); };
};

export function filenameFor(actor) {
  const base = (actor?.name || 'Creature').replace(/[^\w\-]+/g, '_');
  return `${base}_Statblock.pdf`;
}

// Progress popout while building the PDF
export function openDaProgressNotice() {
  const msg = "PDF is building please wait, this may take a bit 😄.";
  try {
    const popup = game?.dc20rpg?.tools?.getSimplePopup?.("info", { header: msg });
    return {
      close: () => {
        try {
          if (popup?.close) popup.close();
          else if (popup && typeof popup.then === "function") {
            popup.then(d => { try { d?.close?.(); } catch (_) {} });
          }
        } catch (_) {}
      }
    };
  } catch (_) {
    ui.notifications?.info(msg);
    return { close: () => {} };
  }
}
