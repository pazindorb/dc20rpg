import { getSimplePopup } from "../dialogs/simple-popup.mjs";
import { datasetOf, valueOf } from "../helpers/listenerEvents.mjs";

export function defaultSkillList() {
  return {
    skills: {
      awa: SkillConfiguration.skill("prime", "dc20rpg.skills.awa"),
      acr: SkillConfiguration.skill("agi", "dc20rpg.skills.acr"),
      ani: SkillConfiguration.skill("cha", "dc20rpg.skills.ani"),
      ath: SkillConfiguration.skill("mig", "dc20rpg.skills.ath"),
      inf: SkillConfiguration.skill("cha", "dc20rpg.skills.inf"),
      inm: SkillConfiguration.skill("mig", "dc20rpg.skills.inm"),
      ins: SkillConfiguration.skill("cha", "dc20rpg.skills.ins"),
      inv: SkillConfiguration.skill("int", "dc20rpg.skills.inv"),
      med: SkillConfiguration.skill("int", "dc20rpg.skills.med"),
      ste: SkillConfiguration.skill("agi", "dc20rpg.skills.ste"),
      sur: SkillConfiguration.skill("int", "dc20rpg.skills.sur"),
      tri: SkillConfiguration.skill("agi", "dc20rpg.skills.tri")
    },
    trades: {
      arc: SkillConfiguration.skill("int", "dc20rpg.trades.arc"),
      his: SkillConfiguration.skill("int", "dc20rpg.trades.his"),
      nat: SkillConfiguration.skill("int", "dc20rpg.trades.nat"),
      occ: SkillConfiguration.skill("int", "dc20rpg.trades.occ"),
      rel: SkillConfiguration.skill("int", "dc20rpg.trades.rel"),
      alc: SkillConfiguration.skill("int", "dc20rpg.trades.alc"),
      bla: SkillConfiguration.skill("mig", "dc20rpg.trades.bla"),
      bre: SkillConfiguration.skill("int", "dc20rpg.trades.bre"),
      cap: SkillConfiguration.skill("agi", "dc20rpg.trades.cap"),
      car: SkillConfiguration.skill("int", "dc20rpg.trades.car"),
      coo: SkillConfiguration.skill("int", "dc20rpg.trades.coo"),
      cry: SkillConfiguration.skill("int", "dc20rpg.trades.cry"),
      dis: SkillConfiguration.skill("cha", "dc20rpg.trades.dis"),
      gam: SkillConfiguration.skill("cha", "dc20rpg.trades.gam"),
      gla: SkillConfiguration.skill("mig", "dc20rpg.trades.gla"),
      her: SkillConfiguration.skill("int", "dc20rpg.trades.her"),
      ill: SkillConfiguration.skill("agi", "dc20rpg.trades.ill"),
      jew: SkillConfiguration.skill("agi", "dc20rpg.trades.jew"),
      lea: SkillConfiguration.skill("agi", "dc20rpg.trades.lea"),
      loc: SkillConfiguration.skill("agi", "dc20rpg.trades.loc"),
      mas: SkillConfiguration.skill("mig", "dc20rpg.trades.mas"),
      mus: SkillConfiguration.skill("cha", "dc20rpg.trades.mus"),
      scu: SkillConfiguration.skill("agi", "dc20rpg.trades.scu"),
      the: SkillConfiguration.skill("cha", "dc20rpg.trades.the"),
      tin: SkillConfiguration.skill("int", "dc20rpg.trades.tin"),
      wea: SkillConfiguration.skill("agi", "dc20rpg.trades.wea"),
      veh: SkillConfiguration.skill("agi", "dc20rpg.trades.veh")
    },
    languages: {
      com: {
        mastery: 2 ,
        category: "mortal",
        label: "dc20rpg.languages.com"
      },
      hum: SkillConfiguration.lang("mortal", "dc20rpg.languages.hum"),
      dwa: SkillConfiguration.lang("mortal", "dc20rpg.languages.dwa"),
      elv: SkillConfiguration.lang("mortal", "dc20rpg.languages.elv"),
      gno: SkillConfiguration.lang("mortal", "dc20rpg.languages.gno"),
      hal: SkillConfiguration.lang("mortal", "dc20rpg.languages.hal"),
      sig: SkillConfiguration.lang("mortal", "dc20rpg.languages.sig"),
      gia: SkillConfiguration.lang("exotic", "dc20rpg.languages.gia"),
      dra: SkillConfiguration.lang("exotic", "dc20rpg.languages.dra"),
      orc: SkillConfiguration.lang("exotic", "dc20rpg.languages.orc"),
      fey: SkillConfiguration.lang("exotic", "dc20rpg.languages.fey"),
      ele: SkillConfiguration.lang("exotic", "dc20rpg.languages.ele"),
      cel: SkillConfiguration.lang("divine", "dc20rpg.languages.cel"),
      fie: SkillConfiguration.lang("divine", "dc20rpg.languages.fie"),
      dee: SkillConfiguration.lang("outer", "dc20rpg.languages.dee"),
    }
  }
}

export class SkillConfiguration extends FormApplication {

  static skill(baseAttribute, label) {
    return {
      modifier: 0,
      bonus: 0,
      mastery: 0,
      baseAttribute: baseAttribute,
      custom: false,
      label: label,
    };
  }
  
  static lang(category, label) {
    return {
      mastery: 0,
      category: category,
      label: label
    }
  }

  constructor(dialogData = {title: "Customize Skill List"}, options = {}) {
    super(dialogData, options);
    this.skillStore = game.settings.get("dc20rpg", "skillStore");
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/skill-config.hbs",
      classes: ["dc20rpg", "dialog", "flex-dialog"],
    });
  }

  getData() {
    return {
      attributes: CONFIG.DC20RPG.DROPDOWN_DATA.attributesWithPrime,
      skillStore: this.skillStore,
      langCategories: {
        "mortal": "Mortal",
        "exotic": "Exotic",
        "divine": "Divine",
        "outer": "Outer"
      }
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('.change-value').change(ev => this._onChangeValue(valueOf(ev), datasetOf(ev).field, datasetOf(ev).key, datasetOf(ev).category))
    html.find('.add-skill').click(ev => this._onAdd(datasetOf(ev).category));
    html.find('.remove-skill').click(ev => this._onRemove(datasetOf(ev).key, datasetOf(ev).category));
    html.find('.save-and-update').click(ev => this._onSave(ev));
    html.find('.restore-default').click(ev => this._onDefault(ev));
  }

  _onChangeValue(value, field, key, category) {
    this.skillStore[category][key][field] = value;
    this.render();
  }

  async _onAdd(category) {
    const key = await getSimplePopup("input", {header: "Provide Key (4 characters)"});
    if (!key || key.length !== 4) {
      ui.notifications.error("Incorrect key!");
      return;
    }
    const skill = category === "languages" ? SkillConfiguration.lang("mortal", "New Languange") : SkillConfiguration.skill("mig", "New Skill");
    this.skillStore[category][key] = skill;
    this.render();
  }

  _onRemove(key, category) {
    delete this.skillStore[category][key];
    this.render();
  }

  _onDefault(event) {
    event.preventDefault();
    this.skillStore = defaultSkillList();
    this.render();
  }

  async _onSave(event) {
    event.preventDefault();
    const proceed = await getSimplePopup("confirm", {header: "The update will take a moment and then the game will be refreshed. Proceed?"});
    if (!proceed) return;

    await game.settings.set("dc20rpg", "skillStore", this.skillStore);

    // Iterate over actors
    for (const actor of game.actors) await actor.refreshSkills();
    // Iterate over tokens
    const allTokens = [];
    game.scenes.forEach(scene => {if (scene) scene.tokens.forEach(token => {if (token && !token.actorLink) allTokens.push(token)})});
    for (const token of allTokens) await token.actor.refreshSkills();

    this.close();
    window.location.reload();
  }
}