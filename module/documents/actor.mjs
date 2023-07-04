import { skillMasteryValue } from "../helpers/skills.mjs";

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

  // This method collects data that is editable on charcer sheet and defined in template.json
  /** @override */
  prepareBaseData() {

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
    if (this.type === 'character') this._prepareCharacterData();
    if (this.type === 'npc') this._prepareNpcData();
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData() {
    let attributesData = this.system.attributes;
    let skillsData = this.system.skills;
    let detailsData = this.system.details;

    // Calculate combat mastery
    let combatMastery = Math.ceil(detailsData.level/2);
    detailsData.combatMastery = combatMastery;

    // Calculate saving throws modyfiers. Also use this loop to determine Prime modifier (Biggest one)
    let primeAttrKey = "mig";
    for (let [key, attribute] of Object.entries(attributesData)) {
      // calculate saving throw
      attribute.save = attribute.saveMastery === true ? attribute.value + combatMastery : attribute.value;

      // check if it should be prime mod key
      if (attribute.value >= attributesData[primeAttrKey].value) primeAttrKey = key;
    }
    // Add Phisical Save (mig save + agi save)/2
    detailsData.phiSave = Math.ceil((attributesData.mig.save + attributesData.agi.save)/2);
    // Add Mental Save (int save + cha save)/2
    detailsData.menSave = Math.ceil((attributesData.int.save + attributesData.cha.save)/2);

    // Determine Prime Modifier
    detailsData.primeAttrKey = primeAttrKey;
    // Copy biggest attribute as prime 
    attributesData.prime = foundry.utils.deepClone(attributesData[primeAttrKey]);

    // Calculate skills base values
    for (let [key, skill] of Object.entries(skillsData)) {
      skill.value = attributesData[skill.baseAttribute].value + skillMasteryValue(skill.skillMastery);
    }

    // Calculate Martial and Spellcasting DC
    detailsData.martialDC = 10 + attributesData.prime.value + detailsData.combatMastery;
    detailsData.spellDC = 10 + attributesData.prime.value + detailsData.combatMastery;

    this._initializeFlags();
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData() {
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    // We want to operate on copy of original data because we are making some changest to it
    const data = foundry.utils.deepClone(super.getRollData()); 

    if (this.type === 'character') this._getCharacterRollData(data);
    if (this.type === 'npc') this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    // Copy the attributes to the top level, so that rolls can use
    // formulas like `@mig + 4` or `@prime + 4`
    if (data.attributes) {
      for (let [key, attribute] of Object.entries(data.attributes)) {
        data[key] = foundry.utils.deepClone(attribute.value);
      }
    }

    // Add level for easier access, or fall back to 0.
    if (data.details.level) {
      data.lvl = data.details.level ?? 0;
    }
    if (data.details.combatMastery) {
      data.combatMastery = data.details.combatMastery ?? 0;
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
  }

  _initializeFlags() {
    // Flags describing visiblity of unknown skills and languages
    if (this.flags.showUnknownTradeSkills === undefined) this.flags.showUnknownTradeSkills = true;
    if (this.flags.showUnknownLanguages === undefined) this.flags.showUnknownLanguages = true;
  }
}