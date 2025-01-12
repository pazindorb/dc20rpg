export const DC20RPG = {};

/***********************/
/****  TRANSLATION  ****/
/***********************/

DC20RPG.trnAttributes  = {
  "mig": "DC20RPG.AttributeMig",
  "agi": "DC20RPG.AttributeAgi",
  "int": "DC20RPG.AttributeInt",
  "cha": "DC20RPG.AttributeCha"
};

DC20RPG.trnSkills = {
  "awa": "DC20RPG.SkillAwa",

  "ath": "DC20RPG.SkillAth",
  "inm": "DC20RPG.SkillInm",

  "acr": "DC20RPG.SkillAcr",
  "tri": "DC20RPG.SkillTri",
  "ste": "DC20RPG.SkillSte",

  "inv": "DC20RPG.SkillInv",
  "med": "DC20RPG.SkillMed",
  "sur": "DC20RPG.SkillSur",

  "ani": "DC20RPG.SkillAni",
  "ins": "DC20RPG.SkillIns",
  "inf": "DC20RPG.SkillInf",

  "nat": "DC20RPG.SkillNat",
  "his": "DC20RPG.SkillHis",
  "arc": "DC20RPG.SkillArc",
  "rel": "DC20RPG.SkillRel",
  "occ": "DC20RPG.SkillOcc",

  "alc": "DC20RPG.SkillAlc",
  "bla": "DC20RPG.SkillBla",
  "bre": "DC20RPG.SkillBre",
  "cap": "DC20RPG.SkillCap",
  "car": "DC20RPG.SkillCar",
  "coo": "DC20RPG.SkillCoo",
  "cry": "DC20RPG.SkillCry",
  "dis": "DC20RPG.SkillDis",
  "gam": "DC20RPG.SkillGam",
  "gla": "DC20RPG.SkillGla",
  "her": "DC20RPG.SkillHer",
  "ill": "DC20RPG.SkillIll",
  "jew": "DC20RPG.SkillJew",
  "loc": "DC20RPG.SkillLoc",
  "lea": "DC20RPG.SkillLea",
  "mas": "DC20RPG.SkillMas",
  "mus": "DC20RPG.SkillMus",
  "scu": "DC20RPG.SkillScu",
  "the": "DC20RPG.SkillThe",
  "tin": "DC20RPG.SkillTin",
  "wea": "DC20RPG.SkillWea",
  "veh": "DC20RPG.SkillVeh"
};

DC20RPG.trnLanguages = {
  "com": "DC20RPG.LangCom",
  "hum": "DC20RPG.LangHum",
  "dwa": "DC20RPG.LangDwa",
  "elv": "DC20RPG.LangElv",
  "gno": "DC20RPG.LangGno",
  "hal": "DC20RPG.LangHal",
  "gia": "DC20RPG.LangGia",
  "dra": "DC20RPG.LangDra",
  "orc": "DC20RPG.LangOrc",
  "fey": "DC20RPG.LangFey",
  "ele": "DC20RPG.LangEle",
  "cel": "DC20RPG.LangCel",
  "fie": "DC20RPG.LangFie",
  "dee": "DC20RPG.LangDee"
}

DC20RPG.trnReductions = {
  "corrosion": "DC20RPG.Corrosion",
  "cold": "DC20RPG.Cold",
  "fire": "DC20RPG.Fire",
  "radiant": "DC20RPG.Radiant",
  "lightning": "DC20RPG.Lightning",
  "poison": "DC20RPG.Poison",
  "psychic": "DC20RPG.Psychic",
  "sonic": "DC20RPG.Sonic",
  "umbral": "DC20RPG.Umbral",
  "piercing": "DC20RPG.Piercing",
  "slashing": "DC20RPG.Slashing",
  "bludgeoning": "DC20RPG.Bludgeoning",
  "true": "DC20RPG.True"
}



/*************************/
/****  CONFIGURATION  ****/
/*************************/

DC20RPG.skillMasteryLabel = {
  0: "Untrained",
  1: "Novice",
  2: "Adept",
  3: "Expert",
  4: "Master",
  5: "Grandmaster"
};

DC20RPG.skillMasteryShort = {
  0: "-",
  1: "N",
  2: "T",
  3: "E",
  4: "M",
  5: "G"
};

DC20RPG.languageMasteryLabel = {
  0: "None",
  1: "Limited",
  2: "Fluent"
};

DC20RPG.languageMasteryShort = {
  0: "-",
  1: "L",
  2: "F"
};

DC20RPG.attributes = {
  "mig": "Might",
  "agi": "Agility",
  "int": "Inteligence",
  "cha": "Charisma"
};

DC20RPG.shortAttributes = {
  "mig": "MIG",
  "agi": "AGI",
  "int": "INT",
  "cha": "CHA",
  "prime": "PRI"
}

DC20RPG.attributesWithPrime = {
  "prime": "Prime",
  ...DC20RPG.attributes
}

DC20RPG.saveTypes = {
  "phy": "Physical",
  "men": "Mental",
  ...DC20RPG.attributes
}

DC20RPG.dcCalculationTypes = {
  "spell": "Spellcasting",
  "martial": "Martial",
  "flat": "Flat",
  ...DC20RPG.attributes
}

DC20RPG.skills = {
  "awa": "Awareness",

  "ath": "Athletics",
  "inm": "Intimidation",

  "acr": "Acrobatics",
  "tri": "Trickery",
  "ste": "Stealth",

  "inv": "Investigation",
  "med": "Medicine",
  "sur": "Survival",

  "ani": "Animal",
  "ins": "Insight",
  "inf": "Influence",

  "nat": "Nature",
  "his": "History",
  "arc": "Arcana",
  "rel": "Religion",
  "occ": "Occultism"
}

DC20RPG.skillsJournalUuid = {
  "awa": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.6851a51a9f15d1c4",
  "ath": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.8b104447b1d960e6",
  "inm": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.23617b0b7a169e72",
  "acr": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.d3114a98aa864453",
  "tri": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.63fe7ba50b1e9c4b",
  "ste": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.d4a310e4732ae79c",
  "inv": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.9375b012d5f7c44c",
  "med": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.db5f127bd4a0a0a3",
  "sur": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.c1344797193f0f24",
  "ani": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.3137048f64f1c645",
  "ins": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.1921d4109b53b5a4",
  "inf": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.d9865d3eb4a80b80",

  "nat": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.317c2463ca9e2e54",
  "his": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.317c2463ca9e2e54",
  "arc": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.317c2463ca9e2e54",
  "rel": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.317c2463ca9e2e54",
  "occ": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.317c2463ca9e2e54"
}

DC20RPG.tradeSkills = {
  "alc": "Alchemy",
  "bla": "Blacksmithing",
  "bre": "Brewing",
  "cap": "Carpentry",
  "car": "Cartography",
  "coo": "Cooking",
  "cry": "Cryptography",
  "dis": "Disguise",
  "gam": "Gaming",
  "gla": "Glassblower",
  "her": "Herbalism",
  "ill": "Illustration",
  "jew": "Jeweler",
  "lea": "Leatherworking",
  "loc": "Lockpicking",
  "mas": "Masonry",
  "mus": "Musician",
  "scu": "Sculpting",
  "the": "Theatre",
  "tin": "Tinkering",
  "wea": "Weaving",
  "veh": "Vehicles"
}

DC20RPG.tradeSkillsJournalUuid = {
  "ill": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.84fb932f01493190",
  "mus": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.c45fd2157036eb90",
  "the": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.3c604be28cd75826",

  "alc": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.f759baf9513219b7",
  "bla": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.b77f17d4b1fe67fb",
  "gla": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.5a872530f63a838e",
  "her": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.d4088b9caa0b5e57",
  "jew": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.9b9d94f3d8fd5d9b",
  "lea": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.77f2b40ce78ce1d6",
  "scu": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.a3d3e54be24a94e5",
  "tin": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.cb722fd99f416f28",
  "wea": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.8122c92a2e41b5d8",

  "bre": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.c68a4a7e6199ab4e",
  "cap": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.29eae494d1252bb9",
  "car": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.af8c083f0caa48bf",
  "coo": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.e052d21ff643bbf2",
  "mas": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.ad4816f876884c6a",
  "veh": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.5629e619826c4318",

  "cry": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.a52f5f4a609b2a69",
  "dis": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.7810a6bd2240f662",
  "gam": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.099e6502c3c9efd1",
  "loc": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.dfb1fc4b07db7e44"
}

DC20RPG.languagesJournalUuid = {
  "com": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.7c09c15f48708ab6",
  "hum": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.fe054cd41f7324d7",
  "dwa": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.e3269983e1f15bdd",
  "elv": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.d2596e95f9ce9e51",
  "gno": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.bf3bca9d9f25574f",
  "hal": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.26857b725bb65561",
  "gia": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.8af15d1b1ecf3f1c",
  "dra": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.aeec869ac9433c2e",
  "orc": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.b1ece17d99b70ef7",
  "fey": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.a00054f4e8c9bd91",
  "ele": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.433f89d45d3305ec",
  "cel": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.68ebd6d2666663ec",
  "fie": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.3288ec46ad7981d3",
  "dee": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.cf2ce5264b877fe2"
}

DC20RPG.checks = {
  "att": "Attack Check",
  "spe": "Spell Check",
  "mar": "Martial Check",

  "awa": "Awareness Check",

  "ath": "Athletics Check",
  "inm": "Intimidation Check",

  "acr": "Acrobatics Check",
  "tri": "Trickery Check",
  "ste": "Stealth Check",

  "inv": "Investigation Check",
  "med": "Medicine Check",
  "sur": "Survival Check",

  "ani": "Animal Check",
  "ins": "Insight Check",
  "inf": "Influence Check",

  "nat": "Nature Check",
  "his": "History Check",
  "arc": "Arcana Check",
  "rel": "Religion Check",
  "occ": "Occultism Check"
}

DC20RPG.allChecks = {
  "mig": "Might Check",
  "agi": "Agility Check",
  "int": "Inteligence Check",
  "cha": "Charisma Check",
  "prime": "Prime Check",
  ...DC20RPG.checks,
  "alc": "Alchemy Check",
  "bla": "Blacksmithing Check",
  "bre": "Brewing Check",
  "cap": "Carpentry Check",
  "car": "Cartography Check",
  "coo": "Cooking Check",
  "cry": "Cryptography Check",
  "dis": "Disguise Check",
  "gam": "Gaming Check",
  "gla": "Glassblower Check",
  "her": "Herbalism Check",
  "ill": "Illustration Check",
  "jew": "Jeweler Check",
  "lea": "Leatherworking Check",
  "loc": "Lockpicking Check",
  "mas": "Masonry Check",
  "mus": "Musician Check",
  "scu": "Sculpting Check",
  "the": "Theatre Check",
  "tin": "Tinkering Check",
  "wea": "Weaving Check",
  "veh": "Vehicles Check"
}

DC20RPG.contests = {
  "phy": "Physical Save",
  "men": "Mental Save",
  "mig": "Might Save",
  "agi": "Agility Save",
  "int": "Inteligence Save",
  "cha": "Charisma Save",
  ...DC20RPG.checks
}

DC20RPG.sizes = {
  "tiny": "Tiny",
  "small": "Small",
  "medium": "Medium",
  "large": "Large",
  "huge": "Huge",
  "gargantuan": "Gargantuan"
}

DC20RPG.weaponStyleOnly = {
  "axe": "Axe",
  "chained": "Chained",
  "hammer": "Hammer",
  "pick": "Pick",
  "spear": "Spear",
  "staff": "Staff",
  "sword": "Sword",
  "fist": "Fist",
  "whip": "Whip",
  "bow": "Bow",
  "crossbow": "Crossbow"
}

DC20RPG.meleeWeapons = {
  "axe": "Axe Style",
  "chained": "Chained Style",
  "hammer": "Hammer Style",
  "pick": "Pick Style",
  "spear": "Spear Style",
  "staff": "Staff Style",
  "sword": "Sword Style",
  "fist": "Fist Style",
  "whip": "Whip Style"
}

DC20RPG.rangedWeapons = {
  "bow": "Bow Style",
  "crossbow": "Crossbow Style"
}

DC20RPG.weaponStyles = {
  ...DC20RPG.meleeWeapons,
  ...DC20RPG.rangedWeapons
}

DC20RPG.weaponStylesJournalUuid = {
  "axe": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.mAcVFce6zbhRTnhT",
  "chained": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.InTw8G1qVIu0Dp3v",
  "hammer": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.Gfy8diDLkPtI8gDu",
  "pick": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.tDkThSS22AdDCQns",
  "spear": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.HNZkdDlCaaGo4IhU",
  "staff": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.svYvbMnGphiuNJ8J",
  "sword": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.AAFiBV3mzk7PpRTJ",
  "fist": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.qfjN63bCAeQ2u6EM",
  "whip": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.seYjPL2iUDDmUjkx",
  "bow": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.oUiUr8lUymzGgi1Q",
  "crossbow": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.InTw8G1qVIu0Dp2v"
}

DC20RPG.rarities = {
  "common": "Common",
  "uncommon": "Uncommon",
  "rare": "Rare",
  "veryRare": "Very Rare",
  "legendary": "Legendary"
}

DC20RPG.weaponTypes = {
  "melee": "Melee",
  "ranged": "Ranged",
  "special": "Special"
}

DC20RPG.equipmentTypes = {
  "light": "Light Armor",
  "heavy": "Heavy Armor",
  "lshield": "Light Shield",
  "hshield": "Heavy Shield",
  "clothing": "Clothing",
  "trinket": "Trinket"
}

DC20RPG.consumableTypes = {
  "ammunition": "Ammunition",
  "food": "Food",
  "poison": "Poison",
  "potion": "Potion",
  "ammunition": "Ammunition",
  "rod": "Rod",
  "scroll": "Scroll",
  "wand": "Wand",
  "trap": "Trap",
  "trinket": "Trinket"
}

DC20RPG.classTypes = {
  "martial": "Martial",
  "spellcaster": "Spellcaster",
  "hybrid": "Hybrid"
}

DC20RPG.featureSourceTypes = {
  "class": "Class",
  "subclass": "Subclass",
  "talent": "Talent",
  "ancestry": "Ancestry",
  "background": "Background",
  "monster": "Monster Feature",
  "other": "Other"
}

DC20RPG.basicActionsCategories = {
  "offensive": "Offensive",
  "defensive": "Defensive",
  "utility": "Utility",
  "reaction": "Reaction",
  "skillBased": "Skill Based"
}

DC20RPG.techniqueTypes = {
  "maneuver": "Maneuver",
  "technique": "Technique"
}

DC20RPG.spellTypes = {
  "cantrip": "Cantrip",
  "spell": "Spell",
  "ritual": "Ritual"
}

DC20RPG.spellLists = {
  "arcane": "Arcane",
  "divine": "Divine",
  "primal": "Primal"
}

DC20RPG.magicSchools = {
  "astromancy": "Astromancy",
  "chronomancy": "Chronomancy",
  "conjuration": "Conjuration",
  "destruction": "Destruction",
  "divination": "Divination",
  "enchantment": "Enchantment",
  "illusion": "Illusion",
  "necromancy": "Necromancy",
  "protection": "Protection",
  "restoration": "Restoration",
  "transmutation": "Transmutation"
}

DC20RPG.components = {
  "verbal": "Verbal",
  "somatic": "Somatic",
  "material": "Material"
}

DC20RPG.spellTags = {
  "fire": "Fire",
  "water": "Water",
  "gravity": "Gravity"
}

DC20RPG.invidualTargets = {
  "self": "Self",
  "ally": "Ally",
  "enemy": "Enemy",
  "creature": "Creature",
  "object": "Object",
  "space": "Space"
}

DC20RPG.areaTypes = {
  "arc": "Arc",
  "aura": "Aura",
  "cone": "Cone",
  "cube": "Cube",
  "cylinder": "Cylinder",
  "line": "Line",
  "sphere": "Sphere",
  "radius": "Radius",
  "wall": "Wall",
  "area": "Custom Area"
}

DC20RPG.durations = {
  "instantaneous": "Instantaneous",
  "continuous": "Continuous",
  "concentration": "Concentration"
}

DC20RPG.attackTypes = {
  "attack": "Attack Check",
  "spell": "Spell Check"
}

DC20RPG.timeUnits = {
  "turns": "Turns",
  "rounds": "Rounds",
  "minutes": "Minutes",
  "hours": "Hours",
  "days": "Days",
  "months": "Months",
  "years": "Years",
  "permanent": "Permanent",
  "untilCanceled": "Until Canceled"
}

DC20RPG.restTypes = {
  "quick": "Quick Rest",
  "short": "Short Rest",
  "long": "Long Rest",
  "full": "Full Rest"
}

DC20RPG.resetTypes = {
  ...DC20RPG.restTypes,
  "halfOnShort": "Half on Short Rest",
  "combat": "Combat Start",
  "round": "Round End",
}

DC20RPG.chargesResets = {
  ...DC20RPG.resetTypes,
  "day": "Daily",
  "charges": "Charges"
}

DC20RPG.eventTypes = {
  "basic": "Basic",
  "healing": "Apply Healing",
  "damage": "Apply Damage",
  "checkRequest": "Check Request",
  "saveRequest": "Save Request",
  "macro": "Run Effect Macro"
}

DC20RPG.allEventTriggers = {
  "turnStart": "Turn Start",
  "turnEnd": "Turn End",
  "targetConfirm": "Target Confirmed",
  "damageTaken": "Damage Taken",
  "healingTaken": "Healing Taken",
  "rollSave": "Save Roll",
  "rollCheck": "Check Roll",
  "rollItem": "Any Item Roll",
  "attack": "Item Attack Roll",
  "move": "Actor Move",
  "crit": "On Nat 20",
  "critFail": "On Nat 1",
  "actorWithIdStartsTurn": "Caster starts its turn",
  "actorWithIdEndsTurn": "Caster ends its turn",
  "combatStart": "Combat Start"
}

DC20RPG.reenableTriggers = {
  "": "",
  "turnStart": "Turn Start",
  "turnEnd": "Turn End",
  "actorWithIdStartsTurn": "Caster starts its turn",
  "actorWithIdEndsTurn": "Caster ends its turn",
  "combatStart": "Combat Start"
}

DC20RPG.actionTypes = {
  "attack": "Attack",
  "check": "Check",
  "other": "Other",
  "help": "Help"
}

DC20RPG.rollTemplates = {
  "dynamic": "Dynamic Attack Save",
  "attack": "Attack",
  "check": "Check",
  "save": "Save",
  "contest": "Contest",
}

DC20RPG.rollRequestCategory = {
  "save": "Save",
  "contest": "Contest"
}

DC20RPG.rangeTypes = {
  "melee": "Melee Attack",
  "ranged": "Range Attack"
}

DC20RPG.checkRangeType = {
  "attackmelee": "Melee Attack",
  "attackranged": "Range Attack",
  "spellmelee": "Melee Spell",
  "spellranged": "Range Spell",
}

DC20RPG.formulaCategories = {
  "damage": "Damage Formula",
  "healing": "Healing Formula"
}

DC20RPG.damageTypes = {
  "corrosion": "Corrosion",
  "bludgeoning": "Bludgeoning",
  "cold": "Cold",
  "fire": "Fire",
  "radiant": "Radiant",
  "lightning": "Lightning",
  "piercing": "Piercing",
  "poison": "Poison",
  "psychic": "Psychic",
  "slashing": "Slashing",
  "sonic": "Sonic",
  "umbral": "Umbral",
  "true": "True"
}

DC20RPG.physicalDamageTypes = {
  "bludgeoning": "Bludgeoning",
  "slashing": "Slashing",
  "piercing": "Piercing",
},

DC20RPG.elementalDamageTypes = {
  "corrosion": "Corrosion",
  "cold": "Cold",
  "fire": "Fire",
  "lightning": "Lightning",
  "poison": "Poison"
}

DC20RPG.mysticalDamageTypes = {
  "psychic": "Psychic",
  "radiant": "Radiant",
  "sonic": "Sonic",
  "umbral": "Umbral"
}

DC20RPG.healingTypes = {
  "heal": "Health",
  "temporary": "Temporary"
}

DC20RPG.currencyTypes = {
  "pp": "PP",
  "gp": "GP",
  "sp": "SP",
  "cp": "CP"
}

DC20RPG.properties = {
  "agiDis": "Agi Checks DisADV",
  "ammo": "Ammunition",
  "attunement": "Attunement",
  "concealable": "Concealable",
  "finesee": "Finesee",
  "focus": "Focus",
  "reach": "Reach",
  "requirement": "Requirement",
  "reload": "Reload",
  "special": "Special",
  "thrown": "Thrown",
  "twoHanded": "Two-Handed",
  "versatile": "Versatile",
  "sturdy": "Sturdy (Agility Checks DisADV)",
  "damageReduction": "Damage Reduction",
  "dense": "Dense (-1 Speed)",
  "mobile": "Mobile",
  "impact": "Impact",
  "threatening": "Threatening",
  "reinforced": "Reinforced (Max Agility Limit)",
  "mounted": "Mounted",
  "unwieldy": "Unwieldy",
  "silent": "Silent",
  "toss": "Toss",
  "returning": "Returning",
  "capture": "Capture",
  "multiFaceted": "Multi-Faceted",
  "guard": "Guard",
  "heavy": "Heavy",
  "longRanged": "Long-Ranged",
  "silent": "Silent"
},

DC20RPG.propertiesJournalUuid = {
  "ammo": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.IpmJVCqJnQzf0PEh",
  "concealable": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.cRUMPH5Vkc4eZ26J",
  "reach": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.IRVvREIp7pesOtkB",
  "reload": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.1oVYxj3fsucBTFqv",
  "thrown": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.pMPVir3MnB8E5fNK",
  "twoHanded": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.yTWxAF1ijfAmOPFy",
  "versatile": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.6qKLjDuj2yFzrich",
  "impact": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.eRclHKhWpouQHVIY",
  "unwieldy": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.vRcRgNKeLkMSjO4w",
  "silent": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.AX0JXkpLErDw9ONa",
  "toss": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.iTsd5sG8SiaYCOA6",
  "returning": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.1NPnFMz7rkb33Cog",
  "capture": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.si6CLG1mtdRSJgdV",
  "multiFaceted": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.d5boT5j6ZPsWscm6",
  "guard": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.FKrFwwAOH2Ff5JKe",
  "heavy": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.uuQtegS7r4BqkRWY",
  "longRanged": "Compendium.dc20rpg.rules.JournalEntry.x78xxCko7Ts0zPBi.JournalEntryPage.Lyx8rDSHTUqmdupW"
}

DC20RPG.inventoryTypes = {
  "weapon": "Weapon",
  "equipment": "Equipment",
  "consumable": "Consumable",
  "loot": "Loot"
}

DC20RPG.spellsTypes = {
  "spell": "Spell"
}

DC20RPG.techniquesTypes = {
  "technique": "Technique"
}

DC20RPG.featuresTypes = {
  "feature": "Feature"
}

DC20RPG.advancementItemTypes = {
  "any": "Any Type",
  ...DC20RPG.featuresTypes,
  ...DC20RPG.spellsTypes,
  ...DC20RPG.techniquesTypes
}

DC20RPG.creatableTypes = {
  ...DC20RPG.inventoryTypes,
  ...DC20RPG.spellsTypes,
  ...DC20RPG.techniquesTypes,
  ...DC20RPG.featuresTypes
}

DC20RPG.allItemTypes = {
  ...DC20RPG.inventoryTypes,
  ...DC20RPG.spellsTypes,
  ...DC20RPG.techniquesTypes,
  ...DC20RPG.featuresTypes,
  "class": "Class",
  "subclass": "Subclass",
  "ancestry": "Ancestry",
  "background": "Background"
}

DC20RPG.physicalDefenceFormulasLabels = {
  "standard": "Standard Formula",
  "standardMaxAgi": "Max Agility Limit",
  "berserker": "Berserker Defense",
  "patient": "Patient Defense",
  "custom": "Custom Formula",
  "flat": "Flat",
}

DC20RPG.physicalDefenceFormulas = {
  "standard": "8 + @combatMastery + @agi + @defences.physical.bonuses.armor",
  "standardMaxAgi": "8 + @combatMastery + min(@agi, (@prime - 2)) + @defences.physical.bonuses.armor",
  "berserker": "8 + @combatMastery + max(@mig, @agi) + 2",
  "patient": "8 + @combatMastery + @agi + 2",
}

DC20RPG.mysticalDefenceFormulasLabels = {
  "standard": "Standard Formula",
  "custom": "Custom Formula",
  "patient": "Patient Defense",
  "flat": "Flat"
}

DC20RPG.mysticalDefenceFormulas = {
  "standard": "8 + @combatMastery + @int + @cha",
  "patient": "8 + @combatMastery + @int + @cha + 2"
},

DC20RPG.jumpCalculationKeys = {
  ...DC20RPG.attributesWithPrime,
  "flat": "Flat Value"
},

DC20RPG.logicalExpressions = {
  "==": "=",
  "!=": "!=",
  ">=": ">=",
  ">": ">",
  "<=": "<=",
  "<": "<",
}

DC20RPG.masteries = {
  "weapons": "Weapons",
  "lightShield": "Light Shield",
  "heavyShield": "Heavy Shield",
  "lightArmor": "Light Armor",
  "heavyArmor": "Heavy Armor",
  "spellcasting": "Spellcasting",
  "weaponStyles": "Weapon Styles",
}

DC20RPG.defences = {
  "mystical": "Mystical Defense",
  "physical": "Physical Defense"
}

DC20RPG.conditions = {
  "charmed": "Charmed",
  "burning": "Burning",
  "bleeding": "Bleeding",
  "poisoned": "Poisoned",
  "taunted": "Taunted",
  "deafened": "Deafened",
  "blinded": "Blinded",
  "intimidated": "Intimidated",
  "rattled": "Rattled",
  "frightened": "Frightened",
  "slowed": "Slowed",
  "grappled": "Grappled",
  "exposed": "Exposed",
  "hindered": "Hindered",
  "restrained": "Restrained",
  "prone": "Prone",
  "incapacitated": "Incapacitated",
  "stunned": "Stunned",
  "paralyzed": "Paralyzed",
  "unconscious": "Unconscious",
  "petrified": "Petrified",
  "surprised": "Surprised",
  "doomed": "Doomed",
  "exhaustion": "Exhaustion",
  "impaired": "Impaired",
  "dazed": "Dazed"
}

DC20RPG.failedSaveEffects = {
  "magical": "Magical Effect",
  ...DC20RPG.conditions
}

DC20RPG.conditionsJournalUuid = {
  "bleeding": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.2f734fbaa3b8881f",
  "blinded": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.f077694c532c91db",
  "burning": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.1e9464c8b54021be",
  "charmed": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.259439ab9009626a",
  "dazed": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.a5374646c90ea762",
  "heavilyDazed": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.a5374646c90ea762",
  "deafened": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.7a13ed2c7b473092",
  "doomed": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.640ee4ad46ee9326",
  "exhaustion": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.5f854990db081b73",
  "exposed": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.2507619191ed4878",
  "frightened": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.3aa022ab3832a663",
  "grappled": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.26e5b30672a2f2ee",
  "hindered": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.d364b24318878371",
  "impaired": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.4dd13dd1f69eb979",
  "heavilyImpaired": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.4dd13dd1f69eb979",
  "incapacitated": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.28741dbfb0f76b1f",
  "intimidated": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.b84fea814870008c",
  "invisible": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.03d421bed31a57c0",
  "paralyzed": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.f11c3bbb85280844",
  "petrified": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.841bd7172a6c65ac",
  "poisoned": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.d4f7d331064600ea",
  "prone": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.78d57fafb2f0d47e",
  "rattled": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.a9ebed1a2229a23d",
  "restrained": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.34d6841b069fe825",
  "slowed": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.12baa5af70fd911e",
  "stunned": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.8d78ef1f2667dc23",
  "surprised": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.047226f17d2dc62f",
  "taunted": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.be22f2dd54351826",
  "unconscious": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.8e821a260a6219f1",
  "bloodied1": "Compendium.dc20rpg.rules.JournalEntry.8f1ac218e59a6024.JournalEntryPage.f4e83780989a5489",
  "bloodied2": "Compendium.dc20rpg.rules.JournalEntry.8f1ac218e59a6024.JournalEntryPage.f4e83780989a5489",
  "concentration": "Compendium.dc20rpg.rules.JournalEntry.9812f1d12e4c2483.JournalEntryPage.2967cbb2bac7730d",
}

DC20RPG.actions = {
  attack: "Attack",
  disarm: "Disarm",
  grapple: "Grapple",
  shove: "Shove",
  tackle: "Tackle",
  disengage: "Disengage",
  fullDisengage: "Full Disengage",
  dodge: "Dodge",
  fullDodge: "Full Dodge",
  hide: "Hide",
  spell: "Spell",
  move: "Move",
  help: "Help",
  object: "Object",
  attackOfOpportunity: "Attack of Opportunity",
  spellDuel: "Spell Duel",
  medicine: "Medicine",
  passThrough: "Pass Through",
  feint: "Feint",
  intimidate: "Intimidate",
  combatInsight: "Combat Insight",
  analyzeCreatureArcana: "Analyze Creature (Arcana)",
  analyzeCreatureHistory: "Analyze Creature (History)",
  analyzeCreatureNature: "Analyze Creature (Nature)",
  analyzeCreatureReligion: "Analyze Creature (Religion)",
  analyzeCreatureOccultism: "Analyze Creature (Occultism)",
  calmAnimal: "Calm Animal",
  investigate: "Investigate",
  search: "Search",
  conceal: "Conceal",
  mountedDefence: "Mounted Defense",
  jump: "Jump",
}

DC20RPG.moveTypes = {
  ground: "Ground Speed",
  glide: "Gliding Speed",
  burrow: "Burrowing Speed",
  climbing: "Climbing Speed",
  swimming: "Swimming Speed",
  flying: "Flying Speed",
}

DC20RPG.basicActionsItemsUuid = {
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
  analyzeCreatureArcana: "Compendium.dc20rpg.system-items.Item.2WH7Vpld9ylsbOvi",
  analyzeCreatureHistory: "Compendium.dc20rpg.system-items.Item.YrlfLHnp9Nnpl1LY",
  analyzeCreatureNature: "Compendium.dc20rpg.system-items.Item.b4GqFH5BSPAssSPq",
  analyzeCreatureOccultism: "Compendium.dc20rpg.system-items.Item.ftQFZouG5VXCY1yM",
  analyzeCreatureReligion: "Compendium.dc20rpg.system-items.Item.5aV1c024MqxOEJFp",
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

DC20RPG.martialExpansion = "Compendium.dc20rpg.system-items.Item.DYjIy2EGmwfarZ8s";

DC20RPG.baseClassSpecialIds = {
  barbarian: "Barbarian",
  bard: "Bard",
  cleric: "Cleric",
  commander: "Commander",
  druid: "Druid",
  fighter: "Fighter",
  monk: "Monk",
  ranger: "Ranger",
  rogue: "Rogue",
  spellblade: "Spellblade",
  sorcerer: "Sorcerer",
  warlock: "Warlock",
  wizard: "Wizard"
}