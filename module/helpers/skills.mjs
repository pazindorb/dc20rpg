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