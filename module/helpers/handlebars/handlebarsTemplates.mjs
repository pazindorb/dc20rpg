/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
//  export async function preloadHandlebarsTemplates() {
//   return loadTemplates([

//     // Actor partials.
//     "systems/dc20rpg/templates/actor/parts/actor-header.hbs",
//     "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-left.hbs",
//     "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-character.hbs",
//     "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-attributes.hbs",
//     "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-resistances.hbs",
//     "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-speed.hbs",
//     "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-action-points.hbs",
//     "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-defences.hbs",

//     "systems/dc20rpg/templates/actor/parts/actor-skills.hbs",
//     "systems/dc20rpg/templates/actor/parts/skills-parts/actor-skills-core.hbs",
//     "systems/dc20rpg/templates/actor/parts/skills-parts/actor-skills-languages.hbs",
//     "systems/dc20rpg/templates/actor/parts/skills-parts/actor-skills-trade.hbs",
//     "systems/dc20rpg/templates/actor/parts/skills-parts/actor-skills-proficiencies.hbs",

//     "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-charges.hbs",
//     "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-config.hbs",
//     "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-roll.hbs",
//     "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-details.hbs",
//     "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-usage.hbs",
//     "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-class.hbs",

//     "systems/dc20rpg/templates/actor/parts/actor-features.hbs",
//     "systems/dc20rpg/templates/actor/parts/actor-techniques.hbs",
//     "systems/dc20rpg/templates/actor/parts/actor-inventory.hbs",
//     "systems/dc20rpg/templates/actor/parts/actor-spells.hbs",
//     "systems/dc20rpg/templates/actor/parts/actor-effects.hbs",

//     // Item partials.
//     "systems/dc20rpg/templates/item/parts/item-description.hbs",
    
//     "systems/dc20rpg/templates/item/parts/header-parts/item-header-name.hbs",
//     "systems/dc20rpg/templates/item/parts/header-parts/item-header-usage.hbs",
//     "systems/dc20rpg/templates/item/parts/header-parts/item-header-action.hbs",
//     "systems/dc20rpg/templates/item/parts/header-parts/item-header-armor.hbs",

//     "systems/dc20rpg/templates/item/parts/item-action.hbs",
//     "systems/dc20rpg/templates/item/parts/body-parts/item-action-core-roll.hbs",
//     "systems/dc20rpg/templates/item/parts/body-parts/item-action-target.hbs",
//     "systems/dc20rpg/templates/item/parts/body-parts/item-action-hit.hbs",
//     "systems/dc20rpg/templates/item/parts/body-parts/item-action-save.hbs",
//     "systems/dc20rpg/templates/item/parts/body-parts/item-action-skill.hbs",
//     "systems/dc20rpg/templates/item/parts/body-parts/item-action-formulas.hbs",
//     "systems/dc20rpg/templates/item/parts/body-parts/item-usage.hbs",
//     "systems/dc20rpg/templates/item/parts/body-parts/item-description-text.hbs",
//     "systems/dc20rpg/templates/item/parts/body-parts/item-description-properties.hbs",
//     "systems/dc20rpg/templates/item/parts/body-parts/item-description-item.hbs",
//     "systems/dc20rpg/templates/item/parts/body-parts/item-description-spell.hbs",

//     // Chat partials.
//     "systems/dc20rpg/templates/chat/parts/dice-roll.hbs",
//     "systems/dc20rpg/templates/chat/parts/check-button.hbs",
//     "systems/dc20rpg/templates/chat/parts/save-button.hbs"
//   ]);
// };


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
    ...chatPartials()
  };
}

export function actorPartials() {
  return {
    "Actor Header": "systems/dc20rpg/templates/actor/parts/actor-header.hbs",
    "Image": "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-left.hbs",
    "Character Info": "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-character.hbs",
    "Attributes": "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-attributes.hbs",
    "Resistances": "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-resistances.hbs",
    "Speed": "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-speed.hbs",
    "Defences": "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-defences.hbs",
    "Action Points": "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-action-points.hbs",

    "Actor Skills": "systems/dc20rpg/templates/actor/parts/actor-skills.hbs",
    "Core Skills": "systems/dc20rpg/templates/actor/parts/skills-parts/actor-skills-core.hbs",
    "Trade Skills": "systems/dc20rpg/templates/actor/parts/skills-parts/actor-skills-trade.hbs",
    "Proficiencies": "systems/dc20rpg/templates/actor/parts/skills-parts/actor-skills-proficiencies.hbs",
    "Languages": "systems/dc20rpg/templates/actor/parts/skills-parts/actor-skills-languages.hbs",

    "Features": "systems/dc20rpg/templates/actor/parts/actor-features.hbs",
    "Techniques": "systems/dc20rpg/templates/actor/parts/actor-techniques.hbs",
    "Inventory": "systems/dc20rpg/templates/actor/parts/actor-inventory.hbs",
    "Spells": "systems/dc20rpg/templates/actor/parts/actor-spells.hbs",
    "Effects": "systems/dc20rpg/templates/actor/parts/actor-effects.hbs",

    "Actor Item Charges": "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-charges.hbs",
    "Actor Item Config": "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-config.hbs",
    "Actor Item Details": "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-details.hbs",
    "Actor Item Roll": "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-roll.hbs",
    "Actor Item Basic Resources": "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-usage.hbs",
    "Actor Item Extra Resources": "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-usage-extra.hbs",
    "Actor Item Class": "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-class.hbs"
  }
}

export function itemPartials() {
  return {
    "Item Description": "systems/dc20rpg/templates/item/parts/item-description.hbs",
    
    "Header Item Name": "systems/dc20rpg/templates/item/parts/header-parts/item-header-name.hbs",
    "Header Usage": "systems/dc20rpg/templates/item/parts/header-parts/item-header-usage.hbs",
    "Header Action": "systems/dc20rpg/templates/item/parts/header-parts/item-header-action.hbs",
    "Header Armor": "systems/dc20rpg/templates/item/parts/header-parts/item-header-armor.hbs",

    "Action": "systems/dc20rpg/templates/item/parts/item-action.hbs",
    "Core Roll": "systems/dc20rpg/templates/item/parts/body-parts/item-action-core-roll.hbs",
    "Target": "systems/dc20rpg/templates/item/parts/body-parts/item-action-target.hbs",
    "Hit": "systems/dc20rpg/templates/item/parts/body-parts/item-action-hit.hbs",
    "Save":"systems/dc20rpg/templates/item/parts/body-parts/item-action-save.hbs",
    "Skill":"systems/dc20rpg/templates/item/parts/body-parts/item-action-skill.hbs",
    "Formulas": "systems/dc20rpg/templates/item/parts/body-parts/item-action-formulas.hbs",
    "Usage": "systems/dc20rpg/templates/item/parts/body-parts/item-usage.hbs",
    "Description Text": "systems/dc20rpg/templates/item/parts/body-parts/item-description-text.hbs",
    "Description Properties": "systems/dc20rpg/templates/item/parts/body-parts/item-description-properties.hbs",
    "Description Item Info": "systems/dc20rpg/templates/item/parts/body-parts/item-description-item.hbs",
    "Description Spell": "systems/dc20rpg/templates/item/parts/body-parts/item-description-spell.hbs",
  }
}

export function chatPartials() {
  return {
    "Dice Roll": "systems/dc20rpg/templates/chat/parts/dice-roll.hbs",
    "Check Button": "systems/dc20rpg/templates/chat/parts/check-button.hbs",
    "Save Button": "systems/dc20rpg/templates/chat/parts/save-button.hbs"
  }
}