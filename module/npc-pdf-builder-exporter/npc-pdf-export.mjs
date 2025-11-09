import { rid, Html2PDFisaWorking, filenameFor, pleaseMacOsFixitIguess, openDaProgressNotice } from './npc-pdf-utils.mjs';
import { ensureDaStylesAreInjected, buildMyStatblockHTML } from './npc-pdf-render.mjs';

export async function openDaExportDialog(actor) {
  // Export
  let progress = null;
  let revokeImages = null;
  try {
    // Show progress popout immediately
    progress = openDaProgressNotice();

    ensureDaStylesAreInjected();
    await Html2PDFisaWorking();

    const elId = `pdf-content-${rid()}`;
    const wrap = document.createElement('div');
    wrap.id = `dc20-pdf-wrap-${elId}`;
    wrap.className = 'dc20-pdf-wrap';
    wrap.innerHTML = buildMyStatblockHTML(actor, elId);

    // Invisible on-screen staging to avoid clipping
    const staging = document.createElement('div');
    staging.style.position = 'fixed';
    staging.style.left = '0';
    staging.style.top = '0';
    staging.style.zIndex = '-1';
    staging.style.opacity = '0';
    staging.style.pointerEvents = 'none';
    staging.appendChild(wrap);
    document.body.appendChild(staging);

    // Enforce safe A4 content width
    const page = wrap.querySelector('.page');
    if (page) {
      page.style.width = '724px';
      page.style.maxWidth = '724px';
      page.style.margin = '0 auto';
    }

    // Ensure layout is computed so we can measure height
    await new Promise(r => requestAnimationFrame(r));

    // If the statblock is taller than a single PDF page, scale it down a bit
    if (page) {
      const maxHeightPx = 1030; // ~A4 drawable area in px (after margins)
      const actualHeight = page.scrollHeight;
      if (actualHeight > maxHeightPx) {
        const scale = Math.max(0.75, maxHeightPx / actualHeight); // don't go below 75% for readability
        page.style.transformOrigin = 'top left';
        page.style.transform = `scale(${scale})`;
      }
    }

    // Neutralize cross-origin images macOS fix reported by chosen
    revokeImages = await pleaseMacOsFixitIguess(wrap);

    const options = {
      margin: [18, 18, 18, 18],
      filename: filenameFor(actor),
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: Math.max(2, window.devicePixelRatio || 1),
        useCORS: true,
        backgroundColor: '#ecebe7',
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    await window.html2pdf().set(options).from(wrap).save();
    staging.remove();
  } catch (e) {
    console.error('[DC20 PDF Export] Failed to export PDF', e);
    ui.notifications?.error('PDF export failed (see console).');
  } finally {
    progress?.close();
    revokeImages?.();
  }
}
