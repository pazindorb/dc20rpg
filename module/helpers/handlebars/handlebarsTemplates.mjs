/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export async function preloadHandlebarsTemplates() {
  return loadTemplates(Object.values(allPartials()));
};

export function allPartials() {
  return {
    ...actorPartials(),
    ...itemPartials(),
    ...chatPartials(),
    ...otherPartials()
  };
}

function actorPartials() {
  return {
    "Actor Resources": "systems/dc20rpg/templates/actor/parts/actor-resources.hbs",
    "Actor Header": "systems/dc20rpg/templates/actor/parts/actor-header.hbs",
    "Image": "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-left.hbs",
    "Character Info": "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-character.hbs",
    "Npc Info": "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-npc.hbs",
    "Actor Header Middle": "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-middle-row.hbs",
    "Speed": "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-speed.hbs",
    "Exhaustion": "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-exhaustion.hbs",
    "Defences": "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-defences.hbs",
    "Action Points": "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-action-points.hbs",

    "Core": "systems/dc20rpg/templates/actor/parts/actor-core.hbs",
    "Skills": "systems/dc20rpg/templates/actor/parts/core-parts/actor-core-skills.hbs",
    "Masteries": "systems/dc20rpg/templates/actor/parts/core-parts/actor-core-masteries.hbs",
    "Resistances": "systems/dc20rpg/templates/actor/parts/core-parts/actor-core-resistances.hbs",

    "Features": "systems/dc20rpg/templates/actor/parts/actor-features.hbs",
    "Techniques": "systems/dc20rpg/templates/actor/parts/actor-techniques.hbs",
    "Attacks": "systems/dc20rpg/templates/actor/parts/actor-attacks.hbs",
    "Inventory": "systems/dc20rpg/templates/actor/parts/actor-inventory.hbs",
    "Spells": "systems/dc20rpg/templates/actor/parts/actor-spells.hbs",
    "Actor Items": "systems/dc20rpg/templates/actor/parts/actor-items.hbs",

    "Actor Item Charges": "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-charges.hbs",
    "Actor Item Config": "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-config.hbs",
    "Actor Item Details": "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-details.hbs",
    "Actor Item Roll": "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-roll.hbs",
    "Actor Item Resources": "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-usage.hbs",
    "Actor Item Item Usage": "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-usage-extra.hbs",
    "Actor Item Tooltip": "systems/dc20rpg/templates/actor/parts/actor-tooltip.hbs"
  }
}

function itemPartials() {
  return {
    "Description": "systems/dc20rpg/templates/item/parts/item-description.hbs",
    "Usage": "systems/dc20rpg/templates/item/parts/item-usage.hbs",
    "Roll": "systems/dc20rpg/templates/item/parts/item-roll.hbs",
    "Outcomes": "systems/dc20rpg/templates/item/parts/item-outcomes.hbs",

    "Properties": "systems/dc20rpg/templates/item/parts/body-parts/item-properties.hbs",

    "Text Area": "systems/dc20rpg/templates/item/parts/body-parts/description/item-text-area.hbs",
    "Details Column": "systems/dc20rpg/templates/item/parts/body-parts/description/item-details-column.hbs",
    
    "Core Roll": "systems/dc20rpg/templates/item/parts/body-parts/roll/item-core-roll.hbs",
    "Target": "systems/dc20rpg/templates/item/parts/body-parts/roll/item-target.hbs",
    "Hit": "systems/dc20rpg/templates/item/parts/body-parts/roll/item-hit.hbs",
    "Save":"systems/dc20rpg/templates/item/parts/body-parts/roll/item-save.hbs",
    "Check":"systems/dc20rpg/templates/item/parts/body-parts/roll/item-skill.hbs",
    "Formulas": "systems/dc20rpg/templates/item/parts/body-parts/roll/item-formulas.hbs",

    "Charges": "systems/dc20rpg/templates/item/parts/body-parts/usage/item-charges.hbs",
    "Core Resources": "systems/dc20rpg/templates/item/parts/body-parts/usage/item-core-resources.hbs",
    "Other Item Usage": "systems/dc20rpg/templates/item/parts/body-parts/usage/item-other-item-usage.hbs",
    
    "Item Name": "systems/dc20rpg/templates/item/parts/header-parts/item-header-name.hbs",
    "Usage Header": "systems/dc20rpg/templates/item/parts/header-parts/item-header-usage.hbs",
    "Roll Header": "systems/dc20rpg/templates/item/parts/header-parts/item-header-roll.hbs",
    "Armor Header": "systems/dc20rpg/templates/item/parts/header-parts/item-header-armor.hbs",
  }
}

function chatPartials() {
  return {
    "Dice Roll": "systems/dc20rpg/templates/chat/parts/dice-roll.hbs",
    "Check Button": "systems/dc20rpg/templates/chat/parts/check-button.hbs",
    "Save Button": "systems/dc20rpg/templates/chat/parts/save-button.hbs",
    "Chat Outcomes": "systems/dc20rpg/templates/chat/parts/outcomes.hbs"
  }
}

export function otherPartials() {
  return {
    "Effects Tables": "systems/dc20rpg/templates/effects/effects.hbs"
  }
}