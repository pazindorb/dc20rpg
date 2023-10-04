import { getArmorBonus } from "../helpers/actors/itemsOnActor.mjs";
import { skillMasteryValue } from "../helpers/actors/skills.mjs";
import { DC20RPG } from "../helpers/config.mjs";
import { evaulateFormula } from "../helpers/rolls.mjs";

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class DC20RpgActor extends Actor {

  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: 
    // 1) data reset (to clear active effects),
    // 2) prepareBaseData(),
    // 3) prepareEmbeddedDocuments() (including active effects),
    // 4) prepareDerivedData().
    super.prepareData();
  }

  prepareEmbeddedDocuments() {
    super.prepareEmbeddedDocuments();
    this._prepareItemBonuses(this.items);
  }

  // This method collects calculated data (non editable on charcter sheet) that isn't defined in template.json
  /**
   * @override
   * Augment the basic actor data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    if (this.type === 'character') {
      this._prepareClassData();
      this._initializeFlagsForCharacter();
    }
    if (this.type === 'npc') {
      this._initializeFlagsForNpc();
    }

    this._calculateCombatMastery();
    this._calcualteCoreAttributes();
    this._calculateBasicData();
    this._calculateAttackModAndSaveDC();
    this._calculateSkillModifiers();
    this._prepareDefences();
    this._prepareCustomResources();
  }

  /**
   * @override
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    // We want to operate on copy of original data because we are making some changest to it
    const data = foundry.utils.deepClone(super.getRollData()); 
    this._attributes(data);
    this._details(data);
    return data;
  }

  /**
   * Returns object containing items owned by actor that have charges or are consumable.
   */
  getOwnedItemsIds(excludedId) {
    const excludedTypes = ["class", "subclass", "ancestry", "loot", "tool"];

    let itemsWithCharges = {};
    let consumableItems = {};
    const items = this.items;
    items.forEach(item => {
      if (item.id !== excludedId && !excludedTypes.includes(item.type)) {
        const maxChargesFormula = item.system.costs.charges.maxChargesFormula;
        if (maxChargesFormula) itemsWithCharges[item.id] = item.name; 
        if (item.type === "consumable") consumableItems[item.id] = item.name;
      }
    });
    return {
      withCharges: itemsWithCharges,
      consumable: consumableItems,
    }
  }

//==============================================
//=         Prepare Embedded Documents         =
//==============================================
  _prepareItemBonuses(items) {
    let equippedArmorBonus = 0;
    items.forEach(item => {
      if (item.type === 'equipment') equippedArmorBonus += getArmorBonus(item);
      
      if (item.type === 'tool') {
        const tradeSkillKey = item.system.tradeSkillKey;
        const rollBonus = item.system.rollBonus;
        if (tradeSkillKey) {
          const bonus = rollBonus ? rollBonus : 0;
          this.system.tradeSkills[tradeSkillKey].bonus += bonus;
        }
      }
    });
    this.system.defences.phisical.armorBonus = equippedArmorBonus;
  }

//==============================================
//=           Prepare Character Data           =
//==============================================
  _prepareClassData() {
    const classItem = this.items.get(this.system.details.class.id);
    if (!classItem) return;

    const actorDetails = this.system.details;
    const actorResources =  this.system.resources;
    const classSystem = classItem.system;
    const classLevel = classSystem.level;

    actorDetails.level = classLevel;
    actorResources.health.bonus += classSystem.resources.maxHpBonus.values[classLevel - 1];
    actorResources.mana.max = classSystem.resources.totalMana.values[classLevel - 1];
    actorResources.stamina.max = classSystem.resources.totalStamina.values[classLevel - 1];

    Object.entries(classSystem.scaling).forEach(([key, scaling]) => {
      actorDetails.class.scaling[key] = scaling.values[classLevel - 1];
    });

    actorDetails.class.name = classItem.name;
  }

  _calculateCombatMastery() {
    const level = this.system.details.level;
    this.system.details.combatMastery = Math.ceil(level/2);
  }

  _calcualteCoreAttributes() {
    const attributesData = this.system.attributes;
    const detailsData = this.system.details;

    let primeAttrKey = "mig";
    for (let [key, attribute] of Object.entries(attributesData)) {
      let save = attribute.saveMastery === true ? detailsData.combatMastery : 0;
      save += attribute.value + attribute.bonuses.save;
      attribute.save = save;

      const check = attribute.value + attribute.bonuses.check;
      attribute.check = check;

      if (attribute.value >= attributesData[primeAttrKey].value) primeAttrKey = key;
    }
    detailsData.primeAttrKey = primeAttrKey;
    attributesData.prime = foundry.utils.deepClone(attributesData[primeAttrKey]);
  }

  _calculateBasicData() {
    const attributesData = this.system.attributes;
    const level = this.system.details.level;
    const health = this.system.resources.health;

    // Calculate max hp only when actor is of class type
    if (this.type === 'character') {
      health.max = 4 + 2 * level + attributesData.mig.value + attributesData.agi.value + health.bonus + health.tempMax;
    }

    // Calculate hp value
    health.value = health.current + health.temp;
  }

  _calculateAttackModAndSaveDC() {
    const primeAttr = this.system.attributes.prime.value;
    const combatMastery = this.system.details.combatMastery;
    const attackBonus = this.system.attackMod.bonus;
    const saveBonus = this.system.saveDC.bonus;

    const attackBase = primeAttr + combatMastery + attackBonus.base;
    const saveBase = 8 + primeAttr + combatMastery + saveBonus.base;

    this.system.attackMod.value.base = attackBase;
    this.system.saveDC.value.base = saveBase;

    this.system.attackMod.value.martial = attackBase + attackBonus.martial;
    this.system.saveDC.value.martial = saveBase + saveBonus.martial;

    this.system.attackMod.value.spell = attackBase + attackBonus.spell;
    this.system.saveDC.value.spell = saveBase + saveBonus.spell;
  }

  _calculateSkillModifiers() {
    const attributesData = this.system.attributes;
    const skillsData = this.system.skills;
    // Calculate skills modifiers
    for (let [key, skill] of Object.entries(skillsData)) {
      skill.modifier = attributesData[skill.baseAttribute].value + skillMasteryValue(skill.skillMastery) + skill.bonus;
    }
  }

  _prepareDefences() {
    //=============== PHISICAL ===============
    const phisicalDefence = this.system.defences.phisical;
    if (phisicalDefence.formulaKey !== "flat") {
      let defenceFormula = phisicalDefence.formulaKey === "custom" 
                            ? phisicalDefence.customFormula 
                            : DC20RPG.phisicalDefenceFormulas[phisicalDefence.formulaKey];

      phisicalDefence.normal = evaulateFormula(defenceFormula, this.getRollData(), true).total;
    }
    phisicalDefence.value = phisicalDefence.normal + phisicalDefence.bonus;
    phisicalDefence.heavy = phisicalDefence.value + 5;
    phisicalDefence.brutal = phisicalDefence.value + 10;

    //=============== MENTAL ===============
    const mentalDefence = this.system.defences.mental;
    if (mentalDefence.formulaKey !== "flat") {
      let defenceFormula = mentalDefence.formulaKey === "custom" 
                            ? mentalDefence.customFormula 
                            : DC20RPG.mentalDefenceFormulas[mentalDefence.formulaKey];
      
      mentalDefence.normal = evaulateFormula(defenceFormula, this.getRollData(), true).total;
    }
    mentalDefence.value = mentalDefence.normal + mentalDefence.bonus;
    mentalDefence.heavy = mentalDefence.value + 5;
    mentalDefence.brutal = mentalDefence.value + 10;
  }

  _prepareCustomResources() {
    const customResources = this.system.resources.custom;

    // remove empty custom resources and calculate its max charges
    for (const [key, resource] of Object.entries(customResources)) {
      if (!resource.name) delete customResources[key];
      resource.max = resource.maxFormula ? evaulateFormula(resource.maxFormula, this.getRollData(), true).total : 0;
    }
  }

  _initializeFlagsForCharacter() {
    if (!this.flags.dc20rpg) this.flags.dc20rpg = {};
    
    const coreFlags = this.flags.dc20rpg;

    // Flags describing visiblity of unknown skills and languages
    if (coreFlags.showUnknownTradeSkills === undefined) coreFlags.showUnknownTradeSkills = true;
    if (coreFlags.showUnknownLanguages === undefined) coreFlags.showUnknownLanguages = true;

    // Flags describing item table headers ordering
    if (coreFlags.headersOrdering === undefined) { 
      coreFlags.headersOrdering = {
        inventory: {
          Weapons: 0,
          Equipment: 1,
          Consumables: 2,
          Tools: 3,
          Loot: 4
        },
        features: {
          Features: 0
        },
        techniques: {
          Techniques: 0
        },
        spells: {
          Spells: 0
        }
      }
    }
  }

  _initializeFlagsForNpc() {
    if (!this.flags.dc20rpg) this.flags.dc20rpg = {};
    
    const coreFlags = this.flags.dc20rpg;

    // Flags describing visiblity of unknown skills and languages
    if (coreFlags.showUnknownSkills === undefined) coreFlags.showUnknownSkills = false;
    if (coreFlags.showUnknownLanguages === undefined) coreFlags.showUnknownLanguages = false;

    // Flags describing item table headers ordering
    if (coreFlags.headersOrdering === undefined) { 
      coreFlags.headersOrdering = {
        items: {
          Actions: 0,
          Features: 1,
          Techniques: 2,
          Inventory: 3,
          Spells: 4,
        }
      }
    }
  }

//=========================================
//=           Prepare Roll Data           =
//=========================================
  _attributes(data) {
    // Copy the attributes to the top level, so that rolls can use
    // formulas like `@mig + 4` or `@prime + 4`
    if (data.attributes) {
      for (let [key, attribute] of Object.entries(data.attributes)) {
        data[key] = foundry.utils.deepClone(attribute.value);
      }
    }
  }

  _details(data) {
    // Add level for easier access, or fall back to 0.
    if (data.details.level) {
      data.lvl = data.details.level ?? 0;
    }
    if (data.details.combatMastery) {
      data.combatMastery = data.details.combatMastery ?? 0;
    }
  }
}