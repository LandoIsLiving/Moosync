/*
 *  RouterPushes.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { Component, Vue } from 'vue-property-decorator'

@Component
export default class PlayerControls extends Vue {
  public gotoAlbum(album: Album) {
    try {
      this.$router.push({
        name: 'albums-id',
        params: {
          id: album.album_id as string
        }
      })
    } catch (e) {
      console.debug(e)
    }
  }

  public gotoGenre(genre: Genre) {
    try {
      this.$router.push({
        name: 'genre-id',
        params: {
          id: genre.genre_id
        }
      })
    } catch (e) {
      console.debug(e)
    }
  }

  public gotoArtist(artist: Artists) {
    try {
      this.$router.push({
        name: 'artists-id',
        params: {
          id: artist.artist_id,
          name: artist.artist_name ?? '',
          cover: artist.artist_coverPath ?? ''
        }
      })
    } catch (e) {
      console.debug(e)
    }
  }

  public gotoPlaylist(playlist: ExtendedPlaylist) {
    try {
      this.$router.push({
        name: 'playlists-id',
        params: {
          id: playlist.playlist_id,
          playlist_id: playlist.playlist_id,
          playlist_name: playlist.playlist_name,
          playlist_coverPath: playlist.playlist_coverPath ?? '',
          playlist_song_count: (playlist.playlist_song_count ?? 0).toString(),
          playlist_path: playlist.playlist_path ?? '',
          extension: playlist.extension ?? ''
        }
      })
    } catch (e) {
      console.debug(e)
    }
  }
}
