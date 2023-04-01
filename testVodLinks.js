import axios from 'axios';

export async function testVods(tournament) {
  const vods = getVods(tournament);
  const twitchVods = getTwitchVods(vods);
  const youtubeVods = getYoutubeVods(vods);

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
  const workingTwitchVideoIds = await Promise.all(videoIdChunks.map(async function (chunk) {
    return await getTwitchVideoStatus(chunk);
  })).then(res => res.flat());

  // set status of vod objects
  twitchVods.forEach(vod => {
    const working = workingTwitchVideoIds.includes(vod.videoId);
    vod.working = working;
  })
}

export function getTwitchVideoStatus(ids) {
  const headers = {
    Authorization: 'Bearer oqdobv06l9dtuczn0vc65ukw7pw1vl',
    "Client-ID": 'o319w1e5bz60smv2qc2kuffwltv5i0'
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
    // res.data returns an array of video objects with only FOUND videos. if no videos were found, it throws error with data .
    .catch(err => err.response.data)
}

function getTwitchVods(vods) {
  return vods.filter(vod => {
    let vodUrl;
    try {
      vodUrl = new URL(vod.url);
    } catch {
      return false;
    }

    return vodUrl.origin === 'https://www.twitch.tv';
  })
}

function getYoutubeVods(vods) {
  return vods.filter(vod => {
    let vodUrl;
    try {
      vodUrl = new URL(vod.url);
    } catch {
      return false;
    }
    return ['https://www.youtube.com', 'https://youtu.be'].includes(vodUrl.origin);
  })
}

function getVods(tournament) {
  const vods = tournament.matchBuckets.map(bucket => {
    return bucket.matches.map(match => {
      return match.matchData.mapData.map(mapData => mapData.vod);
    })
  }).flat(2)

  return vods;
}

function fetchVodlink(vod) {
  const url = new URL(vod.url);
  if (url.origin === 'https://www.twitch.tv') {
    const videoId = url.pathname.split('/')[2];
    return getTwitchVideoStatus(videoId).then(res => {
      vod.status = res;
    }).catch(async e => {
      if (e.name === 'TypeError') {
        await fetchVodlink(vod);
      } else {
        console.error(e.message);
      }
    })
  }
  return fetch(url).then(res => {
    vod.status = res.status;
  }).catch(async e => {
    if (e.name === 'TypeError') {
      await fetchVodlink(vod);
    } else {
      console.error(e.message);
    }
  })
}

export function checkYoutube(id) {
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

function getToken() {
  return axios.request({
    url: 'https://id.twitch.tv/oauth2/token',
    method: 'post',
    params: {
      client_id: 'o319w1e5bz60smv2qc2kuffwltv5i0',
      client_secret: '1k9k8i0rpybdyc5hhljygp3t5hr31n',
      grant_type: 'client_credentials',
    }
  })
}