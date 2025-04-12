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
    ...sharedPartials()
  };
}

function actorPartials() {
  return {
    "Character Skills": "systems/dc20rpg/templates/actor_v2/parts/character/skills.hbs",
    
    "Dmg Reduction": "systems/dc20rpg/templates/actor_v2/parts/shared/dmg-reduction.hbs",
    "Status Resistances": "systems/dc20rpg/templates/actor_v2/parts/shared/condition-immunities.hbs",
    "Item Table": "systems/dc20rpg/templates/actor_v2/parts/shared/item-table.hbs",
    "Effects Table": "systems/dc20rpg/templates/actor_v2/parts/shared/effects-table.hbs",
    "Traits Table": "systems/dc20rpg/templates/actor_v2/parts/shared/traits-table.hbs",
    "Statuses": "systems/dc20rpg/templates/actor_v2/parts/shared/statuses.hbs"
  }
}

function itemPartials() {
  return {
    "Header": "systems/dc20rpg/templates/item_v2/parts/shared/header.hbs",
    "Advanced": "systems/dc20rpg/templates/item_v2/parts/shared/advanced.hbs",
    "Properties": "systems/dc20rpg/templates/item_v2/parts/shared/properties.hbs",
    "Roll": "systems/dc20rpg/templates/item_v2/parts/shared/roll.hbs",
    "Roll Details": "systems/dc20rpg/templates/item_v2/parts/shared/roll-tab/roll-details.hbs",
    "Usage Cost": "systems/dc20rpg/templates/item_v2/parts/shared/roll-tab/usage-cost.hbs",
    "Target": "systems/dc20rpg/templates/item_v2/parts/shared/roll-tab/target.hbs",
    "Advancements": "systems/dc20rpg/templates/item_v2/parts/shared/advancements.hbs",
    "Basic Config": "systems/dc20rpg/templates/item_v2/parts/shared/basic-config.hbs", 
    "Advancement Core": "systems/dc20rpg/templates/item_v2/parts/shared/advanced-tab/adv-core.hbs",
    "Enhancements": "systems/dc20rpg/templates/item_v2/parts/shared/advanced-tab/enhancements.hbs",
    "Conditional": "systems/dc20rpg/templates/item_v2/parts/shared/advanced-tab/conditionals.hbs"
  }
}

export function sharedPartials() {
  return {
    "Tooltip": "systems/dc20rpg/templates/shared/tooltip.hbs",
    "Context Menu": "systems/dc20rpg/templates/shared/context-menu.hbs",
  }
}