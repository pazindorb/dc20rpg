import { get, cap, escapeDaHtml } from './npc-pdf-utils.mjs';

export function buildResitanxeImmuneTraits(actor) {
  const dts = get(actor, 'system.damageReduction.damageTypes', {});
  const immune = [];
  const resist = [];
  for (const k of Object.keys(dts)) {
    const row = dts[k] || {};
    if (row.immune) immune.push(cap(k));
    else if (row.resistance) resist.push(cap(k));
  }
  const parts = [];
  if (immune.length) parts.push(`<i>${immune.join(', ')} Immune</i>`);
  if (resist.length) parts.push(`<i>${resist.join(', ')} Resistant</i>`);
  return parts.length ? `<div class="trait">${parts.join(' • ')}</div>` : '';
}

// Compute Attack Check = ceil(level/2) + highest attribute (I know this may need to be changed or may need an overide because of value checks)
export function computeDaAttackCheck(actor) {
  const lvl = Number(get(actor, 'system.details.level', 1)) || 1;
  const mig = Number(get(actor, 'system.attributes.mig.current', 1)) || 1;
  const agi = Number(get(actor, 'system.attributes.agi.current', 1)) || 1;
  const cha = Number(get(actor, 'system.attributes.cha.current', 1)) || 1;
  const intt = Number(get(actor, 'system.attributes.int.current', 0)) || 0;
  const highest = Math.max(mig, agi, cha, intt);
  return Math.ceil(lvl / 2) + highest;
}

// Build Resistances/Immunities and Vulnerabilities listing
export function buildResistanceImmummenVulnerableity(actor) {
  const dts = get(actor, 'system.damageReduction.damageTypes', {}) || {};
  const immunities = [];
  const resistances = [];
  const vulnerabilities = [];

  for (const k of Object.keys(dts)) {
    const row = dts[k] || {};
    const typeName = cap(k);

    const isImmune = !!row.immune;

    // Resistance fields
    const resBool = !!row.resistance;
    const resVal = Number(row.resist ?? row.value ?? row.amount ?? row.resistanceValue ?? 0) || 0;
    const vulBool = (row.vulnerability === true || row.vulnerable === true);
    const vulVal = (() => {
      if (typeof row.vulnerable === 'number' || typeof row.vulnerable === 'string') return Number(row.vulnerable) || 0;
      if (typeof row.vulnerability === 'number' || typeof row.vulnerability === 'string') return Number(row.vulnerability) || 0;
      return 0;
    })();

    if (isImmune) {
      immunities.push(`${typeName} (Immune)`);
      continue;
    }

    // Resistance formatting
    if (resBool || resVal > 0) {
      const parts = [];
      if (resVal > 0) parts.push(`${typeName} Resistance (${resVal})`);
      if (resBool) parts.push(`${resVal > 0 ? '+ ' : ''}(Half)`);
      if (parts.length === 2) resistances.push(`${parts[0]} ${parts[1]}`);
      else if (resVal > 0) resistances.push(parts[0]);
      else resistances.push(`${typeName} (Half)`);
    }

    // Vulnerability formatting
    if (vulBool || vulVal > 0) {
      const parts = [];
      if (vulVal > 0) parts.push(`${typeName} Vulnerable (${vulVal})`);
      if (vulBool) parts.push(`${vulVal > 0 ? '+ ' : ''}(Half)`);
      if (parts.length === 2) vulnerabilities.push(`${parts[0]} ${parts[1]}`);
      else if (vulVal > 0) vulnerabilities.push(parts[0]);
      else vulnerabilities.push(`${typeName} (Half)`);
    }
  }

  const left = []
    .concat(immunities.length ? [immunities.join(', ')] : [])
    .concat(resistances.length ? [resistances.join(', ')] : [])
    .join(' • ') || 'None';
  const right = vulnerabilities.length ? vulnerabilities.join(', ') : 'None';

  return `<div class="trait"><b>Resistances/Immunities:</b> ${escapeDaHtml(left)} | <b>Vulnerabilities:</b> ${escapeDaHtml(right)}</div>`;
}

// Condition Resistances/Immunities and Vulnerabilities (ADV/DisADV notation was a bug not anymore)
export function buildConditionResixancesVulrbality(actor) {
  const sr = get(actor, 'system.statusResistances', {}) || {};
  const imm = [];
  const res = [];
  const vul = [];

  for (const k of Object.keys(sr)) {
    const row = sr[k] || {};
    const name = cap(k);
    const isImmune = !!row.immunity;
    const resVal = Number(row.resistance ?? row.advantage ?? 0) || 0;
    const vulVal = Number(row.vulnerability ?? row.disadvantage ?? 0) || 0;

    if (isImmune) {
      imm.push(`${name} (Immune)`);
      continue;
    }
    if (resVal > 0) res.push(`${name} ADV (${resVal})`);
    if (vulVal > 0) vul.push(`${name} DisADV (${vulVal})`);
  }

  const left = []
    .concat(imm.length ? [imm.join(', ')] : [])
    .concat(res.length ? [res.join(', ')] : [])
    .join(' • ') || 'None';
  const right = vul.length ? vul.join(', ') : 'None';

  return `<div class="trait"><b>Condition Resistances/Immunities:</b> ${escapeDaHtml(left)} | <b>Condition Vulnerabilities:</b> ${escapeDaHtml(right)}</div>`;
}

// Senses and other movement speeds
export function buildSensesAndOtherSpeeds(actor) {
  const senses = get(actor, 'system.senses', {}) || {};
  const senseMap = { darkvision: 'Darkvision', blindsight: 'Blindsight', tremorsense: 'Tremorsense', truesight: 'Truesight' };
  const senseParts = [];
  for (const key of Object.keys(senseMap)) {
    const r = Number(get(senses, `${key}.range`, 0)) || 0;
    if (r > 0) senseParts.push(`${senseMap[key]} ${r}`);
  }
  const sensesStr = senseParts.length ? senseParts.join(', ') : 'None';

  const mv = get(actor, 'system.movement', {}) || {};
  const mMap = { climbing: 'Climb', swimming: 'Swim', burrow: 'Burrow', glide: 'Glide', flying: 'Fly' };
  const spdParts = [];
  for (const key of Object.keys(mMap)) {
    const cur = Number(get(mv, `${key}.current`, get(mv, `${key}.value`, 0))) || 0;
    if (cur > 0) spdParts.push(`${mMap[key]} ${cur}`);
  }
  const jump = Number(get(actor, 'system.jump.value', get(actor, 'system.jump.current', 0))) || 0;
  if (jump > 0) spdParts.push(`Jump ${jump}`);
  const otherStr = spdParts.length ? spdParts.join(', ') : 'None';

  return `<div class="trait"><b>Senses:</b> ${escapeDaHtml(sensesStr)} | <b>Other Speeds:</b> ${escapeDaHtml(otherStr)}</div>`;
}

// Damage Reduction
export function buildDamageReductionLine(actor) {
  const drRoot = get(actor, 'system.damageReduction', {}) || {};
  const order = ['pdr', 'mdr', 'edr'];
  const keys = [
    ...order.filter(k => drRoot[k] != null),
    ...Object.keys(drRoot).filter(k => !order.includes(k))
  ];

  const acronymMap = { pdr: 'PDR', mdr: 'MDR', edr: 'EDR' };
  const active = [];
  for (const k of keys) {
    const row = drRoot[k];
    if (!row || typeof row !== 'object') continue;
    const isActive = row.active === true || row.value === true;
    if (!isActive) continue;
    const name = acronymMap[k] || String(k).toUpperCase();
    active.push(`${name} Active`);
  }

  if (!active.length) return '';
  return `<div class="trait"><b>Damage Reduction:</b> ${escapeDaHtml(active.join(' • '))}</div>`;
}
