const AREA_PLACEMENT_MARKER = "dc20rpgAreaPlacement";

export function configureAA() {
  Hooks.on("AutomatedAnimations-WorkflowStart", (workflowData, animationData) => {
    if (!animationData) return;

    if (workflowData[AREA_PLACEMENT_MARKER]) {
      preventTemplateRemoval(animationData);
      return;
    }

    if (itemHasArea(workflowData.item)) {
      workflowData.stopWorkflow = true;
    }
  });
}

function preventTemplateRemoval(animationData) {
  if (animationData.primary?.options) {
    animationData.primary.options.removeTemplate = false;
  }

  if (animationData.primary?.projectile?.options) {
    animationData.primary.projectile.options.removeTemplate = false;
  }
}

function itemHasArea(item) {
  const areas = item?.system?.areas || {};
  return Object.keys(areas).length > 0;
}

export async function playAutomatedAnimation(region, tokenId, itemId) {
  const moduleActive = game.modules.get("autoanimations")?.active;
  const playAnimation = globalThis.AutomatedAnimations?.playAnimation;
  if (!moduleActive || !playAnimation) return;
  if (!region || !tokenId || !itemId) return;

  const token = canvas.tokens.get(tokenId);
  if (!token) return;
  const actor = token.actor;
  if (!actor) return;
  const item = actor.items.get(itemId);
  if (!item) return;

  try {
    await playAnimation(token, item, {
      templateData: region,
      isTemplate: true,
      [AREA_PLACEMENT_MARKER]: true
    });
  }
  catch (error) {
    console.error("DC20RPG | Automated Animations failed to create animation on Area", error);
  }
}