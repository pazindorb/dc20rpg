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
      this._calcualteCoreAttributes();
      this._calculateCombinedAttributes();
      this._calculateBasicData();
      this._calculateSkillModifiers();
      this._calculateDefences();
      this._initializeFlags();
    }
    if (this.type === 'npc') {
      
    }
  }

  /**
   * @override
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    // We want to operate on copy of original data because we are making some changest to it
    const data = foundry.utils.deepClone(super.getRollData()); 

    if (this.type === 'character') {
      this._attributes(data);
      this._details(data);
    }
    if (this.type === 'npc') {

    }
    return data;
  }

  /**
   * Returns object containing items owned by actor that have charges or are consumable.
   */
  getOwnedItemsIds(excludedId) {
    const excludedTypes = ["class", "subclass", "ancestry", "loot"];

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
    actorDetails.combatMastery = Math.ceil(actorDetails.level/2);

    actorResources.health.bonus += classSystem.resources.maxHpBonus.values[classLevel - 1];
    actorResources.mana.max = classSystem.resources.totalMana.values[classLevel - 1];
    actorResources.stamina.max = classSystem.resources.totalStamina.values[classLevel - 1];

    Object.entries(classSystem.scaling).forEach((key, values) => {
      actorDetails.class.scaling[key].max = values[classLevel - 1];
    });

    actorDetails.class.name = classItem.name;
  }

  _calcualteCoreAttributes() {
    const attributesData = this.system.attributes;
    const detailsData = this.system.details;

    let primeAttrKey = "mig";
    for (let [key, attribute] of Object.entries(attributesData)) {
      if (attribute.baseAttribute) {
        let save = attribute.saveMastery === true ? detailsData.combatMastery : 0;
        let check = attribute.value + attribute.bonuses.check;
        save += attribute.value + attribute.bonuses.save;
        attribute.save = save;
        attribute.check = check;

        if (attribute.value >= attributesData[primeAttrKey].value) primeAttrKey = key;
      }
    }
    detailsData.primeAttrKey = primeAttrKey;
    attributesData.prime = foundry.utils.deepClone(attributesData[primeAttrKey]);
  }

  _calculateCombinedAttributes() {
    const attributesData = this.system.attributes;

    // Fortitude
    attributesData.for.value = Math.ceil((attributesData.mig.value + attributesData.agi.value)/2);
    attributesData.for.save = Math.ceil((attributesData.mig.save + attributesData.agi.save)/2) + attributesData.for.bonuses.save;
    attributesData.for.check = attributesData.for.value + attributesData.for.bonuses.check;

    // Grit
    attributesData.gri.value = Math.ceil((attributesData.int.value + attributesData.cha.value)/2);
    attributesData.gri.save = Math.ceil((attributesData.int.save + attributesData.cha.save)/2) + attributesData.gri.bonuses.save;
    attributesData.gri.check = attributesData.gri.value + attributesData.gri.bonuses.check;
  }

  _calculateBasicData() {
    const attributesData = this.system.attributes;
    const detailsData = this.system.details;
    const resourcesData = this.system.resources

    this.system.attackMod.value = attributesData.prime.value + detailsData.combatMastery + this.system.attackMod.bonus;
    this.system.saveDC.value = 8 + attributesData.prime.value + detailsData.combatMastery + this.system.saveDC.bonus;

    resourcesData.health.max = 4 + 2 * detailsData.level + attributesData.mig.value + attributesData.agi.value + resourcesData.health.bonus;
  }

  _calculateSkillModifiers() {
    const attributesData = this.system.attributes;
    const skillsData = this.system.skills;
    // Calculate skills modifiers
    for (let [key, skill] of Object.entries(skillsData)) {
      skill.modifier = attributesData[skill.baseAttribute].value + skillMasteryValue(skill.skillMastery) + skill.bonus;
    }
  }

  _calculateDefences() {
    // Calculating phisical defence
    const phisicalDefence = this.system.defences.phisical;
    if (phisicalDefence.formulaKey !== "flat") {
      let defenceFormula = phisicalDefence.formulaKey === "custom" 
                            ? phisicalDefence.customFormula 
                            : DC20RPG.phisicalDefenceFormulas[phisicalDefence.formulaKey];

      phisicalDefence.value = evaulateFormula(defenceFormula, this.getRollData(), true).total;
    }
    // Calculate heavy and brutal hit tresholds
    phisicalDefence.heavy = phisicalDefence.value + 5;
    phisicalDefence.brutal = phisicalDefence.value + 10;

    // Calculating mental defence
    const mentalDefence = this.system.defences.mental;
    if (mentalDefence.formulaKey !== "flat") {
      let defenceFormula = mentalDefence.formulaKey === "custom" 
                            ? mentalDefence.customFormula 
                            : DC20RPG.mentalDefenceFormulas[mentalDefence.formulaKey];
      
      mentalDefence.value = evaulateFormula(defenceFormula, this.getRollData(), true).total;
    }
    // Calculate heavy and brutal hit tresholds
    mentalDefence.heavy = mentalDefence.value + 5;
    mentalDefence.brutal = mentalDefence.value + 10;
  }

  _initializeFlags() {
    if (Object.keys(this.flags).length === 0) this.flags = { dc20rpg: {} };
    
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