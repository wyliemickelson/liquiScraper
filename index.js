import { parse } from 'node-html-parser';
const headers = {"User-Agent": 'Spoiler Free Esport Vod Site (wyliecoyote910@gmail.com)'};
const testApiURL = 'https://liquipedia.net/rocketleague/api.php?action=parse&format=json&pageid=129693';
const games = [
  'rocketleague',
  'valorant',
];

const testURLs = [
  'https://liquipedia.net/rocketleague/Rocket_League_Championship_Series/2022-23/Winter',
  'https://liquipedia.net/valorant/VCL/2023/North_America/Mid-Season_Face_Off',
]

// fetch(testURL, {headers: headers})
//   .then(res => res.json())
//   .then((json) => {
//     const content = json['parse']['text']['*'];
//     const html = parse(content);
//     console.log(html.structuredText);
//   })

async function getPageIdFromUrl(game, liquipediaUrl) {
  // Accepts a liquipedia url and returns a mediawiki api pageId
  liquipediaUrl = (
      liquipediaUrl.replace("https://", "")
      .replace("http://", "")
      .replace("www.", "")
  )
  const liquipediaPageTitle = liquipediaUrl.split(`liquipedia.net/${game}/`)[1];
  const request = `https://liquipedia.net/${game}/api.php?action=query&format=json&titles=${liquipediaPageTitle}`;
  return fetch(request, {headers: headers})
  .then(res => res.json())
  .then(json => {
    const pages = Object.keys(json['query']['pages']);
    if (pages.length < 1) {
      throw new Error('Could not locate page.');
    } else if (pages.length > 1) {
      throw new Error(`Found ${pages.length} with the name ${liquipediaPageTitle}! Expected only 1.`);
    }
    const pageKey = pages[0]
    if (pageKey == -1) {
      throw new Error('There is currently no content for this page.');
    }
    return pageKey;
  })
  .catch(e => {
    console.error(e.message);
    process.exit();
  })
}

function getGame(liquipediaUrl) {
  liquipediaUrl = (
    liquipediaUrl.replace("https://", "")
    .replace("http://", "")
    .replace("www.", "")
  )
  // first page redirect should be the game type
  return liquipediaUrl.split('/')[1];
}

async function getApiUrlFromLiquipediaUrl(game, liquipediaUrl) {
  const pageId = await getPageIdFromUrl(game, liquipediaUrl);
  console.log(pageId);
  return `https://liquipedia.net/${game}/api.php?action=parse&format=json&pageid=${pageId}`;
}

async function getPageHtmlFromUrl(liquipediaUrl) {
  const game = getGame(liquipediaUrl);
  const request = await getApiUrlFromLiquipediaUrl(game, liquipediaUrl);
  return fetch(request, {headers: headers})
  .then(res => res.json())
  .then(json => {
    let content = json['parse']['text']['*'];
    if (!content || content.length === 0) {
      throw new Error(`Couldn't parse ${liquipediaUrl}`);
    }
    const html = parse(content);
    return html;
  })
}

async function run() {
  console.log(await (await getPageHtmlFromUrl(testURLs[1])).toString());
}

run();