import { addItemToActorInterceptor, modifiyItemOnActorInterceptor, removeItemFromActorInterceptor } from "../helpers/actors/itemsOnActor.mjs";
import { itemMeetsUseConditions } from "../helpers/conditionals.mjs";
import { toggleCheck } from "../helpers/items/itemConfig.mjs";
import { createTemporaryMacro, runTemporaryItemMacro } from "../helpers/macros.mjs";
import { translateLabels } from "../helpers/utils.mjs";
import { makeCalculations } from "./item/item-calculations.mjs";
import { initFlags } from "./item/item-flags.mjs";
import { prepareRollData } from "./item/item-rollData.mjs";

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class DC20RpgItem extends Item {
  static enhLoopCounter = 0;

  get checkKey() {
    const actionType = this.system.actionType;
    if (actionType === "attack") return this.system.attackFormula.checkType.substr(0, 3);
    if (actionType === "check") return this.system.check.checkKey;
    return null;
  }

  get allEffects() {
    const effects = [];
    for (const effect of this.effects) {
      effects.push(effect);
    }
    return effects;
  }

  get allEnhancements() {
    let enhancements = new Map();
    if (!this.system.enhancements) return enhancements;

    // Collect enhancements from that specific item
    for (const [key, enh] of Object.entries(this.system.enhancements)) {
      enh.sourceItemId = this.id;
      enh.sourceItemName = this.name;
      enh.sourceItemImg = this.img;
      enhancements.set(key, enh);
    }

    const parent = this.actor;
    if (!parent) return enhancements;

    // We need to deal with case where items call each other in a infinite loop
    // We expect 10 to be deep enough to collect all the coppied enhancements
    let firstCall = false;
    if (DC20RpgItem.enhLoopCounter === 0) firstCall = true;
    if (DC20RpgItem.enhLoopCounter > 10) return enhancements;
    DC20RpgItem.enhLoopCounter++;

    // Collect copied enhancements
    for (const itemWithCopyEnh of parent.itemsWithEnhancementsToCopy) {
      if (itemWithCopyEnh.itemId === this.id) continue;
      if (itemMeetsUseConditions(itemWithCopyEnh.copyFor, this)) {
        const item = parent.items.get(itemWithCopyEnh.itemId);
        if (this.id === item.system.usesWeapon?.weaponId) continue; //Infinite loop when it happends
        if (item && item.system.copyEnhancements?.copy && toggleCheck(item, item.system.copyEnhancements?.linkWithToggle)) {
          enhancements = new Map([...enhancements, ...item.allEnhancements]);
        }
      }
    }

    // Collet from used weapon
    const usesWeapon = this.system.usesWeapon;
    if (usesWeapon?.weaponAttack) {
      const weapon = parent.items.get(usesWeapon.weaponId);
      if (weapon) {
        enhancements = new Map([...enhancements, ...weapon.allEnhancements]);
      }
    }

    if (firstCall) DC20RpgItem.enhLoopCounter = 0;
    return enhancements;
  }

  get activeEnhancements() {
    const active = new Map();
    for (const [key, enh] of this.allEnhancements.entries()) {
      if (enh.number > 0) active.set(key, enh);
    }
    return active
  }

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

  getEffectWithName(effectName) {
    return this.effects.getName(effectName);
  }

  editItemMacro(key) {
    const command = this.system.macros[key]?.command;
    if (!command === undefined) return;
    const macro = createTemporaryMacro(command, this, {item: this, key: key});
    macro.canUserExecute = (user) => {
      ui.notifications.warn("This is an Item Macro and it cannot be executed here.");
      return false;
    };
    macro.sheet.render(true);
  }

  async _onCreate(data, options, userId) {
    const onCreateReturn = super._onCreate(data, options, userId);
    if (userId === game.user.id && this.actor) {
      await runTemporaryItemMacro(this, "onCreate", this.actor);
      addItemToActorInterceptor(this, this.actor);
    }
    return onCreateReturn;
  }

  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (userId === game.user.id && this.actor) {
      modifiyItemOnActorInterceptor(this, changed, this.actor);
    }
  }

  async _preDelete(options, user) {
    if (this.actor) {
      await runTemporaryItemMacro(this, "preDelete", this.actor);
      removeItemFromActorInterceptor(this, this.actor);
    }
    return await super._preDelete(options, user);
  }
}
