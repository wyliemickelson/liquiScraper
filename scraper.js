import { promises as fs } from 'fs';

const headers = {
  "User-Agent": "Spoiler Free Esport Vod Site (wyliecoyote910@gmail.com)",
  "Accept-Encoding": 'gzip',
};

// Custom error for api calls
export class ScrapingError extends Error {
  constructor(message) {
    super(message);
    this.name = "ScrapingError";
  }
}

export function createScraper(liquipediaUrl) {
  const useCache = false; // set to false when in production
  const url = new URL(liquipediaUrl);
  const gameType = getGame();
  const pageTitle = getPageTitle();
  let pageId;

  function getGame() {
    const path = url.pathname;
    // first page redirect should be the game type
    return path.split("/")[1];
  }

  function getPageTitle() {
    const path = url.pathname;
    return path.split(`/${gameType}/`)[1];
  }

  function validateUrl() {
    const formattedUrl = new URL(url);
    if (formattedUrl.origin != 'https://liquipedia.net') {
      throw new ScrapingError(`Url does not come from liquipedia.net: ${url}`);
    }
  }

  function getHtmlRequest() {
    return `https://liquipedia.net/${gameType}/api.php?action=parse&format=json&pageid=${pageId}`;
  }

  function getIdRequest() {
    return `https://liquipedia.net/${gameType}/api.php?action=query&format=json&titles=${pageTitle}`;
  }

  //TODO - caching only needed for testing, reformat later
  async function cacheDataStrings(htmlStr) {
    await fs.writeFile(`./cache/${pageId}-html.text`, htmlStr);
  }

  async function checkCache() {
    const fileExists = async (path) => (await fs.stat(path).catch(e => false));
    if (await fileExists(`./cache/${pageId}-html.text`)) {
      return await fs.readFile(`./cache/${pageId}-html.text`);
    }
    return null;
  }

  async function getDataStrings() {
    validateUrl();
    const idRequest = getIdRequest();
    pageId = await fetchPageId(idRequest);
    let htmlStr;
    
    if (useCache) htmlStr = await checkCache()
    const htmlRequest = getHtmlRequest();
    htmlStr = htmlStr ?? await fetchHtml(htmlRequest);
    if (useCache) cacheDataStrings(htmlStr);

    return {
      htmlStr,
      gameType,
    }
  }

  async function fetchPageId(idRequest) {
    const res = await fetch(idRequest, { headers: headers });
    const json = await res.json();
    const pages = Object.keys(json["query"]["pages"]);
    if (pages.length < 1) {
      throw new ScrapingError("Could not locate page.");
    } else if (pages.length > 1) {
      throw new ScrapingError(
        `Found ${pages.length} with the name ${pageTitle}! Expected only 1.`
      );
    }
    const pageId = pages[0];
    if (pageId == -1) {
      throw new ScrapingError(`There is currently no content for page: ${url}.`);
    }
    return pageId;
  }

  async function fetchHtml(htmlRequest) {
    const res = await fetch(htmlRequest, { headers: headers });
    const json = await res.json();
    let htmlStr = json["parse"]["text"]["*"];
    if (!htmlStr || htmlStr.length === 0) {
      throw new ScrapingError(`Couldn't parse html from ${url}`);
    }
    return htmlStr;
  }

  return {
    getDataStrings,
  }
}