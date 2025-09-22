import { sendDescriptionToChat } from "../chat/chat-message.mjs";
import { createRestDialog, RestDialog } from "../dialogs/rest.mjs";
import { promptItemRoll, promptItemRollToOtherPlayer, promptRoll, promptRollToOtherPlayer, RollDialog } from "../roll/rollDialog.mjs";
import { getSimplePopup, sendSimplePopupToActorOwners, sendSimplePopupToUsers, SimplePopup } from "../dialogs/simple-popup.mjs";
import { TokenSelector } from "../dialogs/token-selector.mjs";
import { DC20RpgActor } from "../documents/actor.mjs";
import { DC20RpgCombatant } from "../documents/combatant.mjs";
import { DC20RpgItem } from "../documents/item.mjs";
import { DC20RpgTokenDocument } from "../documents/tokenDoc.mjs";
import DC20RpgMeasuredTemplate from "../placeable-objects/measuredTemplate.mjs";
import { DC20Roll } from "../roll/rollApi.mjs";
import { ColorSetting } from "../settings/colors.mjs";
import { forceRunMigration } from "../settings/migrationRunner.mjs";
import { addStatusWithIdToActor, getStatusWithId, hasStatusWithId, removeStatusWithIdFromActor } from "../statusEffects/statusUtils.mjs";
import { makeMoveAction, prepareHelpAction } from "./actors/actions.mjs";
import { prepareCheckDetailsFor, prepareSaveDetailsFor } from "./actors/attrAndSkills.mjs";
import { canSubtractBasicResource, canSubtractCustomResource, regainBasicResource, regainCustomResource, subtractAP, subtractBasicResource, subtractCustomResource } from "./actors/costManipulator.mjs";
import { reenableEventsOn, registerEventReenableTrigger, registerEventTrigger, registerEventType, runEventsFor } from "./actors/events.mjs";
import { createItemOnActor, deleteItemFromActor, getItemFromActorByKey, updateItemOnActor } from "./actors/itemsOnActor.mjs";
import { addNewKeyword, addUpdateItemToKeyword, removeKeyword, removeUpdateItemFromKeyword, updateKeywordValue } from "./actors/keywords.mjs";
import { applyDamage, applyHealing } from "./actors/resources.mjs";
import { createToken, deleteToken, getAllTokensForActor, getSelectedTokens, getTokenForActor } from "./actors/tokens.mjs";
import { createEffectOn, createOrDeleteEffect, deleteEffectFrom, getEffectById, getEffectByKey, getEffectByName, toggleEffectOn, updateEffectOn } from "./effects.mjs";
import { createTemporaryMacro, registerItemMacroTrigger, rollItemWithName,runTemporaryItemMacro, runTemporaryMacro } from "./macros.mjs";
import { calculateForTarget, tokenToTarget } from "./targets.mjs";
import { getActiveActorOwners, getIdsOfActiveActorOwners } from "./users.mjs";
import { toSelectOptions } from "./utils.mjs";
import { AgainstStatus, Conditional, Enhancement, Formula, Macro, RollRequest } from "../documents/item/item-creators.mjs";

export function prepareDC20tools() {
  window.DC20 = {
    dialog: {
      SimplePopup,
      TokenSelector,
      RollDialog,
      RestDialog,
    },
    creators: {
      Conditional,
      Enhancement,
      Formula,
      RollRequest,
      AgainstStatus,
      Macro,
    },
    DC20Roll,
  }

  game.dc20rpg = {
    DC20RpgActor,
    DC20RpgItem,
    DC20RpgCombatant,
    DC20RpgMeasuredTemplate,
    DC20RpgTokenDocument,
    ColorSetting,
    rollItemWithName,
    forceRunMigration,
    effects: {
      createEffectOn,
      updateEffectOn,
      deleteEffectFrom,
      getEffectByName,
      getEffectById,
      getEffectByKey,
      toggleEffectOn,
      createOrDeleteEffect,
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
    rolls: {
      prepareCheckDetailsFor,
      prepareSaveDetailsFor,
      promptRoll,
      promptItemRoll,
      promptRollToOtherPlayer,
      promptItemRollToOtherPlayer,
    },
    tools: {
      getSelectedTokens,
      createToken,
      deleteToken,
      getTokenForActor,
      getAllTokensForActor,
      createItemOnActor,
      updateItemOnActor,
      deleteItemFromActor,
      getItemFromActorByKey,
      promptRoll,
      promptItemRoll,
      promptRollToOtherPlayer,
      promptItemRollToOtherPlayer,
      getSimplePopup,
      sendSimplePopupToUsers,
      sendSimplePopupToActorOwners,
      getActiveActorOwners,
      getIdsOfActiveActorOwners,
      tokenToTarget,
      calculateForTarget,
      applyDamage,
      applyHealing,
      makeMoveAction,
      prepareHelpAction,
      createRestDialog,
      sendDescriptionToChat,
      toSelectOptions
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
  const trades = {};
  Object.entries(skillStore.trades).forEach(([key, skill]) => trades[key] = CONFIG.DC20RPG.trades[key] || skill.label);
  CONFIG.DC20RPG.trades = trades;
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
  Object.entries(CONFIG.DC20RPG.trades).forEach(([key, label]) => {
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
  resourceChange: "Resource Change",
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
}

DC20RPG.trades = {
  alc: "Alchemy",
  arc: "Arcana",
  bla: "Blacksmithing",
  bre: "Brewing",
  cap: "Carpentry",
  car: "Cartography",
  coo: "Cooking",
  cry: "Cryptography",
  dis: "Disguise",
  eng: "Engineering",
  gam: "Gaming",
  gla: "Glassblower",
  her: "Herbalism",
  his: "History",
  ill: "Illustration",
  jew: "Jeweler",
  lea: "Leatherworking",
  loc: "Lockpicking",
  mas: "Masonry",
  mus: "Musician",
  nat: "Nature",
  occ: "Occultism",
  rel: "Religion",
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

DC20RPG.DROPDOWN_DATA.storageTypes = {
  partyInventory: "Party Inventory",
  randomLootTable: "Random Loot Table",
  vendor: "Vendor"
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
  prime: "PRI",
  max: "MAX"
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
  ranged: "Ranged"
}

DC20RPG.DROPDOWN_DATA.armorTypes = {
  light: "Light Armor",
  heavy: "Heavy Armor",
}

DC20RPG.DROPDOWN_DATA.shieldTypes = {
  lshield: "Light Shield",
  hshield: "Heavy Shield",
}

DC20RPG.DROPDOWN_DATA.equipmentTypes = {
  ...DC20RPG.DROPDOWN_DATA.armorTypes,
  ...DC20RPG.DROPDOWN_DATA.shieldTypes,
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
},

DC20RPG.DROPDOWN_DATA.equipmentSlots = {
  head: "Head",
  neck: "Neck",
  mantle: "Mantle",
  body: "Body",
  waist: "Waist",
  hand: "Hand",
  ring: "Ring",
  feet: "Feet",
  trinket: "Trinket",
  weapon: "Weapon",
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
  area: "Area Defense",
  precision: "Precision Defense"
}

DC20RPG.DROPDOWN_DATA.precisionDefenceFormulasLabels = {
  standard: "Standard Formula",
  standardMaxAgi: "Max Agility Limit",
  berserker: "Berserker Defense",
  patient: "Patient Defense",
  custom: "Custom Formula",
  flat: "Flat",
}

DC20RPG.DROPDOWN_DATA.areaDefenceFormulasLabels = {
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

DC20RPG.DROPDOWN_DATA.allFormulaCategories = {
  ...DC20RPG.DROPDOWN_DATA.formulaCategories,
  other: "Other Formula"
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
  poison: "Poison",
  sonic: "Sonic",
}

DC20RPG.DROPDOWN_DATA.mysticalDamageTypes = {
  psychic: "Psychic",
  radiant: "Radiant",
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
  container: "Container",
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
  deafened: "Deafened",
  disoriented: "Disoriented",
  doomed: "Doomed",
  exhaustion: "Exhaustion",
  exposed: "Exposed",
  frightened: "Frightened",
  hindered: "Hindered",
  immobilized: "Immobilized",
  impaired: "Impaired",
  incapacitated: "Incapacitated",
  intimidated: "Intimidated",
  paralyzed: "Paralyzed",
  petrified: "Petrified",
  poisoned: "Poisoned",
  restrained: "Restrained",
  slowed: "Slowed",
  stunned: "Stunned",
  surprised: "Surprised",
  taunted: "Taunted",
  tethered: "Tethered",
  terrified: "Terrified",
  unconscious: "Unconscious",
  weakened: "Weakened",
}

DC20RPG.DROPDOWN_DATA.statusResistances = {
  magical: "Magical Effect",
  curse: "Curse",
  movement: "Forced Movement",
  prone: "Prone",
  grappled: "Grappled",
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
  space: "Spaces"
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
  sustain: "Sustained"
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
  halfOnShort: "Short Rest (Regain Half)",
  long4h: "Long Rest (First 4h)",
  combatStart: "Combat Start",
  combatEnd: "Combat End",
  roundStart: "Round Start",
  roundEnd: "Round End",
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
  all: "All Tokens",
  enemy: "Enemy Tokens",
  ally: "Ally Tokens",
  selector: "Token Selector"
}

DC20RPG.DROPDOWN_DATA.difficultTerrainTypes = {
  "": "None",
  all: "All Tokens",
  friendly: "Friendly Disposition Tokens",
  hostile: "Hostile Disposition Tokens"
}

//=========================================================================
//        SYSTEM CONSTANTS - Some Ids and other hardcoded stuff           =
//=========================================================================
DC20RPG.PROPERTIES = {
  attunement: {
    label: "dc20rpg.properties.attunement",
    for: ["melee", "ranged", "lshield", "hshield", "light", "heavy", "other"],
    cost: 0,
    journalUuid: ""
  },
  ammo: {
    label: "dc20rpg.properties.ammo",
    for: ["ranged"],
    cost: 0,
    ammoId: "",
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.IpmJVCqJnQzf0PEh"
  },
  concealable: {
    label: "dc20rpg.properties.concealable",
    for: ["melee"],
    cost: 1,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.cRUMPH5Vkc4eZ26J"
  },
  guard: {
    label: "dc20rpg.properties.guard",
    for: ["melee"],
    cost: 1,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.FKrFwwAOH2Ff5JKe"
  },
  heavy: {
    label: "dc20rpg.properties.heavy",
    for: ["melee", "ranged"],
    cost: 2,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.uuQtegS7r4BqkRWY"
  },
  impact: {
    label: "dc20rpg.properties.impact",
    for: ["melee"],
    cost: 1,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.eRclHKhWpouQHVIY"
  },
  longRanged: {
    label: "dc20rpg.properties.longRanged",
    for: ["ranged"],
    cost: 1,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.Lyx8rDSHTUqmdupW"
  },
  multiFaceted: {
    label: "dc20rpg.properties.multiFaceted",
    for: ["melee"],
    cost: 1,
    selected: "first",
    weaponStyle: {
      first: "",
      second: ""
    },
    damageType: {
      first: "",
      second: ""
    },
    labelKey: "",
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.d5boT5j6ZPsWscm6"
  },
  reach: {
    label: "dc20rpg.properties.reach",
    for: ["melee"],
    cost: 1,
    value: 1,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.IRVvREIp7pesOtkB"
  },
  reload: {
    label: "dc20rpg.properties.reload",
    for: ["ranged"],
    cost: 0,
    loaded: true,
    value: 1,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.1oVYxj3fsucBTFqv"
  },
  silent: {
    label: "dc20rpg.properties.silent",
    for: ["ranged"],
    cost: 1,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.AX0JXkpLErDw9ONa"
  },
  toss: {
    label: "dc20rpg.properties.toss",
    for: ["melee", "lshield"],
    cost: 1,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.iTsd5sG8SiaYCOA6"
  },
  thrown: {
    label: "dc20rpg.properties.thrown",
    for: ["melee"],
    cost: 1,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.pMPVir3MnB8E5fNK"
  },
  twoHanded: {
    label: "dc20rpg.properties.twoHanded",
    for: ["melee", "ranged"],
    cost: -1,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.yTWxAF1ijfAmOPFy"
  },
  unwieldy: {
    label: "dc20rpg.properties.unwieldy",
    for: ["melee", "ranged"],
    cost: -1,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.vRcRgNKeLkMSjO4w"
  },
  versatile: {
    label: "dc20rpg.properties.versatile",
    for: ["melee"],
    cost: 1,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.6qKLjDuj2yFzrich"
  },
  returning: {
    label: "dc20rpg.properties.returning",
    for: ["melee"],
    cost: 1,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.1NPnFMz7rkb33Cog"
  },
  capture: {
    label: "dc20rpg.properties.capture",
    for: ["melee"],
    cost: 1,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.si6CLG1mtdRSJgdV"
  },

  adIncrease: {
    label: "dc20rpg.properties.adIncrease",
    for: ["lshield", "hshield", "light", "heavy"],
    cost: 1,
    value: 1,
    valueCostMultiplier: true,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.qLqSJ8hpW0yvogRt.JournalEntryPage.sL7FFcPq9tZMnsQp"
  },
  pdIncrease: {
    label: "dc20rpg.properties.pdIncrease",
    for: ["lshield", "hshield", "light", "heavy"],
    cost: 1,
    value: 1,
    valueCostMultiplier: true,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.qLqSJ8hpW0yvogRt.JournalEntryPage.hoFd7xUj99sFJhkf"
  },
  edr: {
    label: "dc20rpg.properties.edr",
    for: ["hshield", "light", "heavy"],
    cost: 2,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.qLqSJ8hpW0yvogRt.JournalEntryPage.wJIrMxAQeTnZejZk"
  },
  pdr: {
    label: "dc20rpg.properties.pdr",
    for: ["hshield", "heavy"],
    cost: 2,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.qLqSJ8hpW0yvogRt.JournalEntryPage.LR1XjGbhGGaJamtB"
  },
  bulky: {
    label: "dc20rpg.properties.bulky",
    for: ["hshield", "heavy"],
    cost: -1,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.qLqSJ8hpW0yvogRt.JournalEntryPage.P5hNhnMIhbqVtTeR"
  },
  rigid: {
    label: "dc20rpg.properties.rigid",
    for: ["hshield", "heavy"],
    cost: -1,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.qLqSJ8hpW0yvogRt.JournalEntryPage.MB8nIR0MU7A9fPmo"
  },
  grasp: {
    label: "dc20rpg.properties.grasp",
    for: ["lshield"],
    cost: 1,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.qLqSJ8hpW0yvogRt.JournalEntryPage.i0kF5bqDBVrU4byE"
  },
  mounted: {
    label: "dc20rpg.properties.mounted",
    for: ["hshield"],
    cost: 1,
    journalUuid: "Compendium.dc20rpg.rules.JournalEntry.qLqSJ8hpW0yvogRt.JournalEntryPage.D4tbxGmWGbShvtYp"
  },
}

DC20RPG.ICONS = {
  martialExpansion: "icons/skills/melee/weapons-crossed-swords-yellow.webp",
  cantrips: "icons/sundries/scrolls/scroll-bound-blue-white.webp",
  spells: "icons/skills/trades/academics-book-study-runes.webp",
  maneuvers: "icons/skills/melee/shield-block-bash-blue.webp",
  techniques: "icons/skills/melee/spear-tips-quintuple-orange.webp",
  attributes: "icons/skills/trades/academics-investigation-puzzles.webp"
}

DC20RPG.SYSTEM_CONSTANTS.rollLevelChange = {
  adv: "Advantage", 
  dis: "Disadvantage"
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

DC20RPG.SYSTEM_CONSTANTS.precisionDefenceFormulas = {
  standard: "8 + @combatMastery + @agi + @int + @pd.bonus",
}

DC20RPG.SYSTEM_CONSTANTS.areaDefenceFormulas = {
  standard: "8 + @combatMastery + @mig + @cha + @ad.bonus",
}

DC20RPG.SYSTEM_CONSTANTS.martialExpansion = "Compendium.dc20rpg.system-items.Item.DYjIy2EGmwfarZ8s";
DC20RPG.SYSTEM_CONSTANTS.spellcasterStamina = "Compendium.dc20rpg.system-items.Item.y7T8fH64IizcTw0K";

DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.deathsDoor = "Compendium.dc20rpg.rules.JournalEntry.amGWJPNztuALU8Fw"

DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.skillsJournal = {
  awa: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.e8d158aa79d9386e",
  ath: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.79561601ab4fde28",
  inm: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.b1b3452377f4d08c",
  acr: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.1dca3f8a2cf5a0f1",
  tri: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.ac98ee68ee06c485",
  ste: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.ec19af19bb7b55ef",
  inv: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.8fbe08ada0130e47",
  med: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.da6ce05121f5034e",
  sur: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.8c33adc637b3a1eb",
  ani: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.0ef16eb14c1a1949",
  ins: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.58253539b0e00f1d",
  inf: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.2988a8b8837f8347",
}

DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.tradesJournal = {
  ill: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.44af238d059dc591",
  mus: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.2c03a393671adfab",
  the: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.80d0246ffad3fc76",

  alc: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.2f1acce4ff8ae20e",
  bla: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.21198676e164533a",
  gla: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.3b0902b29165ffa4",
  her: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.c5e2ba07c7e317ac",
  jew: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.209ab0fce5b680e2",
  lea: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.b0446a7cd986ad04",
  scu: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.c6bc766b1646e931",
  tin: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.cc55cb96554dcf45",
  wea: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.193188c92ecf500c",

  bre: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.27093a368b6f7506",
  cap: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.5ffdb6f1879759c4",
  car: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.9601364d226e6bea",
  coo: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.d891f747ed539da6",
  mas: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.d547a198159fa5b5",
  veh: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.34ad7b0124f6cf1f",

  cry: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.821e481d694886da",
  dis: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.9d9eb42b43776bba",
  gam: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.0571b52f61d4a44e",
  loc: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.524e18ef64bf65c5",

  eng: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.GzTqr5DjfMF1Lqni",
  nat: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.9lx5NFMGbKa6wOug",
  his: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.3mvCqsfRkrGoNHAL",
  arc: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.2yu7rx90wveBO7W0",
  rel: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.PVUfWyrhkbBrn79q",
  occ: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.3Pq6ozSK8IoRO98l"
}

DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.languagesJournal = {
  com: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.5533596a44ec5abe",
  hum: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.5c5b070fd21c5dc4",
  dwa: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.b19668b820dce96e",
  elv: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.b24421fab355d18a",
  gno: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.3bddc67a463a2d4e",
  hal: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.c23a0811a9f258bf",
  sig: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.8252c71478125e56",
  gia: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.1d58911794446212",
  dra: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.4c451028e49dbba2",
  orc: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.cb00684b434793b9",
  fey: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.bd5baac08689fbf5",
  ele: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.db7bc5ab07d6aa49",
  cel: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.9e5e2ff0591520d4",
  fie: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.51a47d9b7407f9e6",
  dee: "Compendium.dc20rpg.rules.JournalEntry.Mkbcj2BN9VUgitFb.JournalEntryPage.876e8847369cd29c"
}

DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.weaponStylesJournal = {
  axe: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.mAcVFce6zbhRTnhT",
  chained: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.InTw8G1qVIu0Dp3v",
  hammer: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.Gfy8diDLkPtI8gDu",
  pick: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.tDkThSS22AdDCQns",
  spear: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.HNZkdDlCaaGo4IhU",
  staff: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.svYvbMnGphiuNJ8J",
  sword: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.AAFiBV3mzk7PpRTJ",
  fist: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.qfjN63bCAeQ2u6EM",
  whip: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.seYjPL2iUDDmUjkx",
  bow: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.oUiUr8lUymzGgi1Q",
  crossbow: "Compendium.dc20rpg.rules.JournalEntry.51wyjg5pkl8Vmh8e.JournalEntryPage.InTw8G1qVIu0Dp2v"
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

DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.unarmedStrike = "Compendium.dc20rpg.system-items.Item.7wavDCvKyFj2HDV4";

DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.conditionsJournal = {
  bleeding: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.8bb508660e223820",
  blinded: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.3d20d56dae98e774",
  burning: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.4a7c7ed21c99f0d5",
  charmed: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.0f27a9c67ee55f2c",
  dazed: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.6f64926856e0375b",
  disoriented: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.aiyTcZJdK1Qjbmxe",
  deafened: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.5fa74b85758bd263",
  doomed: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.89c5df57ec2d8d0e",
  exhaustion: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.5c530bfaa0e69dbb",
  exposed: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.73d26b54fce004a0",
  frightened: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.f2d19e12af30f93d",
  grappled: "Compendium.dc20rpg.rules.JournalEntry.HNPA8Fd7ynirYUBq.JournalEntryPage.TfenWPpkGi8scnt2",
  immobilized: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.X89JSxkV4yuhRxKk",
  hindered: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.3be8114c415718d2",
  impaired: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.610e6b3221204f0a",
  weakened: "Compendium.world.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.0qADnucZuuZHI9XW",
  incapacitated: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.e49439b5f79839d3",
  intimidated: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.25a5c54b07df5a3f",
  invisible: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.2226eef8173ad6f0",
  paralyzed: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.229ca0b7af175638",
  petrified: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.60baaa6572e920ef",
  poisoned: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.d91b084c66aa513d",
  prone: "Compendium.dc20rpg.rules.JournalEntry.HNPA8Fd7ynirYUBq.JournalEntryPage.0wgHQIXjhxgu9i0s",
  tethered: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.w9QjKl0BzncI1DRv",
  terrified: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.UkBt66vXWP3eyEOj",
  restrained: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.73e24193c57aeb8a",
  slowed: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.2370179bf647d65e",
  stunned: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.2939ce776edfd6fa",
  fullyStunned: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.2939ce776edfd6fa",
  surprised: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.9b127a80c6770c71",
  taunted: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.5b8703add31783de",
  unconscious: "Compendium.dc20rpg.rules.JournalEntry.x06moaa9pWzbdrxB.JournalEntryPage.e4b6147dfec70860",
  bloodied: "Compendium.dc20rpg.rules.JournalEntry.amGWJPNztuALU8Fw.JournalEntryPage.cb4fe4f4f35d6275",
  wellBloodied: "Compendium.dc20rpg.rules.JournalEntry.amGWJPNztuALU8Fw.JournalEntryPage.cb4fe4f4f35d6275",
  deathsDoor: "Compendium.dc20rpg.rules.JournalEntry.amGWJPNztuALU8Fw.JournalEntryPage.000a46e5db7cb982",
  partiallyConcealed: "Compendium.dc20rpg.rules.JournalEntry.UgSNzjIdhqUjQ9Yo.JournalEntryPage.da1f84c1f010eae2",
  fullyConcealed: "Compendium.dc20rpg.rules.JournalEntry.UgSNzjIdhqUjQ9Yo.JournalEntryPage.da1f84c1f010eae2",
}

DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.advancementToolitps = {
  martial: "Compendium.dc20rpg.rules.JournalEntry.7TW9dtmP9JvKJ1rq.JournalEntryPage.0964d3cdbf002a1f",
  spellcaster: "Compendium.dc20rpg.rules.JournalEntry.7TW9dtmP9JvKJ1rq.JournalEntryPage.60d02227dff91b93",
  basic: "Compendium.dc20rpg.rules.JournalEntry.7TW9dtmP9JvKJ1rq.JournalEntryPage.3110b5966d24d4c0",
  adept: "Compendium.dc20rpg.rules.JournalEntry.7TW9dtmP9JvKJ1rq.JournalEntryPage.9125c9f4869ec1c6",
  expert: "Compendium.dc20rpg.rules.JournalEntry.7TW9dtmP9JvKJ1rq.JournalEntryPage.99d9c79cd150de60",
  master: "Compendium.dc20rpg.rules.JournalEntry.7TW9dtmP9JvKJ1rq.JournalEntryPage.2665cabf5cd235fa",
  grandmaster: "Compendium.dc20rpg.rules.JournalEntry.7TW9dtmP9JvKJ1rq.JournalEntryPage.e4e18eee9d6f8ac2",
  legendary: "Compendium.dc20rpg.rules.JournalEntry.7TW9dtmP9JvKJ1rq.JournalEntryPage.8f1ea8b9912b1fe3"
}

DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.deathsDoor = "Compendium.dc20rpg.rules.JournalEntry.amGWJPNztuALU8Fw.JournalEntryPage.000a46e5db7cb982"