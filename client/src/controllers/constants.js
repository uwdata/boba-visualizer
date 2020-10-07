const UNC_TYPE = {
  AGG: 'Aggregated',
  PDF: 'PDFs',
  CDF: 'CDFs'
}

const COLOR_TYPE = {
  P: 'P-value',
  SIGN: 'Sign',
  FIT: 'Model Fit',
  CUSTOM: 'Custom'
}

const SCHEMA = {
  POINT: 'point_estimate',
  FIT: 'fit',
  P: 'p_value',
  ANNOTATE: 'annotation',
  UNC: 'uncertainty',
  NUL: 'null_distribution',
  WEIGHT: 'stacking_weight'
}

const DTYPE = {
  POINT: 'float',
  FIT: 'float',
  P: 'float',
  ANNOTATE: 'string',
  UNC: 'float',
  NUL: 'float',
  WEIGHT: 'float'
}

const sign = 0

export {UNC_TYPE, COLOR_TYPE, SCHEMA, DTYPE, sign}
