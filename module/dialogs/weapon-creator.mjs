import { DC20RPG } from "../helpers/config.mjs";
import { datasetOf, valueOf } from "../helpers/listenerEvents.mjs";
import { getValueFromPath, setValueForPath } from "../helpers/utils.mjs";

/**
 * Dialog window for creating weapons.
 */
export class WeaponCreatorDialog extends Dialog {

  constructor(weapon , dialogData = {}, options = {}) {
    super(dialogData, options);
    this.weapon = weapon;
    this._prepareWeaponBlueprint();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/weapon-creator-dialog.hbs",
      classes: ["dc20rpg", "dialog", "flex-dialog"]
    });
  }

  _prepareWeaponBlueprint() {
    const blueprint = {
      weaponType: "melee",
      weaponStyle: "axe",
      secondWeaponStyle: "axe",
      stats: {
        damage: 1,
        dmgType: "slashing",
        secondDmgType: "slashing",
        range: {
          normal: 0,
          max: 0,
          unit: ""
        },
      },
      properties: {
        melee: {
          concealable: {active: false},
          guard: {active: false},
          heavy: {active: false},
          impact: {active: false},
          multiFaceted: {active: false},
          reach: {active: false},
          silent: {active: false},
          toss: {active: false},
          thrown: {active: false},
          twoHanded: {active: false},
          unwieldy: {active: false},
          versatile: {active: false},
        },
        ranged: {
          ammo: {active: true},
          concealable: {active: false},
          heavy: {active: false},
          impact: {active: false},
          longRanged: {active: false},
          reload: {active: false},
          silent: {active: false},
          twoHanded: {active: true},
          unwieldy: {active: true},
        },
        special: {
          capture: {active: false},
          returning: {active: false},
        }
      }
    }
    this.blueprint = blueprint;
  }

  getData() {
    return {
      config: {
        weaponTypes: DC20RPG.weaponTypes,
        meleeWeapons: DC20RPG.meleeWeapons,
        rangedWeapons: DC20RPG.rangedWeapons,
        dmgTypes: DC20RPG.physicalDamageTypes,
        properties: DC20RPG.properties,
      },
      blueprint: this.blueprint
    };
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.activable').click(ev => this._onActivable(datasetOf(ev).path));
    html.find(".input").change(ev => this._onValueChange(datasetOf(ev).path, valueOf(ev)));
    html.find(".selectable").change(ev => this._onValueChange(datasetOf(ev).path, valueOf(ev)));
    html.find(".create-weapon").click(ev => this._onWeaponCreate(ev.preventDefault())); 
  }

  _onValueChange(pathToValue, value) {
    setValueForPath(this, pathToValue, value);
    this._runWeaponStatsCheck();
    this.render(true);
  }

  _onActivable(pathToValue) {
    const value = getValueFromPath(this, pathToValue);
    setValueForPath(this, pathToValue, !value);
    this._runWeaponStatsCheck();
    this.render(true);
  }

  _onWeaponCreate() {
    this._runWeaponStatsCheck();
    const blueprint = this.blueprint;
    const stats = blueprint.stats;
    const rangeType = blueprint.weaponType === "ranged" ? "ranged" : "melee";
    const updateData = {
      system: {
        actionType: "attack",
        weaponType: blueprint.weaponType,
        weaponStyle: blueprint.weaponStyle,
        secondWeaponStyle: blueprint.secondWeaponStyle,
        ["costs.resources.actionPoint"]: 1,
        ["attackFormula.rangeType"]: rangeType,
        properties: this._getPropertiesToUpdate(),
        range: blueprint.stats.range,
        formulas: {
          weaponDamage: {
            formula: stats.damage.toString(),
            type: stats.dmgType,
            category: "damage",
            fail: false,
            failFormula: "",
            each5: false,
            each5Formula: "",
          }
        }
      }
    };
    this.close();
    this.weapon.update(updateData);
  }

  _runWeaponStatsCheck() {
    const weaponType = this.blueprint.weaponType;
    const range = weaponType === "ranged" ? {normal: 15, max: 45} : {normal: 0, max: 0};
    let stats = {
      range: range,
      damage: 1,
      dmgType: this.blueprint.stats.dmgType,
      secondDmgType: this.blueprint.stats.secondDmgType,
      bonusPD: false,
      requiresMastery: false,
    }

    let properties = this.blueprint.properties[weaponType];
    if (weaponType === "special") properties = {...properties, ...this.blueprint.properties["melee"]};
    this.blueprint.stats = this._runPropertiesCheck(stats, properties);
  }

  _runPropertiesCheck(stats, properties) {
    if (properties.heavy?.active) stats.damage += 1;
    if (properties.reload?.active) stats.damage += 1;
    if (properties.toss?.active) stats.range = {normal: 5, max: 10};
    if (properties.thrown?.active) stats.range = {normal: 10, max: 20};
    if (properties.longRanged?.active) stats.range = {normal: 30, max: 90};
    return stats;
  }

  _getPropertiesToUpdate() {
    let propsToUpdate = this.weapon.system.properties;
    Object.entries(propsToUpdate).forEach(([key, prop]) => prop.active = false);
    const properties = this.blueprint.properties;

    const weaponType = this.blueprint.weaponType;
    if (weaponType === "melee")   propsToUpdate = {...propsToUpdate, ...properties["melee"]};
    if (weaponType === "ranged")  propsToUpdate = {...propsToUpdate, ...properties["ranged"]};
    if (weaponType === "special") propsToUpdate = {...propsToUpdate, ...properties["melee"], ...properties["special"]};

    // Prepare Multi-Faceted property
    if (propsToUpdate.multiFaceted.active === true) {
      const blueprint = this.blueprint;
      propsToUpdate.multiFaceted = {
        active: true,
        selected: "first",
        labelKey: blueprint.weaponStyle,
        weaponStyle: {
          first: blueprint.weaponStyle,
          second: blueprint.secondWeaponStyle
        },
        damageType: {
          first: blueprint.stats.dmgType,
          second: blueprint.stats.secondDmgType
        }
      }
    }
    return propsToUpdate;
  }
}

export function createWeaponCreator(weapon) {
  new WeaponCreatorDialog(weapon, {title: "Create Your Weapon"}).render(true);
}