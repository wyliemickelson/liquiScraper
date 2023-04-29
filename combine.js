import chalk from "chalk"
// PROPERTIES THAT SHOULD NOT OVERWRITE ON UPDATE
// - any tournament details
// - any ids
// - bucket titles
// - vod objects (only overwrites if vod is not working or null)
// - match revealed
// - match bestOf

const combineTournaments = (oldTournament, newTournament) => {
  console.log(chalk.cyan('Combining details from old and generated tournament...'))
  const combined = {}
  // keep same details and id

  // for testing, use new id
  combined._id = oldTournament._id
  // for testing, use new id

  combined.details = oldTournament.details
  combined.details.isCompleted = checkTournamentCompleted(newTournament)
  // go through generated matchbuckets
  let oldBucketIndex = 0
  combined.matchBuckets = newTournament.matchBuckets.map((newBucket) => {
    const oldBucket = oldTournament.matchBuckets[oldBucketIndex]
    if (oldBucket?.title === newBucket.title) {
      // buckets match, map the new matches and increment oldBucketIndex
      oldBucketIndex++
      return {
        _id: oldBucket._id,
        bucketType: oldBucket.bucketType,
        title: oldBucket.title,
        isCompleted: newBucket.isCompleted,
        matches: combineMatches(oldBucket.matches, newBucket.matches)
      }
    } else {
      // buckets do not match or the bucket is brand new, return whole bucket and keep same oldBucketIndex
      return newBucket
    }
  })

  console.log(chalk.blue('Successfully combined tournament.'))
  return combined
}

const combineMatches = (oldMatches, newMatches) => {
  const oldMatchesCopy = [...oldMatches]
  return newMatches.map((newMatch, i) => {
    if (i < oldMatches.length) {
      // new match is an updated one
      const oldMatch = oldMatchesCopy.shift()
      return {
        _id: oldMatch._id,
        dateStart: newMatch.dateStart,
        isCompleted: newMatch.isCompleted,
        revealed: oldMatch.revealed,
        matchData: combineMatchData(oldMatch.matchData, newMatch.matchData),
      }
    } else {
      // new match is completely new
      return newMatch
    }
  })
}

const combineMatchData = (oldMatchData, newMatchData) => {
  // if old match has no data, return new match data
  if (!oldMatchData) return newMatchData
  // else, data exists in both
  return {
    ...newMatchData,
    bestOf: oldMatchData.bestOf,
    mapData: combineMapData(oldMatchData.mapData, newMatchData.mapData),
  }
}

const combineMapData = (oldMapData, newMapData) => {
  return newMapData.map((newMap, i) => {
    const oldMap = oldMapData[i]
    // only use new vod if the old one is not working or doesnt exist
    let returnedVod = (oldMap.vod && oldMap.vod.working) ? oldMap.vod : newMap.vod
    return {
      ...newMapData,
      _id: oldMap._id,
      vod: returnedVod,
    }
  })
}

const checkTournamentCompleted = (newTournament) => {
  const dateEnd = new Date(newTournament.details.dateEnd)
  const dayAfterDateEnd = new Date(dateEnd.getTime() + 60 * 60 * 24 * 1000)
  const now = new Date()
  return now.getTime() > dayAfterDateEnd.getTime()
}

export default combineTournaments