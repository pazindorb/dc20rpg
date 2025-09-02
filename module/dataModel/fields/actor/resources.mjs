import { generateKey, getValueFromPath } from "../../../helpers/utils.mjs";

export default class ResourceFields extends foundry.data.fields.SchemaField {
  constructor(pcResources, fields={}, options={}) {
    const f = foundry.data.fields;
    const init0 = { required: true, nullable: false, integer: true, initial: 0 };

    const resource = () => ({
      value: new f.NumberField(init0),
      bonus: new f.NumberField(init0),
      max: new f.NumberField(init0),
    })
    fields = {
      ap: new f.SchemaField({
        value: new f.NumberField({ required: true, nullable: false, integer: true, initial: 4 }),
        bonus: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        max: new f.NumberField({ required: true, nullable: false, integer: true, initial: 4 }),
        label: new f.StringField({initial: "dc20rpg.resource.ap"}),
        reset: new f.StringField({initial: "roundEnd"}),
      }),
      custom: new f.ObjectField({required: true}),
      ...fields
    };

    if (pcResources) {
      fields = {
        stamina: new f.SchemaField({
          ...resource(), 
          label: new f.StringField({initial: "dc20rpg.resource.stamina"}),
          maxFormula: new f.StringField({ required: true, initial: "@resources.stamina.bonus + @details.class.bonusStamina"}),
          reset: new f.StringField({initial: "combat"}),
        }),
        mana: new f.SchemaField({
          ...resource(), 
          label: new f.StringField({initial: "dc20rpg.resource.mana"}),
          maxFormula: new f.StringField({ required: true, initial: "@resources.mana.bonus + @details.class.bonusMana"}),
          reset: new f.StringField({initial: "long"}),
        }),
        grit: new f.SchemaField({ 
          ...resource(),
          label: new f.StringField({initial: "dc20rpg.resource.grit"}),
          maxFormula: new f.StringField({ required: true, initial: "2 + @cha + @resources.grit.bonus"}),
          reset: new f.StringField({initial: "long"}),
        }),
        restPoints: new f.SchemaField({
          ...resource(), 
          label: new f.StringField({initial: "dc20rpg.resource.restPoints"}), 
          reset: new f.StringField({initial: "long4h"}),
        }),
        health: new f.SchemaField({
          ...resource(),
          value: new f.NumberField({ required: true, nullable: false, integer: true, initial: 6 }),
          current: new f.NumberField({ required: true, nullable: false, integer: true, initial: 6 }),
          max: new f.NumberField({ required: true, nullable: false, integer: true, initial: 6 }),
          temp: new f.NumberField({ required: true, nullable: true, integer: true, initial: null }),
          useFlat: new f.BooleanField({required: true, initial: false}),
          reset: new f.StringField({initial: ""}),
        }),
        ...fields
      }
    }
    else {
      fields = {
        health: new f.SchemaField({
          ...resource(),
          value: new f.NumberField({ required: true, nullable: false, integer: true, initial: 6 }),
          current: new f.NumberField({ required: true, nullable: false, integer: true, initial: 6 }),
          max: new f.NumberField({ required: true, nullable: false, integer: true, initial: 6 }),
          temp: new f.NumberField({ required: true, nullable: true, integer: true, initial: null }),
          useFlat: new f.BooleanField({required: true, initial: true}),
          reset: new f.StringField({initial: ""}),
        }),
        ...fields
      }
    }
    super(fields, options);
  }
}

export function enhanceResourcesObject(actor) {
  actor.resources = {};
  const keys = Object.keys(actor.system.resources);
  for (const key of keys) {
    switch (key) {
      case "custom": _enhanceCustomResources(actor); break;
      default: _enhanceResource(key, actor); break;
    }
  }

  actor.resources.createCustomResource = async (data, key) => await _createCustomResource(data, key, actor);
  actor.resources.removeCustomResource = async (key) => await _removeCustomResource(key, actor);
  actor.resources.hasResource = (key) => !!actor.resources[key];
  actor.resources.iterate = () => _iterateOverResources(actor);
}

//==================================
//    RESOURCE SPECIFIC METHODS    =
//==================================
function _enhanceResource(resourceKey, actor) {
  const original = getValueFromPath(actor, `system.resources.${resourceKey}`);
  const enhanced = foundry.utils.deepClone(original);

  enhanced.isCustom = resourceKey.includes("custom.");
  enhanced.key = enhanced.isCustom ? resourceKey.substr(7) : resourceKey;
  enhanced.fullKey = resourceKey;

  enhanced.regain = async (amount) => await _regainResource(amount, enhanced, actor);
  enhanced.canSpend = (amount) => _canSpendResource(amount, enhanced, actor);
  enhanced.spend = async (amount, allowNegatives) => await _spendResource(amount, enhanced, actor, allowNegatives);
  enhanced.checkAndSpend = (amount) => {
    if (enhanced.canSpend(amount)) {
      enhanced.spend(amount);
      return true;
    }
    return false;
  };

  actor.resources[enhanced.key] = enhanced;
}

function _enhanceCustomResources(actor) {
  const keys = Object.keys(actor.system.resources.custom);
  for (const key of keys) {
    const fullKey = `custom.${key}`;
    _enhanceResource(fullKey, actor, "value");

    actor.resources[key].changeIcon = () => {
      new FilePicker({
        type: "image",
        displayMode: "tiles",
        callback: (path) => {
          if (!path) return;
          actor.update({[`system.resources.${fullKey}.img`]: path});
        }
      }).render();
    }
  }
}

async function _regainResource(amount, resource, actor) {
  if (amount === "max") amount = resource.max;
  if (amount === "half") amount = Math.ceil(resource.max/2);
  amount = parseInt(amount);
  if (amount <= 0) return;

  if (!resource.isCustom) actor = actor.companionShareCheck(resource.key); // Key or full key? not important for now as we can only share health
  
  const current = resource.value;
  const max = resource.max;
  const newAmount = Math.min(current + amount, max);
  await actor.update({[`system.resources.${resource.fullKey}.value`] : newAmount});
}

async function _spendResource(amount, resource, actor, allowNegatives=false) {
  if (!amount) return;
  amount = parseInt(amount);
  if (amount === 0) return;

  if (!resource.isCustom) actor = actor.companionShareCheck(resource.key);
  
  const current = resource.value;
  let newAmount = current - amount;
  if (!allowNegatives) newAmount = Math.max(newAmount, 0);
  await actor.update({[`system.resources.${resource.fullKey}.value`] : newAmount});
}

function _canSpendResource(amount, resource, actor) {
  if (!amount) return true;
  amount = parseInt(amount);
  if (amount <= 0) return true;

  if (!resource.isCustom) actor = actor.companionShareCheck(resource.key);

  const current = resource.value;
  const newAmount = current - amount;
  if (newAmount < 0) {
    ui.notifications.error(`Cannot subract ${amount} ${resource.label} from ${actor.name}. Not enough ${resource.label} (Current amount: ${current}).`);
    return false;
  }

  // Resource spend limit - TODO in the future
  if (resource.key === "ap") {
    const spendLimit = actor.system.globalModifier.prevent.goUnderAP;
    if (newAmount < spendLimit) {
      if (spendLimit >= resource.max) ui.notifications.error(`You cannot spend AP`);
      else ui.notifications.error(`You cannot go under ${spendLimit} AP`);
      return false;
    }
  }
  return true;
}

//==================================
//    RESOURCES UTILS COLLECTION   =
//==================================
async function _createCustomResource(data={}, key, actor) {
  const resourceKey = key || generateKey();
  // TODO: should we scan all keys active on actor and forbid all
  const forbidenKeys = ["ap", "mana", "stamina", "grit", "restPoints", "health"]; 
  if (forbidenKeys.includes(key)) {
    ui.notifications.warn(`Forbidden resource key: '${key}', use different one!`);
    return;
  }

  const newResource = {
    label: "New Resource",
    img: "icons/svg/item-bag.svg",
    value: 0,
    maxFormula: null,
    max: 0,
    reset: "",
    ...data
  }
  await actor.update({[`system.resources.custom.${resourceKey}`] : newResource});
}

async function _removeCustomResource(key, actor) {
  await actor.update({[`system.resources.custom.-=${key}`]: null });
}

function _iterateOverResources(actor) {
  return Object.values(actor.resources).filter(res => res.key);
}