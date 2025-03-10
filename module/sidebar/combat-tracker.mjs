import { valueOf } from "../helpers/listenerEvents.mjs";

export class DC20RpgCombatTracker extends CombatTracker {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "combat",
      template: "systems/dc20rpg/templates/sidebar/combat-tracker.hbs",
      title: "COMBAT.SidebarTitle",
      scrollY: [".directory-list"]
    });
  }

  /** @override */
  async getData(options={}) {
    const context = await super.getData(options);
    context.turns = await this._prepareTurnsWithCharacterType();
    return context;
  }

  async _prepareTurnsWithCharacterType() {
    const combat = this.viewed;
    const hasCombat = combat !== null;
    if ( !hasCombat ) return context;

    // Format information about each combatant in the encounter
    let hasDecimals = false;
    const turns = [];
    const skipped = new Map();
    for ( let [i, combatant] of combat.turns.entries() ) {
      if ( !combatant.visible ) continue;

      // Prepare turn data
      const resource = combatant.permission >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER ? combatant.resource : null;
      const turn = {
        id: combatant.id,
        name: combatant.name,
        canRollInitiative: combatant.canRollInitiative,
        img: await this._getCombatantThumbnail(combatant),
        active: i === combat.turn,
        owner: combatant.isOwner,
        defeated: combatant.isDefeated,
        hidden: combatant.hidden,
        initiative: combatant.initiative,
        hasRolled: combatant.initiative !== null,
        hasResource: resource !== null,
        resource: resource,
        canPing: (combatant.sceneId === canvas.scene?.id) && game.user.hasPermission("PING_CANVAS"),
        companions: combatant.companions || []
      };
      if ( (turn.initiative !== null) && !Number.isInteger(turn.initiative) ) hasDecimals = true;
      turn.css = [
        turn.active ? "active" : "",
        turn.hidden ? "hidden" : "",
        turn.defeated ? "defeated" : ""
      ].join(" ").trim();

      // Actor and Token status effects
      turn.effects = new Set();
      for ( const effect of (combatant.actor?.temporaryEffects || []) ) {
        if ( effect.statuses.has(CONFIG.specialStatusEffects.DEFEATED) ) turn.defeated = true;
        else if ( effect.img ) turn.effects.add(effect.img);
      }
      if (combatant.skip) skipped.set(combatant.id, turn); 
      else turns.push(turn);
    }

    // Link skipped companions to its owners
    turns.forEach(turn => {
      const companionTurn = [];
      turn.companions.forEach(compCombatantId => {
        const compCombatant = skipped.get(compCombatantId);
        if (compCombatant) companionTurn.push(compCombatant)
      })
      turn.companionTurn = companionTurn;
    });

    // Format initiative numeric precision
    const precision = CONFIG.Combat.initiative.decimals;
    turns.forEach(t => {
      if ( t.initiative !== null ) t.initiative = t.initiative.toFixed(hasDecimals ? precision : 0);
    });

    return turns;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find('.change-dc').change(ev => this._changeEncounterDC(valueOf(ev)));
  }

  _changeEncounterDC(value) {
    const dc = parseInt(value);
    const combat = this.viewed;
    combat.update({['flags.dc20rpg.encounterDC']: dc});
  }

    /** @override */
    async _onCombatControl(event) {
      event.preventDefault();
      // If we are starting combat we need to make sure encounterDC flag is set
      const combat = this.viewed;
      const encounterDC = combat.flags.dc20rpg?.encounterDC;
      const startCombat = event.currentTarget.dataset.control === "startCombat";
      if (startCombat && !encounterDC) {
        ui.notifications.error(game.i18n.localize("dc20rpg.combatTracker.provideDC"));
        return;
      }
      await super._onCombatControl(event);
    }
}