const tournamentInfo = {
  sources: {
    main: '',
    matchSources: [
      'url1',
      'url2',
    ]
  },
  title: string,
  gameType: string,
  startDate: Date,
  endDate: Date,
  isCompleted: boolean,
  participants: [
    {
      name: 'participant1',
      logoSrc: '',
    }
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
    html: 'vlr.gg/{id}',
    wikiText: 'vlr={id}',
  },
  counterstrike: {
    html: 'hltv.org/matches/{id}/match',
    wikiText: 'hltv={id}',
  },
  dota2: {
    html: 'dotabuff.com/matches/{id}',
    wikiText: 'matchid1={id}',
  },
  rocketleague: {
    html: 'shiftrle.gg/matches/{id}',
    wikiText: 'shift={id}',
  },
  leagueoflegends: {
    html: 'https://gol.gg/game/stats/{id}/page-game/',
    wikiText: 'gol={id}',
  },
}