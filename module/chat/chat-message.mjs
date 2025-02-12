import { promptRoll, promptRollToOtherPlayer } from "../dialogs/roll-prompt.mjs";
import DC20RpgMeasuredTemplate from "../placeable-objects/measuredTemplate.mjs";
import { prepareCheckDetailsFor, prepareSaveDetailsFor } from "../helpers/actors/attrAndSkills.mjs";
import { applyDamage, applyHealing } from "../helpers/actors/resources.mjs";
import { getActorFromIds, getSelectedTokens, getTokensInsideMeasurementTemplate } from "../helpers/actors/tokens.mjs";
import { createEffectOn, injectFormula } from "../helpers/effects.mjs";
import { datasetOf } from "../helpers/listenerEvents.mjs";
import { generateKey, getValueFromPath, setValueForPath } from "../helpers/utils.mjs";
import { addStatusWithIdToActor, doomedToggle, exhaustionToggle } from "../statusEffects/statusUtils.mjs";
import { enhanceOtherRolls, enhanceTarget, prepareRollsInChatFormat } from "./chat-utils.mjs";
import { getTokenSelector } from "../dialogs/token-selector.mjs";
import { evaluateFormula } from "../helpers/rolls.mjs";
import { clearHelpDice } from "../helpers/actors/actions.mjs";
import { runEventsFor } from "../helpers/actors/events.mjs";
import { emitSystemEvent } from "../helpers/sockets.mjs";
import { runTemporaryItemMacro } from "../helpers/macros.mjs";
import { targetToToken, tokenToTarget } from "../helpers/targets.mjs";

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
    const chatRolls = this.system.chatFormattedRolls;
    let winner = chatRolls.core;
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
    chatRolls.winningRoll = winner;
    this.system.coreRollTotal = winner._total;

    // If there were any "other" rolls we need to enhance those
    if (chatRolls?.other) enhanceOtherRolls(winner, chatRolls.other, this.system.checkDetails);
  }

  _prepareMeasurementTemplates() {
    const areas = this.system.areas;
    if (!areas) return;
    const measurementTemplates = DC20RpgMeasuredTemplate.mapItemAreasToMeasuredTemplates(areas);
    if (Object.keys(measurementTemplates).length > 0) {
      this.system.measurementTemplates = measurementTemplates;
    }
  }

  _prepareDisplayedTargets(startWrapped) {
    this.noTargetVersion = false;
    const system = this.system;
    const rolls = system.chatFormattedRolls;

    let targets = [];
    if (system.applyToTargets) targets = this._tokensToTargets(this._fetchTokens(system.targetedTokens));   // From targets
    else if (game.user.isGM) targets = this._tokensToTargets(getSelectedTokens());      // From selected tokens (only for the GM)
    else {                                                                          
      targets = this._noTargetVersion();                        // No targets (only for the Player)
      this.noTargetVersion = true;                              // We always want to show damage/healing for No Target version
    }                                         

    const displayedTargets = {};
    targets.forEach(target => {
      enhanceTarget(target, rolls, system);
      target.hideDetails = startWrapped;
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
      case "damage": case "healing": case "temporary": case "effectRemoval":
        this.content = await this._eventRevert();
        break;
      
      case "roll": case "description": 
        this.content = await this._rollAndDescription();
        break;
    }

    const html = await super.getHTML();
    this._activateListeners(html);        // Activete listeners on rendered template
    return html;
  }

  async _eventRevert() {
    const system = this.system;
    const contentData = {
      ...system,
      userIsGM: game.user.isGM
    };
    const templateSource = "systems/dc20rpg/templates/chat/event-revert-message.hbs";
    return await renderTemplate(templateSource, contentData);
  }

  async _rollAndDescription() {
    const system = this.system;
    const shouldShowDamage = (game.user.isGM || system.showDamageForPlayers || this.noTargetVersion);
    const canUserModify = this.canUserModify(game.user, "update");
    const applicableStatuses = this._prepareApplicableStatuses();
    const specialStatuses = this._prepareSpecialStatuses();

    const hasActionType = system.actionType ? true : false;
    const isHelpAction = system.actionType === "help";
    const userIsGM = game.user.isGM;
    const hasAnyEffectsToApply = system.applicableEffects?.length > 0 || applicableStatuses.length > 0 || specialStatuses.length > 0;
    const showEffectApplier = (userIsGM || hasAnyEffectsToApply || this._getNumberOfRollRequests()) && (hasActionType && !isHelpAction);
    
    const contentData = {
      ...system,
      userIsGM: userIsGM,
      shouldShowDamage: shouldShowDamage,
      canUserModify: canUserModify,
      applicableStatuses: applicableStatuses,
      specialStatuses: specialStatuses,
      hasAnyEffectsToApply: hasAnyEffectsToApply,
      showEffectApplier: showEffectApplier
    };
    const templateSource = "systems/dc20rpg/templates/chat/roll-chat-message.hbs";
    return await renderTemplate(templateSource, contentData);
  }

  _prepareApplicableStatuses() {
    const againstStatuses = this.system.againstStatuses;
    if (!againstStatuses) return [];

    const applicableStatuses = [];
    againstStatuses.forEach(againstStatus => {
      if (againstStatus.supressFromChatMessage) return;
      const status = CONFIG.statusEffects.find(e => e.id === againstStatus.id);
      if (status) applicableStatuses.push({
        img: status.img,
        name: status.name,
        status: againstStatus.id,
      })
    });
    return applicableStatuses;
  }

  _prepareSpecialStatuses() {
    const againstStatuses = this.system.againstStatuses;
    if (!againstStatuses) return [];

    const specialStatuses = [];
    againstStatuses.forEach(againstStatus => {
      if (againstStatus.supressFromChatMessage) return;
      if (againstStatus.id === "exhaustion") specialStatuses.push({
        id: "exhaustion",
        img: "icons/svg/unconscious.svg",
        name: game.i18n.localize("dc20rpg.conditions.exhaustion")
      });
      if (againstStatus.id === "doomed") specialStatuses.push({
        id: "doomed",
        img: "icons/svg/skull.svg",
        name: game.i18n.localize("dc20rpg.conditions.doomed")
      });
    });
    return specialStatuses;
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
    html.find('.wrap-target').click(ev => {
      const targetKey = datasetOf(ev).key;
      const targets = this.system.targets;
      if (targets) {
        const target = targets[targetKey];
        if (target) {
          target.hideDetails = !target.hideDetails
          ui.chat.updateMessage(this);
        }
      }
    })

    // Templates
    html.find('.create-template').click(ev => this._onCreateMeasuredTemplate(datasetOf(ev).key));
    html.find('.add-template-space').click(ev => this._onAddTemplateSpace(datasetOf(ev).key));
    html.find('.reduce-template-space').click(ev => this._onReduceTemplateSpace(datasetOf(ev).key));
    
    //Rolls
    html.find('.roll-save').click(ev => this._onSaveRoll(datasetOf(ev).target, datasetOf(ev).key, datasetOf(ev).dc, datasetOf(ev).selectedNow));
    html.find('.roll-check').click(ev => this._onCheckRoll(datasetOf(ev).target, datasetOf(ev).key, datasetOf(ev).against, datasetOf(ev).selectedNow));
    html.find('.roll-check-selected').click(ev => this._onCheckRollSelected(datasetOf(ev).key, datasetOf(ev).against));
    html.find('.roll-save-selected').click(ev => this._onSaveRollSelected(datasetOf(ev).key, datasetOf(ev).dc));

    // Appliers
    html.find('.apply-damage').mousedown(ev => this._onApplyDamage(datasetOf(ev).target, datasetOf(ev).roll, datasetOf(ev).modified, ev.which === 3));
    html.find('.apply-damage').contextmenu(ev => {ev.stopPropagation(); ev.preventDefault()});
    html.find('.apply-healing').click(ev => this._onApplyHealing(datasetOf(ev).target, datasetOf(ev).roll, datasetOf(ev).modified));
    html.find('.apply-effect').click(ev => this._onApplyEffect(datasetOf(ev).index, [datasetOf(ev).target], datasetOf(ev).selectedNow));
    html.find('.apply-effect-target-specific').click(ev => this._onApplyTargetSpecificEffect(datasetOf(ev).index, [datasetOf(ev).target]));
    html.find('.apply-status').click(ev => this._onApplyStatus(datasetOf(ev).status, [datasetOf(ev).target], datasetOf(ev).selectedNow));
    html.find('.toggle').click(ev => this._onToggle(datasetOf(ev).key, [datasetOf(ev).target], datasetOf(ev).selectedNow));

    // GM Menu
    html.find('.add-selected-to-targets').click(() => this._onAddSelectedToTargets());
    html.find('.remove-target').click(ev => this._removeFromTargets(ev))
    html.find('.target-confirm').click(() => this._onTargetConfirm());
    html.find('.apply-all').click(() => this._onApplyAll())
    html.find('.send-all-roll-requests').click(() => this._onSendRollAll())
    html.find('.apply-all-effects-fail').click(() => this._onApplyAllEffects(true));
    html.find('.apply-all-effects').click(() => this._onApplyAllEffects(false));
    html.find('.modify-roll').click(ev => this._onModifyRoll(datasetOf(ev).direction, datasetOf(ev).modified, datasetOf(ev).path));
    
    html.find('.revert-button').click(ev => {
      ev.stopPropagation();
      if (this.system.messageType === "effectRemoval") this._onRevertEffect();
      else this._onRevertHp();
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

  _onApplyEffect(index, targetIds, selectedNow) {
    const targets = this._getExpectedTargets(selectedNow);
    const effects = this.system.applicableEffects;
    if (Object.keys(targets).length === 0) return;
    
    const effect = effects[index];
    if (!effect) return;

    if (targetIds[0] === undefined) targetIds = [];
    // We dont want to modify original effect so we copy its data.
    const effectData = {...effect};
    this._replaceWithSpeakerId(effectData);
    const rollingActor = getActorFromIds(this.speaker.actor, this.speaker.token);
    injectFormula(effectData, rollingActor);
    Object.values(targets).forEach(target => {
      if (targetIds.length > 0 && !targetIds.includes(target.id)) return;
      const actor = this._getActor(target);
      if (actor) createEffectOn(effectData, actor);
    });
  }

  _onApplyTargetSpecificEffect(index, targetIds) {
    const targets = this._getExpectedTargets();
    if (Object.keys(targets).length === 0) return;
    if (targetIds[0] === undefined) targetIds = [];

    Object.values(targets).forEach(target => {
      if (targetIds.length > 0 && !targetIds.includes(target.id)) return;

      const actor = this._getActor(target);
      if (!actor) return;

      const effects = index === -1 ? target.effects : target.effects[index]
      for (const effectData of effects) {
        this._replaceWithSpeakerId(effectData);
        const rollingActor = getActorFromIds(this.speaker.actor, this.speaker.token);
        injectFormula(effectData, rollingActor);
        createEffectOn(effectData, actor);
      }
    });
  }

  _onApplyStatus(statusId, targetIds, selectedNow) {
    const targets = this._getExpectedTargets(selectedNow);
    if (Object.keys(targets).length === 0) return;

    if (targetIds[0] === undefined) targetIds = [];
    const againstStatus = this.system.againstStatuses.find(eff => eff.id === statusId);
    const extras = {...againstStatus, actorId: this.speaker.actor, ...this._repeatedSaveExtras()};
    Object.values(targets).forEach(target => {
      if (targetIds.length > 0 && !targetIds.includes(target.id)) return;
      const actor = this._getActor(target);
      if (actor) addStatusWithIdToActor(actor, statusId, extras);
    });
  }

  _repeatedSaveExtras() {
    const rollingActor = getActorFromIds(this.speaker.actor, this.speaker.token);
    const saveDC = rollingActor.system.saveDC.value;
    return {
      against: Math.max(saveDC.spell, saveDC.martial),
    }
  }

  _replaceWithSpeakerId(effect) {
    for (let i = 0; i < effect.changes.length; i++) {
      let changeValue = effect.changes[i].value;
      if (changeValue.includes("#SPEAKER_ID#")) {
        effect.changes[i].value = changeValue.replaceAll("#SPEAKER_ID#", this.speaker.actor);
      }
    }
  }

  _onToggle(key, targetIds, selectedNow) {
    const targets = this._getExpectedTargets(selectedNow);
    if (Object.keys(targets).length === 0) return;
    
    if (targetIds[0] === undefined) targetIds = [];
    Object.values(targets).forEach(target => {
      if (targetIds.length > 0 && !targetIds.includes(target.id)) return;
      const actor = this._getActor(target);
      if (key === "exhaustion") exhaustionToggle(actor, true);
      if (key === "doomed") doomedToggle(actor, true);
    });
  }

  _getExpectedTargets(selectedNow) {
    if (selectedNow !== "true") return this.system.targets; 
    const targets = {};
    this._tokensToTargets(getSelectedTokens()).forEach(target => targets[target.id] = target);
    return targets;
  }

  _onCheckRollSelected(key, against) {
    const targets = this._getExpectedTargets("true");
    Object.values(targets).forEach(target => this._onCheckRoll(target, key, against))
  }

  _onSaveRollSelected(key, dc) {
    const targets = this._getExpectedTargets("true");
    Object.values(targets).forEach(target => this._onSaveRoll(target, key, dc))
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

  _onSendRollAll() {
    const targets = this.system.targets;
    if (!targets) return;
    const numberOfRequests = this._getNumberOfRollRequests();
    if (numberOfRequests === 0) return;
    const rollRequests = this.system.rollRequests;

    if (numberOfRequests > 1) {
      ui.notifications.warn("There is more that one Roll Request. Cannot send automatic Request.");
      return;
    }

    Object.entries(targets).forEach(([targetKey, target]) => {
      if (rollRequests.saves) {
        Object.values(rollRequests.saves).forEach(save => this._onSaveRoll(targetKey, save.saveKey, save.dc))
      }
      if (rollRequests.contests) {
        Object.values(rollRequests.contests).forEach(contest => this._onCheckRoll(targetKey, contest.contestedKey, this.system.coreRollTotal))
      }
    });
  }

  _getNumberOfRollRequests() {
    const rollRequests = this.system.rollRequests;
    if (!rollRequests) return 0;

    const numberOfSaves = Object.keys(rollRequests.saves).length;
    const numberOfContests = Object.keys(rollRequests.contests).length;
    const numberOfRequests = numberOfSaves + numberOfContests;
    return numberOfRequests;
  }

  _onApplyAllEffects(failOnly) {
    const targetIds = [];
    if (failOnly) {
      const targets = this.system.targets;
      if (targets) {
        Object.values(targets).forEach(target => {
          const outcome = target.rollOutcome;
          if (outcome !== undefined && !outcome.success) {
            targetIds.push(target.id);
          }
        })
        // By default we check all targets if there is no Ids but
        // in this case we want to check none so we need to send any Id
        if (targetIds.length === 0) targetIds.push("NONE");
      }
    }
    // Apply Effects
    for (let i = 0; i < this.system.applicableEffects?.length || 0; i++) {
      this._onApplyEffect(i, targetIds);
    }
    this._onApplyTargetSpecificEffect(-1, targetIds);
    // Apply Statuses
    for (const status of this.system.againstStatuses) {
      if (["doomed", "exhaustion"].includes(status.id)) this._onToggle(status.id, targetIds);
      else this._onApplyStatus(status.id, targetIds);
    }
  }

  async _removeFromTargets(event) {
    event.stopPropagation();
    event.preventDefault();
    const targetKey = datasetOf(event).key
    const newTargets = [];
    let applyToTargets = true;
    this.system.targetedTokens.forEach(target => {if (target !== targetKey) newTargets.push(target)});

    if (newTargets.length === 0) applyToTargets = false;
    await this.update({
      ["system.targetedTokens"]: newTargets,
      ["system.applyToTargets"]: applyToTargets,
    });
  }

  async _onAddSelectedToTargets() {
    const selected = getSelectedTokens().map(token => token.id);
    let applyToTargets = true;

    const newTargets = [...this.system.targetedTokens, ...selected];
    if (newTargets.length === 0) applyToTargets = false;
    await this.update({
      ["system.targetedTokens"]: newTargets,
      ["system.applyToTargets"]: applyToTargets,
    });
  }

  _onTargetConfirm() {
    const targets = this.system.targets;
    if (!targets) return;
    
    Object.values(targets).forEach(target => {
      const token = targetToToken(target);
      if (token) runEventsFor("targetConfirm", token.actor, {triggerOnlyForId: this.speaker.actor});
    });
  }

  async _onCreateMeasuredTemplate(key) {
    const template = this.system.measurementTemplates[key];
    if (!template) return;

    const measuredTemplates = await DC20RpgMeasuredTemplate.createMeasuredTemplates(template, () => ui.chat.updateMessage(this));
    let tokens = {};
    for (let i = 0; i < measuredTemplates.length; i++) {
      const collectedTokens = getTokensInsideMeasurementTemplate(measuredTemplates[i]);
      tokens = {
        ...tokens,
        ...collectedTokens
      }
    }
    
    if (Object.keys(tokens).length > 0) tokens = await getTokenSelector(tokens);
    if (Object.keys(tokens).length > 0) {
      const newTargets = Object.keys(tokens);
      await this.update({
        ["system.targetedTokens"]: newTargets,
        ["system.applyToTargets"]: true,
      });
    }
  }

  _onAddTemplateSpace(key) {
    const template = this.system.measurementTemplates[key];
    if (!template) return;
    DC20RpgMeasuredTemplate.changeTemplateSpaces(template, 1);
    ui.chat.updateMessage(this);
  }

  _onReduceTemplateSpace(key) {
    const template = this.system.measurementTemplates[key];
    if (!template) return;
    DC20RpgMeasuredTemplate.changeTemplateSpaces(template, -1);
    ui.chat.updateMessage(this);
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

  async _onApplyDamage(targetKey, dmgKey, modified, half) {
    const system = this.system;
    const target = system.targets[targetKey];
    const actor = this._getActor(target);
    if (!actor) return;

    const dmgModified = (modified === "true" || modified === true) ? "modified" : "clear";
    const dmg = target.dmg[dmgKey][dmgModified];
    const finalDmg = half ? {source: dmg.source + " - Half Damage", value: Math.ceil(dmg.value/2), type: dmg.type} : dmg;
    await applyDamage(actor, finalDmg);
  }

  async _onApplyHealing(targetKey, healKey, modified) {
    const system = this.system;
    const target = system.targets[targetKey];
    const actor = this._getActor(target);
    if (!actor) return;

    const healModified = modified === "true" ? "modified" : "clear";
    const heal = target.heal[healKey][healModified];
    
    // Check if should allow for overheal
    const rollingActor = getActorFromIds(this.speaker.actor, this.speaker.token);
    heal.allowOverheal = rollingActor.system.globalModifier.allow.overheal;
    await applyHealing(actor, heal);
  }

  async _onSaveRoll(targetKey, key, dc, againstStatuses) {
    const system = this.system;
    const target = typeof targetKey === 'string' ? system.targets[targetKey] : targetKey;
    const actor = this._getActor(target);
    if (!actor) return;

    if (!againstStatuses) againstStatuses = this.system.againstStatuses;
    const details = prepareSaveDetailsFor(key, dc, againstStatuses);
    this._rollAndUpdate(target, actor, details);
  }

  async _onCheckRoll(targetKey, key, against) {
    const system = this.system;
    const target = typeof targetKey === 'string' ? system.targets[targetKey] : targetKey;
    const actor = this._getActor(target);
    if (!actor) return;

    const againstStatuses = this.system.againstStatuses;
    if (["phy", "men", "mig", "agi", "int", "cha"].includes(key)) {
      this._onSaveRoll(targetKey, key, against, againstStatuses);
      return;
    }
    const details = prepareCheckDetailsFor(key, against, againstStatuses);
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

  _getActor(target) { // TODO move it to usage getActorFromIds
    if (!target) return;
    const token = game.canvas.tokens.get(target.id);
    if (!token) return;
    const actor = token.actor;
    return actor;
  }

  _onRevertHp() {
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

  _onRevertEffect() {
    const system = this.system;
    const effectData = system.effect;

    const uuid = system.actorUuid;
    const actor = fromUuidSync(uuid);
    if (!actor) return;

    createEffectOn(effectData, actor);
    this.delete();
  }

  async modifyCoreRoll(formula, modifyingActor, updateInfoMessage) {
    const coreRoll = this.system.chatFormattedRolls?.core;
    if (!coreRoll) return false;

    const rollData = modifyingActor ? modifyingActor.getRollData() : {}
    const roll = await evaluateFormula(formula, rollData);

    // Add new roll to core roll
    coreRoll._formula += ` + (${formula})`;
    coreRoll._total += roll.total;
    coreRoll.terms.push(...roll.terms);

    // Add new roll to extra rolls
    const extraRolls = this.system.extraRolls;
    if (extraRolls) {
      for (const extra of extraRolls) {
        extra._formula += ` + (${formula})`;
        extra._total += roll.total;
        extra.terms.push(...roll.terms);
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

    if (this.canUserModify(game.user, "update")) {
      await this.update(updateData);
    }
    else {
      const activeGM = game.users.activeGM;
      if (!activeGM) {
        ui.notifications.error("There needs to be an active GM to proceed with that operation");
        return false;
      }
      emitSystemEvent("addHelpDiceToRoll", {
        messageId: this.id, 
        gmUserId: activeGM.id, 
        updateData: updateData
      });
    }

    if (updateInfoMessage) {
      if (!modifyingActor) {
        modifyingActor = getActorFromIds(this.speaker.actor, this.speaker.token);
      }
      sendDescriptionToChat(modifyingActor, {
        description: `${updateInfoMessage} (with value: ${roll.total})`,
        rollTitle: `${this.system.rollTitle} ${game.i18n.localize("dc20rpg.chat.wasModified")}`,
        image: modifyingActor.img
      })
    }
    return true;
  } 

  async _addHelpDiceToRoll(helpDice) {
    const actorId = helpDice.actorId;
    const tokenId = helpDice.tokenId;
    const helpDiceOwner = getActorFromIds(actorId, tokenId);
    if (!helpDiceOwner) return;

    const messageTitle = helpDice.customTitle || game.i18n.localize("dc20rpg.sheet.help.help");
    const success = await this.modifyCoreRoll(helpDice.formula, helpDiceOwner, messageTitle);
    if (success) await clearHelpDice(helpDiceOwner, helpDice.key);
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
    if (!valueOnDice) return;
    
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
      return highest?.result;
    }

    // Get lowest
    if (rollType === "dis") {
      let lowest = d20Dices[0];
      for(let i = 1; i < d20Dices.length; i++) {
        if (d20Dices[i].result < lowest.result) lowest = d20Dices[i];
      }
      return lowest?.result;
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
export async function sendRollsToChat(rolls, actor, details, hasTargets, item) {
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

  const message = await DC20ChatMessage.create({
    speaker: DC20ChatMessage.getSpeaker({ actor: actor }),
    rollMode: game.settings.get('core', 'rollMode'),
    rolls: _rollsObjectToArray(rolls),
    sound: CONFIG.sounds.dice,
    system: system,
    flags: {dc20rpg: {itemId: item?.id}}
  });
  if (item) await runTemporaryItemMacro(item, "postChatMessageCreated", actor, {chatMessage: message});
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

export async function sendDescriptionToChat(actor, details, item) {
  const system = {
      ...details,
      messageType: "description"
  };
  const message = await DC20ChatMessage.create({
    speaker: DC20ChatMessage.getSpeaker({ actor: actor }),
    sound: CONFIG.sounds.notification,
    system: system,
    flags: {dc20rpg: {itemId: item?.id}}
  });
  if (item) await runTemporaryItemMacro(item, "postChatMessageCreated", actor, {chatMessage: message});
}

export function sendHealthChangeMessage(actor, amount, source, messageType) {
  const gmOnly = !game.settings.get("dc20rpg", "showEventChatMessage");
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

export function sendEffectRemovedMessage(actor, effect) {
  const gmOnly = !game.settings.get("dc20rpg", "showEventChatMessage");
  const system = {
    actorName: actor.name,
    image: actor.img,
    actorUuid: actor.uuid,
    effectImg: effect.img,
    messageType: "effectRemoval",
    source: `${effect.name} ${game.i18n.localize('dc20rpg.chat.effectRemovalDesc')} ${actor.name}`,
    effect: effect.toObject()
  };

  DC20ChatMessage.create({
    speaker: DC20ChatMessage.getSpeaker({ actor: actor }),
    sound: CONFIG.sounds.notification,
    system: system,
    whisper: gmOnly ? DC20ChatMessage.getWhisperRecipients("GM") : []
  });
}