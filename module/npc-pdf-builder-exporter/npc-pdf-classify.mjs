import { get } from './npc-pdf-utils.mjs';
import { getDaItemApCost, getDaItemCustomCosts } from './npc-pdf-data.mjs';

// Classify items for sections (Features, Actions, Attack Enhancements, Reactions)
export function classifyDaItems(actor) {
  const items = Array.from(actor.items || []);
  const getAp = it => {
    const ap = getDaItemApCost(it);
    const n = ap == null ? null : Number(ap);
    return Number.isFinite(n) ? n : null;
  };

  const reactions = items.filter(it =>
    (it.type === 'feature' || it.type === 'weapon' || it.type === 'spell') &&
    get(it, 'system.isReaction', false) === true
  );
  const reactionIds = new Set(reactions.map(i => i.id));

  const techniques = items.filter(it => it.type === 'technique' && !reactionIds.has(it.id));

  const actions = items.filter(it => {
    if (reactionIds.has(it.id)) return false;
    if (it.type === 'weapon' || it.type === 'spell') return true;
    if (it.type === 'feature') {
      const ap = getAp(it);
      const hasCustom = getDaItemCustomCosts(it).length > 0;
      return (ap != null && ap > 0) || hasCustom;
    }
    return false;
  });

  const features = items.filter(it => {
    if (reactionIds.has(it.id)) return false;
    if (it.type !== 'feature') return false;
    const ap = getAp(it);
    const hasCustom = getDaItemCustomCosts(it).length > 0;
    return (ap == null || Number(ap) === 0) && !hasCustom;
  });

  return { features, actions, techniques, reactions };
}
