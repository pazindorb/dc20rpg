/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export async function preloadHandlebarsTemplates() {
  return foundry.applications.handlebars.loadTemplates(Object.values(allPartials()));
};

export function allPartials() {
  return {
    ...actorPartials(),
    ...chatPartials(),
    ...sharedPartials(),
    ...itemPartials()
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
    "Roll Request": "systems/dc20rpg/templates/sheets/item/partials/rollRequest.hbs",
    "Against Status": "systems/dc20rpg/templates/sheets/item/partials/againstStatus.hbs",
    "Formula": "systems/dc20rpg/templates/sheets/item/partials/formula.hbs",
  }
}

function chatPartials() {
  return {
    "Core Roll": "systems/dc20rpg/templates/chat/partial/core-roll.hbs",
    "Target": "systems/dc20rpg/templates/chat/partial/target.hbs",
    "Formula Row": "systems/dc20rpg/templates/chat/partial/formula-row.hbs"
  }
}

export function sharedPartials() {
  return {
    "Tooltip": "systems/dc20rpg/templates/shared/tooltip.hbs",
    "Context Menu": "systems/dc20rpg/templates/shared/context-menu.hbs",
    "Effects Tracker": "systems/dc20rpg/templates/sidebar/token-hotbar/effects-tracker.hbs",
    "Help Tracker": "systems/dc20rpg/templates/sidebar/token-hotbar/help-tracker.hbs",
  }
}