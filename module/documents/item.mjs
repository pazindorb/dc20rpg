import { createTemporaryMacro, runTemporaryMacro } from "../helpers/macros.mjs";
import { translateLabels } from "../helpers/utils.mjs";
import { makeCalculations } from "./item/item-calculations.mjs";
import { initFlags } from "./item/item-flags.mjs";
import { prepareRollData } from "./item/item-rollData.mjs";

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class DC20RpgItem extends Item {

  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  prepareBaseData() {
    super.prepareBaseData();
    initFlags(this);
  }
 
  prepareDerivedData() {
    makeCalculations(this);
    translateLabels(this);
    this.prepared = true; // Mark item as prepared
  }

  /**
   * Prepare a data object which is passed to any Roll formulas which are created related to this Item
   * @private
   */
  getRollData() {
    const data = {...super.getRollData()}
    return prepareRollData(this, data);
  }

  swapMultiFaceted() {
    const multiFaceted = this.system.properties?.multiFaceted;
    if (!multiFaceted || !multiFaceted.active) return;

    const damageFormula = this.system.formulas.weaponDamage;
    if (!damageFormula) {
      ui.notifications.error("Original damage formula cannot be found. You have to recreate this item to fix that problem");
      return;
    }

    if (multiFaceted.selected === "first") multiFaceted.selected = "second";
    else multiFaceted.selected = "first";
    const selected = multiFaceted.selected;

    multiFaceted.labelKey = multiFaceted.weaponStyle[selected];
    const weaponStyle = multiFaceted.weaponStyle[selected];
    damageFormula.type = multiFaceted.damageType[selected];

    const updateData = {
      system: {
        weaponStyle: weaponStyle,
        properties: {
          multiFaceted: multiFaceted
        },
        formulas: {
          weaponDamage: damageFormula
        }
      }
    }
    this.update(updateData);
  }

  async update(data={}, operation={}) {
    try {
      await super.update(data, operation);
    } catch (error) {
      if (error.message.includes("does not exist!")) {
        ui.notifications.clear()
      }
      else throw error;
    }
  }

  editItemMacro(key) {
    const command = this.system.macros[key];
    const macro = createTemporaryMacro(command, this, {item: this, key: key});
    macro.canUserExecute = (user) => {
      ui.notifications.warn("This is an Item Macro and it cannot be executed here.");
      return false;
    };
    macro.sheet.render(true);
  }

  async _onCreate(data, options, userId) {
    const onCreateReturn = await super._onCreate(data, options, userId);
    await runTemporaryMacro(this, "onCreate", this.actor);
    return onCreateReturn;
  }

  async _preDelete(options, user) {
    await runTemporaryMacro(this, "preDelete", this.actor);
    return await super._preDelete(options, user);
  }
}
