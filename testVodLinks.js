import axios from 'axios';

export async function getVodLinks(tournament) {
  const mapData = tournament.matchBuckets.map(bucket => {
    return bucket.matches.map(match => match.matchData.mapData)
  }).flat(2)

  await Promise.all(mapData.map(async function(map) {
    return await fetchVodlink(map);
  }))
  return;
}

function fetchVodlink(map) {
  const url = new URL(map.vodlink);
  if (url.origin === 'https://www.twitch.tv') {
    const videoId = url.pathname.split('/')[2];
    return getTwitchVideoStatus(videoId).then(res => {
      map.status = res;
    }).catch(async e => {
      if (e.name === 'TypeError') {
        await fetchVodlink(map);
      } else {
        console.error(e.message);
      }
    })
  }
  return fetch(url).then(res => {
    map.status = res.status;
  }).catch(async e => {
    if (e.name === 'TypeError') {
      await fetchVodlink(map);
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

export function getTwitchVideoStatus(id) {
  const headers = {
    Authorization: 'Bearer oqdobv06l9dtuczn0vc65ukw7pw1vl',
    "Client-ID": 'o319w1e5bz60smv2qc2kuffwltv5i0'
  }
  return axios.request({
    headers,
    method: 'get',
    url: 'https://api.twitch.tv/helix/videos',
    params: {
      id: [id, id],
    },
  }).then(res => res.data)
  // res.data returns an array of video objects with only FOUND videos. if no videos were found, it throws error with data .
    .catch(err => err.response.data)
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