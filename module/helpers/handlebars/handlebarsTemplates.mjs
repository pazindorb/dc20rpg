/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export async function preloadHandlebarsTemplates() {
  return loadTemplates([

    // Actor partials.
    "systems/dc20rpg/templates/actor/parts/actor-header.hbs",
    "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-left.hbs",
    "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-character.hbs",
    "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-attributes.hbs",
    "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-resistances.hbs",
    "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-speed.hbs",
    "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-action-points.hbs",
    "systems/dc20rpg/templates/actor/parts/header-parts/actor-header-defences.hbs",

    "systems/dc20rpg/templates/actor/parts/actor-skills.hbs",
    "systems/dc20rpg/templates/actor/parts/skills-parts/actor-skills-core.hbs",
    "systems/dc20rpg/templates/actor/parts/skills-parts/actor-skills-languages.hbs",
    "systems/dc20rpg/templates/actor/parts/skills-parts/actor-skills-trade.hbs",

    "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-charges.hbs",
    "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-config.hbs",
    "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-roll.hbs",
    "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-details.hbs",
    "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-usage.hbs",
    "systems/dc20rpg/templates/actor/parts/items-parts/actor-items-row-class.hbs",

    "systems/dc20rpg/templates/actor/parts/actor-features.hbs",
    "systems/dc20rpg/templates/actor/parts/actor-inventory.hbs",
    "systems/dc20rpg/templates/actor/parts/actor-spells.hbs",
    "systems/dc20rpg/templates/actor/parts/actor-effects.hbs",

    // Item partials.
    "systems/dc20rpg/templates/item/parts/item-description.hbs",
    
    "systems/dc20rpg/templates/item/parts/header-parts/item-header-name.hbs",
    "systems/dc20rpg/templates/item/parts/header-parts/item-header-usage.hbs",
    "systems/dc20rpg/templates/item/parts/header-parts/item-header-action.hbs",

    "systems/dc20rpg/templates/item/parts/item-action.hbs",
    "systems/dc20rpg/templates/item/parts/body-parts/item-action-core-roll.hbs",
    "systems/dc20rpg/templates/item/parts/body-parts/item-action-target.hbs",
    "systems/dc20rpg/templates/item/parts/body-parts/item-action-hit.hbs",
    "systems/dc20rpg/templates/item/parts/body-parts/item-action-save.hbs",
    "systems/dc20rpg/templates/item/parts/body-parts/item-action-skill.hbs",
    "systems/dc20rpg/templates/item/parts/body-parts/item-action-formulas.hbs",
    "systems/dc20rpg/templates/item/parts/body-parts/item-usage.hbs",

    // Chat partials.
    "systems/dc20rpg/templates/chat/parts/dice-roll.hbs",
    "systems/dc20rpg/templates/chat/parts/check-button.hbs",
    "systems/dc20rpg/templates/chat/parts/save-button.hbs"
  ]);
};
