import download from 'image-downloader'
import fs from 'fs'

export function downloadImage(url) {
  const imageUrl = new URL(url)

  let dir = `./${imageUrl.pathname.replaceAll('.', '-')}`
  dir = dir.split('/')

  let fileName = dir.pop()
  const index = fileName.lastIndexOf('-')
  fileName = fileName.substring(0, index) + '.' + fileName.substring(index + 1)

  dir = dir.join('/')
  let savedPath = dir.split('/').slice(2).join('/')

  savedPath = savedPath.split('/')
  savedPath[0] = 'exported'
  savedPath = savedPath.join('/')

  const newSrc = `${savedPath}/${fileName}`

  if (!fs.existsSync(savedPath)) {
    fs.mkdirSync(savedPath, { recursive: true });
  }

  console.log(newSrc)
  if (fs.existsSync(`./${newSrc}`)) {
    console.log('image already saved')
    return newSrc
  }

  download.image({
    url,
    dest: `./../../${newSrc}`
  }).then(console.log('downloaded image'))
  .catch(e => {
    if (e.message === 'socket hang up') {
      console.log('retrying download')
      downloadImage(url)
    }
  })
  return newSrc
}