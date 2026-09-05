import { DC20RpgActor } from "../documents/actor.mjs";
import { DC20RpgItem } from "../documents/item.mjs";
import { shuffleArray } from "../helpers/utils.mjs";
import { collectItemsForType } from "./compendium-browser/browser-utils.mjs";
import { createItemBrowser } from "./compendium-browser/item-browser.mjs";
import { DC20Dialog } from "./dc20Dialog.mjs";
import { SimplePopup } from "./simple-popup.mjs";

export class MonsterCreatorDialog extends DC20Dialog {

  static open(options={}) {
    new MonsterCreatorDialog(options).render(true);
  }

  constructor(options = {}) {
    super(options);
    if (options.actor) this.actor = options.actor;
    this.#prepareData();
    this.#collectMonsterTraits().then(r => this.render());
  }

  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/dialogs/monster-creator.hbs",
      scrollable: [".scrollable"]
    }
  };

  async #collectMonsterTraits() {
    const features = await collectItemsForType("feature");
    this.monsterTraits = features.filter(item => item.isMonsterTrait);
  }

  #prepareData() {
    if (this.actor) {
      const scaling = foundry.utils.deepClone(this.actor.system.scaling);
      const details = foundry.utils.deepClone(this.actor.system.details);
      const attributes = foundry.utils.deepClone(this.actor.system.attributes);
      this.data = {
        name: this.actor.name,
        attributes: {
          mig: attributes.mig.current, 
          agi: attributes.agi.current, 
          int: attributes.int.current, 
          cha: attributes.cha.current
        },
        level: details.level,
        creatureType: details.creatureType,
        creatureRole: details.creatureRole,
        tier: scaling.tier,
        rank: scaling.rank,
        size: this.actor.system.size.size,
        reactionPoints: scaling.reactionPoints,
        itemTraits: this.#itemsToTraits(),
        baseTraits: this.#actorConfiguredBasicTraits(scaling.baseTraits),
      }
    }
    else {
      this.data = {
        name: "Monster",
        attributes: {mig: 0, agi: 0, int: 0, cha: 0},
        level: 1,
        creatureType: "",
        creatureRole: "",
        tier: "hard",
        rank: "normal",
        size: "medium",
        reactionPoints: 0,
        itemTraits: {},
        baseTraits: foundry.utils.deepClone(DEFAULT_BASIC_TRAITS)
      }
    }
  }

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Monster Creator";
    initialized.window.icon = "fa-solid fa-dragon";
    initialized.position.width = 900;
    initialized.position.height = 900;
    initialized.window.resizable = true;

    initialized.actions.save = this._onSave;
    initialized.actions.default = this._onDefault;
    initialized.actions.random = this._onRandomTraits;
    initialized.actions.remove = this._onRemoveItem;
    initialized.actions.browser = this._onOpenTraitBrowser;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    if (this.actor && this.actor.type !== "npc") {
      ui.notifications.error("Only 'NPC' actor type can use Monster Creator");
      this.close();
      return;
    }

    context.traitsReady = !!this.monsterTraits;
    context.config = CONFIG.DC20RPG;
    context.data = this.data;
    context.maxAttr = this.data.level === 0 ? 2 : 3 + Math.floor(this.data.level/5);
    context.hpMods = {1: "No Change", 1.25: "+ 25%", 0.75: "- 25%", 1.5: "+ 50%", 0.5: "- 50%"};
    context.dmgMods = {
      "": "No Change", 
      "25#+": "+ 25%", 
      "25#-": "- 25%",
      "50#+": "+ 50%", 
      "50#-": "- 50%"
    }
    this.#calculateSummary();
    context.summary = this.summary;
    return context;
  }

  _onDefault(event, target) {
    event.preventDefault();
    if (this.data.trait === "legendary") this.data.reactionPoints = 6;
    else if (this.data.trait === "epic") this.data.reactionPoints = 3;
    else this.data.reactionPoints = 0;

    this.data.baseTraits = foundry.utils.deepClone(DEFAULT_BASIC_TRAITS);
    const roleChanges = CONFIG.DC20RPG.MONSTERS.ROLE_CHANGES[this.data.creatureRole];
    const typeChanges = CONFIG.DC20RPG.MONSTERS.TYPE_CHANGES[this.data.creatureType];
    if (roleChanges) {
      for (const [key, value] of Object.entries(roleChanges)) {
        this.data.baseTraits[key] = value;
      }
    }
    if (typeChanges) {
      for (const [key, value] of Object.entries(typeChanges)) {
        this.data.baseTraits[key] = value;
      }
    }
    this.render();
  }


  async _onChangeString(path, value, dataset) {
    if (path === "data.rank") {
      if (value === "legendary") this.data.reactionPoints = 6;
      else if (value === "epic") this.data.reactionPoints = 3;
      else this.data.reactionPoints = 0;
    }
    await super._onChangeString(path, value, dataset);
  }

  _onOpenTraitBrowser(event, target) {
    event.preventDefault();
    createItemBrowser("feature", true, this, '{"featureType": "monster"}')
  }

  _onRandomTraits(event, target) {
    event.preventDefault();
    
    const traits = this.monsterTraits.filter(item => this.#isMatchingTrait(item));
    shuffleArray(traits);

    const maxTraits = 5 + Math.ceil(this.data.level / 5);
    const minTraits = Math.min(4, maxTraits);
    const noOfTraits = minTraits + Math.floor(Math.random() * (maxTraits - minTraits + 1));

    this.#calculateSummary();
    const currentItemTraitPoints = Object.values(this.data.itemTraits).reduce((total, item) => {
      if (item === "DELETE_ACTION") return total;
      return total + (Number(item.system.monsterTrait?.traitValue) || 0);
    }, 0);
    const baseTraitPoints = this.summary.currentTrait - currentItemTraitPoints;
    const selection = {
      items: {},
      noOfTraits,
      pointsLeft: Math.max(0, this.summary.finalTrait - baseTraitPoints)
    };

    const pdAttack = traits.find(item => this.#getTraitConfig(item).traitType === "pdAttack");
    this.#addRandomTrait(selection, pdAttack);
    const adAttack = traits.find(item => this.#getTraitConfig(item).traitType === "adAttack");
    this.#addRandomTrait(selection, adAttack);

    while (selection.noOfTraits > 0 && traits.length > 0) {
      const affordableTraits = traits.filter(item => this.#getTraitCost(item) <= selection.pointsLeft);
      if (affordableTraits.length === 0) break;

      // Prefer an exact fit when one exists; otherwise preserve the shuffled order.
      const item = affordableTraits.find(item => this.#getTraitCost(item) === selection.pointsLeft) ?? affordableTraits[0];
      traits.splice(traits.indexOf(item), 1);
      this.#addRandomTrait(selection, item);
    }

    Object.keys(this.data.itemTraits).forEach(itemId => this.data.itemTraits[itemId] = "DELETE_ACTION");
    Object.entries(selection.items).forEach(([itemId, item]) => this.data.itemTraits[itemId] = item.toObject());
    this.render();
  }

  #getTraitConfig(item) {
    return item.system.monsterTrait;
  }

  #getTraitCost(item) {
    return parseInt(this.#getTraitConfig(item).traitValue) || 0;
  }

  #isMatchingTrait(item) {
    const config = this.#getTraitConfig(item);
    const hasRole = config.creatureRoles[this.data.creatureRole];
    const hasType = config.creatureTypes[this.data.creatureType];
    return hasRole || hasType;
  }

  #addRandomTrait(selection, item) {
    if (!item || selection.noOfTraits <= 0 || selection.items[item._id]) return false;

    selection.items[item._id] = item;
    selection.noOfTraits--;
    selection.pointsLeft -= this.#getTraitCost(item);
    return true;
  }

  async _onRemoveItem(event, target) {
    event.preventDefault();
    this.data.itemTraits[target.dataset.itemId] = "DELETE_ACTION";
    this.render();
  }

  async _onSave(event, target) {
    event.preventDefault();
    const baseTraits = this.data.baseTraits;
    const updateData = foundry.utils.deepClone(CLEAN_UPDATE_DATA);
    updateData.name = this.data.name;

    // Senses
    updateData.system.senses.darkvision.range = baseTraits.darkvision ? 10 : 0;
    updateData.system.senses.tremorsense.rang = baseTraits.tremorsense ? 3 : 0;
    updateData.system.senses.blindsight.range = baseTraits.blindsight ? 3 : 0;
    updateData.system.senses.truesight.range = baseTraits.truesight ? 10 : 0;

    // Movement
    updateData.system.movement.ground.value = this.summary.finalSpeed;
    updateData.system.movement.climbing.fullSpeed = baseTraits.climb;
    updateData.system.movement.swimming.fullSpeed = baseTraits.swim;
    updateData.system.movement.burrow.fullSpeed = baseTraits.burrow;
    updateData.system.movement.flying.fullSpeed = baseTraits.fly;

    // Defenses
    updateData.system.defences.precision.normal = this.summary.finalPd;
    updateData.system.defences.area.normal = this.summary.finalAd;

    // Reduction
    updateData.system.damageReduction.pdr.active = baseTraits.pdr;
    updateData.system.damageReduction.edr.active = baseTraits.edr;
    updateData.system.damageReduction.mdr.active = baseTraits.mdr;

    // Damage Taken
    for (const key of Object.keys(updateData.system.damageReduction.damageTypes)) {
      if (baseTraits.damageVulnerability[key]) updateData.system.damageReduction.damageTypes[key].vulnerability = true;
      else if (this.actor) baseTraits.damageVulnerability[key] = new foundry.data.operators.ForcedDeletion();

      if (baseTraits.damageResistance[key]) updateData.system.damageReduction.damageTypes[key].resistance = true;
      else if (this.actor) baseTraits.damageResistance[key] = new foundry.data.operators.ForcedDeletion();

      if (baseTraits.damageImmunity[key]) updateData.system.damageReduction.damageTypes[key].immune = true;
      else if (this.actor) baseTraits.damageImmunity[key] = new foundry.data.operators.ForcedDeletion();
    }

    // Conditions
    for (const key of Object.keys(updateData.system.statusResistances)) {
      if (baseTraits.conditionVulnerability[key]) updateData.system.statusResistances[key].vulnerability = true;
      else if (this.actor) baseTraits.conditionVulnerability[key] = new foundry.data.operators.ForcedDeletion();

      if (baseTraits.conditionResistance[key]) updateData.system.statusResistances[key].resistance = true;
      else if (this.actor) baseTraits.conditionResistance[key] = new foundry.data.operators.ForcedDeletion();

      if (baseTraits.conditionImmunity[key]) updateData.system.statusResistances[key].immunity = true;
      else if (this.actor) baseTraits.conditionImmunity[key] = new foundry.data.operators.ForcedDeletion();
    }

    // Attributes
    updateData.system.attributes = {
      mig: {current: this.data.attributes.mig},
      agi: {current: this.data.attributes.agi},
      int: {current: this.data.attributes.int},
      cha: {current: this.data.attributes.cha},
    };

    // Base Traits
    updateData.system.scaling.baseTraits = baseTraits;


    // Details
    updateData.system.details = {
      level: this.data.level,
      creatureType: this.data.creatureType,
      creatureRole: this.data.creatureRole,
    }
    updateData.system.scaling.tier = this.data.tier;
    updateData.system.scaling.rank = this.data.rank;
    updateData.system.scaling.reactionPoints = this.data.reactionPoints;
    updateData.system.size = {size: this.data.size};

    const dialog =  new SimplePopup("info", {hideButtons: true, header: "Creating Monster...", information: ["Please wait it might take a while..."]});
    await dialog.render(true);

    // Update Actor
    let actor = null;
    if (this.actor){
      await this.actor.update(updateData);
      actor = this.actor;
    }
    else {
      const result = await DC20RpgActor.create(updateData);
      actor = result;
    }

    if (actor) {
      await actor.monsterConfig.scaleToLevel();
      if (this.data.reactionPoints) await actor.monsterConfig.addReactionPoints();
      else await actor.monsterConfig.removeReactionPoints();

      await this.#handleItemTraits(actor);
      actor.sheet.render(true);
      this.close();
    }
    dialog.close();
  }

  async _onDrop(event) {
    const dropped = await super._onDrop(event);
    if (dropped.type !== "Item") return;
    const item = await fromUuid(dropped.uuid);
    if (!item.isMonsterTrait) return;

    this.data.itemTraits[item.id] = item.toObject();
    this.render();
  }

  #itemsToTraits() {
    const traits = {};
    this.actor.items.forEach(item => {if (item.isMonsterTrait && item.system.itemKey !== "reactionPoints") traits[item.id] = item.toObject()})
    return traits;
  }

  #actorConfiguredBasicTraits(basicTraits) {
    // Speed
    basicTraits.fly = this.actor.system.movement.flying.fullSpeed;
    basicTraits.burrow = this.actor.system.movement.burrow.fullSpeed;
    basicTraits.climb = this.actor.system.movement.climbing.fullSpeed;
    basicTraits.swim = this.actor.system.movement.swimming.fullSpeed;

    // Resistances
    for (const [key, value] of Object.entries(this.actor.system.damageReduction.damageTypes)) {
      if (value.vulnerability) basicTraits.damageVulnerability[key] = value.label;
      if (value.resistance) basicTraits.damageResistance[key] = value.label;
      if (value.immune) basicTraits.damageImmunity[key] = value.label;
    }

    // Conditions
    for (const [key, value] of Object.entries(this.actor.system.statusResistances)) {
      if (value.vulnerability) basicTraits.conditionVulnerability[key] = value.label;
      if (value.resistance) basicTraits.conditionResistance[key] = value.label;
      if (value.immunity) basicTraits.conditionImmunity[key] = value.label;
    }

    // Reductions
    basicTraits.pdr = this.actor.system.damageReduction.pdr.active;
    basicTraits.edr = this.actor.system.damageReduction.edr.active;
    basicTraits.mdr = this.actor.system.damageReduction.mdr.active;
    return basicTraits;
  }

  async #handleItemTraits(actor) {
    for (const [itemId, itemData] of Object.entries(this.data.itemTraits)) {
      const item = actor.items.get(itemId);
      if (itemData === "DELETE_ACTION") {
        if (item) await item.delete();
      }
      else {
        if (!item) await DC20RpgItem.create(itemData, {parent: actor});
      }
    }
  }

  #calculateSummary() {
    const base = this.data.baseTraits;
    const config = CONFIG.DC20RPG.MONSTERS;
    const level = this.data.level;

    // Calculate Max HP
    const flatHpModifier = base.flatHpModifier;
    const avgHP = config.AVERAGE_HP[level+1];
    let multiplier = base.maxHpModifier || 1;
    if      (this.data.rank === "legendary") multiplier *= 4;
    else if (this.data.rank === "epic")      multiplier *= 2;
    else if (this.data.rank === "minion")    multiplier *= 0.5;
    const finalHp = Math.ceil(avgHP * multiplier) + flatHpModifier;

    // Calculate PD and AD
    const avgDef = config.AVERAGE_DEFENCE[level+1];
    const pdModifier = base.pdModifier || 0;
    const adModifier = base.adModifier || 0;

    // Trait Value Modifier
    const traitModifier = base.maxTraitModifier || 0;
    const finalTrait = 4 + (2*level) + traitModifier;

    // Calculate Damage
    const [finalDmg, impact, reduceAP] = calculateMonsterDamage(this.data.tier, level, base.damageModifier);

    // Calculate Speed and movement types
    const finalSpeed = 5 + (base.speedIncrease * 3) - base.speedDecrease; 

    this.summary = {
      finalHp: finalHp,
      finalPd: avgDef + pdModifier,
      finalAd: avgDef + adModifier,
      impact: impact,
      reduceAP: reduceAP,
      finalDmg: finalDmg,
      finalTrait: finalTrait,
      currentTrait: this.#calculateTraitCost(),
      finalSpeed: finalSpeed,
      fly: base.fly,
      burrow: base.burrow,
      swim: base.swim,
      climb: base.climb
    }
  }

  #calculateTraitCost() {
    const baseCosts = CONFIG.DC20RPG.MONSTERS.BASE_TRAITS_COST;
    let finalCost = 0;
    for (const [key, value] of Object.entries(this.data.baseTraits)) {
      if (key === "maxTraitModifier") continue;
      else if (key === "damageModifier") {
        if (!value) continue;
        const [v, s] = value.split("#");
        let cost = 0;
        if (s === "+") cost += 1;
        if (s === "-") cost += -1;
        if (v === "25") cost *= 4;
        if (v === "50") cost *= 8;
        finalCost += cost;
      }
      else if (key === "maxHpModifier") {
        const v = value - 1;
        let cost = 0
        if (v > 0) cost += 1;
        if (v < 0) cost += -1;
        if (Math.abs(v) === 0.25) cost *= 4;
        if (Math.abs(v) === 0.5) cost *= 8;
        finalCost += cost;
      }
      else {
        const traitCost = baseCosts[key];
        switch(typeof value) {
          case "object":
            const keyNo = Object.keys(value).length;
            finalCost += keyNo * traitCost;
            break;

          case "boolean":
            if (value) finalCost += traitCost;
            break;

          case "number":
            finalCost += traitCost * value;
            break;
        }
      }
    }

    for (const item of Object.values(this.data.itemTraits)) {
      if (item === "DELETE_ACTION") continue;
      const cost = item.system.monsterTrait?.traitValue || 0;
      finalCost += cost;
    }
    return finalCost;
  } 

  async _getTooltipObject(dataset, event) {
    const itemData = this.data.itemTraits[dataset.itemId];
    if (!itemData) return
    return new Item(itemData);
  }
}

const CLEAN_UPDATE_DATA = {
  type: "npc",
  system: {
    damageReduction: {
      pdr: {active: false},
      edr: {active: false},
      mdr: {active: false},
      damageTypes: {
        corrosion: {vulnerability: false, resistance: false, immune: false},
        cold: {vulnerability: false, resistance: false, immune: false},
        fire: {vulnerability: false, resistance: false, immune: false},
        lightning: {vulnerability: false, resistance: false, immune: false},
        poison: {vulnerability: false, resistance: false, immune: false},
        radiant: {vulnerability: false, resistance: false, immune: false},
        psychic: {vulnerability: false, resistance: false, immune: false},
        umbral: {vulnerability: false, resistance: false, immune: false},
        piercing: {vulnerability: false, resistance: false, immune: false},
        slashing: {vulnerability: false, resistance: false, immune: false},
        bludgeoning: {vulnerability: false, resistance: false, immune: false},
      },
    },
    statusResistances: {
      magical: {vulnerability: false, resistance: false, immunity: false},
      cursed: {vulnerability: false, resistance: false, immunity: false},
      poisoned: {vulnerability: false, resistance: false, immunity: false},
      diseased: {vulnerability: false, resistance: false, immunity: false},
      movement: {vulnerability: false, resistance: false, immunity: false},
      bleeding: {vulnerability: false, resistance: false, immunity: false},
      blinded: {vulnerability: false, resistance: false, immunity: false},
      burning: {vulnerability: false, resistance: false, immunity: false},
      charmed: {vulnerability: false, resistance: false, immunity: false},
      dazed: {vulnerability: false, resistance: false, immunity: false},
      deafened: {vulnerability: false, resistance: false, immunity: false},
      disoriented: {vulnerability: false, resistance: false, immunity: false},
      doomed: {vulnerability: false, resistance: false, immunity: false},
      exhaustion: {vulnerability: false, resistance: false, immunity: false},
      exposed: {vulnerability: false, resistance: false, immunity: false},
      frightened: {vulnerability: false, resistance: false, immunity: false},
      grappled: {vulnerability: false, resistance: false, immunity: false},
      hindered: {vulnerability: false, resistance: false, immunity: false},
      impaired: {vulnerability: false, resistance: false, immunity: false},
      immobilized: {vulnerability: false, resistance: false, immunity: false},
      incapacitated: {vulnerability: false, resistance: false, immunity: false},
      intimidated: {vulnerability: false, resistance: false, immunity: false},
      paralyzed: {vulnerability: false, resistance: false, immunity: false},
      petrified: {vulnerability: false, resistance: false, immunity: false},
      prone: {vulnerability: false, resistance: false, immunity: false},
      slowed: {vulnerability: false, resistance: false, immunity: false},
      stunned: {vulnerability: false, resistance: false, immunity: false},
      surprised: {vulnerability: false, resistance: false, immunity: false},
      taunted: {vulnerability: false, resistance: false, immunity: false},
      tethered: {vulnerability: false, resistance: false, immunity: false},
      terrified: {vulnerability: false, resistance: false, immunity: false},
      unconscious: {vulnerability: false, resistance: false, immunity: false},
      weakened: {vulnerability: false, resistance: false, immunity: false},
    },
    senses: {
      darkvision: {range: 0},
      tremorsense: {range: 0},
      blindsight: {range: 0},
      truesight: {range: 0},
    },
    defences: {
      precision: {normal: 8},
      area: {normal: 8},
    },
    movement: {
      ground: {value: 5},
      climbing: {fullSpeed: false},
      swimming: {fullSpeed: false},
      burrow: {fullSpeed: false},
      flying: {fullSpeed: false},
    },
    scaling: {
      isScalingMonster: true,
      reactionPoints: 0
    }
  }
}

const DEFAULT_BASIC_TRAITS = {
  darkvision: false,
  tremorsense: false,
  blindsight: false,
  truesight: false,
  pdr: false,
  edr: false,
  mdr: false,
  maxHpModifier: 1,
  damageModifier: "",
  flatHpModifier: 0,
  maxApModifier: 0,
  pdModifier: 0,
  adModifier: 0,
  damageVulnerability: {},
  damageResistance: {},
  damageImmunity: {},
  conditionResistance: {},
  conditionVulnerability: {},
  conditionImmunity: {},
  speedIncrease: 0,
  speedDecrease: 0,
  fly: false,
  climb: false,
  swim: false,
  burrow: false,
  maxTraitModifier: 0,
}

export function calculateMonsterDamage(tier, level, damageModifier) {
  const config = CONFIG.DC20RPG.MONSTERS;
  const avgDmg = config.AVERAGE_DAMAGE[tier][level+1];
  let dmgChange = 0;
  if (damageModifier === "25#+") dmgChange += config.DAMAGE_CHANGE_25[tier][level+1];
  if (damageModifier === "50#+") dmgChange += config.DAMAGE_CHANGE_50[tier][level+1];
  if (damageModifier === "25#-") dmgChange -= config.DAMAGE_CHANGE_25[tier][level+1];
  if (damageModifier === "50#-") dmgChange -= config.DAMAGE_CHANGE_50[tier][level+1];
  const dmg = avgDmg + dmgChange;
  const reduceAP = dmg === 0.25 || dmg === 0.5;
  let finalDmg = 0;
  let impact = false;
  if (reduceAP) {
    impact = dmg === 0.25;
    finalDmg = dmg === 0.25 ? 0 : 1;
  }
  else {
    impact = dmg % 1 === 0.5;
    finalDmg = Math.floor(dmg);
  }
  
  return [finalDmg, impact, reduceAP];
}