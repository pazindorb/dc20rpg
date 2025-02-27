import { getTokensInsideMeasurementTemplate } from "../helpers/actors/tokens.mjs";
import { createEffectOn, deleteEffectFrom, getEffectByKey, getEffectByName } from "../helpers/effects.mjs";

export class DC20MeasuredTemplateDocument extends MeasuredTemplateDocument {

  async applyEffectsToTokensInTemplate() {
    const flags = this.flags.dc20rpg;
    if (!flags) return;

    const applyEffects = flags.itemData.applyEffects;
    if (!applyEffects?.applyFor) return;
    if (!this.object) return;

    const alreadyApplied = new Set(flags.effectAppliedTokens);
    const tokens = getTokensInsideMeasurementTemplate(this.object);

    // TODO filter depending on disposition or display token selector
    
    // Add effects to new tokens
    const applied = new Set();
    for (const token of Object.values(tokens)) {
      if (alreadyApplied.has(token.id)) applied.add(token.id);
      else {
        const actor = token.actor;
        for (const effectData of applyEffects.effects) {
          await createEffectOn(effectData, actor);
        }
        applied.add(token.id);
      }
    }
    

    // Remove effects from tokens
    const removed = Array.from(alreadyApplied.difference(applied))
    const removedTokens = canvas.tokens.placeables.filter(token => removed.includes(token.id));
    for (const token of removedTokens) {
      const actor = token.actor;
      if (actor) {
        for (const effectData of applyEffects.effects) {
          let effect = getEffectByKey(effectData.flags.dc20rpg.effectKey, actor);
          if (!effect) effect = getEffectByName(effectData.name, actor);
          if (effect) await deleteEffectFrom(effect.id, actor);
        }
      }
    }

    // Set new applied tokens
    await this.update({["flags.dc20rpg.effectAppliedTokens"]: Array.from(applied)});
  }

  /** @override */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (userId === game.user.id) {
      this.applyEffectsToTokensInTemplate();
    }
  }

  /** @override */
  async _preDelete(options, user) {
    super._preDelete(options, user);
    
    // Remove effects connected to mesured template
    const flags = this.flags.dc20rpg;
    if (!flags) return;
    const applyEffects = flags.itemData.applyEffects;
    if (!applyEffects?.applyFor) return;
    if (!this.object) return;

    // Remove effects from tokens
    const alreadyApplied = flags.effectAppliedTokens;
    const removedTokens = canvas.tokens.placeables.filter(token => alreadyApplied.includes(token.id));
    for (const token of removedTokens) {
      const actor = token.actor;
      if (actor) {
        for (const effectData of applyEffects.effects) {
          let effect = getEffectByKey(effectData.flags.dc20rpg.effectKey, actor);
          if (!effect) effect = getEffectByName(effectData.name, actor);
          if (effect) await deleteEffectFrom(effect.id, actor);
        }
      }
    }
  }

}

let waitingForRefresh = false;
export async function checkMeasuredTemplateWithEffects() {
  if (waitingForRefresh === true) return;

  waitingForRefresh = true;
  await setTimeout(async () => {
    waitingForRefresh = false;
    for (const template of game.scenes.active.templates) {
      await template.applyEffectsToTokensInTemplate()
    }
  }, CONFIG.MeasuredTemplate.TEMPLATE_REFRESH_TIMEOUT);
}