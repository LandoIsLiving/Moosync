/*
 *  songs.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { IpcEvents, SongEvents } from './constants'

import { SongDB } from '../db'
import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export class SongsChannel implements IpcChannelInterface {
  name = IpcEvents.SONG
  handle(event: Electron.IpcMainEvent, request: IpcRequest): void {
    switch (request.type) {
      case SongEvents.STORE_SONG:
        this.storeSongs(event, request as IpcRequest<SongRequests.Songs>)
        break
      case SongEvents.REMOVE_SONG:
        this.removeSongs(event, request as IpcRequest<SongRequests.Songs>)
        break
      case SongEvents.SAVE_AUDIO_TO_FILE:
        this.saveBufferToFile(event, request as IpcRequest<SongRequests.SaveBuffer>, 'audio')
        break
      case SongEvents.SAVE_IMAGE_TO_FILE:
        this.saveBufferToFile(event, request as IpcRequest<SongRequests.SaveBuffer>, 'image')
        break
      case SongEvents.AUDIO_EXISTS:
        this.fileExists(event, request as IpcRequest<SongRequests.FileExists>, 'audio')
        break
      case SongEvents.IMAGE_EXISTS:
        this.fileExists(event, request as IpcRequest<SongRequests.FileExists>, 'image')
        break
    }
  }

  private removeSongs(event: Electron.IpcMainEvent, request: IpcRequest<SongRequests.Songs>) {
    const promises: Promise<void>[] = []
    if (request.params.songs) {
      const songs = request.params.songs as Song[]
      for (const s of songs) {
        promises.push(SongDB.removeSong(s._id))
      }
    }
    Promise.all(promises)
      .then((data) => {
        event.reply(request.responseChannel, data)
      })
      .catch((e) => {
        console.error(e)
        event.reply(request.responseChannel)
      })
  }

  private storeSongs(event: Electron.IpcMainEvent, request: IpcRequest<SongRequests.Songs>) {
    const promises: Promise<void>[] = []
    if (request.params.songs) {
      const songs = request.params.songs as Song[]
      for (const s of songs) {
        promises.push(SongDB.store(s))
      }
    }
    Promise.all(promises)
      .then((data) => {
        event.reply(request.responseChannel, data)
      })
      .catch((e) => {
        console.error(e)
        event.reply(request.responseChannel)
      })
  }

  private isCacheFileExists(filename: string, cacheDir: string): string {
    const cachePath = path.join(app.getPath('cache'), app.getName(), cacheDir)
    const filepath = path.join(cachePath, filename)

    if (fs.existsSync(cachePath)) {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath)
      }
    } else {
      fs.mkdirSync(cachePath, { recursive: true })
    }

    return filepath
  }

  private saveBufferToFile(
    event: Electron.IpcMainEvent,
    request: IpcRequest<SongRequests.SaveBuffer>,
    type: 'audio' | 'image'
  ) {
    if (request.params.path && request.params.blob) {
      const filename = request.params.path
      const filePath = this.isCacheFileExists(filename, type === 'audio' ? 'audioCache' : 'imageCache')

      fs.writeFile(filePath, request.params.blob, () => {
        event.reply(request.responseChannel, filePath)
      })
      return
    }
    event.reply(request.responseChannel)
  }

  private fileExists(
    event: Electron.IpcMainEvent,
    request: IpcRequest<SongRequests.FileExists>,
    type: 'audio' | 'image'
  ) {
    if (request.params.path) {
      const filePath = path.join(
        app.getPath('cache'),
        app.getName(),
        type === 'audio' ? 'audioCache' : 'imageCache',
        request.params.path
      )
      event.reply(request.responseChannel, fs.existsSync(filePath) ? filePath : undefined)
    }
    event.reply(request.responseChannel)
  }
}
