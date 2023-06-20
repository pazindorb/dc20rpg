/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export async function preloadHandlebarsTemplates() {
  return loadTemplates([

    // Actor partials.
    "systems/dc20rpg/templates/actor/parts/actor-header.hbs",
    "systems/dc20rpg/templates/actor/parts/actor-skills.hbs",
    "systems/dc20rpg/templates/actor/parts/actor-features.hbs",
    "systems/dc20rpg/templates/actor/parts/actor-items.hbs",
    "systems/dc20rpg/templates/actor/parts/actor-spells.hbs",
    "systems/dc20rpg/templates/actor/parts/actor-effects.hbs",

    // Item partials.
    "systems/dc20rpg/templates/item/parts/item-header.hbs",
    "systems/dc20rpg/templates/item/parts/item-usage.hbs",
    "systems/dc20rpg/templates/item/parts/item-action.hbs",
    "systems/dc20rpg/templates/item/parts/item-description.hbs",
    "systems/dc20rpg/templates/item/parts/item-header-action.hbs",
  ]);
};
