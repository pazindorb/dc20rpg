import { createRestDialog } from "../dialogs/rest.mjs";
import { promptItemRoll, promptRoll } from "../dialogs/roll-prompt.mjs";
import { getSimplePopup } from "../dialogs/simple-popup.mjs";
import { clearHelpDice, triggerHeldAction } from "../helpers/actors/actions.mjs";
import { prepareCheckDetailsFor, prepareSaveDetailsFor } from "../helpers/actors/attrAndSkills.mjs";
import { canSubtractBasicResource, regainBasicResource, subtractBasicResource } from "../helpers/actors/costManipulator.mjs";
import { getItemFromActor } from "../helpers/actors/itemsOnActor.mjs";
import { getActorFromIds, getSelectedTokens } from "../helpers/actors/tokens.mjs";
import { addFlatDamageReductionEffect, deleteEffectFrom, editEffectOn, toggleEffectOn } from "../helpers/effects.mjs";
import { getItemActionDetails, getItemUseCost } from "../helpers/items/itemDetails.mjs";
import { changeActivableProperty, getValueFromPath } from "../helpers/utils.mjs";
import { preprareSheetData } from "../sheets/item-sheet/is-data.mjs";
import { isStackable } from "../statusEffects/statusUtils.mjs";
import { openTokenHotbarConfig } from "./token-hotbar-config.mjs";

export default class DC20Hotbar extends foundry.applications.ui.Hotbar { 
  constructor(options = {}) {
    super(options);
    this.tokenHotbar = game.settings.get("dc20rpg", "tokenHotbar");
    this.skipTypes = [
      "basicAction",
      "class",
      "subclass",
      "ancestry",
      "background",
      "loot",
      "container"
    ]
    this.filter = {
      index: 0,
      type: "none",
      icon: "fa-border-all",
      options: [
        {
          type: "none",
          label: "None",
          icon: "fa-border-all"
        },
        {
          type: "reaction",
          label: "Reaction",
          icon: "fa-reply"
        },
        {
          type: "attack",
          label: "Martial Attack",
          icon: "fa-sword"
        },
        {
          type: "spell",
          label: "Spell Check",
          icon: "fa-hat-wizard"
        },
        {
          type: "skill",
          label: "Skill Check",
          icon: "fa-books"
        },
      ]
    };
  }

  /** @override */
  static PARTS = {
    hotbar: {
      root: true,
      template: "systems/dc20rpg/templates/sidebar/hotbar.hbs"
    }
  };

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.actions.swap = this._onSwap;
    initialized.actions.roll = this._onRoll;
    initialized.actions.spendResource = this._spendResource;
    initialized.actions.regainResource = this._regainResource;
    initialized.actions.config = this._onConfigTokenHotbar;
    initialized.actions.dropSustain = this._onDropSustain;
    initialized.actions.heldAction = this._onHeldAction;
    initialized.actions.rest = () => createRestDialog(this.actor);
    initialized.actions.check = this._onCheckRoll;
    initialized.actions.save = this._onSaveRoll;
    initialized.actions.grit = this._onGrit;
    initialized.actions.filter = this._onFilterChange;
    initialized.actions.autofill = this._onAutofill;
    initialized.actions.original = this._onOriginalSwap;
    return initialized;
  }

  _attachFrameListeners() {
    super._attachFrameListeners();
    this.element.addEventListener("dblclick", this._onDoubleClick.bind(this));
    this.element.addEventListener("mousedown", this._onMouseDown.bind(this));
    this.element.addEventListener("change", this._onChange.bind(this));
  }

  _getContextMenuOptions() {
    const options = super._getContextMenuOptions();
    options[1].condition = li => !this.tokenHotbar;

    options.push({
          name: "MACRO.OpenSheet",
          icon: '<i class="fa-solid fa-pen-to-square"></i>',
          condition: li => this.#isItemSlot(li),
          callback: li => {
            const dataset = li.dataset;
            const item = this._getItemFromSlot(dataset.index, dataset.section);
            if (item) item.sheet.render(true);
          }
    });
    options.push({
          name: "MACRO.RemoveItem",
          icon: '<i class="fa-solid fa-xmark"></i>',
          condition: li => this.#isItemSlot(li),
          callback: li => {
            const dataset = li.dataset;
            this.actor.update({[`system.tokenHotbar.${dataset.section}.${dataset.index}`]: ""});
          }
    });
    return options;
  }

  #isItemSlot(li) {
    const itemSlot = li.classList.contains("item-slot");
    if (!itemSlot) return;
    const dataset = li.dataset;
    const item = this._getItemFromSlot(dataset.index, dataset.section);
    return item ?? false;
  }

  // ==================== CONTEXT =====================
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    if (this.tokenHotbar) await this._prepareTokenContext(context);
    else {
      this.actorId = ""; 
      this.tokenId = "";
      this.helpDice = null;
    };
    context.filter = this.filter;
    context.tokenHotbar = this.tokenHotbar;
    return context;
  }

  _getActorFrom(token) {
    const actorLink = token.document.actorLink;
    if (!actorLink && this.original) return game.actors.get(token.document.actorId);
    return token.actor;
  }

  async _prepareTokenContext(context) {
    this.actor = null;
    const tokens = getSelectedTokens();
    if (!tokens || tokens.length !== 1) return;

    const token = tokens[0];
    this.actor = this._getActorFrom(token);
    this.actorId = this.actor.id;
    this.tokenId = token.id;
    context.actor = this.actor;

    const health = this.actor.system.resources.health;
    let hpPercent = Math.ceil(100 * health.current/health.max);
    if (isNaN(hpPercent)) hpPercent = 0;
    context.actor.system.resources.health.percent = Math.min(hpPercent, 100);
    let tempPercent = Math.ceil(100 * health.value/health.max);
    if (isNaN(tempPercent)) tempPercent = 0;
    context.actor.system.resources.health.percentTemp = Math.min(tempPercent, 100);

    context.sectionA = await this._prepareSectionSlots("sectionA");
    context.sectionB = await this._prepareSectionSlots("sectionB");
    const tokenHotbarSettings = game.settings.get("dc20rpg", "tokenHotbarSettings");
    context.sectionAWidth = tokenHotbarSettings["sectionA"].rows;
    context.sectionBWidth = tokenHotbarSettings["sectionB"].rows;

    context.resources = this._prepareResources();
    context.effects = await this._prepareEffects(tokenHotbarSettings.effects);
    context.help = this._prepareHelp(tokenHotbarSettings.help);
    context.heldAction = this._prepareHeldAction();
    context.sustain = this.actor.system.sustain;
    context.original = this.original;
  }

  async _prepareSectionSlots(sectionKey) {
    const section = this.actor.system.tokenHotbar[sectionKey];
    const items = this.actor.items;

    const tokenHotbarSettings = game.settings.get("dc20rpg", "tokenHotbarSettings");
    const borderColor = tokenHotbarSettings.borderColor;
    const markers = tokenHotbarSettings.markers;
    const showCharges = tokenHotbarSettings.showCharges;

    const sc = tokenHotbarSettings[sectionKey];
    const size = sc.rows * sc.columns;
    const slots = [];
    for (let i = 0; i < size; i++) {
      const itemId = section[i];
      const original = items.get(itemId);
      const item = original ? {...original} : null;
      if (item) {
        item.description = await this._prepareDescription(item);
        if (borderColor) this._borderColor(item);
        if (markers) this._markers(item);
        if (showCharges) this._charges(item);
        this._runFilter(item);
      }
      slots[i] = item || {filterOut: this.filter.type !== "none"}
    }
    return slots;
  }

  async _prepareDescription(item) {
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const useCost = getItemUseCost(item);
    const itemAction = getItemActionDetails(item);
    const data = {system: item.system};
    preprareSheetData(data, item);

    const reaction = item.system.isReaction ? `<i class='margin-left-3 margin-right-8 fa-solid fa-reply reaction'></i>` : "";
    const cost = useCost ? `<div class='cost-wrapper'>${reaction}${useCost}</div>` : "";
    const action = itemAction ? `<p><b>Action:</b> ${itemAction}</p>` : "";
    const saves = data.sheetData.saves ? `<p><b>Save:</b> ${data.sheetData.saves}</p>` : "";
    const contest = data.sheetData.contests ? `<p><b>Contest:</b> ${data.sheetData.contests}</p>` : "";

    let formulas = "";
    formulas += data.sheetData.damageFormula ? `<li class='margin-top-5'>Damage: ${data.sheetData.damageFormula}</li>` : "";
    formulas += data.sheetData.healingFormula ? `<li class='margin-top-5'>Healing: ${data.sheetData.healingFormula}</li>` : "";
    formulas += data.sheetData.otherFormula ? `<li class='margin-top-5'>Other: ${data.sheetData.otherFormula}</li>` : "";
    if (formulas) formulas = `<p><b>Outcome:</b> ${formulas}</p>`;

    let middleColumn = `${action} ${saves} ${contest} ${formulas}`;
    if (middleColumn.trim()) middleColumn = "<hr/>" + middleColumn;

    let descriptionColumn = item.system.description;
    if (descriptionColumn.trim()) {
      descriptionColumn = "<hr/>" + await TextEditor.enrichHTML(descriptionColumn, {secrets:true});
      descriptionColumn = descriptionColumn.replaceAll('"', "'");
    }

    return `
      <div class='header-section'><h4>${item.name}</h4> ${cost}</div>
      <div class='middle-section'>${middleColumn}</div>
      ${descriptionColumn}
    `
  }

  _borderColor(item) {
    const actionType = item.system?.actionType;
    const attackCheckType = item.system?.attackFormula?.checkType;
    const checkType = item.system?.check?.checkKey;

    let color = "";
    if (actionType === "attack" && attackCheckType === "attack") color = "martial-attack";
    else if (actionType === "attack" && attackCheckType === "spell") color = "spell-attack";
    else if (actionType === "check" && checkType === "att") color = "martial-attack";
    else if (actionType === "check" && checkType === "spe") color = "spell-check";
    else if (actionType === "check") color = "skill-check";
    item.borderColor = color;
  }

  _markers(item) {
    const actionType = item.system?.actionType;
    const attackCheckType = item.system?.attackFormula?.checkType;
    const checkType = item.system?.check?.checkKey;

    let actionIcon = "";
    if (actionType === "attack" && attackCheckType === "attack") actionIcon = "fa-sword";
    else if (actionType === "attack" && attackCheckType === "spell") actionIcon = "fa-hat-wizard";
    else if (actionType === "check" && checkType === "att") actionIcon = "fa-sword";
    else if (actionType === "check" && checkType === "spe") actionIcon = "fa-hat-wizard";
    else if (actionType === "check") actionIcon = "fa-books";
    
    item.actionMarker = actionIcon;
    if (item.system?.isReaction) item.reactionMarker = "fa-reply";
  }

  _charges(item) {
    const charges = item.system.costs?.charges;
    if (!charges) return;
    if (!charges.maxChargesFormula) return;
    item.showCharges = charges.current;
  }

  _runFilter(item) {
    const filter = this.filter.type;
    if (filter === "none") return;

    const actionType = item.system?.actionType;
    const attackCheckType = item.system?.attackFormula?.checkType;
    const checkType = item.system?.check?.checkKey;
    const reaction = item.system?.isReaction;

    const attackFilter = (actionType === "attack" && attackCheckType === "attack") || (actionType === "check" && checkType === "att");
    const spellFilter = (actionType === "attack" && attackCheckType === "spell") || (actionType === "check" && checkType === "spe");
    const skillFilter = (actionType === "check" && (checkType !== "spe" && checkType !== "att"))

    switch (filter) {
      case "reaction":
        if (!reaction) item.filterOut = true; break;

      case "attack":
        if (!attackFilter) item.filterOut = true; break;

      case "spell":
        if (!spellFilter) item.filterOut = true; break;

      case "skill":
        if (!skillFilter) item.filterOut = true; break;
    }
  }

  _prepareResources() {
    const tokenHotbar = this.actor.system.tokenHotbar;
    if (tokenHotbar.resource1.key && tokenHotbar.resource2.key && tokenHotbar.resource3.key) {
      let content = "";
      content += this._resource(tokenHotbar.resource1, "resource-left-short");
      content += this._resource(tokenHotbar.resource3, "resource-middle");
      content += this._resource(tokenHotbar.resource2, "resource-right-short");
      return content;
    }
    if (tokenHotbar.resource1.key && tokenHotbar.resource2.key) {
      let content = "";
      content += this._resource(tokenHotbar.resource1, "resource-left");
      content += this._resource(tokenHotbar.resource2, "resource-right");
      return content;
    }
    if (tokenHotbar.resource1.key) {
      let content = "";
      content += this._resource(tokenHotbar.resource1, "resource-wide");
      return content;
    }
    return "";
  }

  _resource(resource, clazz) {
    const value = getValueFromPath(this.actor, `system.resources.${resource.key}.value`);

    return `
      <div class="${clazz}">
        <input data-cType="actor-numeric" data-path="system.resources.${resource.key}.value" type="number" value="${value}"
        data-dtype="Number" title="${resource.label}" style="background: linear-gradient(to bottom, ${resource.color}, #161616);">
      </div>
    `;
  }

  async _prepareEffects(effectsConfig) {
    const [active, disabled] = await this._prepareTemporaryEffects();
    const position = effectsConfig.position;
    const rowSize = effectsConfig.rowSize;
    let separator = true;
    if (active.length === 0) separator = false;
    if (!separator || active.length === rowSize) separator = false;

    const data = {
      position: position,
      active: active,
      disabled: disabled,
      rowSize: rowSize,
      separator: separator
    }
    return data;
  }

  async _prepareTemporaryEffects() {
    const actor = this.actor;
    const active = [];
    const disabled = [];
    if (actor.allEffects.length === 0) return [active, disabled];

    for(const effect of actor.allEffects) {
      if (effect.isTemporary) {
        const TextEditor = foundry.applications.ux.TextEditor.implementation;
        const enriched = await TextEditor.enrichHTML(effect.description, {secrets:true, autoLink:true});
        const descriptionColumn = enriched ? `<hr/>${enriched}` : "";
        
        const timeLeft = effect.roundsLeft ? `<p><i class="fa-solid fa-stopwatch margin-right-5"></i> ${effect.roundsLeft} Rounds Left</p>` : "";
        const suspended = effect.suspended ? `<p><i class="fa-solid fa-power-off margin-right-5"></i> Suspended by: ${effect.suspendedBy} </p>` : "";
        const statuses = await this._prepareInnerStatuses(effect.statuses, effect.name);

        let middleColumn = `${timeLeft} ${suspended} ${statuses}`;
        if (middleColumn.trim()) middleColumn = "<hr/>" + middleColumn;

        effect.descriptionHTML = `
          <h4 class='margin-top-5'>${effect.name}${effect.disabled ? " [Disabled]" : ""}</h4>
          <div class='middle-section'>${middleColumn}</div>
          ${descriptionColumn}
        `

        // If effect is toggleable from item we want to change default behaviour
        const item = effect.getSourceItem();
        if (item) {
          // Equippable
          if (item.system.effectsConfig?.mustEquip) effect.equippable = true; 

          // Toggleable
          if (item.system.toggle?.toggleable && item.system.effectsConfig?.linkWithToggle) effect.itemId = item.id; 
          else effect.itemId = ""; 
        }

        if(effect.disabled) disabled.push(effect);
        else active.push(effect);
      }
    }

    // Merge stackable conditions
    const mergedActive = this._mergeStackableConditions(active);
    const mergedDisabled = this._mergeStackableConditions(disabled);
    return [mergedActive, mergedDisabled];
  }

  _mergeStackableConditions(effects) {
    const mergedEffects = [];
    for (const effectDoc of effects) {
      const effect = {...effectDoc};
      effect._id = effectDoc._id;
      const statusId = effect.system.statusId;
      if (statusId && isStackable(statusId)) {
        const alreadyPushed = mergedEffects.find(e => e.system.statusId === statusId);
        if (alreadyPushed) {
          alreadyPushed._id = effect._id;
          alreadyPushed.system.stack++;
        }
        else {
          effect.system.stack = 1;
          mergedEffects.push(effect);
        }
      }
      else {
        mergedEffects.push(effect);
      }
    }
    return mergedEffects;
  }

  async _prepareInnerStatuses(statuses, effectName) {
    let inner = "";
    for (const status of CONFIG.statusEffects) {
      if (statuses.has(status.id) && effectName !== status.name) {
        const journal = CONFIG.DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.conditionsJournal;
        const link = journal[status.id];
        const html = `<li style='display:flex; margin-left:5px'><i class='custom-resource'><img src='${status.img}' style='margin-right:5px'/></i>@UUID[${link}]{${status.name}}</li>`;
        const TextEditor = foundry.applications.ux.TextEditor.implementation;
        const enriched = await TextEditor.enrichHTML(html, {secrets:true, autoLink:false});
        inner += enriched;
      }
    }
    if (inner) inner = "<p>Contains: </p>" + inner;
    return inner;
  }

  _prepareHelp(helpConfig) {
    const helpData = {
      position: helpConfig.position,
      rowSize: helpConfig.rowSize,
    }

    const dice = {};
    for (const [key, help] of Object.entries(this.actor.system.help.active)) {
      let icon = "fa-dice";
      switch (help.value) {
        case "d20": case "-d20": icon = "fa-dice-d20"; break;
        case "d12": case "-d12": icon = "fa-dice-d12"; break; 
        case "d10": case "-d10": icon = "fa-dice-d10"; break; 
        case "d8": case "-d8": icon = "fa-dice-d8"; break; 
        case "d6": case "-d6": icon = "fa-dice-d6"; break; 
        case "d4": case "-d4": icon = "fa-dice-d4"; break; 
      }
      dice[key] = {
        formula: help.value,
        icon: icon,
        subtraction: help.value.includes("-"),
        doNotExpire: help.doNotExpire
      }
    }
    this.helpDice = dice;
    helpData.dice = dice;
    return helpData
  }

  _prepareHeldAction() {
    const actionHeld = this.actor.flags.dc20rpg.actionHeld;
    if (!actionHeld?.isHeld) return;
    return actionHeld;
  }
  // ==================== CONTEXT =====================

  async _onRender(context, options) {
    if (context.tokenHotbar) {
      this.element.classList.add("token-hotbar");
    }
    await super._onRender(context, options);

    // Override drop behavior
    if (context.tokenHotbar) {
      new foundry.applications.ux.DragDrop.implementation({
        dragSelector: ".slot.full, .help-dice",
        dropSelector: ".slot",
        callbacks: {
          dragstart: this._onDragStart.bind(this),
          drop: this._onDropOnTokenHotbar.bind(this)
        }
      }).bind(this.element);
    }
  }

  // ==================== ACTIONS =====================
  _onSwap(event, target) {
    this.tokenHotbar = !this.tokenHotbar;
    game.settings.set("dc20rpg", "tokenHotbar", this.tokenHotbar);
    this.render();
  }

  _onRoll(event, target) {
    const dataset = event.target.dataset;
    const item = this._getItemFromSlot(dataset.index, dataset.section);
    if (!item) return;
    promptItemRoll(this.actor, item);
  }

  async _onDropSustain(event, target) {
    let index = target.dataset.index;
    const owner = getActorFromIds(this.actorId, this.tokenId);
    if (!owner || index === undefined) return;

    index = parseInt(index);
    const sustain = owner.system.sustain;
    if (!sustain[index]) return;

    const confirmed = await getSimplePopup("confirm", {header: "Do you want to remove that Sustain Action?"});
    if (confirmed) {
      const sustained = [];
      for (let i = 0; i < sustain.length; i++) {
        if (index !== i) sustained.push(sustain[i]); 
      }
      owner.update({[`system.sustain`]: sustained});
    }
  }

  _onHeldAction(event, target) {
    const owner = getActorFromIds(this.actorId, this.tokenId);
    if (owner) triggerHeldAction(owner);
  }

  async _onCheckRoll(event, target) {
    const options = this.actor.getCheckOptions(true, true, true, true);
    const key = await getSimplePopup("select", {header: "Roll Skill Check", selectOptions: options});
    const details = prepareCheckDetailsFor(key);
    await promptRoll(this.actor, details);
  }

  async _onSaveRoll(event, target) {
    const options = CONFIG.DC20RPG.ROLL_KEYS.saveTypes;
    const key = await getSimplePopup("select", {header: "Roll Save", selectOptions: options});
    const details = prepareSaveDetailsFor(key);
    await promptRoll(this.actor, details);
  }

  async _onGrit(event, target) {
    if (canSubtractBasicResource("grit", this.actor, 1)) {
      await subtractBasicResource("grit", this.actor, 1, true);
      await addFlatDamageReductionEffect(this.actor);
    }
  }

  _onFilterChange(event, target) {
    let index = this.filter.index + 1;
    let newFilter = this.filter.options[index];
    if (!newFilter) {
      newFilter = this.filter.options[0];
      index = 0;
    }
    this.filter.type = newFilter.type;
    this.filter.index = index;
    this.filter.label = newFilter.label;
    this.filter.icon = newFilter.icon;
    this.render();
  }

  async _onAutofill(event, target) {
    const favorities = target.dataset.special === "favorities";
    await this._clearSection(this.actor.system.tokenHotbar.sectionA, "sectionA");
    await this._clearSection(this.actor.system.tokenHotbar.sectionB, "sectionB");

    const usableItems = this.actor.items
                .filter(item => !favorities || item.flags.dc20rpg.favorite)
                .filter(item => item.system?.actionType !== "")
                .filter(item => !this.skipTypes.includes(item.type));

    const tokenHotbarSettings = game.settings.get("dc20rpg", "tokenHotbarSettings");
    const sca = tokenHotbarSettings.sectionA;
    const scb = tokenHotbarSettings.sectionB;
    const size = {
      A: sca.rows * sca.columns,
      B: scb.rows * scb.columns
    }
    const updateData = {
      sectionA: {},
      sectionB: {}
    };

    let section = size.A >= size.B ? "A" : "B";
    const full = {
      A: size.A === 0,
      B: size.B === 0
    }
    let counter = 0;
    for (const item of usableItems) {
      if (counter > size[section]) {
        full[section] = true;
        if (section === "A" && !full.B) {
          section = "B";
          counter = 0;
        }
        else if (section === "B" && !full.A) {
          section = "A";
          counter = 0;
        }
        else {
          break;
        }
      }
      updateData[`section${section}`][counter] = item.id;
      counter++;
    }

    await this.actor.update({["system.tokenHotbar"]: updateData});
  }

  async _clearSection(section, sectionKey) {
    const updateData = {}
    for (const key of Object.keys(section)) {
      updateData[`system.tokenHotbar.${sectionKey}.${key}`] = "";
    }
    await this.actor.update(updateData);
  }

  _onOriginalSwap(event, target) {
    this.original = !this.original;
    this.render();
  }

  async _spendResource(event, target) {
    const key = target.dataset.resource;
    if (!key) return;
    if (canSubtractBasicResource(key, this.actor, 1)) await subtractBasicResource(key, this.actor, 1, true);
    this.render();
  }

  async _regainResource(event, target) {
    const key = target.dataset.resource;
    if (!key) return;
    await regainBasicResource(key, this.actor, 1, true);
    this.render();
  }

  _onConfigTokenHotbar(event, target) {
    if (this.actor) openTokenHotbarConfig(this.actor);
  }

  _onDoubleClick(event) {
    if (event.target.classList.contains("char-img")) {
      this.actor.sheet.render(true);
    }
  }

  _onMouseDown(event) {
    if (event.button === 0) this._onLeftClick(event);
    if (event.button === 1) this._onMiddleClick(event);
    if (event.button === 2) this._onRightClick(event);
  }

  _onLeftClick(event) {
    if (event.target.classList.contains("effect-img")) {
      const dataset = event.target.dataset;
      const owner = getActorFromIds(this.actorId, this.tokenId);
      if (owner) {
        if (dataset.itemId) {
          const item = getItemFromActor(dataset.itemId, owner);
          if (item) changeActivableProperty("system.toggle.toggledOn", item);
        }
        else {
          toggleEffectOn(dataset.effectId, owner, dataset.turnOn === "true");
        }
      }
    }
  }

  _onMiddleClick(event) {
    if (event.target.classList.contains("item-slot")) {
      const dataset = event.target.dataset;
      const item = this._getItemFromSlot(dataset.index, dataset.section);
      if (item) item.sheet.render(true);
    }
    if (event.target.classList.contains("effect-img")) {
      const dataset = event.target.dataset;
      const owner = getActorFromIds(this.actorId, this.tokenId);
      if (owner) editEffectOn(dataset.effectId, owner);
    }
  }

  async _onRightClick(event) {
    if (event.target.classList.contains("effect-img")) {
      const dataset = event.target.dataset;
      const owner = getActorFromIds(this.actorId, this.tokenId);
      if (owner) {
        const confirmed = await getSimplePopup("confirm", {header: "Do you want to remove that Effect?"});
        if (confirmed) deleteEffectFrom(dataset.effectId, owner);
      }
    }
    if (event.target.classList.contains('help-dice') || event.target.parentElement.classList.contains('help-dice')) {
      let key = event.target.dataset?.key;
      if (!key) key = event.target.parentElement.dataset?.key;
      const owner = getActorFromIds(this.actorId, this.tokenId);
      if (owner) {
        const confirmed = await getSimplePopup("confirm", {header: "Do you want to remove that Help Dice?"});
        if (confirmed) clearHelpDice(owner, key);
      }
    }
  }

  async _onChange(event) {
    const target = event.target;
    const dataset = target.dataset;
    const cType = dataset.ctype;
    const path = dataset.path;
    const value = target.value;

    switch (cType) {
      case "actor-numeric": 
        await this.actor.update({[path]: value})
        break;
    }
    this.render();
  }
  // ==================== ACTIONS =====================

  async _onDropOnTokenHotbar(event) {
    event.preventDefault();
    const dataset = event.target.dataset;
    const index = dataset.index;
    const section = dataset.section;
    if (!index || !section) return;

    const droppedData  = event.dataTransfer.getData('text/plain');
    if (!droppedData) return;
    const droppedObject = JSON.parse(droppedData);
    if (!droppedObject) return;

    switch (droppedObject.type) {
      case "Item": await this._onDropItem(droppedObject, index, section); break;
      case "Slot": await this._onDropSlot(droppedObject, index, section); break;
    }
  }

  async _onDropItem(dropped, index, section) {
    const itemId = dropped.uuid.replace(/^.*?Item\./, '');
    this.actor.update({[`system.tokenHotbar.${section}.${index}`]: itemId});
  }

  async _onDropSlot(dropped, index, section) {
    this.actor.update({[`system.tokenHotbar.${section}.${index}`]: dropped.itemId});
  }

  _onDragStart(event) {
    if (event.target.classList.contains('help-dice')) this._onDragHelpDice(event);
    else if (event.target.classList.contains('item-slot')) this._onDragItem(event);
    else super._onDragStart(event);
  }

  _onDragItem(event) {
    const dataset = event.target.dataset;
    const index = dataset.index;
    const sectionKey = dataset.section;
    const itemId = this._getItemIdFromSlot(index, sectionKey);
    if (!itemId) return;

    const dragData = {
      type: "Slot",
      itemId: itemId
    }

    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    this.actor.update({[`system.tokenHotbar.${sectionKey}.${index}`]: ""});
  }

  _onDragHelpDice(event) {
    const dataset = event.target.dataset;
    const key = dataset.key;

    const helpDice = this.helpDice[key];
    if (helpDice) {
      const dto = {
        key: key,
        formula: helpDice.formula,
        type: "help",
        actorId: this.actorId,
        tokenId: this.tokenId,
      }
      event.dataTransfer.setData("text/plain", JSON.stringify(dto));
    }
  }

  _getItemIdFromSlot(index, sectionKey) {
    if (!index || !sectionKey) return;
    const section = this.actor.system.tokenHotbar[sectionKey];
    const itemId = section[index];
    return itemId;
  }

  _getItemFromSlot(index, section) {
    const itemId = this._getItemIdFromSlot(index, section);
    if (!itemId) return;
    return this.actor.items.get(itemId);
  }
}

Hooks.on('controlToken', () => {if (ui.hotbar) ui.hotbar.render()});