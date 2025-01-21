import { _applyDamageModifications } from "../chat/chat-utils.mjs";
import { promptRollToOtherPlayer } from "../dialogs/roll-prompt.mjs";
import { prepareCheckDetailsFor, prepareSaveDetailsFor } from "./actors/attrAndSkills.mjs";
import { applyDamage, applyHealing } from "./actors/resources.mjs";
import { getSelectedTokens } from "./actors/tokens.mjs";

export function expandEnrichHTML(oldFunction) {
  return (content, options={}) => {
    content = _parseInlineRolls(content);
    return oldFunction.call(TextEditor, content, options);
  }
}

export function registerGlobalInlineRollListener() {
  document.body.addEventListener('click', ev => {
    if (!ev.target.classList.contains('roll-inline')) return;

    ev.preventDefault();
    const data = ev.target.dataset;
    if (data.rollType === "formula") {
      _handleFormula(data)
      return;
    }
    
    const tokens = getSelectedTokens();
    if (tokens.length < 1) {
      ui.notifications.warn("You need to select at least one Token");
      return;
    }

    tokens.forEach(token => {
      switch(data.rollType) {
        case "save": _handleSave(data, token.actor); break;
        case "check": _handleCheck(data, token.actor); break;
        case "damage": _handleDamage(data, token.actor); break;
        case "heal": _handleHealing(data, token.actor); break;
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

async function _handleFormula(data) {
  const formula = data.value;
  const roll = new Roll(formula, {});
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

function _handleDamage(data, actor) {
  let dmg = {
    value: parseInt(data.value || 1),
    source: "Inline Roll",
    dmgType: data.subtype
  };
  dmg = _applyDamageModifications(dmg, actor.system.damageReduction);
  applyDamage(actor, dmg);
}

function _handleHealing(data, actor) {
  const heal = {
    source: "Inline Roll",
    value: parseInt(data.value || 1),
    healType: data.subtype
  };
  applyHealing(actor, heal);
}