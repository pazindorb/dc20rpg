import { DC20Dialog } from "../../dialogs/dc20Dialog.mjs";
import { applyDamage } from "../../helpers/actors/resources.mjs";
import { getSelectedTokens } from "../../helpers/actors/tokens.mjs";
import { calculateForTarget } from "../../helpers/targets.mjs";
export class DamageCalculator extends DC20Dialog {

  static open() {
    new DamageCalculator().render(true);
  }

  constructor(options={}) {
    super(options);
    this.calculationType = "";
    this.distance = 0;
    this._prepareTokens();
  }

  _prepareTokens() {
    const tokens = {} 
    getSelectedTokens()
      .filter(token => token.actor)
      .forEach(token => {
        tokens[token.id] = {
          token: token,
          shareDamage: false,
          uncontrolled: false,
          outcome: null,
          rollDC: 10,
          result: null,
          damage: null,
          damageTitle: null,
          awaiting: false
        }
      });
    this.tokens = tokens;
  }

  /** @override */
  static PARTS = {
    root: {
      template: "systems/dc20rpg/templates/dialogs/gm-tools/dmg-calculator.hbs",
    }
  };

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Damage Calculator";
    initialized.window.icon = "fa-solid fa-calculator-simple";
    initialized.position.width = 500;

    initialized.actions.apply = this._onApply;
    initialized.actions.askForRoll = this._onRoll;
    initialized.actions.refresh = this._onRefresh;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const dmgType = this.calculationType === "fall" ? "true" : "bludgeoning";
    this._calculate(dmgType, this.calculationType === "fall");
    context.tokens = this.tokens;
    
    context.calculationType = this.calculationType;
    context.calculationTypes = {
      fall: "Falling Damage",
      collision: "Collision Damage"
    }
    if (this.calculationType) context.showConfig = true;

    context.distance = this.distance;
    context.dmgType = dmgType;
    
    return context;
  }

  _calculate(dmgType, fall) {
    Object.values(this.tokens).forEach(token => {
      token.rollDC = 10 + this.distance + (token.uncontrolled ? 5 : 0);

      const system = token.token.actor.system
      let fallKey = system.jump.key || "agi";
      if (fallKey === "flat") fallKey = "agi";
      const attribute = Math.max(system.attributes[fallKey].value, 0);

      let dmg = this.distance;
      if (fall && !token.uncontrolled && attribute >= dmg) dmg = 0;
      if (token.outcome === "success") dmg = Math.max(dmg - attribute, 0);
      if (token.shareDamage) dmg = Math.ceil(dmg/2);

      const dmgWrapper = { value: dmg, source: "", type: dmgType };
      const formulaRoll = { clear: {...dmgWrapper}, modified: {...dmgWrapper} }
      const damage = calculateForTarget(token.token.document.toTarget(), formulaRoll, {isDamage: true});
      
      token.damage = damage.clear.value;
      token.damageTitle = `Apply ${token.damage} ${game.i18n.localize(`dc20rpg.reductions.${dmgType}`)} Damage`;
    })
  }

  async _onRoll(event, target) {
    event.preventDefault();
    const dataset = target.dataset;
    const tokenId = dataset.tokenId;
    const wrapper = this.tokens[tokenId];
    wrapper.awaiting = true;
    this.render();

    const actor = wrapper.token.actor;
    actor.rollPopup("acr", "check", { sendToActorOwners: true }).then(result => {
        wrapper.result = result._total;
        if (wrapper.rollDC <= wrapper.result) wrapper.outcome = "success";
        else wrapper.outcome = "fail";
        this.render();
      })
  }

  async _onApply(event, target) {
    event.preventDefault();
    const dataset = target.dataset;
    const tokenId = dataset.tokenId;
    
    const wrapper = this.tokens[tokenId];
    const damage = {
      value: wrapper.damage,
      source: game.i18n.localize(`dc20rpg.dialog.dmgCalculator.${this.calculationType}`)
    };
    const actor = wrapper.token.actor;
    applyDamage(actor, damage);
  }

  _onRefresh() {
    event.preventDefault();
    this._prepareTokens();
    this.render();
  }
}