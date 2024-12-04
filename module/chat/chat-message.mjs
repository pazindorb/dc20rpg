import { promptRoll, promptRollToOtherPlayer } from "../dialogs/roll-prompt.mjs";
import DC20RpgMeasuredTemplate, { getSystemMesuredTemplateTypeFromDC20Areas } from "../placeable-objects/measuredTemplate.mjs";
import { prepareCheckDetailsFor, prepareSaveDetailsFor } from "../helpers/actors/attrAndSkills.mjs";
import { applyDamage, applyHealing } from "../helpers/actors/resources.mjs";
import { getSelectedTokens, getTokensInsideMeasurementTemplate, targetToToken, tokenToTarget } from "../helpers/actors/tokens.mjs";
import { effectMacroHelper, injectFormula } from "../helpers/effects.mjs";
import { datasetOf } from "../helpers/listenerEvents.mjs";
import { generateKey, getValueFromPath, setValueForPath } from "../helpers/utils.mjs";
import { addStatusWithIdToActor } from "../statusEffects/statusUtils.mjs";
import { enhanceTarget, prepareRollsInChatFormat } from "./chat-utils.mjs";
import { getTokenSelector } from "../dialogs/token-selector.mjs";
import { evaluateFormula } from "../helpers/rolls.mjs";
import { clearHelpDice } from "../helpers/actors/actions.mjs";
import { runEventsFor } from "../helpers/actors/events.mjs";

export class DC20ChatMessage extends ChatMessage {

  /** @overriden */
  prepareDerivedData() {
    super.prepareDerivedData();
    if (this.system.chatFormattedRolls?.core) this._prepareRolls();
    const system = this.system;
    if (!system.hasTargets) return;

    // Initialize applyToTargets flag for the first time
    if (system.applyToTargets === undefined) {
      if (system.targetedTokens.length > 0) system.applyToTargets = true;
      else system.applyToTargets = false;
    }
    this._prepareDisplayedTargets();
    this._prepareMeasurementTemplates();
  }

  _prepareRolls() {
    const rollLevel = this.system.rollLevel;
    let winner = this.system.chatFormattedRolls.core;
    const extraRolls = this.system.extraRolls;

    // Check if any extra roll should repleace winner
    if (extraRolls) {
      winner.ignored = true;
      extraRolls.forEach(roll => {
        roll.ignored = true;
        if (rollLevel > 0) {
          if (roll._total > winner._total) winner = roll;
        }
        else {
          if (roll._total < winner._total) winner = roll;
        }
      })
    }

    winner.ignored = false;
    this.system.chatFormattedRolls.winningRoll = winner;

    // If it was a contest we need to make sure that against value was updated
    if (this.system.actionType === "contest") {
      this.system.checkDetails.contestedAgainst = winner._total;
    }
    if (this.system.actionType === "check") {
      this.system.checkDetails.rollTotal = winner._total;
    }
  }

  _prepareMeasurementTemplates() {
    const areas = this.system.areas;
    if (!areas) return;

    const measurementTemplates = {};
    for (let [key, area] of Object.entries(areas)) {
      const type = area.area;
      const distance = area.distance;
      if (!type || !distance) continue;  // We need those values to be present for templates 

      const width = area.width;
      const angle = type === "arc" ? 180 : 53.13;

      if (type === "area") {
        measurementTemplates[key] = {
          type: type,
          distance: 1,
          width: 1,
          systemType: CONST.MEASURED_TEMPLATE_TYPES.CIRCLE,
          label: this._createLabelForTemplate(type, distance),
          numberOfFields: distance,
          difficult: area.difficult
        }
      }
      else {
        measurementTemplates[key] = {
          type: type,
          distance: distance,
          angle: angle,
          width: width,
          systemType: getSystemMesuredTemplateTypeFromDC20Areas(type),
          label: this._createLabelForTemplate(type, distance, width),
          difficult: area.difficult
        }
      }
    }
    if (Object.keys(measurementTemplates).length > 0) {
      this.system.measurementTemplates = measurementTemplates;
    }
  }

  _createLabelForTemplate(type, distance, width, unit) {
    const widthLabel = width && type === "line" ? ` x ${width}` : "";
    const unitLabel = unit ||  game.i18n.localize("dc20rpg.measurement.spaces");
    
    let label = game.i18n.localize(`dc20rpg.measurement.${type}`);
    label += ` [${distance}${widthLabel} ${unitLabel}]`;
    return label;
  }

  _prepareDisplayedTargets() {
    this.noTargetVersion = false;
    const system = this.system;
    const rolls = system.chatFormattedRolls;
    const actionType = system.actionType;
    const defenceKey = system.targetDefence;
    const halfDmgOnMiss = system.halfDmgOnMiss;
    const conditionals = system.conditionals;
    const canCrit = system.canCrit;
    const checkDC = system.checkDetails?.checkDC;

    let targets = [];
    if (system.applyToTargets) targets = this._tokensToTargets(this._fetchTokens(system.targetedTokens));   // From targets
    else if (game.user.isGM) targets = this._tokensToTargets(getSelectedTokens());      // From selected tokens (only for the GM)
    else {                                                                          
      targets = this._noTargetVersion();                        // No targets (only for the Player)
      this.noTargetVersion = true;                              // We always want to show damage/healing for No Target version
    }                                         

    const displayedTargets = {};
    targets.forEach(target => {
      enhanceTarget(target, actionType, rolls.winningRoll, rolls.dmg, rolls.heal, defenceKey, checkDC, halfDmgOnMiss, conditionals, canCrit);
      displayedTargets[target.id] = target;
    });
    system.targets = displayedTargets;
  }

  _fetchTokens(targetedTokens) {
    if (!game.canvas.tokens) return [];
    const tokens = [];
    for (const tokenId of targetedTokens) {
      const token = game.canvas.tokens.get(tokenId);
      if (token) tokens.push(token);
    }
    return tokens;
  }

  _tokensToTargets(tokens) {
    if (!tokens) return [];
    const targets = [];
    tokens.forEach(token => targets.push(tokenToTarget(token)));
    return targets;
  }

  _noTargetVersion() {
    return [{
      name: "No target selected",
      img: "icons/svg/mystery-man.svg",
      id: generateKey(),
      noTarget: true,
    }];
  }

  /** @overriden */
  async getHTML() {
    // We dont want "someone rolled privately" messages.
    if (!this.isContentVisible) return "";

    const system = this.system;
    // Prepare content depending on messageType
    switch(system.messageType) {
      case "damage": case "healing": case "temporary": 
        this.content = await this._damageHealingTaken();
        break;
      
      case "roll": case "description": 
        this.content = await this._rollAndDescription();
        break;
    }

    const html = await super.getHTML();
    this._activateListeners(html);        // Activete listeners on rendered template
    return html;
  }

  async _damageHealingTaken() {
    const system = this.system;
    const contentData = {
      ...system,
      userIsGM: game.user.isGM
    };
    const templateSource = "systems/dc20rpg/templates/chat/damage-healing-taken-message.hbs";
    return await renderTemplate(templateSource, contentData);
  }

  async _rollAndDescription() {
    const system = this.system;
    const shouldShowDamage = (game.user.isGM || system.showDamageForPlayers || this.noTargetVersion);
    const canUserModify = this.canUserModify(game.user, "update");
    const applicableStatuses = this._prepareApplicableStatuses();
    const contentData = {
      ...system,
      userIsGM: game.user.isGM,
      shouldShowDamage: shouldShowDamage,
      canUserModify: canUserModify,
      applicableStatuses: applicableStatuses
    };
    const templateSource = "systems/dc20rpg/templates/chat/roll-chat-message.hbs";
    return await renderTemplate(templateSource, contentData);
  }

  _prepareApplicableStatuses() {
    const failEffects = this.system.failEffects;
    if (!failEffects) return [];

    const applicableStatuses = [];
    failEffects.forEach(failEffect => {
      const status = CONFIG.statusEffects.find(e => e.id === failEffect.id);
      if (status) applicableStatuses.push({
        img: status.img,
        name: status.name,
        status: failEffect.id,
      })
    });
    return applicableStatuses;
  }

  _activateListeners(html) {
    // Basic functionalities
    html.find('.activable').click(ev => this._onActivable(datasetOf(ev).path));

    // Show/Hide description
    html.find('.expand-row').click(ev => {
      ev.preventDefault();
      const description = ev.target.closest(".chat_v2").querySelector(".expandable-row");
      if(description) description.classList.toggle('expand');
    });

    // Swap targeting mode
    html.find('.token-selection').click(() => this._onTargetSelectionSwap());
    html.find('.run-check-for-selected').click(ev => {
      ev.stopPropagation();
      this._prepareDisplayedTargets();
      ui.chat.updateMessage(this);
    });

    // Buttons
    html.find('.create-template').click(ev => this._onCreateMeasuredTemplate(datasetOf(ev).key))
    html.find('.modify-roll').click(ev => this._onModifyRoll(datasetOf(ev).direction, datasetOf(ev).modified, datasetOf(ev).path));
    html.find('.apply-damage').click(ev => this._onApplyDamage(datasetOf(ev).target, datasetOf(ev).roll, datasetOf(ev).modified));
    html.find('.apply-healing').click(ev => this._onApplyHealing(datasetOf(ev).target, datasetOf(ev).roll, datasetOf(ev).modified));
    html.find('.apply-effect').click(ev => this._onApplyEffect(datasetOf(ev).effectUuid));
    html.find('.roll-save').click(ev => this._onSaveRoll(datasetOf(ev).target, datasetOf(ev).key, datasetOf(ev).dc));
    html.find('.roll-check').click(ev => this._onCheckRoll(datasetOf(ev).target, datasetOf(ev).key, datasetOf(ev).against));
    html.find('.apply-status').click(ev => this._onApplyStatus(datasetOf(ev).status));
    html.find('.target-confirm-button').click(() => this._onTargetConfirm());
    html.find('.apply-all-button').click(() => this._onApplyAll())
    
    html.find('.revert-button').click(ev => {
      ev.stopPropagation();
      this._onRevert();
    });

    // Modify rolls
    html.find('.add-roll').click(async ev => {ev.stopPropagation(); await this._addRoll(datasetOf(ev).type)});
    html.find('.remove-roll').click(ev => {ev.stopPropagation(); this._removeRoll(datasetOf(ev).type)});

    // Drag and drop
    html[0].addEventListener('dragover', ev => ev.preventDefault());
    html[0].addEventListener('drop', async ev => await this._onDrop(ev));
  }

  _onActivable(path) {
     let value = getValueFromPath(this, path);
     setValueForPath(this, path, !value);
     ui.chat.updateMessage(this);
  }

  _onTargetSelectionSwap() {
    const system = this.system;
    if (system.targetedTokens.length === 0) return;
    system.applyToTargets = !system.applyToTargets;
    this._prepareDisplayedTargets();
    ui.chat.updateMessage(this);
  }

  _onApplyEffect(effectUuid) {
    const system = this.system;
    const targets = system.targets;
    if (Object.keys(targets).length === 0) return;
    
    const effect = fromUuidSync(effectUuid);
    if (!effect) {
      ui.notifications.warn(`Effect with uuid '${effectUuid}' couldn't be found or no longer exist`);
      return;
    }

    // We dont want to modify original effect so we copy its data.
    const effectData = {...effect};
    this._replaceWithSpeakerId(effectData);
    injectFormula(effectData, effect.parent);
    Object.values(targets).forEach(target => {
      const actor = this._getActor(target);
      if (actor) effectMacroHelper.toggleEffectOnActor(effectData, actor);
    });
  }

  _onApplyStatus(statusId) {
    const system = this.system;
    const targets = system.targets;
    if (Object.keys(targets).length === 0) return;

    const failEffect = system.failEffects.find(eff => eff.id === statusId);
    const extras = {...failEffect, actorId: this.speaker.actor};
    Object.values(targets).forEach(target => {
      const actor = this._getActor(target);
      if (actor) addStatusWithIdToActor(actor, statusId, extras);
    });
  }

  _replaceWithSpeakerId(effect) {
    for (let i = 0; i < effect.changes.length; i++) {
      let changeValue = effect.changes[i].value;
      if (changeValue.includes("#SPEAKER_ID#")) {
        effect.changes[i].value = changeValue.replaceAll("#SPEAKER_ID#", this.speaker.actor);
      }
    }
  }

  _onApplyAll() {
    const targets = this.system.targets;
    if (!targets) return;

    Object.entries(targets).forEach(([targetKey, target]) => {
      const targetDmg = target.dmg;
      const targetHeal = target.heal;

      // Apply Damage
      Object.entries(targetDmg).forEach(([dmgKey, dmg]) => {
        this._onApplyDamage(targetKey, dmgKey, dmg.showModified);
      });
      // Apply Healing
      Object.entries(targetHeal).forEach(([healKey, heal]) => {
        this._onApplyHealing(targetKey, healKey, heal.showModified);
      });
    })
  }

  _onTargetConfirm() {
    const targets = this.system.targets;
    if (!targets) return;
    
    Object.values(targets).forEach(target => {
      const token = targetToToken(target);
      if (token) runEventsFor("targetConfirm", token.actor);
    });
  }

  async _onCreateMeasuredTemplate(key) {
    const template = this.system.measurementTemplates[key];
    if (!template) return;

    let tokens = {};
    // Custom Area type
    if (template.type === "area") {
      const measuredTemplates = [];
      const label = template.label;
      let left = template.numberOfFields;
      template.label = label + ` <${left} Left>`;
      template.selected = true; 
      ui.chat.updateMessage(this);

      for(let i = 1; i <= template.numberOfFields; i++) {
        const mT = await DC20RpgMeasuredTemplate.pleacePreview(template.systemType, template);
        measuredTemplates.push(mT);

        left--;
        if (left) template.label = label + ` <${left} Left>`;
        else template.label = label;
        ui.chat.updateMessage(this);
      }

      template.selected = false; 
      ui.chat.updateMessage(this);
      for (let i = 0; i < measuredTemplates.length; i++) {
        const collectedTokens = getTokensInsideMeasurementTemplate(measuredTemplates[i]);
        tokens = {
          ...tokens,
          ...collectedTokens
        }
      }
    }
    // Predefined type
    else {
      template.selected = true; 
      ui.chat.updateMessage(this);
      const measuredTemplate = await DC20RpgMeasuredTemplate.pleacePreview(template.systemType, template);
      template.selected = false; 
      ui.chat.updateMessage(this);
      tokens = getTokensInsideMeasurementTemplate(measuredTemplate);
    }
    
    if (Object.keys(tokens).length > 0) tokens = await getTokenSelector(tokens);
    if (Object.keys(tokens).length > 0) {
      const newTargets = Object.keys(tokens);
      await this.update({["system.targetedTokens"]: newTargets});
    }
  }

  _onModifyRoll(direction, modified, path) {
    modified = modified === "true"; // We want boolean
    const extra = direction === "up" ? 1 : -1;
    const source = (direction === "up" ? " + 1 " : " - 1 ") + "(Manual)";

    const toModify = getValueFromPath(this, path);
    if (modified) {
      toModify.modified.value += extra;
      toModify.modified.source += source;
    }
    else {
      toModify.clear.value += extra;
      toModify.clear.source += source;
    }
    ui.chat.updateMessage(this);
  }

  _onApplyDamage(targetKey, dmgKey, modified) {
    const system = this.system;
    const target = system.targets[targetKey];
    const actor = this._getActor(target);
    if (!actor) return;

    const dmgModified = modified === "true" ? "modified" : "clear";
    const dmg = target.dmg[dmgKey][dmgModified];
    applyDamage(actor, dmg);
  }

  _onApplyHealing(targetKey, healKey, modified) {
    const system = this.system;
    const target = system.targets[targetKey];
    const actor = this._getActor(target);
    if (!actor) return;

    const healModified = modified === "true" ? "modified" : "clear";
    const heal = target.heal[healKey][healModified];
    applyHealing(actor, heal);
  }

  async _onSaveRoll(targetKey, key, dc, failEffects) {
    const system = this.system;
    const target = system.targets[targetKey];
    const actor = this._getActor(target);
    if (!actor) return;

    if (!failEffects) failEffects = this.system.failEffects;
    const details = prepareSaveDetailsFor(actor, key, dc, failEffects);
    this._rollAndUpdate(target, actor, details);
  }

  async _onCheckRoll(targetKey, key, against) {
    const system = this.system;
    const target = system.targets[targetKey];
    const actor = this._getActor(target);
    if (!actor) return;

    const failEffects = this.system.failEffects;
    if (["phy", "men", "mig", "agi", "int", "cha"].includes(key)) {
      this._onSaveRoll(targetKey, key, against, failEffects);
      return;
    }
    const details = prepareCheckDetailsFor(actor, key, against, failEffects);
    this._rollAndUpdate(target, actor, details);
  }

  async _rollAndUpdate(target, actor, details) {
    let roll = null;
    if (game.user.isGM) roll = await promptRollToOtherPlayer(actor, details);
    else roll = await promptRoll(actor, details);

    if (!roll || !roll.hasOwnProperty("_total")) return;
    let rollOutcome = {
      success: "",
      label: ""
    };
    if (roll.crit) {
      rollOutcome.success = true;
      rollOutcome.label = "Critical Success";
    }
    else if (roll.fail) {
      rollOutcome.success = false;
      rollOutcome.label = "Critical Fail";
    }
    else {
      const rollTotal = roll._total;
      const rollSuccess = roll._total >= details.against;
      rollOutcome.success = rollSuccess;
      rollOutcome.label = (rollSuccess ? "Succeeded with " : "Failed with ") + rollTotal;
    }
    target.rollOutcome = rollOutcome;
    ui.chat.updateMessage(this);
  }

  _getActor(target) {
    if (!target) return;
    const token = game.canvas.tokens.get(target.id);
    if (!token) return;
    const actor = token.actor;
    return actor;
  }

  _onRevert() {
    const system = this.system;
    const type = system.messageType;
    const amount = system.amount;
    const uuid = system.actorUuid;

    const actor = fromUuidSync(uuid);
    if (!actor) return;

    const health = actor.system.resources.health;
    let newValue = health;
    if (type === "damage") newValue = health.value + amount;
    else newValue = health.value - amount;
    actor.update({["system.resources.health.value"]: newValue});
    this.delete();
  }

  async _addHelpDiceToRoll(helpDice) {
    const coreRoll = this.system.chatFormattedRolls?.core;
    if (!coreRoll) return;

    const ownerId = helpDice.ownerId;
    const helpDiceOwner = helpDice.tokenOwner === "true" 
                            ? game.actors.tokens[ownerId].actor
                            : game.actors.get(ownerId);
    if (!helpDiceOwner) return;

    const help = await evaluateFormula(helpDice.formula, helpDiceOwner.getRollData());
    sendDescriptionToChat(helpDiceOwner, {
      rollTitle: `${game.i18n.localize("dc20rpg.sheet.help.help")} ${help.total}`,
      image: helpDiceOwner.img,
    });

    // Add help dice to core roll
    coreRoll._formula += ` + ${helpDice.formula}`;
    coreRoll._total += help.total;
    coreRoll.terms.push(...help.terms);

    // Add help dice to extra rolls
    const extraRolls = this.system.extraRolls;
    if (extraRolls) {
      for (const roll of extraRolls) {
        roll._formula += ` + ${helpDice.formula}`;
        roll._total += help.total;
        roll.terms.push(...help.terms);
      }
    }

    const updateData = {
      system: {
        chatFormattedRolls: {
          core: coreRoll
        },
        extraRolls: extraRolls
      }
    }
    await this.update(updateData);
    await clearHelpDice(helpDiceOwner, helpDice.key);
  }

  async _addRoll(rollType) {
    const winningRoll = this.system.chatFormattedRolls.winningRoll;
    if (!winningRoll) return;

    // We need to make sure that user is not rolling to fast, because it can cause roll level bug
    if (this.rollInProgress) return;
    this.rollInProgress = true;

    // Advantage/Disadvantage is only a d20 roll
    const d20Roll = await new Roll("d20", null).evaluate(); 
    // Making Dice so Nice display that roll
    if (game.dice3d) await game.dice3d.showForRoll(d20Roll, this.user, true, null, false);

    // Now we want to make some changes to duplicated roll to match how our rolls look like
    const newRoll = this._mergeExtraRoll(d20Roll, winningRoll);
    const extraRolls = this.system.extraRolls || [];
    extraRolls.push(newRoll);

    // Determine new roll Level
    let newRollLevel = this.system.rollLevel
    if (rollType === "adv") newRollLevel++;
    if (rollType === "dis") newRollLevel--;

    const updateData = {
      system: {
        extraRolls: extraRolls,
        rollLevel: newRollLevel
      }
    }
    await this.update(updateData);
    this.rollInProgress = false;
  }

  _removeRoll(rollType) {
    // There is nothing to remove, only one dice left
    if (this.system.rollLevel === 0) return;

    const extraRolls = this.system.extraRolls;
    // First we need to remove extra rolls
    if (extraRolls && extraRolls.length !== 0) this._removeExtraRoll(rollType);
    // If there are no extra rolls we need to remove one of real rolls
    else this._removeLastRoll(rollType);
  }

  _removeExtraRoll(rollType) {
    const extraRolls = this.system.extraRolls;
    // Remove last extra roll
    extraRolls.pop();

    // Determine new roll Level
    let newRollLevel = this.system.rollLevel
    if (rollType === "adv") newRollLevel--;
    if (rollType === "dis") newRollLevel++;

    const updateData = {
      system: {
        extraRolls: extraRolls,
        rollLevel: newRollLevel
      }
    }
    this.update(updateData);
  }

  _removeLastRoll(rollType) {
    if (!rollType) return;
    let rollLevel = this.system.rollLevel;
    const absLevel = Math.abs(rollLevel);

    const winner = this.system.chatFormattedRolls.winningRoll;
    const d20Dices = winner.terms[0].results;
    d20Dices.pop();

    // We need to chenge some values for that roll
    const rollMods = winner._total - winner.flatDice;
    const valueOnDice = this._getNewBestValue(d20Dices, rollType);
    
    winner._formula = winner._formula.replace(`${absLevel + 1}d20`, `${absLevel}d20`)
    winner.number = absLevel;
    winner.terms[0].number = absLevel;
    winner.flatDice = valueOnDice;
    winner._total = valueOnDice + rollMods;
    winner.crit = valueOnDice === 20 ? true : false;
    winner.fail = valueOnDice === 1 ? true : false;

    const coreRoll = winner;

    // Determine new roll Level
    if (rollType === "adv") rollLevel--;
    if (rollType === "dis") rollLevel++;

    const updateData = {
      system: {
        rollLevel: rollLevel,
        ["chatFormattedRolls.core"]: coreRoll
      }
    }
    this.update(updateData);
  }

  _getNewBestValue(d20Dices, rollType) {
    // Get highest
    if (rollType === "adv") {
      let highest = d20Dices[0];
      for(let i = 1; i < d20Dices.length; i++) {
        if (d20Dices[i].result > highest.result) highest = d20Dices[i];
      }
      return highest.result;
    }

    // Get lowest
    if (rollType === "dis") {
      let lowest = d20Dices[0];
      for(let i = 1; i < d20Dices.length; i++) {
        if (d20Dices[i].result < lowest.result) lowest = d20Dices[i];
      }
      return lowest.result;
    }
  }

  _mergeExtraRoll(d20Roll, oldRoll) {
    const dice = d20Roll.terms[0];
    const valueOnDice = dice.results[0].result;

    // We want to extract old roll modifiers
    const rollMods = oldRoll._total - oldRoll.flatDice;

    const newRoll = foundry.utils.deepClone(oldRoll);
    newRoll.terms[0] = dice;
    newRoll.flatDice = valueOnDice;
    newRoll._total = valueOnDice + rollMods;
    newRoll.crit = valueOnDice === 20 ? true : false;
    newRoll.fail = valueOnDice === 1 ? true : false;
    newRoll._formula = `d20 + ${rollMods}`;
    return newRoll;
  }

  async _onDrop(event) {
    event.preventDefault();

    const droppedData  = event.dataTransfer.getData('text/plain');
    if (!droppedData) return;
    
    const helpDice = JSON.parse(droppedData);
    if (helpDice.type !== "help") return;

    await this._addHelpDiceToRoll(helpDice);
  }
}

/**
 * Creates chat message for given rolls.
 * 
 * @param {Object} rolls        - Separated in 3 categories: coreRolls (Array of Rolls), formulaRolls (Array of Rolls), winningRoll (Roll).
 * @param {DC20RpgActor} actor  - Speaker.
 * @param {Object} details      - Informations about labels, descriptions and other details.
 */
export function sendRollsToChat(rolls, actor, details, hasTargets, itemId) {
  const rollsInChatFormat = prepareRollsInChatFormat(rolls);
  const targets = [];
  if (hasTargets) game.user.targets.forEach(token => targets.push(token.id));

  const system = {
    ...details,
    hasTargets: hasTargets,
    targetedTokens: targets,
    roll: rolls.winningRoll,
    chatFormattedRolls: rollsInChatFormat,
    rolls: _rollsObjectToArray(rolls),
    messageType: "roll"
  };

  DC20ChatMessage.create({
    speaker: DC20ChatMessage.getSpeaker({ actor: actor }),
    rollMode: game.settings.get('core', 'rollMode'),
    rolls: _rollsObjectToArray(rolls),
    sound: CONFIG.sounds.dice,
    system: system,
    flags: {dc20rpg: {itemId: itemId}}
  });
}

function _rollsObjectToArray(rolls) {
  const array = [];
  if (rolls.core) array.push(rolls.core);
  if (rolls.formula) {
    rolls.formula.forEach(roll => {
      array.push(roll.clear);
      array.push(roll.modified);
    });
  }
  return array;
}

export function sendDescriptionToChat(actor, details) {
  const system = {
      ...details,
      messageType: "description"
  };
  DC20ChatMessage.create({
    speaker: DC20ChatMessage.getSpeaker({ actor: actor }),
    sound: CONFIG.sounds.notification,
    system: system,
  });
}

export function sendHealthChangeMessage(actor, amount, source, messageType) {
  const gmOnly = !game.settings.get("dc20rpg", "showDamageChatMessage");
  const system = {
    actorName: actor.name,
    image: actor.img,
    actorUuid: actor.uuid,
    amount: amount,
    source: source,
    messageType: messageType
  };

  DC20ChatMessage.create({
    speaker: DC20ChatMessage.getSpeaker({ actor: actor }),
    sound: CONFIG.sounds.notification,
    system: system,
    whisper: gmOnly ? DC20ChatMessage.getWhisperRecipients("GM") : []
  });
}