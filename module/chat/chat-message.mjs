import { rollFromSheet } from "../helpers/actors/rollsFromActor.mjs";
import { enhanceTarget, getSelectedTokens } from "../helpers/actors/tokens.mjs";
import { DC20RPG } from "../helpers/config.mjs";
import { datasetOf } from "../helpers/events.mjs";
import { getLabelFromKey, getValueFromPath, setValueForPath } from "../helpers/utils.mjs";

export class DC20ChatMessage extends ChatMessage {

  /** @overriden */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Initialize applyToTargets flag for the first time
    if (this.system.applyToTargets === undefined) {
      if (this.system.targetedTokens.length > 0) this.system.applyToTargets = true;
      else this.system.applyToTargets = false;
    }
    this._prepareDisplayedTargets();
  }

  _prepareDisplayedTargets() {
    const rolls = this.system.chatFormattedRolls;
    const actionType = this.system.actionType;
    const defenceKey = this.system.targetDefence;
    const halfDmgOnMiss = this.system.halfDmgOnMiss;
    const conditionals = this.system.conditionals;

    let targets = [];
    if (this.system.applyToTargets) targets = this.system.targetedTokens;   // From targets
    else targets = this._tokensToTargets(getSelectedTokens())               // From selected tokens

    const displayedTargets = {};
    targets.forEach(target => {
      enhanceTarget(target, actionType, rolls.winningRoll, rolls.dmg, rolls.heal, defenceKey, halfDmgOnMiss, conditionals);
      displayedTargets[target.id] = target;
    });
    this.system.targets = displayedTargets;
  }

  _tokensToTargets(tokens) {
    if (!tokens) return [];
    const targets = [];
    tokens.forEach(token => {
      const actor = token.actor;
      const conditions = actor.statuses.size > 0 ? Array.from(actor.statuses) : [];
      targets.push({
        name: actor.name,
        img: actor.img,
        id: token.id,
        system: actor.system,
        conditions: conditions
      });
    })
    return targets;
  }

  /** @overriden */
  async getHTML() {
    // We need to render our content here, to get access to extra stuff
    const contentData = {
      ...this.system
    }
    const templateSource = "systems/dc20rpg/templates/chat/roll-chat-message.hbs";
    this.content = await renderTemplate(templateSource, contentData);

    const html = await super.getHTML();
    // Activete listeners on rendered template
    this._activateListeners(html);
    return html;
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

    // Damage/Healing buttons
    html.find('.modify-roll').click(ev => this._onModifyRoll(datasetOf(ev).direction, datasetOf(ev).modified, datasetOf(ev).path));
    html.find('.apply-damage').click(ev => this._onApplyDamage(datasetOf(ev).target, datasetOf(ev).roll, datasetOf(ev).modified));
    html.find('.apply-healing').click(ev => this._onApplyHealing(datasetOf(ev).target, datasetOf(ev).roll, datasetOf(ev).modified));

    // Save/Contest buttons
    html.find('.roll-save').click(ev => this._onSaveRoll(datasetOf(ev).target, datasetOf(ev).key, datasetOf(ev).dc));
    html.find('.roll-check').click(ev => this._onCheckRoll(datasetOf(ev).target, datasetOf(ev).key, datasetOf(ev).against));
  }

  _onActivable(path) {
     let value = getValueFromPath(this, path);
     setValueForPath(this, path, !value);
     ui.chat.updateMessage(this);
  }

  _onTargetSelectionSwap() {
    this.system.applyToTargets = !this.system.applyToTargets;
    this._prepareDisplayedTargets();
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

  _onApplyDamage(targetKey, dmgKey, modified) {
    const dmgModified = modified === "true" ? "modified" : "clear";
    const target = this.system.targets[targetKey];
    const dmg = target.dmg[dmgKey][dmgModified];

    const actor = this._getActor(target);
    if (!actor) return;

    const health = actor.system.resources.health;
    const newValue = health.value - dmg.value;
    actor.update({["system.resources.health.value"]: newValue});
    // this._createDamageChatMessage(actor, dmg.value, dmg.source);
  }

  _onApplyHealing(targetKey, healKey, modified) {
    const healModified = modified === "true" ? "modified" : "clear";
    const target = this.system.targets[targetKey];
    const heal = target.heal[healKey][healModified];

    const actor = this._getActor(target);
    if (!actor) return;

    const healType = heal.healType;
    const healAmount = heal.value;
    const health = actor.system.resources.health;

    if (healType === "heal") {
      const oldCurrent = health.current;
      let newCurrent = oldCurrent + healAmount;

      if (health.max <= newCurrent) {
        heal.source += ` -> (Overheal <b>${newCurrent - health.max}</b>)`;
        newCurrent = health.max;
      }
      actor.update({["system.resources.health.current"]: newCurrent});
      // this._createHealChatMessage(actor, newCurrent - oldCurrent, source);
    }
    if (healType === "temporary") {
      // Temporary HP do not stack it overrides
      const oldTemp = health.temp || 0;
      const newTemp = Math.max(healAmount, oldTemp);
      actor.update({["system.resources.health.temp"]: newTemp});
      // this._createTempHPChatMessage(actor, newTemp - oldTemp, source);
    }
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
    const roll = await rollFromSheet(actor, details);
    const rollTotal = roll.total;
    const rollSuccess = roll.total >= details.against;
    const label = (rollSuccess ? "Succeeded with " : "Failed with ") + rollTotal;
    target.rollOutcome = {
      total: rollTotal,
      success: rollSuccess,
      label: label
    };
    ui.chat.updateMessage(this);
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
    rollFromSheet(actor, details);
  }

  _getActor(target) {
    if (!target) return;
    const token = game.canvas.tokens.get(target.id);
    if (!token) return;
    const actor = token.actor;
    return actor;
  }

  //================================================
  //           HP CHANGE CHAT MESSAGES             =
  //================================================
  _createDamageChatMessage(actor, amount, source) {
    const color = "#780000";
    const icon = "fa-droplet";
    const text = `<i>${actor.name}</i> took <b>${amount}</b> damage.`;
    this._createHpChangeMessage(color, icon, text, source);
  }
  
  _createHealChatMessage(actor, amount, source) {
    const color = "#007802";
    const icon = "fa-heart";
    const text = `<i>${actor.name}</i> was healed by <b>${amount}</b> HP.`;
    this._createHpChangeMessage(color, icon, text, source);
  }
  
  _createTempHPChatMessage(actor, amount, source) {
    const color = "#707070";
    const icon = "fa-shield-halved";
    const text = `<i>${actor.name}</i> received <b>${amount}</b> temporary HP.`;
    this._createHpChangeMessage(color, icon, text, source);
  }
  
  _createHpChangeMessage(color, icon, text, source) {
    let sources = ""
    const shouldAddSources = game.settings.get("dc20rpg", "showSourceOfDamageOnChatMessage");
    if (shouldAddSources) sources = `<br><br><i class="fa-solid fa-calculator"></i> = ${source}.`;;
  
    const content = `<div style="font-size: 16px; color: ${color};">
                      <i class="fa fa-solid ${icon}"></i> ${text} ${sources}
                    </div>`;
  
    const message = {
      content: content
    };
    const gmOnly = !game.settings.get("dc20rpg", "showDamageChatMessage");
    if (gmOnly) message.whisper = DC20ChatMessage.getWhisperRecipients("GM");
    DC20ChatMessage.create(message);
  }
}