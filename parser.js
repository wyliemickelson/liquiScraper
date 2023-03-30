import * as cheerio from 'cheerio';
import moment from 'moment';
moment().utc().format();

export function createParser(htmlStr, wikiTextStr, gameType) {
  const $ = cheerio.load(htmlStr);

  function getSideBarInfo(rowTitle) {
    return $('.infobox-description').filter(function () {
      return $(this).text() === rowTitle;
    }).next().text();
  }

  function getTournamentDetails(sources) {
    // some titles have linkboxes with text [e][h], so trim them
    const title = $('.infobox-header').first().text().replace('[e][h]', '');
    const startDate = new Date(getSideBarInfo('Start Date:'));
    const endDate = new Date(getSideBarInfo('End Date:'));

    const today = new Date();
    const isCompleted = endDate < today;

    let mainImgSrc = $('.infobox-image img').attr('src');
    mainImgSrc = `https://www.liquipedia.net${mainImgSrc}`;

    return {
      sources,
      title,
      mainImgSrc,
      gameType,
      startDate,
      endDate,
      isCompleted,
      participants: getTeams(),
    }
  }

  function getBrackets() {
    //TODO
    return [];
  }

  function getMatchLists() {
    const $matchLists = $(".brkts-matchlist");
    const matchLists = $matchLists.map((i, $matchList) => {
      const title = $('.brkts-matchlist-title', $matchList).text()
      return {
        title,
        type: 'matchlist',
        matches: getMatches($matchList),
      }
    }).toArray();
    return matchLists;
  }

  function getTeams() {
    //TODO - find way to filter out showmatches or data from anything other than the main participants list
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
    //TODO - does not work with matches with an even number of maps eg. (bo2)
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

  return {
    getTournamentDetails,
    getMatchLists,
    getBrackets,
  }
}

