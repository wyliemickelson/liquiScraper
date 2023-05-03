const download = require('image-downloader')
const fs = require('fs')
const chalk = require('chalk')
const Jimp = require('jimp')

function downloadImage(url, fileName, pathName) {
  
  const replaceSpecials = (string) => {
    var specials = /[^A-Za-z 0-9]/g;
    return string.replaceAll(specials, '').replaceAll(' ', '-')
  }

  const formattedPath = `exported/images/${replaceSpecials(pathName)}`
  const formattedFileName = `${replaceSpecials(fileName)}.png`
  const src = `${formattedPath}/${formattedFileName}`

  console.log(chalk.cyan('Attempting image download...'))
  console.log(chalk.magenta('URL:'), chalk.yellow(url))
  console.log(chalk.magenta('File:'), chalk.yellow(formattedFileName))

  if (!fs.existsSync(`./${formattedPath}`)) {
    fs.mkdirSync(formattedPath, { recursive: true });
  }

  if (fs.existsSync(`./${src}`)) {
    console.log(chalk.blue('image already saved'))
    return src
  }

  download.image({
    url,
    dest: `./../../${src}`
  }).then(console.log(chalk.green('image downloaded')))
  .then(() => {
    Jimp.read(`./${src}`)
      .then(img => {
        const maxSize = fileName === 'eventLogo' ? 120 : 100
        return img
          .scaleToFit(maxSize, maxSize)
          .write(`./${src}`)
      })
  })
  .catch(e => {
    if (e.message === 'socket hang up') {
      console.log(chalk.yellow('socket hung up, retrying download'))
      downloadImage(url)
    }
  })

  return src
}

module.exports = {
  downloadImage,
}