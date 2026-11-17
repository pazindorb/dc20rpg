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
    "Skills": "systems/dc20rpg/templates/sheets/actor/partials/skills.hbs",
    "Trades": "systems/dc20rpg/templates/sheets/actor/partials/trades.hbs",
    "Languages": "systems/dc20rpg/templates/sheets/actor/partials/languages.hbs",
    "Attribute": "systems/dc20rpg/templates/sheets/actor/partials/attribute.hbs",
    "PC Details": "systems/dc20rpg/templates/sheets/actor/partials/pcDetails.hbs"
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
    "Extra Fields": "systems/dc20rpg/templates/dialogs/shared/extra-field.hbs"
  }
}