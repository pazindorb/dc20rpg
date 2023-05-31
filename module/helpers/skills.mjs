export function skillMasteryLevelToValue(skillMasteryLevel) {
    switch (skillMasteryLevel) {
        case "novice":
            return 2;
        case "trained":
            return 4;
        case "expert":
            return 6;
        case "master":
            return 8;
        case "grandmaster":
            return 10;
    }
    return 0;
}

export function getChangedMastery(skillMasteryLevel, takeLower) {
    switch (skillMasteryLevel) {
        case "":
            return takeLower ? "grandmaster" : "novice";
        case "novice":
            return takeLower ? "" : "trained";
        case "trained":
            return takeLower ? "novice" : "expert";
        case "expert":
            return takeLower ? "trained" : "master";
        case "master":
            return takeLower ? "expert" : "grandmaster";
        case "grandmaster":
            return takeLower ? "master" : "";
    }
}

export function getChangedLanguageMastery(languageMasteryLevel, takeLower) {
    if (languageMasteryLevel === 3) return takeLower ? 2 : 0;
    if (languageMasteryLevel === 0) return takeLower ? 3 : 1;
    if (takeLower) return languageMasteryLevel - 1;
    return languageMasteryLevel + 1;
}

export function isCoreSkillKey(skillKey) {
    let coreSkills = ["ath", "inm", "acr", "tri", "ste", "inv", "med", "sur", "kno", "ani", "ins", "inf"];
    return coreSkills.includes(skillKey);
}