import { createRestDialog } from "../../dialogs/rest-dialog.mjs";
import { changeLevel } from "../../helpers/actors/itemsOnActor.mjs";
import { datasetOf } from "../../helpers/events.mjs";
import { changeActivableProperty } from "../../helpers/utils.mjs";

export function activateCommonLinsters(html, actor) {
  html.find(".activable").click(ev => changeActivableProperty(datasetOf(ev).path, actor));

}

export function activateCharacterLinsters(html, actor) {
    html.find(".rest").click(() => createRestDialog(actor));
    html.find(".level").click(ev => changeLevel(datasetOf(ev).up, datasetOf(ev).itemId, actor));
}

export function activateNpcLinsters(html, actor) {

}