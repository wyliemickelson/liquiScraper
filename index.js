import { createParser } from "./parser.js";
import { createScraper, ScrapingError } from "./scraper.js"
import util from 'util';


const sources = {
  // from main url - obtain general match data and participants
  main: 'https://liquipedia.net/counterstrike/BLAST/Premier/2022/Fall',
  // from matchUrls - obtain matchlists and brackets, then sort combined array by (1st) individual start time (2nd) individual title
  matchSources: [
    'https://liquipedia.net/counterstrike/BLAST/Premier/2022/Fall',
    'https://liquipedia.net/counterstrike/BLAST/Premier/2022/Spring',
  ],
}

async function main() {
  const tournament = await generateTournament(sources);
  console.log(util.inspect(tournament.details, false, null, true /* enable colors */));
}

async function generateTournament(sources) {
  try {
    const details = await getTournamentDetails(sources);
    const matchBuckets = await getAllMatchBuckets(sources.matchSources);
    return {
      details,
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

async function getTournamentDetails(sources) {
  const scraper = createScraper(sources.main);
  const dataStrings = await scraper.getDataStrings();
  const { htmlStr, wikiTextStr, gameType } = dataStrings;
  const parser = createParser(htmlStr, wikiTextStr, gameType);
  return parser.getTournamentDetails(sources);
}

function getMatchBuckets(url) {
  const scraper = createScraper(url);
  return new Promise((resolve, reject) => {
    scraper.getDataStrings()
      .then((dataStrings) => {
        const { htmlStr, wikiTextStr, gameType } = dataStrings;
        return createParser(htmlStr, wikiTextStr, gameType)
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