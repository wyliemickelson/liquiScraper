import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
dotenv.config()
import chalk from 'chalk'
mongoose.set('strictQuery', false)

const url = process.env.MONGODB_URI

export const connectMongo = async () => {
  await mongoose.connect(url)
  .then(result => {
    console.log(chalk.bgBlueBright.bold(' Connected to MongoDB '))
  })
  .catch((error) => {
    console.log('error connecting to MongoDB:', error.message)
  })
}

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
    logoSrc: String,
    gameType: String,
    dateStart: Date,
    dateEnd: Date,
    isCompleted: Boolean,
    participants: [{
      _id: String,
      name: String,
      shortName: String,
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
      matchId: Number,
      dateStart: Date,
      isCompleted: Boolean,
      revealed: Boolean,
      matchData: {
        type: Object,
        bestOf: Number,
        team1: {
          _id: String,
          name: String,
          score: String,
        },
        team2: {
          _id: String,
          name: String,
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

export default tournamentSchema