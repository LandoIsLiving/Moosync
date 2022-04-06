/*
 *  youtube.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { Player } from './player'
import YTPlayer from 'yt-player'

type YouTubePlayerQuality = 'small' | 'medium' | 'large' | 'hd720' | 'hd1080' | 'highres' | 'default'

export class YoutubePlayer extends Player {
  playerInstance: YTPlayer
  private supposedVolume = 100

  constructor(playerInstance: YTPlayer) {
    super()
    this.playerInstance = playerInstance
  }

  load(src?: string, volume?: number, autoplay?: boolean): void {
    src && this.playerInstance.load(src, autoplay)
    volume && (this.volume = volume)
  }

  async play(): Promise<void> {
    this.playerInstance.play()
    this.playerInstance.setVolume(this.volume)
  }

  pause(): void {
    return this.playerInstance.pause()
  }

  stop(): void {
    return this.playerInstance.stop()
  }

  get currentTime(): number {
    return this.playerInstance.getCurrentTime()
  }

  set currentTime(time: number) {
    this.playerInstance.seek(time)
  }

  get volume(): number {
    return this.playerInstance.getVolume()
  }

  set volume(volume: number) {
    this.supposedVolume = volume
    this.playerInstance.setVolume(volume)
  }

  protected listenOnEnded(callback: () => void): void {
    this.playerInstance.addListener('ended', callback)
  }

  protected listenOnTimeUpdate(callback: (time: number) => void): void {
    this.playerInstance.addListener('timeupdate', callback)
  }

  protected listenOnLoad(callback: () => void): void {
    this.playerInstance.addListener('cued', callback)
  }

  protected listenOnError(callback: OnErrorEventHandlerNonNull | ((err: ErrorEvent) => void)): void {
    this.playerInstance.addListener('error', callback)
    this.playerInstance.addListener('unplayable', callback)
  }

  protected listenOnStateChange(callback: (state: PlayerState) => void): void {
    this.playerInstance.addListener('playing', () => {
      this.volume = this.supposedVolume
      callback('PLAYING')
    })
    this.playerInstance.addListener('paused', () => callback('PAUSED'))
    this.playerInstance.addListener('ended', () => callback('STOPPED'))
  }

  protected listenOnBuffer(callback: () => void): void {
    this.playerInstance.addListener('buffering', callback)
  }

  removeAllListeners(): void {
    this.playerInstance.removeAllListeners()
  }

  public setPlaybackQuality(quality: YouTubePlayerQuality) {
    this.playerInstance.setPlaybackQuality(quality)
  }
}
