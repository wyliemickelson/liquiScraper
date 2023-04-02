import axios from 'axios';
import * as dotenv from 'dotenv'
dotenv.config();

export async function testVods(tournament) {
  const vods = getVods(tournament);
  const { twitchVods, youtubeVods } = filterVods(vods);
  // const twitchVods = getTwitchVods(vods);
  // const youtubeVods = getYoutubeVods(vods);
  const workingTwitchVideoIds = await getWorkingTwitchVideoIds(twitchVods);
  const workingYoutubeVideoIds = await getWorkingYoutubeVideoIds(youtubeVods);

  function setStatus(vods, workingVideoIds) {
    vods.forEach(vod => {
      const working = workingVideoIds.includes(vod.videoId);
      vod.working = working;
    })
  }
  // set status of vod objects
  setStatus(twitchVods, workingTwitchVideoIds);
  setStatus(youtubeVods, workingYoutubeVideoIds);
}

async function getWorkingYoutubeVideoIds(youtubeVods) {
  const youtubeVideoIds = youtubeVods.map(vod => {
    // add id to vod object and return id
    const videoId = new URL(vod.url).pathname.split('/')[1]
    vod.videoId = videoId;
    return videoId;
  });
  const chunkSize = 50;
  let videoIdChunks = [];
  for (let i = 0; i < youtubeVideoIds.length; i += chunkSize) {
    const chunk = youtubeVideoIds.slice(i, i + chunkSize);
    videoIdChunks.push(chunk);
  }

  const workingYoutubeVideoIds = await Promise.all(videoIdChunks.map(async (idChunk) => {
    return await fetchValidYoutubeVideoIds(idChunk);
  })).then(res => res.flat())

  return workingYoutubeVideoIds;
}

async function getWorkingTwitchVideoIds(twitchVods) {
  const twitchVideoIds = twitchVods.map(vod => {
    // add id to vod object and return id
    const videoId = new URL(vod.url).pathname.split('/')[2]
    vod.videoId = videoId;
    return videoId;
  });
  // twitch api calls take 100 video ids max at once
  const chunkSize = 100;
  let videoIdChunks = [];
  for (let i = 0; i < twitchVideoIds.length; i += chunkSize) {
    const chunk = twitchVideoIds.slice(i, i + chunkSize);
    videoIdChunks.push(chunk);
  }
  // call twitch api
  const workingTwitchVideoIds = await Promise.all(videoIdChunks.map(async function (idChunk) {
    return await fetchValidTwitchVideoIds(idChunk);
  })).then(res => res.flat());

  return workingTwitchVideoIds;
}

export function fetchValidYoutubeVideoIds(ids) {
  // max ids per request is 50
  return axios.request({
    method: 'get',
    url: 'https://www.googleapis.com/youtube/v3/videos',
    params: {
      key: process.env.YOUTUBE_API_KEY,
      part: 'id',
      id: ids.join(','),
    }
  }).then(res => res.data.items)
  .then(data => data.map(video => video.id))
  .catch(e => console.error(e.message))
}

async function fetchValidTwitchVideoIds(ids) {
  // https://dev.twitch.tv/docs/api/videos/
  // returns an empty array if no ids found
  const headers = {
    Authorization: `Bearer ${await getTwitchToken()}`,
    "Client-ID": process.env.TWITCH_CLIENT_ID,
  }
  return axios.request({
    headers,
    method: 'get',
    url: 'https://api.twitch.tv/helix/videos',
    params: {
      id: ids,
    },
  }).then(res => res.data.data)
    .then(data => data.map(video => video.id))
    .catch(() => [])
}

function filterVods(vods) {
  let twitchVods = [], youtubeVods = [];
  vods.forEach(vod => {
    let vodUrl;
    try {
      vodUrl = new URL(vod.url);
    } catch {
      return;
    }
    if (['https://www.twitch.tv'].includes(vodUrl.origin)) {
      twitchVods.push(vod);
    }
    else if (['https://www.youtube.com', 'https://youtu.be'].includes(vodUrl.origin)) {
      youtubeVods.push(vod);
    }
  })

  return {
    twitchVods,
    youtubeVods,
  }
}

function getVods(tournament) {
  const vods = tournament.matchBuckets.map(bucket => {
    return bucket.matches.map(match => {
      return match.matchData.mapData.map(mapData => mapData.vod);
    })
  }).flat(2)

  return vods;
}





///////////
function checkYoutube(id) {
  return axios.request({
    url: 'oembed',
    baseURL: 'https://www.youtube.com/',
    params: {
      url: `https://youtu.be/${id}`,
      format: 'json',
    },
  }).then(res => res.status)
    .catch(err => err.response.status)
}

function getTwitchToken() {
  return axios.request({
    url: 'https://id.twitch.tv/oauth2/token',
    method: 'post',
    params: {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }
  }).then(res => res.data.access_token)
  .catch(e => console.error(e))
}

// function getYoutubeToken() {
//   return axios.request({
//     url: 'https://id.twitch.tv/oauth2/token',
//     method: 'post',
//     params: {
//       client_id: 'o319w1e5bz60smv2qc2kuffwltv5i0',
//       client_secret: '1k9k8i0rpybdyc5hhljygp3t5hr31n',
//       grant_type: 'client_credentials',
//     }
//   }).then(res => res.data.access_token)
//   .catch(e => console.error(e))
// }