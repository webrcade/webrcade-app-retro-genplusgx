import React from "react";

import {
  WebrcadeRetroApp
} from '@webrcade/app-common';

import { Emulator } from './emulator';
import { EmulatorPauseScreen } from './pause';

import './App.scss';

class App extends WebrcadeRetroApp {
  createEmulator(app, isDebug) {
    return new Emulator(app, isDebug);
  }

  getBiosMap() {
    return {
      '278a9397d192149e84e820ac621a8edd': 'bios_CD_J.bin', // JPN (Mega-CD (J) - Model 1 v1.00p (1991).bin)
      '2efd74e3232ff260e371b99f84024f7f': 'bios_CD_U.bin', // USA (Sega CD (U) - Model 1 v1.10 (1992))
      '854b9150240a198070150e4566ae1290': 'bios_CD_U.bin', // USA (Sega CD (U) - Model 2 v2.00w (1993))
      'ecc837c31d77b774c6e27e38f828aa9a': 'bios_CD_U.bin', // USA (Sega CD (U) - Model 2 v2.11x (2.00) (1993))
      'baca1df271d7c11fe50087c0358f4eb5': 'bios_CD_U.bin', // USA (Sega CDX (U) - v2.21x (1993))
      'e66fa1dc5820d254611fdcdba0662372': 'bios_CD_E.bin', // EUR (Mega-CD (E) - Model 1 v1.00 (1992))
      '9b562ebf2d095bf1dabadbc1881f519a': 'bios_CD_E.bin', // EUR (Mega-CD (E) - Model 2 v2.00 (1993))
      'b10c0a97abc57b758497d3fae6ab35a4': 'bios_CD_E.bin', // EUR (Mega-CD (E) - Model 2 v2.00w (1993))
    };
  }

  getBiosUrls(appProps) {
    return appProps.segacd_bios;
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
}

export default App;
