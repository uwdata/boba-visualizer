import * as d3 from 'd3'

class Util {
  constructor () {
    // canvas context for calculating text width
    this._context = null
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
