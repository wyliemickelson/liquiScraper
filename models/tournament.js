import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
dotenv.config()
mongoose.set('strictQuery', false)

const url = process.env.MONGODB_URI

mongoose.connect(url)
  .then(result => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connecting to MongoDB:', error.message)
  })

const tournamentSchema = new mongoose.Schema({
  _id: String,
  details: {
    sources: {
      main: String,
      matchSources: [{
        _id: false,
        url: String,
        matchListBestOf: Number,
      }]
    },
    title: String,
    mainImgSrc: String,
    gameType: String,
    dateStart: Date,
    dateEnd: Date,
    isCompleted: Boolean,
    participants: [{
      _id: String,
      name: String,
      logoSrc: String,
    }]
  },
  matchBuckets: [{
    _id: String,
    bucketType: String,
    title: String,
    isCompleted: Boolean,
    matches: [{
      _id: String,
      bracketRound: String,
      matchId: Number,
      dateStart: Date,
      isCompleted: Boolean,
      revealed: Boolean,
      matchData: {
        type: Object,
        bestOf: Number,
        team1: {
          _id: String,
          score: String,
        },
        team2: {
          _id: String,
          score: String,
        },
        mapData: [{
          _id: String,
          winner: String,
          mapName: String,
          vod: {
            url: String,
            videoId: String,
            working: Boolean,
          }
        }]
      },
    }]
  }]
})

export default mongoose.model('Tournament', tournamentSchema)