import { DefenseExpansion, escapeDaHtml, sanitizeDaHtml, get, cap } from './npc-pdf-utils.mjs';
import { classifyDaItems } from './npc-pdf-classify.mjs';
import { getDaItemApCost, getDaItemCustomCosts } from './npc-pdf-data.mjs';
import { buildDamageReductionLine, buildResistanceImmummenVulnerableity, buildConditionResixancesVulrbality, buildSensesAndOtherSpeeds, computeDaAttackCheck } from './npc-pdf-traits.mjs';

export function ensureDaStylesAreInjected() {
  const id = 'dc20-pdf-styles';
  if (document.getElementById(id)) return;
  const st = document.createElement('style');
  st.id = id;
  st.textContent = buildDaStyles();
  document.head.appendChild(st);
}

export function buildDaStyles() {
  // Note to self keep pdf A4 formatting just like crackly suggested
  return `
    :root{
      --ink:#111;
      --paper:#dddcd8;
      --frame:#3f2f6e;
      --frame-dark:#2a2147;
      --frame-light:#5a4a8f;
      --header:#4b3f73;
      --header-grad:#6a5aa6;
      --accent:#3b2c64;
    }
    *{box-sizing:border-box}
    .dc20-pdf-wrap{background:#ecebe7;color:var(--ink);font:14px/1.25 "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; position:relative; transform:none !important;}
    .dc20-pdf-wrap .page{width:724px;max-width:724px;margin:0 auto;padding:0 12px;}
    .dc20-pdf-wrap .statblock{border:4px solid var(--frame-dark);border-radius:14px;box-shadow:0 1px 0 1px var(--frame-light) inset;overflow:hidden;background:var(--paper);}
    .dc20-pdf-wrap .statblock .bar{background:linear-gradient(180deg,var(--header-grad),var(--header));color:#e9e7ee;padding:8px 12px 10px;border-bottom:3px solid var(--frame-dark);}
    .dc20-pdf-wrap .statblock .bar .bar-inner{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;}
    .dc20-pdf-wrap .statblock .bar .token-thumb{width:56px;height:56px;border-radius:8px;object-fit:cover;border:2px solid var(--frame-dark);background:#1b1733;}
    .dc20-pdf-wrap .statblock .bar .meta-chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;}
    .dc20-pdf-wrap .statblock .bar .chip{background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.25);border-radius:12px;padding:4px 8px;font-weight:800;font-size:12px;letter-spacing:.25px;}
    .dc20-pdf-wrap .statblock .bar .chip.lap{background:rgba(255,235,59,0.12);border-color:rgba(255,235,59,0.35);}
    .dc20-pdf-wrap .title{margin:0;font-family:"Georgia","Times New Roman",serif;text-transform:uppercase;letter-spacing:.5px;font-weight:900;font-size:26px;text-shadow:0 1px 0 rgba(0,0,0,.25);}
    .dc20-pdf-wrap .subtitle{margin:3px 0 0 2px;font-style:italic;font-size:13px;opacity:.95;}
    .dc20-pdf-wrap .pdf-content{padding:12px;background:var(--paper);display:block;}
    .dc20-pdf-wrap .row{display:grid;grid-template-columns:repeat(5,1fr);gap:0;border:2px solid var(--frame-dark);border-radius:6px;overflow:hidden;margin:8px 0 10px;}
    .dc20-pdf-wrap .cell{display:flex;flex-direction:column;border-right:1px solid var(--frame-dark);background:var(--paper);}
    .dc20-pdf-wrap .cell:last-child{border-right:none;}
    .dc20-pdf-wrap .th{background:#c5b9d2;color:#1b1733;font-weight:800;text-align:center;padding:4px 6px;border-bottom:1px solid var(--frame-dark);text-transform:uppercase;font-size:12px;}
    .dc20-pdf-wrap .td{text-align:center;padding:6px 6px 7px;font-weight:700;}
    .dc20-pdf-wrap .row.small .th{font-size:11px}
    .dc20-pdf-wrap .row.small .td{font-weight:800}
    .dc20-pdf-wrap .rule{border-top:2px solid var(--frame-dark);margin:10px 0;}
    .dc20-pdf-wrap .trait{margin:6px 0}
    .dc20-pdf-wrap .trait b{font-weight:900}
    .dc20-pdf-wrap .section-title{font-weight:900;text-transform:uppercase;margin:10px 0 6px;border-top:2px solid var(--frame-dark);padding-top:8px;font-size:16px;}
    .dc20-pdf-wrap ul.actions{margin:6px 0 0 18px;padding:0}
    .dc20-pdf-wrap ul.actions li{margin:8px 0}
    .dc20-pdf-wrap ul.actions b{font-weight:900}
    .dc20-pdf-wrap .ability-desc{margin:4px 0 0 0; font-weight:400;}
    .dc20-pdf-wrap .ability-desc p{margin:4px 0;}
    .dc20-pdf-wrap .footer-bar{height:8px;background:linear-gradient(180deg,var(--frame-light),var(--frame-dark));}

    @media print{
      .dc20-pdf-wrap .page{margin:0; max-width:unset; padding:0}
      body{background:#fff}
    }
  `;
}

export function buildMyStatblockHTML(actor, elId) {
  const name = actor.name || 'Unnamed Creature';
  const level = get(actor, 'system.details.level', 1);
  const type = cap(get(actor, 'system.details.creatureType', 'creature'));
  const size = cap(get(actor, 'system.size.size', 'medium'));
  const pd = Number(get(actor, 'system.defences.precision.normal', get(actor, 'system.defences.precision.value', 10))) || 10;
  const ad = Number(get(actor, 'system.defences.area.normal', get(actor, 'system.defences.area.value', 10))) || 10;
  const hp = Number(get(actor, 'system.resources.health.max', get(actor, 'system.resources.health.value', 1))) || 1;
  const spd = Number(get(actor, 'system.movement.ground.current', get(actor, 'system.movement.ground.value', 5))) || 5;
  const mig = Number(get(actor, 'system.attributes.mig.current', 1)) || 1;
  const agi = Number(get(actor, 'system.attributes.agi.current', 1)) || 1;
  const cha = Number(get(actor, 'system.attributes.cha.current', 1)) || 1;
  const intt = Number(get(actor, 'system.attributes.int.current', 0)) || 0;
  const roleRaw = get(actor, 'system.details.role', get(actor, 'system.details.category', ''));
  const role = roleRaw ? cap(String(roleRaw)) : '';
  const attackCheck = computeDaAttackCheck(actor);
  const saveDC = 10 + attackCheck;
  const apVal = Number(get(actor, 'system.resources.ap.value')) || 0;
  const lapVal = get(actor, 'system.resources.custom.lap.value', null);
  const subtitle = `${size} ${type} | Level ${level}${role ? ' ' + role : ''}`;

  const { features, actions, techniques, reactions } = classifyDaItems(actor);

  // Trait Lines
  const drLine = (typeof buildDamageReductionLine === 'function') ? buildDamageReductionLine(actor) : '';
  const dmgTypesLine = (typeof buildResistanceImmummenVulnerableity === 'function') ? buildResistanceImmummenVulnerableity(actor) : '';
  const condLine = (typeof buildConditionResixancesVulrbality === 'function') ? buildConditionResixancesVulrbality(actor) : '';
  const sensesSpeedsLine = (typeof buildSensesAndOtherSpeeds === 'function') ? buildSensesAndOtherSpeeds(actor) : '';

  return `
  <div class="page">
    <div id="${elId}" class="statblock">
      <div class="bar">
        <div class="bar-inner">
          <img class="token-thumb" src="${escapeDaHtml(actor?.prototypeToken?.texture?.src || actor?.img || 'icons/svg/mystery-man.svg')}" alt="token">
          <div class="name-wrap">
            <h1 class="title">${escapeDaHtml(name)}</h1>
            <div class="subtitle">${escapeDaHtml(subtitle)}</div>
          </div>
          <div class="meta-chips">
            <span class="chip">AP: ${apVal}</span>
            ${lapVal!=null ? `<span class="chip lap">LAP: ${lapVal}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="pdf-content">
        <!-- Main Statblock (6 columns) -->
        <div class="row" style="grid-template-columns:repeat(6,1fr)">
          <div class="cell">
            <div class="th">Hit Points</div>
            <div class="td">${hp}</div>
          </div>
          <div class="cell">
            <div class="th">PD</div>
            <div class="td">${DefenseExpansion(pd)}</div>
          </div>
          <div class="cell">
            <div class="th">AD</div>
            <div class="td">${DefenseExpansion(ad)}</div>
          </div>
          <div class="cell">
            <div class="th">Speed</div>
            <div class="td">${spd} spaces</div>
          </div>
          <div class="cell">
            <div class="th">Attack Check</div>
            <div class="td">${attackCheck}</div>
          </div>
          <div class="cell">
            <div class="th">Save DC</div>
            <div class="td">${saveDC}</div>
          </div>
        </div>

        <div class="row small" style="grid-template-columns:repeat(4,1fr)">
          <div class="cell">
            <div class="th">MIG</div>
            <div class="td">${mig}</div>
          </div>
          <div class="cell">
            <div class="th">AGI</div>
            <div class="td">${agi}</div>
          </div>
          <div class="cell">
            <div class="th">CHA</div>
            <div class="td">${cha}</div>
          </div>
          <div class="cell">
            <div class="th">INT</div>
            <div class="td">${intt}</div>
          </div>
        </div>

        ${drLine}
        ${dmgTypesLine}
        ${condLine}
        ${sensesSpeedsLine}

        ${features.length ? `
        <div class="section-title">Features</div>
        ${renderDaItemList(features, { showAp: false })}` : ''}

        ${actions.length ? `
        <div class="section-title">Actions</div>
        ${renderDaItemList(actions, { showAp: true })}` : ''}

        ${techniques.length ? `
        <div class="section-title">Attack Enhancements</div>
        ${renderDaItemList(techniques, { showAp: true })}` : ''}

        ${reactions.length ? `
        <div class="section-title">Reactions</div>
        ${renderDaItemList(reactions, { showAp: true })}` : ''}
      </div>
      <div class="footer-bar"></div>
    </div>
  </div>`;
}

// Render a list for items with optional AP and embedded descriptions
export function renderDaItemList(list, { showAp = false } = {}) {
  if (!list?.length) return '';
  const li = list.map(it => {
    const ap = showAp ? getDaItemApCost(it) : null;
    const custom = showAp ? getDaItemCustomCosts(it) : [];
    const parts = [];
    if (showAp && ap != null) parts.push(`${ap} AP`);
    for (const c of custom) parts.push(`${c.value} ${String(c.key || c.name).toUpperCase()}`);
    const suffix = parts.length ? ` (${parts.join(', ')})` : '';
    const rawDesc = get(it, 'system.description', '') || get(it, 'system.shortInfo', '');
    const desc = rawDesc ? `<div class="ability-desc">${sanitizeDaHtml(rawDesc)}</div>` : '';
    return `<li><b>${escapeDaHtml(it.name || 'Item')}${suffix}</b>${desc}</li>`;
  });
  return `<ul class="actions">${li.join('\n')}</ul>`;
}
