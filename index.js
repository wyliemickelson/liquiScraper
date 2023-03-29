import { createParser } from "./parser.js";
import { getPageHtmlFromUrl, ScrapingError } from "./scraping.js"
import util from 'util';

const options = {
  game: 'dota2',
  // from main url - obtain general match data and participants
  mainUrl: 'https://liquipedia.net/dota2/The_International/2022',
  // from matchUrls - obtain matchlists and brackets, then sort combined array by (1st) individual start time (2nd) individual title
  matchUrls: [
    'https://liquipedia.net/dota2/The_International/2022/Group_Stage_Day_1-2',
    'https://liquipedia.net/dota2/The_International/2022/Group_Stage_Day_3-4',
    'https://liquipedia.net/dota2/The_International/2022/Main_Event',
  ],
}

function main() {
  generateTournament(options);
}

async function generateTournament(options) {
  const matchLists = await getTournamentData(options.matchUrls[0]);
  console.log(util.inspect(matchLists, false, null, true /* enable colors */));
}

async function getTournamentData(mainUrl) {
  return getPageHtmlFromUrl(mainUrl)
    .then(htmlStr => createParser(htmlStr, 'html'))
    .then(parser => parser.parseHtml())
    .catch(e => {
      if (e instanceof ScrapingError) {
        console.error(e.message);
      } else {
        console.trace(e);
      }
    });
}

main();