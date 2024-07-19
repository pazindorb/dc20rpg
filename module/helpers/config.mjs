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
  "Awareness": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.6851a51a9f15d1c4",
  "Athletics": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.8b104447b1d960e6",
  "Intimidation": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.23617b0b7a169e72",
  "Acrobatics": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.d3114a98aa864453",
  "Trickery": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.63fe7ba50b1e9c4b",
  "Stealth": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.d4a310e4732ae79c",
  "Investigation": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.9375b012d5f7c44c",
  "Medicine": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.db5f127bd4a0a0a3",
  "Survival": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.c1344797193f0f24",
  "Animal": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.3137048f64f1c645",
  "Insight": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.1921d4109b53b5a4",
  "Influence": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.d9865d3eb4a80b80",

  "Nature": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.317c2463ca9e2e54",
  "History": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.317c2463ca9e2e54",
  "Arcana": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.317c2463ca9e2e54",
  "Religion": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.317c2463ca9e2e54",
  "Occultism": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.317c2463ca9e2e54"
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
  "Illustration": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.84fb932f01493190",
  "Musician": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.c45fd2157036eb90",
  "Theatre": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.3c604be28cd75826",

  "Alchemy": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.f759baf9513219b7",
  "Blacksmithing": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.b77f17d4b1fe67fb",
  "Glassblower": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.5a872530f63a838e",
  "Herbalism": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.d4088b9caa0b5e57",
  "Jeweler": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.9b9d94f3d8fd5d9b",
  "Leatherworking": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.77f2b40ce78ce1d6",
  "Sculpting": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.a3d3e54be24a94e5",
  "Tinkering": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.cb722fd99f416f28",
  "Weaving": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.8122c92a2e41b5d8",

  "Brewing": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.c68a4a7e6199ab4e",
  "Carpentry": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.29eae494d1252bb9",
  "Cartography": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.af8c083f0caa48bf",
  "Cooking": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.e052d21ff643bbf2",
  "Masonry": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.ad4816f876884c6a",
  "Vehicles": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.5629e619826c4318",

  "Cryptography": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.a52f5f4a609b2a69",
  "Disguise": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.7810a6bd2240f662",
  "Gaming": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.099e6502c3c9efd1",
  "Lockpicking": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage.dfb1fc4b07db7e44"
}

DC20RPG.languagesJournalUuid = {
  "Common": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage7c09c15f48708ab6",
  "Human": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPagefe054cd41f7324d7",
  "Dwarvish": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPagee3269983e1f15bdd",
  "Elvish": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPaged2596e95f9ce9e51",
  "Gnomish": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPagebf3bca9d9f25574f",
  "Halfling": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage26857b725bb65561",
  "Giant": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage8af15d1b1ecf3f1c",
  "Draconic": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPageaeec869ac9433c2e",
  "Orcish": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPageb1ece17d99b70ef7",
  "Fey": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPagea00054f4e8c9bd91",
  "Elemental": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage433f89d45d3305ec",
  "Celestial": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage68ebd6d2666663ec",
  "Fiendish": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPage3288ec46ad7981d3",
  "Deep Speech": "Compendium.dc20rpg.rules.JournalEntry.9d4e5cc631a054b8.JournalEntryPagecf2ce5264b877fe2"
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

DC20RPG.meleeWeapons = {
  "axe": "Axe",
  "chained": "Chained",
  "hammer": "Hammer",
  "pick": "Pick",
  "spear": "Spear",
  "staff": "Staff",
  "sword": "Sword",
  "fist": "Fist",
  "whip": "Whip"
}

DC20RPG.rangedWeapons = {
  "bow": "Bow",
  "crossbow": "Crossbow"
}

DC20RPG.weaponStyles = {
  ...DC20RPG.meleeWeapons,
  ...DC20RPG.rangedWeapons
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
  "radius": "Radius",
  "sphere": "Sphere",
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

DC20RPG.actionTypes = {
  "dynamic": "Dynamic Attack Save",
  "attack": "Attack",
  "check": "Check",
  "save": "Save",
  "contest": "Contest",
  "other": "Other"
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
}

DC20RPG.inventoryTypes = {
  "weapon": "Weapon",
  "equipment": "Equipment",
  "consumable": "Consumable",
  "tool": "Tool",
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
  "grapple": "Grapple",
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

DC20RPG.conditionsJournalUuid = {
  "bleeding": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.2f734fbaa3b8881f",
  "blinded": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.f077694c532c91db",
  "burning": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.1e9464c8b54021be",
  "charmed": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.259439ab9009626a",
  "dazed1": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.a5374646c90ea762",
  "dazed2": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.a5374646c90ea762",
  "dazed3": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.a5374646c90ea762",
  "dazed4": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.a5374646c90ea762",
  "heavilyDazed1": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.a5374646c90ea762",
  "heavilyDazed2": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.a5374646c90ea762",
  "heavilyDazed3": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.a5374646c90ea762",
  "heavilyDazed4": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.a5374646c90ea762",
  "deafened": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.7a13ed2c7b473092",
  "doomed": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.640ee4ad46ee9326",
  "exhaustion": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.5f854990db081b73",
  "exposed1": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.2507619191ed4878",
  "exposed2": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.2507619191ed4878",
  "exposed3": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.2507619191ed4878",
  "exposed4": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.2507619191ed4878",
  "frightened": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.3aa022ab3832a663",
  "grappled": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.26e5b30672a2f2ee",
  "hindered1": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.d364b24318878371",
  "hindered2": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.d364b24318878371",
  "hindered3": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.d364b24318878371",
  "hindered4": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.d364b24318878371",
  "impaired1": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.4dd13dd1f69eb979",
  "impaired2": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.4dd13dd1f69eb979",
  "impaired3": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.4dd13dd1f69eb979",
  "impaired4": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.4dd13dd1f69eb979",
  "heavilyImpaired1": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.4dd13dd1f69eb979",
  "heavilyImpaired2": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.4dd13dd1f69eb979",
  "heavilyImpaired3": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.4dd13dd1f69eb979",
  "heavilyImpaired4": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.4dd13dd1f69eb979",
  "incapacitated": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.28741dbfb0f76b1f",
  "intimidated": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.b84fea814870008c",
  "invisible": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.03d421bed31a57c0",
  "paralyzed": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.f11c3bbb85280844",
  "petrified": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.841bd7172a6c65ac",
  "poisoned": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.d4f7d331064600ea",
  "prone": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.78d57fafb2f0d47e",
  "rattled": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.a9ebed1a2229a23d",
  "restrained": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.34d6841b069fe825",
  "slowed1": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.12baa5af70fd911e",
  "slowed2": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.12baa5af70fd911e",
  "slowed3": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.12baa5af70fd911e",
  "slowed4": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.12baa5af70fd911e",
  "stunned": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.8d78ef1f2667dc23",
  "surprised": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.047226f17d2dc62f",
  "taunted": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.be22f2dd54351826",
  "unconscious": "Compendium.dc20rpg.rules.JournalEntry.7470a07f7581c21e.JournalEntryPage.8e821a260a6219f1",
  "bloodied1": "Compendium.dc20rpg.rules.JournalEntry.8f1ac218e59a6024.JournalEntryPage.f4e83780989a5489",
  "bloodied2": "Compendium.dc20rpg.rules.JournalEntry.8f1ac218e59a6024.JournalEntryPage.f4e83780989a5489",
  "concentration": "Compendium.dc20rpg.rules.JournalEntry.9812f1d12e4c2483.JournalEntryPage.2967cbb2bac7730d",
  "dead": "Compendium.dc20rpg.rules.JournalEntry.8f1ac218e59a6024"
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

DC20RPG.actionsJournalUuid = {
  attack: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.7bce2be90424c41a",
  disarm: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.4090898734971813",
  grapple: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.81b4d2443d6f8910",
  shove: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.09f4005ec1111084",
  tackle: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.f246a9561f831e08",
  disengage: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.1d10bccae7620f29",
  fullDisengage: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.1d10bccae7620f29",
  dodge: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.f714239c3ac97b92",
  fullDodge: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.f714239c3ac97b92",
  hide: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.98cb9262dcd25068",
  move: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.18afdec2d90ce416",
  help: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.1ddcfa3769fa9ae0",
  object: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.eefadbf4baedff10",
  spell: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.e87375a252ffdcc0",
  analyzeCreature: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.34e5b93b0b9c4238",
  calmAnimal: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.c8f5ec7a244c7f98",
  combatInsight: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.aae556b15b692a44",
  conceal: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.1f4b5ad6faa980a5",
  feint: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.3b14ac06f41264e1",
  intimidate: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.63cb27d7c95f3ebc",
  investigate: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.d7228a81356b9878",
  jump: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.60c8575a607f51ce",
  medicine: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.7d94ab70c276d32e",
  mountedDefence: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.1e8b52d78679946f",
  passThrough: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.716e3e8dd59213cd",
  search: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.ff43d6c32f4646e1",
  attackOfOpportunity: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.744faae66cd2f366",
  spellDuel: "Compendium.dc20rpg.rules.JournalEntry.23b844c6d26982e7.JournalEntryPage.5bff69c0fba6f1b4",
}