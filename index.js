import { parseHtml } from "./parsing.js";
import { getPageHtmlFromUrl } from "./scraping.js"

function main() {
  const dataUrl = 'https://liquipedia.net/dota2/Dota_Pro_Circuit/2023/2/Western_Europe/Division_I';
  getPageHtmlFromUrl(dataUrl)
  .then(htmlStr => {
    parseHtml(htmlStr, dataUrl);
  })
  .catch(e => {
    if (e instanceof PageDataGetError) {
      console.error(e.message);
    } else {
      console.trace(e);
    }
  });
}

main();