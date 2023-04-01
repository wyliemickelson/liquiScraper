import { createParser } from "./parser.js";
import { createScraper, ScrapingError } from "./scraper.js"
import util from 'util';
import { promises as fs } from 'fs';


const sources = {
  // from main url - obtain general match data and participants
  main: 'https://liquipedia.net/leagueoflegends/LEC/2023/Winter',
  // main: 'https://liquipedia.net/counterstrike/BLAST/Premier/2022/Fall',
  // main: 'https://liquipedia.net/valorant/VCL/2023/North_America/Split_1',
  // main: 'https://liquipedia.net/rocketleague/Gamers8/2022',
  // main: 'https://liquipedia.net/counterstrike/BLAST/Premier/2023/Spring/Showdown/Americas',
  // main: 'https://liquipedia.net/dota2/The_International/2022',
  // main: 'https://liquipedia.net/dota2/GAMERS_GALAXY/Invitational_Series/Dubai/2022',
  // from matchUrls - obtain matchlists and brackets, then sort combined array by (1st) individual start time (2nd) individual title
  matchSources: [
    {
      url: 'https://liquipedia.net/dota2/The_International/2022/Group_Stage_Day_1-2',
      matchListBestOf: 2,
    },
    // {
    //   url: 'https://liquipedia.net/leagueoflegends/LEC/2023/Winter/Group_Stage',
    //   matchListBestOf: 3,
    // },
    // {
    //   url: 'https://liquipedia.net/leagueoflegends/LEC/2023/Winter/Playoffs',
    // },
    // 'https://liquipedia.net/leagueoflegends/LEC/2023/Winter/Group_Stage',
    // 'https://liquipedia.net/leagueoflegends/LEC/2023/Winter/Playoffs',
    // 'https://liquipedia.net/valorant/VCL/2023/North_America/Split_1/Group_Stage',
    // 'https://liquipedia.net/dota2/GAMERS_GALAXY/Invitational_Series/Dubai/2022',
    // 'https://liquipedia.net/dota2/The_International/2022/Group_Stage_Day_1-2',
    // 'https://liquipedia.net/dota2/The_International/2022/Main_Event',
    // 'https://liquipedia.net/rocketleague/Gamers8/2022',
    // 'https://liquipedia.net/counterstrike/BLAST/Premier/2023/Spring/Showdown/Americas',
    // 'https://liquipedia.net/counterstrike/BLAST/Premier/2022/Spring',
    // 'https://liquipedia.net/counterstrike/BLAST/Premier/2022/Fall',
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