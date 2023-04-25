import Tournament from "./models/tournament.js"
import mongoose from 'mongoose'

export async function saveTournament(tournament) {
  const newTournament = new Tournament(tournament)
  newTournament.save().then(() => {
    console.log(`Saved ${tournament.details.gameType} ${tournament.details.title}`)
    mongoose.connection.close()
  })
}