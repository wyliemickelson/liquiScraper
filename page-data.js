import { parse } from "node-html-parser";
import fs from 'fs';
import { parseData } from "./parsing.js";
const headers = {
  "User-Agent": "Spoiler Free Esport Vod Site (wyliecoyote910@gmail.com)",
};
const testApiURL =
  "https://liquipedia.net/rocketleague/api.php?action=parse&format=json&pageid=129693";
const games = ["rocketleague", "valorant"];

const testURLs = [
  "https://liquipedia.net/rocketleague/Rocket_League_Championship_Series/2022-23/Winter",
  "https://liquipedia.net/valorant/VCL/2023/North_America/Mid-Season_Face_Off",
  "https://www.freecodecamp.org/news/how-to-validate-urls-in-javascript/",
  "https://liquipedia.net/dota2/Dota_Pro_Circuit/2023/2/Western_Europe/Division_I",
];

// URL functions
function getPageTitle(game, liquipediaUrl) {
  liquipediaUrl = liquipediaUrl
    .replace("https://", "")
    .replace("http://", "")
    .replace("www.", "");
  return liquipediaUrl.split(`liquipedia.net/${game}/`)[1];
}

function getGame(liquipediaUrl) {
  liquipediaUrl = liquipediaUrl
    .replace("https://", "")
    .replace("http://", "")
    .replace("www.", "");
  // first page redirect should be the game type
  return liquipediaUrl.split("/")[1];
}

function validateUrl(url) {
  const formattedUrl = new URL(url);
  if (formattedUrl.origin != 'https://liquipedia.net') {
    throw new Error('Invalid URL');
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
        throw new Error("Could not locate page.");
      } else if (pages.length > 1) {
        throw new Error(
          `Found ${pages.length} with the name ${liquipediaPageTitle}! Expected only 1.`
        );
      }
      const pageKey = pages[0];
      if (pageKey == -1) {
        throw new Error("There is currently no content for this page.");
      }
      return pageKey;
    })
}

async function getApiUrlFromLiquipediaUrl(game, liquipediaUrl) {
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
        throw new Error(`Couldn't parse ${liquipediaUrl}`);
      }
      const html = parse(content);
      return html;
    })
}

getPageHtmlFromUrl('https://liquipedia.net/counterstrike/Intel_Extreme_Masters/2022/Rio/Challengers_Stage')
.then(data => {
  parseData(data);
  const html = parse(data);
  fs.writeFile('index.html', html.outerHTML, err => {
    if (err) {
      console.error(err);
    }
  })
})
// .catch(e => {
//   console.error(e.message);
// });

// export functions for unit testing
export {
  getPageHtmlFromUrl,
  getGame,
  getApiUrlFromLiquipediaUrl,
  getPageIdFromUrl,
};
