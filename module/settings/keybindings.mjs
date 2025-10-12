export function registerSystemKeybindings() {
  // End Turn
  game.keybindings.register("dc20rpg", `endTurn`, {
      name: `Token Hotbar End Turn`,
      editable: [{key: "Period"}],
      onDown: context => _onEndTurn(context),
      precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
    });

  const defaultKeybindings = [
    "Digit1", "Digit2", "Digit3", "Digit4", "Digit5",
    "Digit6", "Digit7", "Digit8", "Digit9", "Digit0",

  ];

  // Section A
  for (let i = 0; i < 36; i++) {
    const keybinding = {
      name: `[Section A] Token Hotbar Slot (${i+1})`,
      editable: [],
      onDown: context => _onItemSlot(context, i, "sectionA"),
      precedence: CONST.KEYBINDING_PRECEDENCE.DEFERRED,
    }
    if (defaultKeybindings[i]) keybinding.editable.push({key: defaultKeybindings[i]});
    game.keybindings.register("dc20rpg", `tokenHotbarA${i}`, keybinding);
  }

  // Section B
  for (let i = 0; i < 36; i++) {
    const keybinding = {
      name: `[Section B] Token Hotbar Slot (${i+1})`,
      editable: [],
      onDown: context => _onItemSlot(context, i, "sectionB"),
      precedence: CONST.KEYBINDING_PRECEDENCE.DEFERRED,
    }
    game.keybindings.register("dc20rpg", `tokenHotbarB${i}`, keybinding);
  }
}

function _onItemSlot(context, index, section) {
  if (!ui.hotbar.showTokenHotbar) return;
  ui.hotbar.rollItemSlot(index, section);
}

function _onEndTurn(context) {
  if (!ui.hotbar.showTokenHotbar) return;
  ui.hotbar._onEndTurn();
}

export function overrideCoreKeybindActions() {
  // Override default Macro Hotbar Keybinding to check if Token Hotbar is active
  for (let i = 0; i <= 9; i++) {
    const keybinding = game.keybindings.activeKeys.get(`Digit${i}`).find(x => x.action === `core.executeMacro${i}`);
    if (!keybinding) continue;

    const originalOnDown = keybinding.onDown;
    keybinding.onDown = (context, i) => {
      if (ui.hotbar.showTokenHotbar) return;
      originalOnDown(context, i);
    }
  }
}