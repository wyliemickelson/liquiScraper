import download from 'image-downloader'
import fs from 'fs'
import chalk from 'chalk'

export function downloadImage(url, fileName, pathName) {
  
  const replaceSpecials = (string) => {
    var specials = /[^A-Za-z 0-9]/g;
    return string.replaceAll(specials, '').replaceAll(' ', '-')
  }

  const formattedPath = `exported/images/${replaceSpecials(pathName)}`
  const formattedFileName = `${replaceSpecials(fileName)}.png`
  const newSrc = `${formattedPath}/${formattedFileName}`

  console.log(chalk.cyan('Attempting image download...'))
  console.log(chalk.magenta('URL:'), chalk.yellow(url))
  console.log(chalk.magenta('File:'), chalk.yellow(formattedFileName))

  if (!fs.existsSync(`./${formattedPath}`)) {
    fs.mkdirSync(formattedPath, { recursive: true });
  }

  if (fs.existsSync(`./${newSrc}`)) {
    console.log(chalk.blue('image already saved'))
    return newSrc
  }

  download.image({
    url,
    dest: `./../../${newSrc}`
  }).then(console.log(chalk.green('image downloaded')))
  .catch(e => {
    if (e.message === 'socket hang up') {
      console.log(chalk.yellow('socket hung up, retrying download'))
      downloadImage(url)
    }
  })
  return newSrc
}