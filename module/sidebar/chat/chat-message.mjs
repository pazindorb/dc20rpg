import { getActorFromIds, getTokensInsideMeasurementTemplate } from "../../helpers/actors/tokens.mjs";
import { getMesuredTemplateEffects, injectFormula } from "../../helpers/effects.mjs";
import { datasetOf } from "../../helpers/listenerEvents.mjs";
import { TokenSelector } from "../../dialogs/token-selector.mjs";
import { evaluateFormula } from "../../helpers/rolls.mjs";
import { runEventsFor, triggerOnlyForIdFilter } from "../../helpers/actors/events.mjs";
import { emitSystemEvent } from "../../helpers/sockets.mjs";
import { runTemporaryItemMacro } from "../../helpers/macros.mjs";
import { SimplePopup } from "../../dialogs/simple-popup.mjs";
import { DC20Roll } from "../../roll/rollApi.mjs";
import DC20RpgActiveEffect from "../../documents/activeEffect.mjs";
import { DC20Target } from "../../subsystems/target/target.mjs";
import DC20RpgMeasuredTemplate from "../../placeable-objects/measuredTemplate.mjs";

export class DC20ChatMessage extends ChatMessage {

  #DESCRIPTION_TEMPLATE = "systems/dc20rpg/templates/chat/description-message.hbs";
  #ROLL_TEMPLATE = "systems/dc20rpg/templates/chat/roll-chat-message.hbs";
  #EVENT_TEMPLATE = "systems/dc20rpg/templates/chat/event-revert-message.hbs"

  static async rollMessage(rolls, systemData, actor, options={}) {
    return await this.#createChatMessage("roll", systemData, actor, options, rolls);
  }

  static async descriptionMessage(systemData, actor, options={}) {
    return await this.#createChatMessage("description", systemData, actor, options);
  }

  static async hpChangeMessage(amount, source, actor, options={}) {
    const showEventChatMessage = game.settings.get("dc20rpg", "showEventChatMessage");
    if (showEventChatMessage === "none") return;

    const eventType = amount > 0 ? "healing" : "damage";
    const systemData = {
      amount: Math.abs(amount),
      source: source,
      actorName: actor.name,
      image: actor.img,
      actorUuid: actor.uuid,
      eventType: eventType,
      messageType: "event"
    }

    options.gmOnly = showEventChatMessage === "gm";
    return await this.#createChatMessage("event", systemData, actor, options);
  }

  static async effectRemovalMessage(effect, actor, options={}) {
    const showEventChatMessage = game.settings.get("dc20rpg", "showEventChatMessage");
    if (showEventChatMessage === "none") return;

    const systemData = {
      source: `${effect.name} ${game.i18n.localize('dc20rpg.chat.effectRemovalDesc')} ${actor.name}`,
      effectImg: effect.img,
      effect: effect.toObject(),
      actorName: actor.name,
      image: actor.img,
      actorUuid: actor.uuid,
      eventType: "effectRemoval",
      messageType: "event"
    }
   
    options.gmOnly = showEventChatMessage === "gm";
    return await this.#createChatMessage("event", systemData, actor, options);
  }

  static async #createChatMessage(messageType, systemData, actor, options={}, rolls) {
    const item = options.item;

    // Prepare flags
    const flags = {
      creationTime: {
        round: game.combats?.active?.round || 0,
        turn: game.combats?.active?.turn || 0
      }
    };

    // Prepare system
    const system = {
      ...systemData,
      messageType: messageType,
    }
    if (systemData.areas) system.measurementTemplates = DC20RpgMeasuredTemplate.mapItemAreasToMeasuredTemplates(systemData.areas);

    if (messageType === "roll") {
      const [coreRoll, formulas] = this.#rollsInChatFormat(rolls);
      const targeted = game.user.targets.filter(token => token.actor).map(token => token.id);
      coreRoll.mainRoll = true;
      system.targeted = Array.from(targeted);
      system.coreRoll = coreRoll;
      system.formulas = formulas;
    }

    if (item) {
      flags.itemId = item.id;
      system.itemRoll = true;
    }
    else {
      system.sheetRoll = true;
      system.statuses = [];
      system.effects = [];
      system.rollRequests = {saves: {}, contests: {}} 
    }

    // Create chat message
    let data = {
      speaker: DC20ChatMessage.getSpeaker({ actor: actor }),
      sound: CONFIG.sounds.notification,
      flags: {dc20rpg: flags},
      system: system,
      whisper: options.gmOnly ? DC20ChatMessage.getWhisperRecipients("GM") : []
    }
    if (messageType === "roll") {
      data.rolls = this.#rollsObjectToArray(rolls),
      data.sound = CONFIG.sounds.dice
    }
    data = DC20ChatMessage.applyRollMode(data, options.rollMode || "roll");

    const message = await DC20ChatMessage.create(data, options);
    if (item) await runTemporaryItemMacro(item, "postChatMessageCreated", actor, {chatMessage: message});
    return message;
  }

  static #rollsInChatFormat(rolls) {
    const coreRoll = rolls.core ? this.#toChatFormat(rolls.core) : null;
    const formulas = [];

    if (rolls.formula) {
      rolls.formula.forEach(roll => {
        const formula = {
          clear: this.#toChatFormat(roll.clear),
          modified: this.#toChatFormat(roll.modified),
        }
        formulas.push(formula);
      });
    }

    return [coreRoll, formulas];
  }

  static #toChatFormat(roll) {
    const chatFormat = {...roll};
    chatFormat.dice = chatFormat._dice;
    chatFormat.formula = chatFormat._formula;
    chatFormat.total = chatFormat._total;
    delete chatFormat._total;
    delete chatFormat._formula;
    delete chatFormat._dice;
    return chatFormat;
  }

  static #rollsObjectToArray(rolls) {
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

  constructor(data={}, options={}) {
    super(data, options);

    if (Object.keys(this.system).length === 0) {
      this.baseMessage = true;
      return;
    }

    if (this.system.messageType === "roll") {
      this.hideCalculationsFromPlayers = game.settings.get("dc20rpg", "hideCalculationsFromPlayers");
      const fallback = game.user.isGM ? "selected" : "dummy";
      this.targetTab = foundry.utils.isEmpty(this.system.targeted) ? fallback : "target";
      this.shareFormula = false;
      this.#collectTargets();
    }

  }

  #collectTargets() {
    this.targets = {};
    switch (this.targetTab) {
      case "target":
        const targeted = new Set(this.system.targeted);
        if (canvas.tokens) canvas.tokens.placeables.forEach(token => {
          if (!targeted.has(token.id)) return;
          const target = DC20Target.fromToken(token);
          this.targets[target.targetHash] = target;
        })
        break;

      case "selected": 
        if (canvas.tokens) canvas.tokens.placeables.forEach(token => {
          if (token.controlled !== true) return;
          const target = DC20Target.fromToken(token);
          this.targets[target.targetHash] = target;
        });
        break;

      case "dummy": 
        this.targets["dummy"] = DC20Target.dummyTarget({name: "Dummy"});
    }

    Object.values(this.targets).forEach(target => this.#addDataToTarget(target));
  }

  #refreshTargets() {
    this.#collectTargets();
    ui.chat.updateMessage(this);
  }

  #addDataToTarget(target) {
    target.setTargetModifiers(this.system.targetModifiers);

    for (const formula of this.system.formulas) {
      switch (formula.modified.category) {
        case "damage":
          target.addDamageRoll(formula); break;
        case "healing": 
          target.addHealingRoll(formula); break;
        case "other":
          target.addOtherRoll(formula); break;
      }
    }
  }

  //====================================
  //=           PREPARE DATA           =
  //====================================
  /** @overriden */
  async #prepareRollData(options={}) {
    this.#prepareCoreRoll();
    this.#prepareOtherRoll();
    this.#prepareStatuses(this.system.statuses);

    if (this.targets && !options.skipTargetPreparation) {
      for (const target of Object.values(this.targets)) await this.#prepareTarget(target);
    }
  }

  #prepareCoreRoll() {
    const rollLevel = this.system.rollLevel;
    const coreRoll = this.system.coreRoll;
    const extraRolls = this.system.extraRolls;
    let winner = coreRoll;
    
    // Check if any extra roll should repleace winner
    if (extraRolls) {
      winner.ignored = true;
      for (const roll of extraRolls) {
        roll.ignored = true;
        if (rollLevel > 0 && roll.total > winner.total) winner = roll;
        if (rollLevel <= 0 && roll.total < winner.total) winner = roll;
      }
    }

    winner.ignored = false;
    this.winningRoll = winner;
  }

  #prepareOtherRoll() {
    this.otherRolls = this.system.formulas
      .filter(formula => formula.modified.category === "other" && !formula.modified.perTarget)
      .map(formula => {
        formula = foundry.utils.deepClone(formula.modified);
        formula = this.#checkDcModifications(formula);
        return formula;
      });
  }

  #checkDcModifications(formula) {
    if (this.system.checkDC == null) return formula;

    const degree = Math.floor((this.winningRoll.total - this.system.checkDC)/5);
    if (degree < 0 && formula.failValue != null) {
      formula.modifierSources = formula.modifierSources.replace("Base Value", "[Check Failed]");
      formula.total = formula.failValue;
    }
    if (degree > 0 && formula.each5Value != null) {
      formula.modifierSources = formula.modifierSources.replace("Base Value", `[Check succeed over ${(degree * 5)}]`);
      formula.total += (degree * formula.each5Value);
    }
    return formula;
  }

  #prepareStatuses(statuses) {
    for (const status of statuses) {
      const statusData = CONFIG.statusEffects.find(s => s.id === status.id);
      if (!statusData || status.supressFromChatMessage) {
        status.display = false;
        continue;
      }

      status.display = true;
      status.img = statusData.img;
      status.name = statusData.name;
    }
  }

  async #prepareTarget(target) {
    const roll = this.winningRoll;
    target.setCoreRollValue(roll.total);

    const targetRollStore = this.system.targetRollStore;
    const cached = targetRollStore?.[target.targetHash];
    if (cached) {
      target.setTargetRollValue(cached.roll);
      target.setContestDC(cached.contestDC);
    }

    const calcData = {
      isCrit: roll.crit,
      isCritMiss: roll.fail,
      canCrit: this.system.canCrit,
      skipFor: this.system?.skipBonusDamage || {/** Add conditional flag for every roll? */},
    }
    if (this.shareFormula) calcData.divideBy = Object.values(this.targets).length;

    switch (this.system.actionType) {
      case "attack":
        calcData.defenceKey = this.system.targetDefence;
        await target.calculateAttack(calcData);
        break;

      case "check":
        calcData.checkDC = this.system.checkDC;
        await target.calculateCheck(calcData);
        break;

      default: 
        await target.calculateOtherFormulas(calcData);
        await target.calculateDamage(calcData);
        await target.calculateHealing(calcData);
    }

    const targetSpecificEffects = await target.getTargetSpecificEffects(calcData);
    target.effects = [...this.system.effects, ...targetSpecificEffects];

    const targetSpecificStatuses = await target.getTargetSpecificStatuses(calcData);
    this.#prepareStatuses(targetSpecificStatuses)
    target.statuses = [...this.system.statuses, ...targetSpecificStatuses];

    target.rollRequests = this.#mergeRollRequests(await target.getTargetSpecificRollRequests(calcData));
  }

  #mergeRollRequests(targetSpecific) {
    const saves = {
      ...this.system.rollRequests.saves,
      ...targetSpecific.saves
    }
    const contests = {
      ...this.system.rollRequests.contests,
      ...targetSpecific.contests
    }
    return {saves: saves, contests: contests};
  }

  //====================================
  //=          RENDER MESSAGE          =
  //====================================
  /** @overriden */
  async renderHTML(options) {
    if (this.skipTargetPreparation) {
      this.skipTargetPreparation = false;
      options.skipTargetPreparation = true;
    }

    // We dont want "someone rolled privately" messages.
    if (!this.isContentVisible) return "";

    switch(this.system.messageType) {
      case "event":
        this.content = await this.#renderEventMessageContent();
        break;

      case "roll": 
        await this.#prepareRollData(options);
        this.content = await this.#renderRollMessageContent();
        break;

      case "description": 
        this.content = await this.#renderDescriptionMessageContent();
        break;
    }
    const element = await super.renderHTML(options);

    const colorTheme = game.settings.get("core", "uiConfig").colorScheme.interface;
    element.classList.add("themed");
    element.classList.add(`theme-${colorTheme}`);
    if (this.baseMessage && this.rolls.length > 0) {
      element.querySelector(".dice-roll").classList.add("default-roll-message");
    }

    // Add padding to default text messages
    if (!this.content.startsWith('<div class="chat_v2">')) element.children[1].style="padding: 7px 10px;"

    this.#activateListeners($(element));
    return element;
  }

  async #renderRollMessageContent() {
    const context = foundry.utils.deepClone(this.system);
    context.rollTitle = this.system.name;
    context.targets = this.targets;
    context.winningRoll = this.winningRoll;
    context.otherRolls = this.otherRolls;
    context.itemRoll = this.system.itemRoll;
    
    context.canUserModify = this.canUserModify(game.user, "update");
    context.shouldShowDamage = (game.user.isGM || !this.hideCalculationsFromPlayers || this.targetTab === "dummy")
    context.userIsGM = game.user.isGM
    context.dummyTarget = !!this.targets.dummy;
    context.targetTab = this.targetTab;
    context.shareFormula = this.shareFormula;
    return await foundry.applications.handlebars.renderTemplate(this.#ROLL_TEMPLATE, context);
  }

  async #renderDescriptionMessageContent() {
    const context = foundry.utils.deepClone(this.system);
    return await foundry.applications.handlebars.renderTemplate(this.#DESCRIPTION_TEMPLATE, context);
  }

  async #renderEventMessageContent() {
    const context = foundry.utils.deepClone(this.system);
    context.userIsGM = game.user.isGM
    return await foundry.applications.handlebars.renderTemplate(this.#EVENT_TEMPLATE, context);
  }

  //===============================
  //=           METHODS           = 
  //===============================
  async modifyCoreRoll(formula, updateMessage) {
    const coreRoll = this.system.coreRoll;
    if (!coreRoll) return false;

    const roll = await evaluateFormula(formula, {});

    // Add new roll to core roll
    if (updateMessage) coreRoll.source += ` + (${updateMessage})`
    coreRoll.formula += ` + (${formula})`;
    coreRoll.total += roll.total;
    coreRoll.terms.push(...roll.terms);

    // Add new roll to extra rolls
    const extraRolls = this.system.extraRolls;
    if (extraRolls) {
      for (const extra of extraRolls) {
        if (updateMessage) extra.source += ` + (${updateMessage})`
        extra.formula += ` + (${formula})`;
        extra.total += roll.total;
        extra.terms.push(...roll.terms);
      }
    }

    const updateData = {
      system: {
        coreRoll: coreRoll,
        extraRolls: extraRolls
      }
    }
    await this.gmUpdate(updateData);
    if (updateMessage) ui.notifications.notify(`${updateMessage} (with value: ${roll.total})`);
    return true;
  }

  async addTokensToTargets(tokens) {
    const targeted = this.system.targeted;
    for (const token of tokens) targeted.push(token.id);
    this.gmUpdate({["system.targeted"]: targeted});
  }

  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (changed.system?.targeted) {
      const targeted = changed.system.targeted;
      const fallback = game.user.isGM ? "selected" : "dummy";
      if (targeted.length > 0) this.targetTab = "target";
      if (targeted.length === 0) this.targetTab = fallback;

      this.#refreshTargets();
    }
  }

  async gmUpdate(data={}, operation) {
    if (this.canUserModify(game.user, "update")) {
      await this.update(data);
    }
    else {
      const activeGM = game.users.activeGM;
      if (!activeGM) {
        ui.notifications.error("There needs to be an active GM to proceed with that operation");
        return false;
      }
      emitSystemEvent("UPDATE_CHAT_MESSAGE", {
        messageId: this.id, 
        gmUserId: activeGM.id, 
        updateData: data
      });
    }
  }

  //===============================
  //=           ACTIONS           = 
  //===============================
  #activateListeners(html) {
    // Show/Hide description
    html.find('.desc-expand-row').click(ev => {
      ev.preventDefault();
      const description = ev.target.closest(".chat_v2").querySelector(".expandable-row");
      if(description) description.classList.toggle('expand');
    });

    // Modify rolls
    html.find('.add-roll').click(async ev => {ev.stopPropagation(); this.#onAddRoll(datasetOf(ev).type)});
    html.find('.remove-roll').click(ev => {ev.stopPropagation(); this.#onRemoveRoll(datasetOf(ev).type)});
    html.find('.modify-core-roll').click(ev => {ev.stopPropagation(); this.#onModifyCoreRoll()});

    // Templates
    html.find('.create-template').click(ev => this.#onCreateMeasuredTemplate(datasetOf(ev).key));
    html.find('.add-template-space').click(ev => this.#onAddTemplateSpace(datasetOf(ev).key));
    html.find('.reduce-template-space').click(ev => this.#onReduceTemplateSpace(datasetOf(ev).key));

    // Targets
    html.find('.tab-selection').click(ev => this.#onTargetSelectionSwap(datasetOf(ev).tab));
    html.find('.refresh-targets').click(() => this.#refreshTargets());
    html.find('.remove-target').click(ev => this.#onRemoveTarget(datasetOf(ev).targetHash));
    html.find('.wrap-target').click(ev => this.#onWrapTarget(datasetOf(ev).targetHash));
    
    html.find('.use-modified').click(ev => this.#onUseModifiedChange(datasetOf(ev)));
    html.find('.modify-formula').click(ev => this.#onModifyFormula(datasetOf(ev)));
    html.find('.apply-formula').click(ev => this.#onApplyFormula(datasetOf(ev)));

    html.find('.roll-request').click(ev => this.#onRollRequest(datasetOf(ev)));
    html.find('.apply-effect').click(ev => this.#onApplyEffect(datasetOf(ev)));
    html.find('.apply-status').click(ev => this.#onApplyStatus(datasetOf(ev)));

    // GM Menu
    html.find('.share-formula').click(() => this.#onShareFormula());
    html.find('.apply-all').click(() => this.#onGmApplyFormulas());
    html.find('.send-all-roll-requests').click(() => this.#onGmRollRequest());
    html.find('.target-confirm').click(() => this.#onGmTargetConfirm())
    html.find('.apply-all-effects-fail').click(() => this.#onGmApplyEffectAndStatus(true));
    html.find('.apply-all-effects').click(() => this.#onGmApplyEffectAndStatus(false));
    html.find('.add-selected-to-targets').click(() => this.#onAddSelectedToTargets());

    // Event Message
    html.find('.revert-button').click(() => this.#onRevertButton());

    // Drag and drop
    html[0].addEventListener('dragover', ev => ev.preventDefault());
    html[0].addEventListener('drop', async ev => await this._onDrop(ev));
  }

  //===============================
  //=    CORE ROLL MANIPULATION   =
  //===============================
  async #onAddRoll(rollType) {
    const coreRoll = this.system.coreRoll;
    if (!coreRoll) return;

    // We need to make sure that user is not rolling to fast, because it can cause roll level bug
    if (this.rollInProgress) return;
    this.rollInProgress = true;

    // Advantage/Disadvantage is only a d20 roll
    const d20Roll = await new Roll("d20", null).evaluate(); 
    // Making Dice so Nice display that roll
    if (game.dice3d) await game.dice3d.showForRoll(d20Roll, this.user, true, null, false);

    // Now we want to make some changes to duplicated roll to match how our rolls look like
    const newRoll = this.#mergeExtraRoll(d20Roll, coreRoll, "d20");
    newRoll.mainRoll = false;
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
    await this.gmUpdate(updateData);
    this.rollInProgress = false;
  }

  #mergeExtraRoll(d20Roll, oldRoll, d20RollFormula) {
    const dice = d20Roll.terms[0];
    const valueOnDice = dice.results[0].result;

    // We want to extract old roll modifiers
    const rollMods = oldRoll.total - oldRoll.flatDice;

    const newRoll = foundry.utils.deepClone(oldRoll);
    newRoll.terms[0] = dice;
    newRoll.flatDice = valueOnDice;
    newRoll.total = valueOnDice + rollMods;
    newRoll.crit = valueOnDice === 20 ? true : false;
    newRoll.fail = valueOnDice === 1 ? true : false;
    newRoll.formula = `${d20RollFormula} + (${rollMods})`;
    return newRoll;
  }

  #onRemoveRoll(rollType) {
    // There is nothing to remove, only one dice left
    if (this.system.rollLevel === 0) return;

    const extraRolls = this.system.extraRolls;
    // First we need to remove extra rolls
    if (extraRolls && extraRolls.length !== 0) this.#removeExtraRoll(rollType);
    // If there are no extra rolls we need to remove one of real rolls
    else this.#removeLastRoll(rollType);
  }

  #removeExtraRoll(rollType) {
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
    this.gmUpdate(updateData);
  }

  #removeLastRoll(rollType) {
    if (!rollType) return;
    let rollLevel = this.system.rollLevel;
    const absLevel = Math.abs(rollLevel);

    const coreRoll = this.system.coreRoll;
    const d20Dices = coreRoll.terms[0].results;
    d20Dices.pop();

    // We need to chenge some values for that roll
    const rollMods = coreRoll.total - coreRoll.flatDice;
    const valueOnDice = this.#newBestValue(d20Dices, rollType);
    if (!valueOnDice) return;
    
    coreRoll.formula = coreRoll.formula.replace(`${absLevel + 1}d20`, `${absLevel}d20`)
    coreRoll.number = absLevel;
    coreRoll.terms[0].number = absLevel;
    coreRoll.flatDice = valueOnDice;
    coreRoll.total = valueOnDice + rollMods;
    coreRoll.crit = valueOnDice === 20 ? true : false;
    coreRoll.fail = valueOnDice === 1 ? true : false;

    // Determine new roll Level
    if (rollType === "adv") rollLevel--;
    if (rollType === "dis") rollLevel++;

    const updateData = {
      system: {
        rollLevel: rollLevel,
        ["coreRoll"]: coreRoll
      }
    }
    this.gmUpdate(updateData);
  }

  #newBestValue(d20Dices, rollType) {
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

  async #onModifyCoreRoll() {
    const formula = await SimplePopup.input("Enter formula modification");
    if (formula) await this.modifyCoreRoll(formula);
  }

  //===============================
  //=     MEASUREMENT TEMPLATE    =
  //===============================
  async #onCreateMeasuredTemplate(key) {
    const template = this.system.measurementTemplates[key];
    if (!template) return;

    const actor = getActorFromIds(this.speaker.actor, this.speaker.token);
    const item = actor.items.get(this.flags.dc20rpg.itemId);
    this.system.effects.forEach(effect => effect.system.chatMessageId = this.id);
    const applyEffects = getMesuredTemplateEffects(item, this.system.applicableEffects, actor);
    const itemData = {
      itemId: this.flags.dc20rpg.itemId, 
      actorId: this.speaker.actor, 
      tokenId: this.speaker.token, 
      applyEffects: applyEffects, 
      itemImg: item.img,
      itemName: item.name
    }
    const measuredTemplates = await DC20RpgMeasuredTemplate.createMeasuredTemplates(template, () => ui.chat.updateMessage(this), itemData);
    
    // We will skip Target Selector if we are using Measurement Template to apply effects because it is confusing
    if (applyEffects.applyFor) return;

    let tokens = {};
    for (let i = 0; i < measuredTemplates.length; i++) {
      const collectedTokens = getTokensInsideMeasurementTemplate(measuredTemplates[i]);
      tokens = {
        ...tokens,
        ...collectedTokens
      }
    }
    
    if (Object.keys(tokens).length > 0) tokens = await TokenSelector.open(tokens, "Select Targets");
    this.addTokensToTargets(tokens);
  }

  #onAddTemplateSpace(key) {
    const template = this.system.measurementTemplates[key];
    if (!template) return;
    DC20RpgMeasuredTemplate.changeTemplateSpaces(template, 1);
    ui.chat.updateMessage(this);
  }

  #onReduceTemplateSpace(key) {
    const template = this.system.measurementTemplates[key];
    if (!template) return;
    DC20RpgMeasuredTemplate.changeTemplateSpaces(template, -1);
    ui.chat.updateMessage(this);
  }

  //==============================
  //=     TARGET MANIPULATION    =
  //==============================
  #onTargetSelectionSwap(selectedTab) {
    if (this.targetTab === selectedTab) return;
    this.targetTab = selectedTab;
    this.#refreshTargets();
  }

  #onRemoveTarget(targetHash) {
    const tokenId = targetHash.split("#")[1];
    const targeted = this.system.targeted;
    const index = targeted.indexOf(tokenId);
    if (index > -1) targeted.splice(index, 1);
    this.update({["system.targeted"]: targeted});
    this.#refreshTargets();
  }

  #onWrapTarget(targetHash) {
    const target = this.targets[targetHash];
    target.hideDetails = !target.hideDetails;
    this.skipTargetPreparation = true;
    ui.chat.updateMessage(this);
  }

  //===================
  //=     FORMULA     =
  //===================
  #onUseModifiedChange(data) {
    const formula = this.#extractFormula(data);
    formula.useModified = !formula.useModified;
    this.skipTargetPreparation = true;
    ui.chat.updateMessage(this);
  }

  #onModifyFormula(data) {
    const formula = this.#extractFormula(data);
    if (data.up) formula.modify(1);
    if (data.down) formula.modify(-1);
    this.skipTargetPreparation = true;
    ui.chat.updateMessage(this);
  }

  async #onApplyFormula(data) {
    const formula = this.#extractFormula(data);
    await formula.apply({messageId: this.id});

    if (data.category === "damage") {
      const target = this.targets[data.targetHash];
      runEventsFor("targetConfirm", target.actor, triggerOnlyForIdFilter(this.speaker.actor));
    }
  }

  #extractFormula(data) {
    return this.targets[data.targetHash].calculated[data.category][data.index];
  }

  //===================
  //=  ROLL REQUEST   =
  //===================
  #onRollRequest(data) {
    const isContest = data.category === "contests";
    if (data.targetHash) {
      const target = this.targets[data.targetHash];
      const request = target.rollRequests[data.category][data.key];
      const statuses = target.statuses.map(status => status.id);
      const details = this.#getDetailsForRequest(request, isContest, statuses);
      this.#sendRollRequest(target.actor, details, isContest);
    }
    else {
      const request = this.system.rollRequests[data.category][data.key];
      const statuses = this.system.statuses.map(status => status.id);
      const details = this.#getDetailsForRequest(request, isContest, statuses);
      if (canvas.tokens) canvas.tokens.placeables.forEach(token => {
        if (!token.controlled) return;
        this.#sendRollRequest(token.actor, details, isContest);
      })
    }
  }

  #getDetailsForRequest(request, isContest, statuses) {
    const key = isContest ? request.contestedKey : request.saveKey;
    const against = isContest ? this.winningRoll.total : request.dc;

    if (["phy", "men", "mig", "agi", "int", "cha"].includes(key)) {
      return DC20Roll.prepareSaveDetails(key, {against: against, statuses: statuses});
    }
    return DC20Roll.prepareCheckDetails(request.contestedKey, {against: against, statuses: statuses});
  }

  async #sendRollRequest(actor, details, isContest) {
    const result = await actor.roll(details.checkKey, details.type, {sendToActorOwners: true}, details);
    if (!result) return; 
    
    const contestDC = isContest ? "coreRoll" : details.against;
    this.gmUpdate({[`system.targetRollStore.${actor.targetHash}`]: {roll: result._total, contestDC: contestDC}});
  }

  //===================
  //=   APPLY EFFECT  =
  //===================
  #onApplyEffect(data) {
    if (data.targetHash) {
      const target = this.targets[data.targetHash];
      const effectData = target.effects[data.index];
      this.#enhanceEffectData(effectData);
      DC20RpgActiveEffect.gmCreate(effectData, {parent: target.actor});
    }
    else {
      const effectData = this.system.effects[data.index];
      this.#enhanceEffectData(effectData);
      if (canvas.tokens) canvas.tokens.placeables.forEach(token => {
        if (!token.controlled) return;
        DC20RpgActiveEffect.gmCreate(effectData, {parent: token.actor, ignoreResponse: true});
      });
    }
  }

  #enhanceEffectData(effectData) {
    const actor = DC20Target.getActorFromTargetHash(`${this.speaker.actor}#${this.speaker.token}`);
    effectData.system.chatMessageId = this.id;
    effectData.flags.dc20rpg.applierId = this.speaker.actor;

    this.#replaceKeywords(effectData, actor);
    injectFormula(effectData, actor);
    if (this.system.sustain) {
      this.#linkWithSustain(effectData, actor);
    }
  }

  #replaceKeywords(effect, actor) {
    const saveDC = actor.system.saveDC.value;
    const against = Math.max(saveDC.spell, saveDC.martial);
    for (let i = 0; i < effect.changes.length; i++) {
      let changeValue = effect.changes[i].value;
      if (typeof changeValue === "string" && changeValue.includes("#SPEAKER_ID#")) {
        effect.changes[i].value = changeValue.replaceAll("#SPEAKER_ID#", this.speaker.actor);
      }
      if (typeof changeValue === "string" && changeValue.includes("#SAVE_DC#")) {
        effect.changes[i].value = changeValue.replaceAll("#SAVE_DC#", against);
      }
    }
  }

  #linkWithSustain(effect, actor) {
    effect.system.sustained = {
      itemId: this.system.itemId,
      actorUuid: actor.uuid,
      isSustained: true
    }
  }

  //===================
  //=   APPLY STATUS  =
  //===================
  #onApplyStatus(data) {
    if (data.targetHash) {
      const target = this.targets[data.targetHash];
      const status = target.statuses[data.index];
      if (status.display) target.actor.toggleStatusEffect(status.id, {active: true, extras: this.#collectExtras(status)});
    }
    else {
      const status = this.system.statuses[data.index];
      if (canvas.tokens) canvas.tokens.placeables.forEach(token => {
        if (!token.controlled) return;
        if (status.display) token.actor.toggleStatusEffect(status.id, {active: true, extras: this.#collectExtras(status)});
      });
    }
  }

  #collectExtras(status) {
    const actor = DC20Target.getActorFromTargetHash(`${this.speaker.actor}#${this.speaker.token}`);
    const saveDC = actor.system.saveDC.value;
    const extras = {
      ...status,
      actorId: actor.id, // TODO: Should replace with target hash?
      against: Math.max(saveDC.spell, saveDC.martial)
    }
    if (this.system.sustain) extras.sustain = this.#sustainExtras(actor);

    return extras;
  }

  #sustainExtras(actor) {
    return {
      itemId: this.system.itemId,
      actorUuid: actor.uuid,
      isSustained: true
    }
  }

  //==============================
  //=          GM MENU           =
  //==============================
  #onGmApplyFormulas() {
    Object.values(this.targets).forEach(async target => {
      for (let i = 0; i < target.calculated.damage.length; i++) {
        await this.#onApplyFormula({targetHash: target.targetHash, category: "damage", index: i});
      }
      for (let i = 0; i < target.calculated.healing.length; i++) {
        await this.#onApplyFormula({targetHash: target.targetHash, category: "healing", index: i});
      }
    })
  }

  #onGmRollRequest() {
    Object.values(this.targets).forEach(target => {
      const saves = Object.keys(target.rollRequests.saves);
      const contests = Object.keys(target.rollRequests.contests); 
      if (saves.length + contests.length > 1) {
        ui.notifications.warn(`There is more that one Roll Request for ${target.name}. Cannot send automatic Request.`);
        return;
      }

      if (saves.length > 0) this.#onRollRequest({targetHash: target.targetHash, category: "saves", key: saves[0]});
      if (contests.length > 0) this.#onRollRequest({targetHash: target.targetHash, category: "contests", key: contests[0]});
    })
  }

  #onGmTargetConfirm() {
    Object.values(this.targets).forEach(target => runEventsFor("targetConfirm", target.actor, triggerOnlyForIdFilter(this.speaker.actor)))
  }

  #onGmApplyEffectAndStatus(failOnly) {
    Object.values(this.targets).filter(target => !failOnly || target.contestOutcome?.type === "fail")
          .forEach(target => {
            for (let i = 0; i < target.effects.length; i++) {
              this.#onApplyEffect({targetHash: target.targetHash, index: i});
            }
            for (let i = 0; i < target.effects.length; i++) {
              this.#onApplyStatus({targetHash: target.targetHash, index: i});
            }
          })
  }

  #onAddSelectedToTargets() {
    if (canvas.tokens) {
      const tokens = canvas.tokens.placeables.filter(token => token.controlled);
      this.addTokensToTargets(tokens);
    };
  }

  #onShareFormula() {
    this.shareFormula = !this.shareFormula;
    ui.chat.updateMessage(this);
  }

  //==============================
  //=    REVERT EVENT MESSAGE    =
  //==============================
  async #onRevertButton() {
    const actor = await fromUuid(this.system.actorUuid);
    if (!actor) return;

    if (this.system.eventType === "effectRemoval") {
      await this.#onRevertEffect(actor);
    }
    else {
      await this.#onRevertHp(actor);
    }
    this.delete();
  }

  #onRevertHp(actor) {
    const amount = this.system.amount;
    if (!amount) return;

    const health = actor.system.resources.health;
    if (this.system.eventType === "damage") actor.gmUpdate({["system.resources.health.value"]: health.value + amount}, {ignoreResponse: true});
    if (this.system.eventType === "healing") actor.gmUpdate({["system.resources.health.value"]: health.value - amount}, {ignoreResponse: true});
  }

  #onRevertEffect(actor) {
    const effectData = this.system.effect;
    if (!effectData) return;
    DC20RpgActiveEffect.gmCreate(effectData, {parent: actor, ignoreResponse: true});
  }

  //==============================
  //=       ON DROP HANDLER      =
  //==============================
  async _onDrop(event) {
    event.preventDefault();

    const droppedData  = event.dataTransfer.getData('text/plain');
    if (!droppedData) return;
    
    const helpDice = JSON.parse(droppedData);
    if (helpDice.type !== "help") return;

    await this.#addHelpDiceToRoll(helpDice);
  }

  async #addHelpDiceToRoll(helpDice) {
    const actorId = helpDice.actorId;
    const tokenId = helpDice.tokenId;
    const helpDiceOwner = getActorFromIds(actorId, tokenId);
    if (!helpDiceOwner) return;

    const messageTitle = helpDice.customTitle || game.i18n.localize("dc20rpg.sheet.help.help");
    const success = await this.modifyCoreRoll(helpDice.formula, messageTitle);
    if (success) await helpDiceOwner.help.clear(helpDice.key);
  }
}

/** @deprecated since v0.10.0 until 0.10.5 */
export async function sendDescriptionToChat(actor, details, item) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.tools.sendDescriptionToChat' method is deprecated, and will be removed in the later system version. Use 'DC20.DC20ChatMessage.descriptionMessage' instead.", { since: " 0.10.0", until: "0.10.5", once: true });
  DC20ChatMessage.descriptionMessage(details, actor, options={item: item});
}