const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const crypto = require('crypto');

const htmlPath = "./rules/html";
const journalPath = "./rules/journal";

if (!fs.existsSync(journalPath)) {
  console.error("OUTPUT FOLDER FOR JOUNRALS DOES NOT EXIST"); 
  return;
}

let chapterCounter = 0;
const paths = getHtmlFilePaths();
for (const filePath of paths) {
  const file = fs.readFileSync(filePath, 'utf-8');

  const $html = cheerio.load(file);
  const [pageHeader, pageBody] = cleanHtml($html);
  const journal = parseToJournalJson(pageHeader, pageBody);
  const journalFileName = `${chapterCounter}_${toSnakeCase(journal.name)}.json`;
  fs.writeFileSync(path.join(journalPath, journalFileName), JSON.stringify(journal, null, 2));
  chapterCounter++;
}

function getHtmlFilePaths() {
  return fs.readdirSync(htmlPath)
        .filter(fileName => fileName.endsWith('.html'))
        .map(fileName => path.join(htmlPath, fileName))
}

function cleanHtml($html) {
  $html('head').remove();

  // Remove some of the classes that we dont need in our journal
  const classesToRemove = ["highlight-blue", "highlight-default", "highlight-orange", "highlight-purple", "highlight-yellow", "highlight-default_background"];
  $html('*').each((_, el) => {
    const $el = $html(el);
    classesToRemove.forEach(className => $el.removeClass(className));
  });
  // Replace <mark> with its content
  $html('mark').each((_, el) => {
    const $el = $html(el);
    $el.replaceWith($el.html());
  });
  // Replace <mark> with its content
  $html('mark').each((_, el) => {
    const $el = $html(el);
    $el.replaceWith($el.html());
  });
  // Remove hyperlinks
  $html('a').each((_, el) => {
    const $el = $html(el);
    $el.replaceWith($el.html());
  });
  // Replace <div style="display:contents" dir="auto"> with its content
  $html('div[style*="display:contents"]').each((_, el) => {
    const $el = $html(el);
    $el.replaceWith($el.html());
  });

  const header = $html('header').html();
  const body = $html('div.page-body').html();
  return [header, body]
}

function parseToJournalJson(header, body) {
  const $header = cheerio.load(header);
  const journalName = $header("h1.page-title").text();
  const htmlPages = splitToHtmlPages(body);
  
  const pages = [];
  const createdIds = new Map(); // Sometimes we might duplicate record and we need to skip it
  for (const hpg of htmlPages) {
    const order = pages.length + 1;
    const content = hpg.content;
    const [name, level] = extractFromHeading(hpg.heading);
    let id = generateId(name + journalName);
    if (createdIds.has(id)) {
      const alreadyCreated = createdIds.get(id);
      console.warn(`[DUPLICATED PAGE ID] ${journalName}.${name} creates the same Id as ${journalName}.${alreadyCreated} - Creating new randomized id`);
      id = generateId(name + journalName + `${Math.random()}`);
    }
    createdIds.set(id, name);
    pages.push(page(id, name, content, level, order));
  }
  return journal(journalName, pages);
}

function splitToHtmlPages(body) {
  const htmlPages = [];
  const $body = cheerio.load(body);
  let currentSection = null;
  $body("body").children().each((_, element) => {
    const tag = element.tagName?.toLowerCase();
    const isHeading = tag === 'h1' || tag === 'h2' || tag === 'h3';

    if (isHeading) {
      if (currentSection) {
        htmlPages.push(currentSection);
      }
      currentSection = {
        heading: $body.html(element),
        content: ''
      };
    } else if (currentSection) {
      currentSection.content += $body.html(element);
    }
  })

  // Push the last section
  if (currentSection) htmlPages.push(currentSection);
  return htmlPages;
}

function extractFromHeading(heading) {
  const $heading = cheerio.load(heading);
  const name = $heading.text();
  if (heading.startsWith("<h1")) return [name, 1];
  if (heading.startsWith("<h2")) return [name, 2];
  if (heading.startsWith("<h3")) return [name, 3];
}

function journal(name, pages) {
  return {
    name: cleanString(name),
    pages: pages
  }
}

function page(id, name, content, level, order) {
  return {
    _id: id,
    name: cleanString(name),
    ownership: {
      default: -1
    },
    sort: order,
    text: {
      content: content,
      format: 1
    },
    title: {
      level: level,
      show: true
    },
    type: "text",
  }
}

function cleanString(string) {
  string = string.replace(/[\t]/g, '');
  string = string.replace(/[\n]/g, ' ');
  return string;
}

function generateId(from) {
  return crypto
      .createHash('sha256')
      .update(from)
      .digest('hex')
      .slice(0, 16);
}

function toSnakeCase(string) {
  return string.replaceAll(" ", "_");
}