const tournament = {
  tournamentName: string,
  game: string,
  startDate: Date,
  endDate: Date,
  isComplete: boolean,
  matchLists: [
    list1,
    list2,
    list3,
  ],
  brackets: [
    bracket1,
    bracket2,
    bracket3,
  ],
}

const matchList = {
  title: string,
  matches: [
    game1,
    game2,
    game3,
  ]
}

const match = {
  startDate: Date,
  isComplete: boolean,
  bestOf: int,
  team1: {
    team_id: id,
    overallScore: int,
  },
  team2: {
    team_id: id,
    overallScore: int,
  },
  maps: {
    winner: int,
    vodlink: URL,
  }
}

// consider splitting teams into a separate collection
const team = {
  game: string,
  logo: Image,
  name: {
    abbr: string,
    full: string,
  },
  tournaments: [
    tournament_id,
    tournament_id,
    tournament_id,
  ]
}

const matchIdentifiers = {
  valorant: {
    //checked
    html: 'vlr.gg/{id}',
    wikiText: 'vlr={id}',
  },
  counterstrike: {
    //checked
    html: 'hltv.org/matches/{id}/match',
    wikiText: 'hltv={id}',
  },
  dota2: {
    //checked
    html: 'dotabuff.com/matches/{id}',
    wikiText: 'matchid1={id}',
  },
  rocketleague: {
    //checked
    html: 'shiftrle.gg/matches/{id}',
    wikiText: 'shift={id}',
  },
  leagueoflegends: {
    //checked
    html: 'https://gol.gg/game/stats/{id}/page-game/',
    wikiText: 'gol={id}',
  },
}