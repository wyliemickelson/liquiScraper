import { assert, expect } from "chai";
import {
  getGame,
  getApiUrlFromLiquipediaUrl,
  getPageHtmlFromUrl,
  getPageIdFromUrl,
} from "../page-data.js";

const games = ["rocketleague", "valorant"];

const expectThrowsAsync = async (method, errorMessage) => {
  let error = null
  try {
    await method()
  }
  catch (err) {
    error = err
  }
  expect(error).to.be.an('Error')
  if (errorMessage) {
    expect(error.message).to.equal(errorMessage)
  }
}

const validTestData = [
  {
    url: "https://liquipedia.net/rocketleague/Rocket_League_Championship_Series/2022-23/Winter",
    game: "rocketleague",
    pageId: 129693,
  },
  {
    url: "https://liquipedia.net/valorant/VCL/2023/North_America/Mid-Season_Face_Off",
    game: "valorant",
    pageId: 41178,
  },
];

const inValidTestData = [
  {
    url: "https://liquipedia.net/rocketleague/Rocket_League_Championship_Series/2022-23/asdfasdf",
    game: "rocketleague",
    pageId: -1,
  },
  {
    url: "https://liquipedia.net/valorant/VCL/2023/North_America/asdfasdfasdf",
    game: "valorant",
    pageId: -1,
  },
]

describe("App", () => {
  describe("getGame()", () => {
    validTestData.forEach((data) => {
      it("should return the name of the game given the liquipedia url", () => {
        assert.equal(getGame(data.url), data.game);
      });
    });
  });
  describe("getPageIdFromUrl()", () => {
    validTestData.forEach((data) => {
      it('should return the correct mediawiki pageId of the selected URL', async () => {
        const pageId = await getPageIdFromUrl(data.game, data.url);
        assert.equal(pageId, data.pageId);
      })
    });
    inValidTestData.forEach((data) => {
      it('should throw an error if page is empty', async () => {
        await expectThrowsAsync(() => getPageIdFromUrl(data.game, data.url), 'There is currently no content for this page.');
      })
    })
  });
});
