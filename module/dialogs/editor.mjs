import { getValueFromPath } from "../helpers/utils.mjs";

/**
 * Editor dialog
 */
export class EditorDialog extends FormApplication {

  constructor(owner, updatePath, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.owner = owner;
    this.updatePath = updatePath;

    // We need to prepare that for editor to set its inital value
    this.object.text = getValueFromPath(this.owner, this.updatePath); 
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/editor-dialog.hbs",
      classes: ["dc20rpg", "dialog"],
    });
  }
  
  async getData() {
    return {
      description: this.object.text,
      path: this.updatePath
    };
  }

  _updateObject(event, formData) {
    this.owner.update({[this.updatePath]: formData.text});
  }
}

/**
 * Creates VariableAttributePickerDialog for given actor and with dataset extracted from event. 
 */
export function createEditorDialog(owner, updatePath) {
  let dialog = new EditorDialog(owner, updatePath, {title: "Editor"});
  dialog.render(true);
}