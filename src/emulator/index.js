import {
  registerAudioResume,
  settings,
  AppWrapper,
  Controller,
  Controllers,
  DefaultKeyCodeToControlMapping,
  DisplayLoop,
  Resources,
  CIDS,
  LOG,
  TEXT_IDS,
} from '@webrcade/app-common';

import { Prefs } from './prefs';

export class Emulator extends AppWrapper {
  INP_LEFT = 1;
  INP_RIGHT = 1 << 1;
  INP_UP = 1 << 2;
  INP_DOWN = 1 << 3;
  INP_START = 1 << 4;
  INP_SELECT = 1 << 5;
  INP_A = 1 << 6;
  INP_B = 1 << 7;
  INP_X = 1 << 8;
  INP_Y = 1 << 9;
  INP_LBUMP = 1 << 10;
  INP_LTRIG = 1 << 11;
  INP_LTHUMB = 1 << 12;
  INP_RBUMP = 1 << 13;
  INP_RTRIG = 1 << 14;
  INP_RTHUMB = 1 << 15;
  CONTROLLER_COUNT = 4;

  OPT1 = 1;
  OPT2 = 1 << 1;
  OPT3 = 1 << 2;
  OPT4 = 1 << 3;
  OPT5 = 1 << 4;

  constructor(app, debug = false) {
    super(app, debug);

    window.emulator = this;
    window.readyAudioContext = null;

    this.romBytes = null;
    this.biosBuffers = null;
    this.escapeCount = -1;
    this.audioPlaying = false;
    this.analogMode = this.getProps().analog;
    this.swapControllers = false;
    this.saveStatePath = null;
    this.prefs = new Prefs(this);

    LOG.info('## Initial analog mode: ' + this.analogMode);
  }

  RA_DIR = '/home/web_user/retroarch/';
  RA_SYSTEM_DIR = this.RA_DIR + 'system/';

  CART_RAM_NAME = 'cart.brm';
  CD_ROM_RAM_USA = 'scd_U.brm';
  CD_ROM_RAM_EUR = 'scd_E.brm';
  CD_ROM_RAM_JPN = 'scd_J.brm';

  SAVE_NAME = 'sav';

  setRoms(uid, frontendArray, biosBuffers, romBytes, ext) {
    this.uid = uid;
    this.frontendArray = frontendArray;
    this.biosBuffers = biosBuffers;
    this.romBytes = romBytes;
    this.ext = ext;
    this.disc =
      this.RA_DIR + 'game.' + (ext != null && ext === 'pbp' ? 'pbp' : 'chd');
    // this.disc = this.RA_DIR + 'game.32x';
  }

  createControllers() {
    return new Controllers([
      new Controller(new DefaultKeyCodeToControlMapping()),
      new Controller(),
      new Controller(),
      new Controller(),
    ]);
  }

  createAudioProcessor() {
    return null;
  }

  async onShowPauseMenu() {
    await this.saveState();
  }

  getPrefs() {
    return this.prefs;
  }

  async saveState() {
    const { saveStatePath, started } = this;
    const { FS, Module } = window;

    try {
      if (!started) {
        return;
      }

      // Save to files
      Module._cmd_savefiles();

      let path = '';
      const files = [];
      let s = null;

      path = `/home/web_user/retroarch/userdata/saves/${this.CART_RAM_NAME}`;
      LOG.info('Checking: ' + path);
      try {
        s = FS.readFile(path);
        if (s) {
          LOG.info('Found save file: ' + path);
          files.push({
            name: this.CART_RAM_NAME,
            content: s,
          });
        }
      } catch (e) {}

      path = `/home/web_user/retroarch/userdata/saves/${this.CD_ROM_RAM_USA}`;
      LOG.info('Checking: ' + path);
      try {
        s = FS.readFile(path);
        if (s) {
          LOG.info('Found save file: ' + path);
          files.push({
            name: this.CD_ROM_RAM_USA,
            content: s,
          });
        }
      } catch (e) {}

      path = `/home/web_user/retroarch/userdata/saves/${this.CD_ROM_RAM_EUR}`;
      LOG.info('Checking: ' + path);
      try {
        s = FS.readFile(path);
        if (s) {
          LOG.info('Found save file: ' + path);
          files.push({
            name: this.CD_ROM_RAM_EUR,
            content: s,
          });
        }
      } catch (e) {}

      path = `/home/web_user/retroarch/userdata/saves/${this.CD_ROM_RAM_JPN}`;
      LOG.info('Checking: ' + path);
      try {
        s = FS.readFile(path);
        if (s) {
          LOG.info('Found save file: ' + path);
          files.push({
            name: this.CD_ROM_RAM_JPN,
            content: s,
          });
        }
      } catch (e) {}

      if (files.length > 0) {
        if (await this.getSaveManager().checkFilesChanged(files)) {
          await this.getSaveManager().save(
            saveStatePath,
            files,
            this.saveMessageCallback,
          );
        }
      } else {
        await this.getSaveManager().delete(path);
      }
    } catch (e) {
      LOG.error('Error persisting save state: ' + e);
    }
  }

  async loadState() {
    const { saveStatePath } = this;
    const { FS } = window;

    // Write the save state (if applicable)
    try {
      // Load
      const files = await this.getSaveManager().load(
        saveStatePath,
        this.loadMessageCallback,
      );

      if (files) {
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          if (f.name === this.CART_RAM_NAME) {
            LOG.info(`writing ${this.CART_RAM_NAME} file`);
            FS.writeFile(
              `/home/web_user/retroarch/userdata/saves/${this.CART_RAM_NAME}`,
              f.content,
            );
          }
          if (f.name === this.CD_ROM_RAM_USA) {
            LOG.info(`writing ${this.CD_ROM_RAM_USA} file`);
            FS.writeFile(
              `/home/web_user/retroarch/userdata/saves/${this.CD_ROM_RAM_USA}`,
              f.content,
            );
          }
          if (f.name === this.CD_ROM_RAM_EUR) {
            LOG.info(`writing ${this.CD_ROM_RAM_EUR} file`);
            FS.writeFile(
              `/home/web_user/retroarch/userdata/saves/${this.CD_ROM_RAM_EUR}`,
              f.content,
            );
          }
          if (f.name === this.CD_ROM_RAM_JPN) {
            LOG.info(`writing ${this.CD_ROM_RAM_JPN} file`);
            FS.writeFile(
              `/home/web_user/retroarch/userdata/saves/${this.CD_ROM_RAM_JPN}`,
              f.content,
            );
          }
        }

        // Cache the initial files
        await this.getSaveManager().checkFilesChanged(files);
      }
    } catch (e) {
      LOG.error('Error loading save state: ' + e);
    }
  }

  pollControls() {
    const { analogMode, CONTROLLER_COUNT, controllers } = this;

    controllers.poll();

    const isAnalog = analogMode;

    for (let i = 0; i < CONTROLLER_COUNT; i++) {
      let input = 0;

      // Hack to reduce likelihood of accidentally bringing up menu
      if (
        controllers.isControlDown(0 /*i*/, CIDS.ESCAPE) &&
        (this.escapeCount === -1 || this.escapeCount < 60)
      ) {
        if (this.pause(true)) {
          controllers
            .waitUntilControlReleased(0 /*i*/, CIDS.ESCAPE)
            .then(() => this.showPauseMenu());
          return;
        }
      }

      if (controllers.isControlDown(i, CIDS.UP, !isAnalog)) {
        input |= this.INP_UP;
      } else if (controllers.isControlDown(i, CIDS.DOWN, !isAnalog)) {
        input |= this.INP_DOWN;
      }
      if (controllers.isControlDown(i, CIDS.RIGHT, !isAnalog)) {
        input |= this.INP_RIGHT;
      } else if (controllers.isControlDown(i, CIDS.LEFT, !isAnalog)) {
        input |= this.INP_LEFT;
      }
      if (controllers.isControlDown(i, CIDS.START)) {
        input |= this.INP_START;
      }
      if (controllers.isControlDown(i, CIDS.SELECT)) {
        input |= this.INP_SELECT;
      }
      if (controllers.isControlDown(i, CIDS.A)) {
        input |= this.INP_A;
      }
      if (controllers.isControlDown(i, CIDS.B)) {
        input |= this.INP_B;
      }
      if (controllers.isControlDown(i, CIDS.X)) {
        input |= this.INP_X;
      }
      if (controllers.isControlDown(i, CIDS.Y)) {
        input |= this.INP_Y;
      }
      if (controllers.isControlDown(i, CIDS.LBUMP)) {
        input |= this.INP_LBUMP;
      }
      if (controllers.isControlDown(i, CIDS.RBUMP)) {
        input |= this.INP_RBUMP;
      }
      if (controllers.isControlDown(i, CIDS.LTRIG)) {
        input |= this.INP_LTRIG;
      }
      if (controllers.isControlDown(i, CIDS.RTRIG)) {
        input |= this.INP_RTRIG;
      }
      if (controllers.isControlDown(i, CIDS.LANALOG)) {
        input |= this.INP_LTHUMB;
      }
      if (controllers.isControlDown(i, CIDS.RANALOG)) {
        input |= this.INP_RTHUMB;
      }

      const analog0x = controllers.getAxisValue(i, 0, true);
      const analog0y = controllers.getAxisValue(i, 0, false);
      const analog1x = controllers.getAxisValue(i, 1, true);
      const analog1y = controllers.getAxisValue(i, 1, false);

      let controller = i;
      if (this.swapControllers) {
        if (controller === 0) controller = 1;
        else if (controller === 1) controller = 0;
      }

      window.Module._wrc_set_input(
        controller,
        input,
        analog0x,
        analog0y,
        analog1x,
        analog1y,
      );
    }
  }

  loadEmscriptenModule(canvas) {
    const { app, frontendArray, RA_DIR } = this;

    return new Promise((resolve, reject) => {
      window.Module = {
        canvas: canvas,
        noInitialRun: true,
        onAbort: (msg) => app.exit(msg),
        onExit: () => app.exit(),
        onRuntimeInitialized: () => {
          const f = () => {
            // Enable show message
            this.setShowMessageEnabled(true);
            if (window.readyAudioContext) {
              if (window.readyAudioContext.state !== 'running') {
                app.setShowOverlay(true);
                registerAudioResume(
                  window.readyAudioContext,
                  (running) => {
                    if (running) {
                      window.Module._rwebaudio_enable();
                      window.Module._cmd_audio_reinit();
                      this.audioPlaying = true;
                    }
                    setTimeout(() => app.setShowOverlay(!running), 50);
                  },
                  500,
                );
              } else {
                window.Module._rwebaudio_enable();
                window.Module._cmd_audio_reinit();
                this.audioPlaying = true;
              }
            } else {
              setTimeout(f, 1000);
            }
          };
          setTimeout(f, 1000);
          resolve();
        },
        preInit: function () {
          const FS = window.FS;

          // Load the frontend resources
          const BrowserFS = window.BrowserFS;

          if (frontendArray) {
            const mfs = new BrowserFS.FileSystem.MountableFileSystem();
            const frontend = new BrowserFS.FileSystem.ZipFS(
              new Buffer.from(frontendArray),
            );
            mfs.mount(RA_DIR + 'bundle', frontend);
            BrowserFS.initialize(mfs);
            const BFS = new BrowserFS.EmscriptenFS();
            FS.mount(BFS, { root: '/home' }, '/home');
          } else {
            FS.mkdir('/home/web_user/retroarch');
          }
          FS.mkdir('/home/web_user/retroarch/system');
          FS.mkdir('/home/web_user/retroarch/userdata');
          FS.mkdir('/home/web_user/retroarch/userdata/system');
          FS.mkdir('/home/web_user/retroarch/userdata/saves');
        },
      };

      const script = document.createElement('script');
      document.body.appendChild(script);
      script.src = 'js/genesis_plus_gx_libretro.js';
      // script.src = 'js/picodrive_libretro.js';
    });
  }

  onPause(p) {
    if (!p) {
      if (window.readyAudioContext) {
        window.readyAudioContext.resume();
        console.log(window.readyAudioContext);
        window.Module._rwebaudio_enable();
        window.Module._cmd_audio_reinit();
      }
    }
  }

  wait(time) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, time);
    });
  }

  applyGameSettings() {
    // const { Module } = window;
    // const props = this.getProps();
    // let options = 0;
    // // multi-tap
    // if (props.multitap) {
    //   LOG.info('## multitap on');
    //   options |= this.OPT1;
    // } else {
    //   LOG.info('## multitap off');
    // }
    // // analog
    // if (this.analogMode) {
    //   LOG.info('## analog on');
    //   options |= this.OPT2;
    // } else {
    //   LOG.info('## analog off');
    // }
    // // Skip BIOS
    // if (props.skipBios) {
    //   options |= this.OPT5;
    //   LOG.info('## skip BIOS on');
    // }
    // Module._wrc_set_options(options);
  }

  getSwapControllers() {
    return this.swapControllers;
  }

  setSwapControllers(swap) {
    this.swapControllers = swap;
  }

  getAnalogMode() {
    return this.analogMode;
  }

  setAnalogMode(analog) {
    const isAnalog = analog === 1;
    LOG.info('## Game setAnalogMode: ' + isAnalog);
    this.analogMode = isAnalog;
    this.applyGameSettings();
  }

  isBilinearFilterEnabled() {
    return settings.isBilinearFilterEnabled() || this.prefs.isBilinearEnabled();
  }

  updateBilinearFilter() {
    const enabled = this.isBilinearFilterEnabled();
    window.Module._wrc_enable_bilinear_filter(enabled ? 1 : 0);
  }

  resizeScreen(canvas) {
    // Determine the zoom level
    let zoomLevel = 0;
    if (this.getProps().zoomLevel) {
      zoomLevel = this.getProps().zoomLevel;
    }

    const size = 96 + zoomLevel;
    canvas.style.setProperty('width', `${size}vw`, 'important');
    canvas.style.setProperty('height', `${size}vh`, 'important');
    canvas.style.setProperty('max-width', `calc(${size}vh*1.333)`, 'important');
    canvas.style.setProperty('max-height', `calc(${size}vw*0.75)`, 'important');
  }

  async onStart(canvas) {
    const { app, debug, disc } = this;
    const { FS, Module } = window;

    try {
      this.canvas = canvas;

      setTimeout(() => {
        app.setState({ loadingMessage: null, loadingPercent: null });
        setTimeout(() => {
          app.setState({ loadingMessage: 'Starting' });
        }, 2000);
      }, 2000);

      if (this.romBytes.byteLength === 0) {
        throw new Error('The size is invalid (0 bytes).');
      }

      // Load preferences
      await this.prefs.load();

      // Apply the game settings
      this.applyGameSettings();

      // Copy BIOS files
      for (let bios in this.biosBuffers) {
        const bytes = this.biosBuffers[bios];
        const path = '/home/web_user/retroarch/userdata/system/' + bios;
        FS.writeFile(path, bytes);
      }

      // Write rom file
      let stream = FS.open(disc, 'a');
      FS.write(stream, this.romBytes, 0, this.romBytes.length, 0, true);
      FS.close(stream);
      this.romBytes = null;

      await this.wait(2000);

      // Load the save state
      this.saveStatePath = app.getStoragePath(`${this.uid}/${this.SAVE_NAME}`);
      await this.loadState();

      await this.wait(10000);

      window.readyAudioContext = new window.AudioContext();
      window.readyAudioContext.resume();
      console.log(window.readyAudioContext);

      try {
        Module.callMain(['-v', disc]);
      } catch (e) {
        LOG.error(e);
      }

      // Bilinear filter
      if (this.isBilinearFilterEnabled()) {
        // TODO: Figure out a way to do this without re-init of video
        await this.wait(1000);
        Module._wrc_enable_bilinear_filter(1);
      }

      setTimeout(() => {
        app.setState({ loadingMessage: null });
      }, 50);

      this.displayLoop = new DisplayLoop(
        60, // frame rate (ignored due to no wait)
        true, // vsync
        debug, // debug
        true, // force native
        false, // no wait
      );
      this.displayLoop.setAdjustTimestampEnabled(false);

      setTimeout(() => {
        this.resizeScreen(canvas);
        Module.setCanvasSize(canvas.offsetWidth, canvas.offsetHeight);
        setTimeout(() => {
          this.resizeScreen(canvas);
        }, 1);
      }, 50);

      window.onresize = () => {
        Module.setCanvasSize(canvas.offsetWidth, canvas.offsetHeight);
        setTimeout(() => {
          this.resizeScreen(canvas);
        }, 1);
      };

      let exit = false;

      // Start the display loop
      this.displayLoop.start(() => {
        try {
          if (!exit) {
            this.pollControls();
            Module._emscripten_mainloop();
          }
        } catch (e) {
          if (e.status === 1971) {
            // Menu was displayed, should never happen (bad rom?)
            app.exit(Resources.getText(TEXT_IDS.ERROR_UNKNOWN));
            exit = true;
          }
        }
      });
    } catch (e) {
      LOG.error(e);
      app.exit(e);
    }
  }
}
