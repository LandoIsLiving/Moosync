/*
 *  index.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { IpcRenderer } from 'electron'
import { v4 } from 'uuid'

export class IpcRendererHolder {
  ipcRenderer: IpcRenderer

  constructor(renderer: IpcRenderer) {
    this.ipcRenderer = renderer
  }

  public send<T>(channel: string, request: IpcRequest<T>): Promise<unknown> {
    if (!request.responseChannel) {
      request.responseChannel = v4()
    }
    this.ipcRenderer.send(channel, request)

    return new Promise((resolve) => {
      this.ipcRenderer.once(request.responseChannel as string, (_, response) => resolve(response))
    })
  }

  public on<T>(channel: string, callback: (...args: T[]) => void) {
    this.ipcRenderer.on(channel, (_, ...args: T[]) => callback(...args))
  }

  public once<T>(channel: string, callback: (...args: T[]) => void) {
    this.ipcRenderer.once(channel, (_, ...args: T[]) => callback(...args))
  }

  public removeAllListener(channel: string) {
    this.ipcRenderer.removeAllListeners(channel)
  }
}
