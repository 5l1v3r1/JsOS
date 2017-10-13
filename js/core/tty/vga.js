// Copyright 2014-present runtime.js project authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

/* global $$ */

const vgaOld = require('./vga-old');

const fontLib = require('./font8x16');
const font = fontLib.font;
const fw = fontLib.width;
const fh = fontLib.height;

const colorScheme = require('./colorscheme');

const graphicsEnabled = false;

const w = 80;
const h = 25;
const len = w * h;
/*const buf = driverUtils.physicalMemory(0xb8000, len * 2).buffer();
const b = new Uint8Array(buf);*/

exports.WIDTH = w;
exports.HEIGHT = h;

const color = {
  BLACK: 0,
  BLUE: 1,
  GREEN: 2,
  CYAN: 3,
  RED: 4,
  MAGENTA: 5,
  BROWN: 6,
  LIGHTGRAY: 7,
  DARKGRAY: 8,
  LIGHTBLUE: 9,
  LIGHTGREEN: 10,
  LIGHTCYAN: 11,
  LIGHTRED: 12,
  LIGHTMAGENTA: 13,
  YELLOW: 14,
  WHITE: 15,
};

exports.color = color;

function getColor(fg, bg) {
  return (((bg & 0xF) << 4) + (fg & 0xF)) >>> 0;
}

function setCharOffset(u8, offset, char, fg, bg) {
  if (offset < 0 || offset >= w * h) {
    throw new Error('vga error: offset is out of bounds');
  }

  /* eslint-disable no-param-reassign */
  u8[offset * 2] = char.charCodeAt(0);
  u8[(offset * 2) + 1] = getColor(fg, bg);
  /* eslint-enable no-param-reassign */
}

function setCharXY(u8, x, y, char, fg, bg) {
  if (x < 0 || x >= w) {
    throw new Error('vga error: x is out of bounds');
  }

  if (y < 0 || y >= h) {
    throw new Error('vga error: y is out of bounds');
  }

  const offset = (y * w) + x;
  setCharOffset(u8, offset, char, fg >>> 0, bg >>> 0);
}

function testColor(value) {
  if ((value >>> 0) !== value) {
    throw new Error('invalid color value');
  }
}

class VGABuffer {
  constructor() {
    this.b = new Uint8Array(len * 2);
  }
  setXY(x, y, char, fg, bg) {
    testInstance(this);
    testColor(fg);
    testColor(bg);
    setCharXY(this.b, x, y, String(char), fg, bg);
  }
  setOffset(offset, char, fg, bg) {
    testInstance(this);
    testColor(fg);
    testColor(bg);
    setCharOffset(this.b, offset, String(char), fg, bg);
  }
  clear(bg) {
    testInstance(this);
    testColor(bg);
    for (let i = 0; i < w * h; ++i) {
      setCharOffset(this.b, i, ' ', bg, bg);
    }
  }
  scrollUp(bg) {
    testInstance(this);
    testColor(bg);
    this.b.set(this.b.subarray(w * 2, w * h * 2));
    for (let t = 0; t < w; ++t) {
      setCharXY(this.b, t, h - 1, ' ', bg, bg);
    }
  }
  scrollDown(bg) {
    // testInstance(this);
    // testColor(bg);
    // this.b.set(this.b.subarray(w * 2, w * h * 2));
    // for (let t = 0; t < w; ++t) {
    //   setCharXY(this.b, t, h + 1, ' ', bg, bg);
    // }
    return debug('Not implemented!');
  }
}

function testInstance(obj) {
  if (!(obj instanceof VGABuffer)) {
    throw new Error('VGABuffer instance required');
  }
}

exports.draw = (drawbuf) => {
  testInstance(drawbuf);
  if (!global.$$ || !global.$$.graphics || !global.$$.graphics.graphicsAvailable()) {
    vgaOld.draw(drawbuf);
  } else {
    if (!graphicsEnabled) {
      $$.graphics.enableGraphics(640, 400, 24);
    }
    const dbuf = $$.graphics.displayBuffer;
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const offset = ((y * w) + x) * 2;
        const colorByte = drawbuf.b[offset + 1];
        const bg = (colorByte >> 4) & 0xF;
        const fg = colorByte & 0xF;
        const charCode = drawbuf.b[offset];
        for (let fy = 0; fy < fh; fy++) {
          const row = font[charCode * fh + fy];
          for (let fx = 0; fx < fw; fx++) {
            const state = (row >> (7 - fx)) & 1;
            const px = x * fw + fx;
            const py = y * fh + fy;
            //const dboffset = ((y * w * fh + fy) + x * fw * fx) * 3;
            const dboffset = (px + py * w * fw) * 3;
            dbuf[dboffset + 2] = (state ? colorScheme[fg] : colorScheme[bg])[0];// * 255;
            dbuf[dboffset + 1] = (state ? colorScheme[fg] : colorScheme[bg])[1];// * 255;
            dbuf[dboffset] = (state ? colorScheme[fg] : colorScheme[bg])[2];// * 255;
          }
        }
      }
    }
  }
};

exports.allocBuffer = () => new VGABuffer();

// Take ownership of the display
__SYSCALL.stopVideoLog();