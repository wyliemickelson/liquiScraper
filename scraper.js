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

  function getWikiTextReq() {
    return `https://liquipedia.net/${gameType}/api.php?action=query&prop=revisions&rvslots=*&titles=${pageTitle}&format=json&rvprop=content`;
  }

  async function getDataStrings() {
    validateUrl();
    const idRequest = getIdRequest();
    pageId = await fetchPageId(idRequest);
    
    const htmlRequest = getHtmlRequest();
    const htmlStr = await fetchHtml(htmlRequest);

    const wikiTextRequest = getWikiTextReq();
    const wikiTextStr = await fetchWikiText(wikiTextRequest);

    return {
      htmlStr,
      wikiTextStr,
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

  async function fetchWikiText(wikiTextRequest) {
    const res = await fetch(wikiTextRequest, { headers: headers });
    const json = await res.json();
    let wikiTextStr = json["query"]["pages"][`${pageId}`]["revisions"][0]["slots"]["main"]["*"];
    if (!wikiTextStr || wikiTextStr.length === 0) {
      throw new ScrapingError(`Couldn't parse wikitext from ${url}`);
    }
    return wikiTextStr;
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