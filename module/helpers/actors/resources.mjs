import { sendHealthChangeMessage } from "../../chat/chat-message.mjs";
import { DC20Target } from "../../subsystems/target/target.mjs";

//=============================================
//              CUSTOM RESOURCES              =
//=============================================
// TODO: Should we somehow mark monster as legendary and call this method there?
export function createLegenedaryResources(actor) {
  const lap = {
    name: "Legendary Action Points",
    img: "icons/commodities/currency/coin-embossed-sword-copper.webp",
    value: 3,
    maxFormula: "3",
    max: 0,
    reset: "roundEnd"
  }

  const bossPoints = {
    name: "Boss Points",
    img: "icons/commodities/bones/skull-hollow-orange.webp",
    value: 3,
    maxFormula: "3",
    max: 0,
    reset: ""
  }

  const updateData = {
    lap: lap,
    boss: bossPoints
  }
  actor.update({['system.resources.custom'] : updateData});
}

//=============================================
//              HP MANIPULATION               =
//=============================================
/** @deprecated since v0.10.0 until 0.10.5 */
export async function applyDamage(actor, dmg, options={}) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.tools.applyDamage' method is deprecated, and will be removed in the later system version. Use 'DC20Target.quickApplyDamageFor' instead.", { since: " 0.10.0", until: "0.10.5", once: true });
  return DC20Target.quickApplyDamageFor(actor, dmg, {}, options);
}

/** @deprecated since v0.10.0 until 0.10.5 */
export async function applyHealing(actor, heal, options={}) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.tools.applyHealing' method is deprecated, and will be removed in the later system version. Use 'DC20Target.quickApplyHealingFor' instead.", { since: " 0.10.0", until: "0.10.5", once: true });
  return DC20Target.quickApplyHealingFor(actor, heal, {}, options);
}