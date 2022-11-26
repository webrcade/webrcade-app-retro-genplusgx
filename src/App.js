import {
  blobToStr,
  md5,
  removeEmptyArrayItems,
  setMessageAnchorId,
  settings,
  DiscSelectionEditor,
  FetchAppData,
  Resources,
  UrlUtil,
  WebrcadeApp,
  LOG,
  TEXT_IDS,
} from '@webrcade/app-common';

import { Emulator } from './emulator';
import { EmulatorPauseScreen } from './pause';

import './App.scss';

class App extends WebrcadeApp {
  emulator = null;

  BIOS = {
    '278a9397d192149e84e820ac621a8edd': 'bios_CD_J.bin', // JPN (Mega-CD (J) - Model 1 v1.00p (1991).bin)
    '2efd74e3232ff260e371b99f84024f7f': 'bios_CD_U.bin', // USA (Sega CD (U) - Model 1 v1.10 (1992))
    '854b9150240a198070150e4566ae1290': 'bios_CD_U.bin', // USA (Sega CD (U) - Model 2 v2.00w (1993))
    ecc837c31d77b774c6e27e38f828aa9a: 'bios_CD_U.bin', // USA (Sega CD (U) - Model 2 v2.11x (2.00) (1993))
    baca1df271d7c11fe50087c0358f4eb5: 'bios_CD_U.bin', // USA (Sega CDX (U) - v2.21x (1993))
    e66fa1dc5820d254611fdcdba0662372: 'bios_CD_E.bin', // EUR (Mega-CD (E) - Model 1 v1.00 (1992))
    '9b562ebf2d095bf1dabadbc1881f519a': 'bios_CD_E.bin', // EUR (Mega-CD (E) - Model 2 v2.00 (1993))
    b10c0a97abc57b758497d3fae6ab35a4: 'bios_CD_E.bin', // EUR (Mega-CD (E) - Model 2 v2.00w (1993))
  };

  MODE_DISC_SELECT = 'discSelectionMode';

  constructor() {
    super();

    this.state.mode = null;
  }

  async fetchBios(bios) {
    let biosBuffers = {};
    for (let i = 0; i < bios.length; i++) {
      const biosUrl = bios[i];
      if (biosUrl.trim().length === 0) {
        continue;
      }

      const fad = new FetchAppData(biosUrl);
      const res = await fad.fetch();
      const blob = await res.blob();
      const blobStr = await blobToStr(blob);
      const md5Hash = md5(blobStr);
      console.log(md5Hash);
      let name = this.BIOS[md5Hash];
      if (name) {
        biosBuffers[name] = new Uint8Array(await blob.arrayBuffer());
      }
    }

    for (let p in this.BIOS) {
      const f = this.BIOS[p];
      let found = false;
      for (let n in biosBuffers) {
        if (f === n) {
          found = true;
          break;
        }
      }
      if (!found) throw new Error(`Unable to find BIOS file: ${f}`);
    }

    console.log(biosBuffers);
    return biosBuffers;
  }

  // TODO: Move this to common
  async fetchResponseBuffer(response) {
    const length = response.headers.get('Content-Length');
    if (length) {
      let array = new Uint8Array(length);
      let at = 0;
      let reader = response.body.getReader();
      for (;;) {
        let { done, value } = await reader.read();
        if (done) {
          break;
        }
        array.set(value, at);
        at += value.length;
        const progress = ((at / length).toFixed(2) * 100).toFixed(0);
        this.setState({ loadingPercent: progress | 0 });
      }
      try {
        return array;
      } finally {
        array = null;
      }
    } else {
      const blob = await response.blob();
      return new Uint8Array(await new Response(blob).arrayBuffer());
    }
  }

  getExtension(url, fad, res) {
    let filename = fad.getFilename(res);
    if (!filename) {
      filename = UrlUtil.getFileName(url);
    }
    if (filename) {
      const comps = filename.split('.');
      if (comps.length > 1) {
        return comps[comps.length - 1].toLowerCase();
      }
    }
    return null;
  }

  start(discIndex) {
    setMessageAnchorId('canvas');

    const { bios, discs, emulator, uid, ModeEnum } = this;

    this.setState({ mode: ModeEnum.LOADING });

    try {
      let biosBuffers = null;
      let frontend = null;
      let extension = null;

      const discUrl = discs[discIndex];
      const fad = new FetchAppData(discUrl);

      // Load Emscripten and ROM binaries
      settings
        .load()
        .then(() => emulator.loadEmscriptenModule(this.canvas))
        .then(() => this.fetchBios(bios))
        .then((b) => {
          biosBuffers = b;
        })
        // .then(() => settings.setBilinearFilterEnabled(true))
        // .then(() => settings.setVsyncEnabled(false))
        .then(() => fad.fetch())
        .then((response) => {
          extension = this.getExtension(discUrl, fad, response);
          return response;
        })
        .then((response) => this.fetchResponseBuffer(response))
        .then((bytes) => {
          emulator.setRoms(uid, frontend, biosBuffers, bytes, extension);
          return bytes;
        })
        .then(() =>
          this.setState({
            mode: ModeEnum.LOADED,
            loadingMessage: 'Loading',
          }),
        )
        .catch((msg) => {
          LOG.error(msg);
          this.exit(
            msg ? msg : Resources.getText(TEXT_IDS.ERROR_RETRIEVING_GAME),
          );
        });
    } catch (e) {
      this.exit(e);
    }
  }

  componentDidMount() {
    super.componentDidMount();

    const { appProps } = this;

    // Create the emulator
    if (this.emulator === null) {
      try {
        this.emulator = new Emulator(this, this.isDebug());

        // Get the uid
        this.uid = appProps.uid;
        if (!this.uid)
          throw new Error('A unique identifier was not found for the game.');

        // Get the discs location that was specified
        this.discs = appProps.discs;
        if (this.discs) this.discs = removeEmptyArrayItems(this.discs);
        if (!this.discs || this.discs.length === 0)
          throw new Error('A disc was not specified.');

        this.bios = appProps.segacd_bios;
        if (this.bios) this.bios = removeEmptyArrayItems(this.bios);
        if (!this.bios || this.bios.length === 0)
          throw new Error('BIOS file(s) were not specified.');

        if (this.discs.length > 1) {
          this.setState({ mode: this.MODE_DISC_SELECT });
        } else {
          this.start(0);
        }
      } catch (msg) {
        LOG.error(msg);
        this.exit(
          msg ? msg : Resources.getText(TEXT_IDS.ERROR_RETRIEVING_GAME),
        );
      }
    }
  }

  async onPreExit() {
    try {
      await super.onPreExit();
      if (!this.isExitFromPause()) {
        await this.emulator.saveState();
      }
    } catch (e) {
      LOG.error(e);
    }
  }

  componentDidUpdate() {
    const { mode } = this.state;
    const { ModeEnum, emulator, canvas } = this;

    if (mode === ModeEnum.LOADED) {
      window.focus();
      // Start the emulator
      emulator.start(canvas);
    }
  }

  renderPauseScreen() {
    const { appProps, emulator } = this;

    return (
      <EmulatorPauseScreen
        emulator={emulator}
        appProps={appProps}
        closeCallback={() => this.resume()}
        exitCallback={() => {
          this.exitFromPause();
        }}
        isEditor={this.isEditor}
        isStandalone={this.isStandalone}
      />
    );
  }

  renderCanvas() {
    return (
      <canvas
        ref={(canvas) => {
          this.canvas = canvas;
        }}
        id="canvas"
      ></canvas>
    );
  }

  render() {
    const { errorMessage, loadingMessage, mode } = this.state;
    const { ModeEnum, MODE_DISC_SELECT } = this;

    return (
      <>
        {super.render()}
        {mode === MODE_DISC_SELECT && this.discs ? (
          <DiscSelectionEditor app={this} />
        ) : null}
        {mode === ModeEnum.LOADING || (loadingMessage && !errorMessage)
          ? this.renderLoading()
          : null}
        {mode === ModeEnum.PAUSE ? this.renderPauseScreen() : null}
        {this.renderCanvas()}
      </>
    );
  }
}

export default App;
