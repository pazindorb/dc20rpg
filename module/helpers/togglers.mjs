import { isCoreSkillKey, switchLanguageMasteryByOneLevel, switchMasteryByOneLevel } from "./skills.mjs";

/**
 * Changes value of actor's attribute saveMastery.
 */
export function toggleSaveMastery(event, actor) {
  event.preventDefault();
  const dataset = event.currentTarget.dataset;
  let currentValue = actor.system.attributes[dataset.key].saveMastery;
  let pathToValue = `system.attributes.${dataset.key}.saveMastery`;
  actor.update({[pathToValue] : !currentValue});
}

/**
 * Changes value of actor's skill skillMastery.
 */
export function toggleSkillMastery(event, actor) {
  event.preventDefault();
  const dataset = event.currentTarget.dataset;
  
  let currentValue;
  let pathToValue;
  if (dataset.key === "awareness") {
    currentValue = actor.system.awareness.skillMastery;
    pathToValue = 'system.awareness.skillMastery';
    
  } 
  else if(isCoreSkillKey(dataset.key)) {
    currentValue = actor.system.skills[dataset.key].skillMastery;
    pathToValue = `system.skills.${dataset.key}.skillMastery`;
  } 
  else {
    currentValue = actor.system.skills.kno.knowledgeSkills[dataset.key].skillMastery;
    pathToValue = `system.skills.kno.knowledgeSkills.${dataset.key}.skillMastery`;
  }
  // checks which mouse button were clicked 1(left), 2(middle), 3(right)
  let newValue = event.which === 3 
    ? switchMasteryByOneLevel(currentValue, true) 
    : switchMasteryByOneLevel(currentValue);

  actor.update({[pathToValue] : newValue});
}

/**
 * Changes value of actor's trade skill skillMastery.
 */
export function toggleTradeSkillMastery(event, actor) {
  event.preventDefault();
  const dataset = event.currentTarget.dataset;
  
  let currentValue = actor.system.tradeSkills[dataset.key].skillMastery;
  let pathToValue = `system.tradeSkills.${dataset.key}.skillMastery`;
  
  // checks which mouse button were clicked 1(left), 2(middle), 3(right)
  let newValue = event.which === 3 
    ? switchMasteryByOneLevel(currentValue, true) 
    : switchMasteryByOneLevel(currentValue);

  actor.update({[pathToValue] : newValue});
}

/**
 * Changes value of actor's language mastery.
 */
export function toggleLanguageSkillMastery(event, actor) {
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

/**
 * Reverses flag on given actor.
 */
export function reverseFlag(event, actor) {
  event.preventDefault();
  const dataset = event.currentTarget.dataset;
  const flagKey = dataset.flag;

  let newValue = !actor.flags[flagKey];
  let pathToValue = `flags.${flagKey}`;
  actor.update({[pathToValue] : newValue});
}