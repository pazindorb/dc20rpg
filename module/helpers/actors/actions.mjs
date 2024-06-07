export function getActionsAsTables() {
  return {
    offensive: {
      name: "Offensive",
      actions: {
        attack: _attack(),
        disarm: _disarm(),
        grapple: _grapple(),
        shove: _shove(),
        tackle: _tackle()
      }
    },
    defensive: {
      name: "Defensive",
      actions: {
        disengage: _disengage(),
        fullDisengage: _fullDisengage(),
        dodge: _dodge(),
        fullDodge: _fullDodge(),
        hide: _hide(),
      }
    },
    utility: {
      name: "Utility",
      actions: {
        spell: _spell(),
        move: _move(),
        help: _help(),
        object: _object(),
      }
    },
    reaction: {
      name: "Reaction",
      actions: {
        attackOfOpportunity: _attackOfOpportunity(),
        spellDuel: _spellDuel(),
      }
    },
    skillBased: {
      name: "Skill Based",
      actions: {
        medicine: _medicine(),
        passThrough: _passThrough(),
        feint: _feint(),
        intimidate: _intimidate(),
        combatInsight: _combatInsight(),
        analyzeCreatureArcana: _analyzeCreatureArcana(),
        analyzeCreatureHistory: _analyzeCreatureHistory(),
        analyzeCreatureNature: _analyzeCreatureNature(),
        analyzeCreatureReligion: _analyzeCreatureReligion(),
        analyzeCreatureOccultism: _analyzeCreatureOccultism(),
        calmAnimal: _calmAnimal(),
        investigate: _investigate(),
        search: _search(),
        conceal: _conceal(),
        mountedDefence: _mountedDefence(),
        jump: _jump(),
      }
    }
  }
}

//==================================
//            OFFENSIVE            =
//==================================
function _attack() {
  const description = "You can spend <b>1 AP</b> to make 1 <b>Attack Check</b>.";
  return {
    name: "Attack",
    description: description,
    label: "Attack Check",
    formula: "d20+@attackMod.value.martial",
    img: "icons/svg/sword.svg",
    type: "attackCheck",
    apCost: 1,
    reaction: false
  }
}
function _disarm() {
  const description = "You can spend <b>1 AP</b> to make an <b>Attack Check</b> Contested by " + 
  "the target's <b>Athletics</b>, <b>Acrobatics</b>, or <b>Trickery Check</b> (targets choice), " +
  "the target has ADV if they are holding the object with 2 hands. You have DisADV if the target " + 
  "is larger than you. You cannot Disarm a creature that is 2 Sizes larger than you." +
  "<br><br><b>Success:</b> The targeted object falls into an unoccupied space of your" + 
  "choice within 1 Spaces of the creature.";
  return {
    name: "Disarm",
    description: description,
    label: "Attack Check",
    formula: "d20+@attackMod.value.martial",
    img: "icons/svg/lever.svg",
    type: "attackCheck",
    apCost: 1,
    reaction: false
  }
}
function _grapple() {
  const description = "Using a free hand, you can spend <b>1 AP</b> to attempt to <b>Grapple</b> " + 
  "another creature. Make an <b>Athletics Check</b> contested by the opposing creature's " + 
  "<b>Martial Check</b>. You or the target may have ADV or DisADV on your Check based on each other's size" +
  "(see Moving & Grappling Creatures). <br><b>Success:</b> The creature is <b>Grappled</b> by you." +
  "<br><br><b>Dragging:</b> You can move a creature that you have grappled to any Space " + 
  "adjacent to your own by spending your <b>Movement</b>. Alternatively, you can move the creature " + 
  "with you, but you are considered to be Slowed (Every 1 Space you move costs an extra 1 Space of movement)." + 
  "<br><br><b><u>Ending a Grapple</u></b> " + 
  "<ul><li><b>Escape Grapple:</b> You can spend <b>1 AP</b> to attempt to free yourself from a <b>Grapple</b>. " + 
  "Make a <b>Martial Check</b> contested by the opposing creatures <b>Athletics Check</b>. " + 
  "<br><b>Success:</b> You end the <b>Grappled</b> Condition on yourself. </li>" +
  "<li><b>Incapacitated Grappler:</b> If you become <b>Incapacitated</b>d, the Grapple immediately ends. </li>" +
  "<li><b>Forced Movement:</b> : If an effect attempts to forcibly move the target beyond your reach, you make " + 
  "the Check or Save instead of the target. If the effect targets both you and the target, you make 1 Check or Save for both of you." +
  "<br><b>Success:</b> The targets of the effect aren't moved." +
  "<br><b>Fail:</b> The Grapple immediately ends, and the targets of the effect are moved. </li>" +
  "<li><b>Falling:</b> If the target begins falling (and you don't), the Grapple ends if you can't carry the target's weight. " + 
  "If you can carry its weight, you hold it suspended in the air.</li></ul>";
  return {
    name: "Grapple",
    description: description,
    label: "Athletics Check",
    formula: "d20+@skills.ath.modifier",
    img: "icons/svg/trap.svg",
    type: "skillCheck",
    apCost: 1,
    reaction: false
  }
}
function _shove() {
  const description = "You can spend <b>1 AP</b> to attempt to push a creature within 1 Space of you. " + 
  "Make an <b>Athletics Check</b> contested by the target's <b>Martial Check.</b> " + 
  "<br><b>Success:</b> You push the creature 1 Space away from you or to its left or right. " + 
  "<br><b>Success (each 5):</b> Push up to 1 additional Space." +
  "<br><br><b>Knock Prone:</b> After the result, you can choose to reduce the total distance " + 
  "the target is pushed by 1 Space to knock them <b>Prone</b> instead.";
  return {
    name: "Shove",
    description: description,
    label: "Athletics Check",
    formula: "d20+@skills.ath.modifier",
    img: "icons/svg/thrust.svg",
    type: "skillCheck",
    apCost: 1,
    reaction: false
  }
}
function _tackle() {
  const description = "If you move at least 2 Spaces in a straight line, you can spend <b>1 AP</b> " + 
  "to attempt to Tackle a creature that is your same size or smaller. " + 
  "Make an <b>Athletics Check</b> contested by the target's <b>Martial Check.</b> " + 
  "<br><br><b>Success:</b> You <b>Grapple</b> the target, you both move 1 Space in the same direction " + 
  "you're moving, and immediately fall <b>Prone</b>." + 
  "<br><b>Success (each 5):</b> +1 Space moved.";
  return {
    name: "Tackle",
    description: description,
    label: "Athletics Check",
    formula: "d20+@skills.ath.modifier",
    img: "icons/svg/falling.svg",
    type: "skillCheck",
    apCost: 1,
    reaction: false
  }
}

//==================================
//            DEFENSIVE            =
//==================================
function _disengage() {
  const description = "You can spend <b>1 AP</b> to impose DisADV on <b>Opportunity Attacks</b> made " + 
  "against you until the start of your next turn.";
  return {
    name: "Disengage",
    description: description,
    label: "Disengage",
    formula: "",
    img: "icons/svg/combat.svg",
    type: "",
    apCost: 1,
    reaction: false
  }
}
function _fullDisengage() {
  const description = "You can spend <b>2 AP</b> to become immune to <b>Opportunity Attacks</b> until the start of your next turn.";
  return {
    name: "Full Disengage",
    description: description,
    label: "Full Disengage",
    formula: "",
    img: "icons/svg/combat.svg",
    type: "",
    apCost: 2,
    reaction: false
  }
}
function _dodge() {
  const description = "You can spend <b>1 AP</b> to impose DisADV on on the next <b>Attack Check</b> " + 
  "or <b>Spell Check</b> made against you until the start of your next turn.";
  return {
    name: "Dodge",
    description: description,
    label: "Dodge",
    formula: "",
    img: "icons/svg/invisible.svg",
    type: "",
    apCost: 1,
    reaction: false
  }
}
function _fullDodge() {
  const description = "You can spend <b>2 AP</b> to impose DisADV on all <b>Attacks</b> made against you until the start of your next turn.";
  return {
    name: "Full Dodge",
    description: description,
    label: "Full Dodge",
    formula: "",
    img: "icons/svg/invisible.svg",
    type: "",
    apCost: 2,
    reaction: false
  }
}
function _hide() {
  const description = "You can spend <b>1 AP</b> to attempt to <b>Hide</b> from 1 or more creatures that can't see " +
  "you (<b>Unseen</b>). Make a <b>Stealth Check</b> against the opposing creatures <b>Passive Awareness</b>. " + 
  "<br><b>Success:</b> You become <b>Hidden</b> from creatures whose <b>Passive Awareness</b> you beat, (making you <b>Unseen</b> and <b>Unheard</b> by them). " +
  "You remain <b>Hidden</b> until you make a noise louder than a whisper, make an <b>Attack</b>, " +
  "cast a <b>Spell</b> with a <b>Verbal Component</b>, or a creature takes the <b>Search Action</b> and successfully " +
  "locates you. <ul>" + 
  "<li><b>Unheard:</b> You are Unheard while you remain silent, talk no louder than a whisper, or are within an area affected by the Silence Spell." +
  "<li><b>Unseen:</b> You are Unseen by a creature while you are imperceivable to its visual senses, such as when you are outside its <b>Line of Sight</b> " + 
  "(behind <b>Full Cover</b>), it's <b>Blinded</b>, or you are obscured from it such as by being <b>Invisible</b>. " +
  "Creatures that can't see you are <b>Exposed</b> (your Attacks against them have ADV) and <b>Hindered</b> against you (they have DisADV on Attacks against you)." +
  "<li><b>Hidden:</b> While you are both <b>Unheard</b> and <b>Unseen</b>, you are considered <b>Hidden</b>, and your location or presence unknown to other creatures." +
  "</ul><br>(see “Hidden Creatures” for more info).";
  
  return {
    name: "Hide",
    description: description,
    label: "Stealth Check",
    formula: "d20+@skills.ste.modifier",
    img: "icons/svg/cowled.svg",
    type: "skillCheck",
    apCost: 1,
    reaction: false
  }
}

//==================================
//             UTILITY             =
//==================================
function _spell() {
  const description = "You can spend 1 or more <b>AP</b> to cast a <b>Spell</b> that you know. If the <b>Spell</b> has a <b>Mana Point</b> requirement, you must spend that much <b>MP</b> to cast the <b>Spell</b>.";
  return {
    name: "Spell",
    description: description,
    label: "Spell",
    formula: "d20+@attackMod.value.spell",
    img: "icons/svg/explosion.svg",
    type: "spellCheck",
    apCost: 1,
    reaction: false
  }
}
function _move() {
  const description = "You can spend <b>1 AP</b> to move up to your Speed in Spaces (default of 5). " +
  "It chooses where to move, and can break up its movement by moving before and after taking " +
  "a different <b>Action</b>. You can't end your turn in a Space occupied by another creature.";
  return {
    name: "Move",
    description: description,
    label: "Move",
    formula: "",
    img: "icons/svg/wingfoot.svg",
    type: "",
    apCost: 1,
    reaction: false
  }
}
function _help() {
  const description = "You can spend <b>1 AP</b> to grant a creature a <b>d8</b> <b>Help Die</b> " +
  "that lasts until the start of your next turn. Upon granting the <b>Help Die</b>, you must declare which Creature you are " + 
  "Helping and the type of Check you will be aiding them with, while meeting the following conditions: <ul>" +
  "<li> <b>Attack:</b> You declare 1 target for the Check. You must be within 1 Space of " + 
  "the Attacker or the target of the Attack. While the <b>Help Die</b> lasts, it can be added to the <b>Attack</b> made against the target." +
  "<li> <b>Skill or Trade Check:</b> You declare a type of Skill or Trade Check. You describe how you are Helping them " +
  "and must do so using a Skill or Trade that you have at least 1 Mastery Level in. You can use the same " +
  "Skill or Trade or a different one. </ul>" + 
  "<br>The <b>Help Die</b> can only be used to aid the type of Check declared." +
  "<br><br><b>Multiple Help Penalty:</b> Once you take the Help Action, each time you take the " + 
  "Help Action again before the end of your turn, your <b>Help Die</b> decay by 1 step, to a minimum of a d4 " +
  "(d8 | d6 | d4). These Help Dice only decay when using the Help Action. Help Die granted by other sources (such as the Sword Maneuver) " +
  "decay independently of any Help Dice grant through the Help Action.";
  return {
    name: "Help",
    description: description,
    label: "Help",
    formula: "d8",
    img: "icons/svg/dice-target.svg",
    type: "",
    apCost: 1,
    reaction: false
  }
}
function _object() {
  const description = "You can spend <b>1 AP</b> to perform 1 of the following object interactions: <br><ul>" +
  "<li> Drink a Potion or Administer a Potion to another Creature." +
  "<li> Attempt to Lock or Unlock a Lock." +
  "<li> Make a <b>Trickery Check</b> to activate or disable a trap or other mechanism." +
  "<li> Transfer and Item to or from another Creature (only 1 of the two creatures spends <b>1 AP</b>)." +
  "<li> Throw an Item to location you can see up to 5 Spaces away." +
  "</ul>";
  return {
    name: "Object",
    description: description,
    label: "Object",
    formula: "",
    img: "icons/svg/chest.svg",
    type: "",
    apCost: 1,
    reaction: false
  }
}

//==================================
//           SKILL BASED           =
//==================================
function _passThrough() {
  const description = "You can spend <b>1 AP</b> to attempt to move through a Space occupied by a hostile " +
  "creature that's within 1 size of you. Make a contested <b>Martial Check</b> against the target." +
  "<br><br><b>Success:</b> You can move through the creature's Space as if it were <b>Difficult Terrain</b>" + 
  "(<b>Slowed 1</b> while moving through the area).";
  return {
    name: "Pass Through",
    description: description,
    label: "Martial Check",
    formula: "d20+max(@skills.acr.modifier, @skills.ath.modifier)",
    img: "icons/svg/stoned.svg",
    type: "skillCheck",
    apCost: 1,
    reaction: false
  }
}
function _analyzeCreatureArcana() {
  const description = "You can spend <b>1 AP</b> to attempt to recall or discern some information " +
  "about a creature that you can see or hear. Make a <b>DC 10 Knowledge Check</b> determined by the GM." +
  "<br><br><b>Success:</b> You learn a piece of lore about the creature." + 
  "<br><b>Success(5):</b> You learn 1 creature statistic (PD, MD, Attacks, Abilities, Resistances, Vulnerabilities, Immunities, etc.)." +
  "<br><b>Success(10):</b> +1 creature statistic."
  return {
    name: "Analyze Creature (Arcana)",
    description: description,
    label: "Arcana Check",
    formula: "d20+@skills.arc.modifier",
    img: "icons/svg/book.svg",
    type: "skillCheck",
    apCost: 1,
    reaction: false
  }
}
function _analyzeCreatureHistory() {
  const description = "You can spend <b>1 AP</b> to attempt to recall or discern some information " +
  "about a creature that you can see or hear. Make a <b>DC 10 Knowledge Check</b> determined by the GM." +
  "<br><br><b>Success:</b> You learn a piece of lore about the creature." + 
  "<br><b>Success(5):</b> You learn 1 creature statistic (PD, MD, Attacks, Abilities, Resistances, Vulnerabilities, Immunities, etc.)." +
  "<br><b>Success(10):</b> +1 creature statistic."
  return {
    name: "Analyze Creature (History)",
    description: description,
    label: "History Check",
    formula: "d20+@skills.his.modifier",
    img: "icons/svg/city.svg",
    type: "skillCheck",
    apCost: 1,
    reaction: false
  }
}
function _analyzeCreatureNature() {
  const description = "You can spend <b>1 AP</b> to attempt to recall or discern some information " +
  "about a creature that you can see or hear. Make a <b>DC 10 Knowledge Check</b> determined by the GM." +
  "<br><br><b>Success:</b> You learn a piece of lore about the creature." + 
  "<br><b>Success(5):</b> You learn 1 creature statistic (PD, MD, Attacks, Abilities, Resistances, Vulnerabilities, Immunities, etc.)." +
  "<br><b>Success(10):</b> +1 creature statistic."
  return {
    name: "Analyze Creature (Nature)",
    description: description,
    label: "Nature Check",
    formula: "d20+@skills.nat.modifier",
    img: "icons/svg/oak.svg",
    type: "skillCheck",
    apCost: 1,
    reaction: false
  }
}
function _analyzeCreatureOccultism() {
  const description = "You can spend <b>1 AP</b> to attempt to recall or discern some information " +
  "about a creature that you can see or hear. Make a <b>DC 10 Knowledge Check</b> determined by the GM." +
  "<br><br><b>Success:</b> You learn a piece of lore about the creature." + 
  "<br><b>Success(5):</b> You learn 1 creature statistic (PD, MD, Attacks, Abilities, Resistances, Vulnerabilities, Immunities, etc.)." +
  "<br><b>Success(10):</b> +1 creature statistic."
  return {
    name: "Analyze Creature (Occultism)",
    description: description,
    label: "Occultism Check",
    formula: "d20+@skills.occ.modifier",
    img: "icons/svg/skull.svg",
    type: "skillCheck",
    apCost: 1,
    reaction: false
  }
}
function _analyzeCreatureReligion() {
  const description = "You can spend <b>1 AP</b> to attempt to recall or discern some information " +
  "about a creature that you can see or hear. Make a <b>DC 10 Knowledge Check</b> determined by the GM." +
  "<br><br><b>Success:</b> You learn a piece of lore about the creature." + 
  "<br><b>Success(5):</b> You learn 1 creature statistic (PD, MD, Attacks, Abilities, Resistances, Vulnerabilities, Immunities, etc.)." +
  "<br><b>Success(10):</b> +1 creature statistic."
  return {
    name: "Analyze Creature (Religion)",
    description: description,
    label: "Religion Check",
    formula: "d20+@skills.rel.modifier",
    img: "icons/svg/angel.svg",
    type: "skillCheck",
    apCost: 1,
    reaction: false
  }
}
function _calmAnimal() {
  const description = "You can spend <b>1 AP</b> to attempt to beguile a Beast that can see or hear you. " +
  + "Make an <b>Animal Check</b> contested by the target's <b>Charisma Save</b>." +
  "<br><br><b>Success:</b> The animal is <b>Taunted</b> by you for 1 minute (Repeated Save) or until you target it with a harmful <b>Attack</b>, <b>Spell</b>, or other effect." + 
  "<br><b>Success(5):</b> It's also <b>Impaired</b>." +
  "<br><b>Success(10):</b> It's also <b>Charmed</b>."
  return {
    name: "Calm Animal",
    description: description,
    label: "Animal Check",
    formula: "d20+@skills.ani.modifier",
    img: "icons/svg/pawprint.svg",
    type: "skillCheck",
    apCost: 1,
    reaction: false
  }
}
function _combatInsight() {
  const description = "You can spend <b>1 AP</b> to attempt to discern the course of actions a creature might " + 
  "take on its next turn. Make an <b>Insight Check</b> contested by the target's <b>Trickery</b> or <b>Influence Check</b> (its choice)." +
  "<br><br><b>Success:</b> You learn the target's emotional state and whether it plans to make an <b>Attack</b>, cast a <b>Spell</b>, or flee combat during its next turn." + 
  "<br><b>Success(5):</b> You know who the creature is likely to target with a harmful ability." +
  "<br><b>Success(10):</b> You know which ability the creature plans to use."
  return {
    name: "Combat Insight",
    description: description,
    label: "Insight Check",
    formula: "d20+@skills.ins.modifier",
    img: "icons/svg/light.svg",
    type: "skillCheck",
    apCost: 1,
    reaction: false
  }
}
function _conceal() {
  const description = "You can spend <b>1 AP</b> to hide an object on yourself or in nearby foliage, debris, or decor to render it <b>Hidden</b>. " + 
  "Make a contested <b>Trickery Check</b> against the <b>Passive Awareness</b> of creatures that can see you." +
  "<br><br><b>Success:</b> The object is <b>Hidden</b> from any creature whose <b>Passive Awareness</b> you beat.";
  return {
    name: "Conceal",
    description: description,
    label: "Trickery Check",
    formula: "d20+@skills.tri.modifier",
    img: "icons/svg/item-bag.svg",
    type: "skillCheck",
    apCost: 1,
    reaction: false
  }
}
function _feint() {
  const description = "You can spend <b>1 AP</b> to make <b>Trickery Check</b> contested by the target's <b>Insight Check</b>." +
  "<br><br><b>Success:</b> The next <b>Attack</b> against the target before the start of your next turn has ADV and deals +1 damage.";
  return {
    name: "Feint",
    description: description,
    label: "Trickery Check",
    formula: "d20+@skills.tri.modifier",
    img: "icons/svg/ice-aura.svg",
    type: "skillCheck",
    apCost: 1,
    reaction: false
  }
}
function _intimidate() {
  const description = "You can spend <b>1 AP</b> to attempt to intimidate a creature that can see or hear you." + 
  "Make a contested <b>Intimidation Check</b> contested by the target's <b>Charisma Save</b>." +
  "<br><br><b>Success:</b> The target is <b>Intimidated</b> by you until the end of your next turn.";
  return {
    name: "Intimidate",
    description: description,
    label: "Intimidation Check",
    formula: "d20+@skills.inm.modifier",
    img: "icons/svg/terror.svg",
    type: "skillCheck",
    apCost: 1,
    reaction: false
  }
}
function _investigate() {
  const description = "You can spend <b>1 AP</b> to attempt to uncover a concealed object on a creature, a " +
  "secret compartment, or the intended function of a mechanism within 1 Space of you. <ul>" + 
  "<li><b>Concealed Objects:</b> You can attempt to uncover any objects concealed on a creature. Make an <b>Investigation Check</b> contested by the target's <b>Trickery Check</b>. " +
  "<br><b>Success:</b> You know the location of any concealed object on the creature." +
  "<li><b>Secret Compartments:</b> You can attempt to uncover any secret compartments. Make an <b>Investigation Check</b> against the <b>discovery DC</b> of any secret compartments. " +
  "<br><b>Success:</b> You discover the location of any secret compartments whose <b>discovery DC</b> you beat." +
  "<li><b>Discern Mechanism:</b> You can attempt to discern the functionality of a mechanism (the effect of a trap, how to open a secret door, or activate a device). " +
  "Make an <b>Investigation Check</b>. " +
  "<br><b>Success:</b> You learn how the mechanism works and the methods to activate and disable it (if any)." +
  "</ul>";
  return {
    name: "Investigate",
    description: description,
    label: "Investigation Check",
    formula: "d20+@skills.inv.modifier",
    img: "icons/svg/village.svg",
    type: "skillCheck",
    apCost: 1,
    reaction: false
  }
}
function _jump() {
  const description = "You can spend <b>1 AP</b> to attempt to increase the distance you can cover when Jumping. Make a <b>DC 10 Martial Check</b>. <ul>" + 
  "<li><b>Long Jump Success:</b> You can move 1 additional Space as part of your Long Jump. <br><b>Success(each 5):</b> +1 additional Space." +
  "<li><b>High Jump Success:</b> : You can move an additional 1ft (30cm) as part of your High Jump. <br><b>Success(each 5):</b> +1ft (30cm)." +
  "</ul>";
  return {
    name: "Jump",
    description: description,
    label: "Martial Check",
    formula: "d20+max(@skills.acr.modifier, @skills.ath.modifier)",
    img: "icons/svg/upgrade.svg",
    type: "skillCheck",
    apCost: 1,
    reaction: false
  }
}
function _mountedDefence() {
  const description = "You can spend <b>1 AP</b> to maneuver a mount you are riding to avoid danger. Make a <b>DC 10 Animal Check</b>." +
  "<br><br><b>Success:</b> The mount's PD increases by 2 until the start of your next turn." + 
  "<br><b>Success(5):</b> +2 PD." +
  "<br><b>Success(10):</b> +4 PD.";
  return {
    name: "Mounted Defence",
    description: description,
    label: "Animal Check",
    formula: "d20+@skills.ani.modifier",
    img: "icons/svg/shield.svg",
    type: "skillCheck",
    apCost: 1,
    reaction: false
  }
}
function _medicine() {
  const description = "You can spend <b>1 AP</b> to touch a creature and tend to its wounds. Make a <b>DC 10 Medicine Check</b>." + 
  "<br><br><b>Success:</b> You stop its Bleeding or Stabilize it (your choice)." + 
  "<br><b>Success(5):</b> The creature gains +1 Temp HP.";
  return {
    name: "Medicine",
    description: description,
    label: "Medicine Check",
    formula: "d20+@skills.med.modifier",
    img: "icons/svg/pill.svg",
    type: "skillCheck",
    apCost: 1,
    reaction: false
  }
}
function _search() {
  const description = "You can spend <b>1 AP</b> to attempt to locate 1 or more <b>Hidden</b> creatures and concealed objects within your Line of Sight. <ul>" +
  "<li><b>Hidden Creatures:</b> You attempt to locate any <b>Hidden</b> creatures in the area. Make an <b>Awareness Check</b> against the <b>Stealth Check</b> of any Hidden creatures." +
  "<br><b>Success:</b> You know the location of any <b>Hidden</b> creature whose <b>Stealth Check</b> you beat until the end of your turn. " + 
  "<li><b>Hidden Objects:</b> You attempt to locate any <b>Hidden</b> objects in the area. Make an <b>Awareness Check</b> against the DC to discover any concealed objects (such as traps, secret doors, or hidden items)." +
  "<br><b>Success:</b> You discover the location of any <b>Hidden</b> object whose discovery DC you beat. " + 
  "</ul>"
  return {
    name: "Search",
    description: description,
    label: "Awareness Check",
    formula: "d20+@skills.awa.modifier",
    img: "icons/svg/eye.svg",
    type: "skillCheck",
    apCost: 1,
    reaction: false
  }
}

//==================================
//            REACTION             =
//==================================
function _attackOfOpportunity() {
  const description = "<i><b><u>Prerequisite:</u></b> any Martial Class Feature</i>" + 
  "<br><br><b>Trigger:</b> A creature you can see within your Melee Range, uses its movement to leave your Melee Range, stands up " +
  "from Prone, picks up an item off the ground, or takes the <b>Object Action</b>." + 
  "<br><br><b>Reaction:</b> You can spend <b>1 AP</b> to make an Attack Check with an Unarmed Strike or a Melee Weapon that you are wielding " +
  "against the provoking creature. You can spend additional <b>AP</b> to gain <b>ADV</b> or to perform Maneuvers with the Attack."
  return {
    name: "Attack Of Opportunity",
    description: description,
    label: "Attack Check",
    formula: "d20+@attackMod.value.martial",
    img: "icons/svg/sword.svg",
    type: "",
    apCost: 1,
    reaction: true
  }
}
function _spellDuel() {
  const description = "<i><b><u>Prerequisite:</u></b> any Spellcasting Class Feature</i>" + 
  "<br><br><b>Trigger:</b> When another creature that you can see casts a Spell. " +
  "<br><br><b>Reaction:</b> You declare a Spell Duel and spend <b>2 AP</b> and 1 or more <b>MP</b> to challenge the creature with a Spell of your own. " + 
  "You can declare a Spell Duel after the creature makes its Spell Check but before you know the result of its Check. " + 
  "<br><br><b>Multiple Participants:</b> Additional creatures can choose to participate in helping the Spell take effect or participate in " + 
  "stopping the Spell from taking effect. If multiple creatures choose to participate in the Spell Duel, the participants are " +
  "sorted into <b>Initiators</b> (those trying to help the Spell take effect) and <b>Challengers</b> (those trying to prevent the Spell " +
  "from taking effect). " + 
  "<br>During the Contest (see further below) every participant makes their Spell Check, and the highest Initiator result is compared " + 
  "against the highest Challenger result to determine the outcome." +
  "<br><br><b>Choosing a Spell:</b> You declare which Spell you are using to challenge the opposing Spell and then describe how " + 
  "you do so using your Spell. The GM decides if that makes sense." +
  "<br><b>Targeted:</b> If your chosen Spell targets 1 or more creatures or objects, you must be able to target the opposing creature " + 
  "or any of its targets with your Spell." +
  "<br><b>Area of Effect:</b> If your chosen Spell covers an area (such as an Arc, Cone, Cube, Cylinder, Line, or Sphere), then your Spell's " +
  "Area of Effect must include the opposing creature, any of its targets, or cover an area between the opposing creature and any of its targets." +
  "<br><b>Success & Failure:</b> The success and failure statements of your Spell are replaced by the success and failure statements in the Contest section below." +
  "<br><br><b><u>Contest</b></u><br>" +
  "The Spell Check the opposing creature makes to cast its Spell is Contested by the Spell Check you make to cast your Spell. When comparing the Spell Checks for the " + 
  "purpose of determining the winner of the Contest, each creature gains a bonus to its Check equal to the MP it spent on its Spell." +
  "<br><b>• Success:</b> The target creature's Spell fails and has no effect." + 
  "<br><b>• Failure:</b> The target creature's Spell succeeds and takes effect." + 
  "<br><b>• Tie:</b> The target creature's Spell fails, has no effect, and you each roll on the Wild Magic Surge Table.The effect from the table lasts until the end of your next turn." + 
  "Whatever the result, each creature still spends all AP, MP, or other resources they spent to cast their Spell."
  return {
    name: "Spell Duel",
    description: description,
    label: "Spell Check",
    formula: "d20+@attackMod.value.spell",
    img: "icons/svg/explosion.svg",
    type: "",
    apCost: 2,
    reaction: true
  }
}