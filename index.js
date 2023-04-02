import util from 'util';
import { createParser } from "./parser.js";
import { createScraper, ScrapingError } from "./scraper.js"
import { testVods } from "./validateVodlinks.js";
import { sampleSources } from "./sampleSources.js"

async function main() {
  try {
    const tournament = await generateTournament(sampleSources[0]);
    console.log(util.inspect(tournament.matchBuckets, false, null, true /* enable colors */));
  } catch (e) { return; }
}

async function generateTournament(sources) {
  try {
    const details = await getTournamentDetails(sources);
    const matchBuckets = await getAllMatchBuckets(sources.matchSources);
    const tournament = {
      details,
      matchBuckets,
    }
    await testVods(tournament);
    return tournament;
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
  const parserOptions = await scraper.getDataStrings();
  const parser = createParser(parserOptions);
  return parser.getTournamentDetails(sources);
}

function getMatchBuckets(source) {
  const scraper = createScraper(source.url);
  return new Promise((resolve, reject) => {
    scraper.getDataStrings()
      .then((parserOptions) => {
        parserOptions.matchListBestOf = source.matchListBestOf ?? null;
        return createParser(parserOptions);
      })
      .then(parser => {
        const buckets = parser.getMatchBuckets();
        resolve(buckets);
      })
      .catch(e => { reject(e); })
  })
}

async function getAllMatchBuckets(sources) {
  try {
    let buckets = await Promise.all(sources.map(getMatchBuckets));
    buckets = buckets.flat();
    // if there is only one bracket, change the title to playoffs
    if (buckets.filter(bucket => bucket.type === 'bracket').length === 1) {
      const i = buckets.findIndex(bucket => bucket.type === 'bracket');
      buckets[i].title = 'Playoffs';
    }
    // sort buckets by date of first match, then by title
    buckets.sort((a, b) => {
      const dateA = Date.parse(a.matches[0].isoTimeStart);
      const dateB = Date.parse(b.matches[0].isoTimeStart);
      return dateA - dateB || a.title.toUpperCase() - b.title.toUpperCase();
    })
    return buckets;
  } catch (e) { throw e; }
}

main();