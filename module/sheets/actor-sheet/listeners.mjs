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
  // Window
  html.resize(ev => {
    ev.currentTartget
  });

  // Header - Top Buttons
  html.find(".rest").click(() => createRestDialog(actor));
  html.find(".level").click(ev => changeLevel(datasetOf(ev).up, datasetOf(ev).itemId, actor));
    
  // Header - Custom Resources
  html.find(".add-custom-resource").click(() => createNewCustomResource("New Resource", actor));
  // html.find('.edit-resource').click(ev => configureCustomResource(actor, datasetOf(ev).key));
  html.find(".remove-resource").click(ev => removeResource(datasetOf(ev).key, actor));

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