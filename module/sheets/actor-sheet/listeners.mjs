import { characterConfigDialog } from "../../dialogs/character-config.mjs";
import { RestDialog } from "../../dialogs/rest.mjs";
import { activateTrait, changeLevel, createNewTable, deactivateTrait, deleteTrait, editTrait, removeCustomTable, reorderTableHeaders, rerunAdvancement } from "../../helpers/actors/itemsOnActor.mjs";
import { addFlatDamageReductionEffect } from "../../helpers/effects.mjs";
import { datasetOf, valueOf } from "../../helpers/listenerEvents.mjs";
import { changeActivableProperty, changeNumericValue, changeValue, getLabelFromKey, toggleUpOrDown, toSelectOptions } from "../../helpers/utils.mjs";
import { effectTooltip, enhTooltip, hideTooltip, itemTooltip, journalTooltip, textTooltip, traitTooltip } from "../../helpers/tooltip.mjs";
import { resourceConfigDialog } from "../../dialogs/resource-config.mjs";
import { closeContextMenu, itemContextMenu } from "../../helpers/context-menu.mjs";
import { createMixAncestryDialog } from "../../dialogs/mix-ancestry.mjs";
import { runTemporaryItemMacro } from "../../helpers/macros.mjs";
import { SimplePopup } from "../../dialogs/simple-popup.mjs";
import { keywordEditor } from "../../dialogs/keyword-editor.mjs";
import { createItemBrowser } from "../../dialogs/compendium-browser/item-browser.mjs";
import { createTransferDialog } from "../../dialogs/transfer.mjs";
import { getActorsForUser, userSelector } from "../../helpers/users.mjs";
import { openItemCreator } from "../../dialogs/item-creator.mjs";
import { getActorFromIds } from "../../helpers/actors/tokens.mjs";
import { RollDialog } from "../../roll/rollDialog.mjs";
import { ActionSelect } from "../../dialogs/action-select.mjs";
import { DC20RpgItem } from "../../documents/item.mjs";
import { MonsterCreatorDialog } from "../../dialogs/monster-creator.mjs";

export function activateCommonLinsters(html, actor) {
  // Core funcionalities


  // Resources
  html.find(".rest-point-to-hp").click(ev => {
    datasetOf(ev); 
    if (actor.resources.restPoints.checkAndSpend(1)) {
      actor.resources.health.regain(1);
    }
  });

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
  html.find('.mix-ancestry').click(async ev => {
    const ancestryData = await createMixAncestryDialog({position: {left: ev.clientX + 50, top: ev.clientY - 115}});
    if (ancestryData) await DC20RpgItem.create(ancestryData, {parent: actor});
  });

}

export function activateCharacterLinsters(html, actor) {
  // Header - Top Buttons
  html.find(".rest").click(() => RestDialog.open(actor));
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
    if (itemData) await DC20RpgItem.create(itemData, {parent: actor});
  });

  // Slots
  html.find('.add-slot').click(ev => _onAddSlot(ev, actor));
  html.find('.delete-slot').click(ev => _onDeleteSlot(datasetOf(ev), actor));
}

export function activateStorageListeners(html, actor) {
  html.find(".transfer").click(() => createTransferDialog(actor, getActorsForUser(true), {currencyOnly: true}));
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

async function _onAddSlot(event, actor) {
  event.preventDefault();
  const category = await SimplePopup.select("Select Category", CONFIG.DC20RPG.DROPDOWN_DATA.equipmentSlots);
  if (!category) return;

  await actor.equipmentSlots[category].addSlot();
}

async function _onDeleteSlot(dataset, actor) {
  await actor.equipmentSlots[dataset.category].slots[dataset.key].delete();
}

async function _onInfusionRoll(actor, infusion) {
  if (actor.type !== "character") {
    ui.notifications.warn("Only player characters can use infusion items");
    return;
  }

  const items = actor.getAllItemsWithType(["weapon", "spellFocus", "consumable", "equipment"]);
  const itemId = await SimplePopup.select("Select Item to Infuse", toSelectOptions(items, "id", "name"));
  const item = actor.items.get(itemId);
  if (!item) return;
  item.infusions.apply(infusion, actor.uuid);
}
