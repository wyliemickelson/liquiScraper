import util from 'util';
import { nanoid } from 'nanoid'
import { createParser } from "./parser.js";
import { createScraper, ScrapingError } from "./scraper.js"
import { testVods } from "./validateVodlinks.js";
import { sampleSources } from "./sampleSources.js"
import { saveTournament, getTournament } from "./save.js"
import mongoose from 'mongoose'
import combineTournaments from './combine.js'
import tournament from './models/tournament.js';

async function main() {
    // const oldTournament = await getTournament("4m2tPaCzB0cy")
    // const newTournament = await generateTournament(oldTournament.details.sources, oldTournament.details)
    // const combinedTournament = combineTournaments(oldTournament, newTournament)
    // await saveTournament(combinedTournament).catch(console.dir);

    const tournament = await generateTournament(sampleSources[1]);
    await saveTournament(tournament).catch(console.dir);
}

async function generateTournament(sources, tournamentDetails) {
  try {
    const details = tournamentDetails ?? await getTournamentDetails(sources);
    const matchBuckets = await getAllMatchBuckets(details);
    const tournament = {
      details,
      matchBuckets,
      _id: nanoid(12),
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

function getMatchBuckets(source, details) {
  const scraper = createScraper(source.url);
  return new Promise((resolve, reject) => {
    scraper.getDataStrings()
      .then((parserOptions) => {
        parserOptions.matchListBestOf = source.matchListBestOf ?? null;
        parserOptions.tournamentDetails = details;
        return createParser(parserOptions);
      })
      .then(parser => {
        const buckets = parser.getMatchBuckets();
        resolve(buckets);
      })
      .catch(e => { reject(e); })
  })
}

async function getAllMatchBuckets(details) {
  try {
    let buckets = await Promise.all(details.sources.matchSources.map(source => getMatchBuckets(source, details)));
    buckets = buckets.flat();
    // if there is only one bracket, change the title to playoffs
    if (buckets.filter(bucket => bucket.type === 'bracket').length === 1) {
      const i = buckets.findIndex(bucket => bucket.type === 'bracket');
      buckets[i].title = 'Playoffs';
    }
    // sort buckets by date of first match, then by title
    buckets = buckets.sort((a, b) => {
      //strip off hours and minutes to compare month and day only
      const dateA = new Date(new Date(a.matches[0].dateStart).toDateString());
      const dateB = new Date(new Date(b.matches[0].dateStart).toDateString());
      
      const titleA = a.title.toUpperCase();
      const titleB = b.title.toUpperCase();
      return dateA - dateB || titleA.localeCompare(titleB);
    })
    return buckets;
  } catch (e) { throw e; }
}

main();