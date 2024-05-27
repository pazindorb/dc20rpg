export class DC20RpgRoll extends Roll {
  async evaluate({minimize=false, maximize=false, allowStrings=false, allowInteractive=true, ...options}={}) {
    if ( this._evaluated ) {
      throw new Error(`The ${this.constructor.name} has already been evaluated and is now immutable`);
    }
    this._evaluated = true;
    if ( CONFIG.debug.dice ) console.debug(`Evaluating roll with formula "${this.formula}"`);

    // Migration path for async rolls
    if ( "async" in options ) {
      foundry.utils.logCompatibilityWarning("The async option for Roll#evaluate has been removed. "
        + "Use Roll#evaluateSync for synchronous roll evaluation.");
    }
    return await this._evaluate({minimize, maximize, allowStrings, allowInteractive});
  }
}