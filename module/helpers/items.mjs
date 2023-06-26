import { DC20RPG } from "./config.mjs";
import { getLabelFromKey } from "../helpers/utils.mjs";

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
        category: formulaCategory,
        versatile: false,
        versatileFormula: ""
    }

    item.update({["system.formulas"] : formulas});
}

export function removeFormula(event, item) {
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    item.update({[`system.formulas.-=${dataset.key}`] : null});
}

export function changeVersatileFormula(event, item) {
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    let value = item.system.formulas[dataset.key].versatile;
    item.update({[`system.formulas.${dataset.key}.versatile`] : !value});
}

/**
* Returns html used to create fromula shown in item sheet. 
*/
export function getFormulaHtmlForCategory(category, item) {
 const types = {...DC20RPG.damageTypes, ...DC20RPG.healingTypes}
 let formulas = item.system.formulas; 
 let formulaString = "";

 let filteredFormulas = Object.values(formulas)
   .filter(formula => formula.category === category);

 for (let i = 0; i < filteredFormulas.length; i++) {
   let formula = filteredFormulas[i];
   if (formula.formula === "") continue;
   formulaString += formula.formula;
   if (formula.versatile) formulaString += "(" + formula.versatileFormula + ")";
   formulaString += " <em>" + getLabelFromKey(formula.type, types) + "</em>";
   formulaString += " + ";
 }
 
 if (formulaString !== "") formulaString = formulaString.substring(0, formulaString.length - 3);
 return formulaString;
}