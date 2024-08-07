export class DC20Token extends Token {

  /** @override */
  //TODO: We need to make sure it works fine with future foundry updates
  async _drawEffects() {
    this.effects.renderable = false;

    // Clear Effects Container
    this.effects.removeChildren().forEach(c => c.destroy());
    this.effects.bg = this.effects.addChild(new PIXI.Graphics());
    this.effects.overlay = null;

    // Categorize effects
    const activeEffects = this.actor?.temporaryEffects || [];
    let hasOverlay = false;

    // Collect from active statuses 
    const statuses = this.actor?.statuses;
    if (statuses) {
      statuses.forEach(st => {
        const status = CONFIG.statusEffects.find(e => e.id === st.id)
        if (status) {
          status.tint = new Number(16777215);
          activeEffects.push(status);
        }
      })
    }

    // Flatten the same active effect images
    const flattenedImages = [];
    const uniqueImages = [];
    activeEffects.forEach(effect => {
      const flattened = {img: effect.img, tint: effect.tint};
      if (uniqueImages.indexOf(effect.img) === -1) {
        flattenedImages.push(flattened);
        uniqueImages.push(effect.img);
      }
    });

    // Draw effects
    const promises = [];
    for ( const effect of flattenedImages ) {
      if ( !effect.img ) continue;
      if ( effect.flags && effect.getFlag("core", "overlay") && !hasOverlay ) {
        promises.push(this._drawOverlay(effect.img, effect.tint));
        hasOverlay = true;
      }
      else promises.push(this._drawEffect(effect.img, effect.tint));
    }
    await Promise.allSettled(promises);

    this.effects.renderable = true;
    this.renderFlags.set({refreshEffects: true});
  }
}