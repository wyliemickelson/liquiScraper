const cheerio = require('cheerio')
const moment = require('moment')
const { nanoid } = require('nanoid')
const { downloadImage } = require('./image-downloader.js')
const { closestMatch } = require('closest-match')
moment().utc().format();

function createParser(options) {
  const { htmlStr, gameType, matchListBestOf, tournamentDetails } = options;
  const $ = cheerio.load(htmlStr);

  function getSideBarInfo(rowTitle) {
    return $('.infobox-description').filter(function () {
      return $(this).text() === rowTitle;
    }).next().text();
  }

  function getTournamentDetails(sources) {
    // some titles have linkboxes with text [e][h], so trim them
    const title = $('.infobox-header').first().text().replaceAll(/\[.*?\]/g, '') // get rid of liquipedia edit tags

    //strip off hours and minutes to compare month and day only
    const dateStart = new Date(new Date(getSideBarInfo('Start Date:')).toDateString());
    const dateEnd = new Date(new Date(getSideBarInfo('End Date:')).toDateString());

    const today = new Date(new Date().toDateString());
    const isCompleted = dateEnd < today;

    let logoSrc = $('.infobox-image.darkmode img').attr('src');
    logoSrc = `https://www.liquipedia.net${logoSrc}`;

    return {
      sources,
      title,
      logoSrc: downloadImage(logoSrc, 'eventLogo', title),
      gameType,
      dateStart,
      dateEnd,
      isCompleted,
      participants: getTournamentTeams(title),
    }
  }

  const shortenName = (name) => {
    if (name.length <= 3) {
      return name.toUpperCase()
    }
    const words = name.split(' ')
    // multiple 'words'
    if (words.length > 1) {
      return name.match(/\b\w/g).join('').toUpperCase()
    }
    // one word
    return name.slice(0, 3).toUpperCase()
  }

  function getTournamentTeams(tournamentTitle) {
    const $teamCards = $('.teamcard');
    const teams = $teamCards.map((i, $teamCard) => {
      let name = $("center a", $teamCard).text();
      name = name.replaceAll(/\[.*?\]/g, '') // get rid of liquipedia edit tags
      let logoSrc = $('.logo-darkmode img', $teamCard).attr('src');
      logoSrc = `https://www.liquipedia.net${logoSrc}`;
      return {
        _id: nanoid(12),
        name,
        shortName: shortenName(name),
        logoSrc: downloadImage(logoSrc, name, tournamentTitle),
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
        const isCompleted = matches.every(match => match.isCompleted);
        sortMatches(matches);

        return {
          _id: nanoid(12),
          bucketType: bucket.type,
          title,
          isCompleted,
          matches,
        }
      }).toArray();
    }).flat();

    return buckets;
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
    let title = $($closestHeader).text().replaceAll(/\[.*?\]/g, '') // get rid of liquipedia edit tags
    title = (title === 'Results') ? 'Playoffs' : title
    return title;
  }

  function getMatches($matchBucket, bucketType) {
    const matchTypeClasses = {
      bracket: '.brkts-round-center',
      matchlist: '.brkts-matchlist-match',
    }
    const $matches = $(matchTypeClasses[bucketType], $matchBucket);
    const matches = $matches.map((i, $match) => {
      const { dateStart, isCompleted } = getMatchStart($match);

      return {
        _id: nanoid(12),
        dateStart,
        isCompleted,
        revealed: bucketType === 'matchlist',
        matchData: isCompleted ? getMatchData($match, bucketType) : null,
      }
    }).toArray();

    return matches;
  }

  function sortMatches(matches) {
    function compareMatchDate(a, b) {
      const dateA = Date.parse(a.dateStart);
      const dateB = Date.parse(b.dateStart);
      return dateA - dateB;
    }

    return matches.sort(compareMatchDate);
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
    const tournamentTeamNames = tournamentDetails.participants.reduce((accum, p) => [...accum, p.name], [])

    const teams = $teams.map((i, $team) => {
      const name = $('.team-template-darkmode img', $team).attr('alt');
      const nameMatch = closestMatch(name, tournamentTeamNames)
      const teamMatch = tournamentDetails.participants.find(p => p.name === nameMatch)
      const teamId = teamMatch._id
    
      const score = $($scores.get(i)).text();

      return {
        _id: teamId,
        name: teamMatch.name,
        score,
      }
    }).toArray();

    return teams;
  }

  function getMatchData($match, bucketType) {
    const [team1, team2] = getMatchTeams($match, bucketType);

    const winnerScore = Math.max(team1.score, team2.score);
    const bestOf = getBestOf(bucketType, winnerScore);
    const gamesPlayed = parseInt(team1.score) + parseInt(team2.score);

    return {
      bestOf,
      team1,
      team2,
      mapData: getMapData($match, gamesPlayed),
    }
  }

  function getMapData($match, gamesPlayed) {
    const $footer = $('.brkts-popup-footer', $match);
    const $vodlinks = $('.plainlinks a', $footer);

    const $maps = $('.brkts-popup-body-game', $match);
    const maps = $maps.map((i, $map) => {
      const mapNeeded = i <= gamesPlayed - 1
      let vod = {}, mapName = null;
      try {
        vod.url = $vodlinks.get(i).attribs['href'];
      } catch {
        vod.url = null;
      }
      if (['counterstrike', 'valorant'].includes(gameType)) {
        mapName = $($map).find('.brkts-popup-spaced a').text();
      }

      return {
        _id: nanoid(12),
        winner: mapNeeded ? getMapWinner($map) : 'Skipped',
        mapName,
        vod: mapNeeded ? vod : null,
      }
    }).toArray();

    return maps;
  }

  function getBestOf(bucketType, winnerScore) {
    // match score is most likely a bo1 map score if the score is > 11
    const bestOfDefault = () => {
      if (winnerScore >= 11) return 1;
      return winnerScore * 2 - 1;
    }
    if (bucketType === 'bracket') return bestOfDefault()
    return matchListBestOf ?? bestOfDefault()
  }

  function getMapWinner($match) {
    // only way to determine winner is by which team has an img with src 'GreenCheck.png'
    const $checkMark = $('.brkts-popup-spaced img, .brkts-popup-body-element-vertical-centered img', $match).first();
    let checkMarkSrc = $checkMark.attr('src');
    // get end of src path
    checkMarkSrc = checkMarkSrc.split("/").pop();
    const mapWinner = (checkMarkSrc === 'GreenCheck.png') ? '1' : '2';
    return mapWinner;
  }

  function getMatchStart($match) {
    const $timer = $('.timer-object', $match);
    const isCompleted = $timer.attr('data-finished') === "finished";

    const dirtyTimeStr = $timer.text();
    const timeZone = $('.timer-object abbr', $match).attr('data-tz');
    let dateStart = liquiTimeToIso(dirtyTimeStr, timeZone);
    if (dirtyTimeStr === '') dateStart = null
    dateStart = isNaN(dateStart) ? null : dateStart

    return {
      dateStart,
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

module.exports = {
  createParser,
}