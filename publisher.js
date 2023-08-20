const { createTournament, updateOngoingTournaments } = require('./index.js')

// EDIT THIS TO ADD NEW TOURNAMENTS
const newTournamentSources = {
  main: 'https://liquipedia.net/valorant/VCT/2023/Champions',
  matchSources: [
    {
      url: 'https://liquipedia.net/valorant/VCT/2023/Champions',
    },
  ]
}

const publishNewTournament = () => {
  createTournament(newTournamentSources)
}

// use npm run add
publishNewTournament()