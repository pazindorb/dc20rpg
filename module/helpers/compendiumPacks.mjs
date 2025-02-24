export function validateUserOwnership(pack) {
  if (pack.ownership.default === 0) return false;

  const userRole = CONST.USER_ROLE_NAMES[game.user.role];
  const packOwnership = pack.ownership[userRole];
  if (packOwnership === "NONE") return false;
  
  return true;
}