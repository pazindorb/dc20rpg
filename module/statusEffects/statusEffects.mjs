export function registerDC20Statues() {
  return [
    _bleeding(),
    _blinded(),
    _burning(),
    _charmed(),

    _dazed(),
    _deafened(),
    _disoriented(),
    _doomed(),

    _exhaustion(),
    _exposed(),
    _frightened(),
    _grappled(),

    _hindered(),
    _immobilized(),
    _impaired(),
    _incapacitated(),

    _intimidated(),
    _invisible(),
    _paralyzed(),
    _petrified(),

    _prone(),
    _restrained(),
    _slowed(),
    _stunned(),

    _surprised(), 
    _taunted(),
    _tethered(),
    _terrified(),

    _unconscious(),
    _weakened(),
    
    _bloodied(),
    _wellBloodied(),
    _dead(),
    _deathsDoor(),

    _partiallyConcealed(),
    _fullyConcealed(),
    _unseen(),
    _unheard(),

    _hidden(),
    _halfCover(),
    _tqCover(),
    _fullyStunned(),
  ]
}

//================================
//             EXTRA             =
//================================
function _bloodied() {
  return {
    id: "bloodied",
    name: "Bloodied",
    label: "Bloodied",
    stackable: false,
    system: {
      statusId: "bloodied",
      hide: true
    },
    statuses: [],
    img: "systems/dc20rpg/images/statuses/bloodied.svg",
    description: "<p>You have less than 50% max HP.</p>",
    changes: []
  }
}
function _wellBloodied() {
  return {
    id: "wellBloodied",
    name: "Well-Bloodied",
    label: "Well-Bloodied",
    stackable: false,
    system: {
      statusId: "wellBloodied",
      hide: true
    },
    statuses: [],
    img: "systems/dc20rpg/images/statuses/wellBloodied.svg",
    description: "<p>You have less than 25% max HP.</p>",
    changes: []
  }
}
function _dead() {
  return {
    id: "dead",
    name: "Dead",
    label: "Dead",
    stackable: false,
    system: {
      statusId: "dead",
    },
    flags: {
      core: {
        overlay: true
      }
    },
    statuses: [],
    img: "systems/dc20rpg/images/statuses/dead.svg",
    description: "<p>You are dead.</p>",
    changes: []
  }
}
function _deathsDoor() {
  return {
    id: "deathsDoor",
    name: "Death's Door",
    label: "Death's Door",
    stackable: false,
    system: {
      statusId: "deathsDoor",
      hide: true,
      enableStatusOnCreation: ["exhaustion"]
    },
    statuses: [],
    img: "systems/dc20rpg/images/statuses/deathsDoor.svg",
    description: `
    <p>Until you are restored to 1 HP or higher, you suffer the following effects:</p>
    <ul>
        <li><em><strong>Action Point Limit:</strong></em> Your current and maximum <strong>AP</strong> are reduced by 3.</li>
    </ul>
    <ul>
        <li><strong>Death Save: </strong>You must make a <strong>DC 10</strong> Death Save at the start of each of your turns (see <strong>Death</strong> <strong>Saves</strong> for more information).</li>
    </ul>
    `,
    changes: [
      {
        key: "system.globalModifier.prevent.goUnderAP",
        mode: 4,
        priority: undefined,
        value: 3
      }
    ]
  }
}
function _partiallyConcealed() {
  return {
    id: "partiallyConcealed",
    name: "Partially Concealed",
    label: "Partially Concealed",
    stackable: false,
    system: {
      statusId: "partiallyConcealed"
    },
    statuses: [],
    img: "systems/dc20rpg/images/statuses/partiallyConcealed.svg",
    description: `
    <p>A creature is Partially Concealed while within an area of thin fog, moderate foliage, or Dim Light. Creatures have DisADV on Awareness Checks made to see things that are Partially Concealed.</p>
    `,
    changes: [
      {
        key: "system.rollLevel.againstYou.skills",
        mode: 2,
        priority: undefined,
        value: '"label": "Partially Concealed", "value": 1, "type": "dis", "skill": "awa"'
      }
    ]
  }
}
function _fullyConcealed() {
  return {
    id: "fullyConcealed",
    name: "Fully Concealed",
    label: "Fully Concealed",
    stackable: false,
    system: {
      statusId: "fullyConcealed",
      enableStatusOnCreation: ["unseen"],
      disableStatusOnRemoval: ["unseen"]
    },
    statuses: [],
    img: "systems/dc20rpg/images/statuses/fullyConcealed.svg",
    description: `
    <p>A creature is Fully Concealed while in an area that blocks vision entirely, such as Darkness, thick fog, or dense foliage. Creatures are considered <strong>Blinded </strong>for the purposes of seeing things that are Fully Concealed.</p>
    `,
    changes: [
      {
        key: "system.rollLevel.againstYou.skills",
        mode: 2,
        priority: undefined,
        value: '"label": "Fully Concealed", "autoFail": true, "skill": "awa"'
      }
    ]
  }
}
function _unheard() {
    return {
    id: "unheard",
    name: "Unheard",
    label: "Unheard",
    stackable: false,
    system: {
      statusId: "unheard"
    },
    statuses: [],
    img: "systems/dc20rpg/images/statuses/unheard.svg",
    description: `
    <p>
      You are Unheard while you remain silent, talk no louder than a whisper, or are within an area effected by the Silence Spell or a similar effect. While Unheard, you're subjected to the following effects.
      <ul>
        <li>
          You have ADV on Attacks against creatures you're Flanking that can't hear you.
        </li>
      </ul>
    </p>
    `,
    changes: [
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unheard (You are Flanking enemy that can\'t hear you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unheard (You are Flanking enemy that can\'t hear you)", "confirmation": true'
      },
    ]
  }
}
function _unseen() {
  return {
    id: "unseen",
    name: "Unseen",
    label: "Unseen",
    stackable: false,
    system: {
      statusId: "unseen"
    },
    statuses: [],
    img: "systems/dc20rpg/images/statuses/unseen.svg",
    description: `
    <p>
      You are Unseen by a creature while you're imperceivable to its visual senses, such as when you're Fully Concealed, you're Invisible, or it's <strong>Blinded</strong>. While Unseen, you're subjected to the following effects.
      <ul>
        <li>
          You have ADV on Attacks against creatures that can't see you.
        </li>
        <li>
          Creatures that can't see you have DisADV on Attacks against you
        </li>
      </ul>
    </p>
    `,
    changes: [
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },      
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      }, 
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      }
    ]
  }
}
function _hidden() {
  return {
    id: "hidden",
    _id: "z2xmhm7ggruUq7i4",
    name: "Hidden",
    label: "Hidden",
    stackable: false,
    system: {
      statusId: "hidden"
    },
    statuses: ["unseen", "unheard"],
    img: "systems/dc20rpg/images/statuses/hidden.svg",
    description: `
    <p>You are Hidden from a creature while you are both <strong>Unseen</strong> and <strong>Unheard</strong> by it. Your location is unknown to creatures you're Hidden from.</p>
    `,
    changes: [
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unseen (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unheard (You are Flanking enemy that can\'t hear you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unheard (You are Flanking enemy that can\'t hear you)", "confirmation": true'
      }
    ]
  }
}
function _fullyStunned() {
  return {
    id: "fullyStunned",
    _id: "d02g03day8pp8en6",
    name: "Fully Stunned",
    label: "Fully Stunned",
    stackable: false,
    statuses: ["incapacitated"],
    system: {
      statusId: "fullyStunned",
      hide: true,
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/fullyStunned.svg",
    description: `
    <p>You are subjected to the following effects:</p>
    <ul>
        <li>
            <p>You're <strong>Incapacitated</strong>.</p>
        </li>
        <li>
            <p><span>Attacks against you have ADV.</span></p>
        </li>
        <li>
            <p>You automatically fail Physical Saves (except against Poisons and Diseases).</p>
        </li>
    </ul>
    `,
    changes: [
      {
        key: "system.globalModifier.prevent.goUnderAP",
        mode: 4,
        priority: undefined,
        value: 99
      },
      {
        key: "system.movement.ground.bonus",
        mode: 2,
        priority: undefined,
        value: -100
      },
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Fully Stunned"'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Fully Stunned"'
      },
      {
        key: "system.rollLevel.againstYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Fully Stunned"'
      },
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Fully Stunned"'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Fully Stunned"'
      },
      {
        key: "system.rollLevel.againstYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Fully Stunned"'
      },
      {
        key: "system.rollLevel.onYou.saves.mig",
        mode: 5,
        priority: undefined,
        value: '"label": "Fully Stunned", "autoFail": true, "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.saves.agi",
        mode: 5,
        priority: undefined,
        value: '"label": "Fully Stunned", "autoFail": true, "confirmation": true'
      }
    ]
  }
}
function _halfCover() {
  return {
    id: "halfCover",
    name: "Half Cover",
    label: "Half Cover",
    stackable: false,
    system: {
      statusId: "halfCover"
    },
    statuses: [],
    img: "systems/dc20rpg/images/statuses/halfCover.svg",
    description: `
    <p>All Attacks and Spell Checks against you have a -2 penalty.</p>
    `,
    changes: [
      {
        key: "system.globalModifier.provide.halfCover",
        mode: 5,
        priority: undefined,
        value: "true"
      }
    ]
  }
}
function _tqCover() {
  return {
    id: "tqCover",
    name: "3/4 Cover",
    label: "3/4 Cover",
    stackable: false,
    system: {
      statusId: "tqCover"
    },
    statuses: [],
    img: "systems/dc20rpg/images/statuses/tqCover.svg",
    description: `
    <p>All Attacks and Spell Checks against you have a -5 penalty.</p>
    `,
    changes: [
      {
        key: "system.globalModifier.provide.tqCover",
        mode: 5,
        priority: undefined,
        value: "true"
      }
    ]
  }
}

//================================
//           STACKING            =
//================================
function _bleeding() {
  return {
    id: "bleeding",
    name: "Bleeding",
    label: "Bleeding",
    stackable: true,
    statuses: [],
    system: {
      statusId: "bleeding",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/bleeding.svg",
    description: `
    <p>You take <strong>X</strong> True damage at the start of each of your turns.</p>
    <p><em><strong>Ending Bleeding:</strong></em> All stacks of the Condition end when you're subjected to an effect that restores your HP. Alternatively, a creature can attempt to remove 1 or more stacks of the Condition by taking the Medicine Action.</p>
    <p></p>
    <h4>Medicine (Action)</h4>
    <p>You can spend <strong>1 AP</strong> to touch a creature and tend to its wounds. Make a <strong>DC 10</strong> Medicine Check. <strong>Success (each 5):</strong> You end 1 stack of <strong>Bleeding</strong> on the target.</p>
    `,
    changes: [
      {
        key: "system.events",
        mode: 2,
        priority: undefined,
        value: '"eventType": "damage", "label": "Bleeding", "trigger": "turnStart", "value": 1, "type": "true"'
      },
      {
        key: "system.events",
        mode: 2,
        priority: undefined,
        value: '"eventType": "basic", "trigger": "healingTaken", "label": "Bleeding - Healed", "postTrigger": "delete"'
      }
    ]
  }
}
function _burning() {
  return {
    id: "burning",
    name: "Burning",
    label: "Burning",
    stackable: true,
    statuses: [],
    system: {
      statusId: "burning",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/burning.svg",
    description: `
    <p>You take <strong>X</strong> Fire damage at the start of each of your turns.</p>
    <p><em><strong>Ending Burning:</strong></em> All stacks of the Condition end when you're doused by at least 1 gallon (4 liters) of water or fully immersed in water. Alternatively, a creature within 1 Space can spend <strong>1 AP</strong> to remove 1 stack of the Condition.</p>
    `,
    changes: [
      {
        key: "system.events",
        mode: 2,
        priority: undefined,
        value: '"eventType": "damage", "label": "Burning", "trigger": "turnStart", "value": 1, "type": "fire"'
      },
    ]
  }
}
function _doomed() {
  return {
    id: "doomed",
    name: "Doomed",
    label: "Doomed",
    stackable: true,
    statuses: [],
    system: {
      statusId: "doomed",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/doomed.svg",
    description: `
    <p>You are subjected to the following effects:</p>
    <ul>
        <li>
            <p>Your current and maximum HP is reduced by the value of <strong>X</strong>.</p>
        </li>
        <li>
            <p>When an effect restores your HP, you regain <strong>X</strong> less HP than normal.</p>
        </li>
    </ul>
    `,
    changes: [
      {
        key: "system.resources.health.bonus",
        mode: 2,
        priority: undefined,
        value: -1
      },
      {
        key: "system.healingReduction.flat",
        mode: 2,
        priority: undefined,
        value: 1
      },
    ]
  }
}
function _exhaustion() {
  return {
    id: "exhaustion",
    name: "Exhaustion",
    label: "Exhaustion",
    stackable: true,
    statuses: [],
    system: {
      statusId: "exhaustion",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/exhaustion.svg",
    description: `
    <p>You are subjected to the following effects:</p>
    <ul>
        <li>
            <p>You gain a penalty equal to <strong>X</strong> on all Checks and Saves you make.</p>
        </li>
        <li>
            <p>Your Speed and Save DC is reduced by <strong>X</strong>.</p>
        </li>
    </ul>
    <p><strong>Death:</strong> You immediately die if you reach 6 stacks of <strong>Exhaustion</strong>.</p>
    <p id="1cf1b90a-e081-810b-86ea-fe594fcbeafa" class="block-color-blue_background"><strong>Example:</strong> If you have <strong>Exhaustion 3</strong>, then you would have a <strong>-3</strong> penalty on Checks and Saves, your Speed would be reduced by 3 Spaces, and your Save DC would be reduced by 3.</p>
    `,
    changes: []
  }
}
function _exposed() {
  return {
    id: "exposed",
    name: "Exposed",
    label: "Exposed",
    stackable: true,
    statuses: [],
    system: {
      statusId: "exposed",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/exposed.svg",
    description: "<p>Attacks against you have ADV <strong>X</strong>.</p>",
    changes: [
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Exposed"'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Exposed"'
      },
      {
        key: "system.rollLevel.againstYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Exposed"'
      },
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Exposed"'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Exposed"'
      },
      {
        key: "system.rollLevel.againstYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Exposed"'
      },
    ]
  }
}
function _hindered() {
  return {
    id: "hindered",
    name: "Hindered",
    label: "Hindered",
    stackable: true,
    statuses: [],
    system: {
      statusId: "hindered",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/hindered.svg",
    description: "<p>You have DisADV <strong>X</strong> on Attacks.</p>",
    changes: [
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Hindered"'
      },
      {
        key: "system.rollLevel.onYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Hindered"'
      },
      {
        key: "system.rollLevel.onYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Hindered"'
      },
      {
        key: "system.rollLevel.onYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Hindered"'
      },
      {
        key: "system.rollLevel.onYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Hindered"'
      },
      {
        key: "system.rollLevel.onYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Hindered"'
      },
      {
        key: "system.rollLevel.onYou.checks.att",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Hindered"'
      },
      {
        key: "system.rollLevel.onYou.checks.mar",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Hindered"'
      },
      {
        key: "system.rollLevel.onYou.checks.spe",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Hindered"'
      },
    ]
  }
}
function _dazed() {
  return {
    id: "dazed",
    name: "Dazed",
    label: "Dazed",
    stackable: true,
    statuses: [],
    system: {
      statusId: "dazed",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/dazed.svg",
    description: "<p>You have DisADV <strong>X</strong> on Mental Checks.</p>",
    changes: [
      {
        key: "system.rollLevel.onYou.checks.int",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Dazed"'
      },
      {
        key: "system.rollLevel.onYou.checks.cha",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Dazed"'
      },
      {
        key: "system.rollLevel.onYou.checks.spe",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Dazed"'
      },
      {
        key: "system.rollLevel.onYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Dazed"'
      },
      {
        key: "system.rollLevel.onYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Dazed"'
      },
      {
        key: "system.rollLevel.onYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Dazed"'
      },
    ]
  }
}
function _disoriented() {
  return {
    id: "disoriented",
    name: "Disoriented",
    label: "Disoriented",
    stackable: true,
    statuses: [],
    system: {
      statusId: "disoriented",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/disoriented.svg",
    description: "<p>You have DisADV X on <b>Mental Saves</b>.</p>",
    changes: [
      {
        key: "system.rollLevel.onYou.saves.int",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Disoriented"'
      },
      {
        key: "system.rollLevel.onYou.saves.cha",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Disoriented"'
      },
    ]
  }
}
function _impaired() {
  return {
    id: "impaired",
    name: "Impaired",
    label: "Impaired",
    stackable: true,
    system: {
      statusId: "impaired",
      condition: true
    },
    statuses: [],
    img: "systems/dc20rpg/images/statuses/impaired.svg",
    description: "<p>You have DisADV <strong>X</strong> on Physical Checks.</p>",
    changes: [
      {
        key: "system.rollLevel.onYou.checks.mig",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Impaired"'
      },
      {
        key: "system.rollLevel.onYou.checks.agi",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Impaired"'
      },
      {
        key: "system.rollLevel.onYou.checks.att",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Impaired"'
      },
      {
        key: "system.rollLevel.onYou.checks.mar",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Impaired"'
      },
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Impaired"'
      },
      {
        key: "system.rollLevel.onYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Impaired"'
      },
      {
        key: "system.rollLevel.onYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Impaired"'
      },
    ]
  }
}
function _weakened() {
  return {
    id: "weakened",
    name: "Weakened",
    label: "Weakened",
    stackable: true,
    statuses: [],
    system: {
      statusId: "weakened",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/weakened.svg",
    description: "<p>You have DisADV <strong>X</strong> on Physical Saves.</p>",
    changes: [
      {
        key: "system.rollLevel.onYou.saves.mig",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Weakened"'
      },
      {
        key: "system.rollLevel.onYou.saves.agi",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Weakened"'
      },
    ]
  }
}
function _slowed() {
  return {
    id: "slowed",
    name: "Slowed",
    label: "Slowed",
    stackable: true,
    statuses: [],
    system: {
      statusId: "slowed",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/slowed.svg",
    description: "<p>Every 1 Space you move costs an extra <strong>X</strong> Spaces of movement.</p>",
    changes: [
      {
        key: "system.moveCost",
        mode: 2,
        priority: undefined,
        value: 1
      },
    ]
  }
}
function _stunned() {
  return {
    id: "stunned",
    name: "Stunned",
    label: "Stunned",
    stackable: true,
    statuses: [],
    system: {
      statusId: "stunned",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/stunned.svg",
    description: `
    <p>Your current and maximum <strong>AP</strong> is reduced by <strong>X</strong>.</p>
    <p>While you're Stunned 4 or higher, you are subjected to the following effects:</p>
    <ul>
        <li>
            <p>You're <strong>Incapacitated</strong>.</p>
        </li>
        <li>
            <p><span>Attacks against you have ADV.</span></p>
        </li>
        <li>
            <p>You automatically fail Physical Saves (except against Poisons and Diseases).</p>
        </li>
    </ul>
    `,
    changes: [
      {
        key: "system.globalModifier.prevent.goUnderAP",
        mode: 2,
        priority: undefined,
        value: 1
      }
    ]
  }
}

//================================
//          OVERLAPPING          =
//================================
function _charmed() {
  return {
    id: "charmed",
    name: "Charmed",
    label: "Charmed",
    stackable: false,
    statuses: [],
    system: {
      statusId: "charmed",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/charmed.svg",
    description: `
    <p>You are subjected to the following effects:</p>
    <ul>
        <li>
            <p>Your Charmer has ADV on Charisma Checks made against you.</p>
        </li>
        <li>
            <p>You can't target your Charmer with harmful Attacks or effects.</p>
        </li>
    </ul>
    `,
    changes: [
      {
        key: "system.rollLevel.againstYou.checks.cha",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "You are the Charmer", "confirmation": true'
      }
    ]
  }
}
function _immobilized() {
  return {
    id: "immobilized",
    name: "Immobilized",
    label: "Immobilized",
    stackable: false,
    statuses: [],
    system: {
      statusId: "immobilized",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/immobilized.svg",
    description: "<p>You can't move and you have <strong>DisADV</strong> on Agility Saves.</p>",
    changes: [
      {
        key: "system.movement.ground.bonus",
        mode: 2,
        priority: undefined,
        value: -100
      },
      {
        key: "system.rollLevel.onYou.saves.agi",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Immobilized"'
      },
    ]
  }
}
function _intimidated() {
  return {
    id: "intimidated",
    name: "Intimidated",
    label: "Intimidated",
    stackable: false,
    statuses: [],
    system: {
      statusId: "intimidated",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/intimidated.svg",
    description: "<p>You have <strong>DisADV</strong> on all Checks made against the source.</p>",
    changes: [
      {
        key: "system.rollLevel.onYou.checks.mig",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Intimidated", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.checks.agi",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Intimidated", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.checks.int",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Intimidated", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.checks.cha",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Intimidated", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.checks.att",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Intimidated", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.checks.mar",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Intimidated", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.checks.spe",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Intimidated", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Intimidated", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Intimidated", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Intimidated", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Intimidated", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Intimidated", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Intimidated", "confirmation": true'
      },
    ]
  }
}
function _frightened() {
  return {
    id: "frightened",
    _id: "7j9cumkgsq6l264c",
    name: "Frightened",
    label: "Frightened",
    stackable: false,
    statuses: [],
    system: {
      statusId: "frightened",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/frightened.svg",
    description: `
    <p>You are subjected to the following effects:</p>
    <ul>
        <li>
            <p>You can't willingly move closer to the source.</p>
        </li>
        <li>
            <p>You have <strong>DisADV</strong> on all Checks made against the source.</p>
        </li>
    </ul>
    `,
    changes: [
      {
        key: "system.rollLevel.onYou.checks.mig",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.checks.agi",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.checks.int",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.checks.cha",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.checks.att",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.checks.mar",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.checks.spe",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened", "confirmation": true'
      },
    ]
  }
}
function _restrained() {
  return {
    id: "restrained",
    _id: "eo34ahey9m0d92ou",
    name: "Restrained",
    label: "Restrained",
    stackable: false,
    statuses: ["immobilized", "grappled"],
    system: {
      statusId: "restrained",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/restrained.svg",
    description: `
    <p>You are subjected to the following effects:</p>
    <ul>
        <li>
            <p>You're <strong>Immobilized</strong>.</p>
        </li>
        <li>
            <p>Your Attacks have DisADV.</p>
        </li>
        <li>
            <p>Attacks against you have ADV.</p>
        </li>
    </ul>
    `,
    changes: [
      {
        key: "system.movement.ground.bonus",
        mode: 2,
        priority: undefined,
        value: -100
      },
      {
        key: "system.rollLevel.onYou.saves.agi",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Restrained (Immobilized)"'
      },
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Restrained"'
      },
      {
        key: "system.rollLevel.onYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Restrained"'
      },
      {
        key: "system.rollLevel.onYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Restrained"'
      },
      {
        key: "system.rollLevel.onYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Restrained"'
      },
      {
        key: "system.rollLevel.onYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Restrained"'
      },
      {
        key: "system.rollLevel.onYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Restrained"'
      },
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Restrained"'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Restrained"'
      },
      {
        key: "system.rollLevel.againstYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Restrained"'
      },
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Restrained"'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Restrained"'
      },
      {
        key: "system.rollLevel.againstYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Restrained"'
      },
    ]
  }
}
function _taunted() {
  return {
    id: "taunted",
    name: "Taunted",
    label: "Taunted",
    stackable: false,
    statuses: [],
    system: {
      statusId: "taunted",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/taunted.svg",
    description: "<p>You have DisADV on Attacks against targets other than the source.</p>",
    changes: [
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Your Target is not your Taunt source", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Your Target is not your Taunt source", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Your Target is not your Taunt source", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Your Target is not your Taunt source", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Your Target is not your Taunt source", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Your Target is not your Taunt source", "confirmation": true'
      },
    ]
  }
}
function _tethered() {
  return {
    id: "tethered",
    name: "Tethered",
    label: "Tethered",
    stackable: false,
    statuses: [],
    system: {
      statusId: "tethered",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/tethered.svg",
    description: "<p>You are <strong>Tethered</strong> to a creature or Space. While <strong>Tethered</strong>, you can't move farther than the specified Spaces from the location of your Tether.</p>",
    changes: []
  }
}
function _terrified() {
  return {
    id: "terrified",
    name: "Terrified",
    label: "Terrified",
    stackable: false,
    statuses: [],
    system: {
      statusId: "terrified",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/terrified.svg",
    description: `
    <p>You are subjected to the following effects:</p>
    <ul>
        <li>
            <p>You must spend your turns trying to move as far away as you can from the source as possible.</p>
        </li>
        <li>
            <p>The only Action you can take is the Move Action to try to run away, or the Dodge Action if you are prevented from moving or there's nowhere farther to move.</p>
        </li>
    </ul>
    `,
    changes: []
  }
}

//================================
//         NON-STACKING          =
//================================
function _deafened() {
  return {
    id: "deafened",
    name: "Deafened",
    label: "Deafened",
    stackable: false,
    statuses: [],
    system: {
      statusId: "deafened",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/deafened.svg",
    description: `
    <p>You are subjected to the following effects:</p>
    <ul>
        <li>
            <p>You can't <span>hear </span>(see the <strong>Unheard</strong> section for more information).</p>
        </li>
    </ul>
    `,
    changes: [
      {
        key: "system.rollLevel.onYou.skills",
        mode: 2,
        priority: undefined,
        value: '"label": "Deafened", "confirmation": true, "autoFail": true, "skill": "awa"'
      }
    ]
  }
}
function _blinded() {
  return {
    id: "blinded",
    _id: "1pr5ps19nwoexcbv",
    name: "Blinded",
    label: "Blinded",
    stackable: false,
    statuses: [],
    system: {
      statusId: "blinded",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/blinded.svg",
    description: `
    <p>You are subjected to the following effects:</p>
    <ul>
        <li>
            <p>You can't see (see the <strong>Unseen</strong> section for more information).</p>
        </li>
        <li>
            <p>All terrain is considered Difficult Terrain for you unless you're guided by another creature.</p>
        </li>
    </ul>
    `,
    changes: [
      {
        key: "system.rollLevel.onYou.skills",
        mode: 2,
        priority: undefined,
        value: '"label": "Blinded", "confirmation": true, "autoFail": true, "skill": "awa"'
      },
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Blinded (Hindered)"'
      },
      {
        key: "system.rollLevel.onYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Blinded (Hindered)"'
      },
      {
        key: "system.rollLevel.onYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Blinded (Hindered)"'
      },
      {
        key: "system.rollLevel.onYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Blinded (Hindered)"'
      },
      {
        key: "system.rollLevel.onYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Blinded (Hindered)"'
      },
      {
        key: "system.rollLevel.onYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Blinded (Hindered)"'
      },
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Blinded (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Blinded (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Blinded (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Blinded (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Blinded (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Blinded (Exposed)"'
      },
    ]
  }
}
function _invisible() {
  return {
    id: "invisible",
    name: "Invisible",
    label: "Invisible",
    stackable: false,
    statuses: [],
    system: {
      statusId: "invisible"
    },
    img: "systems/dc20rpg/images/statuses/invisible.svg",
    description: "<p>Creatures can't see you unless they have the ability to see the Invisible (see the <strong>Unseen</strong> section for more information).</p>",
    changes: [
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Invisible (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Invisible (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Invisible (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Invisible (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Invisible (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Invisible (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Invisible (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Invisible (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Invisible (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Invisible (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Invisible (Enemy can\'t see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Invisible (Enemy can\'t see you)", "confirmation": true'
      }
    ]
  }
}
function _prone() {
  return {
    id: "prone",
    _id: "iukn5nvr42hwe85d",
    name: "Prone",
    label: "Prone",
    stackable: false,
    statuses: [],
    system: {
      statusId: "prone"
    },
    img: "systems/dc20rpg/images/statuses/prone.svg",
    description: `
    <p>While <strong>Prone</strong>, you're subjected to the following effects:</p>
    <ul>
        <li>
            <p>You have DisADV on Attacks, Ranged Attacks have DisADV against you, and Melee Attacks against you have ADV.</p>
        </li>
        <li>
            <p><strong>Crawl Speed:</strong> Until you stand up, your only movement option it to Crawl, which costs an extra 1 Space of movement for every Space moved.</p>
        </li>
    </ul>
    <p><strong>Ending Prone:</strong> You can end being Prone by spending 2 Spaces of movement to stand up.</p>
    <p><strong><span style="text-decoration: underline;">Prone in the Air</span></strong></p>
    <p>When you become Prone, you immediately enter an Uncontrolled Fall unless you're supported by a solid surface (see the <strong>Falling</strong> section for more information).</p>
    `,
    changes: [
      {
        key: "system.moveCost",
        mode: 2,
        priority: undefined,
        value: 1
      },
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Prone"'
      },
      {
        key: "system.rollLevel.onYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Prone"'
      },
      {
        key: "system.rollLevel.onYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Prone"'
      },
      {
        key: "system.rollLevel.onYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Prone"'
      },
      {
        key: "system.rollLevel.onYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Prone"'
      },
      {
        key: "system.rollLevel.onYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Prone"'
      },
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Melee vs Prone"'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Ranged vs Prone"'
      },
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Melee vs Prone"'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Ranged vs Prone"'
      },
    ]
  }
}
function _grappled() {
  return {
    id: "grappled",
    _id: "iukn5nVA42hwe85d",
    name: "Grappled",
    label: "Grappled",
    stackable: false,
    statuses: ["immobilized"],
    system: {
      statusId: "grappled"
    },
    img: "systems/dc20rpg/images/statuses/grappled.svg",
    description: `
    <p>You're <strong>Immobilized</strong>.</p>
    <p><span style="text-decoration:underline"><strong><span style="text-decoration: underline;">Escape Grapple</span></strong></span></p>
    <p>You can spend <strong>1 AP</strong> to attempt to free yourself from a <strong>Grapple</strong>. Make a Martial Check contested by the Grappler's Athletics Check. <strong>Success:</strong> The Grapple immediately ends.</p>
    <p>The Grapple also ends if any of the following occurs:</p>
    <ul>
        <li>
            <p><strong>Incapacitated:</strong> The Grappler becomes <strong>Incapacitated</strong>.</p>
        </li>
        <li>
            <p><strong>Falling:</strong> The Grappler is unable to carry your weight when you begin falling, provided they are not also falling with you.</p>
        </li>
        <li>
            <p><strong>Forced Movement:</strong> An effect forcibly moves you or the Grappler, causing you to move outside Grappler's reach. If the effect requires a Contested Check or Save, the Grappler makes the Check or Save instead of you. If the effect targets both you and the Grappler, the Grappler makes 1 Check or Save for both of you. <strong>Success:</strong> The targets are not moved. <strong>Failure:</strong> The targets are moved.</p>
        </li>
    </ul>
    <p></p>
    <p><span style="text-decoration:underline"><strong><span style="text-decoration: underline;">Grappled by Multiple Creatures</span></strong></span></p>
    <p>A creature that is <strong>Grappled</strong> by more than 1 creature only suffers the effects of being <strong>Grappled</strong> once. However, a creature <strong>Grappled</strong> by multiple sources will remain <strong>Grappled</strong> until they are free from being <strong>Grappled</strong> by all sources.</p>
    <p id="1cf1b90a-e081-81f5-b4d4-ee30bbddab42" class="block-color-blue_background" style="box-sizing: border-box; user-select: text; scrollbar-width: thin; scrollbar-color: var(--color-scrollbar) var(--color-scrollbar-track); margin: 3px 0px; padding: 6px; border: 2px solid rgb(0, 39, 124); background-color: rgb(160, 175, 209); border-radius: 2px; color: black; font-family: Signika, sans-serif; font-size: 14px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; text-align: start"><span style="font-family: Signika, sans-serif"><strong style="box-sizing:border-box;user-select:text;scrollbar-width:thin;scrollbar-color:var(--color-scrollbar) var(--color-scrollbar-track)">Example:</strong> While <strong>Grappled</strong>, a creature is <strong>Immobilized</strong> (DisADV on Agility Saves). A creature doesn't have DisADV 2 on Agility Saves as a result of being <strong>Grappled</strong> by 2 creatures. They only have DisADV on Agility Saves.</span></p>
    <p><strong>Moving the Target:</strong> If multiple creatures are <strong>Grappling</strong> the same target and one of them tries to move the <strong>Grappled</strong> target, it must make a Contested Athletics Check against all creatures <strong>Grappling</strong> the same target. <strong>Success:</strong> It ends the <strong>Grapple</strong> on the target by all creatures other than itself, allowing it to move the creature as normal.</p>
    `,
    changes: [
      {
        key: "system.movement.ground.bonus",
        mode: 2,
        priority: undefined,
        value: -100
      },
      {
        key: "system.rollLevel.onYou.saves.agi",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Grappled (Immobilized)"'
      },
    ]
  }
}
function _incapacitated() {
  return {
    id: "incapacitated",
    name: "Incapacitated",
    label: "Incapacitated",
    stackable: false,
    statuses: [],
    system: {
      statusId: "incapacitated",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/incapacitated.svg",
    description: `
    <p>You are subjected to the following effects:</p>
    <ul>
        <li>
            <p>You can't move, speak.</p>
        </li>
        <li>
            <p>You can't spend Actions Points or use Minor Actions.</p>
        </li>
    </ul>
    `,
    changes: [
      {
        key: "system.globalModifier.prevent.goUnderAP",
        mode: 4,
        priority: undefined,
        value: 99
      },
      {
        key: "system.movement.ground.bonus",
        mode: 2,
        priority: undefined,
        value: -100
      },
    ]
  }
}
function _paralyzed() {
  return {
    id: "paralyzed",
    _id: "pze6ctp9bxbfldz5",
    name: "Paralyzed",
    label: "Paralyzed",
    stackable: false,
    statuses: ["incapacitated"],
    system: {
      statusId: "paralyzed",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/paralyzed.svg",
    description: `
    <p>You are subjected to the following effects:</p>
    <ul>
        <li>
            <p>You're <strong>Incapacitated</strong>.</p>
        </li>
        <li>
            <p>You automatically fail Physical Saves (except against Poisons and Diseases).</p>
        </li>
        <li>
            <p>Attacks against you have <strong>ADV</strong>.</p>
        </li>
        <li>
            <p>Attacks made within 1 Space are considered Critical Hits.</p>
        </li>
    </ul>
    `,
    changes: [
      {
        key: "system.globalModifier.prevent.goUnderAP",
        mode: 4,
        priority: undefined,
        value: 99
      },
      {
        key: "system.movement.ground.bonus",
        mode: 2,
        priority: undefined,
        value: -100
      },
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Paralyzed"'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Paralyzed"'
      },
      {
        key: "system.rollLevel.againstYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Paralyzed"'
      },
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Paralyzed"'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Paralyzed"'
      },
      {
        key: "system.rollLevel.againstYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Paralyzed"'
      },
      {
        key: "system.rollLevel.onYou.saves.mig",
        mode: 5,
        priority: undefined,
        value: '"label": "Paralyzed", "autoFail": true'
      },
      {
        key: "system.rollLevel.onYou.saves.agi",
        mode: 5,
        priority: undefined,
        value: '"label": "Paralyzed", "autoFail": true'
      },
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"label": "Paralyzed (Attack within 1 Space)", "autoCrit": true, "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"label": "Paralyzed (Attack within 1 Space)", "autoCrit": true, "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"label": "Paralyzed (Attack within 1 Space)", "autoCrit": true, "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"label": "Paralyzed (Attack within 1 Space)", "autoCrit": true, "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"label": "Paralyzed (Attack within 1 Space)", "autoCrit": true, "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"label": "Paralyzed (Attack within 1 Space)", "autoCrit": true, "confirmation": true'
      },
    ]
  }
}
function _unconscious() {
  return {
    id: "unconscious",
    _id: "k6mzhz72f3j8fjhp",
    name: "Unconscious",
    label: "Unconscious",
    stackable: false,
    statuses: ["incapacitated"],
    system: {
      statusId: "unconscious",
      condition: true,
      enableStatusOnCreation: ["prone"]
    },
    img: "systems/dc20rpg/images/statuses/unconscious.svg",
    description: `
    <p>When you become <strong>Unconscious</strong>, you immediately drop whatever you are holding and fall <strong>Prone</strong>. While <strong>Unconscious</strong>, you're subjected to the following effects:</p>
    <ul>
        <li>
            <p>You're <strong>Incapacitated</strong>.</p>
        </li>
        <li>
            <p>You're not aware of your surroundings.</p>
        </li>
        <li>
            <p>You automatically fail Physical Saves (except against Poisons and Diseases).</p>
        </li>
        <li>
            <p>Attacks against you have ADV.</p>
        </li>
        <li>
            <p>Attacks made within 1 Space are considered Critical Hits.</p>
        </li>
    </ul>
    `,
    changes: [
      {
        key: "system.globalModifier.prevent.goUnderAP",
        mode: 4,
        priority: undefined,
        value: 99
      },
      {
        key: "system.movement.ground.bonus",
        mode: 2,
        priority: undefined,
        value: -100
      },
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unconscious"'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unconscious"'
      },
      {
        key: "system.rollLevel.againstYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unconscious"'
      },
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unconscious"'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unconscious"'
      },
      {
        key: "system.rollLevel.againstYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Unconscious"'
      },
      {
        key: "system.rollLevel.onYou.saves.mig",
        mode: 5,
        priority: undefined,
        value: '"label": "Unconscious", "autoFail": true, "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.saves.agi",
        mode: 5,
        priority: undefined,
        value: '"label": "Unconscious", "autoFail": true, "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"label": "Unconscious (Attack within 1 Space)", "autoCrit": true, "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"label": "Unconscious (Attack within 1 Space)", "autoCrit": true, "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"label": "Unconscious (Attack within 1 Space)", "autoCrit": true, "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"label": "Unconscious (Attack within 1 Space)", "autoCrit": true, "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"label": "Unconscious (Attack within 1 Space)", "autoCrit": true, "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"label": "Unconscious (Attack within 1 Space)", "autoCrit": true, "confirmation": true'
      }
    ]
  }
}
function _petrified() {
  return {
    id: "petrified",
    _id: "658otyjsr2571jto",
    name: "Petrified",
    label: "Petrified",
    stackable: false,
    statuses: ["incapacitated"],
    system: {
      statusId: "petrified",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/petrified.svg",
    description: `
    <p>You and your mundane belongings are turned into a inanimate substance (often stone). While <strong>Petrified</strong>, you count as both an object and a creature, and you're subjected to the following effects:</p>
    <ul>
        <li>
            <p>You're not aware of your surroundings.</p>
        </li>
        <li>
            <p>You're 10 times heavier than normal.</p>
        </li>
        <li>
            <p>You're <strong>Incapacitated</strong>.</p>
        </li>
        <li>
            <p>You automatically fail Physical Saves.</p>
        </li>
        <li>
            <p>Attacks against you have ADV.</p>
        </li>
        <li>
            <p>You gain Bludgeoning Vulnerability (Double) and Resistance (Half) to all other damage.</p>
        </li>
        <li>
            <p>Curses, Diseases, Poisons, or Conditions afflicting you are suspended (unless it imposed the Petrified Condition), and you're immune to gaining new ones.</p>
        </li>
    </ul>
    `,
    changes: [
      {
        key: "system.globalModifier.prevent.goUnderAP",
        mode: 4,
        priority: undefined,
        value: 99
      },
      {
        key: "system.movement.ground.bonus",
        mode: 2,
        priority: undefined,
        value: -100
      },
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Petrified"'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Petrified"'
      },
      {
        key: "system.rollLevel.againstYou.martial.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Petrified"'
      },
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Petrified"'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Petrified"'
      },
      {
        key: "system.rollLevel.againstYou.spell.area",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Petrified"'
      },
      {
        key: "system.damageReduction.damageTypes.corrosion.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system.damageReduction.damageTypes.cold.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system.damageReduction.damageTypes.fire.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system.damageReduction.damageTypes.radiant.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system.damageReduction.damageTypes.lightning.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system.damageReduction.damageTypes.poison.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system.damageReduction.damageTypes.psychic.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system.damageReduction.damageTypes.umbral.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system.damageReduction.damageTypes.piercing.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system.damageReduction.damageTypes.slashing.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system.damageReduction.damageTypes.bludgeoning.vulnerability",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system.rollLevel.onYou.saves.mig",
        mode: 5,
        priority: undefined,
        value: '"label": "Petrified", "autoFail": true'
      },
      {
        key: "system.rollLevel.onYou.saves.agi",
        mode: 5,
        priority: undefined,
        value: '"label": "Petrified", "autoFail": true'
      }
    ]
  }
}
function _surprised() {
  return {
    id: "surprised",
    _id: "658otyjsr1572jto",
    name: "Surprised",
    label: "Surprised",
    stackable: false,
    statuses: [],
    system: {
      statusId: "surprised",
      condition: true
    },
    img: "systems/dc20rpg/images/statuses/surprised.svg",
    description: "<p>Your current and maximum <strong>AP</strong> is reduced by 2.</p>",
    changes: [
      {
        key: "system.globalModifier.prevent.goUnderAP",
        mode: 2,
        priority: undefined,
        value: 2
      },
    ]
  }
}