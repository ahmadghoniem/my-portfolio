import type { APIRoute } from "astro"

const NOW_PLAYING_ENDPOINT = `https://api.spotify.com/v1/me/player/currently-playing`
const RECENTLY_PLAYED_ENDPOINT = `https://api.spotify.com/v1/me/player/recently-played?limit=1`
const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`

const formatArtists = (artists: any[]) => {
  if (artists.length === 0) return ""
  if (artists.length === 1) return artists[0].name
  if (artists.length === 2) return `${artists[0].name} & ${artists[1].name}`
  return `${artists[0].name}, ${artists[1].name} & more`
}

const getAlbumArtUrl = (images: any[]): string => {
  return (images[1] ?? images[0])?.url ?? ""
}

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store"
    }
  })

export const GET: APIRoute = async () => {
  try {
    // Get credentials from import.meta.env (works in both wrangler dev and production)
    const clientId = import.meta.env.SPOTIFY_CLIENT_ID
    const clientSecret = import.meta.env.SPOTIFY_CLIENT_SECRET
    const refreshToken = import.meta.env.SPOTIFY_REFRESH_TOKEN

    if (!clientId || !clientSecret || !refreshToken) {
      console.error("Missing credentials")
      return jsonResponse({ error: true, reason: "missing_credentials" })
    }

    // Get access token
    const basic = btoa(`${clientId}:${clientSecret}`)
    const tokenResponse = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("Token fetch failed:", tokenResponse.status, errorText)
      return jsonResponse({ error: true, reason: "token_failed" })
    }

    const tokenData = await tokenResponse.json() as { access_token?: string }
    
    if (!tokenData.access_token) {
      return jsonResponse({ error: true, reason: "no_access_token" })
    }

    const accessToken = tokenData.access_token

    // 1. Fetch Currently Playing
    const nowPlayingRes = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (nowPlayingRes.status === 200) {
      const song = await nowPlayingRes.json() as any

      if (song?.item && song.is_playing) {
        return jsonResponse({
          isPlaying: true,
          trackName: song.item.name,
          artistName: formatArtists(song.item.artists),
          albumName: song.item.album.name,
          albumArtUrl: getAlbumArtUrl(song.item.album.images),
          trackUrl: song.item.external_urls.spotify
        })
      }
    }

    // 2. Fallback to Recently Played
    const recentlyPlayedRes = await fetch(RECENTLY_PLAYED_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (recentlyPlayedRes.status === 200) {
      const data = await recentlyPlayedRes.json() as any
      const song = data.items[0]

      if (song) {
        return jsonResponse({
          isPlaying: false,
          trackName: song.track.name,
          artistName: formatArtists(song.track.artists),
          albumName: song.track.album.name,
          albumArtUrl: getAlbumArtUrl(song.track.album.images),
          trackUrl: song.track.external_urls.spotify
        })
      }
    }

    return jsonResponse({ error: true, reason: "no_track_found" })
  } catch (e) {
    console.error("Exception:", e)
    return jsonResponse({ error: true, reason: "exception" })
  }
}
