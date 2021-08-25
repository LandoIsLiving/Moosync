import { Component } from 'vue-property-decorator';
import { EventBus } from '@/utils/main/ipc/constants';
import { MenuItem } from 'vue-context-menu-popup';
import PlayerControls from '@/utils/ui/mixins/PlayerControls';
import RemoteSong from '@/utils/ui/mixins/remoteSongMixin';
import { bus } from '@/mainWindow/main';
import { mixins } from 'vue-class-component';
import { toSong } from '@/utils/models/youtube';
import { vxm } from '@/mainWindow/store';

@Component
export default class ContextMenuMixin extends mixins(PlayerControls, RemoteSong) {
  get playlists() {
    return vxm.playlist.playlists
  }

  private async addToPlaylist(playlist_id: string, songs: Song[]) {
    await window.DBUtils.storeSongs(songs.filter((val) => val.type !== 'LOCAL'))
    await window.DBUtils.addToPlaylist(playlist_id, ...songs)
  }

  private populatePlaylistMenu(item: Song[], exclude?: string): MenuItem[] {
    const menu: MenuItem[] = [
      {
        label: 'Create Playlist',
        handler: () => {
          bus.$emit(EventBus.SHOW_NEW_PLAYLIST_MODAL, item)
        }
      },
    ]
    for (const [key, val] of Object.entries(this.playlists)) {
      if (key == exclude) {
        continue
      }
      menu.push({
        label: val,
        handler: () => {
          this.addToPlaylist(key, item)
        },
      })
    }
    return menu
  }

  private getGeneralSongsContextMenu(refreshCallback: () => void) {
    const items = [
      {
        label: 'Add from URL',
        handler: () => bus.$emit(EventBus.SHOW_SONG_FROM_URL_MODAL, refreshCallback)
      }
    ]
    return items
  }

  private getSongContextMenu(exclude: string | undefined, refreshCallback: () => void, isRemote: boolean, ...item: Song[]) {
    const items = [
      {
        label: 'Play Now',
        handler: () => {
          this.playTop(item)
        },
      },
      {
        label: 'Add To Queue',
        handler: () => {
          this.queueSong(item)
        },
      },
      {
        label: 'Add To Playlist',
        children: this.populatePlaylistMenu(item, exclude),
      },
    ]

    if (!isRemote) {
      items.push(...[{
        label: 'Remove from Library',
        handler: async () => {
          try {
            await window.DBUtils.removeSongs(item)
          } catch (e) { console.error(e) }
          refreshCallback()
        }
      }, {
        label: 'Add from URL',
        handler: () => bus.$emit(EventBus.SHOW_SONG_FROM_URL_MODAL, refreshCallback)
      }])
    }
    return items
  }

  private getYoutubeContextMenu(...item: YoutubeItem[]) {
    const items = [
      {
        label: 'Play Now',
        handler: () => {
          this.playTop(toSong(...item))
        },
      },
      {
        label: 'Add To Queue',
        handler: () => {
          this.queueSong(toSong(...item))
        },
      },
      {
        label: 'Add To Library',
        handler: () => this.addYTItemsToLibrary(...item),
      },
      {
        label: 'Add To Playlist',
        children: this.populatePlaylistMenu(toSong(...item)),
      },
    ]
    return items
  }

  private getPlaylistContextMenu(playlist: Playlist, callback: () => void) {
    const items = []
    if (!playlist.isRemote) {
      items.push({
        label: 'Remove Playlist',
        handler: () => {
          callback()
        },
      })
    }
    return items
  }

  private getPlaylistContentContextMenu(isRemote: boolean, refreshCallback: () => void, ...item: Song[]) {
    const items = this.getSongContextMenu(undefined, refreshCallback, isRemote, ...item)
    if (isRemote) {
      items.push({
        label: 'Add Song to Library',
        handler: () => this.addSongsToLibrary(...item),
      })
    }
    return items
  }

  private getGeneralPlaylistMenu(refreshCallback: () => void) {
    const items = [
      {
        label: 'Add Playlist from URL',
        handler: () => {
          bus.$emit(EventBus.SHOW_PLAYLIST_FROM_URL_MODAL, refreshCallback)
        },
      }
    ]
    return items
  }

  private getQueueItemMenu(isRemote: boolean, refreshCallback: () => void, item: Song) {
    const items = [
      {
        label: 'Play Now',
        handler: () => {
          this.playTop([item])
        },
      },
      {
        label: 'Add To Playlist',
        children: this.populatePlaylistMenu([item], undefined),
      },
    ]
    if (isRemote) {
      items.push({
        label: 'Add Song to Library',
        handler: () => this.addSongsToLibrary(item),
      })
    } else {
      items.push({
        label: 'Remove from Library',
        handler: async () => {
          try {
            await window.DBUtils.removeSongs([item])
          } catch (e) { console.error(e) }
          refreshCallback()
        }
      })
    }
    return items
  }

  public getContextMenu(event: Event, options: ContextMenuArgs) {
    let items: { label: string, handler?: () => void }[] = []
    switch (options.type) {
      case 'SONGS':
        items = this.getSongContextMenu(options.args.exclude, options.args.refreshCallback, false, ...options.args.songs)
        break
      case 'GENERAL_SONGS':
        items = this.getGeneralSongsContextMenu(options.args.refreshCallback)
        break
      case 'YOUTUBE':
        items = this.getYoutubeContextMenu(...options.args.ytItems)
        break
      case 'PLAYLIST':
        items = this.getPlaylistContextMenu(options.args.playlist, options.args.deleteCallback)
        break
      case 'GENERAL_PLAYLIST':
        items = this.getGeneralPlaylistMenu(options.args.refreshCallback)
        break
      case 'PLAYLIST_CONTENT':
        items = this.getPlaylistContentContextMenu(options.args.isRemote, options.args.refreshCallback, ...options.args.songs)
        break
      case 'QUEUE_ITEM':
        items = this.getQueueItemMenu(options.args.isRemote, options.args.refreshCallback, options.args.song)
        break
    }
    this.emitMenu(event, items)
  }

  private emitMenu(event: Event, items: { label: string, handler?: () => void }[]) {
    bus.$emit(EventBus.SHOW_CONTEXT, event, items)
  }
}
