import { promptRoll, promptRollToOtherPlayer } from "../dialogs/roll-prompt.mjs";
import { prepareCheckDetailsFor, prepareSaveDetailsFor } from "../helpers/actors/attrAndSkills.mjs";
import { applyDamage, applyHealing } from "../helpers/actors/resources.mjs";
import { getSelectedTokens, tokenToTarget } from "../helpers/actors/tokens.mjs";
import { effectMacroHelper } from "../helpers/effects.mjs";
import { datasetOf } from "../helpers/listenerEvents.mjs";
import { generateKey, getValueFromPath, setValueForPath } from "../helpers/utils.mjs";
import { addStatusWithIdToActor } from "../statusEffects/statusUtils.mjs";
import { enhanceTarget, prepareRollsInChatFormat } from "./chat-utils.mjs";

export class DC20ChatMessage extends ChatMessage {

  /** @overriden */
  prepareDerivedData() {
    super.prepareDerivedData();
    if (this.system.chatFormattedRolls !== undefined) this._prepareRolls();
    const system = this.system;
    if (!system.hasTargets) return;

    // Initialize applyToTargets flag for the first time
    if (system.applyToTargets === undefined) {
      if (system.targetedTokens.length > 0) system.applyToTargets = true;
      else system.applyToTargets = false;
    }
    this._prepareDisplayedTargets();
  }

  _prepareRolls() {
    const rollLevel = this.system.rollLevel;
    let winner = this.system.chatFormattedRolls.box[0]; // We expect 1st box roll to be coreRoll
    const extraRolls = this.system.extraRolls;

    // Check if any extra roll should repleace winner
    if (!extraRolls) return;

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

    winner.ignored = false;
    this.system.chatFormattedRolls.winningRoll = winner;

    // If it was a contest we need to make sure that against value was updated
    if (this.system.actionType === "contest") {
      this.system.checkDetails.contestedAgainst = winner._total;
    }
  }

  _prepareDisplayedTargets() {
    this.noTargetVersion = false;
    const system = this.system;
    const rolls = system.chatFormattedRolls;
    const actionType = system.actionType;
    const defenceKey = system.targetDefence;
    const halfDmgOnMiss = system.halfDmgOnMiss;
    const conditionals = system.conditionals;
    const impact = system.impact;
    const canCrit = system.canCrit;

    let targets = [];
    if (system.applyToTargets) targets = this._tokensToTargets(this._fetchTokens(system.targetedTokens));   // From targets
    else if (game.user.isGM) targets = this._tokensToTargets(getSelectedTokens());      // From selected tokens (only for the GM)
    else {                                                                          
      targets = this._noTargetVersion();                        // No targets (only for the Player)
      this.noTargetVersion = true;                              // We always want to show damage/healing for No Target version
    }                                         

    const displayedTargets = {};
    targets.forEach(target => {
      enhanceTarget(target, actionType, rolls.winningRoll, rolls.dmg, rolls.heal, defenceKey, halfDmgOnMiss, conditionals, impact, canCrit);
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
    const rollModNotSupported = (["check"]).includes(system.actionType); 
    const applicableStatuses = this._prepareApplicableStatuses();
    const contentData = {
      ...system,
      userIsGM: game.user.isGM,
      shouldShowDamage: shouldShowDamage,
      canUserModify: canUserModify,
      rollModNotSupported: rollModNotSupported,
      applicableStatuses: applicableStatuses
    };
    const templateSource = "systems/dc20rpg/templates/chat/roll-chat-message.hbs";
    return await renderTemplate(templateSource, contentData);
  }

  _prepareApplicableStatuses() {
    let failEffects = this.system.saveDetails?.failEffects;
    if (this.system.actionType === "contest") failEffects = this.system.checkDetails?.failEffects;
    if (!failEffects) return [];

    const applicableStatuses = [];
    failEffects.forEach(statusId => {
      const status = CONFIG.statusEffects.find(e => e.id === statusId);
      if (status) applicableStatuses.push({
        img: status.img,
        name: status.name,
        status: statusId
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
    html.find('.modify-roll').click(ev => this._onModifyRoll(datasetOf(ev).direction, datasetOf(ev).modified, datasetOf(ev).path));
    html.find('.apply-damage').click(ev => this._onApplyDamage(datasetOf(ev).target, datasetOf(ev).roll, datasetOf(ev).modified));
    html.find('.apply-healing').click(ev => this._onApplyHealing(datasetOf(ev).target, datasetOf(ev).roll, datasetOf(ev).modified));
    html.find('.apply-effect').click(ev => this._onApplyEffect(datasetOf(ev).effectUuid));
    html.find('.apply-full-effect').click(() => {
      const effect = this.system.fullEffect;
      if (!effect) return;
      
      const token = game.canvas.tokens.get(this.speaker.token);
      if (!token) return;
      
      const actor = token.actor;
      effectMacroHelper.toggleEffectOnActor(effect, actor)
    })
    html.find('.roll-save').click(ev => this._onSaveRoll(datasetOf(ev).target, datasetOf(ev).key, datasetOf(ev).dc));
    html.find('.roll-check').click(ev => this._onCheckRoll(datasetOf(ev).target, datasetOf(ev).key, datasetOf(ev).against));
    html.find('.apply-status').click(ev => this._onApplyStatus(datasetOf(ev).status));
    
    html.find('.revert-button').click(ev => {
      ev.stopPropagation();
      this._onRevert();
    });

    // Modify rolls
    html.find('.add-roll').click(async ev => {ev.stopPropagation(); await this._addRoll(datasetOf(ev).type)});
    html.find('.remove-roll').click(ev => {ev.stopPropagation(); this._removeRoll(datasetOf(ev).type)});
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

    Object.values(targets).forEach(target => {
      const actor = this._getActor(target);
      if (actor) effectMacroHelper.toggleEffectOnActor(effect, actor);
    });
  }

  _onApplyStatus(statusId) {
    const system = this.system;
    const targets = system.targets;
    if (Object.keys(targets).length === 0) return;

    Object.values(targets).forEach(target => {
      const actor = this._getActor(target);
      if (actor) addStatusWithIdToActor(actor, statusId);
    });
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

    if (!failEffects) failEffects = this.system.saveDetails?.failEffects;
    const details = prepareSaveDetailsFor(actor, key, dc, failEffects);
    this._rollAndUpdate(target, actor, details);
  }

  async _onCheckRoll(targetKey, key, against) {
    const system = this.system;
    const target = system.targets[targetKey];
    const actor = this._getActor(target);
    if (!actor) return;

    const failEffects = this.system.checkDetails?.failEffects;
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

    // Right now 1st roll is always a winner roll so we can repleace it simply
    // with our updated winner. In the future we might need to find which roll
    // is a winner.
    const boxRolls = this.system.chatFormattedRolls.box;
    boxRolls[0] = winner;

    // Determine new roll Level
    if (rollType === "adv") rollLevel--;
    if (rollType === "dis") rollLevel++;

    const updateData = {
      system: {
        rollLevel: rollLevel,
        ["chatFormattedRolls.winningRoll"]: winner,
        ["chatFormattedRolls.box"]: boxRolls
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
    winTotal: rolls.winningRoll?._total || 0,
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
  if (rolls.core) rolls.core.forEach(roll => array.push(roll));
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