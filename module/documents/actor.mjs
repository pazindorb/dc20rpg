import { skillMasteryLevelToValue } from "../helpers/skills.mjs";

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class DC20RpgActor extends Actor {

  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  // This method collects data that is editable on charcer sheet and defined in template.json
  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
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
    const systemData = this.system;
    const flags = this.flags.dc20rpg || {};

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData();
    this._prepareNpcData();
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData() {
    if (this.type !== 'character') return;

    let attributesData = this.system.attributes;
    let skillsData = this.system.skills;
    let detailsData = this.system.details;

    // Calculate combat mastery
    let combatMastery = Math.ceil(detailsData.level/2);
    detailsData.combatMastery.value = combatMastery;

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

    // Calculate Awareness
    detailsData.awareness.value = attributesData[primeAttrKey].value + skillMasteryLevelToValue(detailsData.awareness.skillMastery);

    // Calculate skills base values
    for (let [key, skill] of Object.entries(skillsData)) {
      skill.value = attributesData[skill.baseAttribute].value + skillMasteryLevelToValue(skill.skillMastery);
    }

    // Calculate knowledge skills base values
    for (let [key, skill] of Object.entries(skillsData.kno.knowledgeSkills)) {
      skill.value = attributesData[skill.baseAttribute].value + skillMasteryLevelToValue(skill.skillMastery);
    }
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData() {
    if (this.type !== 'npc') return;

    // Make modifications to data here. For example:
    const systemData = this.system;
    systemData.xp = (systemData.cr * systemData.cr) * 100;
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = super.getRollData();

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== 'character') return;

    // Copy the attributes to the top level, so that rolls can use
    // formulas like `@mig.value + 4`.
    if (data.attributes) {
      for (let [key, attribute] of Object.entries(data.attributes)) {
        data[key] = foundry.utils.deepClone(attribute);
      }
      // Copy prime attribute `@prime.value + 4`
      if (data.details.primeAttrKey) {
        data["prime"] = foundry.utils.deepClone(data.attributes[data.details.primeAttrKey]);
      }      
    }

    // Add level for easier access, or fall back to 0.
    if (data.details.level) {
      data.lvl = data.details.level ?? 0;
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== 'npc') return;

    // Process additional NPC data here.
  }

}