/*
 *  windowManager.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { BrowserWindow, Menu, Tray, app, dialog, protocol } from 'electron'
import { SongEvents, WindowEvents } from './ipc/constants'
import { getWindowSize, setWindowSize, loadPreferences } from './db/preferences'

import { BrowserWindowConstructorOptions } from 'electron/main'
import path from 'path'
import { access } from 'fs/promises'
import { getActiveTheme } from './themes/preferences'
import pie from 'puppeteer-in-electron'
import puppeteer from 'puppeteer-core'
import { extensionChannel } from './ipc'

export class WindowHandler {
  private static mainWindow: number
  private static preferenceWindow: number

  private trayHandler = new TrayHandler()
  private isDevelopment = process.env.NODE_ENV !== 'production'
  private _isMainWindowMounted = true
  private pathQueue: string[] = []

  public static getWindow(mainWindow = true) {
    if (mainWindow && this.mainWindow !== undefined) return BrowserWindow.fromId(this.mainWindow)

    if (!mainWindow && this.preferenceWindow !== undefined) {
      return BrowserWindow.fromId(this.preferenceWindow)
    }
  }

  public static get hasFrame() {
    return process.platform === 'linux' || process.platform === 'darwin'
  }

  public static get showTitlebarIcons() {
    return !this.hasFrame
  }

  private get windowBackgroundColor() {
    return getActiveTheme()?.theme.primary ?? '#212121'
  }

  private get baseWindowProps(): BrowserWindowConstructorOptions {
    return {
      backgroundColor: this.windowBackgroundColor,
      titleBarStyle: 'hidden',
      frame: WindowHandler.hasFrame,
      show: true,
      icon: path.join(__static, 'logo.png'),
      webPreferences: {
        contextIsolation: true,
        // Use pluginOptions.nodeIntegration, leave this alone
        // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
        nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
        preload: path.join(__dirname, 'preload.js')
      }
    }
  }

  private get mainWindowProps(): BrowserWindowConstructorOptions {
    return {
      title: 'Moosync',
      ...getWindowSize('mainWindow', { width: 1016, height: 653 }),
      minHeight: 653,
      minWidth: 1016,
      ...this.baseWindowProps
    }
  }

  private get prefWindowProps(): BrowserWindowConstructorOptions {
    return {
      title: 'Preferences',
      ...getWindowSize('prefWindow', { width: 840, height: 653 }),
      minHeight: 672,
      minWidth: 840,
      ...this.baseWindowProps
    }
  }

  public async installExtensions() {
    // Do nothing here
  }

  public setHardwareAcceleration() {
    const enabled = loadPreferences().system.find((val) => val.key === 'hardwareAcceleration')?.enabled
    console.debug(loadPreferences().system)
    if (enabled === false) {
      console.debug('Disabling hardware acceleration')
      app.disableHardwareAcceleration()
    }
  }

  public restartApp() {
    app.relaunch()
    app.exit()
  }

  public registerProtocol(protocolName: string) {
    protocol.registerFileProtocol(protocolName, (request, callback) => {
      const url = request.url.replace(`${protocolName}://`, '')
      try {
        return callback(decodeURIComponent(url))
      } catch (error) {
        console.error(error)
        app.quit()
      }
    })
  }

  public handleFileOpen(argv: string[] = process.argv) {
    const parsedArgv = argv
      .filter((val) => !val.startsWith('-') && !val.startsWith('--'))
      .slice(this.isDevelopment ? 2 : 1)
    if (this._isMainWindowMounted) {
      this.sendToMainWindow(SongEvents.GOT_FILE_PATH, parsedArgv)
    } else {
      this.pathQueue.push(...parsedArgv)
    }
  }

  public mainWindowHasMounted() {
    this._isMainWindowMounted = true
    this.sendToMainWindow(SongEvents.GOT_FILE_PATH, this.pathQueue)
  }

  private getWindowURL(isMainWindow: boolean) {
    let url = ''

    if (process.env.WEBPACK_DEV_SERVER_URL)
      url = process.env.WEBPACK_DEV_SERVER_URL + (isMainWindow ? '' : 'preferenceWindow')
    else url = isMainWindow ? 'http://localhost/./index.html' : 'moosync://./preferenceWindow.html'

    return url
  }

  public destroyTray() {
    this.trayHandler.destroy()
  }

  public sendToMainWindow(channel: string, arg: unknown) {
    WindowHandler.getWindow()?.webContents.send(channel, arg)
  }

  public async createWindow(isMainWindow = true, args?: unknown) {
    let win: BrowserWindow | undefined | null
    if (!WindowHandler.getWindow(isMainWindow) || WindowHandler.getWindow(isMainWindow)?.isDestroyed()) {
      win = new BrowserWindow(isMainWindow ? this.mainWindowProps : this.prefWindowProps)

      await win.loadURL(this.getWindowURL(isMainWindow))

      win.removeMenu()

      if (this.isDevelopment) win.webContents.openDevTools()

      if (isMainWindow) WindowHandler.mainWindow = win.id
      else WindowHandler.preferenceWindow = win.id

      this.attachWindowEvents(win, isMainWindow)
    } else {
      console.info('Window already exists, focusing')
      win = WindowHandler.getWindow(isMainWindow)
      if (win) win.focus()
      else console.warn('Cant find existing window')
    }

    win?.webContents.send(WindowEvents.GOT_EXTRA_ARGS, args)
  }

  private async handleWindowClose(event: Event, window: BrowserWindow, isMainWindow: boolean) {
    if (window.webContents.isDevToolsOpened()) {
      window.webContents.closeDevTools()
    }

    const [width, height] = window.getSize()
    setWindowSize(isMainWindow ? 'mainWindow' : 'prefWindow', { width, height })

    if (isMainWindow) {
      event.preventDefault()
      if (!AppExitHandler._isQuitting && AppExitHandler._minimizeToTray) {
        await this.trayHandler.createTray()
        window.hide()
      } else {
        // Stop extension Host
        await extensionChannel.closeExtensionHost()
        app.exit()
      }
    }
  }

  public createScrapeWindow() {
    return new BrowserWindow({
      show: false
    })
  }

  private handleWindowShow(window: BrowserWindow) {
    window.focus()
  }

  private attachWindowEvents(window: BrowserWindow, isMainWindow: boolean) {
    window.on('close', (event) => {
      this.handleWindowClose(event, window, isMainWindow)
    })

    window.on('show', () => {
      this.handleWindowShow(window)
    })
  }

  public minimizeWindow(isMainWindow = true) {
    const window = WindowHandler.getWindow(isMainWindow)
    window?.minimizable && window.minimize()
  }

  public maximizeWindow(isMainWindow = true) {
    const window = WindowHandler.getWindow(isMainWindow)
    if (window?.maximizable) {
      if (window.isMaximized()) window.restore()
      else window.maximize()

      return window?.isMaximized()
    }

    return false
  }

  public toggleDevTools(isMainWindow = true) {
    const window = WindowHandler.getWindow(isMainWindow)
    window?.webContents.isDevToolsOpened() ? window.webContents.closeDevTools() : window?.webContents.openDevTools()
  }

  public async openFileBrowser(isMainWindow = true, options: Electron.OpenDialogOptions) {
    const window = WindowHandler.getWindow(isMainWindow)
    return window && dialog.showOpenDialog(window, options)
  }

  public async openSaveDialog(isMainWindow = true, options: Electron.SaveDialogOptions) {
    const window = WindowHandler.getWindow(isMainWindow)
    return window && dialog.showSaveDialog(window, options)
  }

  public closeWindow(isMainWindow = true) {
    const window = WindowHandler.getWindow(isMainWindow)
    window && !window?.isDestroyed() && window.close()
  }

  public async automateSpotifyAppCreation() {
    const browser = await pie.connect(app, puppeteer)

    const window = new BrowserWindow()
    const url = 'https://developer.spotify.com/dashboard/login'
    await window.loadURL(url)

    try {
      const page = await pie.getPage(browser, window)

      if (await page.$('button[data-ng-click="login()"]')) {
        await page.click('button[data-ng-click="login()"]')

        const loginPage = await (await browser.waitForTarget((target) => target.opener() === page.target())).page()
        if (loginPage) {
          await new Promise((resolve) => loginPage.on('close', resolve))
        }

        await page.waitForNavigation()
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      const acceptTerms = await page.$('input[value="Accept the Terms"]')
      if (acceptTerms) {
        await (await page.$('span[class="control-indicator"]'))?.evaluate((b) => (b as HTMLElement).click())
        await (await page.$('input[value="Accept the Terms"]'))?.evaluate((b) => (b as HTMLElement).click())
        await page.waitForNavigation()
      }

      await page.waitForSelector('button[ng-click="flowStart()"]')
      await page.click('button[ng-click="flowStart()"]')
      await page.waitForSelector('input[data-ng-model="name"]', { visible: true })

      await page.focus('input[data-ng-model="name"]')
      await page.type('input[data-ng-model="name"]', 'Moosync')
      await page.focus('textarea[data-ng-model="description"]')
      await page.type('textarea[data-ng-model="description"]', 'A simple music player')
      await (await page.$('span[class="control-indicator"]'))?.evaluate((b) => (b as HTMLElement).click())

      await new Promise((resolve) => setTimeout(resolve, 1000))
      await (await page.$('button[type="submit"]'))?.evaluate((b) => (b as HTMLElement).click())
      await page.waitForNavigation()

      await page.waitForSelector('button[ng-show="!showClientSecret"]')
      await (await page.$('button[ng-show="!showClientSecret"]'))?.evaluate((b) => (b as HTMLElement).click())

      await page.waitForSelector('div[ng-show="showClientSecret"] > code', { visible: true })
      await new Promise((resolve) => setTimeout(resolve, 500))

      const clientID = await (await page.$('.client-credential > code'))?.evaluate((el) => el.innerHTML)
      const clientSecret = await (
        await page.$('div[ng-show="showClientSecret"] > code')
      )?.evaluate((el) => el.innerHTML)

      await (await page.$('button[data-target="#settings-modal"]'))?.evaluate((b) => (b as HTMLElement).click())
      await page.waitForSelector('div[id="settings-modal"]', { visible: true })
      await new Promise((resolve) => setTimeout(resolve, 500))

      await page.focus('input[id="newRedirectUri"]')
      await page.type('input[id="newRedirectUri"]', 'https://moosync.app/spotify')
      await page.click('button[id="addRedirectUri"]')
      await new Promise((resolve) => setTimeout(resolve, 500))

      await page.focus('input[id="newRedirectUri"]')
      await page.type('input[id="newRedirectUri"]', 'http://localhost')
      await page.click('button[id="addRedirectUri"]')
      await new Promise((resolve) => setTimeout(resolve, 500))

      await page.focus('input[id="newRedirectUri"]')
      await page.type('input[id="newRedirectUri"]', 'http://localhost:8080')
      await page.click('button[id="addRedirectUri"]')
      await new Promise((resolve) => setTimeout(resolve, 500))

      await new Promise((resolve) => setTimeout(resolve, 300))
      await (await page.$('button[ng-click="update(application)"]'))?.evaluate((b) => (b as HTMLElement).click())

      browser.disconnect()
      window.close()

      return { clientID, clientSecret }
    } catch (e) {
      console.error(e)
    }

    browser.disconnect()
    window.close()
  }
}

class AppExitHandler {
  public static _isQuitting = false
  public static _minimizeToTray = true
}

class TrayHandler {
  private _tray: Tray | null = null

  public async createTray() {
    if (!this._tray || this._tray?.isDestroyed()) {
      try {
        const iconPath = path.join(app.getPath('appData'), 'moosync', 'trayIcon', 'icon.png')
        await access(iconPath)
        this._tray = new Tray(iconPath)
      } catch (e) {
        this._tray = new Tray(path.join(__static, process.platform === 'darwin' ? 'logo_osx.png' : 'logo.png'))
      }
    }
    this.setupListeners()
    this.setupContextMenu()
  }

  private setupContextMenu() {
    if (this._tray && !this._tray.isDestroyed()) {
      this._tray.setContextMenu(
        Menu.buildFromTemplate([
          {
            label: 'Show App',
            click: () => {
              this.destroy()
              AppExitHandler._isQuitting = false
              WindowHandler.getWindow()?.show()
            }
          },
          {
            label: 'Quit',
            click: function () {
              AppExitHandler._isQuitting = true
              app.quit()
            }
          }
        ])
      )
    }
  }

  private setupListeners() {
    if (this._tray) {
      this._tray.on('double-click', () => {
        WindowHandler.getWindow()?.show()
        this.destroy()
      })
    }
  }

  public destroy() {
    this._tray && !this._tray.isDestroyed() && this._tray.destroy()
    this._tray = null
  }
}

export function setMinimizeToTray(enabled: boolean) {
  AppExitHandler._minimizeToTray = enabled
}

export function setIsQuitting(val: boolean) {
  AppExitHandler._isQuitting = val
}

export const _windowHandler = new WindowHandler()
