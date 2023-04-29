import axios from 'axios';
import chalk from 'chalk';
import * as dotenv from 'dotenv'
dotenv.config();

export async function testVods(tournament) {
  const vods = getVods(tournament);
  const { twitchVods, youtubeVods } = filterVods(vods);

  const workingTwitchIds = await getWorkingIds(twitchVods, 'twitch');
  const workingYoutubeIds = await getWorkingIds(youtubeVods, 'youtube');

  setStatus(twitchVods, workingTwitchIds);
  setStatus(youtubeVods, workingYoutubeIds);
}

function generateChunks(ids, chunkSize) {
  let videoIdChunks = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    videoIdChunks.push(chunk);
  }
  return videoIdChunks;
}

async function getWorkingIds(vods, site) {
  const siteSettings = {
    youtube: {
      maxIdsPerReq: 50,
      fetchValidIds: fetchValidYoutubeIds,
    },
    twitch: {
      maxIdsPerReq: 100,
      fetchValidIds: fetchValidTwitchIds,
    },
  }
  const videoIds = vods.map(vod => vod.videoId);
  const chunkSize = siteSettings[site].maxIdsPerReq;
  const videoIdChunks = generateChunks(videoIds, chunkSize);
  const workingIds = await Promise.all(videoIdChunks.map(async (idChunk) => {
    return await siteSettings[site].fetchValidIds(idChunk);
  })).then(chunks => chunks.flat())

  return workingIds;
}

function fetchValidYoutubeIds(ids) {
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
    .catch(e => {
      if (e.message === 'socket hang up') {
        console.log('retrying youtube vod validation')
        fetchValidYoutubeIds(ids)
      } else {
        console.error(e)
      }
    })
}

async function fetchValidTwitchIds(ids) {
  const headers = {
    Authorization: `Bearer ${await generateTwitchToken()}`,
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
    .catch((e) => {
      if (e.message === 'socket hang up') {
        console.log('retrying twitch vod validation')
        fetchValidTwitchIds(ids)
      } else {
        return []
      }
    })
}

function getVods(tournament) {
  // gets vods of completed matches only where the vod object exists (does not get vods of skipped maps)
  const vods = tournament.matchBuckets.map(bucket => {
    return bucket.matches.filter(match => match.isCompleted).map(match => {
      return match.matchData.mapData.filter(mapData => mapData.vod)
        .map(mapData => {
          let vod = mapData.vod
          vod.matchId = match._id
          return vod
        });
    })
  }).flat(2)

  return vods;
}

function filterVods(vods) {
  let twitchVods = [], youtubeVods = [];
  vods.forEach(vod => {
    let vodUrl;
    try {
      vodUrl = new URL(vod.url);
    } catch {
      vod.videoId = null;
      vod.working = false;
      console.log(chalk.red('Unavailable VOD at', chalk.magenta('matchId:'), chalk.yellow(vod.matchId)))
      return;
    }

    if (vodUrl.origin === 'https://www.twitch.tv') {
      const videoId = vodUrl.pathname.split('/')[2];
      vod.videoId = videoId;
      twitchVods.push(vod);
    }
    else if (vodUrl.origin === 'https://youtu.be') {
      const videoId = vodUrl.pathname.split('/')[1];
      vod.videoId = videoId;
      youtubeVods.push(vod);
    } else if (vodUrl.origin === 'https://www.youtube.com') {
      const videoId = vodUrl.searchParams.get('v');
      vod.videoId = videoId;
      youtubeVods.push(vod);
    }
  })

  return {
    twitchVods,
    youtubeVods,
  }
}

function setStatus(vods, workingIds) {
  vods.forEach(vod => {
    const working = workingIds.includes(vod.videoId);
    if (!working) console.log(chalk.red('Unavailable VOD at', chalk.magenta('matchId:'), chalk.yellow(vod.matchId)))
    vod.working = working;
  })
}

function generateTwitchToken() {
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