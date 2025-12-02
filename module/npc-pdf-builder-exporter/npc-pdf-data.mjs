import { get, cap } from './npc-pdf-utils.mjs';

// Extract AP cost from item
export function getDaItemApCost(item) {
  const ap = get(item, 'system.costs.resources.actionPoint');
  if (ap != null) return ap;

  // Techniques bug fix
  const enh = get(item, 'system.enhancements');
  if (enh && typeof enh === 'object') {
    for (const key of Object.keys(enh)) {
      const row = enh[key] || {};
      const res = row.resources || {};
      const candidates = [
        res.ap,
        res?.ap?.value,
        res.actionPoint,
        res?.actionPoint?.value,
        row.ap,
        row?.ap?.value
      ];
      for (const c of candidates) {
        const n = Number(c);
        if (Number.isFinite(n) && n > 0) return n;
      }
    }
  }
  return null;
}

// Extract custom resource costs, e.g. system.costs.resources.custom.lap
export function getDaItemCustomCosts(item) {
  const customRoot = get(item, 'system.costs.resources.custom');
  const out = [];
  if (customRoot && typeof customRoot === 'object') {
    for (const key of Object.keys(customRoot)) {
      const row = customRoot[key];
      if (!row) continue;
      const value = Number(row.value ?? row.cost ?? row.amount ?? 0);
      if (Number.isFinite(value) && value > 0) {
        out.push({ key, name: row.name || key.toUpperCase(), value });
      }
    }
  }

  // Attack Enhancements bug fix turns out my resource detection was wrong and is different for techniques
  const enh = get(item, 'system.enhancements');
  if (enh && typeof enh === 'object') {
    for (const key of Object.keys(enh)) {
      const row = enh[key] || {};
      const custom = get(row, 'resources.custom');
      if (custom && typeof custom === 'object') {
        for (const cKey of Object.keys(custom)) {
          const cRow = custom[cKey];
          if (!cRow) continue;
          const value = Number(cRow.value ?? cRow.cost ?? cRow.amount ?? 0);
          if (Number.isFinite(value) && value > 0) {
            out.push({ key: cKey, name: cRow.name || cKey.toUpperCase(), value });
          }
        }
      }
    }
  }
  return out;
}

// Extract first damage (value + type) from system.formulas
export function getDaItemDamageSummary(item) {
  const f = get(item, 'system.formulas');
  if (f && typeof f === 'object') {
    for (const k of Object.keys(f)) {
      const row = f[k];
      if (row && (row.category === 'damage' || typeof row === 'object')) {
        const value = (row.formula ?? row.value ?? '').toString().trim();
        const type = (row.type ?? '').toString().trim();
        if (value && /^\d+$/.test(value)) {
          return { value, type };
        }
      }
    }
  }
}

export function getDaTargetDefences(item) {
  const t = (get(item, 'system.attackFormula.targetDefence') || '').toString();
  if (t === 'area') return 'AD';
  return 'PD';
}

// Simple helper used by buildDaActionsList (kept with data-related helpers)
export function buildDaActionsList(actor) {
  // Take feature type items for actions
  const items = actor.items.filter(i => i.type === 'feature');
  if (!items.length) return '<i>No actions</i>';
  const li = [];
  for (const it of items) {
    const ap = getDaItemApCost(it);
    const dmg = getDaItemDamageSummary(it);
    const tgt = getDaTargetDefences(it);
    const name = it.name || 'Action';
    const apText = ap != null ? ` (${ap} AP)` : '';
    let detail = '';
    if (dmg) {
      if (tgt === 'AD') detail = `Attack Check against Target's AD. On Hit, target takes ${dmg.value}${dmg.type ? ' ' + cap(dmg.type) : ''} Damage`;
      else detail = `Attack Check against Target's PD. On Hit, target takes ${dmg.value}${dmg.type ? ' ' + cap(dmg.type) : ''} Damage`;
    } else {
      // ShortInfo or strip minimal tags from description
      const shortInfo = get(it, 'system.shortInfo');
      if (shortInfo) detail = shortInfo;
      else {
        const desc = (get(it, 'system.description', '') || '').toString().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        detail = desc || 'Special action';
      }
    }
    li.push(`<li><b>${escapeDaHtml(name)}${apText}:</b> ${escapeDaHtml(detail)}</li>`);
  }
  return `<ul class="actions">${li.join('\n')}</ul>`;
}
