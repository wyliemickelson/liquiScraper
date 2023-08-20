const { createTournament, updateOngoingTournaments } = require('./index.js')
const { sampleSources } = require('./sampleSources.js')

async function main() {
  createTournament(sampleSources[0])
  // updateOngoingTournaments()
}

main()