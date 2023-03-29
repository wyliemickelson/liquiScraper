const headers = {
  "User-Agent": "Spoiler Free Esport Vod Site (wyliecoyote910@gmail.com)",
  "Accept-Encoding": 'gzip',
};

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
async function getPageRequestFromUrl(game, liquipediaUrl) {
  const liquipediaPageTitle = getPageTitle(game, liquipediaUrl);
  const idRequest = `https://liquipedia.net/${game}/api.php?action=query&format=json&titles=${liquipediaPageTitle}`;
  return fetch(idRequest, { headers: headers })
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
      const pageId = pages[0];
      if (pageId == -1) {
        throw new PageDataGetError("There is currently no content for this page.");
      }
      const pageRequest = `https://liquipedia.net/${game}/api.php?action=parse&format=json&pageid=${pageId}`;
      return pageRequest;
    })
}

export async function getPageHtmlFromUrl(liquipediaUrl) {
  validateUrl(liquipediaUrl);
  const game = getGame(liquipediaUrl);
  const request = await getPageRequestFromUrl(game, liquipediaUrl);
  return fetch(request, { headers: headers })
    .then((res) => res.json())
    .then((json) => {
      let htmlStr = json["parse"]["text"]["*"];
      if (!htmlStr || htmlStr.length === 0) {
        throw new PageDataGetError(`Couldn't parse ${liquipediaUrl}`);
      }

      return htmlStr;
    })
}
