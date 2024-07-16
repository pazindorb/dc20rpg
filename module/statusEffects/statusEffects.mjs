export function registerDC20Statues() {
  return [
    _concentration(),
    _bleeding(),
    _burning(),
    _poisoned(), 

    _charmed(),
    _grappled(),
    _intimidated(),
    _taunted(),

    _rattled(),
    _frightened(),
    _surprised(), 
    _prone(),

    _deafened(),
    _blinded(),
    _incapacitated(),
    _unconscious(),

    _restrained(),
    _stunned(),
    _paralyzed(),
    _petrified(),

    _exposed(),
    _hindered(),
    _dazed(),
    _heavilyDazed(),

    _impaired(),
    _heavilyImpaired(),
    _slowed(),
    _invisible(),

    _bloodied1(),
    _bloodied2(),
    _dead(),
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
    icon: "systems/dc20rpg/images/statuses/concentration.svg",
    description: "You are concentrating on a Spell.",
    changes: []
  }
}
function _bloodied1() {
  return {
    id: "bloodied1",
    name: "Bloodied",
    label: "Bloodied",
    stackable: false,
    icon: "systems/dc20rpg/images/statuses/bloodied1.svg",
    description: "Has less than 50% HP.",
    changes: []
  }
}
function _bloodied2() {
  return {
    id: "bloodied2",
    name: "Well-Bloodied",
    label: "Well-Bloodied",
    stackable: false,
    icon: "systems/dc20rpg/images/statuses/bloodied2.svg",
    description: "Has less than 25% HP.",
    changes: []
  }
}
function _dead() {
  return {
    id: "dead",
    name: "Dead",
    label: "Dead",
    stackable: false,
    icon: "systems/dc20rpg/images/statuses/dead.svg",
    description: "You are dead.",
    changes: []
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
    icon: "systems/dc20rpg/images/statuses/exposed.svg",
    description: "<b>Attack Checks</b> against you have ADV.",
    changes: []
  }
}
function _hindered() {
  return {
    id: "hindered",
    name: "Hindered",
    label: "Hindered",
    stackable: true,
    icon: "systems/dc20rpg/images/statuses/hindered.svg",
    description: "You have DisADV on <b>Attack Checks</b>.",
    changes: []
  }
}
function _dazed() {
  return {
    id: "dazed",
    name: "Dazed",
    label: "Dazed",
    stackable: true,
    icon: "systems/dc20rpg/images/statuses/dazed.svg",
    description: "You have DisADV on <b>Mental Checks</b>.",
    changes: []
  }
}
function _heavilyDazed() {
  return {
    id: "heavilyDazed",
    name: "Heavily Dazed",
    label: "Heavily Dazed",
    stackable: true,
    icon: "systems/dc20rpg/images/statuses/heavilyDazed.svg",
    description: "You have DisADV on <b>Mental Checks</b> and <b>Mental Saves</b>.",
    changes: []
  }
}
function _impaired() {
  return {
    id: "impaired",
    name: "Impaired",
    label: "Impaired",
    stackable: true,
    icon: "systems/dc20rpg/images/statuses/impaired.svg",
    description: "You have DisADV on <b>Physical Checks</b>.",
    changes: []
  }
}
function _heavilyImpaired() {
  return {
    id: "heavilyImpaired",
    name: "Heavily Impaired",
    label: "Heavily Impaired",
    stackable: true,
    icon: "systems/dc20rpg/images/statuses/heavilyImpaired.svg",
    description: "You have DisADV on <b>Physical Checks</b> and <b>Physical Saves</b>.",
    changes: []
  }
}
function _slowed() {
  return {
    id: "slowed",
    name: "Slowed",
    label: "Slowed",
    stackable: true,
    icon: "systems/dc20rpg/images/statuses/slowed.svg",
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
    icon: "systems/dc20rpg/images/statuses/charmed.svg",
    description: "Your <b>Charmer</b> has ADV on <b>Charisma Checks</b> made against you. Additionally, you can't target your <b>Charmer</b> with harmful Attacks, abilities, or magic effects.",
    changes: []
  }
}
function _grappled() {
  const description = "Your Speed is reduced to 0 and you have DisADV on <b>Agility Saves</b>." + 
  "<br><br><b><u>Ending a Grapple</u></b> " + 
  "<ul><li><b>Escape Grapple:</b> You can spend <b>1 AP</b> to attempt to free yourself from a <b>Grapple</b>. " + 
  "Make a <b>Martial Check</b> contested by the opposing creatures <b>Athletics Check</b>. " + 
  "<br><b>Success:</b> You end the <b>Grappled</b> Condition on yourself. </li>" +
  "<li><b>Incapacitated Grappler:</b> If the Grappler becomes <b>Incapacitated</b>d, the Grapple immediately ends. </li>" +
  "<li><b>Forced Movement:</b> : If an effect attempts to forcibly move you beyond the Grappler's reach, the Grappler makes " + 
  "the Check or Save instead of you. If the effect targets both you and the Grappler, the Grappler makes 1 Check or Save for both of you." +
  "<br><b>Success:</b> The targets of the effect aren't moved." +
  "<br><b>Fail:</b> The Grapple immediately ends, and the targets of the effect are moved. </li>" +
  "<li><b>Falling:</b> If you begin falling while Grappled, and your Grappler isn't falling with you, your Grappler holds you in the air if " + 
  "they can carry your weight.</li></ul>";

  return {
    id: "grappled",
    name: "Grappled",
    label: "Grappled",
    stackable: false,
    icon: "systems/dc20rpg/images/statuses/grappled.svg",
    description: description,
    changes: []
  }
}
function _intimidated() {
  return {
    id: "intimidated",
    name: "Intimidated",
    label: "Intimidated",
    stackable: false,
    icon: "systems/dc20rpg/images/statuses/intimidated.svg",
    description: "You have DisADV on all <b>Checks</b> while your source intimidation is within your line of sight.",
    changes: []
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
    icon: "systems/dc20rpg/images/statuses/rattled.svg",
    description: "You can't willingly move closer to your source of fear, and you are <b>Intimidated</b> (DisADV on all <b>Checks</b> while it's within your line of sight).",
    changes: []
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
    icon: "systems/dc20rpg/images/statuses/frightened.svg",
    description: "You must spend your turns trying to move as far away as you can from the source of the effect as possible. <br>The only <b>Action</b> you can take is the <b>Move Action</b> to try to run away, or the <b>Dodge Action</b> if you are prevented from moving or there's nowhere farther to move. <br>You are also considered <b>Rattled</b> (you cannot move closer to the source) and <b>Intimidated</b> (DisADV on all <b>Checks</b> while it's within your line of sight).",
    changes: []
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
    icon: "systems/dc20rpg/images/statuses/restrained.svg",
    description: "You are <b>Hindered</b> (You have DisADV on <b>Attack Checks</b>), <b>Exposed</b> (<b>Attack Checks</b> against you have ADV), and <b>Grappled</b> (your Speed is reduced to 0 and you have DisADV on <b>Agility Saves</b>).",
    changes: []
  }
}
function _taunted() {
  return {
    id: "taunted",
    name: "Taunted",
    label: "Taunted",
    stackable: false,
    icon: "systems/dc20rpg/images/statuses/taunted.svg",
    description: "You have DisADV on <b>Attack Checks</b> against creatures other than the one that Taunted you. If a creature is successfully <b>Taunted</b> while already <b>Taunted</b> by another creature, the original Taunt is removed.",
    changes: []
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
    icon: "systems/dc20rpg/images/statuses/bleeding.svg",
    description: "You take <b>1 True damage</b> at the start of each of your turns. <br><br><b><u>Ending Bleeding</u></b>" + 
                  "<ul><li><b>Healed</b>: You're subjected to an effect that restores your HP.</li> " + 
                  "<li><b>Medicine Action</b>: A creature can spend <b>1 AP</b> to make a <b>DC 10 Medicine Check</b> on itself or another creature within 1 Space." + 
                  "<br><b>Success:</b> Remove the <b>Bleeding</b> Condition. <br><b>Success(each 5):</b> The creature gains +1 Temp HP.",
    changes: []
  }
}
function _burning() {
  return {
    id: "burning",
    name: "Burning",
    label: "Burning",
    stackable: false,
    icon: "systems/dc20rpg/images/statuses/burning.svg",
    description: "You take <b>1 Fire damage</b> at the start of each of your turns. You or another creature within 1 Space can spend <b>1 AP</b> to put it out.",
    changes: []
  }
}
function _poisoned() {
  return {
    id: "poisoned",
    _id: "utxmhm7ggruwq7ic",
    name: "Poisoned",
    label: "Poisoned",
    stackable: false,
    statuses: ["impared"],
    icon: "systems/dc20rpg/images/statuses/poisoned.svg",
    description: "You are <b>Impaired</b> (DisADV on <b>Physical Checks</b>) and take <b>1 Poison damage</b> at the start of each of your turns. <br>A creature can spend <b>1 AP</b> to make a <b>Medicine Check</b> (against the DC of the Poison) on itself or another creature within 1 Space. <br><b>Success:</b> Remove the <b>Poisoned</b> Condition.",
    changes: []
  }
}
function _deafened() {
  return {
    id: "deafened",
    name: "Deafened",
    label: "Deafened",
    stackable: false,
    icon: "systems/dc20rpg/images/statuses/deafened.svg",
    description: "You automatically fail <b>Checks</b> that require Hearing, and all creatures are considered <b>Unheard</b> by you. Additionally, you have <b>Resistance to Thunder damage</b>.",
    changes: [{
      key: "system.damageReduction.damageTypes.sonic.resistance",
      mode: 5,
      priority: undefined,
      value: "true"
    }]
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
    icon: "systems/dc20rpg/images/statuses/blinded.svg",
    description: "You automatically fail Checks that require <b>Sight</b> and all other creatures are considered <b>Unseen</b>. <br>You are <b>Exposed</b> (<b>Attack Checks</b> against you have ADV) and <b>Hindered</b> (You have DisADV on <b>Attack Checks</b>). <br>Additionally, while you are not guided by another creature, all terrain is Difficult Terrain to you (moving 1 Space costs 2 Spaces).",
    changes: []
  }
}
function _invisible() {
  return {
    id: "invisible",
    name: "Invisible",
    label: "Invisible",
    stackable: false,
    icon: "systems/dc20rpg/images/statuses/invisible.svg",
    description: "You are <b>Unseen</b>, making creatures that can't see you <b>Exposed</b> (your <b>Attack Checks</b> against them have ADV) and <b>Hindered</b> against you (they have DisADV on <b>Attack Checks</b> against you).",
    changes: []
  }
}
function _prone() {
  return {
    id: "prone",
    _id: "iukn5nvr42hwe85d",
    name: "Prone",
    label: "Prone",
    stackable: false,
    statuses: ["hindered"],
    icon: "systems/dc20rpg/images/statuses/prone.svg",
    description: "You are <b>Hindered</b> (You have DisADV on <b>Attack Checks</b>), Ranged Attacks are <b>Hindered</b> against you, and you are <b>Exposed</b> against Melee Attacks (<b>Melee Attack Checks</b> against you have ADV). <br><br><b>Crawling:</b> Your only movement option is to Crawl, which counts as <b>Slowed 1</b> (Every 1 Space you move costs an extra 1 Space of movement). <br><br><b>Standing Up:</b> You can spend 2 Spaces of movement to stand up, ending the <b>Prone</b> Condition on yourself. Standing up from Prone does possibly trigger <b>Opportunity Attacks</b>.",
    changes: []
  }
}
function _incapacitated() {
  return {
    id: "incapacitated",
    name: "Incapacitated",
    label: "Incapacitated",
    stackable: false,
    icon: "systems/dc20rpg/images/statuses/incapacitated.svg",
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
    icon: "systems/dc20rpg/images/statuses/stunned.svg",
    description: "You automatically fail <b>Agility</b>, <b>Might</b> and <b>Physical Saves</b>. You are also <b>Exposed</b> (<b>Attack Checks</b> against you have ADV), and <b>Incapacitated</b> (You can not Speak, Concentrate, or spend Action Points).",
    changes: []
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
    icon: "systems/dc20rpg/images/statuses/paralyzed.svg",
    description: "<b>Attacks</b> made from within 1 Space that Hit you are considered <b>Critical Hits</b>. You are also <b>Stunned</b (automatically fail <b>Agility</b>, <b>Might</b> and <b>Physical Saves</b>), <b>Exposed</b> (<b>Attack Checks</b> against you have ADV), and <b>Incapacitated</b> (You can not Speak, Concentrate, or spend Action Points).",
    changes: []
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
    icon: "systems/dc20rpg/images/statuses/unconscious.svg",
    description: "You are no longer aware of your surroundings, you drop whatever you are holding and fall <b>Prone</b>. <br>You are also <b>Paralyzed</b> (<b>Attack Checks</b> made from within 1 Space that Hit you are considered <b>Critical Hits</b>), <b>Stunned</b> (automatically fail <b>Agility</b>, <b>Might</b> and <b>Physical Saves</b>), <b>Exposed</b> (<b>Attack Checks</b> against you have ADV), and <b>Incapacitated</b>(You can not Speak, Concentrate, or spend Action Points).",
    changes: []
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
    icon: "systems/dc20rpg/images/statuses/petrified.svg",
    description: "You and your mundane belongings are turned into stone and you are no longer aware of your surroundings. You become 10 times heavier and have <b>Resistance (Half)</b> to all damage. <br><br>Any <b>Poisons</b> or <b>Diseases</b> already affecting you are suspended and you are immune to any additional <b>Poison</b> and <b>Disease</b> while <b>Petrified</b>. <br><br>You are also <b>Paralyzed</b> (<b>Attack Checks</b> made from within 1 Space that Hit you are considered <b>Critical Hits</b>), <b>Stunned</b> (automatically fail <b>Agility</b>, <b>Might</b> and <b>Physical Saves</b>), <b>Exposed</b>(<b>Attack Checks</b> against you have ADV), and <b>Incapacitated</b> (You can not Speak, Concentrate, or spend Action Points).",
    changes: [
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
      }
    ]
  }
}
function _surprised() {
  return {
    id: "surprised",
    _id: "658otyjsr2571jto",
    name: "Surprised",
    label: "Surprised",
    stackable: false,
    statuses: ["exposed"],
    icon: "systems/dc20rpg/images/statuses/surprised.svg",
    description: "You can't spend <b>Action Points</b> and are <b>Exposed</b> (<b>Attack Checks</b> against you have ADV).",
    changes: []
  }
}