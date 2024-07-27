import { characterConfigDialog } from "../../dialogs/character-config.mjs";
import { createRestDialog } from "../../dialogs/rest.mjs";
import { createVariableRollDialog } from "../../dialogs/variable-attribute-picker.mjs";
import * as skills from "../../helpers/actors/attrAndSkills.mjs";
import { changeCurrentCharges, refreshAllActionPoints, regainBasicResource, subtractAP, subtractBasicResource } from "../../helpers/actors/costManipulator.mjs";
import { changeLevel, createNewTable, deleteItemFromActor, editItemOnActor, getItemFromActor, openItemCompendium, removeCustomTable, reorderTableHeaders } from "../../helpers/actors/itemsOnActor.mjs";
import { changeResourceIcon, createNewCustomResource, removeResource } from "../../helpers/actors/resources.mjs";
import { rollForInitiative, rollFromAction, rollFromItem, rollFromSheet } from "../../helpers/actors/rollsFromActor.mjs";
import { createEffectOn, deleteEffectOn, editEffectOn, getEffectFrom, toggleConditionOn, toggleEffectOn } from "../../helpers/effects.mjs";
import { datasetOf, valueOf } from "../../helpers/events.mjs";
import { changeActivableProperty, changeNumericValue, changeValue, toggleUpOrDown } from "../../helpers/utils.mjs";
import { createItemDialog } from "../../dialogs/create-item.mjs"
import { effectTooltip, enhTooltip, hideTooltip, itemTooltip, journalTooltip, textTooltip } from "../../helpers/tooltip.mjs";
import { resourceConfigDialog } from "../../dialogs/resource-config.mjs";

export function activateCommonLinsters(html, actor) {
  // Core funcionalities
  html.find(".activable").click(ev => changeActivableProperty(datasetOf(ev).path, actor));
  html.find(".item-activable").click(ev => changeActivableProperty(datasetOf(ev).path, getItemFromActor(datasetOf(ev).itemId, actor)));
  html.find('.rollable').click(ev => _onRollable(ev, actor));
  html.find('.roll-item').click(ev => rollFromItem(datasetOf(ev).itemId, actor, true));
  html.find('.toggle-item-numeric').mousedown(ev => toggleUpOrDown(datasetOf(ev).path, ev.which, getItemFromActor(datasetOf(ev).itemId, actor), (datasetOf(ev).max || 9), 0));
  html.find('.toggle-actor-numeric').mousedown(ev => toggleUpOrDown(datasetOf(ev).path, ev.which, actor, (datasetOf(ev).max || 9), 0));
  html.find('.change-item-numeric-value').change(ev => changeNumericValue(valueOf(ev), datasetOf(ev).path, getItemFromActor(datasetOf(ev).itemId, actor)));
  html.find('.change-actor-numeric-value').change(ev => changeNumericValue(valueOf(ev), datasetOf(ev).path, actor));
  html.find('.update-charges').change(ev => changeCurrentCharges(valueOf(ev), getItemFromActor(datasetOf(ev).itemId, actor)));
  html.find(".roll-action").click(ev => rollFromAction(actor, datasetOf(ev).name, datasetOf(ev).label, datasetOf(ev).apCost, datasetOf(ev).type, datasetOf(ev).formula, datasetOf(ev).description));

  // Items 
  html.find('.item-create').click(ev => createItemDialog(datasetOf(ev).tab, actor));
  html.find('.item-delete').click(ev => deleteItemFromActor(datasetOf(ev).itemId, actor));
  html.find('.item-edit').click(ev => editItemOnActor(datasetOf(ev).itemId, actor));
  html.find('.editable').mousedown(ev => ev.which === 2 ? editItemOnActor(datasetOf(ev).itemId, actor) : ()=>{});
  html.find(".reorder").click(ev => reorderTableHeaders(datasetOf(ev).tab, datasetOf(ev).current, datasetOf(ev).swapped, actor));
  html.find('.table-create').click(ev => createNewTable(datasetOf(ev).tab, actor));
  html.find('.table-remove').click(ev => removeCustomTable(datasetOf(ev).tab, datasetOf(ev).table, actor));
  html.find('.select-other-item').change(ev => changeValue($(`.${datasetOf(ev).selector} option:selected`).val(), datasetOf(ev).path, getItemFromActor(datasetOf(ev).itemId, actor)));
  html.find('.select-other-item').click(ev => {ev.preventDefault(); ev.stopPropagation()});
  html.find('.item-multi-faceted').click(ev => {ev.stopPropagation(); getItemFromActor(datasetOf(ev).itemId, actor).swapMultiFaceted()});
  html.find('.open-compendium').click(ev => openItemCompendium(datasetOf(ev).itemType));
  
  // Resources
  html.find(".use-ap").click(() => subtractAP(actor, 1));
  html.find(".regain-ap").click(() => refreshAllActionPoints(actor));
  html.find(".regain-resource").click(ev => regainBasicResource(datasetOf(ev).key, actor, datasetOf(ev).amount, datasetOf(ev).boundary));
  html.find(".spend-resource").click(ev => subtractBasicResource(datasetOf(ev).key, actor, datasetOf(ev).amount, datasetOf(ev).boundary));

  // Custom Resources
  html.find(".add-custom-resource").click(() => createNewCustomResource("New Resource", actor));
  html.find('.edit-resource').click(ev => resourceConfigDialog(actor, datasetOf(ev).key));
  html.find(".remove-resource").click(ev => removeResource(datasetOf(ev).key, actor));
  html.find('.resource-icon').on('imageSrcChange', ev => changeResourceIcon(ev, actor));

  // Active Effects
  html.find(".effect-create").click(ev => createEffectOn(datasetOf(ev).type, actor));
  html.find(".effect-toggle").click(ev => toggleEffectOn(datasetOf(ev).effectId, actor));
  html.find(".effect-edit").click(ev => editEffectOn(datasetOf(ev).effectId, actor));
  html.find('.editable-effect').mousedown(ev => ev.which === 2 ? editEffectOn(datasetOf(ev).effectId, actor) : ()=>{});
  html.find(".effect-delete").click(ev => deleteEffectOn(datasetOf(ev).effectId, actor));
  html.find(".status-toggle").click(ev => toggleConditionOn(datasetOf(ev).statusId, datasetOf(ev).effectId, actor));
  
  // Exhaustion
  html.find(".exhaustion-toggle").mousedown(ev => toggleUpOrDown(datasetOf(ev).path, ev.which, actor, 6, 0));

  // Skills
  html.find('.variable-roll').click(ev => createVariableRollDialog(datasetOf(ev), actor));
  html.find(".skill-mastery-toggle").mousedown(ev => skills.toggleSkillMastery(datasetOf(ev).type, datasetOf(ev).path, ev.which, actor));
  html.find(".language-mastery-toggle").mousedown(ev => skills.toggleLanguageMastery(datasetOf(ev).path, ev.which, actor));
  html.find(".skill-point-converter").click(ev => skills.convertSkillPoints(actor, datasetOf(ev).from, datasetOf(ev).to, datasetOf(ev).operation, datasetOf(ev).rate));

  // Sidetab
  html.find(".sidetab-button").click(ev => _onSidetab(ev));
  html.find(".show-img").click(() => new ImagePopout(actor.img, { title: actor.name, uuid: actor.uuid }).render(true));
  html.find('.add-knowledge').click(() => skills.addCustomSkill(actor));
  html.find('.remove-knowledge').click(ev => skills.removeCustomSkill(datasetOf(ev).key, actor));
  html.find('.add-language').click(() => skills.addCustomLanguage(actor));
  html.find('.remove-language').click(ev => skills.removeCustomLanguage(datasetOf(ev).key, actor));

  // Tooltips
  html.find('.item-tooltip').hover(ev => itemTooltip(getItemFromActor(datasetOf(ev).itemId, actor), datasetOf(ev).inside, ev, html), ev => hideTooltip(ev, html));
  html.find('.enh-tooltip').hover(ev => enhTooltip(getItemFromActor(datasetOf(ev).itemId, actor), datasetOf(ev).enhKey, ev, html), ev => hideTooltip(ev, html));
  html.find('.effect-tooltip').hover(ev => effectTooltip(getEffectFrom(datasetOf(ev).effectId, actor), ev, html), ev => hideTooltip(ev, html));
  html.find('.text-tooltip').hover(ev => textTooltip(datasetOf(ev).text, datasetOf(ev).title, datasetOf(ev).img, ev, html), ev => hideTooltip(ev, html));
  html.find('.journal-tooltip').hover(ev => journalTooltip(datasetOf(ev).uuid, datasetOf(ev).header, datasetOf(ev).img, datasetOf(ev).inside, ev, html), ev => hideTooltip(ev, html));
}

export function activateCharacterLinsters(html, actor) {
  // Header - Top Buttons
  html.find(".rest").click(() => createRestDialog(actor));
  html.find(".level").click(ev => changeLevel(datasetOf(ev).up, datasetOf(ev).itemId, actor));
  html.find(".configuration").click(() => characterConfigDialog(actor));

  // Attributes
  html.find('.subtract-attribute-point').click(ev => skills.manipulateAttribute(datasetOf(ev).key, actor, true));
  html.find('.add-attribute-point').click(ev => skills.manipulateAttribute(datasetOf(ev).key, actor, false));
}

export function activateNpcLinsters(html, actor) {

}

function _onRollable(ev, actor) {
  if (actor.flags.dc20rpg.rollMenu.initiative) {
    rollForInitiative(actor, datasetOf(ev));
  }
  else rollFromSheet(actor, datasetOf(ev));
}

function _onSidetab(ev) {
  const icon = ev.currentTarget;
  const sidebar = ev.currentTarget.parentNode;
  sidebar.classList.toggle("expand");
  icon.classList.toggle("fa-square-caret-left");
  icon.classList.toggle("fa-square-caret-right");
  const isExpanded = sidebar.classList.contains("expand");
  game.user.setFlag("dc20rpg", "sheet.character.expandSidebar", isExpanded);
}