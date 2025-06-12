import { promptRollToOtherPlayer } from "../dialogs/roll-prompt.mjs";
import { prepareCheckDetailsFor, prepareSaveDetailsFor } from "./actors/attrAndSkills.mjs";
import { applyDamage, applyHealing } from "./actors/resources.mjs";
import { getSelectedTokens } from "./actors/tokens.mjs";
import { calculateForTarget, tokenToTarget } from "./targets.mjs";

export function expandEnrichHTML(oldFunction) {
  return (content, options={}) => {
    if (options.autoLink) content = recognizeAndAddLinks(content);
    content = _parseInlineRolls(content);
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    return oldFunction.call(TextEditor, content, options);
  }
}

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
      }
    });
  })
}

function _parseInlineRolls(content) {
  if (!content) return content;

  const inlineRollRegex = /@(\w+)\[(\w+)\](?:{([^}]+)})?/g;
  const parsedHTML = content.replace(inlineRollRegex, (match, rollType, subtype, label) => {
    let icon = "fa-dice-d20";
    switch(rollType) {
      case "save": icon = "fa-shield"; break;
      case "check": icon = "fa-user-check"; break;
      case "damage": icon = "fa-droplet"; break;
      case "heal": icon = "fa-heart"; break;
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
  const saveDetails = prepareSaveDetailsFor(data.subtype);
  promptRollToOtherPlayer(actor, saveDetails);
}

function _handleCheck(data, actor) {
  const checkDetails = prepareCheckDetailsFor(data.subtype);
  promptRollToOtherPlayer(actor, checkDetails);
}

function _handleDamage(data, token) {
  let dmg = {
    value: parseInt(data.value || 1),
    source: "Inline Roll",
    type: data.subtype
  };
  const target = tokenToTarget(token);
  dmg = calculateForTarget(target, {clear: {...dmg}, modified: {...dmg}}, {isDamage: true});
  applyDamage(token.actor, dmg.modified);
}

function _handleHealing(data, token) {
  let heal = {
    source: "Inline Roll",
    value: parseInt(data.value || 1),
    type: data.subtype
  };
  const target = tokenToTarget(token);
  heal = calculateForTarget(target, {clear: {...heal}, modified: {...heal}}, {isHealing: true});
  applyHealing(token.actor, heal.modified);
}

export function recognizeAndAddLinks(text) {
  const jounralLinks = {
    ...CONFIG.DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.conditionsJournal,
    ...CONFIG.DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.basicActionsItems,
  }
  delete jounralLinks.attack;
  delete jounralLinks.object;
  delete jounralLinks.spell;
  delete jounralLinks.move;

  Object.entries(jounralLinks).forEach(([key, link]) => {
    const regex = new RegExp(`(?<!@UUID\\[.*?)\\b\\w*${escapeRegex(key)}\\w*\\b`, "gi");
    text = text.replace(regex, (match) => `@UUID[${link}]{${match}}`);
  });

  return text;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}