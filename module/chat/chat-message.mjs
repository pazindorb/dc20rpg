import { rollFromSheet } from "../helpers/actors/rollsFromActor.mjs";
import { getSelectedTokens, tokenToTarget } from "../helpers/actors/tokens.mjs";
import { DC20RPG } from "../helpers/config.mjs";
import { effectMacroHelper } from "../helpers/effects.mjs";
import { datasetOf } from "../helpers/events.mjs";
import { emitSystemEvent, responseListener } from "../helpers/sockets.mjs";
import { generateKey, getLabelFromKey, getValueFromPath, setValueForPath } from "../helpers/utils.mjs";
import { enhanceTarget, prepareRollsInChatFormat } from "./chat-utils.mjs";

export class DC20ChatMessage extends ChatMessage {

  /** @overriden */
  prepareDerivedData() {
    super.prepareDerivedData();
    if (!this.system.hasTargets) return;

    // Initialize applyToTargets flag for the first time
    if (this.system.applyToTargets === undefined) {
      if (this.system.targetedTokens.length > 0) this.system.applyToTargets = true;
      else this.system.applyToTargets = false;
    }
    this._prepareDisplayedTargets();
  }

  _prepareDisplayedTargets() {
    this.noTargetVersion = false;
    const rolls = this.system.chatFormattedRolls;
    const actionType = this.system.actionType;
    const defenceKey = this.system.targetDefence;
    const halfDmgOnMiss = this.system.halfDmgOnMiss;
    const conditionals = this.system.conditionals;
    const impact = this.system.impact;

    let targets = [];
    if (this.system.applyToTargets) targets = this.system.targetedTokens;           // From targets
    else if (game.user.isGM) targets = this._tokensToTargets(getSelectedTokens());  // From selected tokens (only for the GM)
    else {                                                                          
      targets = this._noTargetVersion();                        // No targets (only for the Player)
      this.noTargetVersion = true;                              // We always want to show damage/healing for No Target version
    }                                         

    const displayedTargets = {};
    targets.forEach(target => {
      enhanceTarget(target, actionType, rolls.winningRoll, rolls.dmg, rolls.heal, defenceKey, halfDmgOnMiss, conditionals, impact);
      displayedTargets[target.id] = target;
    });
    this.system.targets = displayedTargets;
  }

  _tokensToTargets(tokens) {
    if (!tokens) return [];
    const targets = [];
    tokens.forEach(token => targets.push(tokenToTarget(token)))
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

    // Prepare content depending on messageType
    switch(this.system.messageType) {
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
    const contentData = {
      ...this.system,
      userIsGM: game.user.isGM
    }
    const templateSource = "systems/dc20rpg/templates/chat/damage-healing-taken-message.hbs";
    return await renderTemplate(templateSource, contentData);
  }

  async _rollAndDescription() {
    const shouldShowDamage = (game.user.isGM || this.system.showDamageForPlayers || this.noTargetVersion);
    const contentData = {
      ...this.system,
      userIsGM: game.user.isGM,
      shouldShowDamage: shouldShowDamage
    }
    const templateSource = "systems/dc20rpg/templates/chat/roll-chat-message.hbs";
    return await renderTemplate(templateSource, contentData);
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
    html.find('.roll-save').click(ev => this._onSaveRoll(datasetOf(ev).target, datasetOf(ev).key, datasetOf(ev).dc));
    html.find('.roll-check').click(ev => this._onCheckRoll(datasetOf(ev).target, datasetOf(ev).key, datasetOf(ev).against));
    
    html.find('.revert-button').click(ev => {
      ev.stopPropagation();
      this._onRevert();
    });
  }

  _onActivable(path) {
     let value = getValueFromPath(this, path);
     setValueForPath(this, path, !value);
     ui.chat.updateMessage(this);
  }

  _onTargetSelectionSwap() {
    if (this.system.targetedTokens.length === 0) return;
    this.system.applyToTargets = !this.system.applyToTargets;
    this._prepareDisplayedTargets();
    ui.chat.updateMessage(this);
  }

  _onApplyEffect(effectUuid) {
    const targets = this.system.targets;
    if (Object.keys(targets).length === 0) return;
    
    const effect = fromUuidSync(effectUuid);
    if (!effect) {
      console.warn(`Effect with uuid '${effectUuid}' couldn't be found`);
      return;
    }

    Object.values(targets).forEach(target => {
      const actor = this._getActor(target);
      if (actor) effectMacroHelper.toggleEffectOnActor(effect, actor);
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
    const dmgModified = modified === "true" ? "modified" : "clear";
    const target = this.system.targets[targetKey];
    const dmg = target.dmg[dmgKey][dmgModified];

    const actor = this._getActor(target);
    if (!actor) return;

    const health = actor.system.resources.health;
    const newValue = health.value - dmg.value;
    this._concentrationCheck(actor, dmg.value);
    actor.update({["system.resources.health.value"]: newValue});
    sendHealthChangeMessage(actor, dmg.value, dmg.source, "damage");
  }

  _onApplyHealing(targetKey, healKey, modified) {
    const healModified = modified === "true" ? "modified" : "clear";
    const target = this.system.targets[targetKey];
    const heal = target.heal[healKey][healModified];
    let sources = heal.source;

    const actor = this._getActor(target);
    if (!actor) return;

    const healType = heal.healType;
    const healAmount = heal.value;
    const health = actor.system.resources.health;

    if (healType === "heal") {
      const oldCurrent = health.current;
      let newCurrent = oldCurrent + healAmount;

      if (health.max <= newCurrent) {
        sources += ` -> (Overheal <b>${newCurrent - health.max}</b>)`;
        newCurrent = health.max;
      }
      actor.update({["system.resources.health.current"]: newCurrent});
      sendHealthChangeMessage(actor, newCurrent - oldCurrent, sources, "healing");
    }
    if (healType === "temporary") {
      // Temporary HP do not stack it overrides
      const oldTemp = health.temp || 0;
      if (oldTemp >= healAmount) {
        sources += ` -> (Current Temporary HP is higher)`;
        sendHealthChangeMessage(actor, 0, sources, "temporary");
        return;
      }
      else if (oldTemp > 0) {
        sources += ` -> (Adds ${oldTemp} to curent Temporary HP)`;
      }
      actor.update({["system.resources.health.temp"]: healAmount});
      sendHealthChangeMessage(actor, healAmount - oldTemp, sources, "temporary");
    }
  }

  _concentrationCheck(actor, damage) {
    if (!actor.statuses.has("concentration")) return;
    const dc = Math.max(10, (2*damage));
    const details = {
      roll: `d20 + @special.menSave`,
      label: `Concentration Save vs ${dc}`,
      rollTitle: "Concentration",
      type: "save",
      against: dc
    }
    rollFromSheet(actor, details);
  }

  async _onSaveRoll(targetKey, key, dc) {
    const target = this.system.targets[targetKey];
    const actor = this._getActor(target);
    if (!actor) return;

    let save = "";
    switch (key) {
      case "phy": 
        const migSave = actor.system.attributes.mig.save;
        const agiSave = actor.system.attributes.agi.save;
        save = migSave >= agiSave ? migSave : agiSave;
        break;
      
      case "men": 
        const intSave = actor.system.attributes.int.save;
        const chaSave = actor.system.attributes.cha.save;
        save = intSave >= chaSave ? intSave : chaSave;
        break;

      default:
        save = actor.system.attributes[key].save;
        break;
    }

    const details = {
      roll: `d20 + ${save}`,
      label: getLabelFromKey(key, DC20RPG.saveTypes) + " Save",
      type: "save",
      against: parseInt(dc)
    }
    this._rollAndUpdate(target, actor, details);
  }

  async _onCheckRoll(targetKey, key, against) {
    const target = this.system.targets[targetKey];
    const actor = this._getActor(target);
    if (!actor) return;

    if (["phy", "men", "mig", "agi", "int", "cha"].includes(key)) {
      this._onSaveRoll(targetKey, key, against);
      return;
    }
    let modifier = "";
    let rollType = "";
    switch (key) {
      case "att":
        modifier = actor.system.attackMod.value.martial;
        rollType = "attackCheck";
        break;

      case "spe":
        modifier = actor.system.attackMod.value.spell;
        rollType = "spellCheck";
        break;

      case "mar": 
        const acrModifier = actor.system.skills.acr.modifier;
        const athModifier = actor.system.skills.ath.modifier;
        modifier = acrModifier >= athModifier ? acrModifier : athModifier;
        rollType = "skillCheck";
        break;

      default:
        modifier = actor.system.skills[key].modifier;
        rollType = "skillCheck";
        break;
    } 

    const details = {
      roll: `d20 + ${modifier}`,
      label: getLabelFromKey(key, DC20RPG.checks),
      type: rollType,
      against: parseInt(against)
    }
    this._rollAndUpdate(target, actor, details);
  }

  async _rollAndUpdate(target, actor, details) {
    let roll = null;
    if (actor.type === "character") { 
      const rollPromise = responseListener("rollPromptResult", game.user.id);
      emitSystemEvent("rollPrompt", { actorId: actor.id, details: details});
      roll = await rollPromise;
    }
    else roll = await rollFromSheet(actor, details);

    if (!roll || !roll.hasOwnProperty("_total")) return;
    let rollOutcome = {
      success: "",
      label: ""
    }
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
    const type = this.system.messageType;
    const amount = this.system.amount;
    const uuid = this.system.actorUuid;

    const actor = fromUuidSync(uuid);
    if (!actor) return;

    const health = actor.system.resources.health;
    let newValue = health;
    if (type === "damage") newValue = health.value + amount;
    else newValue = health.value - amount;
    actor.update({["system.resources.health.value"]: newValue});
    this.delete();
  }
}

/**
 * Creates chat message for given rolls.
 * 
 * @param {Object} rolls        - Separated in 3 categories: coreRolls (Array of Rolls), formulaRolls (Array of Rolls), winningRoll (Roll).
 * @param {DC20RpgActor} actor  - Speaker.
 * @param {Object} details      - Informations about labels, descriptions and other details.
 */
export function sendRollsToChat(rolls, actor, details, hasTargets) {
  const rollsInChatFormat = prepareRollsInChatFormat(rolls);
  const targets = [];
  if (hasTargets) game.user.targets.forEach(token => targets.push(tokenToTarget(token)));

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
    system: system
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
  DC20ChatMessage.create({
    speaker: DC20ChatMessage.getSpeaker({ actor: actor }),
    sound: CONFIG.sounds.notification,
    system: {
      ...details,
      messageType: "description"
    }
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