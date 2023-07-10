/**
 * Removes headers when it has no items stored, as long as those are not send as core ones, those will stay.
 */
export function enchanceItemTab(tab, coreHeaders) {
  let headersAsEntries = _hideEmptyTableHeaders(tab, coreHeaders);
  _addSiblings(headersAsEntries);
  return Object.fromEntries(headersAsEntries);
}

function _hideEmptyTableHeaders(tab, coreHeaders) {
  let filteredEntries = Object.entries(tab).filter(
                header => Object.keys(header[1].items).length !== 0 
                      ? true : 
                      coreHeaders.includes(header[0])
                );
  return filteredEntries;
}

function _addSiblings(headersAsEntries) {
  for(let i = 0; i < headersAsEntries.length; i++) {
    let siblingBefore = headersAsEntries[i-1] ? headersAsEntries[i-1][0] : undefined;
    let siblingAfter = headersAsEntries[i+1] ? headersAsEntries[i+1][0] : undefined;

    headersAsEntries[i][1].siblings = {
      before: siblingBefore,
      after: siblingAfter
    }
  }
  return headersAsEntries;
}

/**
 * Adds new header name to actor's headersOrdering flag.
 */
export function addNewTableHeader(actor, headerName, tab) {
  const headersOrdering = actor.flags.dc20rpg.headersOrdering;
  const currentTabOrdering = headersOrdering[tab];

  const sortedHeaders = Object.entries(currentTabOrdering).sort((a, b) => a[1] - b[1]);
  const lastNumberInOrder = sortedHeaders[sortedHeaders.length - 1][1];

  headersOrdering[tab] = {
    ...currentTabOrdering, 
    [headerName]: lastNumberInOrder + 1
  }

  actor.update({[`flags.dc20rpg.headersOrdering`]: headersOrdering });
}

/**
 * Changes order of headers.
 */
export function reorderTableHeader(event, actor) {
  event.preventDefault();
  const dataset = event.currentTarget.dataset;
  const headersOrdering = actor.flags.dc20rpg.headersOrdering;

  const tab = dataset.tab;
  const current = dataset.current;
  const swapped = dataset.swapped;

  let currentSortValue = headersOrdering[tab][current];
  let swappedSortValue = headersOrdering[tab][swapped];

  headersOrdering[tab][current] = swappedSortValue;
  headersOrdering[tab][swapped] = currentSortValue;

  actor.update({[`flags.dc20rpg.headersOrdering`]: headersOrdering });
}