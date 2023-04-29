import Tournament from "./models/tournament.js"
import mongoose from 'mongoose'
import chalk from "chalk"
import { connectMongo } from "./models/tournament.js"

export async function saveTournament(tournament) {
  await connectMongo()
  const newTournament = new Tournament(tournament)
  await newTournament.save().then(() => {
    console.log(chalk.bgGreen.bold(' Tournament saved to database '))
    console.log(chalk.magenta('Title:'), chalk.yellow(tournament.details.title))
    console.log(chalk.magenta('Game:'), chalk.yellow(tournament.details.gameType))
    mongoose.connection.close()
  })
}

export async function replaceTournament(updatedTournament) {
  await connectMongo()
  const doc = new Tournament(updatedTournament)
  await Tournament.replaceOne({ _id: updatedTournament._id }, doc).then(() => {
    console.log(chalk.bgGreen.bold(' Tournament updated in database '))
    console.log(chalk.magenta('Title:'), chalk.yellow(updatedTournament.details.title))
    console.log(chalk.magenta('Game:'), chalk.yellow(updatedTournament.details.gameType))
    mongoose.connection.close()
  })
}

export async function getOngoingTournaments() {
  await connectMongo()
  return await Tournament.find({ "details.isCompleted": false }).then((tournaments) => {
    mongoose.connection.close()
    console.log(chalk.bgGreen.bold(' Retrieved ongoing tournaments. '))
    return tournaments
  })
}

export async function getTournament(tournamentId) {
  await connectMongo()
  return await Tournament.find({ "_id": tournamentId }).then((tournaments) => {
    mongoose.connection.close()
    console.log(chalk.bgGreen.bold(' Retrieved Tournament '))
    return tournaments[0]
  })
}