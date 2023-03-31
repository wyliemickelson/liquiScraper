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
    const isCompleted = endDate.getDay() < today.getDay();

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
      participants: getTournamentTeams(),
    }
  }

  //REFACTOR
  function getTournamentTeams() {
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

  function getMatchBuckets() {
    const matchBuckets = [
      {
        type: 'bracket',
        buckets: $('.brkts-bracket'),
      },
      {
        type: 'matchlist',
        buckets: $(".brkts-matchlist"),
      }
    ]

    const buckets = matchBuckets.map((bucket) => {
      return bucket.buckets.map((i, $bucket) => {
        const title = getBucketTitle($bucket, bucket.type);
        const matches = getMatches($bucket, bucket.type);
        generateIds(matches);

        return {
          type: bucket.type,
          title,
          matches,
        }
      }).toArray();
    })

    return buckets.flat();
  }

  function getBucketTitle($bucket, bucketType) {
    if (bucketType === 'matchlist') {
      return $('.brkts-matchlist-title', $bucket).text()
    }
    // go to outermost parent of bracket
    let $outermostDiv = $($bucket);
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

  function getMatches($matchBucket, bucketType) {
    const matchTypeClasses = {
      bracket: '.brkts-round-center',
      matchlist: '.brkts-matchlist-match',
    }
    const $matches = $(matchTypeClasses[bucketType], $matchBucket);
    const matches = $matches.map((i, $match) => {
      const { isoTimeStart, isCompleted } = getMatchStart($match);

      return {
        bucketType,
        matchId: null,
        isoTimeStart,
        isCompleted,
        matchData: isCompleted ? getMatchData($match, bucketType) : null,
      }
    }).toArray();

    return matches;
  }

  function sortMatches(matches) {
    function compareMatchDate(a, b) {
      const dateA = Date.parse(a.isoTimeStart);
      const dateB = Date.parse(b.isoTimeStart);
      return dateA - dateB;
    }

    return matches.sort(compareMatchDate);
  }

  function generateIds(matches) {
    sortMatches(matches);
    // only give ids after they're sorted
    matches.forEach((match, i) => {
      match['matchId'] = i;
    })
  }

  function getMatchTeams($match, bucketType) {
    // class identifiers differ between brackets and matchlists
    const scoreClasses = {
      bracket: '.brkts-opponent-score-inner',
      matchlist: '.brkts-matchlist-score',
    }
    const teamClasses = {
      bracket: '.brkts-opponent-entry',
      matchlist: '.brkts-matchlist-opponent',
    }

    const $scores = $(scoreClasses[bucketType], $match);
    const $teams = $(teamClasses[bucketType], $match);

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

  function getMatchData($match, bucketType) {
    const [team1, team2] = getMatchTeams($match, bucketType);

    const winnerScore = Math.max(team1.score, team2.score);
    const bestOf = getSeriesType(winnerScore);
    const gamesPlayed = parseInt(team1.score) + parseInt(team2.score);

    return {
      bestOf,
      team1,
      team2,
      mapData: getMapData($match, gamesPlayed),
    }
  }

  // REFACTOR - get map name if game is valorant, csgo, or rocketleague
  function getMapData($match, gamesPlayed) {
    const $footer = $('.brkts-popup-footer', $match);
    const $vodlinks = $('.plainlinks a', $footer);

    const $maps = $('.brkts-popup-body-game', $match);
    const maps = $maps.map((i, $map) => {
      if (i > gamesPlayed - 1) {
        // map is not needed
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

  //REFACTOR
  function getSeriesType(winnerScore) {
    //TODO - does not work with matches with an even number of maps eg. (bo2)
    // match score is most likely a bo1 map score if the score is this > 11
    if (winnerScore >= 11) return 1;
    return winnerScore * 2 - 1;
  }

  function getMapWinner($match) {
    // only way to determine winner is by which team has an img with src 'GreenCheck.png'
    const $checkMark = $('.brkts-popup-spaced img, .brkts-popup-body-element-vertical-centered img', $match).first();
    let checkMarkSrc = $checkMark.attr('src');
    // get end of src path
    checkMarkSrc = checkMarkSrc.split("/").pop();
    const mapWinner = (checkMarkSrc === 'GreenCheck.png') ? 1 : 2;
    return mapWinner;
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

  function liquiTimeToIso(dirtyTimeStr, timeZone) {
    // example liquipedia time format: March 24, 2023 - 19:55 CET
    // replace timezone abbreviation with +00:00 iso syntax
    const tzIndex = dirtyTimeStr.lastIndexOf(' ');
    let cleanTimeStr = dirtyTimeStr.substring(0, tzIndex);
    cleanTimeStr = `${cleanTimeStr}${timeZone}`

    const isoDate = moment(cleanTimeStr, 'MMMM DD, YYYY - HH:mmZZ').toDate();
    return isoDate;
  }

  return {
    getTournamentDetails,
    getMatchBuckets,
  }
}

