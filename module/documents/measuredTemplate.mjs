import { TokenSelector } from "../dialogs/token-selector.mjs";
import { getTokensInsideMeasurementTemplate } from "../helpers/actors/tokens.mjs";
import { createEffectOn, deleteEffectFrom, getEffectByKey, getEffectByName } from "../helpers/effects.mjs";

export class DC20MeasuredTemplateDocument extends MeasuredTemplateDocument {

  prepareData() {
    super.prepareData();

    if (this.flags.dc20rpg?.hideHighlight && canvas.interface) {
      const highlight = canvas.interface.grid.highlightLayers[`MeasuredTemplate.${this.id}`];
      if (highlight) highlight.visible = false;
    }
  }

  async applyEffectsToTokensInTemplate() {
    const flags = this.flags.dc20rpg;
    if (!flags) return;

    const applyEffects = flags.itemData.applyEffects;
    if (!applyEffects?.applyFor) return;
    if (!this.object) return;

    // Determine disposition
    let dispositionOptions = [];
    if (applyEffects.applyFor === "enemy" || applyEffects.applyFor === "ally") {
      let casterDisposition;
      if (flags.itemData.tokenId) {
        const token = canvas.tokens.placeables.find(token => token.id === flags.itemData.tokenId);
        if (token) casterDisposition = token.disposition;
      }
      if (casterDisposition === undefined) {
        const actor = game.actors.get(flags.itemData.actorId);
        if (actor) casterDisposition = actor.prototypeToken.disposition;
      }

      const neutral = game.settings.get("dc20rpg", "neutralDispositionIdentity");
      if (applyEffects.applyFor === "ally") {
        let allyOfNeutralToken = 0;
        if (neutral === "friendly" && casterDisposition >= 0) {
          dispositionOptions.push(0);
          allyOfNeutralToken = 1;
        }
        if (neutral === "hostile" && casterDisposition <= 0) {
          dispositionOptions.push(0);
          allyOfNeutralToken = -1;
        }

        switch(casterDisposition) {
          case -2: break;
          case -1: dispositionOptions.push(-1); break;
          case 0: dispositionOptions.push(allyOfNeutralToken); break;
          case 1: dispositionOptions.push(1); break;
        }
      }
      else {
        if (neutral === "friendly" && casterDisposition < 0) dispositionOptions.push(0);
        if (neutral === "hostile" && casterDisposition > 0) dispositionOptions.push(0);
        if (neutral === "separated" && casterDisposition !== 0) dispositionOptions.push(0);

        switch(casterDisposition) {
          case -2: break;
          case -1: dispositionOptions.push(1); break;
          case 1: dispositionOptions.push(-1); break;
          case 0: 
            if (neutral === "friendly") dispositionOptions.push(-1)
            if (neutral === "hostile") dispositionOptions.push(1)
            if (neutral === "separated") {
              dispositionOptions.push(1);
              dispositionOptions.push(-1)
            }
        }
      }
    }

    const alreadyApplied = new Set(flags.effectAppliedTokens);
    const tokens = getTokensInsideMeasurementTemplate(this.object, dispositionOptions);
    
    // Collect tokens in template that effects should be applied to
    const tokensToConfirm = [];
    const applied = new Set();
    for (const token of Object.values(tokens)) {
      if (alreadyApplied.has(token.id)) applied.add(token.id);
      else {
        applied.add(token.id);
        tokensToConfirm.push(token);
      }
    }
    
    // Confirm effect application
    if (tokensToConfirm.length > 0) {
      const confirmedTokens = applyEffects.applyFor === "selector" ? await TokenSelector.open(tokensToConfirm, "Apply Effect to tokens?") : tokensToConfirm;
      for (const token of confirmedTokens) {
        const actor = token.actor;
        for (const effectData of applyEffects.effects) {
          await createEffectOn(effectData, actor);
        }
      }
    }

    // Remove effects from tokens
    const removed = Array.from(alreadyApplied.difference(applied))
    const removedTokens = canvas.tokens.placeables.filter(token => removed.includes(token.id));
    for (const token of removedTokens) {
      const actor = token.actor;
      if (actor) {
        for (const effectData of applyEffects.effects) {
          let effect = getEffectByKey(effectData.flags.dc20rpg?.effectKey, actor);
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
      if ((changed.hasOwnProperty("x") || changed.hasOwnProperty("y")) && !changed.skipUpdateCheck) {
        this.applyEffectsToTokensInTemplate();
      }
      if (this.flags.dc20rpg?.hideHighlight) {
        canvas.interface.grid.highlightLayers[`MeasuredTemplate.${this.id}`].visible = false;
      }
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
          let effect = getEffectByKey(effectData.flags.dc20rpg?.effectKey, actor);
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