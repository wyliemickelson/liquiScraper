import chalk from "chalk"
import { nanoid } from 'nanoid'
import { createParser } from "./parser.js";
import { createScraper, ScrapingError } from "./scraper.js"
import { testVods } from "./validateVodlinks.js";
import { sampleSources } from "./sampleSources.js"
import { saveTournament, getTournament, getOngoingTournaments, replaceTournament } from "./save.js"
import combineTournaments from './combine.js'

async function main() {
  createTournament(sampleSources[2])
}

async function createTournament(sources) {
  const tournament = await generateTournament(sources);
  await saveTournament(tournament).catch(console.dir);
}

async function updateTournament(tournamentId) {
  const oldTournament = await getTournament(tournamentId)
  const newTournament = await generateTournament(oldTournament.details.sources, oldTournament.details)
  const combinedTournament = combineTournaments(oldTournament, newTournament)
  await replaceTournament(combinedTournament).catch(console.dir);
}

async function updateOngoingTournaments() {
  const ongoingTournaments = await getOngoingTournaments()
  for (let i = 0; i < ongoingTournaments.length; i++) {
    const tournamentToUpdate = ongoingTournaments[i]
    console.log(chalk.bgCyan.bold('Updating tournament'), chalk.bgCyan.magenta('Title:'), chalk.bgCyan.yellow(tournamentToUpdate.details.title), chalk.cyan('...'))
    await updateTournament(tournamentToUpdate._id)
    // if it is last tournament, don't wait
    if (i !== ongoingTournaments.length - 1) {
      console.log(chalk.red('Waiting 5 seconds until updating next tournament...'))
      await delay(5000)
      console.log(chalk.red('Wait complete'))
    }
  }

  if (ongoingTournaments.length === 0) {
    console.log(chalk.bgRed.bold(' Found no tournaments to update. '))
  } else {
    console.log(chalk.bgGreen.bold(' All tournaments updated. '))
  }
}

async function generateTournament(sources, tournamentDetails) {
  try {
    const details = tournamentDetails ?? await getTournamentDetails(sources);
    if (!tournamentDetails) {
      console.log(chalk.red('Waiting 5 seconds until fetching next page...'))
      await delay(5000)
      console.log(chalk.red('Wait complete'))
    } else {
      console.log(chalk.blue('Tournament details already provided.'))
    }
    console.log(chalk.cyan('Starting matchbucket generation...'))
    const matchBuckets = await getAllMatchBuckets(details);
    console.log(chalk.blue('Matchbuckets generated.'))
    const tournament = {
      details,
      matchBuckets,
      _id: nanoid(12),
    }
    console.log(chalk.cyan('Testing vods...'))
    await testVods(tournament);
    console.log(chalk.blue('Vod testing complete.'))
    console.log(chalk.green.bold('Tournament generated successfully.'))
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
  console.log(chalk.cyan('Generating tournament details from'), chalk.magenta('URL:'), chalk.yellow(sources.main), chalk.cyan('...'))
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
    const matchSources = details.sources.matchSources;
    let buckets = []
    for (let i = 0; i < matchSources.length; i++) {
      const source = matchSources[i]
      console.log(chalk.cyan('Generating matchbuckets from'), chalk.magenta('URL:'), chalk.yellow(source.url), chalk.cyan('...'))
      const newBuckets = await (getMatchBuckets(source, details))
      buckets = [...buckets, ...newBuckets]
      // if it is last source, don't wait
      if (i !== matchSources.length - 1) {
        console.log(chalk.red('Waiting 5 seconds until fetching next page...'))
        await delay(5000)
        console.log(chalk.red('Wait complete'))
      }
    }

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

const delay = ms => new Promise(res => setTimeout(res, ms));

function sayHello() {
  console.log('hello')
}

main();

module.exports = {
  sayHello,
  updateOngoingTournaments,
}