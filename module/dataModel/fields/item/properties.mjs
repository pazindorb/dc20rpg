import { arraysHaveCommonString } from "../../../helpers/utils.mjs";

export default class PropertyFields extends foundry.data.fields.SchemaField {
  constructor(itemType="", fields={}, options={}) {
    _preparePropertiesFor(itemType, fields);
    super(fields, options);
  }
}

function _preparePropertiesFor(itemType, fields) {
  const f = foundry.data.fields;
  let acceptedTypes = ["other"];
  if (itemType === "weapon") acceptedTypes = ["melee", "ranged"];
  if (itemType === "equipment") acceptedTypes = ["lshield", "hshield", "light", "heavy"];

  const entries = Object.entries(CONFIG.DC20RPG.PROPERTIES)
  entries.forEach(([key, prop]) => {
    if (arraysHaveCommonString(acceptedTypes, prop.for)) {
      fields[key] = new f.ObjectField({required: true, initial: prop});
    }
  })
}

export function enhancePropertiesObject(item) {
  _enhanceReload(item);
  _enhanceMultiFacaded(item);
}

//==================================
//              RELOAD             =
//==================================
function _enhanceReload(item) {
  const reloadProperty = item.system?.properties?.reload;
  if (!reloadProperty || !reloadProperty.active) return;

  item.reloadable = {
    isLoaded: () => _isLoaded(item),
    reload: (free) => _reloadItem(item, free),
    unload: () => _unloadItem(item)
  }
}

function _isLoaded(item) {
  if (item.system.properties.reload.loaded) return true;
  ui.notifications.error(`${item.name} is not loaded.`);
  return false;
}

async function _reloadItem(item, free) {
  const actor = item.actor;
  if (!free && actor) {
    if (!actor.resources.ap.checkAndSpend(1)) return;
  }
  await item.update({[`system.properties.reload.loaded`]: true});
}

async function _unloadItem(item) {
  await item.update({[`system.properties.reload.loaded`]: false});
}

//==================================
//          MULTI FACETED          =
//==================================
function _enhanceMultiFacaded(item) {
  const property = item.system?.properties?.multiFaceted;
  if (!property || !property.active) return;

  item.multiFacaded = {
    swap: () => _swapMultiFaceted(item)
  }
}

async function _swapMultiFaceted(item) {
  const multiFaceted = item.system.properties?.multiFaceted;
  const damageFormula = item.system.formulas.weaponDamage;
  if (!damageFormula) {
    ui.notifications.error("Original damage formula cannot be found. You have to recreate this item to fix that problem");
    return;
  }

  if (multiFaceted.selected === "first") multiFaceted.selected = "second";
  else multiFaceted.selected = "first";
  const selected = multiFaceted.selected;

  multiFaceted.labelKey = multiFaceted.weaponStyle[selected];
  const weaponStyle = multiFaceted.weaponStyle[selected];
  damageFormula.type = multiFaceted.damageType[selected];

  const updateData = {
    system: {
      weaponStyle: weaponStyle,
      properties: {
        multiFaceted: multiFaceted
      },
      formulas: {
        weaponDamage: damageFormula
      }
    }
  }
  await item.update(updateData);
}