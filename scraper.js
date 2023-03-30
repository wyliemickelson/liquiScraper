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
  const url = liquipediaUrl;
  const gameType = getGame();
  let pageId;

  // URL functions
  function stripUrl() {
    return url
      .replace("https://", "")
      .replace("http://", "")
      .replace("www.", "");
  }

  function getPageTitle() {
    const strippedUrl = stripUrl(url);
    return strippedUrl.split(`liquipedia.net/${gameType}/`)[1];
  }

  function getGame(url) {
    const strippedUrl = stripUrl(url);
    // first page redirect should be the game type
    return strippedUrl.split("/")[1];
  }

  function validateUrl() {
    const formattedUrl = new URL(url);
    if (formattedUrl.origin != 'https://liquipedia.net') {
      throw new ScrapingError('Invalid URL');
    }
  }

  function getPageId(idRequest) {
    return fetch(idRequest, { headers: headers })
      .then((res) => res.json())
      .then((json) => {
        const pages = Object.keys(json["query"]["pages"]);
        if (pages.length < 1) {
          throw new ScrapingError("Could not locate page.");
        } else if (pages.length > 1) {
          throw new ScrapingError(
            `Found ${pages.length} with the name ${liquipediaPageTitle}! Expected only 1.`
          );
        }
        const pageId = pages[0];
        if (pageId == -1) {
          throw new ScrapingError(`There is currently no content for page: ${url}.`);
        }
        return pageId;
      })
  }

  // API Calls
  async function getHtmlRequest() {
    const pageRequest = `https://liquipedia.net/${gameType}/api.php?action=parse&format=json&pageid=${pageId}`;
    return pageRequest;
  }

  function getIdRequest() {
    const liquipediaPageTitle = getPageTitle();
    return `https://liquipedia.net/${gameType}/api.php?action=query&format=json&titles=${liquipediaPageTitle}`;
  }

  function getWikiTextReq() {
    const liquipediaPageTitle = getPageTitle();
    return `https://liquipedia.net/${gameType}/api.php?action=query&prop=revisions&rvslots=*&titles=${liquipediaPageTitle}&format=json&rvprop=content`;
  }

  async function getDataStrings() {
    validateUrl();
    const idRequest = getIdRequest();
    pageId = await getPageId(idRequest);
    const htmlRequest = await getHtmlRequest();
    const htmlStr = await fetchHtml(htmlRequest);
    const wikiTextRequest = getWikiTextReq();
    const wikiTextStr = await fetchWikiText(wikiTextRequest);

    return {
      htmlStr,
      wikiTextStr,
    }
  }

  function fetchWikiText(wikiTextRequest) {
    return fetch(wikiTextRequest, { headers: headers })
      .then((res) => res.json())
      .then((json) => {
        let wikiTextStr = json["query"]["pages"][`${pageId}`]["revisions"][0]["slots"]["main"]["*"];
        if (!wikiTextStr || wikiTextStr.length === 0) {
          throw new ScrapingError(`Couldn't parse wikitext from ${url}`);
        }

        return wikiTextStr;
      })
  }

  function fetchHtml(htmlRequest) {
    return fetch(htmlRequest, { headers: headers })
      .then((res) => res.json())
      .then((json) => {
        let htmlStr = json["parse"]["text"]["*"];
        if (!htmlStr || htmlStr.length === 0) {
          throw new ScrapingError(`Couldn't parse html from ${url}`);
        }

        return htmlStr;
      })
  }

  return {
    getDataStrings,
  }
}