import { parse } from "node-html-parser";
import util from 'util';
import moment from 'moment';
moment().format();

export function parseData(data) {
  const htmlData = parse(data);
  const matchLists = getMatchLists(htmlData);
  console.log(util.inspect(matchLists, false, null, true /* enable colors */))
}

function getMatchLists(htmlData) {
  const matchListData = Array.from(htmlData.querySelectorAll(".brkts-matchlist"));
  let matchLists = [];
  matchListData.forEach((singleMatchListData) => {
    const title = singleMatchListData.querySelector('.brkts-matchlist-title').text;
    matchLists.push({
      title: title,
      matches: getMatches(singleMatchListData),
    })
  })

  return matchLists;
}
function getMatchStart(singleMatchData) {
  //TODO timezone is not correct
  //example time format: March 24, 2023 - 19:55 CET
  let matchStartTime = singleMatchData.querySelector('.timer-object').text;
  matchStartTime = matchStartTime.split(' ');
  matchStartTime.pop();
  matchStartTime = matchStartTime.join(' ');
  let start = moment(matchStartTime, "MMMM DD, YYYY - HH:ss")
  return start.toDate();
}

function getMatches(singleMatchListData) {
  const matchesData = Array.from(singleMatchListData.querySelectorAll('.brkts-matchlist-match'));
  let matches = [];
  matchesData.forEach((singleMatchData) => {
    //TODO check whether match is complete or not
    const matchTime = getMatchStart(singleMatchData);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 1);
    const isComplete = matchTime < cutoff;

    const teamsShort = Array.from(singleMatchData.querySelectorAll('.brkts-matchlist-opponent .name'));
    const teamsLong = Array.from(singleMatchData.querySelectorAll('.brkts-popup-header-opponent .name a'));
    const scores = Array.from(singleMatchData.querySelectorAll('.brkts-matchlist-score .brkts-matchlist-cell-content'));
    const totalScore = scores.reduce((sum, curr) => sum + Number(curr.text), 0);
    console.log(totalScore);
    // no score means match is yet to be played
    matches.push({
      completed: isComplete,
      team1Title: {
        abbr: teamsShort[0].text,
        full: teamsLong[0].text,
      },
      team2Title: {
        abbr: teamsShort[1].text,
        full: teamsLong[1].text,
      },
      team1Score: scores[0].text,
      team2Score: scores[1].text,
      maps: getMaps(singleMatchData, isComplete, totalScore),
    })
  })

  return [matches];
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

function getMaps(singleMatchData, isComplete, totalScore) {
  const mapsData = Array.from(singleMatchData.querySelectorAll('.brkts-popup-body-game'));
  let maps = [];
  const vodContainer = singleMatchData.querySelector('.brkts-popup-footer');
  let vodLinks;
  if (vodContainer) {
    vodLinks = Array.from(vodContainer.querySelectorAll('.plainlinks a'));
  }
  mapsData.forEach((singleMapData, i) => {
    // default values
    let mapWinner = '0';
    let vodLink = '';
    // check if map was necessary
    if (totalScore > i) {
      mapWinner = getMapWinner(singleMapData, isComplete);
      vodLink = vodLinks ? vodLinks[i].getAttribute('href') : '';
    }
    maps.push({
      winner: mapWinner,
      vodLink: vodLink,
    }) 
  })

  return maps;
}