import { runTemporaryMacro } from "../../helpers/macros.mjs";
import { evaluateDicelessFormula, evaluateFormula } from "../../helpers/rolls.mjs";
import { DC20ChatMessage } from "../../sidebar/chat/chat-message.mjs";

export class DC20Target {
  name = "";
  targetHash = null;
  actor = null;
  
  calculated = {
    damage: [],
    healing: [],
    other: []
  };
  hit = null;
  check = null;
  contest = null;

  coreRoll = null;
  targetRoll = null;
  contestDC = null;
  
  targetModifiers = [];
  targetFlags = {};

  damage = [];
  healing = [];
  other = [];

  static getActorFromTargetHash(targetHash) {
    const [actorId, tokenId] = targetHash.split("#");
    if (tokenId) {
      const token = canvas.tokens.documentCollection.get(tokenId);
      if (!token) return null;
      return token.actor;
    }
    return game.actors.get(actorId);
  }

  static dummyTarget(dummyActorData) {
    const actor = {
      name: "Dummy",
      dummy: true,
      img: "icons/svg/target.svg",
      system: {
        damageReduction: {damageTypes: {
          corrosion: {},
          cold: {},
          fire: {},
          lightning: {},
          poison: {},
          radiant: {},
          psychic: {},
          umbral: {},
          piercing: {},
          slashing: {},
          bludgeoning: {}
        }},
        healingReduction: {},
        defences: {},
        resources: {health: {max: 1, current: 1, temp: 0, value: 1}},
        globalModifier: {prevent: {hpRegeneration: false}}
      },
      getRollData: () => {},
      ...dummyActorData
    }
    return new DC20Target(actor);
  }

  static fromActor(actor) {
    if (!actor) {
      ui.notifications.error("Cannot create target from actor. Actor doesn't exist");
      return null;
    }
    return new DC20Target(actor);
  }

  static fromToken(token) {
    if (!token) {
      ui.notifications.error("Cannot create target from token. Token doesn't exist");
      return null;
    }
    return this.fromActor(token.actor);
  }

  static async quickApplyDamageFor(actor, formula, calcData={}, options={}) {
    const target = DC20Target.fromActor(actor);
    target.addDamageRoll(formula);
    await target.calculateDamage(calcData);
    await target.calculated.damage[0].modified.apply(options);
  }

  static async quickApplyHealingFor(actor, formula, calcData={}, options={}) {
    const target = DC20Target.fromActor(actor);
    target.addHealingRoll(formula);
    await target.calculateHealing(calcData);
    await target.calculated.healing[0].modified.apply(options);
  } 

  constructor(actor) {
    this.actor = actor;
    this.targetHash = actor.targetHash;
    this.name = actor.name;
  }

  //=======================================// 
  //=            TARGET DATA              =//
  //=======================================//
  setCoreRollValue(roll) {
    this.coreRoll = roll;
  }

  setTargetRollValue(roll) {
    this.targetRoll = roll;
  }

  setContestDC(dc) {
    this.contestDC = dc;
  }
  
  setTargetModifiers(targetModifiers=[]) {
    this.targetModifiers = targetModifiers;
  }

  addDamageRoll(damage) {
    let dmg = foundry.utils.deepClone(damage);
    if (!dmg.clear && !dmg.modified) dmg = {clear: dmg, modified: dmg};
    if (dmg.clear.total != null) dmg.clear = this.#convertRollToTargetFormula(dmg.clear);
    if (dmg.modified.total != null) dmg.modified = this.#convertRollToTargetFormula(dmg.modified);
    this.damage.push(dmg);
  }

  addHealingRoll(healing) {
    let heal = foundry.utils.deepClone(healing);
    if (!heal.clear && !heal.modified) heal = {clear: heal, modified: heal};
    if (heal.clear.total != null) heal.clear = this.#convertRollToTargetFormula(heal.clear);
    if (heal.modified.total != null) heal.modified = this.#convertRollToTargetFormula(heal.modified);
    this.healing.push(heal);
  }

  addOtherRoll(other) {
    let otherRoll = foundry.utils.deepClone(other);
    otherRoll = otherRoll.modified ? otherRoll.modified : otherRoll;
    if (!otherRoll.perTarget) return;
    
    if (otherRoll.total != null) otherRoll = this.#convertRollToTargetFormula(otherRoll);
    this.other.push(otherRoll);
  }

  #convertRollToTargetFormula(roll) {
    return {
      value: roll.total,
      source: roll.modifierSources,
      type: roll.type,
      label: roll.label,
      each5Value: roll.each5Value,
      failValue: roll.failValue,
      dontMerge: roll.dontMerge,
    }
  }

  //=======================================// 
  //=            CALCULATIONS             =//
  //=======================================//
  #preCalculationValidation(type) {
    if (!this.actor) {
      ui.notifications.warn(`Cannot run ${type} calculations for target '${this.name}'. Actor is missing.`);
      return false;
    }
    if (this.coreRoll == null && ["attack", "check"].includes(type)) {
      ui.notifications.warn(`Cannot run ${type} calculations for target '${this.name}'. Core Roll value is missing.`);
      return false;
    }
    return true;
  }

  async calculateAttack(calcData) {
    if (!this.#preCalculationValidation("attack")) return;
    this.calcData = calcData;
    this.hit = this.#calculateHit(calcData.defenceKey);
    const options = {isAttack: true};

    await this.#prepareTargetFlags();
    await this.calculateDamage(calcData, options);
    await this.calculateHealing(calcData, options);
    this.calculateOtherFormulas(calcData);
  }

  async calculateCheck(calcData) {
    const options = {};
    if (calcData.checkDC != null) {
      if (!this.#preCalculationValidation("check")) return;
      this.check = this.#calculateCheck(calcData.checkDC);
      options.isCheck = true;
    }
    else if (this.targetRoll != null && this.contestDC != null) {
      this.contest = this.#calculateContest();
      options.isContest = true;
    }
    await this.#prepareTargetFlags();
    await this.calculateDamage(calcData, options);
    await this.calculateHealing(calcData, options);
    this.calculateOtherFormulas(calcData);
  }

  async calculateDamage(calcData, options={}) {
    // Prepare calculation options
    const opt = foundry.utils.deepClone(options);
    opt.isDamage = true;
    opt.reduction = this.actor ? foundry.utils.deepClone(this.actor.system.damageReduction) : {};
    opt.label = "Damage";

    const calcualted = [];
    const targetSpecific =  await this.#targetSpecificFormulas("damage", calcData);
    const formulas = this.#mergeFormulas([...this.damage, ...targetSpecific], calcData.defenceKey);
    for (let i = 0; i < formulas.length; i++) {
      const final = await this.#calculateCommonFormula(formulas[i], calcData, opt);

      // Enhance calculated formula
      final.modified.apply = async (options={}) => await this.#applyDamage(final.modified, options);
      final.clear.apply = async (options={}) => await this.#applyDamage(final.clear, options);
      final.modified.modify = (value) => {
        final.modified.value += value;
        final.modified.source += ` ${value >= 0 ? "+" : "-"} (Manual)`;
      };
      final.clear.modify = (value) => {
        final.clear.value += value;
        final.clear.source += ` ${value >= 0 ? "+" : "-"} (Manual)`;
      };

      final.useModified = i === 0;
      final.apply = async (options={}) => final.useModified ? await final.modified.apply(options) : await final.clear.apply(options);
      final.modify = (value) => final.useModified ? final.modified.modify(value) : final.clear.modify(value);
      calcualted.push(final);
    }
    this.calculated.damage = calcualted;
  }

  async calculateHealing(calcData, options={}) {
    // Prepare calculation options
    const opt = foundry.utils.deepClone(options);
    opt.isHealing = true;
    opt.reduction = this.actor ? foundry.utils.deepClone(this.actor.system.healingReduction) : {};
    opt.label = "Healing";

    const calcualted = [];
    const targetSpecific =  await this.#targetSpecificFormulas("healing", calcData);
    const formulas = this.#mergeFormulas([...this.healing, ...targetSpecific]);
    for (let i = 0; i < formulas.length; i++) {
      const final = await this.#calculateCommonFormula(formulas[i], calcData, opt);
      
      // Enhance calculated formula
      final.modified.apply = async (options={}) => await this.#applyHealing(final.modified, options);
      final.clear.apply = async (options={}) => await this.#applyHealing(final.clear, options);
      final.modified.modify = (value) => {
        final.modified.value += value;
        final.modified.source += ` ${value >= 0 ? "+" : "-"} (Manual)`;
      };
      final.clear.modify = (value) => {
        final.clear.value += value;
        final.clear.source += ` ${value >= 0 ? "+" : "-"} (Manual)`;
      };

      final.useModified = i === 0;
      final.apply = async (options={}) => final.useModified ? await final.modified.apply(options) : await final.clear.apply(options);
      final.modify = (value) => final.useModified ? final.modified.modify(value) : final.clear.modify(value);
      calcualted.push(final);
    }
    this.calculated.healing = calcualted;
  }

  calculateOtherFormulas(calcData) {
    // Calculate contest value 1st if required
    if (this.contestDC != null && this.targetRoll != null) {
      this.contest = this.#calculateContest();
    }

    const calcualted = [];
    for (const other of this.other) {
      const final = this.#calculateOtherFormula(other, calcData);
      calcualted.push(final);
    }
    this.calculated.other = calcualted;
  }

  #calculateHit(defenceKey) {
    const defence = this.actor.system.defences[defenceKey]?.value;
    if (!defence) return 0;
    return this.coreRoll - defence;
  }

  #calculateCheck(checkDC) {
    return this.coreRoll - checkDC;
  }

  #calculateContest() {
    const contestDC = this.contestDC === "coreRoll" ? this.coreRoll : this.contestDC;
    return contestDC - this.targetRoll;
  }

  async #calculateCommonFormula(damage, calcData, options) {
    const final = foundry.utils.deepClone(damage);
    const reduction = options.reduction;

    // Formula might target different defence
    let attackHit = this.hit; 
    if (options.isDamage) {
      if (options.isAttack && !!final.modified.overrideDefence) attackHit = this.#calculateHit(final.modified.overrideDefence);
      if (options.isAttack) final.modified = this.#attackModifications(final.modified, calcData, attackHit);
    }

    if (options.isCheck) {
      final.modified = this.#checkModifications(final.modified);
      final.clear = this.#checkModifications(final.clear, true);
    }
    if (options.isContest) {
      final.modified = this.#contestModifications(final.modified);
      final.clear = this.#contestModifications(final.clear, true);
    }
    
    final.modified = this.#critSuccess(final.modified, calcData);
    final.modified = this.#flatReduction(final.modified, reduction.flat, options.label);
    final.modified = await this.#targetModifierBonus(final.modified, calcData);

    if (options.isDamage) {
      if (calcData.isAttack && attackHit < 5) this.#applyDamageReduction(final.modified, reduction);
      final.modified = this.#damageModifications(final.modified, reduction);
      final.clear = this.#damageModifications(final.clear, reduction);
    }

    if (reduction.flatHalf) final.modified = this.#flatReductionHalf(final.modified, options.label);
    if (reduction.flatHalf) final.clear = this.#flatReductionHalf(final.clear, options.label);

    if (options.isAttack && attackHit < 0 && !calcData.isCritHit) {
      final.modified = this.#attackMiss(final.modified);
      final.clear = this.#attackMiss(final.clear);
    }
    if (calcData.isCritMiss) {
      final.modified = this.#critFail(final.modified, "Critical Fail");
      final.clear = this.#critFail(final.clear, "Critical Fail");
    }

    return this.#finishCalculation(final);
  }

  #calculateOtherFormula(other) {
    let final = foundry.utils.deepClone(other);
    final = this.#contestModifications(final);
    return final;
  }

  #attackModifications(formula, calcData, attackHit) {
    const skipHeavy = !!calcData.skipFor?.heavy;
    const skipBrutal = !!calcData.skipFor?.brutal;
    if (skipHeavy) return formula;
    let extraDmg = Math.max(0, Math.floor(attackHit/5)); // We don't want to have negative extra damage
    
    if (extraDmg === 1) formula.source += " + Heavy Hit";
    if (extraDmg > 1 && skipBrutal) {
      extraDmg = 1;
      formula.source += " + Heavy Hit";
    }

    if (extraDmg === 2) formula.source += " + Brutal Hit";
    if (extraDmg >= 3) formula.source += ` + Brutal Hit(over ${extraDmg * 5})`;
    formula.value += extraDmg;
    return formula;
  }

  #contestModifications(formula, clear=false) {
    // Contest fail - target succeeded - use fail formula
    if (this.contest < 0 && formula.failValue != null) {
      formula.source = formula.source.replace("Base Value", "[Contest Failed]");
      formula.value = formula.failValue;
    }
    // Contest each 5 - target failed - apply each 5 formula
    if (this.contest >= 5 && formula.each5Value && !clear) {
      const degree = Math.abs(Math.floor((this.contest)/5));
      formula.source = formula.source.replace("Base Value", `[Contest won over ${(degree * 5)}]`);
      formula.value += (degree * formula.each5Value);
    }
    return formula;
  }

  #checkModifications(formula, clear=false) {
    // Check fail
    if (this.check < 0 && formula.failValue != null) {
      formula.source = formula.source.replace("Base Value", "[Check Failed]");
      formula.value = formula.failValue;
    }
    // Check each 5
    if (this.check >= 5 && formula.each5Value && !clear) {
      const degree = Math.floor((this.check)/5);
      formula.source = formula.source.replace("Base Value", `[Check succeeded over ${(degree * 5)}]`);
      formula.value += (degree * formula.each5Value);
    }
    return formula;
  }

  #attackMiss(formula) {
    formula.value = 0;
    formula.source = "Miss";
    return formula;
  }

  #critFail(formula, label) {
    formula.value = 0;
    formula.source = label;
    return formula;
  }

  #critSuccess(formula, calcData) {
    const canCrit = !!calcData.canCrit;
    const skipCrit = !!calcData.skipFor?.crit;
    const isCrit = calcData.isCritHit;
    if (canCrit && !skipCrit && isCrit) {
      formula.source += " + Critical";
      formula.value += 2;
      return formula;
    }
    else {
      return formula;
    }
  }

  #flatReduction(formula, flatValue, label) {
    if (!flatValue) return formula;
    if (flatValue > 0) formula.source += ` - ${label} Reduction(${flatValue})`;
    if (flatValue < 0) formula.source += ` + Extra ${label}(${Math.abs(flatValue)})`;
    formula.value -= flatValue;
    return formula;
  }

  #flatReductionHalf(formula, label) {
    formula.source += ` - ${label} Reduction(Half)`;
    formula.value = Math.ceil(formula.value/2);
    return formula;
  }

  #applyDamageReduction(formula, dr) {
    const type = formula.type;
    const ignore = this.targetFlags.ignore || {};

    let drKey = "";
    let dmgTypes = [];
    if (CONFIG.DC20RPG.DROPDOWN_DATA.physicalDamageTypes[type]) {
      drKey = "pdr";
      dmgTypes = Object.keys(CONFIG.DC20RPG.DROPDOWN_DATA.physicalDamageTypes);
    }
    if (CONFIG.DC20RPG.DROPDOWN_DATA.elementalDamageTypes[type]) {
      drKey = "edr";
      dmgTypes = Object.keys(CONFIG.DC20RPG.DROPDOWN_DATA.elementalDamageTypes);
    }
    if (CONFIG.DC20RPG.DROPDOWN_DATA.mysticalDamageTypes[type]) {
      drKey = "mdr";
      dmgTypes = Object.keys(CONFIG.DC20RPG.DROPDOWN_DATA.mysticalDamageTypes);
    }
    if (!drKey) return;
    if (ignore[drKey]) return;

    const activeDr = dr[drKey].active;
    if (activeDr) {
      for (const key of dmgTypes) {
        dr.damageTypes[key].resistance = true;
      }
    }
  }

  #damageModifications(formula, dr) {
    const type = formula.type;
    if (type === "true" || type === "") return formula; // True dmg cannot be modified
  
    const ignore = this.targetFlags.ignore || {};
    const ignoreResitance = ignore.resistance && ignore.resistance.has(type);
    const ignoreImmune = ignore.immune && ignore.immune.has(type);
    const modifications = dr.damageTypes[type];

    // STEP 1 - Adding & Subtracting
    // Resistance X
    if (modifications.resist > 0 && !ignoreResitance) {
      formula.source += ` - Resistance(${modifications.resist})`;
      formula.value -= modifications.resist;
    }
    // Vulnerability X
    if (modifications.vulnerable > 0) {
      formula.source += ` + Vulnerability(${modifications.vulnerable})`;
      formula.value += modifications.vulnerable; 
    }

    // STEP 2 - Doubling & Halving
    // Immunity
    if (modifications.immune && !ignoreImmune) {
      formula.source = "Resistance(Immune)";
      formula.value = 0;
      formula.immune = true;
      return formula;
    }
    // Resistance and Vulnerability - cancel each other
    if ((modifications.resistance && !ignoreResitance) && modifications.vulnerability) {
      return formula;
    }
    // Resistance (reduce minimum 1)
    if (modifications.resistance && !ignoreResitance) {
      const newValue = Math.ceil(formula.value/2);
      if (newValue === formula.value) formula.value = formula.value - 1;
      else formula.value = newValue;
      formula.source += ` - Resistance(Half)`;
    } 
    // Vulnerability (adds minimum 1)
    if (modifications.vulnerability) {
      const newValue = Math.ceil(formula.value * 2);
      if (newValue === formula.value) formula.value = formula.value + 1;
      else formula.value = newValue;
      formula.source += ` + Vulnerability(Double)`;
    }
    return formula;
  }

  #finishCalculation(formula) {
    if (formula.modified.value < 0) formula.modified.value = 0;
    formula.modified.value = Math.ceil(formula.modified.value);
    
    if (formula.clear.value < 0) formula.clear.value = 0;
    formula.clear.value = Math.ceil(formula.clear.value);
    return formula;
  }

  #mergeFormulas(formulas, defKey="") {
    const preMerge = foundry.utils.deepClone(formulas);
    const postMerge = new Map();
    for (const formula of preMerge) {
      const modified = formula.modified;
      if (modified.dontMerge) {
        this.#setOrUpdate(postMerge, formula, foundry.utils.randomID());
        continue;
      }
      const ovrDef = modified.overrideDefence;
      let key = modified.type;
      if (ovrDef && defKey && ovrDef != defKey) key += "defDif";
      this.#setOrUpdate(postMerge, formula, key);
    }
    return postMerge.values().toArray();
  }

  #setOrUpdate(postMerge, formula, key) {
    if (postMerge.has(key)) {
      const merged = postMerge.get(key);      
      // Each 5 Value
      if (formula.clear.each5Value) {
        if (!merged.modified.each5Value) merged.modified.each5Value = 0;
        if (!merged.clear.each5Value) merged.clear.each5Value = 0;
        merged.modified.each5Value += formula.clear.each5Value;
        merged.clear.each5Value += formula.clear.each5Value;
      }
      // Fail Value
      if (formula.clear.failValue != null) {
        if (!merged.modified.failValue) merged.modified.failValue = merged.clear.value;
        if (!merged.clear.failValue) merged.clear.failValue = merged.clear.value;
        merged.modified.failValue += formula.clear.failValue;
        merged.clear.failValue += formula.clear.failValue;
      }

      // Base Value
      merged.modified.value += formula.clear.value;
      merged.clear.value += formula.clear.value;

      // Source
      const source = formula.clear.source.replace("Base Value", "Merged Value");
      merged.modified.source += ` + (${source})`;
      merged.clear.source += ` + (${source})`;
    }
    else {
      postMerge.set(key, formula);
    }
  }

  //=======================================// 
  //=          TARGET MODIFIERS           =//
  //=======================================//
  async getMatchingTargetModifiers(data={}) {
    if (this.actor.dummy) return [];

    const baseData = {
      target: this,
      calcData: {},
      formula: null, 
      hit: null
    }
    const matching = [];
    for (const modifier of this.targetModifiers) {
      const result = await runTemporaryMacro(modifier.condition, this, {...baseData, ...data});
      if (result === true) matching.push(modifier);
    }
    return matching;
  }

  async getTargetSpecificEffects(calcData={}) {
    const effects = [];
    for (const modifier of await this.getMatchingTargetModifiers({calcData: calcData, hit: this.hit})) {
      if (modifier.effect) {
        modifier.effect.targetSpecific = true;
        effects.push(modifier.effect);
      }
    }
    return effects;
  }

  async getTargetSpecificStatuses(calcData={}) {
    const statuses = [];
    for (const modifier of await this.getMatchingTargetModifiers({calcData: calcData, hit: this.hit})) {
      if (modifier.addsAgainstStatus && modifier.againstStatus.id) {
        modifier.againstStatus.targetSpecific = true;
        statuses.push(modifier.againstStatus);
      }
    }
    return statuses;
  }

  async getTargetSpecificRollRequests(calcData={}) {
    const rollRequests = {contests: [], saves: []};
    for (const modifier of await this.getMatchingTargetModifiers({calcData: calcData, hit: this.hit})) {
      if (modifier.addsNewRollRequest && modifier.rollRequest.category) {
        const request = modifier.rollRequest;
        request.targetSpecific = true;
        if (request.category === "save") {
          request.label = CONFIG.DC20RPG.ROLL_KEYS.saveTypes[request.saveKey];
          request.title = game.i18n.localize("dc20rpg.chat.targetSpecificRoll") + modifier.name;
          rollRequests.saves.push(request);
        }
        if (request.category === "contest") {
          request.label = CONFIG.DC20RPG.ROLL_KEYS.contests[request.contestedKey];
          request.title = game.i18n.localize("dc20rpg.chat.targetSpecificRoll") + modifier.name;
          rollRequests.contests.push(request);
        }
      }
    }
    return rollRequests;
  }

  async #targetModifierBonus(formula, calcData) {
    if (!!calcData.skipFor?.targetModifiers) return formula;

    for (const modifier of await this.getMatchingTargetModifiers({calcData: calcData, formula: formula, hit: this.hit})) {
      // Apply extra dmg/healing
      if (modifier.bonus && modifier.bonus !== "" && modifier.bonus !== "0") {
        formula.source += ` + ${modifier.name}`;
        formula.value += evaluateDicelessFormula(modifier.bonus, this.actor.getRollData())._total;
      }
    }
    return formula;
  }

  async #targetSpecificFormulas(category, calcData) {
    const formulas = [];
    for (const modifier of await this.getMatchingTargetModifiers({calcData: calcData, hit: this.hit})) {
      if (!modifier.addsNewFormula) continue;
      if (modifier.formula.category !== category) continue;

      const original = modifier.formula;
      const formulaRoll = await evaluateFormula(original.formula || "0", this.actor.getRollData(), true);
      const formula = {
        targetSpecific: true,
        source: modifier.name,
        type: original.type,
        value: formulaRoll._total,
        label: type,
        each5Value: null,
        failValue: null
      }
      if (original.each5 && original.each5Formula) {
        const each5Roll = await evaluateFormula(original.each5Formula, this.actor.getRollData(), true);
        formula.each5Value = each5Roll._total;
      }
      if (original.fail && original.failFormula) {
        const failRoll = await evaluateFormula(original.failFormula, this.actor.getRollData(), true);
        formula.failValue = failRoll._total;
      }
      formulas.push({clear: {...formula}, modified: {...formula}});
    }
    return formulas;
  }

  async #prepareTargetFlags() {
    const ignore = {
      pdr: false,
      edr: false,
      mdr: false,
      resistance: new Set(),
      immune: new Set()
    }
    for (const modifier of await this.getMatchingTargetModifiers()) {
      const flags = modifier.flags;
      if (flags) {
        if (flags.ignorePdr) ignore.pdr = true;
        if (flags.ignoreEdr) ignore.edr = true;
        if (flags.ignoreMdr) ignore.mdr = true;
        ignore.resistance = new Set([...ignore.resistance, ...Object.keys(flags.ignoreResistance)]);
        ignore.immune = new Set([...ignore.immune, ...Object.keys(flags.ignoreImmune)]);
      }
    }
    this.targetFlags = {ignore: ignore};
  }

  //=======================================// 
  //=             ROLL OUTCOME            =//
  //=======================================//
  get attackOutcome() {
    if (this.hit == null) return null;

    const calcData = this.calcData || {};
    const critMiss = calcData.isCritMiss;
    const miss = this.hit < 0;
    const crit = calcData.isCritHit && !calcData.skipFor?.crit;
    const heavy = this.hit >= 5 && !calcData.skipFor?.heavy;
    const brutal = this.hit >= 10 && !calcData.skipFor?.brutal;
    const brutalP = this.hit >= 15 && !calcData.skipFor?.brutal;

    if (critMiss) {
      return {label: "Critical Miss", type: "fail"};
    }
    if (miss) {
      return {label: "Miss", type: "fail"};
    }

    if (brutalP) {
      return crit ?  
        {label: "Critical Brutal(+)", type: "success"} :
        {label: "Brutal Hit(+)", type: "success"};
    }
    if (brutal) {
      return crit ?  
        {label: "Critical Brutal", type: "success"} :
        {label: "Brutal Hit", type: "success"};
    }
    if (heavy) {
      return crit ?  
        {label: "Critical Heavy", type: "success"} :
        {label: "Heavy Hit", type: "success"};
    }
    return crit ?  
        {label: "Critical Hit", type: "success"} :
        {label: "Hit", type: "success"};
  }

  get contestOutcome() {
    if (this.contest == null) return null;
    if (this.contest < 0) return {label: "Succeeded with " + this.targetRoll, type: "success"};
    if (this.contest >= 0) return {label: "Failed with " + this.targetRoll, type: "fail"};
  }

  //=======================================// 
  //=                APPLY                =//
  //=======================================//
  async #applyDamage(damage, options={}) {
    if (damage.value === 0) return;

    const health = this.actor.system.resources.health;
    const newValue = health.value - damage.value;

    const updateData = {["system.resources.health.value"]: newValue}
    if (this.actor.dummy) return updateData;

    await this.actor.gmUpdate(updateData, {
      skipEventCall: options.skipEventCall,
      messageId: options.messageId, 
      hpChangeSource: damage.source
    });
  }

  async #applyHealing(heal, options={}) {
    if (heal.value === 0) return;

    const preventHpRegen = this.actor.system.globalModifier.prevent.hpRegeneration;
    if (preventHpRegen) {
      ui.notifications.error('You cannot regain any HP');
      return;
    }
    if (heal.type === "heal")       return await this.#applyHeal(heal, options);
    if (heal.type === "temporary")  return await this.#applyTemporary(heal, options);
  }

  async #applyHeal(heal, options) {
    const health = this.actor.system.resources.health;
    const oldCurrent = health.current;

    let newCurrent = oldCurrent + heal.value;
    let temp = health.temp || 0;
    let source = heal.source;

    // Handle Overheal
    if (health.max < newCurrent) {
      const overheal = newCurrent - health.max;
      // Allow Overheal to transfer to temporary hp
      if (heal.allowOverheal) {
        if (overheal > temp) {
          source += ` -> (Overheal <b>${overheal}</b> -> Transfered to TempHP)`;
          temp = overheal;
        }
        else source += ` -> (Overheal <b>${overheal}</b> -> Would transfer to TempHP but current TempHP is bigger)`;
      }
      else source += ` -> (Overheal <b>${overheal}</b>)`;
      newCurrent = health.max;
    }


    const updateData = {
      ["system.resources.health.temp"]: temp,
      ["system.resources.health.value"]: newCurrent + temp,
      ["system.resources.health.current"]: newCurrent
    }
    if (this.actor.dummy) return updateData;

    await this.actor.gmUpdate(updateData, {
      skipEventCall: options.skipEventCall,
      messageId: options.messageId, 
      hpChangeSource: source
    });
  }
  
  async #applyTemporary(heal, options) {
    // Temporary HP do not stack it overrides
    const health = this.actor.system.resources.health;
    const oldTemp = health.temp || 0;
    const value = heal.value;
    let source = heal.source;

    if (oldTemp >= value) {
      source += ` -> (Current Temporary HP is higher)`;
      DC20ChatMessage.hpChangeMessage(0, source, this.actor);
      return;
    }
    else if (oldTemp > 0) {
      source += ` -> (Adds ${value - oldTemp} to curent Temporary HP)`;
    }

    const updateData = {["system.resources.health.temp"]: value}
    if (this.actor.dummy) return updateData;

    await this.actor.gmUpdate(updateData, {
      skipEventCall: options.skipEventCall,
      messageId: options.messageId, 
      hpChangeSource: source
    });
  }
}