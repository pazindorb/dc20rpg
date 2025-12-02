import { createEffectOn, createNewEffectOn, deleteEffectFrom, editEffectOn, getEffectFrom } from "../../helpers/effects.mjs";
import { addToMultiSelect, datasetOf, removeMultiSelect, valueOf } from "../../helpers/listenerEvents.mjs";
import { updateResourceValues, updateScalingValues } from "../../helpers/items/scalingItems.mjs";
import { changeActivableProperty, changeNumericValue, changeValue, generateKey, getLabelFromKey } from "../../helpers/utils.mjs";
import { effectTooltip, hideTooltip, itemTooltip, journalTooltip } from "../../helpers/tooltip.mjs";
import { createEditorDialog } from "../../dialogs/editor.mjs";
import { addNewAreaToItem, removeAreaFromItem } from "../../helpers/items/itemConfig.mjs";
import { createScrollFromSpell } from "../../helpers/actors/itemsOnActor.mjs";
import { createTemporaryMacro } from "../../helpers/macros.mjs";
import { configureAdvancementDialog } from "../../subsystems/character-progress/advancement/advancement-configuration.mjs";
import { deleteAdvancement } from "../../subsystems/character-progress/advancement/advancements.mjs";
import { openItemCreator } from "../../dialogs/item-creator.mjs";
import { createItemBrowser } from "../../dialogs/compendium-browser/item-browser.mjs";

export function activateCommonLinsters(html, item) {
  html.find('.activable').click(ev => changeActivableProperty(datasetOf(ev).path, item));
  html.find('.numeric-input').change(ev => changeNumericValue(valueOf(ev), datasetOf(ev).path, item));
  html.find('.input').change(ev => changeValue(valueOf(ev), datasetOf(ev).path, item));
  html.find(".selectable").change(ev => changeValue(valueOf(ev), datasetOf(ev).path, item));

  // Weapon Creator
  html.find('.open-item-creator').click(async () => {
    const itemData = await openItemCreator(item.type, {blueprint: item.toObject()});
    if (itemData) await item.update(itemData);
  });
  html.find('.scroll-creator').click(() => createScrollFromSpell(item));

  // Infusion
  html.find('.add-magic-property').click(ev => createItemBrowser("infusion", true, item.sheet));
  html.find('.remove-infusion').click(ev => item.infusions.active[datasetOf(ev).key].remove());

  // Roll Templates
  html.find('.roll-template').click(ev => _onRollTemplateSelect(valueOf(ev), item));

  // Tooltip
  html.find('.item-tooltip').hover(ev => itemTooltip(item.system.contents[datasetOf(ev).itemKey], ev, html, {inside: false}),  ev => hideTooltip(ev, html));
  html.find('.journal-tooltip').hover(ev => journalTooltip(datasetOf(ev).uuid, datasetOf(ev).header, datasetOf(ev).img, ev, html, {inside: datasetOf(ev).inside === "true"}), ev => hideTooltip(ev, html));
  html.find('.content-link').hover(async ev => _onHover(ev, html), ev => hideTooltip(ev, html));

  // Formulas
  html.find('.add-formula').click(ev => item.createFormula({category: datasetOf(ev).category}));
  html.find('.remove-formula').click(ev => item.removeFormula(datasetOf(ev).key));

  // Roll Requests
  html.find('.add-roll-request').click(() => item.createRollRequest());
  html.find('.remove-roll-request').click(ev => item.removeRollRequest(datasetOf(ev).key));

  // Against Status
  html.find('.add-against-status').click(() => item.createAgainstStatus());
  html.find('.remove-against-status').click(ev => item.removeAgainstStatus(datasetOf(ev).key));

  // Advancements
  html.find('.create-advancement').click(() => configureAdvancementDialog(item));
  html.find('.advancement-edit').click(ev => configureAdvancementDialog(item, datasetOf(ev).key));
  html.find('.editable-advancement').mousedown(ev => ev.which === 2 ? configureAdvancementDialog(item, datasetOf(ev).key) : ()=>{});
  html.find('.advancement-delete').click(ev => deleteAdvancement(item, datasetOf(ev).key));

  // Item Macros
  html.find('.add-macro').click(() => item.createNewItemMacro());
  html.find('.remove-macro').click(ev => item.removeItemMacro(datasetOf(ev).key));
  html.find('.macro-edit').click(ev => item.editItemMacro(datasetOf(ev).key));

  // Conditional
  html.find('.add-conditional').click(() => item.createNewConditional());
  html.find('.remove-conditional').click(ev => item.removeConditional(datasetOf(ev).key));

  // Resources Managment
  html.find('.update-scaling').change(ev => updateScalingValues(item, datasetOf(ev), valueOf(ev)));
  html.find('.update-item-resource').change(ev => updateResourceValues(item, datasetOf(ev).index, valueOf(ev)));

  html.find('.multi-select').change(ev => addToMultiSelect(item, datasetOf(ev).path, valueOf(ev), getLabelFromKey(valueOf(ev), CONFIG.DC20RPG.ROLL_KEYS.allChecks)));
  html.find('.multi-select-remove').click(ev => removeMultiSelect(item, datasetOf(ev).path, datasetOf(ev).key));

  // Enhancement
  html.find('.add-enhancement').click(() => item.createNewEnhancement());
  html.find('.edit-description').click(ev => createEditorDialog(item, datasetOf(ev).path));
  html.find('.remove-enhancement').click(ev => item.removeEnhancement(datasetOf(ev).key));
  html.find('.enh-macro-edit').click(ev => _onEnhancementMacroEdit(datasetOf(ev).key, datasetOf(ev).macroKey, item));

  // Macros and effects
  html.find('.add-effect-to').click(ev => _onCreateEffectOn(datasetOf(ev).type, item, datasetOf(ev).key));
  html.find('.remove-effect-from').click(ev => _onDeleteEffectOn(datasetOf(ev).type, item, datasetOf(ev).key));
  html.find('.edit-effect-on').click(ev => _onEditEffectOn(datasetOf(ev).type, item, datasetOf(ev).key));

  // Active Effect Managment
  html.find(".effect-create").click(ev => createNewEffectOn(datasetOf(ev).type, item));
  html.find(".effect-edit").click(ev => editEffectOn(datasetOf(ev).effectId, item));
  html.find('.editable-effect').mousedown(ev => ev.which === 2 ? editEffectOn(datasetOf(ev).effectId, item) : ()=>{});
  html.find(".effect-delete").click(ev => deleteEffectFrom(datasetOf(ev).effectId, item));
  html.find('.effect-tooltip').hover(ev => effectTooltip(getEffectFrom(datasetOf(ev).effectId, item), ev, html), ev => hideTooltip(ev, html));

  // Target Management
  html.find('.remove-area').click(ev => removeAreaFromItem(item, datasetOf(ev).key));
  html.find('.create-new-area').click(() => addNewAreaToItem(item));

  // Class Configs
  html.find('.select-class-id').change(ev => _onClassIdSelection(ev, item));
  html.find('.input-class-id').change(ev => _onClassIdSelection(ev, item));
  html.find('.add-starting-equipment').click(() => {
    item.update({[`system.startingEquipment.${generateKey()}`]: {
      label: "Starting Equipment",
      weapon: false,
      ranged: false,
      armor: false,
      shield: false,
      itemData: {},
    }})
  })
  html.find('.remove-starting-equipment').click(ev => item.update({[`system.startingEquipment.-=${datasetOf(ev).key}`]: null}));

  html.find('.remove-resource').click(ev => _removeResourceFromItem(item, datasetOf(ev).key));
  html.find('.remove-item').click(ev => item.update({[`system.contents.-=${datasetOf(ev).itemKey}`]: null}));
}

function _removeResourceFromItem(item, key) {
  const enhUpdateData = {};
  if (item.system.enhancements) {
    Object.keys(item.system.enhancements)
            .forEach(enhKey=> enhUpdateData[`enhancements.${enhKey}.resources.custom.-=${key}`] = null); 
  }

  const updateData = {
    system: {
      [`costs.resources.custom.-=${key}`]: null,
      ...enhUpdateData
    }
  }
  item.update(updateData);
}

async function _onClassIdSelection(event, item) {
  event.preventDefault();
  const classSpecialId = valueOf(event);
  const className = CONFIG.DC20RPG.UNIQUE_ITEM_IDS.class[classSpecialId];

  item.update({
    ["system.forClass"]: {
      classSpecialId: classSpecialId,
      name: className
    }
  });
}

function _onRollTemplateSelect(selected, item) {
  const system = {};
  const saveRequest = {
    category: "save",
    saveKey: "phy",
    contestedKey: "",
    dcCalculation: "spell",
    dc: 0,
    addMasteryToDC: true,
    respectSizeRules: false,
  };
  const contestRequest = {
    category: "contest",
    saveKey: "phy",
    contestedKey: "",
    dcCalculation: "spell",
    dc: 0,
    addMasteryToDC: true,
    respectSizeRules: false,
  };

  // Set action type
  if (["dynamic", "attack"].includes(selected)) system.actionType = "attack";
  if (["check", "contest"].includes(selected)) system.actionType = "check";
  if (["save"].includes(selected)) system.actionType = "other";
  
  // Set save request
  if (["dynamic", "save"].includes(selected)) system.rollRequests = {rollRequestFromTemplate: saveRequest};
  if (["contest"].includes(selected)) system.rollRequests = {rollRequestFromTemplate: contestRequest};
  if (["check", "attack"].includes(selected)) system.rollRequests = {['-=rollRequestFromTemplate']: null};

  // Set check against DC or not
  if (selected === "contest") system.check = {againstDC: false};
  if (selected === "check") system.check = {againstDC: true};
  
  item.update({system: system});
}

async function _onCreateEffectOn(type, item, key) {
  if (type === "enhancement") {
    const enhancements = item.system.enhancements;
    const enh = enhancements[key]
    if (!enh) return;

    const created = await createNewEffectOn("temporary", item, {enhKey: key});
    created.sheet.render(true);
  }
  if (type === "conditional") {
    const conditionals = item.system.conditionals;
    const cond = conditionals[key]
    if (!cond) return;

    const created = await createNewEffectOn("temporary", item, {condKey: key});
    created.sheet.render(true);
  }
}

async function _onEditEffectOn(type, item, key) {
  if (type === "enhancement") {
    const enhancements = item.system.enhancements;
    const enh = enhancements[key]
    if (!enh) return;

    const effectData = enh.modifications.addsEffect;
    if (!effectData) return;
    const created = await createEffectOn(effectData, item);
    created.sheet.render(true);
  }
  if (type === "conditional") {
    const conditionals = item.system.conditionals;
    const cond = conditionals[key]
    if (!cond) return;

    const effectData = cond.effect;
    if (!effectData) return;
    const created = await createEffectOn(effectData, item);
    created.sheet.render(true);
  }
}

function _onDeleteEffectOn(type, item, key) {
  if (type === "enhancement") item.update({[`system.enhancements.${key}.modifications.addsEffect`]: null});
  if (type === "conditional") item.update({[`system.conditionals.${key}.effect`]: null});
}

async function _onEnhancementMacroEdit(enhKey, macroKey, item) {
  const enhancements = item.system.enhancements;
  const enh = enhancements[enhKey]
  if (!enh) return;

  const macros = enh.modifications.macros || {};
  const command = macros[macroKey] || "";
  const macro = await createTemporaryMacro(command, item, {item: item, enhKey: enhKey, macroKey: macroKey});
  macro.canUserExecute = (user) => false;
  macro.sheet.render(true);
}

async function _onHover(ev, html) {
  const document = await fromUuid(datasetOf(ev).uuid);
  const type = datasetOf(ev).type;
  if (document) {
    if (type === "Item") itemTooltip(document, ev, html);
    if (type === "JournalEntryPage") journalTooltip(datasetOf(ev).uuid, document.name, "icons/svg/item-bag.svg", ev, html);
  }
}