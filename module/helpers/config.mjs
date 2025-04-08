import { sendDescriptionToChat } from "../chat/chat-message.mjs";
import { createRestDialog } from "../dialogs/rest.mjs";
import { promptItemRoll, promptRoll, promptRollToOtherPlayer } from "../dialogs/roll-prompt.mjs";
import { getSimplePopup, sendSimplePopupToUsers } from "../dialogs/simple-popup.mjs";
import { DC20RpgActor } from "../documents/actor.mjs";
import { DC20RpgCombatant } from "../documents/combatant.mjs";
import { DC20RpgItem } from "../documents/item.mjs";
import DC20RpgMeasuredTemplate from "../placeable-objects/measuredTemplate.mjs";
import { forceRunMigration } from "../settings/migrationRunner.mjs";
import { addStatusWithIdToActor, doomedToggle, exhaustionToggle, getStatusWithId, hasStatusWithId, removeStatusWithIdFromActor } from "../statusEffects/statusUtils.mjs";
import { makeMoveAction, prepareHelpAction } from "./actors/actions.mjs";
import { canSubtractBasicResource, canSubtractCustomResource, regainBasicResource, regainCustomResource, subtractAP, subtractBasicResource, subtractCustomResource } from "./actors/costManipulator.mjs";
import { reenableEventsOn, registerEventReenableTrigger, registerEventTrigger, registerEventType, runEventsFor } from "./actors/events.mjs";
import { createItemOnActor, deleteItemFromActor, getItemFromActorByKey } from "./actors/itemsOnActor.mjs";
import { addNewKeyword, addUpdateItemToKeyword, removeKeyword, removeUpdateItemFromKeyword, updateKeywordValue } from "./actors/keywords.mjs";
import { applyDamage, applyHealing } from "./actors/resources.mjs";
import { getSelectedTokens } from "./actors/tokens.mjs";
import { createEffectOn, createOrDeleteEffect, deleteEffectFrom, getEffectById, getEffectByKey, getEffectByName, toggleEffectOn } from "./effects.mjs";
import { createTemporaryMacro, registerItemMacroTrigger, rollItemWithName, runTemporaryItemMacro, runTemporaryMacro } from "./macros.mjs";
import { calculateForTarget, tokenToTarget } from "./targets.mjs";
import { getActiveActorOwners } from "./users.mjs";

export function prepareDC20tools() {
  game.dc20rpg = {
    DC20RpgActor,
    DC20RpgItem,
    DC20RpgCombatant,
    DC20RpgMeasuredTemplate,
    rollItemWithName,
    forceRunMigration,
    effects: {
      createEffectOn,
      deleteEffectFrom,
      getEffectByName,
      getEffectById,
      getEffectByKey,
      toggleEffectOn,
      createOrDeleteEffect,
      doomedToggle,
      exhaustionToggle
    },
    statuses: {
      hasStatusWithId,
      getStatusWithId,
      addStatusWithIdToActor,
      removeStatusWithIdFromActor
    },
    resources: {
      regainBasicResource,
      regainCustomResource,
      subtractBasicResource,
      subtractCustomResource,
      canSubtractBasicResource,
      canSubtractCustomResource,
      subtractAP,
    },
    tools: {
      getSelectedTokens,
      createItemOnActor,
      deleteItemFromActor,
      getItemFromActorByKey,
      promptRoll,
      promptItemRoll,
      promptRollToOtherPlayer,
      getSimplePopup,
      sendSimplePopupToUsers,
      getActiveActorOwners,
      tokenToTarget,
      calculateForTarget,
      applyDamage,
      applyHealing,
      makeMoveAction,
      prepareHelpAction,
      createRestDialog,
      sendDescriptionToChat
    },
    events: {
      runEventsFor,
      reenableEventsOn,
      registerEventTrigger,
      registerEventType,
      registerEventReenableTrigger
    },
    macros: {
      createTemporaryMacro,
      runTemporaryMacro,
      runTemporaryItemMacro,
      registerItemMacroTrigger
    },
    keywords: {
      addUpdateItemToKeyword,
      removeUpdateItemFromKeyword,
      updateKeywordValue,
      addNewKeyword,
      removeKeyword
    }
  };
}

export function initDC20Config() {
  // Prepare Skill and Language default list
  const skillStore = game.settings.get("dc20rpg", "skillStore");

  const skills = {};
  Object.entries(skillStore.skills).forEach(([key, skill]) => skills[key] = CONFIG.DC20RPG.skills[key] || skill.label);
  CONFIG.DC20RPG.skills = skills;
  const tradeSkills = {};
  Object.entries(skillStore.trades).forEach(([key, skill]) => tradeSkills[key] = CONFIG.DC20RPG.tradeSkills[key] || skill.label);
  CONFIG.DC20RPG.tradeSkills = tradeSkills;
  const languages = {};
  Object.entries(skillStore.languages).forEach(([key, skill]) => languages[key] = CONFIG.DC20RPG.languages[key] || skill.label);
  CONFIG.DC20RPG.languages = languages;

  // Prepare Attribute Checks and Saves
  const saveTypes = {
    phy: "Physical Save",
    men: "Mental Save",
  }
  const attributeChecks = {};
  Object.entries(CONFIG.DC20RPG.DROPDOWN_DATA.attributesWithPrime).forEach(([key, label]) => {
    saveTypes[key] = `${label} Save`;
    attributeChecks[key] = `${label} Check`;
  });
  CONFIG.DC20RPG.ROLL_KEYS.saveTypes = saveTypes;
  CONFIG.DC20RPG.ROLL_KEYS.attributeChecks = attributeChecks;

  // Prepare Basic Checks
  CONFIG.DC20RPG.ROLL_KEYS.baseChecks = {
    att: "Attack Check",
    spe: "Spell Check",
  }
  // Martial Check requires acrobatic and athletics skills
  if (CONFIG.DC20RPG.skills.acr && CONFIG.DC20RPG.skills.ath) {
    CONFIG.DC20RPG.ROLL_KEYS.baseChecks.mar = "Martial Check";
  }

  // Prepare Skill Checks
  const skillChecks = {};
  Object.entries(CONFIG.DC20RPG.skills).forEach(([key, label]) => {
    skillChecks[key] = `${label} Check`;
  });
  CONFIG.DC20RPG.ROLL_KEYS.skillChecks = skillChecks;

  // Prepare Trade Skill Checks
  const tradeChecks = {};
  Object.entries(CONFIG.DC20RPG.tradeSkills).forEach(([key, label]) => {
    tradeChecks[key] = `${label} Check`;
  });
  CONFIG.DC20RPG.ROLL_KEYS.tradeChecks = tradeChecks;

  // Prepare Contested Checks
  CONFIG.DC20RPG.ROLL_KEYS.contests = {
    ...CONFIG.DC20RPG.ROLL_KEYS.saveTypes,
    ...CONFIG.DC20RPG.ROLL_KEYS.baseChecks,
    ...CONFIG.DC20RPG.ROLL_KEYS.skillChecks
  }

  // Prepare Core Checks
  CONFIG.DC20RPG.ROLL_KEYS.checks = {
    ...CONFIG.DC20RPG.ROLL_KEYS.baseChecks,
    ...CONFIG.DC20RPG.ROLL_KEYS.attributeChecks,
    ...CONFIG.DC20RPG.ROLL_KEYS.skillChecks
  }

  // Preapre All Checks
  CONFIG.DC20RPG.ROLL_KEYS.allChecks = {
    ...CONFIG.DC20RPG.ROLL_KEYS.checks,
    ...CONFIG.DC20RPG.ROLL_KEYS.tradeChecks
  }
}

export const DC20RPG = {
  SYSTEM_CONSTANTS: {
    JOURNAL_UUID: {}
  },
  DROPDOWN_DATA: {},
  TRANSLATION_LABELS: {},
  ROLL_KEYS: {},
};

//=========================================================================
//      CHANGEABLE - We want to allow user to register new options        =
//=========================================================================
DC20RPG.eventTypes = {
  basic: "Basic",
  healing: "Apply Healing",
  damage: "Apply Damage",
  checkRequest: "Check Request",
  saveRequest: "Save Request",
  resource: "Resource Manipulation",
  macro: "Run Effect Macro"
}

DC20RPG.allEventTriggers = {
  turnStart: "Turn Start",
  turnEnd: "Turn End",
  nextTurnEnd: "Next Turn End",
  actorWithIdStartsTurn: "Caster starts its turn",
  actorWithIdEndsTurn: "Caster ends its turn",
  actorWithIdEndsNextTurn: "Caster ends its next turn",
  targetConfirm: "Target Confirmed",
  combatStart: "Combat Start",
  damageTaken: "Damage Taken",
  healingTaken: "Healing Taken",
  effectApplied: "Effect Applied",
  effectRemoved: "Effect Removed",
  effectEnabled: "Effect Enabled",
  effectDisabled: "Effect Disabled",
  rollSave: "Save Roll",
  rollCheck: "Check Roll",
  rollItem: "Any Item Roll",
  attack: "Item Attack Roll",
  move: "Actor Move",
  crit: "On Nat 20",
  critFail: "On Nat 1",
  never: "Never",
  instant: "Instant",
  rest: "On Rest End",
}

DC20RPG.reenableTriggers = {
  "": "",
  turnStart: "Turn Start",
  turnEnd: "Turn End",
  actorWithIdStartsTurn: "Caster starts its turn",
  actorWithIdEndsTurn: "Caster ends its turn",
  combatStart: "Combat Start",
  effectApplied: "Effect Applied",
  effectRemoved: "Effect Removed",
  effectEnabled: "Effect Enabled",
  effectDisabled: "Effect Disabled",
}

DC20RPG.macroTriggers = {
  onDemand: "On Demand",
  onCreate: "After Creation",
  preDelete: "Before Deletion",
  onItemToggle: "On Item Toggle/Equip",
  onRollPrompt: "On Roll Prompt",
  rollLevelCheck: "On Roll Level Check",
  preItemCost: "Before Item Cost Check",
  preItemRoll: "Before Item Roll",
  postItemRoll: "After Item Roll",
  postChatMessageCreated: "After Chat Message Created",
  enhancementReset: "On Enhancement Reset",
  onKeywordUpdate: "On Keyword Update"
}

DC20RPG.skills = {
  awa: "Awareness",
  ath: "Athletics",
  inm: "Intimidation",
  acr: "Acrobatics",
  tri: "Trickery",
  ste: "Stealth",
  inv: "Investigation",
  med: "Medicine",
  sur: "Survival",
  ani: "Animal",
  ins: "Insight",
  inf: "Influence",
  nat: "Nature",
  his: "History",
  arc: "Arcana",
  rel: "Religion",
  occ: "Occultism"
}

DC20RPG.tradeSkills = {
  alc: "Alchemy",
  bla: "Blacksmithing",
  bre: "Brewing",
  cap: "Carpentry",
  car: "Cartography",
  coo: "Cooking",
  cry: "Cryptography",
  dis: "Disguise",
  gam: "Gaming",
  gla: "Glassblower",
  her: "Herbalism",
  ill: "Illustration",
  jew: "Jeweler",
  lea: "Leatherworking",
  loc: "Lockpicking",
  mas: "Masonry",
  mus: "Musician",
  scu: "Sculpting",
  the: "Theatre",
  tin: "Tinkering",
  wea: "Weaving",
  veh: "Vehicles"
}

DC20RPG.languages = {
  com: "Common",
  hum: "Human",
  dwa: "Dwarven",
  elv: "Elvish",
  gno: "Gnomish",
  hal: "Halfling",
  sig: "Common Sign",
  gia: "Giant",
  dra: "Draconic",
  orc: "Orcish",
  fey: "Fey",
  ele: "Elemental",
  cel: "Celestial",
  fie: "Fiend",
  dee: "Deep Speech"
}

//=========================================================================
//    TRANSLATION-LABELS - We are using that for key->label translation   =
//=========================================================================
DC20RPG.TRANSLATION_LABELS.classTypes = {
  martial: "Martial",
  spellcaster: "Spellcaster",
  hybrid: "Hybrid"
}

DC20RPG.TRANSLATION_LABELS.attributes = {
  mig: "Might",
  agi: "Agility",
  int: "Inteligence",
  cha: "Charisma"
};

DC20RPG.TRANSLATION_LABELS.combatTraining = {
  weapons: "Weapons",
  lightShield: "Light Shield",
  heavyShield: "Heavy Shield",
  lightArmor: "Light Armor",
  heavyArmor: "Heavy Armor",
}

//====================================================================================
//    DROPDOWN-DATA - We are using that for dropodowns and key->label translations   =
//====================================================================================
DC20RPG.DROPDOWN_DATA.sizes = {
  tiny: "Tiny",
  small: "Small",
  medium: "Medium",
  large: "Large",
  huge: "Huge",
  gargantuan: "Gargantuan",
  colossal: "Colossal",
  titanic: "Titanic",
}

DC20RPG.DROPDOWN_DATA.attributesWithPrime = {
  prime: "Prime",
  ...DC20RPG.TRANSLATION_LABELS.attributes
}

DC20RPG.DROPDOWN_DATA.shortAttributes = {
  mig: "MIG",
  agi: "AGI",
  int: "INT",
  cha: "CHA",
  prime: "PRI"
}

DC20RPG.DROPDOWN_DATA.dcCalculationTypes = {
  spell: "Spellcasting",
  martial: "Martial",
  flat: "Flat",
  ...DC20RPG.TRANSLATION_LABELS.attributes
}

DC20RPG.DROPDOWN_DATA.basicActionsCategories = {
  offensive: "Offensive",
  defensive: "Defensive",
  utility: "Utility",
  reaction: "Reaction",
  skillBased: "Skill Based"
}

DC20RPG.DROPDOWN_DATA.weaponTypes = {
  melee: "Melee",
  ranged: "Ranged",
  special: "Special"
}

DC20RPG.DROPDOWN_DATA.equipmentTypes = {
  light: "Light Armor",
  heavy: "Heavy Armor",
  lshield: "Light Shield",
  hshield: "Heavy Shield",
  clothing: "Clothing",
  trinket: "Trinket",
  other: "Other"
}

DC20RPG.DROPDOWN_DATA.consumableTypes = {
  ammunition: "Ammunition",
  food: "Food",
  poison: "Poison",
  potion: "Potion",
  rod: "Rod",
  scroll: "Scroll",
  wand: "Wand",
  trap: "Trap",
  trinket: "Trinket",
  other: "Other"
}

DC20RPG.DROPDOWN_DATA.techniqueTypes = {
  maneuver: "Maneuver",
  technique: "Technique"
}

DC20RPG.DROPDOWN_DATA.spellTypes = {
  cantrip: "Cantrip",
  spell: "Spell",
  ritual: "Ritual"
}

DC20RPG.DROPDOWN_DATA.spellLists = {
  arcane: "Arcane",
  divine: "Divine",
  primal: "Primal"
}

DC20RPG.DROPDOWN_DATA.magicSchools = {
  astromancy: "Astromancy",
  chronomancy: "Chronomancy",
  conjuration: "Conjuration",
  destruction: "Destruction",
  divination: "Divination",
  enchantment: "Enchantment",
  illusion: "Illusion",
  necromancy: "Necromancy",
  protection: "Protection",
  restoration: "Restoration",
  transmutation: "Transmutation"
}

DC20RPG.DROPDOWN_DATA.components = {
  verbal: "Verbal",
  somatic: "Somatic",
  material: "Material"
}

DC20RPG.DROPDOWN_DATA.defences = {
  mystical: "Mystical Defense",
  physical: "Physical Defense"
}

DC20RPG.DROPDOWN_DATA.physicalDefenceFormulasLabels = {
  standard: "Standard Formula",
  standardMaxAgi: "Max Agility Limit",
  berserker: "Berserker Defense",
  patient: "Patient Defense",
  custom: "Custom Formula",
  flat: "Flat",
}

DC20RPG.DROPDOWN_DATA.mysticalDefenceFormulasLabels = {
  standard: "Standard Formula",
  custom: "Custom Formula",
  patient: "Patient Defense",
  flat: "Flat"
}

DC20RPG.DROPDOWN_DATA.moveTypes = {
  ground: "Ground Speed",
  glide: "Gliding Speed",
  burrow: "Burrowing Speed",
  climbing: "Climbing Speed",
  swimming: "Swimming Speed",
  flying: "Flying Speed",
}

DC20RPG.DROPDOWN_DATA.logicalExpressions = {
  "==": "=",
  "!=": "!=",
  ">=": ">=",
  ">": ">",
  "<=": "<=",
  "<": "<",
  "has": "has",
  "hasNot": "hasn't"
}

DC20RPG.DROPDOWN_DATA.formulaCategories = {
  damage: "Damage Formula",
  healing: "Healing Formula"
}

DC20RPG.DROPDOWN_DATA.physicalDamageTypes = {
  bludgeoning: "Bludgeoning",
  slashing: "Slashing",
  piercing: "Piercing",
},

DC20RPG.DROPDOWN_DATA.elementalDamageTypes = {
  corrosion: "Corrosion",
  cold: "Cold",
  fire: "Fire",
  lightning: "Lightning",
  poison: "Poison"
}

DC20RPG.DROPDOWN_DATA.mysticalDamageTypes = {
  psychic: "Psychic",
  radiant: "Radiant",
  sonic: "Sonic",
  umbral: "Umbral"
}

DC20RPG.DROPDOWN_DATA.damageResistances = {
  ...DC20RPG.DROPDOWN_DATA.physicalDamageTypes,
  ...DC20RPG.DROPDOWN_DATA.elementalDamageTypes,
  ...DC20RPG.DROPDOWN_DATA.mysticalDamageTypes,
}

DC20RPG.DROPDOWN_DATA.damageTypes = {
  ...DC20RPG.DROPDOWN_DATA.physicalDamageTypes,
  ...DC20RPG.DROPDOWN_DATA.elementalDamageTypes,
  ...DC20RPG.DROPDOWN_DATA.mysticalDamageTypes,
  true: "True"
}

DC20RPG.DROPDOWN_DATA.healingTypes = {
  heal: "Health",
  temporary: "Temporary"
}

DC20RPG.DROPDOWN_DATA.inventoryTypes = {
  weapon: "Weapon",
  equipment: "Equipment",
  consumable: "Consumable",
  loot: "Loot"
}

DC20RPG.DROPDOWN_DATA.spellsTypes = {
  spell: "Spell"
}

DC20RPG.DROPDOWN_DATA.techniquesTypes = {
  technique: "Technique"
}

DC20RPG.DROPDOWN_DATA.featuresTypes = {
  feature: "Feature"
}

DC20RPG.DROPDOWN_DATA.advancementItemTypes = {
  any: "Any Type",
  ...DC20RPG.DROPDOWN_DATA.featuresTypes,
  ...DC20RPG.DROPDOWN_DATA.spellsTypes,
  ...DC20RPG.DROPDOWN_DATA.techniquesTypes
}

DC20RPG.DROPDOWN_DATA.creatableTypes = {
  ...DC20RPG.DROPDOWN_DATA.inventoryTypes,
  ...DC20RPG.DROPDOWN_DATA.spellsTypes,
  ...DC20RPG.DROPDOWN_DATA.techniquesTypes,
  ...DC20RPG.DROPDOWN_DATA.featuresTypes
}

DC20RPG.DROPDOWN_DATA.allItemTypes = {
  ...DC20RPG.DROPDOWN_DATA.inventoryTypes,
  ...DC20RPG.DROPDOWN_DATA.spellsTypes,
  ...DC20RPG.DROPDOWN_DATA.techniquesTypes,
  ...DC20RPG.DROPDOWN_DATA.featuresTypes,
  class: "Class",
  subclass: "Subclass",
  ancestry: "Ancestry",
  background: "Background"
}

DC20RPG.DROPDOWN_DATA.featureSourceTypes = {
  class: "Class Talent",
  subclass: "Subclass Talent",
  talent: "General Talent",
  ancestry: "Ancestry Trait",
  inner: "Inner Feature",
  background: "Background Talent",
  monster: "Monster Feature",
  other: "Other"
}

DC20RPG.DROPDOWN_DATA.conditions = {
  bleeding: "Bleeding",
  blinded: "Blinded",
  burning: "Burning",
  charmed: "Charmed",
  dazed: "Dazed",
  heavilyDazed: "Heavily Dazed",
  deafened: "Deafened",
  doomed: "Doomed",
  exhaustion: "Exhaustion",
  exposed: "Exposed",
  frightened: "Frightened",
  grappled: "Grappled",
  hindered: "Hindered",
  impaired: "Impaired",
  heavilyImpaired: "Heavily Impaired",
  incapacitated: "Incapacitated",
  intimidated: "Intimidated",
  paralyzed: "Paralyzed",
  petrified: "Petrified",
  prone: "Prone",
  poisoned: "Poisoned",
  rattled: "Rattled",
  restrained: "Restrained",
  slowed: "Slowed",
  stunned: "Stunned",
  surprised: "Surprised",
  taunted: "Taunted",
  unconscious: "Unconscious"
}

DC20RPG.DROPDOWN_DATA.statusResistances = {
  magical: "Magical Effect",
  curse: "Curse",
  movement: "Forced Movement",
  ...DC20RPG.DROPDOWN_DATA.conditions
}

DC20RPG.DROPDOWN_DATA.currencyTypes = {
  pp: "PP",
  gp: "GP",
  sp: "SP",
  cp: "CP"
}

DC20RPG.DROPDOWN_DATA.invidualTargets = {
  self: "Self",
  ally: "Ally",
  enemy: "Enemy",
  creature: "Creature",
  object: "Object",
  space: "Space"
}

DC20RPG.DROPDOWN_DATA.areaTypes = {
  arc: "Arc",
  aura: "Aura",
  cone: "Cone",
  cube: "Cube",
  cylinder: "Cylinder",
  line: "Line",
  sphere: "Sphere",
  radius: "Radius",
  wall: "Wall",
  area: "Custom Area"
}

DC20RPG.DROPDOWN_DATA.durations = {
  instantaneous: "Instantaneous",
  continuous: "Continuous",
  concentration: "Concentration"
}

DC20RPG.DROPDOWN_DATA.timeUnits = {
  turns: "Turns",
  rounds: "Rounds",
  minutes: "Minutes",
  hours: "Hours",
  days: "Days",
  months: "Months",
  years: "Years",
  permanent: "Permanent",
  untilCanceled: "Until Canceled"
}

DC20RPG.DROPDOWN_DATA.restTypes = {
  quick: "Quick Rest",
  short: "Short Rest",
  long: "Long Rest",
  full: "Full Rest"
}

DC20RPG.DROPDOWN_DATA.resetTypes = {
  ...DC20RPG.DROPDOWN_DATA.restTypes,
  halfOnShort: "Half on Short Rest",
  combat: "Combat Start",
  round: "Round End",
}

DC20RPG.DROPDOWN_DATA.chargesResets = {
  ...DC20RPG.DROPDOWN_DATA.resetTypes,
  day: "Daily",
  charges: "Charges"
}

DC20RPG.DROPDOWN_DATA.rarities = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  veryRare: "Very Rare",
  legendary: "Legendary"
}

DC20RPG.DROPDOWN_DATA.properties = {
  agiDis: "Agi Checks DisADV",
  ammo: "Ammunition",
  attunement: "Attunement",
  concealable: "Concealable",
  finesee: "Finesee",
  focus: "Focus",
  reach: "Reach",
  requirement: "Requirement",
  reload: "Reload",
  special: "Special",
  thrown: "Thrown",
  twoHanded: "Two-Handed",
  versatile: "Versatile",
  sturdy: "Sturdy (Agility Checks DisADV)",
  damageReduction: "Damage Reduction",
  dense: "Dense (-1 Speed)",
  mobile: "Mobile",
  impact: "Impact",
  threatening: "Threatening",
  reinforced: "Reinforced (Max Agility Limit)",
  mounted: "Mounted",
  unwieldy: "Unwieldy",
  silent: "Silent",
  toss: "Toss",
  returning: "Returning",
  capture: "Capture",
  multiFaceted: "Multi-Faceted",
  guard: "Guard",
  heavy: "Heavy",
  longRanged: "Long-Ranged",
  silent: "Silent"
},

DC20RPG.DROPDOWN_DATA.rollTemplates = {
  dynamic: "Dynamic Attack Save",
  attack: "Attack",
  check: "Check",
  save: "Save",
  contest: "Contest",
}

DC20RPG.DROPDOWN_DATA.actionTypes = {
  attack: "Attack",
  check: "Check",
  other: "Other",
  help: "Help"
}

DC20RPG.DROPDOWN_DATA.attackTypes = {
  attack: "Attack Check",
  spell: "Spell Check"
}

DC20RPG.DROPDOWN_DATA.rangeTypes = {
  melee: "Melee Attack",
  ranged: "Range Attack"
}

DC20RPG.DROPDOWN_DATA.rollRequestCategory = {
  save: "Save",
  contest: "Contest"
}

DC20RPG.DROPDOWN_DATA.checkRangeType = {
  attackmelee: "Melee Attack",
  attackranged: "Range Attack",
  spellmelee: "Melee Spell",
  spellranged: "Range Spell",
}

DC20RPG.DROPDOWN_DATA.meleeWeaponStyles = {
  axe: "Axe Style",
  chained: "Chained Style",
  hammer: "Hammer Style",
  pick: "Pick Style",
  spear: "Spear Style",
  staff: "Staff Style",
  sword: "Sword Style",
  fist: "Fist Style",
  whip: "Whip Style"
}

DC20RPG.DROPDOWN_DATA.rangedWeaponStyles = {
  bow: "Bow Style",
  crossbow: "Crossbow Style"
}

DC20RPG.DROPDOWN_DATA.weaponStyles = {
  ...DC20RPG.DROPDOWN_DATA.meleeWeaponStyles,
  ...DC20RPG.DROPDOWN_DATA.rangedWeaponStyles
}

DC20RPG.DROPDOWN_DATA.jumpCalculationKeys = {
  ...DC20RPG.DROPDOWN_DATA.attributesWithPrime,
  flat: "Flat Value"
}

DC20RPG.DROPDOWN_DATA.templatesActivationEffectTypes = {
  "": "None",
  "all": "All Tokens",
  "enemy": "Enemy Tokens",
  "ally": "Ally Tokens",
  "selector": "Token Selector"
}

//=========================================================================
//        SYSTEM CONSTANTS - Some Ids and other hardcoded stuff           =
//=========================================================================
DC20RPG.SYSTEM_CONSTANTS.rollLevelChange = {
  adv: "Advantage", 
  dis: "Disadvantage"
}

DC20RPG.SYSTEM_CONSTANTS.weaponPropertiesCost = {
  attunement: 0,
  ammo: 0,
  concealable: 1,
  reach: 1,
  reload: 0,
  thrown: 1,
  twoHanded: -1,
  versatile: 1,
  impact: 1,
  unwieldy: -1,
  silent: 1,
  toss: 1,
  returning: 1,
  capture: 0,
  multiFaceted: 1,
  guard: 1,
  heavy: 2,
  longRanged: 1
}

DC20RPG.SYSTEM_CONSTANTS.skillMasteryLabel = {
  0: "Untrained",
  1: "Novice",
  2: "Adept",
  3: "Expert",
  4: "Master",
  5: "Grandmaster",
  6: "Grandmaster"
};

DC20RPG.SYSTEM_CONSTANTS.skillMasteryShort = {
  0: "-",
  1: "N",
  2: "A",
  3: "E",
  4: "M",
  5: "G",
  6: "G"
};

DC20RPG.SYSTEM_CONSTANTS.languageMasteryLabel = {
  0: "None",
  1: "Limited",
  2: "Fluent"
};

DC20RPG.SYSTEM_CONSTANTS.languageMasteryShort = {
  0: "-",
  1: "L",
  2: "F"
};

DC20RPG.SYSTEM_CONSTANTS.physicalDefenceFormulas = {
  standard: "8 + @combatMastery + @agi + @pd.armor + @pd.bonus",
  standardMaxAgi: "8 + @combatMastery + min(@agi, (@prime - 2)) + @pd.armor + @pd.bonus",
  berserker: "8 + @combatMastery + max(@mig, @agi) + 2 + @pd.bonus",
  patient: "8 + @combatMastery + @agi + 2 + @pd.bonus",
}

DC20RPG.SYSTEM_CONSTANTS.mysticalDefenceFormulas = {
  standard: "8 + @combatMastery + @int + @cha + @md.bonus",
  patient: "8 + @combatMastery + @int + @cha + 2 + @md.bonus"
}

DC20RPG.SYSTEM_CONSTANTS.martialExpansion = "Compendium.dc20rpg.system-items.Item.DYjIy2EGmwfarZ8s";

DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.skillsJournal = {
  awa: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.6851a51a9f15d1c4",
  ath: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.8b104447b1d960e6",
  inm: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.23617b0b7a169e72",
  acr: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.d3114a98aa864453",
  tri: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.63fe7ba50b1e9c4b",
  ste: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.d4a310e4732ae79c",
  inv: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.9375b012d5f7c44c",
  med: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.db5f127bd4a0a0a3",
  sur: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.c1344797193f0f24",
  ani: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.3137048f64f1c645",
  ins: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.1921d4109b53b5a4",
  inf: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.d9865d3eb4a80b80",

  nat: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.317c2463ca9e2e54",
  his: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.317c2463ca9e2e54",
  arc: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.317c2463ca9e2e54",
  rel: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.317c2463ca9e2e54",
  occ: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.317c2463ca9e2e54"
}

DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.tradeSkillsJournal = {
  ill: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.84fb932f01493190",
  mus: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.c45fd2157036eb90",
  the: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.3c604be28cd75826",

  alc: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.f759baf9513219b7",
  bla: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.b77f17d4b1fe67fb",
  gla: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.5a872530f63a838e",
  her: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.d4088b9caa0b5e57",
  jew: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.9b9d94f3d8fd5d9b",
  lea: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.77f2b40ce78ce1d6",
  scu: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.a3d3e54be24a94e5",
  tin: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.cb722fd99f416f28",
  wea: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.8122c92a2e41b5d8",

  bre: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.c68a4a7e6199ab4e",
  cap: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.29eae494d1252bb9",
  car: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.af8c083f0caa48bf",
  coo: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.e052d21ff643bbf2",
  mas: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.ad4816f876884c6a",
  veh: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.5629e619826c4318",

  cry: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.a52f5f4a609b2a69",
  dis: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.7810a6bd2240f662",
  gam: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.099e6502c3c9efd1",
  loc: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.dfb1fc4b07db7e44"
}

DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.languagesJournal = {
  com: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.7c09c15f48708ab6",
  hum: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.fe054cd41f7324d7",
  dwa: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.e3269983e1f15bdd",
  elv: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.d2596e95f9ce9e51",
  gno: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.bf3bca9d9f25574f",
  hal: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.26857b725bb65561",
  sig: "",
  gia: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.8af15d1b1ecf3f1c",
  dra: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.aeec869ac9433c2e",
  orc: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.b1ece17d99b70ef7",
  fey: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.a00054f4e8c9bd91",
  ele: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.433f89d45d3305ec",
  cel: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.68ebd6d2666663ec",
  fie: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.3288ec46ad7981d3",
  dee: "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.cf2ce5264b877fe2"
}

DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.weaponStylesJournal = {
  axe: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.mAcVFce6zbhRTnhT",
  chained: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.InTw8G1qVIu0Dp3v",
  hammer: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.Gfy8diDLkPtI8gDu",
  pick: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.tDkThSS22AdDCQns",
  spear: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.HNZkdDlCaaGo4IhU",
  staff: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.svYvbMnGphiuNJ8J",
  sword: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.AAFiBV3mzk7PpRTJ",
  fist: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.qfjN63bCAeQ2u6EM",
  whip: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.seYjPL2iUDDmUjkx",
  bow: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.oUiUr8lUymzGgi1Q",
  crossbow: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.InTw8G1qVIu0Dp2v"
}

DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.basicActionsItems = {
  attack: "Compendium.dc20rpg.system-items.Item.hN1j1N0Bh8gTy0pG",
  disarm: "Compendium.dc20rpg.system-items.Item.Ks9SnrRBfRhVWgWo",
  grapple: "Compendium.dc20rpg.system-items.Item.Uc2lzTTEJL8GEf5y",
  shove: "Compendium.dc20rpg.system-items.Item.QDPNjfb8u5Jn3XPL",
  tackle: "Compendium.dc20rpg.system-items.Item.IolKDTVBEKdYMiGQ",
  disengage: "Compendium.dc20rpg.system-items.Item.ZK9sD2F2Sq7Jt3Kz",
  fullDisengage: "Compendium.dc20rpg.system-items.Item.KyNqnZf5DBLasmon",
  dodge: "Compendium.dc20rpg.system-items.Item.Y6oevdLqA31GPcbt",
  fullDodge: "Compendium.dc20rpg.system-items.Item.fvJRQv7oI9Pgoudk",
  hide: "Compendium.dc20rpg.system-items.Item.N5w8JDg9ddpC8nkm",
  move: "Compendium.dc20rpg.system-items.Item.GjZ8kGIOKxTzs7ZE",
  help: "Compendium.dc20rpg.system-items.Item.Tzha5zpqwpCZFIQ5",
  object: "Compendium.dc20rpg.system-items.Item.aIaSBL0WEAQbINL7",
  spell: "Compendium.dc20rpg.system-items.Item.AXG3pw2NOpxaJziA",
  analyzeCreature: "Compendium.dc20rpg.system-items.Item.5aV1c024MqxOEJFp",
  calmAnimal: "Compendium.dc20rpg.system-items.Item.d3qUXdLMHegA8yID",
  combatInsight: "Compendium.dc20rpg.system-items.Item.g41WHLdM8uNaSCWG",
  conceal: "Compendium.dc20rpg.system-items.Item.dcpEpJZlvD56Kz8E",
  feint: "Compendium.dc20rpg.system-items.Item.BzJl9QYjAprURubF",
  intimidate: "Compendium.dc20rpg.system-items.Item.Ma2kZ3i6ansJoJOC",
  investigate: "Compendium.dc20rpg.system-items.Item.0Rk0wIUIa49m1gx7",
  jump: "Compendium.dc20rpg.system-items.Item.Z9UxQK1yb6Ht05Xr",
  medicine: "Compendium.dc20rpg.system-items.Item.ePDjVwzFEldfVy3z",
  mountedDefence: "Compendium.dc20rpg.system-items.Item.1KXLpI788cdgbe4O",
  passThrough: "Compendium.dc20rpg.system-items.Item.9KgyzSQbC5xbOwZ4",
  search: "Compendium.dc20rpg.system-items.Item.ZLnCG2WI5G58tEW0",
  attackOfOpportunity: "Compendium.dc20rpg.system-items.Item.1OVlkg9k0CcbBXYj",
  spellDuel: "Compendium.dc20rpg.system-items.Item.fzPWHzvBu1EWJ7Fr",
}

DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.conditionsJournal = {
  bleeding: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.2f734fbaa3b8881f",
  blinded: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.f077694c532c91db",
  burning: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.1e9464c8b54021be",
  charmed: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.259439ab9009626a",
  dazed: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.a5374646c90ea762",
  heavilyDazed: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.a5374646c90ea762",
  deafened: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.7a13ed2c7b473092",
  doomed: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.640ee4ad46ee9326",
  exhaustion: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.5f854990db081b73",
  exposed: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.2507619191ed4878",
  frightened: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.3aa022ab3832a663",
  grappled: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.26e5b30672a2f2ee",
  hindered: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.d364b24318878371",
  impaired: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.4dd13dd1f69eb979",
  heavilyImpaired: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.4dd13dd1f69eb979",
  incapacitated: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.28741dbfb0f76b1f",
  intimidated: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.b84fea814870008c",
  invisible: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.03d421bed31a57c0",
  paralyzed: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.f11c3bbb85280844",
  petrified: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.841bd7172a6c65ac",
  poisoned: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.d4f7d331064600ea",
  prone: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.78d57fafb2f0d47e",
  rattled: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.a9ebed1a2229a23d",
  restrained: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.34d6841b069fe825",
  slowed: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.12baa5af70fd911e",
  stunned: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.8d78ef1f2667dc23",
  surprised: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.047226f17d2dc62f",
  taunted: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.be22f2dd54351826",
  unconscious: "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.8e821a260a6219f1",
  bloodied1: "Compendium.dc20rpg.rules.JournalEntry.8f1ac218e59a6024.JournalEntryPage.f4e83780989a5489",
  bloodied2: "Compendium.dc20rpg.rules.JournalEntry.8f1ac218e59a6024.JournalEntryPage.f4e83780989a5489",
  concentration: "Compendium.dc20rpg.rules.JournalEntry.9812f1d12e4c2483.JournalEntryPage.2967cbb2bac7730d",
}

DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.propertiesJournal = {
  ammo: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.IpmJVCqJnQzf0PEh",
  concealable: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.cRUMPH5Vkc4eZ26J",
  reach: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.IRVvREIp7pesOtkB",
  reload: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.1oVYxj3fsucBTFqv",
  thrown: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.pMPVir3MnB8E5fNK",
  twoHanded: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.yTWxAF1ijfAmOPFy",
  versatile: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.6qKLjDuj2yFzrich",
  impact: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.eRclHKhWpouQHVIY",
  unwieldy: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.vRcRgNKeLkMSjO4w",
  silent: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.AX0JXkpLErDw9ONa",
  toss: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.iTsd5sG8SiaYCOA6",
  returning: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.1NPnFMz7rkb33Cog",
  capture: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.si6CLG1mtdRSJgdV",
  multiFaceted: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.d5boT5j6ZPsWscm6",
  guard: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.FKrFwwAOH2Ff5JKe",
  heavy: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.uuQtegS7r4BqkRWY",
  longRanged: "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.Lyx8rDSHTUqmdupW"
}

DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.multiclassOptions = {

}

DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.pathMasteries = {

}