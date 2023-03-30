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
    throw new ScrapingError('Invalid URL');
  }
}

function getPageId(idRequest, liquipediaUrl) {
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
        throw new ScrapingError(`There is currently no content for page: ${liquipediaUrl}.`);
      }
      return pageId;
    })
}

// API Calls
async function getHtmlRequest(game, liquipediaUrl, pageId) {
  const pageRequest = `https://liquipedia.net/${game}/api.php?action=parse&format=json&pageid=${pageId}`;
  return pageRequest;
}

function getIdRequest(game, liquipediaUrl) {
  const liquipediaPageTitle = getPageTitle(game, liquipediaUrl);
  return `https://liquipedia.net/${game}/api.php?action=query&format=json&titles=${liquipediaPageTitle}`;
}

function getWikiTextReq(game, liquipediaUrl) {
  const liquipediaPageTitle = getPageTitle(game, liquipediaUrl);
  return `https://liquipedia.net/${game}/api.php?action=query&prop=revisions&rvslots=*&titles=${liquipediaPageTitle}&format=json&rvprop=content`;
}

export async function getDataStringsFromUrl(liquipediaUrl) {
  validateUrl(liquipediaUrl);
  const game = getGame(liquipediaUrl);
  const idRequest = getIdRequest(game, liquipediaUrl);
  const pageId = await getPageId(idRequest, liquipediaUrl);
  const htmlRequest = await getHtmlRequest(game, liquipediaUrl, pageId);
  const htmlStr = await fetchHtml(htmlRequest);
  const wikiTextRequest = getWikiTextReq(game, liquipediaUrl);
  const wikiTextStr = await fetchWikiText(wikiTextRequest, pageId);

  return {
    htmlStr,
    wikiTextStr,
  }
}

function fetchWikiText(wikiTextRequest, pageId) {
  return fetch(wikiTextRequest, { headers: headers })
    .then((res) => res.json())
    .then((json) => {
      let wikiTextStr = json["query"]["pages"][`${pageId}`]["revisions"][0]["slots"]["main"]["*"];
      if (!wikiTextStr || wikiTextStr.length === 0) {
        throw new ScrapingError(`Couldn't parse wikitext from ${liquipediaUrl}`);
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
        throw new ScrapingError(`Couldn't parse html from ${liquipediaUrl}`);
      }

      return htmlStr;
    })
}
