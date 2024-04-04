import { createActionsDialog } from "../../dialogs/actions-dialog.mjs";
import { configureCustomResource } from "../../dialogs/actor-configuration-dialog.mjs";
import { createRestDialog } from "../../dialogs/rest-dialog.mjs";
import { createVariableRollDialog } from "../../dialogs/variable-attribute-picker.mjs";
import * as skills from "../../helpers/actors/attrAndSkills.mjs";
import { changeCurrentCharges, refreshAllActionPoints, regainBasicResource, subtractAP, subtractBasicResource } from "../../helpers/actors/costManipulator.mjs";
import { changeLevel, deleteItemFromActor, editItemOnActor, getItemFromActor } from "../../helpers/actors/itemsOnActor.mjs";
import { createNewCustomResource, removeResource } from "../../helpers/actors/resources.mjs";
import { rollForInitiative, rollFromItem, rollFromSheet } from "../../helpers/actors/rollsFromActor.mjs";
import { createEffectOn, deleteEffectOn, editEffectOn, toggleEffectOn } from "../../helpers/effects.mjs";
import { datasetOf } from "../../helpers/events.mjs";
import { changeActivableProperty, changeNumericValue, toggleUpOrDown } from "../../helpers/utils.mjs";
import { createItemDialog } from "../../dialogs/create-item-dialog.mjs"

export function activateCommonLinsters(html, actor) {
  // Core funcionalities
  html.find(".activable").click(ev => changeActivableProperty(datasetOf(ev).path, actor));
  html.find(".item-activable").click(ev => changeActivableProperty(datasetOf(ev).path, getItemFromActor(datasetOf(ev).itemId, actor)));
  html.find('.rollable').click(ev => _onRollable(ev, actor));
  html.find('.roll-item').click(ev => rollFromItem(datasetOf(ev).itemId, actor, true, ev.altKey));
  html.find('.toggle-item-numeric').mousedown(ev => toggleUpOrDown(datasetOf(ev).path, ev.which, getItemFromActor(datasetOf(ev).itemId, actor), (datasetOf(ev).max || 9), 0));
  html.find('.toggle-actor-numeric').mousedown(ev => toggleUpOrDown(datasetOf(ev).path, ev.which, actor, (datasetOf(ev).max || 9), 0));
  html.find('.change-item-numeric-value').change(ev => changeNumericValue(valueOf(ev), datasetOf(ev).path, getItemFromActor(datasetOf(ev).itemId, actor)));
  html.find('.change-actor-numeric-value').change(ev => changeNumericValue(valueOf(ev), datasetOf(ev).path, actor));
  html.find('.update-charges').change(ev => changeCurrentCharges(valueOf(ev), getItemFromActor(datasetOf(ev).itemId, actor)));

  // Items 
  html.find('.item-create').click(ev => createItemDialog(datasetOf(ev).tab, actor));
  html.find('.item-delete').click(ev => deleteItemFromActor(datasetOf(ev).itemId, actor));
  html.find('.item-edit').click(ev => editItemOnActor(datasetOf(ev).itemId, actor));
  html.find('.editable').mousedown(ev => ev.which === 2 ? editItemOnActor(datasetOf(ev).itemId, actor) : ()=>{});
  html.find(".reorder").click(ev => _reorderTableHeader(ev, actor));
  
  // Resources
  html.find(".use-ap").click(() => subtractAP(actor, 1));
  html.find(".regain-ap").click(() => refreshAllActionPoints(actor));
  html.find(".regain-resource").click(ev => regainBasicResource(datasetOf(ev).key, actor, datasetOf(ev).amount, datasetOf(ev).boundary));
  html.find(".spend-resource").click(ev => subtractBasicResource(datasetOf(ev).key, actor, datasetOf(ev).amount, datasetOf(ev).boundary));
  html.find(".show-actions").click(() => createActionsDialog(actor));

  // Custom Resources
  html.find(".add-custom-resource").click(() => createNewCustomResource("New Resource", actor));
  html.find('.edit-resource').click(ev => configureCustomResource(actor, datasetOf(ev).key));
  html.find(".remove-resource").click(ev => removeResource(datasetOf(ev).key, actor));

  // Active Effects
  html.find(".effect-create").click(ev => createEffectOn(datasetOf(ev).type, actor));
  html.find(".effect-toggle").click(ev => toggleEffectOn(datasetOf(ev).effectId, actor));
  html.find(".effect-edit").click(ev => editEffectOn(datasetOf(ev).effectId, actor));
  html.find('.editable-effect').mousedown(ev => ev.which === 2 ? editEffectOn(datasetOf(ev).effectId, actor) : ()=>{});
  html.find(".effect-delete").click(ev => deleteEffectOn(datasetOf(ev).effectId, actor));

  // Exhaustion
  html.find(".exhaustion-toggle").mousedown(ev => toggleUpOrDown(datasetOf(ev).path, ev.which, actor, 6, 0));
}

export function activateCharacterLinsters(html, actor) {
  // Header - Top Buttons
  html.find(".rest").click(() => createRestDialog(actor));
  html.find(".level").click(ev => changeLevel(datasetOf(ev).up, datasetOf(ev).itemId, actor));

  // Attributes
  html.find('.subtract-attribute-point').click(ev => skills.manipulateAttribute(datasetOf(ev).key, actor, true));
  html.find('.add-attribute-point').click(ev => skills.manipulateAttribute(datasetOf(ev).key, actor, false));

  // Sidetab
  html.find(".sidetab-button").click(ev => _onSidetab(ev));

  // Skills
  html.find('.variable-roll').click(ev => createVariableRollDialog(datasetOf(ev), actor));
  html.find(".skill-mastery-toggle").mousedown(ev => skills.toggleSkillMastery(datasetOf(ev).path, ev.which, actor));
  html.find(".language-mastery-toggle").mousedown(ev => skills.toggleLanguageMastery(datasetOf(ev).path, ev.which, actor));
  html.find(".skill-expertise-toggle").mousedown(ev => skills.toggleExpertise(datasetOf(ev).path, ev.which, actor));
  html.find(".skill-point-converter").click(ev => skills.convertSkillPoints(actor, datasetOf(ev).from, datasetOf(ev).to, datasetOf(ev).operation, datasetOf(ev).rate));
  html.find('.add-knowledge').click(() => skills.addCustomSkill(actor));
  html.find('.remove-knowledge').click(ev => skills.removeCustomSkill(datasetOf(ev).key, actor));
  html.find('.add-language').click(() => skills.addCustomLanguage(actor));
  html.find('.remove-language').click(ev => skills.removeCustomLanguage(datasetOf(ev).key, actor));

}

export function activateNpcLinsters(html, actor) {

}

function _onRollable(ev, actor) {
  if (actor.system.rollMenu.initiative) {
    rollForInitiative(actor, datasetOf(ev));
    actor.update({["system.rollMenu.initiative"]: false});
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

function _reorderTableHeader(event, actor) {
  event.preventDefault();
  const dataset = event.currentTarget.dataset;
  const headersOrdering = actor.flags.dc20rpg.headersOrdering;

  const tab = dataset.tab;
  const current = dataset.current;
  const swapped = dataset.swapped;

  let currentSortValue = headersOrdering[tab][current];
  let swappedSortValue = headersOrdering[tab][swapped];

  headersOrdering[tab][current] = swappedSortValue;
  headersOrdering[tab][swapped] = currentSortValue;

  actor.update({[`flags.dc20rpg.headersOrdering`]: headersOrdering });
}