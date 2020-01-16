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
}

export default Util
