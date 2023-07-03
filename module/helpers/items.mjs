import { DC20RPG } from "./config.mjs";
import { getLabelFromKey } from "../helpers/utils.mjs";

export async function createItemOnActor(actor, type, name) {
    const itemData = {
      name: name,
      type: type
    };
    
    return await Item.create(itemData, {parent: actor});
}

export function deleteItemFromActor(event, actor) {
    let item = getItemFromActor(event, actor);
    item.delete();
}

export function editItemOnActor(event, actor) {
    let item = getItemFromActor(event, actor);
    item.sheet.render(true);
}

export function getItemFromActor(event, actor) {
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    return actor.items.get(dataset.itemId);
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

export function reverseStatus(event, item) {
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    let status = item.system.statuses[dataset.key];
    item.update({[`system.statuses.${dataset.key}`] : !status});
}