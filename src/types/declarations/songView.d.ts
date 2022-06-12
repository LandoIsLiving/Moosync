/*
 *  songView.d.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

interface SongDetailDefaults {
  defaultTitle?: string
  defaultSubtitle?: string
  defaultCover?: string
  defaultSubSubtitle?: string
}

interface SongDetailButtons {
  enableContainer: boolean
  enableLibraryStore: boolean
}

interface ProviderHeaderOptions {
  title: string
  key: string
}

type TableFields = 'index' | 'title' | 'album_name' | 'artist_name'
