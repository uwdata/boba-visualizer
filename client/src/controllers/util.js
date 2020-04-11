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

  moveToBack (sel) {
    return sel.each(function () {
      let fc = this.parentNode.firstChild
      if (fc) {
        this.parentNode.insertBefore(this, fc)
      }
    })
  }

  kde (kernel, X) {
    return (V) => {
      return X.map((x) => [x, d3.mean(V, (v) => kernel(x - v))])
    }
  }

  epanechnikov (k) {
    return (v) => Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0
  }

  /**
   * KDE which chooses range and bandwidth based on data.
   * @param u Input data array.
   * @param smooth Smoothing factor, larger makes smoother
   * @returns Array Density array.
   */
  kde_smart (u, smooth = 1) {
    u = _.sortBy(u)
    let n = u.length
    let step = (u[n - 1] - u[0]) / 40
    let rg = _.range(u[0] - step * 5, u[n - 1] + step * 5, step)
    let iqr = u[Math.floor(n * 0.75)] - u[Math.floor(n * 0.25)]
    let bw = 0.9 * iqr / 1.34 * Math.pow(n, 0.2)
    bw *= smooth

    let estimator = this.kde(this.epanechnikov(bw * 0.2), rg)
    return estimator(u)
  }

  toCdf (pdf) {
    if (pdf.length < 2) {
      return pdf
    }
    let step = pdf[1][0] - pdf[0][0]
    let sum = 0
    return _.map(pdf, (d) => {
      sum += step * d[1]
      return [d[0], sum]
    })
  }

  /**
   * Get quantiles of an array.
   * @param arr The array
   * @param q A number within [0, 1]
   */
  quantile (arr, q) {
    let sorted = _.sortBy(arr)
    let pos = (sorted.length - 1) * q
    let base = Math.floor(pos)
    let rest = pos - base

    if (base + 1 < sorted.length) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base])
    } else {
      return sorted[base]
    }
  }
}

export default Util
