import * as cheerio from 'cheerio';
import moment from 'moment';
moment().utc().format();

export function createParser(htmlStr, wikiTextStr, gameType) {
  const $ = cheerio.load(htmlStr);
  const matchIdTemplate = getMatchIdTemplate();

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

  function compareMatch(a, b) {
    const dateA = Date.parse(a.isoTimeStart);
    const dateB = Date.parse(b.isoTimeStart);
    return dateA - dateB;
  }

  function getBracketTitle($bracket) {
    let $outermostDiv = $($bracket).parent();

    // go to parent of .mw-headline
    while ($($outermostDiv).siblings().children('.mw-headline').length === 0) {
      $outermostDiv = $($outermostDiv).parent();
    }
    // go to outermost parent of bracket
    // console.log($($outermostDiv).attr('class'));
    // go up until .mw-headline
    let $closestHeader = $($outermostDiv);
    while ($($closestHeader).find('.mw-headline').length === 0) {
      $closestHeader = $($closestHeader).prev();
    }
    // $closestHeader = $($outermostDiv).prevUntil('h2, h3, h4, h5, h6, h7');
    // .first().prev().find('.mw-headline');
    
    const title = $($closestHeader).text().replace('[edit]', '');
    return title;
  }

  function getBrackets() {
    //TODO
    // get bracket matches through html
    // get bracket matches through wikitext
    // sort matches and conjoin the information
    // return joined information
    const $brackets = $('.brkts-bracket');
    const brackets = $brackets.map((i, $bracket) => {
      
    const title = getBracketTitle($bracket);
      return {
        type: 'bracket',
        title,
        matches: getMatches($bracket, 'bracket')
      }
    }).toArray()
    brackets.forEach((bracket) => bracket.matches.sort(compareMatch));

    return brackets;
  }

  function getMatchLists() {
    const $matchLists = $(".brkts-matchlist");
    const matchLists = $matchLists.map((i, $matchList) => {
      const title = $('.brkts-matchlist-title', $matchList).text()
      return {
        title,
        type: 'matchlist',
        matches: getMatches($matchList, 'matchlist'),
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

  function getMatchTeams($match, isCompleted, origin) {
    let teams;
    if (origin === 'bracket') {
      // teams come from a bracket
      const $teams = $('.brkts-opponent-entry', $match);
      teams = $teams.map((i, $team) => {
        // thumbnail alt text gives the most consistent team name
        const name = $('.team-template-lightmode img', $team).attr('alt');
        // count scores by number of maps won instead - get maps before the teams, then count map wins per team
        const score = isCompleted ? $(`.brkts-opponent-score-inner`, $team).text() : null;
        return {
          name,
          score,
        }
      }).toArray();
    } else {
      // teams come from a matchlist
      const $teams = $('.brkts-matchlist-opponent', $match);
      const $scores = $('.brkts-matchlist-score', $match);
      teams = $teams.map((i, $team) => {
        // thumbnail alt text gives the most consistent team name
        const name = $('.team-template-lightmode img', $team).attr('alt');
        const score = isCompleted ? $($scores.get(i)).text() : null;
        return {
          name,
          score,
        }
      }).toArray();
    }

    return teams;
  }

  function getSeriesType(winnerScore) {
    //TODO - does not work with matches with an even number of maps eg. (bo2)
    // match score is most likely a bo1 map score if the score is this > 11
    if (winnerScore >= 11) return 1;
    return winnerScore * 2 - 1;
  }

  function getMatchIdTemplate(matchUrl) {
    const matchIdentifiers = {
      valorant: {
        urlOrigin: 'vlr.gg',
        htmlId: 'vlr.gg/{id}',
        wikiTextId: 'vlr={id}',
        getStrippedId: function (url) {
          return new URL(url).pathname;
        }
      },
      counterstrike: {
        urlOrigin: 'hltv.org',
        htmlId: 'hltv.org/matches/{id}/match',
        wikiTextId: 'hltv={id}',
        getStrippedId: function (url) {
          return new URL(url).pathname.split('/')[2];
        }
      },
      dota2: {
        urlOrigin: 'dotabuff.com',
        htmlId: 'dotabuff.com/matches/{id}',
        wikiTextId: 'matchid1={id}',
        getStrippedId: function (url) {
          return new URL(url).pathname.split('/')[2];
        }
      },
      rocketleague: {
        urlOrigin: 'shiftrle.gg',
        htmlId: 'shiftrle.gg/matches/{id}',
        wikiTextId: 'shift={id}',
        getStrippedId: function (url) {
          return new URL(url).pathname.split('/')[2];
        }
      },
      leagueoflegends: {
        urlOrigin: 'gol.gg',
        htmlId: 'https://gol.gg/game/stats/{id}/page-game/',
        wikiTextId: 'gol={id}',
        getStrippedId: function (url) {
          return new URL(url).pathname.split('/')[3];
        }
      },
    }

    return matchIdentifiers[gameType];
  }

  function getMatches($matchList, origin) {
    const matchTypeClass = origin === 'matchlist' ? '.brkts-matchlist-match' : '.brkts-round-center';
    const $matches = $(matchTypeClass, $matchList);
    const matches = $matches.map((i, $match) => {
      
      const { isoTimeStart, isCompleted } = getMatchStart($match);
      const [team1, team2] = getMatchTeams($match, isCompleted, origin);

      const winnerScore = Math.max(team1.score, team2.score);
      const bestOf = isCompleted ? getSeriesType(winnerScore) : null;
      const gamesPlayed = parseInt(team1.score) + parseInt(team2.score);

      const $footer = $('.brkts-popup-footer', $match);
      const matchIdentifiers = matchIdTemplate;
      const $footerLinks = $('a', $footer);
      let matchId;
      try {
        const matchIdUrl = $footerLinks.filter(function (i, $link) {
          return $(this).attr('href').includes(matchIdentifiers.urlOrigin);
        }).first().attr('href');
        matchId = matchIdentifiers.getStrippedId(matchIdUrl);
      } catch {
        matchId = null;
      }

      return {
        origin,
        matchId,
        isoTimeStart,
        isCompleted,
        bestOf,
        team1,
        team2,
        mapData: isCompleted ? getMaps($match, gamesPlayed) : null,
        // mapData: getMaps($match, isCompleted, bestOf),
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

