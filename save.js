const { tournamentSchema } = require('./models/tournament.js')
const mongoose = require('mongoose')
const chalk = require('chalk')
const { connectMongo } = require('./models/tournament.js')

const TournamentScreening = mongoose.model('Tournament', tournamentSchema, 'tournaments-screening')
const TournamentProd = mongoose.model('Tournament', tournamentSchema, 'tournaments-production')

async function saveTournament(tournament) {
  await connectMongo()
  const newTournament = new TournamentScreening(tournament)
  await newTournament.save().then(() => {
    console.log(chalk.bgGreen.bold(' Tournament saved to database '))
    console.log(chalk.magenta('Title:'), chalk.yellow(tournament.details.title))
    console.log(chalk.magenta('Game:'), chalk.yellow(tournament.details.gameType))
    mongoose.connection.close()
  })
}

async function replaceTournament(updatedTournament) {
  const doc = new TournamentProd(updatedTournament)
  await TournamentProd.replaceOne({ _id: updatedTournament._id }, doc).then(() => {
    console.log(chalk.bgGreen.bold(' Tournament updated in database '))
    console.log(chalk.magenta('Title:'), chalk.yellow(updatedTournament.details.title))
    console.log(chalk.magenta('Game:'), chalk.yellow(updatedTournament.details.gameType))
  })
}

async function getOngoingTournaments() {
  return await TournamentProd.find({ "details.isCompleted": false }).then((tournaments) => {
    console.log(chalk.bgGreen.bold(' Retrieved ongoing tournaments. '))
    return tournaments
  })
}

async function getTournament(tournamentId) {
  return await TournamentProd.find({ "_id": tournamentId }).then((tournaments) => {
    console.log(chalk.bgGreen.bold(' Retrieved Tournament '))
    return tournaments[0]
  })
}

module.exports = {
  saveTournament,
  replaceTournament,
  getOngoingTournaments,
  getTournament,
}