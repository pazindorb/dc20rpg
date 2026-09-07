import DC20RpgActiveEffect from "../documents/activeEffect.mjs";
import { DC20Roll } from "../roll/rollApi.mjs";
import { RollDialog } from "../roll/rollDialog.mjs";
import { DC20Target } from "../subsystems/target/target.mjs";
import { getSelectedTokens } from "./actors/tokens.mjs";
import { getValueFromPath } from "./utils.mjs";

export function expandEnrichHTML(oldFunction) {
  return (content, options={}) => {
    if (options.autoLink) content = recognizeAndAddLinks(content);
    content = _parseInlineRolls(content);
    if(options.lookupObject) content = runObjectLookupAndCalc(content, options.lookupObject);
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    return oldFunction.call(TextEditor, content, options);
  }
}

//==========================================
//=              INLINE ROLL               =
//==========================================
export function registerGlobalInlineRollListener() {
  document.body.addEventListener('click', ev => {
    if (!ev.target.classList.contains('roll-inline')) return;

    ev.preventDefault();
    const data = ev.target.dataset;
    const tokens = getSelectedTokens();
    if (tokens.length < 1) {
      if (data.rollType === "roll") _handleRoll(data);
      else ui.notifications.warn("You need to select at least one Token");
      return;
    }

    tokens.forEach(token => {
      switch(data.rollType) {
        case "save": _handleSave(data, token.actor); break;
        case "check": _handleCheck(data, token.actor); break;
        case "damage": _handleDamage(data, token); break;
        case "heal": _handleHealing(data, token); break;
        case "roll":  _handleRoll(data, token); break;
        case "effect": _handleEffect(data, token); break;
        case "status": _handleStatus(data, token); break;
      }
    });
  })
}

export function runObjectLookupAndCalc(content, lookupObject) {
  if (!content) return content;
  const lookupRegex = /@lookup\(([^)]+)\)/g;
  const calcRegex = /@calc\(((?:[^()]|\([^()]*\))*)\)/g;

  let parsedHTML = content.replace(lookupRegex, (match, path) => {
    const value = getValueFromPath(lookupObject, path);
    if (value != null) return value;
    return match;
  })
  parsedHTML = parsedHTML.replace(calcRegex, (match, formula) => {
    try { return Roll.safeEval(formula);} 
    catch { return match; }
  })
  return parsedHTML;
}

function _parseInlineRolls(content) {
  if (!content) return content;

  const inlineRollRegex = /@(?!UUID\[)(\w+)\[([\w.]+)\](?:{([^}]+)})?/g;
  const parsedHTML = content.replace(inlineRollRegex, (match, rollType, subtype, label) => {
    let icon = "fa-dice-d20";
    switch(rollType) {
      case "save": icon = "fa-shield"; break;
      case "check": icon = "fa-user-check"; break;
      case "damage": icon = "fa-droplet"; break;
      case "heal": icon = "fa-heart"; break;
      case "effect": icon = "fa-bolt"; break;
      case "status": icon = "fa-bolt"; break;
    }

    let value = "";
    if (label && label.startsWith("&lt;")) {
      const decodedLabel = label.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
      value = decodedLabel.match(/<([^>]*)>/)?.[1];
      label = decodedLabel.replace(/<[^>]*>/g, "").trim();
    }
    return `<a class="content-link roll-inline" data-roll-type="${rollType}" data-subtype="${subtype}" data-value="${value}"><i class="fa-solid ${icon}"></i> ${label || subtype}</a>`;
  })
  return parsedHTML;
}

async function _handleRoll(data, token) {
  const rollData = token ? token.actor.getRollData() : {};
  const formula = data.value;
  const roll = new Roll(formula, rollData);
  await roll.evaluate()
  roll.toMessage()
}

function _handleSave(data, actor) {
  RollDialog.open(actor, DC20Roll.prepareSaveDetails(data.subtype), {sendToActorOwners: true});
}

function _handleCheck(data, actor) {
  RollDialog.open(actor, DC20Roll.prepareCheckDetails(data.subtype), {sendToActorOwners: true});
}

function _handleDamage(data, token) {
  let dmg = {
    value: parseInt(data.value || 1),
    source: "Inline Roll",
    type: data.subtype
  };
  DC20Target.quickApplyDamageFor(token.actor, dmg);
}

function _handleHealing(data, token) {
  let heal = {
    source: "Inline Roll",
    value: parseInt(data.value || 1),
    type: data.subtype
  };
  DC20Target.quickApplyHealingFor(token.actor, heal);
}

async function _handleEffect(data, token) {
  const effect = await fromUuid(data.subtype);
  if (effect) {
    const effectData = effect.toObject();
    DC20RpgActiveEffect.gmCreate(effectData, {parent: token.actor});
  }
}

function _handleStatus(data, token) {
  token.actor.toggleStatusEffect(data.subtype, {active: true});
}

//==========================================
//=               AUTO LINK                =
//==========================================
const EXCLUDE = new Set(["attack","object","spell","move","jump","throw"]);
const UUID_TOKEN_RE = /@UUID\[[^\]]+]\{[^}]*}/g;

const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

let WORD_WITH_KEY_RE = null;
let CAPTURE_TO_LINK = [];

// Call this once after CONFIG is ready (e.g., on init)
export function initJournalLinker() {
  const raw = {
    ...CONFIG.DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.conditionsJournal,
    ...CONFIG.DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.basicActionItems
  };

  const entries = Object.entries(raw).filter(([k]) => !EXCLUDE.has(k));

  // Sort longer first so 'fullyStunned' wins over 'stunned'
  const ordered = entries
    .map(([k, v]) => ({ k, v }))
    .sort((a, b) => b.k.length - a.k.length);

  CAPTURE_TO_LINK = [];
  const alternation = ordered
    .map(({ k, v }, idx) => {
      CAPTURE_TO_LINK[idx] = v;             // capture group idx → UUID
      return `(${escapeRegex(k)})`;         // <-- each key gets its own capture
    })
    .join("|");

  // Match a whole word that *contains* any key, case-insensitive
  WORD_WITH_KEY_RE = new RegExp(`(?<!\\[)\\b\\w*(?:${alternation})\\w*\\b(?!\\])`, "gi");
}

// ---------- main ----------
export function recognizeAndAddLinks(text) {
  if (!text) return text;
  if (!WORD_WITH_KEY_RE) initJournalLinker(); // lazy init if needed

  let out = "";
  let lastIndex = 0;

  // Copy existing @UUID[...] tokens as-is, process only the text outside them
  for (const m of text.matchAll(UUID_TOKEN_RE)) {
    const start = m.index;
    const end = start + m[0].length;
    if (start > lastIndex) out += replaceOutside(text.slice(lastIndex, start));
    out += m[0];
    lastIndex = end;
  }
  if (lastIndex < text.length) out += replaceOutside(text.slice(lastIndex));

  return out;
}

function replaceOutside(chunk) {
  return chunk.replace(WORD_WITH_KEY_RE, function (match, ...args) {
    // args = [g1, g2, ..., gN, offset, input, groups]
    const N = CAPTURE_TO_LINK.length;
    for (let i = 0; i < N; i++) {
      if (args[i] !== undefined) {
        const link = CAPTURE_TO_LINK[i];
        return `@UUID[${link}]{${match}}`;
      }
    }
    return match; // safety fallback
  });
}
