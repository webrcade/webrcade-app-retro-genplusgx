import { ControlsTab } from '@webrcade/app-common';

export class GamepadControlsTab extends ControlsTab {
  render() {
    return [
      this.renderControl('start', 'Start'),
      this.renderControl('select', 'Mode'),
      this.renderControl('dpad', 'Move'),
      this.renderControl('lanalog', 'Move'),
      this.renderControl('x', 'A'),
      this.renderControl('a', 'B'),
      this.renderControl('b', 'C'),
      this.renderControl('lbump', 'X'),
      this.renderControl('y', 'Y'),
      this.renderControl('rbump', 'Z'),
    ];
  }
}

export class KeyboardControlsTab extends ControlsTab {
  render() {
    return [
      this.renderKey('Enter', 'Start'),
      this.renderKey('ShiftRight', 'Mode'),
      this.renderKey('ArrowUp', 'Up'),
      this.renderKey('ArrowDown', 'Down'),
      this.renderKey('ArrowLeft', 'Left'),
      this.renderKey('ArrowRight', 'Right'),
      this.renderKey('KeyA', 'A'),
      this.renderKey('KeyZ', 'B'),
      this.renderKey('KeyX', 'C'),
      this.renderKey('KeyQ', 'X'),
      this.renderKey('KeyS', 'Y'),
      this.renderKey('KeyW', 'Z'),
    ];
  }
}
