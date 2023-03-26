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

    const teams = Array.from(singleMatchData.querySelectorAll('.brkts-matchlist-opponent .name'));
    const scores = Array.from(singleMatchData.querySelectorAll('.brkts-matchlist-score .brkts-matchlist-cell-content'));

    // no score means match is yet to be played
    matches.push({
      team1: teams[0].text,
      team2: teams[1].text,
      team1Score: scores[0].text,
      team2Score: scores[1].text,
      maps: getMaps(singleMatchData, isComplete),
    })
  })

  return [matches];
}

function getMapWinner(singleMapData, isComplete) {
    // only way to know map winner is by which side has the checkmark png
    if (!isComplete) {
      return '';
    }
    const checkMark = Array.from(singleMapData.querySelectorAll('.brkts-popup-spaced img'));
    let team1Result = checkMark[0].getAttribute('src');
    team1Result = team1Result.split("/").pop();
    const mapWinner = (team1Result === 'GreenCheck.png') ? 1 : 2;
    return mapWinner;
}

function getMaps(singleMatchData, isComplete) {
  const mapsData = Array.from(singleMatchData.querySelectorAll('.brkts-popup-body-game'));
  let maps = [];
  const vodLinks = Array.from(singleMatchData.querySelector('.brkts-popup-footer').querySelectorAll('.plainlinks a'));
  mapsData.forEach((singleMapData, i) => {
    const mapWinner = getMapWinner(singleMapData, isComplete);
    maps.push({
      winner: mapWinner,
      vodLink: isComplete ? vodLinks[i].getAttribute('href') : '',
    })
  })

  return maps;
}