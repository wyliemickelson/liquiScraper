import { createParser } from "./parser.js";
import { getPageHtmlFromUrl, ScrapingError } from "./scraping.js"
import util from 'util';

const options = {
  gameType: 'counterstrike',
  // from main url - obtain general match data and participants
  mainUrl: 'https://liquipedia.net/counterstrike/BLAST/Premier/2022/Fall',
  // from matchUrls - obtain matchlists and brackets, then sort combined array by (1st) individual start time (2nd) individual title
  matchUrls: [
    'https://liquipedia.net/counterstrike/BLAST/Premier/2022/Fall',
    'https://liquipedia.net/counterstrike/BLAST/Premier/2022/Spring',
  ],
}

function main() {
  generateTournament(options);
}

async function generateTournament(options) {
  try {
    const matchBuckets = await getAllMatchBuckets(options.matchUrls);
    console.log(util.inspect(matchBuckets, false, null, true /* enable colors */));
  } catch (e) {
    if (e instanceof ScrapingError) {
      console.error(e.message);
    } else {
      console.trace(e);
    }
    return;
  }
}

function getMatchBuckets(url) {
  return new Promise((resolve, reject) => {
    getPageHtmlFromUrl(url)
    .then(htmlStr => createParser(htmlStr, 'html'))
    .then(parser => {
      const matchLists = parser.getMatchLists();
      const brackets = parser.getBrackets();
      resolve([...matchLists, ...brackets]);
    })
    .catch(e => { reject(e) })
  })
}

function getAllMatchBuckets(urls) {
  return Promise.all(urls.map(getMatchBuckets))
    .then(buckets => buckets.flat())
    .catch(e => { throw e })
}

main();