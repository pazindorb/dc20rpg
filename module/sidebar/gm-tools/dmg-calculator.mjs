import { applyDamage } from "../../helpers/actors/resources.mjs";
import { getSelectedTokens } from "../../helpers/actors/tokens.mjs";
import { activateDefaultListeners } from "../../helpers/listenerEvents.mjs";
import { getLabelFromKey } from "../../helpers/utils.mjs";
import { promptRollToOtherPlayer } from "../../dialogs/roll-prompt.mjs";

export class DmgCalculatorDialog extends Dialog {

  constructor(dialogData = {}, options = {}) {
    super(dialogData, options);
    this.calculationType = "";
    this.fall = {
      spaces: 1,
      acrCheckSucceeded: false,
      fallingAttack: false,
    }
    this.collision = {
      spaces: 1,
      shareDamage: false,
    }
    this.dmg = 0;
    this.token = getSelectedTokens()[0];
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/dmg-calculator-dialog.hbs",
      classes: ["dc20rpg", "dialog", "flex-dialog"],
      width: 450
    });
  }

  getData() {
    this._calculateDamage();
    return {
      calculationTypes: {"fall": "Falling Damage", "collision": "Collision Damage"},
      calculationType: this.calculationType,
      token: this.token,
      fall: this.fall,
      collision: this.collision,
      dmg: this.dmg,
      dmgType: getLabelFromKey(this.dmgType, CONFIG.DC20RPG.DROPDOWN_DATA.damageTypes)
    };
  }

  _calculateDamage() {
    this.dmg = 0;
    const actor = this.token?.actor;

    if (this.calculationType === "fall") {
      const fall = this.fall;
      let agi = 0;
      if (actor) agi = Math.max(actor.system.attributes.agi.value, 0);
      if (fall.spaces <= agi) {
        this.dmgType = "true";
        return;
      }

      let fallDmg = fall.spaces;
      if (fall.fallingAttack) fallDmg = Math.ceil(fallDmg/2);
      if (fall.acrCheckSucceeded) fallDmg = fallDmg - agi;
      this.dmg = fallDmg;
      this.dmgType = "true";
    }

    if (this.calculationType === "collision") {
      const collision = this.collision;
      let collisionDamage = collision.spaces;
      if (actor) {
        const bludge = actor.system.damageReduction.damageTypes.bludgeoning;

        let multiplier = 1;
        if (bludge.vulnerability) multiplier = multiplier * 2;
        if (bludge.resistance) multiplier = multiplier * 0.5;
        if (collision.shareDamage) multiplier = multiplier * 0.5;
        if (bludge.immune) multiplier = 0;

        const valueX = bludge.vulnerable - bludge.resist;
        collisionDamage = (collisionDamage + valueX) * multiplier;
      }
      else if (collision.shareDamage) collisionDamage = Math.ceil(collisionDamage/2);
      this.dmg = collisionDamage;
      this.dmgType = "bludgeoning";
    }
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    activateDefaultListeners(this, html);
    html.find('.ask-for-acr-check').click(ev => this._onAcrobaticsCheck());
    html.find('.apply-damage').click(ev => this._onDmgApply(ev));
    html.find('.close-dialog').click(ev => {ev.preventDefault(); this.close()});
  }

  _onDmgApply(ev) {
    ev.preventDefault();
    if (!this.calculationType) {this.close(); return}
    const actor = this.token?.actor;
    if (!actor) {this.close(); return}

    const source = this.calculationType === "fall" ? "Falling Damage" : "Collision Damage";
    applyDamage(actor, {value: this.dmg, source: source, type: this.dmgType});
    this.close();
  }

  async _onAcrobaticsCheck() {
    const actor = this.token?.actor;
    if (!actor) return;
    
    const acr = CONFIG.DC20RPG.ROLL_KEYS.checks.acr;
    if (!acr) {
      ui.notifications.warn("Acrobatics is not a skill in your world, you cannot roll it.");
      return;
    }

    const against = 10 + this.fall.spaces;
    const details = {
      checkKey: "acr",
      label: getLabelFromKey("acr", CONFIG.DC20RPG.ROLL_KEYS.checks),
      roll: "d20+@skills.acr.modifier",
      type: "skillCheck",
      against: against
    };
    const roll = await promptRollToOtherPlayer(actor, details, true);
    if (roll && (roll.total >= against || roll.crit)) this.fall.acrCheckSucceeded = true;
    else this.fall.acrCheckSucceeded = false;
    this.render();
  }
}

export function createDmgCalculatorDialog() {
  const dialog = new DmgCalculatorDialog({title: "Damage Calculator"});
  dialog.render(true);
}