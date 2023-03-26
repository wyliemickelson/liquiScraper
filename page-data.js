import { parse } from "node-html-parser";
import { parseData } from "./parsing.js";
const headers = {
  "User-Agent": "Spoiler Free Esport Vod Site (wyliecoyote910@gmail.com)",
};

function main() {
  getPageHtmlFromUrl('https://liquipedia.net/counterstrike/BLAST/Premier/2022/World_Final')
  .then(data => {
    parseData(data);
    const html = parse(data);
  })
  .catch(e => {
    if (e instanceof PageDataGetError) {
      console.error(e.message);
    } else {
      console.trace(e);
    }
  });
}

// Custom error for api calls
class PageDataGetError extends Error {
  constructor(message) {
    super(message);
    this.name = "DataGetError";
  }
}

// URL functions
function stripUrl(liquipediaUrl) {
  return liquipediaUrl
    .replace("https://", "")
    .replace("http://", "")
    .replace("www.", "");
}

function getPageTitle(game, liquipediaUrl) {
  liquipediaUrl = stripUrl(liquipediaUrl);
  return liquipediaUrl.split(`liquipedia.net/${game}/`)[1];
}

function getGame(liquipediaUrl) {
  liquipediaUrl = stripUrl(liquipediaUrl);
  // first page redirect should be the game type
  return liquipediaUrl.split("/")[1];
}

function validateUrl(url) {
  const formattedUrl = new URL(url);
  if (formattedUrl.origin != 'https://liquipedia.net') {
    throw new PageDataGetError('Invalid URL');
  }
}

// API Calls
async function getPageIdFromUrl(game, liquipediaUrl) {
  // Accepts a liquipedia url and returns a mediawiki api pageId
  const liquipediaPageTitle = getPageTitle(game, liquipediaUrl);
  const request = `https://liquipedia.net/${game}/api.php?action=query&format=json&titles=${liquipediaPageTitle}`;
  return fetch(request, { headers: headers })
    .then((res) => res.json())
    .then((json) => {
      const pages = Object.keys(json["query"]["pages"]);
      if (pages.length < 1) {
        throw new PageDataGetError("Could not locate page.");
      } else if (pages.length > 1) {
        throw new PageDataGetError(
          `Found ${pages.length} with the name ${liquipediaPageTitle}! Expected only 1.`
        );
      }
      const pageKey = pages[0];
      if (pageKey == -1) {
        throw new PageDataGetError("There is currently no content for this page.");
      }
      return pageKey;
    })
}

async function getApiUrlFromLiquipediaUrl(game, liquipediaUrl) {
  // returns a Url for a mediawiki Api call
  return getPageIdFromUrl(game, liquipediaUrl)
    .then(pageId => `https://liquipedia.net/${game}/api.php?action=parse&format=json&pageid=${pageId}`);
}

async function getPageHtmlFromUrl(liquipediaUrl) {
  validateUrl(liquipediaUrl);
  const game = getGame(liquipediaUrl);
  const request = await getApiUrlFromLiquipediaUrl(game, liquipediaUrl);
  return fetch(request, { headers: headers })
    .then((res) => res.json())
    .then((json) => {
      let content = json["parse"]["text"]["*"];
      if (!content || content.length === 0) {
        throw new PageDataGetError(`Couldn't parse ${liquipediaUrl}`);
      }
      const html = parse(content);
      return html;
    })
}

main();

// export functions for unit testing
export {
  getPageHtmlFromUrl,
  getGame,
  getApiUrlFromLiquipediaUrl,
  getPageIdFromUrl,
};
