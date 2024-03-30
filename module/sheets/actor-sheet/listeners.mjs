import { configureCustomResource } from "../../dialogs/actor-configuration-dialog.mjs";
import { createRestDialog } from "../../dialogs/rest-dialog.mjs";
import { changeLevel } from "../../helpers/actors/itemsOnActor.mjs";
import { createNewCustomResource, removeResource } from "../../helpers/actors/resources.mjs";
import { datasetOf } from "../../helpers/events.mjs";
import { changeActivableProperty } from "../../helpers/utils.mjs";

export function activateCommonLinsters(html, actor) {
  html.find(".activable").click(ev => changeActivableProperty(datasetOf(ev).path, actor));
}

export function activateCharacterLinsters(html, actor) {
  // Header - Top Buttons
  html.find(".rest").click(() => createRestDialog(actor));
  html.find(".level").click(ev => changeLevel(datasetOf(ev).up, datasetOf(ev).itemId, actor));

  // Header - Resources
    
  // Header - Custom Resources
  html.find(".add-custom-resource").click(() => createNewCustomResource("New Resource", actor));
  // html.find('.edit-resource').click(ev => configureCustomResource(actor, datasetOf(ev).key));
  html.find(".remove-resource").click(ev => removeResource(datasetOf(ev).key, actor));

  // Header - Attributes
  html.find('.subtract-attribute-point').click(ev => _manipulateAttribute(datasetOf(ev).key, actor, true));
  html.find('.add-attribute-point').click(ev => _manipulateAttribute(datasetOf(ev).key, actor, false));

  // Sidebar
  html.find(".sidetab-button").click(ev => {
    const icon = ev.currentTarget;
    const sidebar = ev.currentTarget.parentNode;
    sidebar.classList.toggle("expand");
    icon.classList.toggle("fa-square-caret-left");
    icon.classList.toggle("fa-square-caret-right");
    const isExpanded = sidebar.classList.contains("expand");
    game.user.setFlag("dc20rpg", "sheet.character.expandSidebar", isExpanded);
  });


}

export function activateNpcLinsters(html, actor) {

}

function _manipulateAttribute(key, actor, subtract) {
  const value = actor.system.attributes[key].value;
  const newValue = value + (subtract ? -1 : +1);
  actor.update({[`system.attributes.${key}.value`]: newValue})
}