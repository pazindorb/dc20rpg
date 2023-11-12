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
  "kno": "DC20RPG.SkillKno",

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
  "aur": "DC20RPG.LangAur",
  "dwa": "DC20RPG.LangDwa",
  "hal": "DC20RPG.LangHal",
  "gno": "DC20RPG.LangGno",
  "syl": "DC20RPG.LangSyl",
  "orc": "DC20RPG.LangOrc",
  "dra": "DC20RPG.LangDra",
  "gia": "DC20RPG.LangGia",
  "dee": "DC20RPG.LangDee",
  "cel": "DC20RPG.LangCel",
  "inf": "DC20RPG.LangInf",
  "aby": "DC20RPG.LangAby",
  "ord": "DC20RPG.LangOrd"
}

DC20RPG.trnReductions = {
    "acid": "DC20RPG.Acid",
    "cold": "DC20RPG.Cold",
    "fire": "DC20RPG.Fire",
    "force": "DC20RPG.Force",
    "holy": "DC20RPG.Holy",
    "lightning": "DC20RPG.Lightning",
    "poison": "DC20RPG.Poison",
    "psychic": "DC20RPG.Psychic",
    "sonic": "DC20RPG.Sonic",
    "unholy": "DC20RPG.Unholy",
    "piercing": "DC20RPG.Piercing",
    "slashing": "DC20RPG.Slashing",
    "bludgeoning": "DC20RPG.Bludgeoning"
}



/*************************/
/****  CONFIGURATION  ****/
/*************************/

DC20RPG.combatMastryLevels = {
  "novice": "Novice",
  "trained": "Trained",
  "expert": "Expert",
  "master": "Master",
  "grandmaster": "Grandmaster"
};

DC20RPG.attributes = {
  "mig": "Might",
  "agi": "Agility",
  "int": "Inteligence",
  "cha": "Charisma"
};

DC20RPG.attributesWithPrime = {
  "prime": "Prime",
  ...DC20RPG.attributes
}

DC20RPG.saveTypes = {
  "phi": "Physical",
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
  "kno": "Knowledge",

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
  "loc": "Lock Picking",
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
  "kno": "Knowledge Check",

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
  "phi": "Physical Save",
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

DC20RPG.weaponCategories = {
  "axe": "Axe",
  "bow": "Bow",
  "chained": "Chained",
  "crossbow": "Crossbow",
  "hammer": "Hammer",
  "pick": "Pick",
  "spear": "Spear",
  "special": "Special",
  "staff": "Staff",
  "sword": "Sword",
  "fist": "Fist",
  "whip": "Whip"
}

DC20RPG.rarities = {
  "common": "Common",
  "uncommon": "Uncommon",
  "rare": "Rare",
  "veryRare": "Very Rare",
  "legendary": "Legendary"
}

DC20RPG.weaponTypes = {
  "light": "Light Weapon",
  "heavy": "Heavy Weapon"
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
  "abjuration": "Abjuration",
  "astromancy": "Astromancy",
  "chronomancy": "Chronomancy",
  "conjuration": "Conjuration",
  "destruction": "Destruction",
  "divination": "Divination",
  "enchantment": "Enchantment",
  "illusion": "Illusion",
  "necromancy": "Necromancy",
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
  "attack": "Attack",
  "spell": "Spell"
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

DC20RPG.chargesResets = {
  ...DC20RPG.restTypes,
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
  "acid": "Acid",
  "bludgeoning": "Bludgeoning",
  "cold": "Cold",
  "fire": "Fire",
  "force": "Force",
  "holy": "Holy",
  "lightning": "Lightning",
  "piercing": "Piercing",
  "poison": "Poison",
  "psychic": "Psychic",
  "slashing": "Slashing",
  "sonic": "Sonic",
  "unholy": "Unholy"
}

DC20RPG.healingTypes = {
  "heal": "Health",
  "temporary": "Temporary",
  "max": "Max Health"
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
  "twoHanded": "Two Handed",
  "versatile": "Versatile",
  "bulky": "Bulky",
  "damageReduction": "Damage Reduction",
  "dense": "Dense",
  "mobile": "Mobile",
  "reinforced": "Reinforced",
  "mounted": "Mounted",
  "unwieldy": "Unwieldy"
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

DC20RPG.allItemTypes = {
  ...DC20RPG.inventoryTypes,
  ...DC20RPG.spellsTypes,
  ...DC20RPG.techniquesTypes,
  ...DC20RPG.featuresTypes,
  "class": "Class",
  "subclass": "Subclass",
  "ancestry": "Ancestry"
}

DC20RPG.physicalDefenceFormulasLabels = {
  "light": "Light Armor",
  "heavy": "Heavy Armor",
  "savage": "Savage Defense",
  "patient": "Patient Defense",
  "custom": "Custom Formula",
  "flat": "Flat"
}

DC20RPG.physicalDefenceFormulas = {
  "light": "8 + @combatMastery + @agi + @defences.physical.armorBonus",
  "heavy": "8 + @combatMastery + @mig + @defences.physical.armorBonus",
  "savage": "8 + @combatMastery + @mig + @agi",
  "patient": "8 + @combatMastery + @agi + max(@int, @cha)"
}

DC20RPG.mentalDefenceFormulasLabels = {
  "standard": "Standard Formula",
  "custom": "Custom Formula",
  "patient": "Patient Defense",
  "flat": "Flat"
}

DC20RPG.mentalDefenceFormulas = {
  "standard": "8 + @combatMastery + @int + @cha",
  "patient": "8 + @combatMastery + @int + @cha + max(@int, @cha)"
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