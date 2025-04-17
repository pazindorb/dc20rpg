import { getSimplePopup } from "../dialogs/simple-popup.mjs";
import { datasetOf, valueOf } from "../helpers/listenerEvents.mjs";

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
        slot: 20 - combatant.initiative,
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

    html.find('.change-dc').change(ev => this._changeinitiativeDC(valueOf(ev)));
  }

  _changeinitiativeDC(value) {
    const dc = parseInt(value);
    const combat = this.viewed;
    combat.update({['flags.dc20rpg.initiativeDC']: dc});
  }

    /** @override */
    async _onCombatantControl(event) {
      const dataset = datasetOf(event);
      event.stopPropagation();

      if (dataset.control === "addToSlot") {
        const combat = this.combats.find(combat => combat.active);
        const combatant = combat.combatants.get(dataset.combatantId);
        if (!combatant) return;
        
        const currentInitative = combat.combatant.initiative;
        if (currentInitative === null || currentInitative === undefined) combatant.update({initiative: 20});
        else await combatant.update({initiative: currentInitative - 1});
      }
      else if (dataset.control === "addSpecificToSlot") {
        const combat = this.combats.find(combat => combat.active);
        const combatant = combat.combatants.get(dataset.combatantId);
        if (!combatant) return;

        const selected = await getSimplePopup("select", {
          header: "Select Initiative Slot", selectOptions: {1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9, 10:10, 11:11, 12:12, 13:13, 14:14, 15:15, 16:16, 17:17, 18:18, 19:19, 20:20}
        });
        if (selected) await combatant.update({initiative: 20 - selected});
      }
      else {
        await super._onCombatantControl(event);
      }
    }
}