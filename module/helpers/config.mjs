export const DC20RPG = {};

/***********************/
/****  TRANSLATION  ****/
/***********************/

DC20RPG.trnAttributes  = {
  "mig": "DC20RPG.AttributeMig",
  "agi": "DC20RPG.AttributeAgi",
  "int": "DC20RPG.AttributeInt",
  "cha": "DC20RPG.AttributeCha",
  "phi": "DC20RPG.AttributePhi",
  "men": "DC20RPG.AttributeMen"
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
  "dis": "DC20RPG.SkillDis",
  "dra": "DC20RPG.SkillDra",
  "enc": "DC20RPG.SkillEnc",
  "for": "DC20RPG.SkillFor",
  "gam": "DC20RPG.SkillGam",
  "gla": "DC20RPG.SkillGla",
  "hea": "DC20RPG.SkillHea",
  "her": "DC20RPG.SkillHer",
  "jew": "DC20RPG.SkillJew",
  "lea": "DC20RPG.SkillLea",
  "loc": "DC20RPG.SkillLoc",
  "mas": "DC20RPG.SkillMas",
  "mus": "DC20RPG.SkillMus",
  "nav": "DC20RPG.SkillNav",
  "per": "DC20RPG.SkillPer",
  "pil": "DC20RPG.SkillPil",
  "poi": "DC20RPG.SkillPoi",
  "pot": "DC20RPG.SkillPot",
  "scu": "DC20RPG.SkillScu",
  "tin": "DC20RPG.SkillTin"
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
  "menSave": "Mental",
  "phiSave": "Phisical",
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

DC20RPG.skillsWithMartialSkill = {
  "mar": "Martial Skill",
  ...DC20RPG.skills
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
  "puncture": "Puncture",
  "special": "Special",
  "staff": "Staff",
  "sword": "Sword",
  "thrust": "Thrust",
  "unarmed": "Unarmed",
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

DC20RPG.invidualTargets = {
  "self": "Self",
  "ally": "Ally",
  "enemy": "Enemy",
  "creature": "Creature",
  "object": "Object",
  "space": "Space"
}

DC20RPG.areaTypes = {
  "cone": "Cone",
  "cube": "Cube",
  "cylinder": "Cylinder",
  "line": "Line",
  "radius": "Radius",
  "sphere": "Sphere",
  "square": "Square",
  "wall": "Wall",
}

DC20RPG.durations = {
  "instantaneous": "Instantaneous",
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

DC20RPG.chargesResets = {
  "short": "Short Rest",
  "long": "Long Rest",
  "full": "Full Rest",
  "day": "Daily",
  "charges": "Charges"
}

DC20RPG.actionTypes = {
  "dynamic": "Dynamic Attack/Save",
  "attack": "Attack Check",
  "healing": "Healing Check",
  "save": "Save",
  "contest": "Contest Roll",
  "skill": "Skill Check",
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
  "thunder": "Thunder",
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
  "versatile": "Versatile"
}