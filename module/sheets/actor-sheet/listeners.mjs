import { characterConfigDialog } from "../../dialogs/character-config.mjs";
import { createRestDialog } from "../../dialogs/rest.mjs";
import { activateTrait, changeLevel, createItemOnActor, createNewTable, deactivateTrait, deleteItemFromActor, deleteTrait, duplicateItem, editItemOnActor, getItemFromActor, removeCustomTable, reorderTableHeaders, rerunAdvancement } from "../../helpers/actors/itemsOnActor.mjs";
import { createLegenedaryResources } from "../../helpers/actors/resources.mjs";
import { addFlatDamageReductionEffect, createNewEffectOn, deleteEffectFrom, editEffectOn, getEffectFrom, toggleEffectOn } from "../../helpers/effects.mjs";
import { datasetOf, valueOf } from "../../helpers/listenerEvents.mjs";
import { changeActivableProperty, changeNumericValue, changeValue, getLabelFromKey, toggleUpOrDown } from "../../helpers/utils.mjs";
import { effectTooltip, enhTooltip, hideTooltip, itemTooltip, journalTooltip, textTooltip, traitTooltip } from "../../helpers/tooltip.mjs";
import { resourceConfigDialog } from "../../dialogs/resource-config.mjs";
import { closeContextMenu, itemContextMenu } from "../../helpers/context-menu.mjs";
import { createMixAncestryDialog } from "../../dialogs/mix-ancestry.mjs";
import { runTemporaryItemMacro } from "../../helpers/macros.mjs";
import { toggleStatusOn } from "../../statusEffects/statusUtils.mjs";
import { SimplePopup } from "../../dialogs/simple-popup.mjs";
import { keywordEditor } from "../../dialogs/keyword-editor.mjs";
import { createItemBrowser } from "../../dialogs/compendium-browser/item-browser.mjs";
import { createTransferDialog } from "../../dialogs/transfer.mjs";
import { getActorsForUser, userSelector } from "../../helpers/users.mjs";
import { openItemCreator } from "../../dialogs/item-creator.mjs";
import { clearHelpDice, prepareHelpAction } from "../../helpers/actors/actions.mjs";
import { getActorFromIds } from "../../helpers/actors/tokens.mjs";
import { RollDialog } from "../../roll/rollDialog.mjs";

export function activateCommonLinsters(html, actor) {
  // Core funcionalities
  html.find(".activable").click(ev => changeActivableProperty(datasetOf(ev).path, actor));
  html.find(".item-activable").click(ev => changeActivableProperty(datasetOf(ev).path, getItemFromActor(datasetOf(ev).itemId, actor)));
  html.find('.rollable').click(ev => actor.rollPopup(datasetOf(ev).key, datasetOf(ev).type, {quickRoll: ev.shiftKey, customLabel: datasetOf(ev).label}));
  html.find('.roll-item').click(ev => RollDialog.open(actor, getItemFromActor(datasetOf(ev).itemId, actor), {quickRoll: ev.shiftKey}));
  html.find('.toggle-item-numeric').mousedown(ev => toggleUpOrDown(datasetOf(ev).path, ev.which, getItemFromActor(datasetOf(ev).itemId, actor), (datasetOf(ev).max || 9), 0));
  html.find('.toggle-actor-numeric').mousedown(ev => toggleUpOrDown(datasetOf(ev).path, ev.which, actor, (datasetOf(ev).max || 9), 0));
  html.find('.change-actor-value').change(ev => changeValue(valueOf(ev), datasetOf(ev).path, actor));
  html.find('.change-item-value').change(ev => changeValue(valueOf(ev), datasetOf(ev).path, getItemFromActor(datasetOf(ev).itemId, actor)));
  html.find('.change-item-numeric-value').change(ev => changeNumericValue(valueOf(ev), datasetOf(ev).path, getItemFromActor(datasetOf(ev).itemId, actor)));
  html.find('.change-actor-numeric-value').change(ev => changeNumericValue(valueOf(ev), datasetOf(ev).path, actor));
  html.find('.update-charges').change(async ev => {
    const item = actor.items.get(datasetOf(ev).itemId);
    const max = item.system.costs.charges.max;
    await changeNumericValue(valueOf(ev), "system.costs.charges.current", item, {upperLimit: max, lowerLimit: 0});
    actor.sheet.render();
  });
  html.find('.recharge-item').click(ev => getItemFromActor(datasetOf(ev).itemId, actor).use.regainCharges());
  html.find('.initiative-roll').click(() => actor.rollInitiative({createCombatants: true, rerollInitiative: true}));
  html.find('.make-help-action').click(async () => {if (actor.resources.ap.checkAndSpend(1)) prepareHelpAction(actor)});
  html.find('.help-dice').mousedown(async ev => {
    if (ev.which !== 3) return;
    const key = ev.currentTarget.dataset?.key;
    const owner = getActorFromIds(actor.id, actor.token?.id);
    if (owner) {
      const confirmed = await SimplePopup.confirm("Do you want to remove that Help Dice?");
      if (confirmed) clearHelpDice(owner, key);
    }
  });

  // Items 
  html.find('.item-create').click(ev => _onItemCreate(datasetOf(ev).tab, actor));
  html.find('.item-delete').click(ev => deleteItemFromActor(datasetOf(ev).itemId, actor));
  html.find('.item-edit').click(ev => editItemOnActor(datasetOf(ev).itemId, actor));
  html.find('.item-copy').click(ev => duplicateItem(datasetOf(ev).itemId, actor));
  html.find('.editable').mousedown(ev => {
    if (ev.which === 2) editItemOnActor(datasetOf(ev).itemId, actor);
    if (ev.which === 3) itemContextMenu(getItemFromActor(datasetOf(ev).itemId, actor), ev, html, actor.type);
  });
  html.find('.run-on-demand-macro').click(ev => runTemporaryItemMacro(getItemFromActor(datasetOf(ev).itemId, actor), "onDemand", actor));
  html.click(ev => closeContextMenu(html)); // Close context menu
  html.find(".reorder").click(ev => reorderTableHeaders(datasetOf(ev).tab, datasetOf(ev).current, datasetOf(ev).swapped, actor));
  html.find('.table-create').click(ev => createNewTable(datasetOf(ev).tab, actor));
  html.find('.table-remove').click(ev => removeCustomTable(datasetOf(ev).tab, datasetOf(ev).table, actor));
  html.find('.open-compendium').click(ev => createItemBrowser(datasetOf(ev).itemType, datasetOf(ev).unlock !== "true", actor.sheet));

  // Resources
  html.find(".use-ap").click(() => actor.resources.ap.checkAndSpend(1));
  html.find(".regain-ap").click(() => actor.resources.ap.regain(1));
  html.find(".regain-all-ap").click(() => actor.resources.ap.regain("max"));
  html.find(".edit-max-ap").change(ev => {
    changeNumericValue(valueOf(ev), "system.resources.ap.value", actor);
    changeNumericValue(valueOf(ev), "system.resources.ap.max", actor);
  })
  html.find(".regain-resource").click(ev => actor.resources[datasetOf(ev).key].regain(1));
  html.find(".spend-resource").click(ev => actor.resources[datasetOf(ev).key].spend(1, true));
  html.find(".spend-regain-resource").mousedown(ev => {
    if (ev.which === 3) actor.resources[datasetOf(ev).key].checkAndSpend(1);
    if (ev.which === 1) actor.resources[datasetOf(ev).key].regain(1);
  });
  html.find(".grit-to-damage-reduction").click(async ev => {
    if (actor.resources.grit.checkAndSpend(1)) {
      await addFlatDamageReductionEffect(actor);
    }
  })
  html.find(".rest-point-to-hp").click(ev => {
    datasetOf(ev); 
    if (actor.resources.restPoints.checkAndSpend(1)) {
      actor.resources.health.regain(1);
    }
  });

  // Custom Resources
  html.find(".add-custom-resource").click(() => actor.resources.createCustomResource());
  html.find('.edit-resource').click(ev => resourceConfigDialog(actor, datasetOf(ev).key));
  html.find(".remove-resource").click(ev => actor.resources.removeCustomResource(datasetOf(ev).key));
  html.find(".edit-resource-img").click(ev => actor.resources[datasetOf(ev).key].changeIcon());

  // Active Effects
  html.find(".effect-create").click(ev => createNewEffectOn(datasetOf(ev).type, actor));
  html.find(".effect-toggle").click(ev => toggleEffectOn(datasetOf(ev).effectId, actor, datasetOf(ev).turnOn === "true"));
  html.find(".effect-edit").click(ev => editEffectOn(datasetOf(ev).effectId, actor));
  html.find('.editable-effect').mousedown(ev => ev.which === 2 ? editEffectOn(datasetOf(ev).effectId, actor) : ()=>{});
  html.find(".effect-delete").click(ev => deleteEffectFrom(datasetOf(ev).effectId, actor));
  html.find(".status-toggle").mousedown(ev => toggleStatusOn(datasetOf(ev).statusId, actor, ev.which));
  
  // Skills
  html.find(".expertise-toggle").click(ev => actor.skillAndLanguage[datasetOf(ev).type][datasetOf(ev).key].expertiseToggle());
  html.find(".mastery-toggle").mousedown(ev => _onToggleMastery(datasetOf(ev).key, datasetOf(ev).type, ev.which, actor));
  html.find(".skill-point-converter").click(ev => actor.skillAndLanguage.convertPoints(datasetOf(ev).from, datasetOf(ev).to, datasetOf(ev).operation, datasetOf(ev).rate));
  html.find('.add-skill').click(() => actor.skillAndLanguage.addCustom("skills"));
  html.find('.remove-skill').click(ev => actor.skillAndLanguage.removeCustom(datasetOf(ev).key, "skills"));
  html.find('.add-trade').click(() => actor.skillAndLanguage.addCustom("trades"));
  html.find('.remove-trade').click(ev => actor.skillAndLanguage.removeCustom(datasetOf(ev).key, "trades"));
  html.find('.add-language').click(() => actor.skillAndLanguage.addCustom("languages"));
  html.find('.remove-language').click(ev => actor.skillAndLanguage.removeCustom(datasetOf(ev).key, "languages"));

  // Sidetab
  html.find(".sidetab-button").click(ev => _onSidetab(ev));
  html.find(".show-img").click(() => new ImagePopout(actor.img, { title: actor.name, uuid: actor.uuid }).render(true));
  html.find('.mix-ancestry').click(async ev => {
    const ancestryData = await createMixAncestryDialog({position: {left: ev.clientX + 50, top: ev.clientY - 115}});
    if (ancestryData) await createItemOnActor(actor, ancestryData);
  });

  // Tooltips
  html.find('.item-tooltip').hover(ev => itemTooltip(getItemFromActor(datasetOf(ev).itemId, actor), ev, html, {inside: datasetOf(ev).inside === "true"}), ev => hideTooltip(ev, html));
  html.find('.enh-tooltip').hover(ev => enhTooltip(getItemFromActor(datasetOf(ev).itemId, actor), datasetOf(ev).enhKey, ev, html), ev => hideTooltip(ev, html));
  html.find('.effect-tooltip').hover(ev => effectTooltip(getEffectFrom(datasetOf(ev).effectId, actor), ev, html), ev => hideTooltip(ev, html));
  html.find('.text-tooltip').hover(ev => textTooltip(datasetOf(ev).text, datasetOf(ev).title, datasetOf(ev).img, ev, html), ev => hideTooltip(ev, html));
  html.find('.journal-tooltip').hover(ev => journalTooltip(datasetOf(ev).uuid, datasetOf(ev).header, datasetOf(ev).img, ev, html, {inside: datasetOf(ev).inside === "true"}), ev => hideTooltip(ev, html));
}

export function activateCharacterLinsters(html, actor) {
  // Header - Top Buttons
  html.find(".rest").click(() => createRestDialog(actor));
  html.find(".level").click(async ev => {
    if (datasetOf(ev).up !== "true") {
      const confirmed = await SimplePopup.confirm("Do you want to level down?");
      if (!confirmed) return;
    }
    changeLevel(datasetOf(ev).up, datasetOf(ev).itemId, actor)
  });
  html.find(".rerun-advancement").click(ev => rerunAdvancement(actor, datasetOf(ev).classId));
  html.find(".configuration").click(() => characterConfigDialog(actor));
  html.find(".keyword-editor").click(() => keywordEditor(actor));
  html.find('.transfer').click(() => _onTransfer(actor));
  html.find('.open-item-creator').click(async ev => {
    const itemData = await openItemCreator(datasetOf(ev).itemType);
    if (itemData) await createItemOnActor(actor, itemData);
  });

  // Attributes
  html.find('.subtract-attribute-point').click(ev => actor.attributes[datasetOf(ev).key].decrease());
  html.find('.add-attribute-point').click(ev => actor.attributes[datasetOf(ev).key].increase());
}

export function activateNpcLinsters(html, actor) {
  // Custom Resources
  html.find(".add-legendary-resources").click(() => createLegenedaryResources(actor));
}

export function activateCompanionListeners(html, actor) {
  const getTrait = (actor, traitKey) => actor.system?.traits[traitKey];

  html.find(".trait-tooltip").hover(ev => traitTooltip(getTrait(actor, datasetOf(ev).traitKey), ev, html, {inside: datasetOf(ev).inside === "true"}), ev => hideTooltip(ev, html));
  html.find(".activable-trait").mousedown(ev => {
    if (ev.which === 1) activateTrait(datasetOf(ev).traitKey, actor);
    if (ev.which === 3) deactivateTrait(datasetOf(ev).traitKey, actor);
  });
  html.find(".trait-delete").click(ev =>  deleteTrait(datasetOf(ev).traitKey, actor));
  html.find(".trait-repeatable").click(ev => {
    const trait = getTrait(actor, datasetOf(ev).traitKey);
    actor.update({[`system.traits.${datasetOf(ev).traitKey}.repeatable`]: !trait.repeatable});
  });
  html.find(".remove-companion-owner").click(() => actor.update({["system.companionOwnerId"]: ""}));
}

export function activateStorageListeners(html, actor) {
  html.find(".transfer").click(() => createTransferDialog(actor, getActorsForUser(true), {currencyOnly: true}));
}

function _onSidetab(ev) {
  const icon = ev.currentTarget;
  const sidebar = ev.currentTarget.parentNode;
  sidebar.classList.toggle("expand");
  icon.classList.toggle("fa-square-caret-left");
  icon.classList.toggle("fa-square-caret-right");
  const isExpanded = sidebar.classList.contains("expand");
  game.user.setFlag("dc20rpg", "sheet.character.sidebarCollapsed", !isExpanded);
}

async function _onItemCreate(tab, actor) {
  let selectOptions = CONFIG.DC20RPG.DROPDOWN_DATA.creatableTypes;
  switch(tab) {
    case "inventory":   selectOptions = CONFIG.DC20RPG.DROPDOWN_DATA.inventoryTypes; break;
    case "features":    selectOptions = CONFIG.DC20RPG.DROPDOWN_DATA.featuresTypes; break;
    case "techniques":  selectOptions = CONFIG.DC20RPG.DROPDOWN_DATA.techniquesTypes; break;
    case "spells":      selectOptions = CONFIG.DC20RPG.DROPDOWN_DATA.spellsTypes; break; 
  }

  const itemType = await SimplePopup.select(game.i18n.localize("dc20rpg.dialog.create.itemType"), selectOptions);
  if (!itemType) return;

  const itemData = {
    type: itemType,
    name: `New ${getLabelFromKey(itemType, CONFIG.DC20RPG.DROPDOWN_DATA.creatableTypes)}`
  }
  createItemOnActor(actor, itemData);
}

async function _onTransfer(actor) {
  const user = await userSelector(true);
  const traders = getActorsForUser(true, user);
  createTransferDialog(actor, traders, {lockFlexibleTrader: true});
}

function _onToggleMastery(key, type, which, actor) {
  const obj = actor.skillAndLanguage[type][key];
  if (which === 1) obj.masteryUp();
  if (which === 3) obj.masteryDown();
}