import { createTournament } from "./index.js";
import { sampleSources } from "./sampleSources.js"

async function main() {
  createTournament(sampleSources[2])
}

main()