import { getLabelFromKey } from "../utils.mjs";

/**
 * Registers additional Handlebars Helpers to be used in templates later.
 * @return {void}
 */
export function registerHandlebarsHelpers() {

  Handlebars.registerHelper('capitalize', function (str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
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

  Handlebars.registerHelper('costPrinter', function (cost, costIcon, hasValueForZero, zeroIcon ) {
    let costIconHtml = `<i class="${costIcon} fa-lg cost-icon"></i>`;

    if (cost === undefined) return '';
    if (cost === 0 && hasValueForZero) return `<i class="${zeroIcon} fa-lg cost-icon"></i>`;
    if (cost === 0) return '';
     
    if (cost >= 5) return `<b>${cost}</b> ${costIconHtml}`;

    let pointsPrinter = "";
    for (let i = 1; i <= cost; i ++) {
      pointsPrinter += costIconHtml;
    }
    return pointsPrinter;
  });

  Handlebars.registerHelper('arrayIncludes', function(object, options) {
    let arrayString = options.hash.arrayString;
    let array = arrayString.split(' ');

    return array.includes(object);
  });

  Handlebars.registerHelper('labelFromKey', function(key, objectWithLabels) {
    return getLabelFromKey(key, objectWithLabels);
  });
}