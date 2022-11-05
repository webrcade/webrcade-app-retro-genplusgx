import React from 'react';
import { Component } from 'react';
import { GenPlusGxSettingsEditor } from './settings';

import { GamepadControlsTab, KeyboardControlsTab } from './controls';

import {
  CustomPauseScreen,
  EditorScreen,
  GamepadWhiteImage,
  KeyboardWhiteImage,
  PauseScreenButton,
  Resources,
  SettingsAppWhiteImage,
  TEXT_IDS,
} from '@webrcade/app-common';

export class EmulatorPauseScreen extends Component {
  constructor() {
    super();
    this.state = {
      mode: this.ModeEnum.PAUSE,
    };
  }

  ModeEnum = {
    PAUSE: 'pause',
    CONTROLS: 'controls',
    GENPLUSGX_SETTINGS: 'genplusgx-settings',
  };

  ADDITIONAL_BUTTON_REFS = [React.createRef(), React.createRef()];

  render() {
    const { ADDITIONAL_BUTTON_REFS, ModeEnum } = this;
    const {
      appProps,
      closeCallback,
      emulator,
      exitCallback,
      isEditor,
      isStandalone,
    } = this.props;
    const { mode } = this.state;

    const gamepad = <GamepadControlsTab />;
    const gamepadLabel = Resources.getText(TEXT_IDS.GAMEPAD_CONTROLS);

    return (
      <>
        {mode === ModeEnum.PAUSE ? (
          <CustomPauseScreen
            appProps={appProps}
            closeCallback={closeCallback}
            exitCallback={exitCallback}
            isEditor={isEditor}
            isStandalone={isStandalone}
            additionalButtonRefs={ADDITIONAL_BUTTON_REFS}
            additionalButtons={[
              <PauseScreenButton
                imgSrc={GamepadWhiteImage}
                buttonRef={ADDITIONAL_BUTTON_REFS[0]}
                label={Resources.getText(TEXT_IDS.VIEW_CONTROLS)}
                onHandlePad={(focusGrid, e) =>
                  focusGrid.moveFocus(e.type, ADDITIONAL_BUTTON_REFS[0])
                }
                onClick={() => {
                  this.setState({ mode: ModeEnum.CONTROLS });
                }}
              />,
              <PauseScreenButton
                imgSrc={SettingsAppWhiteImage}
                buttonRef={ADDITIONAL_BUTTON_REFS[1]}
                label="Sega CD Settings"
                onHandlePad={(focusGrid, e) =>
                  focusGrid.moveFocus(e.type, ADDITIONAL_BUTTON_REFS[1])
                }
                onClick={() => {
                  this.setState({ mode: ModeEnum.GENPLUSGX_SETTINGS });
                }}
              />,
            ]}
          />
        ) : null}
        {mode === ModeEnum.CONTROLS ? (
          <EditorScreen
            onClose={closeCallback}
            tabs={[
              {
                image: GamepadWhiteImage,
                label: gamepadLabel,
                content: gamepad,
              },
              {
                image: KeyboardWhiteImage,
                label: Resources.getText(TEXT_IDS.KEYBOARD_CONTROLS),
                content: <KeyboardControlsTab />,
              },
            ]}
          />
        ) : null}
        {mode === ModeEnum.GENPLUSGX_SETTINGS ? (
          <GenPlusGxSettingsEditor
            emulator={emulator}
            onClose={closeCallback}
          />
        ) : null}
      </>
    );
  }
}
