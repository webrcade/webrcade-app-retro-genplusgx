import {
  APP_TYPE_KEYS,
  RetroAppWrapper,
  ScriptAudioProcessor,
  DisplayLoop,
  LOG,
} from '@webrcade/app-common';

export class Emulator extends RetroAppWrapper {

  constructor(app, debug = false) {
    super(app, debug);

    // Allow game saves to persist after loading state
    this.saveManager.setDisableGameSaveOnStateLoad(false);

    this.lastFrequency = 60;
    this.frequency = 60;

    this.audioStarted = 0;
    this.total = 0;
    this.count = 0;

    this.audioCallback = (offset, length) => {
      this.total += length;
      this.count = this.count + 1;

      if (this.count === 60) {
        //console.log("total: " + this.total);
        this.total = 0;
        this.count = 0;
      }

      length = length << 1;
      const audioArray = new Int16Array(window.Module.HEAP16.buffer, offset, length);
      this.audioProcessor.storeSoundCombinedInput(audioArray, 2, length, 0, 32768);
    };
  }

  CART_RAM_NAME = 'cart.brm';
  CD_ROM_RAM_USA = 'scd_U.brm';
  CD_ROM_RAM_EUR = 'scd_E.brm';
  CD_ROM_RAM_JPN = 'scd_J.brm';

  GAME_SRAM_NAME = 'game.srm';

  SAVE_NAME = 'sav';

  SYSTEM_SG = 0x10;
  SYSTEM_SGII = 0x11;
  SYSTEM_MARKIII = 0x12;
  SYSTEM_SMS = 0x20;
  SYSTEM_SMS2 = 0x21;
  SYSTEM_GG = 0x40;
  SYSTEM_GGMS = 0x41;
  SYSTEM_MD = 0x80;
  SYSTEM_PBC = 0x81;
  SYSTEM_PICO = 0x82;
  SYSTEM_MCD = 0x84;

  createAudioProcessor() {
    return new ScriptAudioProcessor(
      2,
      48000,
      8192 + 4096,
      2048
    ).setDebug(this.debug);
  }

  onFrame() {
    if (this.audioStarted !== -1) {
      if (this.audioStarted > 1) {
        this.audioStarted = -1;
        // Start the audio processor
        this.audioProcessor.start();
      } else {
        this.audioStarted++;
      }
    }
  }

  is2Button() {
    const systemType = this.getSystemType();
    return (
      systemType === this.SYSTEM_SMS ||
      systemType === this.SYSTEM_SMS2 ||
      systemType === this.SYSTEM_SG ||
      systemType === this.SYSTEM_SGII
    );
  }

  is3Button() {
    const props = this.getProps();
    return props.pad3button !== undefined && props.pad3button === true;
  }

  getSystemType() {
    const props = this.getProps();

    switch (props.type) {
      case APP_TYPE_KEYS.RETRO_GENPLUSGX_MD:
        return this.SYSTEM_MD;
      case APP_TYPE_KEYS.RETRO_GENPLUSGX_SEGACD:
        return this.SYSTEM_MCD;
      case APP_TYPE_KEYS.RETRO_GENPLUSGX_SMS:
      {
        const hwType = props.hwType;
        switch (hwType) {
          case 1:
            return this.SYSTEM_SMS
          case 2:
            return this.SYSTEM_SG;
          default:
            return this.SYSTEM_SMS2;
        }
      }
      case APP_TYPE_KEYS.RETRO_GENPLUSGX_GG:
        return this.SYSTEM_GG;
      case APP_TYPE_KEYS.RETRO_GENPLUSGX_SG:
        return this.SYSTEM_SG;
      default:
        return this.SYSTEM_MD;
    }
  }

  isPal() {
    const props = this.getProps();
    return props.pal !== undefined && props.pal === true;
  }

  isYm2413() {
    const props = this.getProps();
    return props.ym2413 !== undefined && props.ym2413 === true;
  }

  getScriptUrl() {
    return 'js/genesis_plus_gx_libretro.js';
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

      path = `/home/web_user/retroarch/userdata/saves/${this.GAME_SRAM_NAME}`;
      LOG.info('Checking: ' + path);
      try {
        s = FS.readFile(path);
        if (s) {
          LOG.info('Found save file: ' + path);
          let hasData = false;
          for (let i = 0; i < s.length; i++) {
            if (s[i] !== 0xFF) {
              hasData = true;
              break; // exit early
            }
          }

          if (hasData) {
            LOG.info('File has content: ' + path);
            files.push({
              name: this.GAME_SRAM_NAME,
              content: s,
            });
          } else {
            LOG.info('Skipping empty file: ' + path);
          }
        }
        // if (s) {
        //   LOG.info('Found save file: ' + path);
        //   files.push({
        //     name: this.GAME_SRAM_NAME,
        //     content: s,
        //   });
        // }
      } catch (e) {}

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

          if (f.name === this.GAME_SRAM_NAME) {
            LOG.info(`writing ${this.GAME_SRAM_NAME} file`);
            FS.writeFile(
              `/home/web_user/retroarch/userdata/saves/${this.GAME_SRAM_NAME}`,
              f.content,
            );
          }
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

  applyGameSettings() {}

  // resizeScreen(canvas) {
  //   // Determine the zoom level
  //   let zoomLevel = 0;
  //   if (this.getProps().zoomLevel) {
  //     zoomLevel = this.getProps().zoomLevel;
  //   }

  //   const size = 96 + zoomLevel;
  //   canvas.style.setProperty('width', `${size}vw`, 'important');
  //   canvas.style.setProperty('height', `${size}vh`, 'important');
  //   canvas.style.setProperty('max-width', `calc(${size}vh*1.333)`, 'important');
  //   canvas.style.setProperty('max-height', `calc(${size}vw*0.75)`, 'important');
  // }

  // getShotAspectRatio() { return 1.333; }


  getDefaultAspectRatio() {
    return 1.333;
  }

  resizeScreen(canvas) {
    this.canvas = canvas;
    // // Determine the zoom level
    // let zoomLevel = 0;
    // if (this.getProps().zoomLevel) {
    //   zoomLevel = this.getProps().zoomLevel;
    // }

    // const size = 96 + zoomLevel;
    // canvas.style.setProperty('width', `${size}vw`, 'important');
    // canvas.style.setProperty('height', `${size}vh`, 'important');
    // canvas.style.setProperty('max-width', `calc(${size}vh*1.22)`, 'important');
    // canvas.style.setProperty('max-height', `calc(${size}vw*0.82)`, 'important');
    this.updateScreenSize();
  }


  createDisplayLoop(debug) {
    const loop = new DisplayLoop(
      60 /*this.frequency*/,
      true, // vsync
      debug, // debug
      false,
    );
    // loop.setAdjustTimestampEnabled(false);
    return loop;
  }

  setRefreshRate(rate) {
    if (rate !== this.frequency) {
      this.frequency = rate;
    }
  }

  getDisplayLoopReturn() {
    if (this.lastFrequency !== this.frequency) {
      this.lastFrequency = this.frequency;
      console.log('returning: ' + this.frequency);
      return this.frequency;
    }
    return undefined;
  }

  getShotAspectRatio() { return this.getDefaultAspectRatio(); }
}
