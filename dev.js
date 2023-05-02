const { createTournament } = require('./index.js')
const { sampleSources } = require('./sampleSources.js')

async function main() {
  createTournament(sampleSources[0])
}

main()