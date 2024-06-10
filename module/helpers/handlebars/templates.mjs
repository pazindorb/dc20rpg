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
    "Character Header": "systems/dc20rpg/templates/actor_v2/parts/character/header.hbs",
    "Character Skills": "systems/dc20rpg/templates/actor_v2/parts/character/skills.hbs",
    
    "Header": "systems/dc20rpg/templates/actor_v2/parts/shared/header.hbs",
    "Banner": "systems/dc20rpg/templates/actor_v2/parts/shared/banner.hbs",
    "Roll Menu": "systems/dc20rpg/templates/actor_v2/parts/shared/roll-menu.hbs",
    "Check/DC": "systems/dc20rpg/templates/actor_v2/parts/shared/check-dc.hbs",
    "Skills": "systems/dc20rpg/templates/actor_v2/parts/shared/skills.hbs",
    "Dmg Reduction": "systems/dc20rpg/templates/actor_v2/parts/shared/dmg-reduction.hbs",
    "Condition Immunities": "systems/dc20rpg/templates/actor_v2/parts/shared/condition-immunities.hbs",
    "Action Table": "systems/dc20rpg/templates/actor_v2/parts/shared/action-table.hbs",
    "Item Table": "systems/dc20rpg/templates/actor_v2/parts/shared/item-table.hbs",
    "Effects Table": "systems/dc20rpg/templates/actor_v2/parts/shared/effects-table.hbs",
    "Statuses": "systems/dc20rpg/templates/actor_v2/parts/shared/statuses.hbs"
  }
}

function itemPartials() {
  return {
    "Description": "systems/dc20rpg/templates/item/parts/item-description.hbs",
    "Usage": "systems/dc20rpg/templates/item/parts/item-usage.hbs",
    "Roll": "systems/dc20rpg/templates/item/parts/item-roll.hbs",
    "Enhancements": "systems/dc20rpg/templates/item/parts/item-enhancements.hbs",
    "Properties": "systems/dc20rpg/templates/item/parts/body-parts/item-properties.hbs",

    "Text Area": "systems/dc20rpg/templates/item/parts/body-parts/description/item-text-area.hbs",
    "Details Column": "systems/dc20rpg/templates/item/parts/body-parts/description/item-details-column.hbs",
    
    "Core Roll": "systems/dc20rpg/templates/item/parts/body-parts/roll/item-core-roll.hbs",
    "Target": "systems/dc20rpg/templates/item/parts/body-parts/roll/item-target.hbs",
    "Save":"systems/dc20rpg/templates/item/parts/body-parts/roll/item-save.hbs",
    "Check":"systems/dc20rpg/templates/item/parts/body-parts/roll/item-check.hbs",
    "Formulas": "systems/dc20rpg/templates/item/parts/body-parts/roll/item-formulas.hbs",

    "Charges": "systems/dc20rpg/templates/item/parts/body-parts/usage/item-charges.hbs",
    "Core Resources": "systems/dc20rpg/templates/item/parts/body-parts/usage/item-core-resources.hbs",
    "Other Item Usage": "systems/dc20rpg/templates/item/parts/body-parts/usage/item-other-item-usage.hbs",

    "Advancements": "systems/dc20rpg/templates/item/parts/body-parts/advancements/item-class-advancements.hbs",
    "Scaling": "systems/dc20rpg/templates/item/parts/body-parts/advancements/item-class-scaling-values.hbs",
    
    "Item Name": "systems/dc20rpg/templates/item/parts/header-parts/item-header-name.hbs",
    "Usage Header": "systems/dc20rpg/templates/item/parts/header-parts/item-header-usage.hbs",
    "Roll Header": "systems/dc20rpg/templates/item/parts/header-parts/item-header-roll.hbs",
    "Armor Header": "systems/dc20rpg/templates/item/parts/header-parts/item-header-armor.hbs",
  }
}

function chatPartials() {
  return {
    "Dice Roll": "systems/dc20rpg/templates/chat/parts/dice-roll.hbs",
    "Check Details": "systems/dc20rpg/templates/chat/parts/check-button.hbs",
    "Save Details": "systems/dc20rpg/templates/chat/parts/save-button.hbs",
    "Targets": "systems/dc20rpg/templates/chat/parts/targets.hbs",
  }
}

export function otherPartials() {
  return {
    "Effects Tables": "systems/dc20rpg/templates/effects/effects.hbs",
    "Tooltip": "systems/dc20rpg/templates/shared/tooltip.hbs",
  }
}