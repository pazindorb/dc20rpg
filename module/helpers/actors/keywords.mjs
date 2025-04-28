import { runTemporaryItemMacro } from "../macros.mjs";

export async function addUpdateItemToKeyword(actor, keyword, itemId, value) {
  let kw = actor.system.keywords[keyword];
  if (!kw) {
    kw = {
      value: value,
      updateItems: [itemId]
    }
  }
  else {
    kw.updateItems.push(itemId);
  }
  actor.update({[`system.keywords.${keyword}`]: kw});
}

export async function removeUpdateItemFromKeyword(actor, keyword, itemId) {
  let kw = actor.system.keywords[keyword];
  if (!kw) return;

  const updateItems = new Set(kw.updateItems);
  updateItems.delete(itemId);
  if (updateItems.size !== 0) actor.update({[`system.keywords.${keyword}.updateItems`]: Array.from(updateItems)});
  else actor.update({[`system.keywords.-=${keyword}`]: null});
}

export async function updateKeywordValue(actor, keyword, newValue) {
  let kw = actor.system.keywords[keyword];
  if (!kw) return;

  const updateItems = kw.updateItems;
  for (const itemId of updateItems) {
    const item = actor.items.get(itemId)
    if (item) await runTemporaryItemMacro(item, "onKeywordUpdate", actor, {keyword: keyword, newValue: newValue});
  }
  await actor.update({[`system.keywords.${keyword}.value`]: newValue});
}

export function removeKeyword(actor, keyword) {
  actor.update({[`system.keywords.-=${keyword}`]: null})
}

export function addNewKeyword(actor, keyword, value) {
  let kw = actor.system.keywords[keyword];
  if (kw) return;

  actor.update({[`system.keywords.${keyword}`]: {
    value: value,
    updateItems: []
  }});
}