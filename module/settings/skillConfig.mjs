import { DC20Dialog } from "../dialogs/dc20Dialog.mjs";
import { SimplePopup } from "../dialogs/simple-popup.mjs";

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
      eng: SkillConfiguration.skill("int", "dc20rpg.trades.eng"), 
      alc: SkillConfiguration.skill("max", "dc20rpg.trades.alc", ["int", "agi"]), 
      bla: SkillConfiguration.skill("mig", "dc20rpg.trades.bla"), 
      bre: SkillConfiguration.skill("max", "dc20rpg.trades.bre", ["int", "agi", "cha"]), 
      cap: SkillConfiguration.skill("max", "dc20rpg.trades.cap", ["mig", "agi"]), 
      car: SkillConfiguration.skill("max", "dc20rpg.trades.car", ["int", "agi"]), 
      coo: SkillConfiguration.skill("max", "dc20rpg.trades.coo", ["int", "agi", "cha"]), 
      cry: SkillConfiguration.skill("int", "dc20rpg.trades.cry"), 
      dis: SkillConfiguration.skill("max", "dc20rpg.trades.dis", ["cha", "agi"]), 
      gam: SkillConfiguration.skill("max", "dc20rpg.trades.gam", ["int", "cha"]), 
      gla: SkillConfiguration.skill("max", "dc20rpg.trades.gla", ["mig", "agi"]), 
      her: SkillConfiguration.skill("int", "dc20rpg.trades.her"), 
      ill: SkillConfiguration.skill("agi", "dc20rpg.trades.ill"), 
      jew: SkillConfiguration.skill("agi", "dc20rpg.trades.jew"), 
      lea: SkillConfiguration.skill("agi", "dc20rpg.trades.lea"), 
      loc: SkillConfiguration.skill("max", "dc20rpg.trades.loc", ["int", "agi"]), 
      mas: SkillConfiguration.skill("mig", "dc20rpg.trades.mas"), 
      mus: SkillConfiguration.skill("max", "dc20rpg.trades.mus", ["agi", "cha"]), 
      scu: SkillConfiguration.skill("agi", "dc20rpg.trades.scu"), 
      the: SkillConfiguration.skill("cha", "dc20rpg.trades.the"), 
      tin: SkillConfiguration.skill("max", "dc20rpg.trades.tin", ["agi", "int"]), 
      wea: SkillConfiguration.skill("agi", "dc20rpg.trades.wea"), 
      veh: SkillConfiguration.skill("max", "dc20rpg.trades.veh", ["int", "agi", "mig"]) 
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

export class SkillConfiguration extends DC20Dialog {

  static skill(baseAttribute, label, attributes=["mig", "agi", "cha", "int"]) {
    if (baseAttribute !== "max") attributes = [baseAttribute];

    return {
      modifier: 0,
      bonus: 0,
      mastery: 0,
      baseAttribute: baseAttribute,
      attributes: attributes,
      custom: false,
      label: label,
    };
  }
  
  static lang(category, label) {
    return {
      mastery: 0,
      category: category,
      custom: false,
      label: label
    }
  }

  constructor(options = {}) {
    super(options);
    this.skillStore = game.settings.get("dc20rpg", "skillStore");
  }

  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/dialogs/skill-config.hbs",
      scrollable: [".scrollable"]
    }
  };

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Customize Skill List";
    initialized.window.icon = "fa-solid fa-table-list";
    initialized.position.width = 600;

    initialized.actions.add = this._onAdd;
    initialized.actions.remove = this._onRemove;
    initialized.actions.save = this._onSave;
    initialized.actions.default = this._onDefault;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.attributes = CONFIG.DC20RPG.TRANSLATION_LABELS.attributes
    context.baseAttributeOptions = {
      ...CONFIG.DC20RPG.DROPDOWN_DATA.attributesWithPrime,
      max: "Highest"
    }
    context.langCategories = {
      mortal: "Mortal",
      exotic: "Exotic",
      divine: "Divine",
      outer: "Outer"
    }
    context.skillStore = this.skillStore;
    return context;
  }

  async _onAdd(event) {
    const dataset = event.target.dataset;
    const category = dataset.category;

    const key = await SimplePopup.input("Provide Key (4 characters)");
    if (!key || key.length !== 4) {
      ui.notifications.error("Incorrect key!");
      return;
    }
    const skill = category === "languages" ? SkillConfiguration.lang("mortal", "New Language") : SkillConfiguration.skill("mig", "New Skill");
    this.skillStore[category][key] = skill;
    this.render();
  }

  _onRemove(event) {
    const dataset = event.target.dataset;
    const category = dataset.category;
    const key = dataset.key;
    
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
    const proceed = await SimplePopup.confirm("The update will take a moment and then the game will be refreshed. Proceed?");
    if (!proceed) return;

    await game.settings.set("dc20rpg", "skillStore", this.skillStore);

    // Iterate over actors
    for (const actor of game.actors) {
      await actor.skillAndLanguage.refreshAll();
    }
    // Iterate over tokens
    const allTokens = [];
    game.scenes.forEach(scene => {
      if (!scene) return;
        scene.tokens.forEach(token => {
          if (token && !token.actorLink) allTokens.push(token)
        });
    });
    for (const token of allTokens) {
      await token.actor.skillAndLanguage.refreshAll();
    }

    this.close();
    window.location.reload();
  }
}