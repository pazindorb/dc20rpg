import { switchLanguageMasteryByOneLevel, switchMasteryByOneLevel } from "./skills.mjs";
import { getValueFromPath } from "./utils.mjs";

/**
 * Changes value of actor's skill skillMastery.
 */
export function toggleSkillMastery(event, actor) {
  event.preventDefault();
  const dataset = event.currentTarget.dataset;
  const pathToValue = dataset.path;
  
  let currentValue = getValueFromPath(actor, pathToValue);
  // checks which mouse button were clicked 1(left), 2(middle), 3(right)
  let newValue = event.which === 3 
    ? switchMasteryByOneLevel(currentValue, true) 
    : switchMasteryByOneLevel(currentValue);

  actor.update({[pathToValue] : newValue});
}

/**
 * Changes value of actor's language mastery.
 */
export function toggleLanguageMastery(event, actor) {
  event.preventDefault();
  const dataset = event.currentTarget.dataset;

  let currentValue = actor.system.languages[dataset.key].languageMastery;
  let pathToValue = `system.languages.${dataset.key}.languageMastery`;
  
  // checks which mouse button were clicked 1(left), 2(middle), 3(right)
  let newValue = event.which === 3 
    ? switchLanguageMasteryByOneLevel(currentValue, true) 
    : switchLanguageMasteryByOneLevel(currentValue);

    actor.update({[pathToValue] : newValue});
}