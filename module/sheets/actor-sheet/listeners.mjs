import { characterConfigDialog } from "../../dialogs/character-config.mjs";
import { createRestDialog } from "../../dialogs/rest.mjs";
import * as skills from "../../helpers/actors/attrAndSkills.mjs";
import { changeCurrentCharges, refreshAllActionPoints, regainBasicResource, regainCustomResource, subtractAP, subtractBasicResource, subtractCustomResource } from "../../helpers/actors/costManipulator.mjs";
import { activateTrait, changeLevel, createItemOnActor, createNewTable, deactivateTrait, deleteItemFromActor, deleteTrait, duplicateItem, editItemOnActor, getItemFromActor, removeCustomTable, reorderTableHeaders, rerunAdvancement } from "../../helpers/actors/itemsOnActor.mjs";
import { changeResourceIcon, createLegenedaryResources, createNewCustomResource, removeResource } from "../../helpers/actors/resources.mjs";
import { createEffectOn, deleteEffectOn, editEffectOn, getEffectFrom, toggleConditionOn, toggleEffectOn } from "../../helpers/effects.mjs";
import { datasetOf, valueOf } from "../../helpers/listenerEvents.mjs";
import { changeActivableProperty, changeNumericValue, changeValue, getLabelFromKey, toggleUpOrDown } from "../../helpers/utils.mjs";
import { effectTooltip, enhTooltip, hideTooltip, itemTooltip, journalTooltip, textTooltip, traitTooltip } from "../../helpers/tooltip.mjs";
import { resourceConfigDialog } from "../../dialogs/resource-config.mjs";
import { advForApChange  } from "../../helpers/rollLevel.mjs";
import { reloadWeapon } from "../../helpers/items/itemConfig.mjs";
import { closeContextMenu, itemContextMenu } from "../../helpers/context-menu.mjs";
import { createMixAncestryDialog } from "../../dialogs/mix-ancestry.mjs";
import { createCompendiumBrowser } from "../../dialogs/compendium-browser.mjs";
import { promptItemRoll, promptRoll } from "../../dialogs/roll-prompt.mjs";
import { runTemporaryItemMacro } from "../../helpers/macros.mjs";
import { doomedToggle, exhaustionToggle } from "../../statusEffects/statusUtils.mjs";
import { getSimplePopup } from "../../dialogs/simple-popup.mjs";

export function activateCommonLinsters(html, actor) {
  // Core funcionalities
  html.find(".activable").click(ev => changeActivableProperty(datasetOf(ev).path, actor));
  html.find(".item-activable").click(ev => changeActivableProperty(datasetOf(ev).path, getItemFromActor(datasetOf(ev).itemId, actor)));
  html.find('.rollable').click(ev => promptRoll(actor, datasetOf(ev), ev.shiftKey));
  html.find('.roll-item').click(ev => promptItemRoll(actor, getItemFromActor(datasetOf(ev).itemId, actor), ev.shiftKey));
  html.find('.toggle-item-numeric').mousedown(ev => toggleUpOrDown(datasetOf(ev).path, ev.which, getItemFromActor(datasetOf(ev).itemId, actor), (datasetOf(ev).max || 9), 0));
  html.find('.toggle-actor-numeric').mousedown(ev => toggleUpOrDown(datasetOf(ev).path, ev.which, actor, (datasetOf(ev).max || 9), 0));
  html.find('.ap-for-adv-item').mousedown(ev => advForApChange(getItemFromActor(datasetOf(ev).itemId, actor), ev.which));
  html.find('.ap-for-adv').mousedown(ev => advForApChange(actor, ev.which));
  html.find('.change-item-numeric-value').change(ev => changeNumericValue(valueOf(ev), datasetOf(ev).path, getItemFromActor(datasetOf(ev).itemId, actor)));
  html.find('.change-actor-numeric-value').change(ev => changeNumericValue(valueOf(ev), datasetOf(ev).path, actor));
  html.find('.update-charges').change(ev => changeCurrentCharges(valueOf(ev), getItemFromActor(datasetOf(ev).itemId, actor)));
  html.find('.initative-roll').click(() => actor.rollInitiative({createCombatants: true, rerollInitiative: true}));

  // Items 
  html.find('.item-create').click(ev => _onItemCreate(datasetOf(ev).tab, actor));
  html.find('.item-delete').click(ev => deleteItemFromActor(datasetOf(ev).itemId, actor));
  html.find('.item-edit').click(ev => editItemOnActor(datasetOf(ev).itemId, actor));
  html.find('.item-copy').click(ev => duplicateItem(datasetOf(ev).itemId, actor));
  html.find('.editable').mousedown(ev => {
    if (ev.which === 2) editItemOnActor(datasetOf(ev).itemId, actor);
    if (ev.which === 3) itemContextMenu(getItemFromActor(datasetOf(ev).itemId, actor), ev, html);
  });
  html.find('.run-on-demand-macro').click(ev => runTemporaryItemMacro(getItemFromActor(datasetOf(ev).itemId, actor), "onDemand", actor));
  html.click(ev => closeContextMenu(html)); // Close context menu
  html.find(".reorder").click(ev => reorderTableHeaders(datasetOf(ev).tab, datasetOf(ev).current, datasetOf(ev).swapped, actor));
  html.find('.table-create').click(ev => createNewTable(datasetOf(ev).tab, actor));
  html.find('.table-remove').click(ev => removeCustomTable(datasetOf(ev).tab, datasetOf(ev).table, actor));
  html.find('.select-other-item').change(ev => changeValue(html.find(`.${datasetOf(ev).selector} option:selected`).val(), datasetOf(ev).path, getItemFromActor(datasetOf(ev).itemId, actor)));
  html.find('.select-other-item').click(ev => {ev.preventDefault(); ev.stopPropagation()});
  html.find('.select-other-check').change(ev => changeValue(html.find(`.${datasetOf(ev).selector} option:selected`).val(), datasetOf(ev).path, getItemFromActor(datasetOf(ev).itemId, actor)));
  html.find('.select-other-check').click(ev => {ev.preventDefault(); ev.stopPropagation()});
  html.find('.item-multi-faceted').click(ev => {ev.stopPropagation(); getItemFromActor(datasetOf(ev).itemId, actor).swapMultiFaceted()});
  html.find('.open-compendium').click(ev => createCompendiumBrowser(datasetOf(ev).itemType, datasetOf(ev).unlock !== "true", actor.sheet));
  html.find('.reload-weapon').click(ev => reloadWeapon(getItemFromActor(datasetOf(ev).itemId, actor), actor));
  
  // Resources
  html.find(".use-ap").click(() => subtractAP(actor, 1));
  html.find(".regain-ap").click(() => regainBasicResource("ap", actor, 1, "true"));
  html.find(".regain-all-ap").click(() => refreshAllActionPoints(actor));
  html.find(".regain-resource").click(ev => regainBasicResource(datasetOf(ev).key, actor, datasetOf(ev).amount, datasetOf(ev).boundary));
  html.find(".spend-resource").click(ev => subtractBasicResource(datasetOf(ev).key, actor, datasetOf(ev).amount, datasetOf(ev).boundary));
  html.find(".spend-regain-resource").mousedown(ev => {
    if (ev.which === 3) subtractBasicResource(datasetOf(ev).key, actor, datasetOf(ev).amount, datasetOf(ev).boundary);
    if (ev.which === 1) regainBasicResource(datasetOf(ev).key, actor, datasetOf(ev).amount, datasetOf(ev).boundary);
  });

  // Custom Resources
  html.find(".add-custom-resource").click(() => createNewCustomResource("New Resource", actor));
  html.find('.edit-resource').click(ev => resourceConfigDialog(actor, datasetOf(ev).key));
  html.find(".remove-resource").click(ev => removeResource(datasetOf(ev).key, actor));
  html.find(".edit-resource-img").click(ev => changeResourceIcon(datasetOf(ev).key, actor));
  html.find(".spend-regain-custom-resource").mousedown(ev => {
    if (ev.which === 3) subtractCustomResource(datasetOf(ev).key, actor, 1, "true");
    if (ev.which === 1) regainCustomResource(datasetOf(ev).key, actor, 1, "true");
  });

  // Active Effects
  html.find(".effect-create").click(ev => createEffectOn(datasetOf(ev).type, actor));
  html.find(".effect-toggle").click(ev => toggleEffectOn(datasetOf(ev).effectId, actor, datasetOf(ev).turnOn === "true"));
  html.find(".effect-edit").click(ev => editEffectOn(datasetOf(ev).effectId, actor));
  html.find('.editable-effect').mousedown(ev => ev.which === 2 ? editEffectOn(datasetOf(ev).effectId, actor) : ()=>{});
  html.find(".effect-delete").click(ev => deleteEffectOn(datasetOf(ev).effectId, actor));
  html.find(".status-toggle").mousedown(ev => toggleConditionOn(datasetOf(ev).statusId, actor, ev.which));
  
  // Exhaustion
  html.find(".exhaustion-toggle").mousedown(ev => exhaustionToggle(actor, ev.which === 1));
  html.find(".doomed-toggle").mousedown(ev => doomedToggle(actor, ev.which === 1));
  
  // Skills
  html.find(".skill-mastery-toggle").mousedown(ev => skills.toggleSkillMastery(datasetOf(ev).type, datasetOf(ev).path, ev.which, actor));
  html.find(".language-mastery-toggle").mousedown(ev => skills.toggleLanguageMastery(datasetOf(ev).path, ev.which, actor));
  html.find(".skill-point-converter").click(ev => skills.convertSkillPoints(actor, datasetOf(ev).from, datasetOf(ev).to, datasetOf(ev).operation, datasetOf(ev).rate));
  html.find('.add-skill').click(() => skills.addCustomSkill(actor, false, false));
  html.find('.remove-skill').click(ev => skills.removeCustomSkill(datasetOf(ev).key, actor, false));
  html.find('.add-knowledge').click(() => skills.addCustomSkill(actor, true, false));
  html.find('.remove-knowledge').click(ev => skills.removeCustomSkill(datasetOf(ev).key, actor, false));
  html.find('.add-trade').click(() => skills.addCustomSkill(actor, false, true));
  html.find('.remove-trade').click(ev => skills.removeCustomSkill(datasetOf(ev).key, actor, true));
  html.find('.add-language').click(() => skills.addCustomLanguage(actor));
  html.find('.remove-language').click(ev => skills.removeCustomLanguage(datasetOf(ev).key, actor));

  // Sidetab
  html.find(".sidetab-button").click(ev => _onSidetab(ev));
  html.find(".show-img").click(() => new ImagePopout(actor.img, { title: actor.name, uuid: actor.uuid }).render(true));
  html.find('.mix-ancestry').click(async () => {
    const ancestryData = await createMixAncestryDialog();
    if (ancestryData) await createItemOnActor(actor, ancestryData);
  });

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
  html.find(".rerun-advancement").click(ev => rerunAdvancement(actor, datasetOf(ev).classId));
  html.find(".configuration").click(() => characterConfigDialog(actor));

  // Attributes
  html.find('.subtract-attribute-point').click(ev => skills.manipulateAttribute(datasetOf(ev).key, actor, true));
  html.find('.add-attribute-point').click(ev => skills.manipulateAttribute(datasetOf(ev).key, actor, false));
}

export function activateNpcLinsters(html, actor) {
  // Custom Resources
  html.find(".add-legendary-resources").click(() => createLegenedaryResources(actor));
}

export function activateCompanionListeners(html, actor) {
  const getTrait = (actor, traitKey) => actor.system?.traits[traitKey];

  html.find(".trait-tooltip").hover(ev => traitTooltip(getTrait(actor, datasetOf(ev).traitKey), datasetOf(ev).inside, ev, html), ev => hideTooltip(ev, html));
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

  const itemType = await getSimplePopup("select", {header: game.i18n.localize("dc20rpg.dialog.create.itemType"), selectOptions});
  if (!itemType) return;

  const itemData = {
    type: itemType,
    name: `New ${getLabelFromKey(itemType, CONFIG.DC20RPG.DROPDOWN_DATA.creatableTypes)}`
  }
  createItemOnActor(actor, itemData);
}