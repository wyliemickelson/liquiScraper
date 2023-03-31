import { createParser } from "./parser.js";
import { createScraper, ScrapingError } from "./scraper.js"
import util from 'util';
import { promises as fs } from 'fs';


const sources = {
  // from main url - obtain general match data and participants
  main: 'https://liquipedia.net/counterstrike/BLAST/Premier/2022/Fall',
  // main: 'https://liquipedia.net/rocketleague/Gamers8/2022',
  // main: 'https://liquipedia.net/counterstrike/BLAST/Premier/2023/Spring/Showdown/Americas',
  // main: 'https://liquipedia.net/dota2/The_International/2022',
  // from matchUrls - obtain matchlists and brackets, then sort combined array by (1st) individual start time (2nd) individual title
  matchSources: [
    // 'https://liquipedia.net/dota2/The_International/2022/Group_Stage_Day_1-2',
    // 'https://liquipedia.net/dota2/The_International/2022/Main_Event',
    // 'https://liquipedia.net/rocketleague/Gamers8/2022',
    // 'https://liquipedia.net/counterstrike/BLAST/Premier/2023/Spring/Showdown/Americas',
    'https://liquipedia.net/counterstrike/BLAST/Premier/2022/Spring',
    'https://liquipedia.net/counterstrike/BLAST/Premier/2022/Fall',
  ],
}

async function main() {
  const tournament = await generateTournament(sources);
  console.log(util.inspect(tournament.matchBuckets, false, null, true /* enable colors */));
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
        const buckets = parser.getMatchBuckets();
        resolve(buckets);
      })
      .catch(e => { reject(e); })
  })
}

async function getAllMatchBuckets(urls) {
  try {
    let buckets = await Promise.all(urls.map(getMatchBuckets));
    buckets = buckets.flat();
    // if there is only one bracket, change the title to playoffs
    if (buckets.filter(bucket => bucket.type === 'bracket').length === 1) {
      const i = buckets.findIndex(bucket => bucket.type === 'bracket');
      buckets[i].title = 'Playoffs';
    }
    return buckets;
  } catch (e) { throw e; }
}

main();