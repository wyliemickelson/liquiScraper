import Tournament from "./models/tournament.js"
import mongoose from 'mongoose'
import chalk from "chalk"

export async function saveTournament(tournament) {
  const newTournament = new Tournament(tournament)
  newTournament.save().then(() => {
    console.log(chalk.bgGreen.bold(' Saved Tournament '))
    console.log(chalk.magenta('Title:'), chalk.yellow(tournament.details.title))
    console.log(chalk.magenta('Game:'), chalk.yellow(tournament.details.gameType))
    mongoose.connection.close()
  })
}