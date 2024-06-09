import { getLabelFromKey } from "../utils.mjs";
import { allPartials } from "./templates.mjs";

/**
 * Registers additional Handlebars Helpers to be used in templates later.
 * @return {void}
 */
export function registerHandlebarsHelpers() {

  Handlebars.registerHelper('add', function (obj1, obj2) {
    return obj1 + obj2;
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

  Handlebars.registerHelper('costPrinter', function (cost, costIcon, mergeAmount, hasValueForZero, zeroIcon) {
    const costIconHtml = `<i class="${costIcon} cost-icon"></i>`;
    const zeroIconHtml = `<i class="${zeroIcon} cost-icon"></i>`;

    if (cost === undefined) return '';
    if (cost === 0 && hasValueForZero) return zeroIconHtml;
    if (cost === 0) return '';
     
    if (mergeAmount > 6 && cost > 1) return `<b>${cost}x</b>&nbsp${costIconHtml}`;

    let pointsPrinter = "";
    for (let i = 1; i <= cost; i ++) {
      pointsPrinter += costIconHtml;
    }
    return pointsPrinter;
  });

  Handlebars.registerHelper('costPrinterIcons', function (cost, iconPath, mergeAmount, hasValueForZero, zeroIconPath) {
    const costImg = `<img src=${iconPath} class="cost-img">`;
    const zeroImg = `<img src=${zeroIconPath} class="cost-img">`;

    if (cost === undefined) return '';
    if (cost === 0 && hasValueForZero) return zeroImg;
    if (cost === 0) return '';

    if (mergeAmount > 6) return `<b>${cost}x</b>&nbsp${costImg}`;
     
    let pointsPrinter = "";
    for (let i = 1; i <= cost; i ++) {
      pointsPrinter += costImg;
    }
    return pointsPrinter;
  });

  Handlebars.registerHelper('printGrit', function (current, max) {
    let fullPoint = "<a class='gp fa-solid fa-hand-fist fa-lg'></a>";
    let emptyPoint = "<a class='gp fa-light fa-hand-fist fa-lg'></a>";

    let gritPoints = "";
    for(let i = 0; i < max; i++) {
      if (i < current) gritPoints += fullPoint;
      else gritPoints += emptyPoint;
    }
    return gritPoints;
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

  Handlebars.registerHelper('PARTIAL', function(partialName, b) {
    const partialPath = allPartials()[partialName];

    if (!partialPath) {
      return new Handlebars.SafeString(`Partial "${partialName}" not found`);
    }

    const template = Handlebars.partials[partialPath];
    if (template) {
      return new Handlebars.SafeString(template(this));
    }
    return '';
  });

  Handlebars.registerHelper('varLocalize', (firstString, key, secondString) => {
    return game.i18n.localize(`${firstString}${key}${secondString}`);
  })
}