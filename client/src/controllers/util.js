import * as d3 from 'd3'
import _ from 'lodash'

class Util {
  constructor () {
    // canvas context for calculating text width
    this._context = null
  }

  wrapText (text, width, font) {
    let l = this.getTextWidth(text, font)
    if (l < width) {
      return [text]
    }
    let words = text.split(' ')
    let res = ['']
    let row = 0
    let rl = 0
    _.each(words, (word) => {
      let wl = this.getTextWidth(word + ' ')
      if (rl + wl > width) {
        res.push(word)
        rl = 0
        row += 1
      } else {
        rl += wl
        res[row] += ' ' + word
      }
    })
    return res
  }

  clipText (text, width, font) {
    let l = this.getTextWidth(text, font)
    let i = Math.floor(width / l * text.length) - 4
    return l > width ? text.substr(0, i) + ' ...' : text
  }

  getTextWidth (text, font) {
    if (!this._context) {
      this._context = document.createElement('canvas').getContext('2d')
    }

    this._context.font = font
    return this._context.measureText(text).width
  }

  kde (kernel, X) {
    return (V) => {
      return X.map((x) => [x, d3.mean(V, (v) => kernel(x - v))])
    }
  }

  epanechnikov (k) {
    return (v) => Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0
  }
}

export default Util
