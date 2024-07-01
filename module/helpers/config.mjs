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
  5: "Grandmaster",
  6: "Grandmaster + Expertise(I)",
  7: "Grandmaster + Expertise(II)",
  8: "Grandmaster + Expertise(III)"
};

DC20RPG.skillMasteryShort = {
  0: "-",
  1: "N",
  2: "T",
  3: "E",
  4: "M",
  5: "G",
  6: "6",
  7: "7",
  8: "8"
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

DC20RPG.tradeSkills = {
  "alc": "Alchemy",
  "bla": "Blacksmithing",
  "bre": "Brewing",
  "cap": "Carpentry",
  "car": "Carving",
  "coo": "Cooking",
  "dis": "Disguise",
  "dra": "Drawing/Painting",
  "enc": "Encription/Encoding",
  "for": "Forgery",
  "gam": "Gaming Kit",
  "gla": "Glassblower",
  "hea": "Healer Kit",
  "her": "Herbalism",
  "jew": "Jeweler",
  "lea": "Leatherworker/Tailor",
  "loc": "Lockpicking",
  "mas": "Masonry",
  "mus": "Musician",
  "nav": "Navigation/Cartography",
  "per": "Performance",
  "pil": "Piloting",
  "poi": "Poisons",
  "pot": "Pottery",
  "scu": "Sculpting",
  "tin": "Tinkering"
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
  "agiDis": "Agi Check DisADV",
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
  "speedPenalty": "Speed Penalty",
  "sturdy": "Sturdy",
  "maxAgiLimit": "Max Agility Limit",
  "damageReduction": "Damage Reduction",
  "dense": "Dense",
  "mobile": "Mobile",
  "impact": "Impact",
  "threatening": "Threatening",
  "reinforced": "Reinforced",
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
  "standard": "8 + @combatMastery + @agi + @defences.physical.armorBonus",
  "standardMaxAgi": "8 + @combatMastery + min(@agi, (@prime - 2)) + @defences.physical.armorBonus",
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
  "lightWeapon": "Light Weapon",
  "heavyWeapon": "Heavy Weapon",
  "lightShield": "Light Shield",
  "heavyShield": "Heavy Shield",
  "lightArmor": "Light Armor",
  "heavyArmor": "Heavy Armor",
  "spellcasting": "Spellcasting"
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
  "impared": "Impared",
  "dazed": "Dazed"
}

DC20RPG.conditionsJournalUuid = {
  "charmed": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.hLvcrq61pl0mAYgg",
  "burning": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.33xrXauZVUHh1pN6",
  "bleeding": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.eXemmtXRrCIPIzJf",
  "poisoned": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.u8qJg7ClHjO1qcOj",
  "taunted": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.rHRpNe9MVSIfFLHm",
  "deafened": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.04YAELRFaExMLAaL",
  "blinded": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.nXRnsdU15K7l9p9b",
  "intimidated": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.2sp7JzK3Jsqu3CU0",
  "rattled": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.CjSSg8lBeeMD7yvC",
  "frightened": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.KHVPo37dkPupar7T",
  "slowed1": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.s517XK8JyV3lf7Pn",
  "slowed2": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.s517XK8JyV3lf7Pn",
  "slowed3": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.s517XK8JyV3lf7Pn",
  "slowed4": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.s517XK8JyV3lf7Pn",
  "grappled": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.ZIrANQK6qbbL1vB8",
  "exposed1": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.XhUdU3gR6xO1LPR1",
  "exposed2": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.XhUdU3gR6xO1LPR1",
  "exposed3": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.XhUdU3gR6xO1LPR1",
  "exposed4": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.XhUdU3gR6xO1LPR1",
  "hindered1": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.8fKEIJuyv9ceqOfv",
  "hindered2": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.8fKEIJuyv9ceqOfv",
  "hindered3": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.8fKEIJuyv9ceqOfv",
  "hindered4": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.8fKEIJuyv9ceqOfv",
  "restrained": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.bQpYeonGTWupgMs5",
  "prone": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.z30IHXnQBIgR1h4o",
  "incapacitated": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.HqfFTAGeLUzbQ7Gy",
  "stunned": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.wzTCWofNrOCqcZ99",
  "paralyzed": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.4OudFZ3j7zJycEJJ",
  "unconscious": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.4Bs313t47XCvWit5",
  "petrified": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.cCd368U56fRFWh4r",
  "surprised": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.mw35PpHOzZINIgsw",
  "doomed": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.rel9ZfGrwpAU3gxA",
  "exhaustion": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.ZOeToaHZ25xiMEFW",
  "impared1": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.N3KaoJ8WXXqqQp2Z",
  "impared2": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.N3KaoJ8WXXqqQp2Z",
  "impared3": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.N3KaoJ8WXXqqQp2Z",
  "impared4": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.N3KaoJ8WXXqqQp2Z",
  "heavilyImpared1": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.J6xloE1chfiHiZ8z",
  "heavilyImpared2": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.J6xloE1chfiHiZ8z",
  "heavilyImpared3": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.J6xloE1chfiHiZ8z",
  "heavilyImpared4": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.J6xloE1chfiHiZ8z",
  "dazed1": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.DejlxogDsBV80fxZ",
  "dazed2": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.DejlxogDsBV80fxZ",
  "dazed3": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.DejlxogDsBV80fxZ",
  "dazed4": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.DejlxogDsBV80fxZ",
  "heavilyDazed1": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.zwNUCN5R6ZlgHgvI",
  "heavilyDazed2": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.zwNUCN5R6ZlgHgvI",
  "heavilyDazed3": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.zwNUCN5R6ZlgHgvI",
  "heavilyDazed4": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.zwNUCN5R6ZlgHgvI",
  "invisible": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.F5dyQjHtsimS6Wne",
  "bloodied1": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.6ervUCmUG0w88xjL",
  "bloodied2": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.n7o5iBctTBdOb3wu",
  "concentration": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.pn8hXPwp9olchSXp",
  "dead": "Compendium.world.rules.JournalEntry.bBNlQw6xflh3fONw.JournalEntryPage.0HznHsQKWZDOI04A"
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
  attack: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.vPAeV0vzpnNW0Gm4",
  disarm: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.gyrxPnWEpL3GSSX3",
  grapple: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.1F3xyyFBSeQMyVgN",
  shove: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.0n3QOX0sI3nN9ZJX",
  tackle: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.bmZOoRXnUckjgi2S",
  disengage: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.QjcLuK6mJmZ2OKID",
  fullDisengage: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.fACxG6r9DPdJTz4b",
  dodge: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.4XeSVLKD7eou7HcQ",
  fullDodge: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.GnAajfWD2PHocwAF",
  hide: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.KKUwowqessZnNECK",
  spell: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.Wxej1ZrxymVHjn6E",
  move: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.5IYWvBeSZ9RkiwZq",
  help: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.pzGfygckMdoe8J8u",
  object: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.6UTcgD6oeiwII4GX",
  attackOfOpportunity: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.Mh1J9JU4XVl7joVz",
  spellDuel: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.RSZrcEiHKShhMDjy",
  medicine: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.MrewAEODI0lxlXg6",
  passThrough: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.98cpFrZ227mpUuv6",
  feint: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.BHcnvR0f1jkoU2Du",
  intimidate: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.k0hk8gRWVnYqzWGN",
  combatInsight: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.n0UM5aRpFt5phULV",
  analyzeCreature: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.N0IiA8b4bHRe8pKV",
  calmAnimal: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.G5nCMhabfbQIqnfY",
  investigate: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.bvecKPPXW5qMlPth",
  search: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.65M5iu0gw53LIlrH",
  conceal: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.rK6HUNFp8hiHjmNF",
  mountedDefence: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.MaqHGBLqe60klfaF",
  jump: "Compendium.world.rules.JournalEntry.nRLx5cPTGbocveMl.JournalEntryPage.MroJVScNHUAw7Nm9",
}