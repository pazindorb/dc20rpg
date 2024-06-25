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
    this._prepareDisplayedTokens();
  }

  _prepareDisplayedTokens() {
    const rolls = this.system.chatFormattedRolls;
    const actionType = this.system.actionType;
    const defenceKey = this.system.targetDefence;
    const halfDmgOnMiss = this.system.halfDmgOnMiss;
    const conditionals = this.system.conditionals;

    let targets = [];
    if (this.system.applyToTargets) targets = this.system.targetedTokens;   // From targets
    else targets = this._tokensToTargets(getSelectedTokens())               // From selected tokens

    const displayedTokens = {};
    targets.forEach(target => {
      enhanceTarget(target, actionType, rolls.winningRoll, rolls.dmg, rolls.heal, defenceKey, halfDmgOnMiss, conditionals);
      displayedTokens[target.id] = target;
    });
    this.system.tokens = displayedTokens;
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
    html.find('.token-selection').click(() => this._onTokenSelectionSwap());
    html.find('.run-check-for-selected').click(ev => {
      ev.stopPropagation();
      this._prepareDisplayedTokens();
      ui.chat.updateMessage(this);
    });

    html.find('.modify-roll').click(ev => this._modifyRoll(datasetOf(ev).direction, datasetOf(ev).modified, datasetOf(ev).path));

    // Buttons
    html.find('.roll-save').click(ev => this._callOnTokens(ev, "save"));
    html.find('.roll-check').click(ev => this._callOnTokens(ev, "check"));
    html.find('.applicable').click(ev => this._callOnTokens(ev, datasetOf(ev).type));
  }

  _onActivable(path) {
     let value = getValueFromPath(this, path);
     setValueForPath(this, path, !value);
     ui.chat.updateMessage(this);
  }

  _onTokenSelectionSwap() {
    this.system.applyToTargets = !this.system.applyToTargets;
    this._prepareDisplayedTokens();
    ui.chat.updateMessage(this);
  }

  _modifyRoll(direction, modified, path) {
    modified = modified === "true";
    const extra = direction === "up" ? 1 : -1;
    const source = (direction === "up" ? " + 1 " : " - 1 ") + "(Manual)";

    const roll = getValueFromPath(this, path);
    if (modified) {
      roll.modified.value += extra;
      roll.modified.source += source;
    }
    else {
      roll.clear.value += extra;
      roll.clear.source += source;
    }
    ui.chat.updateMessage(this);
  }


  //================================================
  //              TOKEN MANIPULATIONS              =
  //================================================
  _callOnTokens(event, type) {
    event.preventDefault();
    event.stopPropagation();
    const dataset = event.currentTarget.dataset;
    const selectedTokens = getSelectedTokens();
    if (selectedTokens.length === 0) return;

    selectedTokens.forEach(async (token) => {
      const actor = token.actor;
      switch (type) {
        case "save": this._rollSave(actor, dataset); break;
        case "check": this._rollCheck(actor, dataset); break;
        case "dmg": this._applyDamage(actor, dataset); break;
        case "heal": this._applyHealing(actor, dataset); break;
      }
    })
  }

  _rollSave(actor, dataset) {
    const key = dataset.key;
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
      against: parseInt(dataset.dc)
    }
    rollFromSheet(actor, details);
  }

  _rollCheck(actor, dataset) {
    const key = dataset.key;
    if (["phy", "men", "mig", "agi", "int", "cha"].includes(key)) {
      dataset.dc = dataset.against;      // For saves we want to roll against dynamic DC provided by contest 
      this._rollSave(actor, dataset);
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
      against: parseInt(dataset.against)
    }
    rollFromSheet(actor, details);
  }

  _applyHealing(actor, dataset) {
    const healAmount = parseInt(dataset.heal);
    const healType = dataset.healType;
    const health = actor.system.resources.health;
    let source = dataset.source;

    switch (healType) {
      case "heal": 
        const oldCurrent = health.current;
        let newCurrent = health.current + healAmount;

        if (health.max <= newCurrent) {
          source += ` -> (Overheal <b>${newCurrent - health.max}</b>)`;
          newCurrent = health.max;
        }
        actor.update({["system.resources.health.current"]: newCurrent});
        this._createHealChatMessage(actor, newCurrent - oldCurrent, source);
        break;
      case "temporary":
        const oldTemp = health.temp || 0;
        const newTemp = oldTemp + healAmount;
        actor.update({["system.resources.health.temp"]: newTemp});
        this._createTempHPChatMessage(actor, newTemp - oldTemp, source);
        break;
      case "max":
        const newMax = (health.tempMax ? health.tempMax : 0) + healAmount;
        actor.update({["system.resources.health.tempMax"]: newMax});
        break;
    }
  }

  _applyDamage(actor, dataset) {
    const dmgType = dataset.dmgType;
    const defenceKey = dataset.defence;
    const isCritHit = dataset.crit === "true";
    const isCritMiss = dataset.miss === "true";
    const halfDmgOnMiss = dataset.halfOnMiss === "true";
    const health = actor.system.resources.health;
    const damageReduction = actor.system.damageReduction;
    
    let hit = -1;
    let dmg = {
      value: parseInt(dataset.dmg),
      source: dataset.source
    }
    let halfDmg = false;

    // Flat Damage is always applied as flat value
    if (dmgType === "flat" || dmgType === "") {
      const newValue = health.value - dmg.value;
      actor.update({["system.resources.health.value"]: newValue});
      this._createDamageChatMessage(actor, dmg.value, "Damage")
      return;
    }
  
    
    // Attack Check specific calculations
    if (defenceKey) {
      const rollTotal = dataset.total ? parseInt(dataset.total) : null;
      const modified = dataset.modified === "true";
      const defence = actor.system.defences[defenceKey].value;

      // Physical or Mystical damagee reduction or 
      const drKey = ["radiant", "umbral", "sonic", "psychic"].includes(dmgType) ? "mdr" : "pdr";
      // True dmg cannot be reduced
      const dr = dmgType === "true" ? 0 : damageReduction[drKey].value;
      
      // Check if Attack Missed and if it should be zero or only halved
      hit = rollTotal - defence;
      if (!isCritHit && (hit < 0 || isCritMiss)) {
        if (halfDmgOnMiss) {
          halfDmg = true;
        } 
        else {
          const message = isCritMiss ? "Critical Miss" : "Miss"; 
          this._createDamageChatMessage(actor, 0, message);
          return;
        }
      }

      // Damage Reduction and Heavy/Brutal Hits
      dmg = this._applyAttackCheckDamageModifications(dmg, modified, defence, rollTotal, dr);
    }

    // Apply conditional damage (weapon maneuvers, impact and other)
    if (dataset.conditionals) {
      const conditionals = JSON.parse(dataset.conditionals);
      conditionals.forEach(con => {
        const condition = con.condition;
        try {
        const conFun = new Function('hit', 'crit', 'target', `return ${condition};`);
        if (conFun(hit, isCritHit, actor)) {
          dmg.source += ` + ${con.name}`;
          dmg.value += parseInt(con.bonus);
        }

      } catch (e) {
        console.warn(`Cannot evaluate '${condition}' condition: ${e}`);
      }
      });
    }

    // Vulnerability, Resistance and other (True dmg cannot be modified)
    if (dmgType != "true") {
      const damageType = damageReduction.damageTypes[dmgType];
      dmg = this._applyOtherDamageModifications(dmg, damageType);
    }

    // Half the final dmg taken on miss 
    if (halfDmg) {
      dmg.source += ` - Miss(Half Damage)`;
      dmg.value = Math.ceil(dmg.value/2);  
    }

    const newValue = health.value - dmg.value;
    actor.update({["system.resources.health.value"]: newValue});
    this._createDamageChatMessage(actor, dmg.value, dmg.source);
  }

  _applyAttackCheckDamageModifications(dmg, modified, defence, rollTotal, dr) {
    if (rollTotal === null) return dmg;     // We want to check armor class only for attacks

    const hit = rollTotal - defence;
    const extraDmg = Math.max(Math.floor(hit/5), 0);
    // Apply damage reduction
    if (extraDmg === 0 && dr > 0) {
      dmg.source += " - Damage Reduction";
      dmg.value -= dr
      return dmg; 
    }

    // Only modified rolls can apply Heavy Hit, Brutal Hit dmg
    if (!modified) return dmg;

    // Add dmg from Heavy Hit, Brutal Hit etc.
    if (extraDmg === 1) dmg.source += " + Heavy Hit";
    if (extraDmg === 2) dmg.source += " + Brutal Hit";
    if (extraDmg >= 3) dmg.source += ` + Brutal Hit(over ${extraDmg * 5})`;
    dmg.value += extraDmg
    return dmg;  
  }

  _applyOtherDamageModifications(dmg, damageType) {
    // STEP 1 - Adding & Subtracting
    // Resist X
    if (damageType.resist > 0) {
      dmg.source += ` - Resistance(${damageType.resist})`;
      dmg.value -= damageType.resist;
    }
    // Vulnerable X
    if (damageType.vulnerable > 0) {
      dmg.source += ` + Vulnerability(${damageType.vulnerable})`;
      dmg.value += damageType.vulnerable; 
    }
    dmg.value = dmg.value > 0 ? dmg.value : 0;

    // STEP 2 - Doubling & Halving
    // Immunity
    if (damageType.immune) {
      dmg.source = "Resistance(Immune)";
      dmg.value = 0;
      return dmg;
    }
    // Resistance and Vulnerability - cancel each other
    if (damageType.resistance && damageType.vulnerability) return dmg;
    // Resistance
    if (damageType.resistance) {
      dmg.source += ` - Resistance(Half)`;
      dmg.value = Math.ceil(dmg.value/2);  
    }
    // Vulnerability
    if (damageType.vulnerability) {
      dmg.source += ` + Vulnerability(Half)`;
      dmg.value = dmg.value * 2; 
    }

    return dmg;
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