import {
  RetroAppWrapper,
  LOG,
} from '@webrcade/app-common';

export class Emulator extends RetroAppWrapper {

  constructor(app, debug = false) {
    super(app, debug);
  }

  CART_RAM_NAME = 'cart.brm';
  CD_ROM_RAM_USA = 'scd_U.brm';
  CD_ROM_RAM_EUR = 'scd_E.brm';
  CD_ROM_RAM_JPN = 'scd_J.brm';

  SAVE_NAME = 'sav';

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

  getShotAspectRatio() { return this.getDefaultAspectRatio(); }
}
