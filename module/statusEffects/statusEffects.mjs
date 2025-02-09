export function registerDC20Statues() {
  return [
    _concentration(),
    _bleeding(),
    _blinded(),
    _burning(),

    _charmed(),
    _dazed(),
    _heavilyDazed(),
    _deafened(),

    _exposed(),
    _frightened(),
    _grappled(),
    _hindered(),

    _impaired(),
    _heavilyImpaired(),
    _incapacitated(),
    _intimidated(),

    _invisible(),
    _paralyzed(),
    _petrified(),
    _poisoned(),

    _prone(),
    _rattled(),
    _restrained(),
    _slowed(),

    _stunned(),
    _surprised(), 
    _taunted(),
    _unconscious(),
    
    _bloodied1(),
    _bloodied2(),
    _dead(),
    _deathsDoor(),

    _partiallyConcealed(),
    _fullyConcealed(),
  ]
}

//================================
//             EXTRA             =
//================================
function _concentration() {
  return {
    id: "concentration",
    name: "Concentration",
    label: "Concentration",
    stackable: false,
    system: {
      statusId: "concentration"
    },
    statuses: [],
    img: "systems/dc20rpg/images/statuses/concentration.svg",
    description: "You are concentrating",
    changes: []
  }
}
function _bloodied1() {
  return {
    id: "bloodied1",
    name: "Bloodied",
    label: "Bloodied",
    stackable: false,
    system: {
      statusId: "bloodied1"
    },
    statuses: [],
    img: "systems/dc20rpg/images/statuses/bloodied1.svg",
    description: "You have less than 50% max HP.",
    changes: []
  }
}
function _bloodied2() {
  return {
    id: "bloodied2",
    name: "Well-Bloodied",
    label: "Well-Bloodied",
    stackable: false,
    system: {
      statusId: "bloodied2"
    },
    statuses: [],
    img: "systems/dc20rpg/images/statuses/bloodied2.svg",
    description: "You have less than 25% max HP.",
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
      statusId: "dead"
    },
    statuses: [],
    img: "systems/dc20rpg/images/statuses/dead.svg",
    description: "You are dead.",
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
      statusId: "deathsDoor"
    },
    statuses: [],
    img: "systems/dc20rpg/images/statuses/deathsDoor.svg",
    description: `
    <p>You are on the Death's Door, you suffers the following effects:</p>
    <ul>
        <li>
            <p><strong>Action Point Limit:</strong> You can’t spend more than <strong>1 AP</strong> until the end of your next turn, until you’re restored to 1 HP or higher.</p>
        </li>
        <li>
            <p><strong>Concentration:</strong> You can’t Concentrate.</p>
        </li>
        <li>
            <p><strong>Death Save:</strong> At the end of each of your turns, you make a Death Save.</p>
            <ul>
                <li>
                    <p><strong>Failure:</strong> You take 1 True damage.</p>
                </li>
                <li>
                    <p><strong>Critical Failure:</strong> You fall Unconscious until you’re restored to 1 HP or higher.</p>
                </li>
                <li>
                    <p><strong>Critical Success:</strong> You’re restored to 1 HP.</p>
                </li>
            </ul>
        </li>
    </ul>
    `,
    changes: []
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
    <p>A creature is <strong>Partially Concealed</strong> while within an area of thin fog, moderate foliage, or Dim Light. 
    Creatures have <strong>DisADV</strong> on <strong>Awareness Checks</strong> made to seethings that are Partially Concealed.</p>
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
      statusId: "fullyConcealed"
    },
    statuses: [],
    img: "systems/dc20rpg/images/statuses/fullyConcealed.svg",
    description: `
    <p>A creature is <strong>Fully Concealed</strong> while in an area that blocks vision entirely, such as Darkness, thick fog, or dense foliage
    Creatures are considered <strong>Blinded</strong> for thepurposes of seeing things that are Fully Concealed.
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


//================================
//           STACKING            =
//================================
function _exposed() {
  return {
    id: "exposed",
    name: "Exposed",
    label: "Exposed",
    stackable: true,
    statuses: [],
    system: {
      statusId: "exposed"
    },
    img: "systems/dc20rpg/images/statuses/exposed.svg",
    description: "<b>Attack Checks</b> against you have ADV.",
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
      statusId: "hindered"
    },
    img: "systems/dc20rpg/images/statuses/hindered.svg",
    description: "You have DisADV on <b>Attack Checks</b>.",
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
        key: "system.rollLevel.onYou.checks.att",
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
      statusId: "dazed"
    },
    img: "systems/dc20rpg/images/statuses/dazed.svg",
    description: "You have DisADV on <b>Mental Checks</b>.",
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
    ]
  }
}
function _heavilyDazed() {
  return {
    id: "heavilyDazed",
    name: "Heavily Dazed",
    label: "Heavily Dazed",
    stackable: true,
    statuses: [],
    system: {
      statusId: "heavilyDazed"
    },
    img: "systems/dc20rpg/images/statuses/heavilyDazed.svg",
    description: "You have DisADV on <b>Mental Checks</b> and <b>Mental Saves</b>.",
    changes: [
      {
        key: "system.rollLevel.onYou.checks.int",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Heavily Dazed"'
      },
      {
        key: "system.rollLevel.onYou.checks.cha",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Heavily Dazed"'
      },
      {
        key: "system.rollLevel.onYou.saves.int",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Heavily Dazed"'
      },
      {
        key: "system.rollLevel.onYou.saves.cha",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Heavily Dazed"'
      },
      {
        key: "system.rollLevel.onYou.checks.spe",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Heavily Dazed"'
      },
      {
        key: "system.rollLevel.onYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Heavily Dazed"'
      },
      {
        key: "system.rollLevel.onYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Heavily Dazed"'
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
      statusId: "impaired"
    },
    statuses: [],
    img: "systems/dc20rpg/images/statuses/impaired.svg",
    description: "You have DisADV on <b>Physical Checks</b>.",
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
    ]
  }
}
function _heavilyImpaired() {
  return {
    id: "heavilyImpaired",
    name: "Heavily Impaired",
    label: "Heavily Impaired",
    stackable: true,
    statuses: [],
    system: {
      statusId: "heavilyImpaired"
    },
    img: "systems/dc20rpg/images/statuses/heavilyImpaired.svg",
    description: "You have DisADV on <b>Physical Checks</b> and <b>Physical Saves</b>.",
    changes: [
      {
        key: "system.rollLevel.onYou.checks.mig",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Heavily Impaired"'
      },
      {
        key: "system.rollLevel.onYou.checks.agi",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Heavily Impaired"'
      },
      {
        key: "system.rollLevel.onYou.saves.mig",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Heavily Impaired"'
      },
      {
        key: "system.rollLevel.onYou.saves.agi",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Heavily Impaired"'
      },
      {
        key: "system.rollLevel.onYou.checks.att",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Heavily Impaired"'
      },
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Heavily Impaired"'
      },
      {
        key: "system.rollLevel.onYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Heavily Impaired"'
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
      statusId: "slowed"
    },
    img: "systems/dc20rpg/images/statuses/slowed.svg",
    description: "Every 1 Space you move costs an extra Space of movement.",
    changes: []
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
    },
    img: "systems/dc20rpg/images/statuses/charmed.svg",
    description: "Your <b>Charmer</b> has ADV on <b>Charisma Checks</b> made against you. Additionally, you can't target your <b>Charmer</b> with harmful Attacks, abilities, or magic effects.",
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
function _grappled() {
  const description = `<p>Your Speed is reduced to 0 and you have DisADV on <strong>Agility Saves</strong>.</p>
    <p><span style="text-decoration:underline"><strong><span style="text-decoration: underline;">Ending a Grapple</span></strong></span></p>
    <ul>
        <li>
            <p><strong>Escape Grapple:</strong> You can spend <strong>1 AP</strong> to attempt to free yourself from a Grapple. Make a <strong>Martial</strong> <strong>Check</strong> contested by the opposing creatures <strong>Athletics</strong> <strong>Check</strong>. <strong>Success:</strong> You end the Grappled Condition on yourself.</p>
        </li>
        <li>
            <p><strong>Incapacitated Grappler:</strong> If the Grappler becomes Incapacitatedd, the Grapple immediately ends.</p>
        </li>
        <li>
            <p><strong>Forced Movement:</strong> If an effect attempts to forcibly move you beyond the Grappler's reach, the Grappler makes the Check or Save instead of you. If the effect targets both you and the Grappler, the Grappler makes 1 Check or Save for both of you. <br><strong>Success:</strong> The targets of the effect aren't moved. <br><strong>Fail:</strong> The Grapple immediately ends, and the targets of the effect are moved.</p>
        </li>
        <li>
            <p><strong>Falling:</strong> If you begin falling while Grappled, and your Grappler isn't falling with you, your Grappler holds you in the air if they can carry your weight.</p>
        </li>
    </ul>`;

  return {
    id: "grappled",
    name: "Grappled",
    label: "Grappled",
    stackable: false,
    statuses: [],
    system: {
      statusId: "grappled"
    },
    img: "systems/dc20rpg/images/statuses/grappled.svg",
    description: description,
    changes: [
      {
        key: "system.rollLevel.onYou.saves.agi",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Grappled"'
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
function _intimidated() {
  return {
    id: "intimidated",
    name: "Intimidated",
    label: "Intimidated",
    stackable: false,
    statuses: [],
    system: {
      statusId: "intimidated"
    },
    img: "systems/dc20rpg/images/statuses/intimidated.svg",
    description: "You have DisADV on all <b>Checks</b> while your source intimidation is within your line of sight.",
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
    ]
  }
}
function _rattled() {
  return {
    id: "rattled",
    _id: "qnftngqxllc3l1ak",
    name: "Rattled",
    label: "Rattled",
    stackable: false,
    statuses: ["intimidated"],
    system: {
      statusId: "rattled"
    },
    img: "systems/dc20rpg/images/statuses/rattled.svg",
    description: "You can't willingly move closer to your source of fear, and you are <b>Intimidated</b> (DisADV on all <b>Checks</b> while it's within your line of sight).",
    changes: [
      {
        key: "system.rollLevel.onYou.checks.mig",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Rattled (Intimidated), "confirmation": true"'
      },
      {
        key: "system.rollLevel.onYou.checks.agi",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Rattled (Intimidated), "confirmation": true"'
      },
      {
        key: "system.rollLevel.onYou.checks.int",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Rattled (Intimidated), "confirmation": true"'
      },
      {
        key: "system.rollLevel.onYou.checks.cha",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Rattled (Intimidated), "confirmation": true"'
      },
      {
        key: "system.rollLevel.onYou.checks.att",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Rattled (Intimidated), "confirmation": true"'
      },
      {
        key: "system.rollLevel.onYou.checks.spe",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Rattled (Intimidated), "confirmation": true"'
      },
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Rattled (Intimidated), "confirmation": true"'
      },
      {
        key: "system.rollLevel.onYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Rattled (Intimidated), "confirmation": true"'
      },
      {
        key: "system.rollLevel.onYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Rattled (Intimidated), "confirmation": true"'
      },
      {
        key: "system.rollLevel.onYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Rattled (Intimidated), "confirmation": true"'
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
    statuses: ["rattled", "intimidated"],
    system: {
      statusId: "frightened"
    },
    img: "systems/dc20rpg/images/statuses/frightened.svg",
    description: "You must spend your turns trying to move as far away as you can from the source of the effect as possible. The only <b>Action</b> you can take is the <b>Move Action</b> to try to run away, or the <b>Dodge Action</b> if you are prevented from moving or there's nowhere farther to move. You are also considered <b>Rattled</b> (you cannot move closer to the source) and <b>Intimidated</b> (DisADV on all <b>Checks</b> while it's within your line of sight).",
    changes: [
      {
        key: "system.rollLevel.onYou.checks.mig",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened (Intimidated), "confirmation": true"'
      },
      {
        key: "system.rollLevel.onYou.checks.agi",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened (Intimidated), "confirmation": true"'
      },
      {
        key: "system.rollLevel.onYou.checks.int",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened (Intimidated), "confirmation": true"'
      },
      {
        key: "system.rollLevel.onYou.checks.cha",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened (Intimidated), "confirmation": true"'
      },
      {
        key: "system.rollLevel.onYou.checks.att",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened (Intimidated), "confirmation": true"'
      },
      {
        key: "system.rollLevel.onYou.checks.spe",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened (Intimidated), "confirmation": true"'
      },
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened (Intimidated), "confirmation": true"'
      },
      {
        key: "system.rollLevel.onYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened (Intimidated), "confirmation": true"'
      },
      {
        key: "system.rollLevel.onYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened (Intimidated), "confirmation": true"'
      },
      {
        key: "system.rollLevel.onYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Frightened (Intimidated), "confirmation": true"'
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
    statuses: ["hindered", "exposed", "grappled"],
    system: {
      statusId: "restrained"
    },
    img: "systems/dc20rpg/images/statuses/restrained.svg",
    description: "You are <b>Hindered</b> (You have DisADV on <b>Attack Checks</b>), <b>Exposed</b> (<b>Attack Checks</b> against you have ADV), and <b>Grappled</b> (your Speed is reduced to 0 and you have DisADV on <b>Agility Saves</b>).",
    changes: [
      {
        key: "system.rollLevel.onYou.saves.agi",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Grappled"'
      },
      {
        key: "system.movement.ground.bonus",
        mode: 2,
        priority: undefined,
        value: -100
      },
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Restrained (Hindered)"'
      },
      {
        key: "system.rollLevel.onYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Restrained (Hindered)"'
      },
      {
        key: "system.rollLevel.onYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Restrained (Hindered)"'
      },
      {
        key: "system.rollLevel.onYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Restrained (Hindered)"'
      },
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Restrained (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Restrained (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Restrained (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Restrained (Exposed)"'
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
      statusId: "taunted"
    },
    img: "systems/dc20rpg/images/statuses/taunted.svg",
    description: "You have DisADV on <b>Attack Checks</b> against creatures other than the one that Taunted you. If a creature is successfully <b>Taunted</b> while already <b>Taunted</b> by another creature, the original Taunt is removed.",
    changes: [
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Your Target is not your Taunter", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Your Target is not your Taunter", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Your Target is not your Taunter", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Your Target is not your Taunter", "confirmation": true'
      }
    ]
  }
}

//================================
//         NON-STACKING          =
//================================
function _bleeding() {
  return {
    id: "bleeding",
    name: "Bleeding",
    label: "Bleeding",
    stackable: false,
    statuses: [],
    system: {
      statusId: "bleeding"
    },
    img: "systems/dc20rpg/images/statuses/bleeding.svg",
    description: `
    <p>You take 1 True damage at the start of each of your turns.</p>
    <p><span style="text-decoration:underline"><strong><span style="text-decoration: underline;">Ending Bleeding</span></strong></span></p>
    <ul>
        <li>
            <p><strong>Healed:</strong> You're subjected to an effect that restores your HP.</p>
        </li>
        <li>
            <p><strong>Medicine Action:</strong> A creature can spend <strong>1 AP</strong> to make a <strong>DC 10 Medicine Check</strong> on itself or another creature within 1 Space. <br><strong>Success:</strong> Remove the Bleeding Condition. <br><strong>Success(each 5):</strong> The creature gains +1 Temp HP.</p>
        </li>
    </ul>
    `,
    changes: [
      {
        key: "system.events",
        mode: 2,
        priority: undefined,
        value: '"eventType": "damage", "label": "Bleeding", "trigger": "turnStart", "value": 1, "type": "true", "continuous": true'
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
    stackable: false,
    statuses: [],
    system: {
      statusId: "burning"
    },
    img: "systems/dc20rpg/images/statuses/burning.svg",
    description: "You take <b>1 Fire damage</b> at the start of each of your turns. You or another creature within 1 Space can spend <b>1 AP</b> to put it out.",
    changes: [
      {
        key: "system.events",
        mode: 2,
        priority: undefined,
        value: '"eventType": "damage", "label": "Burning", "trigger": "turnStart", "value": 1, "type": "fire", "continuous": true'
      },
    ]
  }
}
function _poisoned() {
  return {
    id: "poisoned",
    _id: "utxmhm7ggruwq7ic",
    name: "Poisoned",
    label: "Poisoned",
    stackable: false,
    statuses: ["impaired"],
    system: {
      statusId: "poisoned"
    },
    img: "systems/dc20rpg/images/statuses/poisoned.svg",
    description: "You are <b>Impaired</b> (DisADV on <b>Physical Checks</b>) and take <b>1 Poison damage</b> at the start of each of your turns. A creature can spend <b>1 AP</b> to make a <b>Medicine Check</b> (against the DC of the Poison) on itself or another creature within 1 Space. <b>Success:</b> Remove the <b>Poisoned</b> Condition.",
    changes: [
      {
        key: "system.events",
        mode: 2,
        priority: undefined,
        value: '"eventType": "damage", "label": "Poisoned", "trigger": "turnStart", "value": 1, "type": "poison", "continuous": true'
      },
      {
        key: "system.rollLevel.onYou.checks.mig",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Poisoned (Impaired)"'
      },
      {
        key: "system.rollLevel.onYou.checks.agi",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Poisoned (Impaired)"'
      },
      {
        key: "system.rollLevel.onYou.checks.att",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Poisoned (Impaired)"'
      },
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Poisoned (Impaired)"'
      },
      {
        key: "system.rollLevel.onYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Poisoned (Impaired)"'
      },
    ]
  }
}
function _deafened() {
  return {
    id: "deafened",
    name: "Deafened",
    label: "Deafened",
    stackable: false,
    statuses: [],
    system: {
      statusId: "deafened"
    },
    img: "systems/dc20rpg/images/statuses/deafened.svg",
    description: "You automatically fail <b>Checks</b> that require Hearing, and all creatures are considered <b>Unheard</b> by you. Additionally, you have <b>Resistance to Sonic damage</b>.",
    changes: [
      {
        key: "system.damageReduction.damageTypes.sonic.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
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
    statuses: ["exposed", "hindered"],
    system: {
      statusId: "blinded"
    },
    img: "systems/dc20rpg/images/statuses/blinded.svg",
    description: "You automatically fail Checks that require <b>Sight</b> and all other creatures are considered <b>Unseen</b>. You are <b>Exposed</b> (<b>Attack Checks</b> against you have ADV) and <b>Hindered</b> (You have DisADV on <b>Attack Checks</b>). Additionally, while you are not guided by another creature, all terrain is Difficult Terrain to you (moving 1 Space costs 2 Spaces).",
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
    description: "You are <b>Unseen</b>, making creatures that can't see you <b>Exposed</b> (your <b>Attack Checks</b> against them have ADV) and <b>Hindered</b> against you (they have DisADV on <b>Attack Checks</b> against you).",
    changes: [
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Invisible (Enemy Hindered - cant see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Invisible (Enemy Hindered - cant see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Invisible (Enemy Hindered - cant see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Invisible (Enemy Hindered - cant see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Invisible (Enemy Exposed - cant see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Invisible (Enemy Exposed - cant see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Invisible (Enemy Exposed - cant see you)", "confirmation": true'
      },
      {
        key: "system.rollLevel.onYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Invisible (Enemy Exposed - cant see you)", "confirmation": true'
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
    statuses: ["hindered", "slowed"],
    system: {
      statusId: "prone"
    },
    img: "systems/dc20rpg/images/statuses/prone.svg",
    description: "You are <b>Hindered</b> (You have DisADV on <b>Attack Checks</b>), Ranged Attacks are <b>Hindered</b> against you, and you are <b>Exposed</b> against Melee Attacks (<b>Melee Attack Checks</b> against you have ADV). <b>Crawling:</b> Your only movement option is to Crawl, which counts as <b>Slowed 1</b> (Every 1 Space you move costs an extra 1 Space of movement). <b>Standing Up:</b> You can spend 2 Spaces of movement to stand up, ending the <b>Prone</b> Condition on yourself. Standing up from Prone does possibly trigger <b>Opportunity Attacks</b>.",
    changes: [
      {
        key: "system.rollLevel.onYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Prone (Hindered)"'
      },
      {
        key: "system.rollLevel.onYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Prone (Hindered)"'
      },
      {
        key: "system.rollLevel.onYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Prone (Hindered)"'
      },
      {
        key: "system.rollLevel.onYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Prone (Hindered)"'
      },
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Prone (Exposed vs Melee)"'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Prone (Hindered vs Ranged)"'
      },
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Prone (Exposed vs Melee)"'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "dis", "label": "Prone (Hindered vs Ranged)"'
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
      statusId: "incapacitated"
    },
    img: "systems/dc20rpg/images/statuses/incapacitated.svg",
    description: "You can not Speak, Concentrate, or spend Action Points.",
    changes: []
  }
}
function _stunned() {
  return {
    id: "stunned",
    _id: "d02g03day8pp8en6",
    name: "Stunned",
    label: "Stunned",
    stackable: false,
    statuses: ["exposed", "incapacitated"],
    system: {
      statusId: "stunned"
    },
    img: "systems/dc20rpg/images/statuses/stunned.svg",
    description: "You automatically fail <b>Agility</b>, <b>Might</b> and <b>Physical Saves</b>. You are also <b>Exposed</b> (<b>Attack Checks</b> against you have ADV), and <b>Incapacitated</b> (You can not Speak, Concentrate, or spend Action Points).",
    changes: [
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Stunned (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Stunned (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Stunned (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Stunned (Exposed)"'
      },
      {
        key: "system.rollLevel.onYou.saves.mig",
        mode: 5,
        priority: undefined,
        value: '"label": "Stunned", "autoFail": true'
      },
      {
        key: "system.rollLevel.onYou.saves.agi",
        mode: 5,
        priority: undefined,
        value: '"label": "Stunned", "autoFail": true'
      }
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
    statuses: ["stunned", "incapacitated", "exposed"],
    system: {
      statusId: "paralyzed"
    },
    img: "systems/dc20rpg/images/statuses/paralyzed.svg",
    description: "<b>Attacks</b> made from within 1 Space that Hit you are considered <b>Critical Hits</b>. You are also <b>Stunned</b (automatically fail <b>Agility</b>, <b>Might</b> and <b>Physical Saves</b>), <b>Exposed</b> (<b>Attack Checks</b> against you have ADV), and <b>Incapacitated</b> (You can not Speak, Concentrate, or spend Action Points).",
    changes: [
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Stunned (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Stunned (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Stunned (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Stunned (Exposed)"'
      },
      {
        key: "system.rollLevel.onYou.saves.mig",
        mode: 5,
        priority: undefined,
        value: '"label": "Stunned", "autoFail": true'
      },
      {
        key: "system.rollLevel.onYou.saves.agi",
        mode: 5,
        priority: undefined,
        value: '"label": "Stunned", "autoFail": true'
      }
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
    statuses: ["stunned", "paralyzed", "exposed", "incapacitated"],
    system: {
      statusId: "unconscious"
    },
    img: "systems/dc20rpg/images/statuses/unconscious.svg",
    description: "You are no longer aware of your surroundings, you drop whatever you are holding and fall <b>Prone</b>. You are also <b>Paralyzed</b> (<b>Attack Checks</b> made from within 1 Space that Hit you are considered <b>Critical Hits</b>), <b>Stunned</b> (automatically fail <b>Agility</b>, <b>Might</b> and <b>Physical Saves</b>), <b>Exposed</b> (<b>Attack Checks</b> against you have ADV), and <b>Incapacitated</b>(You can not Speak, Concentrate, or spend Action Points).",
    changes: [
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Stunned (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Stunned (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Stunned (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Stunned (Exposed)"'
      },
      {
        key: "system.rollLevel.onYou.saves.mig",
        mode: 5,
        priority: undefined,
        value: '"label": "Stunned", "autoFail": true'
      },
      {
        key: "system.rollLevel.onYou.saves.agi",
        mode: 5,
        priority: undefined,
        value: '"label": "Stunned", "autoFail": true'
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
    statuses: ["paralyzed", "stunned", "exposed", "incapacitated"],
    system: {
      statusId: "petrified"
    },
    img: "systems/dc20rpg/images/statuses/petrified.svg",
    description: "You and your mundane belongings are turned into stone and you are no longer aware of your surroundings. You become 10 times heavier and have <b>Resistance (Half)</b> to all damage. Any <b>Poisons</b> or <b>Diseases</b> already affecting you are suspended and you are immune to any additional <b>Poison</b> and <b>Disease</b> while <b>Petrified</b>. You are also <b>Paralyzed</b> (<b>Attack Checks</b> made from within 1 Space that Hit you are considered <b>Critical Hits</b>), <b>Stunned</b> (automatically fail <b>Agility</b>, <b>Might</b> and <b>Physical Saves</b>), <b>Exposed</b>(<b>Attack Checks</b> against you have ADV), and <b>Incapacitated</b> (You can not Speak, Concentrate, or spend Action Points).",
    changes: [
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Stunned (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Stunned (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Stunned (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Stunned (Exposed)"'
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
        key: "system.damageReduction.damageTypes.sonic.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system.damageReduction.damageTypes.sonic.resistance",
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
        key: "system.damageReduction.damageTypes.bludgeoning.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system.rollLevel.onYou.saves.mig",
        mode: 5,
        priority: undefined,
        value: '"label": "Stunned", "autoFail": true'
      },
      {
        key: "system.rollLevel.onYou.saves.agi",
        mode: 5,
        priority: undefined,
        value: '"label": "Stunned", "autoFail": true'
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
    statuses: ["exposed"],
    system: {
      statusId: "surprised"
    },
    img: "systems/dc20rpg/images/statuses/surprised.svg",
    description: "You can't spend <b>Action Points</b> and are <b>Exposed</b> (<b>Attack Checks</b> against you have ADV).",
    changes: [
      {
        key: "system.rollLevel.againstYou.martial.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Surprised (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.martial.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Surprised (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.spell.melee",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Surprised (Exposed)"'
      },
      {
        key: "system.rollLevel.againstYou.spell.ranged",
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Surprised (Exposed)"'
      },
    ]
  }
}