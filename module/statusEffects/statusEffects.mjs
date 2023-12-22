export function registerDC20Statues() {
  return [
    _bleeding(),
    _bloodied1(),
    _bloodied2(),
    _burning(),

    _poisoned(), 
    _frightened(),
    _charmed(),
    _taunted(),

    _deafened(),
    _blinded(),
    _invisible(),
    _rattled(),
    
    _grappled(),
    _exposed(),
    _hindered(),
    _restrained(),

    _prone(),
    _incapacitated(),
    _stunned(),
    _paralyzed(),
    
    _unconscious(),
    _petrified(),
    _surprised(),
    _intimidated(),

    _impaired(),
    _heavilyImpaired(),
    _dazed(),
    _heavilyDazed(),

    _slowed1(),
    _slowed2(),
    _slowed3(),
    _slowed4(),
  ]
}

function _bleeding() {
  return {
    id: "bleeding",
    name: "Bleeding",
    label: "Bleeding",
    icon: "systems/dc20rpg/images/statuses/bleeding.svg",
    description: "You take <b>1 True damage</b> at the start of each of your turns until you regain 1 or more <b>HP</b>. <br>A creature can spend <b>1 AP</b> to make a <b>DC 10 Medicine Check</b> on itself or another creature within 1 Space. <br><b>Success:</b> Remove the <b>Bleeding</b> Condition.",
    changes: []
  }
}
function _bloodied1() {
  return {
    id: "bloodied1",
    name: "Bloodied 1",
    label: "Bloodied 1",
    icon: "systems/dc20rpg/images/statuses/bloodied1.svg",
    description: "Has less than 50% HP.",
    changes: []
  }
}
function _bloodied2() {
  return {
    id: "bloodied2",
    name: "Bloodied 2",
    label: "Bloodied 2",
    icon: "systems/dc20rpg/images/statuses/bloodied2.svg",
    description: "Has less than 25% HP.",
    changes: []
  }
}
function _burning() {
  return {
    id: "burning",
    name: "Burning",
    label: "Burning",
    icon: "systems/dc20rpg/images/statuses/burning.svg",
    description: "You take <b>1 Fire damage</b> at the start of each of your turns. You or another creature within 1 Space can spend <b>1 AP</b> to put it out.",
    changes: []
  }
}
function _charmed() {
  return {
    id: "charmed",
    name: "Charmed",
    label: "Charmed",
    icon: "systems/dc20rpg/images/statuses/charmed.svg",
    description: "Your <b>Charmer</b> has ADV on <b>Charisma Checks</b> made against you. Additionally, you can't target your <b>Charmer</b> with harmful Attacks, abilities, or magic effects.",
    changes: []
  }
}
function _poisoned() {
  return {
    id: "poisoned",
    name: "Poisoned",
    label: "Poisoned",
    icon: "systems/dc20rpg/images/statuses/poisoned.svg",
    description: "You are <b>Impaired</b> (DisADV on <b>Physical Checks</b>) and take <b>1 Poison damage</b> at the start of each of your turns. <br>A creature can spend <b>1 AP</b> to make a <b>Medicine Check</b> (against the DC of the Poison) on itself or another creature within 1 Space. <br><b>Success:</b> Remove the <b>Poisoned</b> Condition.",
    changes: []
  }
}
function _taunted() {
  return {
    id: "taunted",
    name: "Taunted",
    label: "Taunted",
    icon: "systems/dc20rpg/images/statuses/taunted.svg",
    description: "You have DisADV on <b>Attack Checks</b> against creatures other than the one that Taunted you. If a creature is successfully <b>Taunted</b> while already <b>Taunted</b> by another creature, the original Taunt is removed.",
    changes: []
  }
}
function _deafened() {
  return {
    id: "deafened",
    name: "Deafened",
    label: "Deafened",
    icon: "systems/dc20rpg/images/statuses/deafened.svg",
    description: "You automatically fail <b>Checks</b> that require Hearing, and all creatures are considered <b>Unheard</b> by you. Additionally, you have <b>Resistance to Thunder damage</b>.",
    changes: [{
      key: "system.damageReduction.damageType.sonic.resistance",
      mode: 5,
      priority: undefined,
      value: "true"
    }]
  }
}
function _blinded() {
  return {
    id: "blinded",
    name: "Blinded",
    label: "Blinded",
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
    icon: "systems/dc20rpg/images/statuses/invisible.svg",
    description: "You are <b>Unseen</b>, making creatures that can't see you <b>Exposed</b> (your <b>Attack Checks</b> against them have ADV) and <b>Hindered</b> against you (they have DisADV on <b>Attack Checks</b> against you).",
    changes: []
  }
}
function _intimidated() {
  return {
    id: "intimidated",
    name: "Intimidated",
    label: "Intimidated",
    icon: "systems/dc20rpg/images/statuses/intimidated.svg",
    description: "You have DisADV on all <b>Checks</b> while your source intimidation is within your line of sight.",
    changes: []
  }
}
function _rattled() {
  return {
    id: "rattled",
    name: "Rattled",
    label: "Rattled",
    icon: "systems/dc20rpg/images/statuses/rattled.svg",
    description: "You can't willingly move closer to your source of fear, and you are <b>Intimidated</b> (DisADV on all <b>Checks</b> while it's within your line of sight).",
    changes: []
  }
}
function _frightened() {
  return {
    id: "frightened",
    name: "Frightened",
    label: "Frightened",
    icon: "systems/dc20rpg/images/statuses/frightened.svg",
    description: "You must spend your turns trying to move as far away as you can from the source of the effect as possible. <br>The only <b>Action</b> you can take is the <b>Move Action</b> to try to run away, or the <b>Dodge Action</b> if you are prevented from moving or there's nowhere farther to move. <br>You are also considered <b>Rattled</b> (you cannot move closer to the source) and <b>Intimidated</b> (DisADV on all <b>Checks</b> while it's within your line of sight).",
    changes: []
  }
}
function _slowed1() {
  return {
    id: "slowed1",
    name: "Slowed 1",
    label: "Slowed 1",
    icon: "systems/dc20rpg/images/statuses/slowed1.svg",
    description: "Every 1 Space you move costs an extra 1 Space of movement.",
    changes: []
  }
}
function _slowed2() {
  return {
    id: "slowed2",
    name: "Slowed 2",
    label: "Slowed 2",
    icon: "systems/dc20rpg/images/statuses/slowed2.svg",
    description: "Every 1 Space you move costs an extra 2 Space of movement.",
    changes: []
  }
}
function _slowed3() {
  return {
    id: "slowed3",
    name: "Slowed 3",
    label: "Slowed 3",
    icon: "systems/dc20rpg/images/statuses/slowed3.svg",
    description: "Every 1 Space you move costs an extra 3 Space of movement.",
    changes: []
  }
}
function _slowed4() {
  return {
    id: "slowed4",
    name: "Slowed 4",
    label: "Slowed 4",
    icon: "systems/dc20rpg/images/statuses/slowed4.svg",
    description: "Every 1 Space you move costs an extra 4 Space of movement.",
    changes: []
  }
}
function _grappled() {
  return {
    id: "grappled",
    name: "Grappled",
    label: "Grappled",
    icon: "systems/dc20rpg/images/statuses/grappled.svg",
    description: "Your Speed is reduced to 0 and you have DisADV on <b>Agility Saves</b>. <br>Your <b>Grappler</b> can move you with it, but is considered to be <b>Slowed 1</b> (Every 1 Space you move costs an extra 1 Space of movement). <br><br><b>End Early:</b> The <b>Grappler</b> becomes <b>Incapacitated</b> or an effect forcibly moves you out of its reach.",
    changes: []
  }
}
function _exposed() {
  return {
    id: "exposed",
    name: "Exposed",
    label: "Exposed",
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
    icon: "systems/dc20rpg/images/statuses/hindered.svg",
    description: "You have DisADV on <b>Attack Checks</b>.",
    changes: []
  }
}
function _restrained() {
  return {
    id: "restrained",
    name: "Restrained",
    label: "Restrained",
    icon: "systems/dc20rpg/images/statuses/restrained.svg",
    description: "You are <b>Hindered</b> (You have DisADV on <b>Attack Checks</b>), <b>Exposed</b> (<b>Attack Checks</b> against you have ADV), and <b>Grappled</b> (your Speed is reduced to 0 and you have DisADV on <b>Agility Saves</b>).",
    changes: []
  }
}
function _prone() {
  return {
    id: "prone",
    name: "Prone",
    label: "Prone",
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
    icon: "systems/dc20rpg/images/statuses/incapacitated.svg",
    description: "You can not Speak, Concentrate, or spend Action Points.",
    changes: []
  }
}
function _stunned() {
  return {
    id: "stunned",
    name: "Stunned",
    label: "Stunned",
    icon: "systems/dc20rpg/images/statuses/stunned.svg",
    description: "You automatically fail <b>Agility</b> and <b>Might Saves</b>. You are also <b>Exposed</b> (<b>Attack Checks</b> against you have ADV), and <b>Incapacitated</b> (You can not Speak, Concentrate, or spend Action Points).",
    changes: []
  }
}
function _paralyzed() {
  return {
    id: "paralyzed",
    name: "Paralyzed",
    label: "Paralyzed",
    icon: "systems/dc20rpg/images/statuses/paralyzed.svg",
    description: "<b>Attack Checks</b> made from within 1 Space that Hit you are considered <b>Critical Hits</b>. You are also <b>Stunned</b (automatically fail <b>Agility</b> and <b>Might Saves</b>), <b>Exposed</b> (<b>Attack Checks</b> against you have ADV), and <b>Incapacitated</b> (You can not Speak, Concentrate, or spend Action Points).",
    changes: []
  }
}
function _unconscious() {
  return {
    id: "unconscious",
    name: "Unconscious",
    label: "Unconscious",
    icon: "systems/dc20rpg/images/statuses/unconscious.svg",
    description: "You are no longer aware of your surroundings, you drop whatever you are holding and fall <b>Prone</b>. <br>You are also <b>Paralyzed</b> (<b>Attack Checks</b> made from within 1 Space that Hit you are considered <b>Critical Hits</b>), <b>Stunned</b> (automatically fail <b>Agility</b> and <b>Might Saves</b>), <b>Exposed</b> (<b>Attack Checks</b> against you have ADV), and <b>Incapacitated</b>(You can not Speak, Concentrate, or spend Action Points).",
    changes: []
  }
}
function _petrified() {
  return {
    id: "petrified",
    name: "Petrified",
    label: "Petrified",
    icon: "systems/dc20rpg/images/statuses/petrified.svg",
    description: "You and your mundane belongings are turned into stone and you are no longer aware of your surroundings. You become 10 times heavier and are <b>Resistant</b> (take half damage) to all damage. <br><br>Any <b>Poisons</b> or <b>Diseases</b> already affecting you are suspended and you are immune to any additional <b>Poison</b> and <b>Disease</b> while <b>Petrified</b>. <br><br>You are also <b>Paralyzed</b> (<b>Attack Checks</b> made from within 1 Space that Hit you are considered <b>Critical Hits</b>), <b>Stunned</b> (automatically fail <b>Agility</b> and <b>Might Saves</b>), <b>Exposed</b>(<b>Attack Checks</b> against you have ADV), and <b>Incapacitated</b> (You can not Speak, Concentrate, or spend Action Points).",
    changes: [
      {
        key: "system..damageReduction.damageType.acid.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system..damageReduction.damageType.cold.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system..damageReduction.damageType.fire.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system..damageReduction.damageType.force.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system..damageReduction.damageType.holy.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system..damageReduction.damageType.lightning.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system..damageReduction.damageType.poison.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system..damageReduction.damageType.psychic.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system..damageReduction.damageType.sonic.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system..damageReduction.damageType.sonic.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system..damageReduction.damageType.unholy.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system..damageReduction.damageType.piercing.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system..damageReduction.damageType.slashing.resistance",
        mode: 5,
        priority: undefined,
        value: "true"
      },
      {
        key: "system..damageReduction.damageType.bludgeoning.resistance",
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
    name: "Surprised",
    label: "Surprised",
    icon: "systems/dc20rpg/images/statuses/surprised.svg",
    description: "You can't spend <b>Action Points</b> and are <b>Exposed</b> (<b>Attack Checks</b> against you have ADV).",
    changes: []
  }
}
function _impaired() {
  return {
    id: "impaired",
    name: "Impaired",
    label: "Impaired",
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
    icon: "systems/dc20rpg/images/statuses/heavilyImpaired.svg",
    description: "You have DisADV on <b>Physical Checks</b> and <b>Physical Saves</b>.",
    changes: []
  }
}
function _dazed() {
  return {
    id: "dazed",
    name: "Dazed",
    label: "Dazed",
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
    icon: "systems/dc20rpg/images/statuses/heavilyDazed.svg",
    description: "You have DisADV on <b>Mental Checks</b> and <b>Mental Saves</b>.",
    changes: []
  }
}