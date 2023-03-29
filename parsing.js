import * as cheerio from 'cheerio';
import moment from 'moment';
import util from 'util';
moment().utc().format();

// cheerio global object
let $;
// 
let dataUrl;

export function parseHtml(htmlStr, dataUrl) {
  $ = cheerio.load(htmlStr);
  const participants = getTeams();
  const matchLists = getMatchLists();

  //TODO add function to parse and return bracket matches and information
  console.log(util.inspect(matchLists, false, null, true /* enable colors */))
}

function getTeams() {
  const $teamCards = $('.teamcard');
  const teams = $teamCards.map((i, $teamCard) => {
    const name = $("center a", $teamCard).text();
    let logoSrc = $('.logo-lightmode img', $teamCard).attr('src');
    logoSrc = `https://www.liquipedia.net${logoSrc}`;
    return {
      name,
      logoSrc,
    }
  }).toArray();
  return teams;
}

function getMatchLists() {
  //TODO obtain best of X series data
  const $matchLists = $(".brkts-matchlist");
  const matchLists = $matchLists.map((i, $matchList) => {
    const title = $('.brkts-matchlist-title', $matchList).text()
    return {
      title,
      matches: getMatches($matchList),
    }
  }).toArray();
  return matchLists;
}

function liquiTimeToIso(dirtyTimeStr, timeZone) {
  // example liquipedia time format: March 24, 2023 - 19:55 CET
  // replace timezone abbreviation with +00:00 iso syntax
  const tzIndex = dirtyTimeStr.lastIndexOf(' ');
  let cleanTimeStr = dirtyTimeStr.substring(0, tzIndex);
  cleanTimeStr = `${cleanTimeStr}${timeZone}`

  const isoDate = moment(cleanTimeStr, 'MMMM DD, YYYY - HH:mmZZ').toDate();
  return isoDate;
}

function getMatchStart($match) {
  const $timer = $('.timer-object', $match);
  const isCompleted = $timer.attr('data-finished') === "finished";

  const dirtyTimeStr = $timer.text();
  const timeZone = $('.timer-object abbr', $match).attr('data-tz');
  const isoTimeStart = liquiTimeToIso(dirtyTimeStr, timeZone);

  return {
    isoTimeStart,
    isCompleted,
  }
}

function getMatchTeams($match, isCompleted) {
  const $teams = $('.brkts-popup-header-opponent', $match);
  const teams = $teams.map((i, $team) => {
    // thumbnail alt text gives the most consistent team name
    const name = $('.team-template-lightmode img', $team).attr('alt');
    const side = i === 0 ? 'left' : 'right';
    const score = isCompleted ? $(`.brkts-popup-header-opponent-score-${side}`, $team).text() : null;
    return {
      name,
      score,
    }
  })

  return teams;
}

function getSeriesType(winnerScore) {
  // match score is most likely a bo1 map score if the score is this > 11
  if (winnerScore >= 11) return 1;
  return winnerScore * 2 - 1;
}

function getMatches($matchList) {
  const $matches = $('.brkts-matchlist-match', $matchList);
  const matches = $matches.map((i, $match) => {
    const { isoTimeStart, isCompleted } = getMatchStart($match);
    const [team1, team2] = getMatchTeams($match, isCompleted);

    const winnerScore = Math.max(team1.score, team2.score);
    const bestOf = isCompleted ? getSeriesType(winnerScore) : null;

    return {
      isoTimeStart,
      isCompleted,
      bestOf,
      team1,
      team2,
      // mapData: getMaps($match, isCompleted, bestOf),
    }
  }).toArray();

  return matches;
}

function getMapWinner(singleMapData, isComplete) {
  // only way to know map winner is by which side has the checkmark png
  if (!isComplete) {
    return '';
  }
  const checkMark = Array.from(singleMapData.querySelectorAll('.brkts-popup-spaced img, .brkts-popup-body-element-vertical-centered img'));
  let team1Result = checkMark[0].getAttribute('src');
  team1Result = team1Result.split("/").pop();
  const mapWinner = (team1Result === 'GreenCheck.png') ? 1 : 2;
  return mapWinner;
}

function getVodLinks(singleMatchData) {
  const vodContainer = singleMatchData.querySelector('.brkts-popup-footer');
  if (vodContainer) {
    return Array.from(vodContainer.querySelectorAll('.plainlinks a'));
  }
  return null;
}

function getMaps(singleMatchData, isComplete, totalScore) {
  const mapsData = Array.from(singleMatchData.querySelectorAll('.brkts-popup-body-game'));
  const vodLinks = getVodLinks(singleMatchData);

  const maps = mapsData.map((singleMapData, i) => {
    // default values
    let mapWinner = '';
    let vodLink = '';
    // check if map was necessary
    if (totalScore > i) {
      mapWinner = getMapWinner(singleMapData, isComplete);
      vodLink = vodLinks.length > 0 ? vodLinks[i].getAttribute('href') : '';
    }
    return {
      winner: mapWinner,
      vodLink: vodLink,
    }
  })

  return maps;
}