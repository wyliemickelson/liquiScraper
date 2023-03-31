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

  function sortMatches(matches) {
    function compareMatchDate(a, b) {
      const dateA = Date.parse(a.isoTimeStart);
      const dateB = Date.parse(b.isoTimeStart);
      return dateA - dateB;
    }

    matches.sort(compareMatchDate);
    // give each match an id after sorting
    matches.forEach((match, i) => {
      match['matchId'] = i;
    })
  }

  function getBracketTitle($bracket) {
    // go to outermost parent of bracket
    let $outermostDiv = $($bracket);
    while ($($outermostDiv).siblings().children('.mw-headline').length === 0) {
      $outermostDiv = $($outermostDiv).parent();
    }
    // while current div doesnt have a headline, move to prev sibling
    let $closestHeader = $($outermostDiv);
    while ($($closestHeader).find('.mw-headline').length === 0) {
      $closestHeader = $($closestHeader).prev();
    }
    // get title content from header, stripping away edit boxes
    const title = $($closestHeader).text().replace('[edit]', '');
    return title;
  }

  function getBrackets() {
    const $brackets = $('.brkts-bracket');
    const brackets = $brackets.map((i, $bracket) => {
      const matches = getMatches($bracket, 'bracket');
      sortMatches(matches);
      const title = getBracketTitle($bracket);

      return {
        type: 'bracket',
        title,
        matches,
      }
    }).toArray()

    return brackets;
  }

  function getMatchLists() {
    const $matchLists = $(".brkts-matchlist");
    const matchLists = $matchLists.map((i, $matchList) => {
      const title = $('.brkts-matchlist-title', $matchList).text()
      const matches = getMatches($matchList, 'matchlist');
      sortMatches(matches);

      return {
        title,
        type: 'matchlist',
        matches,
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

  function getMatchTeams($match, origin) {
    // class identifiers differ between brackets and matchlists
    const scoreClasses = {
      bracket: '.brkts-opponent-score-inner',
      matchlist: '.brkts-matchlist-score',
    }
    const teamClasses = {
      bracket: '.brkts-opponent-entry',
      matchlist: '.brkts-matchlist-opponent',
    }

    const $scores = $(scoreClasses[origin], $match);
    const $teams = $(teamClasses[origin], $match);

    const teams = $teams.map((i, $team) => {
      const name = $('.team-template-lightmode img', $team).attr('alt');
      const score = $($scores.get(i)).text();

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

  function getMatchData($match, origin) {
    const [team1, team2] = getMatchTeams($match, origin);

    const winnerScore = Math.max(team1.score, team2.score);
    const bestOf = getSeriesType(winnerScore);
    const gamesPlayed = parseInt(team1.score) + parseInt(team2.score);

    return {
      bestOf,
      team1,
      team2,
      mapData: getMaps($match, gamesPlayed),
    }
  }

  function getMatches($matchList, origin) {
    const matchTypeClass = origin === 'matchlist' ? '.brkts-matchlist-match' : '.brkts-round-center';
    const $matches = $(matchTypeClass, $matchList);
    const matches = $matches.map((i, $match) => {

      const { isoTimeStart, isCompleted } = getMatchStart($match);

      return {
        origin,
        matchId: null,
        isoTimeStart,
        isCompleted,
        matchData: isCompleted ? getMatchData($match, origin) : null,
      }
    }).toArray();

    return matches;
  }

  function getMapWinner($match) {
    const $checkMark = $('.brkts-popup-spaced img, .brkts-popup-body-element-vertical-centered img', $match).first();
    let team1Result = $checkMark.attr('src');
    team1Result = team1Result.split("/").pop();
    const mapWinner = (team1Result === 'GreenCheck.png') ? 1 : 2;
    return mapWinner;
  }

  function getMaps($match, gamesPlayed) {
    const $footer = $('.brkts-popup-footer', $match);
    const $vodlinks = $('.plainlinks a', $footer);

    const $maps = $('.brkts-popup-body-game', $match);
    const maps = $maps.map((i, $map) => {
      if (i > gamesPlayed - 1) {
        return;
      }
      let vodlink;
      try {
        vodlink = $vodlinks.get(i).attribs['href'];
      } catch {
        vodlink = 'Unavailable';
      }

      return {
        winner: getMapWinner($map),
        vodlink,
      }
    }).toArray();

    return maps;
  }

  return {
    getTournamentDetails,
    getMatchLists,
    getBrackets,
  }
}

