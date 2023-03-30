import { createParser } from "./parser.js";
import { createScraper, ScrapingError } from "./scraper.js"
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

async function main() {
  const tournament = await generateTournament(options);
  console.log(util.inspect(tournament, false, null, true /* enable colors */));
}

async function generateTournament(options) {
  try {
    const tournamentInfo = await getTournamentInfo(options.mainUrl);
    const matchBuckets = await getAllMatchBuckets(options.matchUrls);
    return {
      tournamentInfo,
      matchBuckets,
    }
  } catch (e) {
    if (e instanceof ScrapingError) {
      console.error(e.message);
    } else {
      console.trace(e);
    }
    return;
  }
}

async function getTournamentInfo(url) {
  const scraper = createScraper(url);
  const dataStrings = await scraper.getDataStrings();
  const { htmlStr, wikiTextStr } = dataStrings;
  const parser = createParser(htmlStr, wikiTextStr);
  return parser.getTournamentInfo();
}

function getMatchBuckets(url) {
  const scraper = createScraper(url);
  return new Promise((resolve, reject) => {
    scraper.getDataStrings()
    .then((dataStrings) => {
      const { htmlStr, wikiTextStr } = dataStrings;
      return createParser(htmlStr, wikiTextStr)
    })
    .then(parser => {
      const matchLists = parser.getMatchLists();
      const brackets = parser.getBrackets();
      resolve([...matchLists, ...brackets]);
    })
    .catch(e => { reject(e); })
  })
}

async function getAllMatchBuckets(urls) {
  try {
    const buckets = await Promise.all(urls.map(getMatchBuckets));
    return buckets.flat();
  } catch (e) { throw e; }
}

main();