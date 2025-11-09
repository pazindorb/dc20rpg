import { openDaExportDialog } from './npc-pdf-export.mjs';

const SYSTEM_IDS = ['dc20rpg'];
const BTN_HEADER_CLASS = 'dc20-export-pdf-actor-btn';
const BTN_SHEET_CLASS = 'dc20-export-pdf-sheet-btn';

// Insert buttons on NPC sheets
Hooks.on('renderActorSheet', (app, html) => {
  const actor = app?.actor;
  if (!actor || actor.type !== 'npc') return;

  // Header button
  const winHeader = app.element?.find?.('.window-header');
  if (winHeader?.length && !winHeader.find(`.${BTN_HEADER_CLASS}`).length) {
    const btn = $(`
      <a class="${BTN_HEADER_CLASS}" style="display:flex;align-items:center;gap:4px;cursor:pointer;" 
         title="Export this NPC to a PDF statblock">
        <i class="fas fa-file-pdf"></i><span>PDF</span>
      </a>`);
    btn.on('click', ev => { 
      ev.preventDefault(); 
      ev.stopPropagation(); 
      openDaExportDialog(actor); 
    });

    const sheetBtn = winHeader.find('.configure-sheet, [data-action="configure"]').first();
    const tokenBtn = winHeader.find('.configure-token, [data-action="configure-token"]').first();
    
    if (sheetBtn.length) sheetBtn.after(btn);
    else if (tokenBtn.length) tokenBtn.before(btn);
    else winHeader.append(btn);
  }

  // Sheet header button
  const sheetHeader = html.find('.sheet-header');
  if (sheetHeader?.length && !sheetHeader.find(`.${BTN_SHEET_CLASS}`).length) {
    const sBtn = $(`
      <button type="button" class="${BTN_SHEET_CLASS}" 
              style="margin-left:8px;display:inline-flex;align-items:center;gap:4px;font-size:11px;" 
              title="PDF">
        <i class="fas fa-file-pdf"></i> PDF
      </button>`);
    sBtn.on('click', ev => { 
      ev.preventDefault(); 
      ev.stopPropagation(); 
      openDaExportDialog(actor); 
    });
    
    const nameField = sheetHeader.find('input[name="name"], .name').last();
    if (nameField?.length) nameField.after(sBtn);
    else sheetHeader.append(sBtn);
  }
});
