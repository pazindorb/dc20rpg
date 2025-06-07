import { DC20Dialog } from "./dc20Dialog.mjs";

export class ItemCreatorDialog extends DC20Dialog {

  constructor(itemType, options) {
    super(options);
    this.itemType = itemType;
    this.bonusPoints = options.bonusProperties || 0;
    this.propertyPoints = 2 + this.bonusPoints;
    this._prepareBlueprint(itemType, options.blueprint);
    this.itemSubTypes = options.subTypes || this._prepareSubTypes();
  }

  /** @override */
  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/dialogs/item-creator-dialog.hbs",
    }
  };

  _prepareBlueprint(itemType, blueprint) {
    if (blueprint && blueprint.type !== itemType) {
      ui.notifications.error("Item creator error: Item Type is different then provided blueprint");
      this.close();
      return;
    }

    const blueprintImg = itemType === "weapon" ? "icons/svg/sword.svg" : "icons/svg/shield.svg";
    const createData = {
      name: blueprint?.name || "Blueprint",
      img: blueprint?.img || blueprintImg,
      type: itemType,
    }

    const item = new Item(createData);
    this.blueprint = item.toObject();
  }

  _prepareSubTypes() {
    const dropdownData = CONFIG.DC20RPG.DROPDOWN_DATA;
    return this.itemType === "weapon" ? dropdownData.weaponTypes : {...dropdownData.armorTypes, ...dropdownData.shieldTypes}
  }

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Item Creator";
    initialized.window.icon = "fa-solid fa-hammer-crash";
    initialized.position.width = 520;
    initialized.actions.createItem = this._onCreateItemAction;
    return initialized;
  }
  // ====================== INIT ======================

  // ==================== CONTEXT =====================
  async _prepareContext(options) {
    this._updateWithProperties();
    const dropdownData = CONFIG.DC20RPG.DROPDOWN_DATA;
    const subType = this.blueprint.system.weaponType || this.blueprint.system.equipmentType || "";
    const itemSubTypes = this.itemSubTypes;

    const context = await super._prepareContext(options);
    const [cost, properties] = this._collectProperties(subType);
    context.properties = properties;
    context.propertyPointsLeft = this.propertyPoints - cost;
    context.itemType = this.itemType;
    context.subType = subType;
    context.blueprint = this.blueprint;

    // Dropdown data
    context.itemSubTypes = itemSubTypes;
    context.damageTypes = dropdownData.physicalDamageTypes;
    context.weaponStyles = subType === "melee" ? dropdownData.meleeWeaponStyles : dropdownData.rangedWeaponStyles;

    // Weapon styles tooltip
    if (this.itemType === "weapon") {
      const uuids = CONFIG.DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.weaponStylesJournal;
      context.weaponStyleJournalUuid = uuids[this.blueprint.system.weaponStyle];
      context.secondWeaponStyleJournalUuid = uuids[this.blueprint.system.properties.multiFaceted.weaponStyle.second];
      context.weaponStyleHeader = context.weaponStyles[this.blueprint.system.weaponStyle];
      context.secondWeaponStyleHeader = context.weaponStyles[this.blueprint.system.properties.multiFaceted.weaponStyle.second];
    }
    return context;
  }

  _collectProperties(subType) {
    let cost = 0;
    const properties = {};
    Object.entries(this.blueprint.system.properties).forEach(([key, prop]) => {
      if (prop.for.includes(subType)) {
        properties[key] = prop;

        const multipier = prop.valueCostMultiplier ? prop.value : 1;
        if (prop.active) cost += prop.cost * multipier;
      }
    })
    return [cost, properties];
  }

  _updateWithProperties() {
    const properties = this.blueprint.system.properties;

    this.blueprint.system.range.normal = this.defaultNormalRange;
    this.blueprint.system.range.max = this.defaultMaxRange;
    // Update Range
    if (properties?.toss?.active) {
      this.blueprint.system.range.normal = 5;
      this.blueprint.system.range.max = 10;
    }
    if (properties?.thrown?.active) {
      this.blueprint.system.range.normal = 10;
      this.blueprint.system.range.max = 20;
    }
    if (properties?.longRanged?.active) {
      this.blueprint.system.range.normal = 30;
      this.blueprint.system.range.max = 90;
    }

    // Disable Heavy if Two Handed not active
    if (properties.twoHanded && properties.heavy) {
      this._disableIfNotActive(properties.heavy, properties.twoHanded);
    }

    // Disable Thrown if Toss not active
    if (properties.toss && properties.thrown) {
      this._disableIfNotActive(properties.thrown, properties.toss);
    }

    // Disable Returning if Toss not active
    if (properties.toss && properties.returning) {
      this._disableIfNotActive(properties.returning, properties.toss);
    }

    // Disable Capture if not Chained or Whip style
    if (properties.capture && this.itemType === "weapon") {
      const weaponStyle = this.blueprint.system.weaponStyle;
      if (["chained", "whip"].includes(weaponStyle)) {
        properties.capture.disabled = false;
      }
      else {
        properties.capture.active = false;
        properties.capture.disabled = true;
      }
    }

    // Copy Damage and Style to Multi Faceted Property
    if (properties?.multiFaceted?.active) {
      properties.multiFaceted.damageType.first = this.blueprint.system.formulas.weaponDamage.type;
      properties.multiFaceted.weaponStyle.first = this.blueprint.system.weaponStyle;
    }

    // Update Damage
    if (this.itemType === "weapon") {
      let damage = 1;
      if (properties?.reload?.active) damage++;
      if (properties?.heavy?.active) damage++;
      this.blueprint.system.formulas.weaponDamage.formula = damage;
    }
  }

  _disableIfNotActive(toDisable, toCheck) {
    if (!toCheck.active) {
      toDisable.active = false;
      toDisable.disabled = true;
    }
    else {
      toDisable.disabled = false;
    }
  }
  // ==================== CONTEXT =====================

  // ==================== ACTIONS =====================
  _onChangeString(path, value, dataset) {
    if (path === "blueprint.system.weaponType" || path === "blueprint.system.equipmentType") this._updateBlueprintOnTypeChange(value);
    super._onChangeString(path, value, dataset);
  }

  _updateBlueprintOnTypeChange(itemSubtype) {
    // Base property points to spend
    if (itemSubtype === "ranged") this.propertyPoints = 0 + this.bonusPoints;
    else this.propertyPoints = 2 + this.bonusPoints;

    // Prepare default range of that weapon
    if (itemSubtype === "ranged") {
      this.defaultNormalRange = 15;
      this.defaultMaxRange = 45;
    }
    else {
      this.defaultNormalRange = null;
      this.defaultMaxRange = null;
    }

    // Reset properties
    Object.entries(this.blueprint.system.properties).forEach(([key, prop]) => {
      if (["twoHanded", "unwieldy", "ammo"].includes(key) && itemSubtype === "ranged") prop.active = true;
      else prop.active = false;
    });
  }

  async _onCreateItemAction(event) {
    event.preventDefault();

    // Prepare item before creation
    const subType = this.blueprint.system.weaponType || this.blueprint.system.equipmentType || "";
    if (["melee", "ranged", "lshield", "hshield"].includes(subType)) {
      this.blueprint.system.costs.resources.actionPoint = 1;
    }
    if (["lshield", "hshield"].includes(subType)) {
      this.blueprint.system.actionType = "attack";
      this.blueprint.system.formulas.weaponDamage = {
          formula: "1",
          type: "bludgeoning",
          category: "damage",
          fail: false,
          failFormula: "",
          each5: false,
          each5Formula: "",
          dontMerge: false,
          overrideDefence: "",
      }
    }

    this.promiseResolve(this.blueprint);
    this.close();
  }
  // ==================== ACTIONS =====================

  static async create(itemType, options) {
    const dialog = new ItemCreatorDialog(itemType, options);
    return new Promise((resolve) => {
      dialog.promiseResolve = resolve;
      dialog.render(true);
    });
  }

  /** @override */
  close(options) {
    if (this.promiseResolve) this.promiseResolve(null);
    super.close(options);
  }
}

export async function openItemCreator(itemType, options={}) {
  return await ItemCreatorDialog.create(itemType, options);
}