import { getValueFromPath } from "./utils.mjs";

export async function createItemOnActor(event, actor) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    // Finally, create the item!
    return await Item.create(itemData, {parent: actor});
}

export function deleteItemFromActor(event, actor) {
    let item = _getItemFromActor(event, actor);
    item.delete();
}

export function editItemOnActor(event, actor) {
    let item = _getItemFromActor(event, actor);
    item.sheet.render(true);
}

function _getItemFromActor(event, actor) {
    const li = $(event.currentTarget).parents(".item");
    return actor.items.get(li.data("itemId"));
}

export function activateStatusOrProperty(event, item) {
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const pathToValue = dataset.path;
    let value = getValueFromPath(item, pathToValue);

    item.update({[pathToValue] : !value});
}

export function addFormula(event, item) {
    event.preventDefault();
    const dataset = event.currentTarget.dataset;

    let formulaCategory = dataset.category;
    let formulas = item.system.formulas;
    let sortedKeys = Object.keys(formulas).sort((a, b) => {
        return parseInt(a) - parseInt(b);
    });

    let nextKey;
    if (sortedKeys.length === 0) {
        nextKey = 0;
    } else {
        let lastKey = sortedKeys[sortedKeys.length - 1];
        nextKey = parseInt(lastKey) + 1;
    }

    formulas[nextKey] = {
        formula: "",
        type: "",
        category: formulaCategory
    }

    item.update({["system.formulas"] : formulas});
}

export function removeFormula(event, item) {
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    item.update({[`system.formulas.-=${dataset.key}`] : null});
}