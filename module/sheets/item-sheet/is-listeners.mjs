import { configureAdvancementDialog } from "../../dialogs/configure-advancement.mjs";
import { createEffectOn, deleteEffectOn, editEffectOn } from "../../helpers/effects.mjs";
import { datasetOf, valueOf } from "../../helpers/events.mjs";
import { deleteAdvancement } from "../../helpers/advancements.mjs";
import { addEnhancement, addMartialManeuvers, removeEnhancement } from "../../helpers/items/enhancements.mjs";
import { addFormula, removeFormula } from "../../helpers/items/itemRollFormulas.mjs";
import { updateResourceValues, updateScalingValues } from "../../helpers/items/scalingItems.mjs";
import { changeActivableProperty } from "../../helpers/utils.mjs";
import { createWeaponCreator } from "../../dialogs/weapon-creator.mjs";

export function activateCommonLinsters(html, item) {
  html.find('.activable').click(ev => changeActivableProperty(datasetOf(ev).path, item));

  // Weapon Creator
  html.find('.weapon-creator').click(() => createWeaponCreator(item));

  // Formulas
  html.find('.add-formula').click(ev => addFormula(datasetOf(ev).category, item));
  html.find('.remove-formula').click(ev => removeFormula(datasetOf(ev).key, item));

  // Advancements
  html.find('.create-advancement').click(() => configureAdvancementDialog(item));
  html.find('.advancement-edit').click(ev => configureAdvancementDialog(item, datasetOf(ev).key));
  html.find('.editable-advancement').mousedown(ev => ev.which === 2 ? configureAdvancementDialog(item, datasetOf(ev).key) : ()=>{});
  html.find('.advancement-delete').click(ev => deleteAdvancement(item, datasetOf(ev).key));

  // Resources Managment
  html.find('.update-scaling').change(ev => updateScalingValues(item, datasetOf(ev), valueOf(ev)));
  html.find('.update-item-resource').change(ev => updateResourceValues(item, datasetOf(ev).index, valueOf(ev)));

  html.find('.select-other-item').change(ev => _onSelection(datasetOf(ev).path, datasetOf(ev).selector, item));

  // Enhancement
  html.find('.add-enhancement').click(() => addEnhancement(item, html.find('.new-enhancement-name')));
  html.find('.add-martial-maneuvers').click(() => addMartialManeuvers(item))
  html.find('.remove-enhancement').click(ev => removeEnhancement(item, datasetOf(ev).key))

  // Active Effect Managment
  html.find(".effect-create").click(ev => createEffectOn(datasetOf(ev).type, item));
  html.find(".effect-edit").click(ev => editEffectOn(datasetOf(ev).effectId, item));
  html.find('.editable-effect').mousedown(ev => ev.which === 2 ? editEffectOn(datasetOf(ev).effectId, item) : ()=>{});
  html.find(".effect-delete").click(ev => deleteEffectOn(datasetOf(ev).effectId, item));

  // Drag and drop events
  html[0].addEventListener('dragover', ev => ev.preventDefault());
  html[0].addEventListener('drop', async ev => await _onDrop(ev, item));
  html.find('.remove-resource').click(ev => _removeResourceFromItem(item, datasetOf(ev).key))
}

async function _onDrop(event, parentItem) {
  event.preventDefault();
  const droppedData  = event.dataTransfer.getData('text/plain');
  if (!droppedData) return;
  const droppedObject = JSON.parse(droppedData);

  if (droppedObject.type === "Item") {
    const item = await Item.fromDropData(droppedObject);

    // Core Usage
    const itemResource = item.system.resource;
    const key = itemResource.resourceKey;
    const customResource = {
      name: itemResource.name,
      img: item.img,
    };
    if (item.system.isResource) _addCustomResource(customResource, key, parentItem);
  }

  if (droppedObject.type === "resource") {
    _addCustomResource(droppedObject, droppedObject.key, parentItem);
  }
}

function _onSelection(path, selector, item) {
  const itemId = $(`.${selector} option:selected`).val();
  item.update({[path]: itemId});
}

function _addCustomResource(customResource, key, item) {
  if (!item.system.costs.resources.custom) return;
  customResource.value = null;

  // Enhancements 
  const enhancements = item.system.enhancements;
  if (enhancements) {
    Object.keys(enhancements)
            .forEach(enhKey=> enhancements[enhKey].resources.custom[key] = customResource); 
  }

  const updateData = {
    system: {
      [`costs.resources.custom.${key}`]: customResource,
      enhancements: enhancements
    }
  }
  item.update(updateData);
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