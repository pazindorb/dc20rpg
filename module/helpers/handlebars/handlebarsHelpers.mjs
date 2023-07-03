import { capitalize, getLabelFromKey } from "../utils.mjs";

/**
 * Registers additional Handlebars Helpers to be used in templates later.
 * @return {void}
 */
export function registerHandlebarsHelpers() {

  Handlebars.registerHelper('capitalize', function (str) {
    return capitalize(str);
  });

  Handlebars.registerHelper('add', function (obj1, obj2) {
    return obj1 + obj2;
  });

  Handlebars.registerHelper('shouldIgnoreEmptyString', function (ignore, string) {
    if (string !== "") return true;
    return ignore;
  });

  Handlebars.registerHelper('shouldIgnoreZero', function (ignore, value) {
    if (value !== 0) return true;
    return ignore;
  });

  Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
    switch (operator) {
      case '==':
        return (v1 == v2) ? options.fn(this) : options.inverse(this);
      case '===':
        return (v1 === v2) ? options.fn(this) : options.inverse(this);
      case '!=':
        return (v1 != v2) ? options.fn(this) : options.inverse(this);
      case '!==':
        return (v1 !== v2) ? options.fn(this) : options.inverse(this);
      case '<':
        return (v1 < v2) ? options.fn(this) : options.inverse(this);
      case '<=':
        return (v1 <= v2) ? options.fn(this) : options.inverse(this);
      case '>':
        return (v1 > v2) ? options.fn(this) : options.inverse(this);
      case '>=':
        return (v1 >= v2) ? options.fn(this) : options.inverse(this);
      case '&&':
        return (v1 && v2) ? options.fn(this) : options.inverse(this);
      case '||':
        return (v1 || v2) ? options.fn(this) : options.inverse(this);
      case '%':
        return (v1 % v2 === 0) ? options.fn(this) : options.inverse(this);
      default:
        return options.inverse(this);
    }
  });

  Handlebars.registerHelper('notEmptyString', function (string) {
    if (!string) return false;
    if (string.trim().length === 0) return false;
    return true;
  });

  Handlebars.registerHelper('skillMasteryToIconClass', function (skillMasteryKey) {
    switch (skillMasteryKey) {
      case "":
        return "fa-regular fa-circle";
      case "novice":
        return "fa-regular fa-circle-half-stroke";
      case "trained":
        return "fa-solid fa-circle";
      case "expert":
        return "fa-solid fa-circle-check";
      case "master":
        return "fa-solid fa-circle-up";
      case "grandmaster":
        return "fa-solid fa-certificate";
    }
  });

  Handlebars.registerHelper('costPrinter', function (cost, costIcon, mergeMultiple, hasValueForZero, zeroIcon) {
    let costIconHtml = `<i class="${costIcon} cost-icon"></i>`;

    if (cost === undefined) return '';
    if (cost === 0 && hasValueForZero) return `<i class="${zeroIcon} cost-icon"></i>`;
    if (cost === 0) return '';
     
    if (cost > mergeMultiple) return `<b>${cost}</b> ${costIconHtml}`;

    let pointsPrinter = "";
    for (let i = 1; i <= cost; i ++) {
      pointsPrinter += costIconHtml;
    }
    return pointsPrinter;
  });

  Handlebars.registerHelper('printActionPoints', function (current, max) {
    let fullPoint = "<i class='fa-solid fa-dice-d6 fa-2x ap'></i>";
    let emptyPoint = "<i class='fa-light fa-dice-d6 fa-2x ap'></i>";

    if (max >= 5) return `<b>${current}/${max}</b> ${fullPoint}`;
    
    let actionPoints = "";
    for(let i = 0; i < max; i++) {
      if (i < current) actionPoints += fullPoint;
      else actionPoints += emptyPoint;
    }
    return actionPoints;
  });

  Handlebars.registerHelper('arrayIncludes', function(object, options) {
    let arrayString = options.hash.arrayString;
    let array = arrayString.split(' ');

    return array.includes(object);
  });

  Handlebars.registerHelper('labelFromKey', function(key, objectWithLabels) {
    return getLabelFromKey(key, objectWithLabels);
  });

  Handlebars.registerHelper('printDices', function(results, faces) {
    if (!results) return;

    let final = "";
    results.forEach(result => {
      let colored = result.result === faces ? "max" 
                    : result.result === 1 ? "min" 
                    : "";
      final += `<li class="roll die d${faces} ${colored}">${result.result}</li>`;
    })
    return final;
  });

  Handlebars.registerHelper('sumDices', function(results) {
    if (!results) return;

    let diceTotal = 0;
    results.forEach(result => {
      diceTotal += result.result;
    });
    return diceTotal;
  });
}