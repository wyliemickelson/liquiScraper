import Tournament from "./models/tournament.js"
import mongoose from 'mongoose'
import chalk from "chalk"
import { connectMongo } from "./models/tournament.js"

export async function saveTournament(tournament) {
  await connectMongo()
  const newTournament = new Tournament(tournament)
  newTournament.save().then(() => {
    console.log(chalk.bgGreen.bold(' Saved Tournament '))
    console.log(chalk.magenta('Title:'), chalk.yellow(tournament.details.title))
    console.log(chalk.magenta('Game:'), chalk.yellow(tournament.details.gameType))
    mongoose.connection.close()
  })
}

export async function getTournament(tournamentId) {
  await connectMongo()
  return Tournament.find({ "_id": tournamentId }).then((tournaments) => {
    mongoose.connection.close()
    console.log(chalk.bgGreen.bold('Retrieved Tournament'))
    return tournaments[0]
  })
}