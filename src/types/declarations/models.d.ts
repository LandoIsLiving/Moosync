/* 
 *  models.d.ts is a part of Moosync.
 *  
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

interface SearchResult {
  songs?: Song[]
  albums?: Album[]
  artists?: artists[]
  genres?: Genre[]
  playlists?: Playlist[]
  youtube?: import('node-youtube-music').MusicVideo[]
}

interface marshaledSong {
  _id: string
  path?: string
  size?: number
  title: string
  song_coverPath_low?: string
  song_coverPath_high?: string
  album_id?: string
  album_name?: string
  album_coverPath_high?: string
  album_coverPath_low?: string
  album_song_count?: number
  lyrics?: string
  artist_name?: string
  artists_id?: string
  artist_coverPath?: string
  genre_name?: string
  genere_id?: string
  date?: string
  year?: number
  bitrate?: number
  codec?: string
  container?: string
  duration: number
  sampleRate?: number
  hash?: string
  inode?: string
  deviceno?: string
  url?: string
  playbackUrl?: string
  date_added: number
  type: 'LOCAL' | 'YOUTUBE' | 'SPOTIFY'
}

interface stats {
  path: string
  size: number
  inode: string
  deviceno: string
  hash?: string
}

interface image {
  path: string
  data: Buffer
}

interface ThemeDetails {
  id: string
  name: string
  author: string
  theme: ThemeItem
}

type ThemeKey = 'primary' | 'secondary' | 'tertiary' | 'textPrimary' | 'textSecondary' | 'textInverse' | 'accent' | 'divider'

type ThemeItem = { [key in ThemeKey]: string }


