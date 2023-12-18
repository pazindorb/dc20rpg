import { createHPChangeChatMessage } from "../../chat/chat.mjs";
import { DC20RPG } from "../config.mjs";
import { getLabelFromKey } from "../utils.mjs";
import { rollFromFormula } from "./rollsFromActor.mjs";

export async function getSelectedTokens() {
  if (canvas.activeLayer === canvas.tokens)
      return canvas.activeLayer.placeables.filter(p => p.controlled === true);
}

/**
 * Calls rollFromFormula for selected tokens.
 */
export async function rollForTokens(event, type) {
  event.preventDefault();
  const dataset = event.currentTarget.dataset;
  const selectedTokens = await getSelectedTokens();
  if (selectedTokens.length === 0) return;

  selectedTokens.forEach(async (token) => {
    const actor = await token.actor;
    switch (type) {
      case "save": _rollSave(actor, dataset); break;
      case "check": _rollCheck(actor, dataset); break;
      case "dmg": _applyDamage(actor, dataset); break;
      case "heal": _applyHealing(actor, dataset); break;
    }
  })
}

function _rollSave(actor, dataset) {
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

  let label = getLabelFromKey(key, DC20RPG.saveTypes) + " Save";
  const formula = `d20 + ${save}`;
  rollFromFormula(formula, label, actor, true);
}

function _rollCheck(actor, dataset) {
  const key = dataset.key;
  if (["phy", "men", "mig", "agi", "int", "cha"].includes(key)) {
    _rollSave(actor, dataset);
    return;
  }
  let modifier = "";

  switch (key) {
    case "att":
      modifier = actor.system.attackMod.value.martial;
      break;

    case "spe":
      modifier = actor.system.attackMod.value.spell;
      break;

    case "mar": 
      const acrModifier = actor.system.skills.acr.modifier;
      const athModifier = actor.system.skills.ath.modifier;
      modifier = acrModifier >= athModifier ? acrModifier : athModifier;
      break;

    default:
      modifier = actor.system.skills[key].modifier;
      break;
  } 

  let label = getLabelFromKey(key, DC20RPG.checks) + " Check";
  const formula = `d20 + ${modifier}`;
  rollFromFormula(formula, label, actor, true);
}

function _applyHealing(actor, dataset) {
  const healAmount = parseInt(dataset.heal);
  const healType = dataset.healType;
  const health = actor.system.resources.health;

  switch (healType) {
    case "heal": 
      let newCurrent = health.current + healAmount;
      newCurrent = health.max <= newCurrent ? health.max : newCurrent;
      const newValue = newCurrent + health.temp;
      actor.update({["system.resources.health.value"]: newValue});
      break;
    case "temporary":
      const newTemp = (health.temp ? health.temp : 0) + healAmount;
      actor.update({["system.resources.health.temp"]: newTemp});
      break;
    case "max":
      const newMax = (health.tempMax ? health.tempMax : 0) + healAmount;
      actor.update({["system.resources.health.tempMax"]: newMax});
      break;
  }
}

function _applyDamage(actor, dataset) {
  const rollTotal = dataset.total ? parseInt(dataset.total) : null;
  let value = parseInt(dataset.dmg);
  const dmgType = dataset.dmgType;
  const health = actor.system.resources.health;
  

  if (dmgType === "true" || dmgType === "") {
    const newValue = health.value - value;
    actor.update({["system.resources.health.value"]: newValue});
    return;
  }

  const damageReduction = actor.system.damageReduction;
  let defenceKey = "physical";
  let drKey = "pdr";
  if (["holy", "unholy", "sonic", "psychic"].includes(dmgType)) {
    defenceKey = "mental";
    drKey = "mdr";
  }
  const defence = actor.system.defences[defenceKey].value;
  const dr = damageReduction[drKey].value;
  value = _calculateHitDamage(value, defence, rollTotal, dr);

  const damageType = damageReduction.damageTypes[dmgType];
  value = _calcualteFinalDamage(value, damageType);

  const newValue = health.value - value;
  actor.update({["system.resources.health.value"]: newValue});
}

function _calculateHitDamage(dmg, defence, rollTotal, dr) {
  if (rollTotal === null) return dmg;     // We want to check armor class only for attacks

  let extraDmg = 0;
  const hit = rollTotal - defence;
  if (hit < 0) return 0;

  extraDmg = Math.floor(hit/5);
  if (extraDmg === 0) return dmg - dr;    // Apply damage reduction
  return dmg + extraDmg;                  // Add dmg from Heavy Hit, Brutal Hit etc.
}

function _calcualteFinalDamage(dmg, damageType) {
  dmg += damageType.vulnerable;                          // Vulnerable X
  dmg -= damageType.resist                               // Resist X
  dmg = dmg > 0 ? dmg : 0;

  if (damageType.immune) dmg = 0;                        // Immunity
  if (damageType.resistance) dmg = Math.ceil(dmg/2);     // Resistance
  if (damageType.vulnerability) dmg = dmg * 2;           // Vulnerability

  return dmg;
}

export function updateActorHp(actor, updateData) {
  if (updateData.system && updateData.system.resources && updateData.system.resources.health) {
    // When value (temporary + current hp) was changed
    if (updateData.system.resources.health.value !== undefined) {
      const actorsHealth = actor.system.resources.health;
      const newValue = updateData.system.resources.health.value;
      const currentHp = actorsHealth.current;
      const tempHp = actorsHealth.temp ? actorsHealth.temp : 0;
      const oldValue = actorsHealth.value;
      const maxHp = actorsHealth.max;
  
      if (newValue >= oldValue) {
        const newCurrentHp = Math.min(newValue - tempHp, maxHp);
        const newTempHp = newValue - newCurrentHp > 0 ? newValue - newCurrentHp : null;
        updateData.system.resources.health.current = newCurrentHp;
        updateData.system.resources.health.temp = newTempHp;
        createHPChangeChatMessage(actor, newValue - oldValue, "healing");
      }
  
      else {
        const valueDif = oldValue - newValue;
        const remainingTempHp = tempHp - valueDif;
        if (remainingTempHp <= 0) {
          updateData.system.resources.health.temp = null;
          updateData.system.resources.health.current = currentHp + remainingTempHp;
        }
        else {
          updateData.system.resources.health.temp = remainingTempHp;
        }
        createHPChangeChatMessage(actor, newValue - oldValue, "damage");
      }
    }

    // When only temporary HP was changed
    else if (updateData.system.resources.health.temp !== undefined) {
      const newTempHp = updateData.system.resources.health.temp;
      const tempHp = actor.system.resources.health.temp ? actor.system.resources.health.temp : 0;
      createHPChangeChatMessage(actor, newTempHp - tempHp, "temporary");
    }
  }
  return updateData;
}

/**
 * Called when new actor is created, makes simple pre-configuration 
 * of actor's prototype token depending on actor type.
 */
export function preConfigurePrototype(actor) {
  let prototypeToken = actor.prototypeToken;
  prototypeToken.displayBars = 20;
  prototypeToken.displayName = 20;
  if (actor.type === "character") {
    prototypeToken.actorLink = true;
    prototypeToken.disposition = 1;
  }
  actor.update({['prototypeToken'] : prototypeToken});
}