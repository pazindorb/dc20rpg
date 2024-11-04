export class DC20RpgTokenDocument extends TokenDocument {

  /**@override*/
  prepareBaseData() {
    // Prepare Vision
    this._prepareSystemSpecificVisionModes();
    super.prepareBaseData();
    this._setTokenSize();
  }

  _prepareSystemSpecificVisionModes() {
    if (!this.sight.enabled) return; // Only when using vision
    const senses = this.actor.system.senses;
    const sight = this.sight;
    const detection = this.detectionModes;

    // Darkvision
    if (senses.darkvision.value > 0) {
      const defaults = CONFIG.Canvas.visionModes.darkvision.vision.defaults;
      sight.visionMode = "darkvision";
      sight.range = senses.darkvision.value;
      sight.attenuation = defaults.attenuation;
      sight.brightness = defaults.brightness;
      sight.contrast = defaults.contrast;
      sight.saturation = defaults.saturation;
    }

    // Tremorsense
    if (senses.tremorsense.value > 0) {
      detection.push({
        id: "feelTremor",
        enabled: true,
        range: senses.tremorsense.value
      })
    }

    // Blindsight
    if (senses.blindsight.value > 0) {
      detection.push({
        id: "seeInvisibility",
        enabled: true,
        range: senses.blindsight.value
      })
    }

    // Truesight
    if (senses.truesight.value > 0) {
      detection.push({
        id: "seeAll",
        enabled: true,
        range: senses.truesight.value
      })
    }
  }

  _setTokenSize() {
    const size = this.actor.system.size.size;

    switch(size) {
      case "large":
        this.width = 2;
        this.height = 2;
        break;

      case "huge":
        this.width = 3;
        this.height = 3;

      case "gargantuan":
        this.width = 4;
        this.height = 4;
    }
  }

  hasStatusEffect(statusId) {
    return this.actor?.hasStatus(statusId) ?? false;
  }
}