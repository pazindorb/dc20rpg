/** @deprecated since v0.11.0 until 0.11.5 */
export async function makeMoveAction(actor, options={}) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.tools.makeMoveAction' method is deprecated, and will be removed in the later system version. Use 'actor.move.moveAction' instead.", { since: " 0.11.0", until: "0.11.5", once: true });
  await actor.move.moveAction(options);
}