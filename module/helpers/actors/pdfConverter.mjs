import { itemDetailsToHtml } from "../items/itemDetails.mjs";
import { getItemFromActor } from "./itemsOnActor.mjs";

let font = null;
async function loadFont(pdfDoc) {
  pdfDoc.registerFontkit(fontkit);
  const ptsansFontBytes = await fetch('systems/dc20rpg/pdf/PTSans-Regular.ttf').then(res => res.arrayBuffer());
  font = await pdfDoc.embedFont(ptsansFontBytes);
}

export async function fillPdfFrom(actor) {
  if (!actor) return;

  const pdf = PDFLib.PDFDocument;
  const sheetPath = "systems/dc20rpg/pdf/fillable-character-sheet.pdf";
  const sheetPdfBytes = await fetch(sheetPath).then(res => res.arrayBuffer());

  // Load the PDF document
  const pdfDoc = await pdf.load(sheetPdfBytes);
  await loadFont(pdfDoc);
  const form = pdfDoc.getForm();
  // form.acroForm.dict.set(PDFLib.PDFName.of('NeedAppearances'), PDFLib.PDFBool.True);
  const itemCards = [];
  _setValues(form, actor, itemCards);

  // Item cards to pdf
  const LINES_PER_PAGE = 62;
  let linesOnPage = 62;
  let pageName = "Item-Card-0";
  let pageText = "";
  let pageCounter = 0;
  for (const card of itemCards) {
    let currentLines = 3;
    currentLines += _calculateLineCount(card.description, 84);

    if (linesOnPage + currentLines > LINES_PER_PAGE) {
      // Add current text to the page
      if (pageText) _text(form.getTextField(pageName), pageText);
      pageText = "";
      
      // Prepare next page
      linesOnPage = currentLines;
      pageCounter++;
      pageName = `Item-Card-${pageCounter}`;
      _addNewPage(pdfDoc, pageName);
    }
    else {
      linesOnPage += currentLines;
    }

    pageText += "=================================================================================\n";
    pageText += `${card.name}  ${card.details}\n`;
    pageText += "=================================================================================";
    pageText += card.description;
    pageText += "\n\n";
  }
  _text(form.getTextField(pageName), pageText); // Fill last page

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${actor.name}-character-sheet.pdf`;
  link.click();
}

async function _addNewPage(pdfDoc, textFieldName) {
  const width = 595;  // A4 width
  const height = 842; // A4 height

  const page = pdfDoc.addPage([width, height]);
  let textField = pdfDoc.getForm().createTextField(textFieldName);
  textField.addToPage(page, {
    x: 10,
    y: 10,  
    width: width - 20,
    height: height - 20,
    borderColor: PDFLib.rgb(1, 1, 1),
  });
  textField.enableMultiline();
  textField.setAlignment('Left');
  textField.setFontSize(12);
}

function _calculateLineCount(text, lineLength) {
  let lines = 0;
  let paragraphs = text.split("\n");
  paragraphs.forEach(paragraph => {
      if (paragraph.length === 0) {
          lines += 1; // Empty line still takes one line
      } else {
          lines += Math.ceil(paragraph.length / lineLength);
      }
  });
  return lines;
}

function _setValues(form, actor, itemCards) {
  const prime = actor.system.attributes.prime.value || 0;
  const combatMastery = actor.system.details.combatMastery || 0;

  // =================== HEADER ===================
  _text(form.getTextField("Character Name"), actor.name);

  const className = _getItemName(actor.system.details.class.id, actor);
  const subclassName = _getItemName(actor.system.details.subclass.id, actor);
  const classAndSubclass = subclassName !== "" ? `${subclassName} ${className}` : className;
  _text(form.getTextField("Class & Subclass"), classAndSubclass);

  const ancestryName = _getItemName(actor.system.details.ancestry.id, actor);
  const backgroundName = _getItemName(actor.system.details.background.id, actor);
  _text(form.getTextField("Ancestry"), `${ancestryName} (${backgroundName})`);

  _text(form.getTextField("Level"), actor.system.details.level);
  _text(form.getTextField("Combat Mastery"), combatMastery);
  // =================== HEADER ===================


  // ================== COLUMN 1 ==================
  _text(form.getTextField("Prime"), actor.system.attributes.prime.value);
  _text(form.getTextField("Might"), actor.system.attributes.mig.value);
  _text(form.getTextField("Agility"), actor.system.attributes.agi.value);
  _text(form.getTextField("Charisma"), actor.system.attributes.cha.value);
  _text(form.getTextField("Intelligence"), actor.system.attributes.int.value);

  _text(form.getTextField("Might Save"), actor.system.attributes.mig.save);
  _text(form.getTextField("Agility Save"), actor.system.attributes.agi.save);
  _text(form.getTextField("Charisma Save"), actor.system.attributes.cha.save);
  _text(form.getTextField("Intelligence Save"), actor.system.attributes.int.save);

  _setSkills(form, actor);
  _setLangs(form, actor);
  _setResistances(form, actor);
  // ================== COLUMN 1 ==================


  // ================== COLUMN 2 ==================
  _text(form.getTextField("Hit Points Current"), actor.system.resources.health.max);
  _text(form.getTextField("Hit Points Max"), actor.system.resources.health.max);
  _text(form.getTextField("Physical Defense"), actor.system.defences.precision.value);
  _text(form.getTextField("Mental Defense"), actor.system.defences.area.value);
  _text(form.getTextField("PD Heavy Threshold"), actor.system.defences.precision.heavy);
  _text(form.getTextField("PD Brutal Threshold"), actor.system.defences.precision.brutal);
  _text(form.getTextField("MD Heavy Threshold"), actor.system.defences.area.heavy);
  _text(form.getTextField("MD Brutal Threshold"), actor.system.defences.area.brutal);
  _checkbox(form.getCheckBox("Physical-Damage-Reduction"), actor.system.damageReduction.pdr.active, "circle");
  _checkbox(form.getCheckBox("Elemantal-Damage-Reduction"), actor.system.damageReduction.edr.active, "circle");
  _checkbox(form.getCheckBox("Mental-Damage-Reduction"), actor.system.damageReduction.mdr.active, "circle");

  _text(form.getTextField("Attack Check"), prime + combatMastery);
  _text(form.getTextField("Save DC"), 10 + prime + combatMastery);
  _text(form.getTextField("Initiative"), actor.system.special.initiative);
  // ================== COLUMN 2 ==================


  // ================== COLUMN 3 ==================
  _text(form.getTextField("Stamina Points Current"), actor.system.resources.stamina.max);
  _text(form.getTextField("Stamina Points Max"), actor.system.resources.stamina.max);
  _text(form.getTextField("Mana Points Current"), actor.system.resources.mana.max);
  _text(form.getTextField("Mana Points Max"), actor.system.resources.mana.max);
  _text(form.getTextField("Grit Point Current"), actor.system.resources.grit.max);
  _text(form.getTextField("Grit Point Cap"), actor.system.resources.grit.max);
  _text(form.getTextField("Rest Point Current"), actor.system.resources.restPoints.max);
  _text(form.getTextField("Rest Point Cap"), actor.system.resources.restPoints.max);
  _setCustomResources(form, actor);

  const movement = actor.system.movement;
  _text(form.getTextField("Move Speed"), movement.ground.current);
  _checkbox(form.getCheckBox("Fly-Half"), movement.flying.halfSpeed || movement.flying.fullSpeed, "circle");
  _checkbox(form.getCheckBox("Fly-Full"), movement.flying.fullSpeed, "circle");
  _checkbox(form.getCheckBox("Swim-Half"), movement.swimming.halfSpeed || movement.swimming.fullSpeed, "circle");
  _checkbox(form.getCheckBox("Swim-Full"), movement.swimming.fullSpeed, "circle");
  _checkbox(form.getCheckBox("Glide-Half"), movement.glide.halfSpeed || movement.glide.fullSpeed, "circle");
  _checkbox(form.getCheckBox("Glide-Full"), movement.glide.fullSpeed, "circle");
  _checkbox(form.getCheckBox("Climb-Half"), movement.climbing.halfSpeed || movement.climbing.fullSpeed, "circle");
  _checkbox(form.getCheckBox("Climb-Full"), movement.climbing.fullSpeed, "circle");
  _checkbox(form.getCheckBox("Burrow-Half"), movement.burrow.halfSpeed || movement.burrow.fullSpeed, "circle");
  _checkbox(form.getCheckBox("Burrow-Full"), movement.burrow.fullSpeed, "circle");

  _text(form.getTextField("Jump Distance"), actor.system.jump.current);
  _checkbox(form.getCheckBox("Exhaustion -1"), false, "rect");
  _checkbox(form.getCheckBox("Exhaustion -2"), false, "rect");
  _checkbox(form.getCheckBox("Exhaustion -3"), false, "rect");
  _checkbox(form.getCheckBox("Exhaustion -4"), false, "rect");
  _checkbox(form.getCheckBox("Exhaustion -5"), false, "rect");
  _text(form.getTextField("Death Threshold"), actor.system.death.treshold);
  // ================== COLUMN 3 ==================


  // =================== ITEMS ====================
  _prepareFeatures(form, actor, itemCards);
  _prepareSpellsAndManeuvers(form, actor, itemCards);
  _prepareInventory(form, actor, itemCards);
  // =================== ITEMS ====================
}

function _checkbox(field, checked, type) {
  const assert = (condition, msg = '') => {
    if (!condition) throw new Error(msg || 'Assertion failed');
  };

  // check/uncheck
  if (checked) field.check();
  else field.uncheck();

  // set style
  if (type === "circle") {
    field.updateAppearances((checkBox, widget) => { 
      assert(checkBox === field);
      assert(widget instanceof PDFLib.PDFWidgetAnnotation);
      return { on: [..._drawCircle(true)], off: [..._drawCircle(false)] };
    });
  } 
  if (type === "rect") {
    field.updateAppearances((checkBox, widget) => { 
      assert(checkBox === field);
      assert(widget instanceof PDFLib.PDFWidgetAnnotation);
      return { on: [..._drawRect(true)], off: [..._drawRect(false)] };
    });
  }
  if (type === "diamond") {
    field.updateAppearances((checkBox, widget) => { 
      assert(checkBox === field);
      assert(widget instanceof PDFLib.PDFWidgetAnnotation);
      return { on: [..._drawDiamond(true)], off: [..._drawDiamond(false)] };
    });
  }
}

function _text(field, value) {
  field.setText(value.toString());
  field.updateAppearances(font);
}

function _drawCircle(on) {
  return PDFLib.drawEllipse({ 
    x: 6, 
    y: 6.5, 
    xScale: 3, 
    yScale: 3, 
    borderWidth: 0, 
    color: on ? PDFLib.rgb(0,0,0) : PDFLib.rgb(1, 1, 1, 0), 
    borderColor: undefined, 
    rotate: PDFLib.degrees(0), 
  })
}

function _drawRect(on) {
  return PDFLib.drawRectangle({ 
    x: 1.5, 
    y: 1.5, 
    width: 6, 
    height: 6, 
    borderWidth: 0, 
    color: on ? PDFLib.rgb(0,0,0) : PDFLib.rgb(1, 1, 1, 0), 
    borderColor: undefined, 
    rotate: PDFLib.degrees(0), 
    xSkew: PDFLib.degrees(0),
    ySkew: PDFLib.degrees(0),
  })
}

function _drawDiamond(on) {
  return PDFLib.drawRectangle({ 
    x: 6.20, 
    y: 4, 
    width: 3.5, 
    height: 3.5, 
    borderWidth: 0, 
    color: on ? PDFLib.rgb(0,0,0) : PDFLib.rgb(1, 1, 1, 0), 
    borderColor: undefined, 
    rotate: PDFLib.degrees(45), 
    xSkew: PDFLib.degrees(0),
    ySkew: PDFLib.degrees(0),
  })
}

function _setSkills(form, actor) {
  // First we need to update styles for custom knowledge and trade skills
  for (let i = 2; i <= 10; i+=2) {
    _checkbox(form.getCheckBox(`Mastery-Trade-A-${i}`), false, "circle");
    _checkbox(form.getCheckBox(`Mastery-Trade-B-${i}`), false, "circle");
    _checkbox(form.getCheckBox(`Mastery-Trade-C-${i}`), false, "circle");
    _checkbox(form.getCheckBox(`Mastery-Trade-D-${i}`), false, "circle");
  }

  const expertise = new Set([...actor.system.expertise.automated, ...actor.system.expertise.manual]);
  const skillEntries = Object.entries(actor.system.skills);
  const tradeEntries = Object.entries(actor.system.trades);

  // Prepare Trades Masteries
  let tradesCounter = 0;
  const dif = ["A", "B", "C", "D"];
  for (const [key, trade] of tradeEntries) {
    // Knowledge trades are on the character sheet
    if (["arc", "nat", "his", "occ", "rel"].includes(key)) {
      skillEntries.push([key, trade]);
      continue;
    }

    if (trade.mastery === 0) continue;
    const tradeKey = dif[tradesCounter];
    if (!tradeKey) continue;

    tradesCounter++;
    _text(form.getTextField(`Custom Trade ${tradeKey}`), trade.label);
    _text(form.getTextField(`Trade ${tradeKey}`), trade.modifier);

    // Mark Expertise
    if (expertise.has(key)) _checkbox(form.getCheckBox(`Trade-${tradeKey}-Proficiency`), true, "diamond");
    else _checkbox(form.getCheckBox(`Trade-${tradeKey}-Proficiency`), false, "diamond");

    for (let i = 2; i <= 10; i+=2) {
      _checkbox(form.getCheckBox(`Mastery-Trade-${tradeKey}-${i}`), (2*trade.mastery) >= i, "circle");
    }
  }


  // Prepere Skill Masteries
  for (const [key, skill] of skillEntries) {
    let label = skill.label;
    try { form.getCheckBox(`${label}-Proficiency`) } catch (e) { continue }

    if (expertise.has(key)) _checkbox(form.getCheckBox(`${label}-Proficiency`), true, "diamond");
    else _checkbox(form.getCheckBox(`${label}-Proficiency`), false, "diamond");

    // Mark Expertise
    try {_text(form.getTextField(`${label}`), skill.modifier);}
    catch (error) {continue;}

    for (let i = 2; i <= 10; i+=2) {
      _checkbox(form.getCheckBox(`Mastery-${label}-${i}`), (2*skill.mastery) >= i, "circle");
    }
  }
}

function _setLangs(form, actor) {
  // First we need to update styles for languages
  _checkbox(form.getCheckBox("Mastery-Language-A-Limited"), false, "circle");
  _checkbox(form.getCheckBox("Mastery-Language-A-Fluent"), false, "circle");
  _checkbox(form.getCheckBox("Mastery-Language-B-Limited"), false, "circle");
  _checkbox(form.getCheckBox("Mastery-Language-B-Fluent"), false, "circle");
  _checkbox(form.getCheckBox("Mastery-Language-C-Limited"), false, "circle");
  _checkbox(form.getCheckBox("Mastery-Language-C-Fluent"), false, "circle");
  _checkbox(form.getCheckBox("Mastery-Language-D-Limited"), false, "circle");
  _checkbox(form.getCheckBox("Mastery-Language-D-Fluent"), false, "circle");

  const languages = actor.system.languages;
  let langCounter = 0;
  const dif = ["A", "B", "C", "D"];
  for (const lang of Object.values(languages)) {
    if (lang.mastery === 0) continue;
    const langKey = dif[langCounter];
    if (!langKey) continue;

    langCounter++;
    _text(form.getTextField(`Language ${langKey}`), lang.label);
    if (lang.mastery >= 1) _checkbox(form.getCheckBox(`Mastery-Language-${langKey}-Limited`), true, "circle");
    if (lang.mastery >= 2) _checkbox(form.getCheckBox(`Mastery-Language-${langKey}-Fluent`), true, "circle");
  }
}

function _setResistances(form, actor) {
  const dr = actor.system.damageReduction.damageTypes;
  const sr = actor.system.statusResistances;

  let misc = "";

  // Damage Resistance
  for (const reduction of Object.values(dr)) {
    if (reduction.immune)                                       misc += `${reduction.label} Immunity, `;
    else if (reduction.resistance && !reduction.vulnerability)  misc += `${reduction.label} Resistance(Half), `;
    else if (!reduction.resistance && reduction.vulnerability)  misc += `${reduction.label} Vulnerability(Half), `;

    if (reduction.immune) continue;
    const value = reduction.resist - reduction.vulnerable;
    if (value < 0)  misc += `${reduction.label} Vulnerability(${Math.abs(value)}), `;
    if (value > 0)  misc += `${reduction.label} Resistance(${value}), `;
  }

  // Status Resistance
  misc += "\n";
  for (const status of Object.values(sr)) {
    if (status.immunity)            misc += `${status.label} Immunity, `;
    else if (status.resistance > 0)  misc += `${status.label} Resistance(${status.resistance}), `;
    else if (status.vulnerability > 0)  misc += `${status.label} Vulnerability(${status.vulnerability}), `;
  }

  _text(form.getTextField("Misc"), misc);
}

function _setCustomResources(form, actor) {
  const customResources = actor.system.resources.custom;
  if (!customResources) return;

  let counter = 0;
  const dif = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
  for (const custom of Object.values(customResources)) {
    const key = dif[counter];
    if (!key) continue;

    counter++;
    _text(form.getTextField(`Resource ${key}`), custom.label);
    _text(form.getTextField(`Resource ${key} Current`), custom.max);
    _text(form.getTextField(`Resource ${key} Cap`), custom.max);
  }
}

function _prepareFeatures(form, actor, itemCards) {
  const features = actor.items.filter(item => item.type === "feature");

  let text = "";
  for (const feature of features) {
    const name = feature.name;
    const cost = _itemUseCost(feature, actor)
    const details = _itemDetails(feature);

    text += `== ${name}${cost}: ${details}\n`;
    itemCards.push({
      name: `${name}${cost}`,
      details: details,
      description: _itemDescription(feature)
    });
  }
  _text(form.getTextField("Features"), text);
}

function _prepareSpellsAndManeuvers(form, actor, itemCards) {
  const spells = actor.items.filter(item => item.type === "spell");
  const maneuvers = actor.items.filter(item => item.type === "maneuver");

  let text = "";
  for (const maneuver of maneuvers) {
    const name = maneuver.name;
    const cost = _itemUseCost(maneuver, actor)
    const details = _itemDetails(maneuver);

    text += `== ${name}${cost}: ${details}\n`;
    itemCards.push({
      name: `${name}${cost}`,
      details: details,
      description: _itemDescription(maneuver)
    });
  }

  for (const spell of spells) {
    const name = spell.name;
    const cost = _itemUseCost(spell, actor)
    const details = _itemDetails(spell);

    text += `== ${name}${cost}: ${details}\n`;
    itemCards.push({
      name: `${name}${cost}`,
      details: details,
      description: _itemDescription(spell)
    });
  }
  _text(form.getTextField("Spells and Maneuvers"), text);
}

function _prepareInventory(form, actor, itemCards) {
  const inventory = actor.items.filter(item => ["weapon", "equipment", "consumable"].includes(item.type));

  let text = "";
  for (const item of inventory) {
    const name = item.name;
    const cost = _itemUseCost(item, actor)
    const details = _itemDetails(item);

    text += `== ${name}${cost}: ${details}\n`;
    itemCards.push({
      name: `${name}${cost}`,
      details: details,
      description: _itemDescription(item)
    });
  }
  _text(form.getTextField("Carried"), text);
}

function _getItemName(itemId, actor) {
  const item = getItemFromActor(itemId, actor);
  if (item) return item.name;
  return "";
}

function _itemDescription(item) {
  let content = item.system.description;
  content = content.replaceAll("<li><p>", "\n- ");
  content = content.replace(/<li[^>]*>\s*(.*?)\s*<\/li>/gs, '\n\- $1 ');
  content = content.replace(/<p[^>]*>\s*(.*?)\s*<\/p>/gs, '\n$1 ');
  content = content.replaceAll("<br>", "\n");
  content = content.replaceAll("</p>", "");
  content = content.replaceAll("</li>", "");
  let div = document.createElement("div");
  div.innerHTML = content;
  return _removeLinks(div.innerText)
}

function _itemDetails(item) {
  let content = itemDetailsToHtml(item);
  content = content.replace(/<div[^>]*>\s*(.*?)\s*<\/div>/gs, '[$1] ');
  content = content.replaceAll("\n", "");
  if (content.startsWith("[ ")) content = content.replace("[ ", "[");
  return content;
}

function _itemUseCost(item, actor) {
  let text = "";
  const cost =  item.use.collectUseCost(true).resources;

  if (cost.ap > 0) text += `${cost.ap} AP, `;
  if (cost.stamina > 0) text += `${cost.stamina} SP, `;
  if (cost.mana > 0) text += `${cost.mana} MP, `;
  if (cost.health > 0) text += `${cost.health} HP, `;
  if (cost.grit > 0) text += `${cost.grit} GP, `;
  if (cost.restPoints > 0) text += `${cost.restPoints} RP, `;

  // Prepare Custom resource cost
  if (cost.custom) {
    for (const custom of Object.values(cost.custom)) {
      if (custom.value > 0) text += `${custom.value} ${custom.label}, `
    }
  }

  if (text) {
    text = text.slice(0,-2);
    text = ` (${text})`;
  }
  return text;
}

function _removeLinks(description) {
  const uuidRegex = /@UUID\[[^\]]*]\{[^}]*}/g;
  const itemLinks = [...description.matchAll(uuidRegex)];
  itemLinks.forEach(link => {
    link = link[0];
    let [uuid, name] = link.split("]{");    
    name = name.slice(0, name.length- 1);
    description = description.replace(link, name);
  });
  return description;
}