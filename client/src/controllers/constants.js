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

const VIEW_TYPE = {
  FIT: 'Model Fit',
  ERROR: 'Error Messages'
}

const SCHEMA = {
  POINT: 'point_estimate',
  FIT: 'fit',
  P: 'p_value',
  STDERR: 'standard_error',
  ANNOTATE: 'annotation',
  UNC: 'uncertainty',
  NUL: 'null_distribution',
  WEIGHT: 'stacking_weight',
  RAW: 'prediction'
}

const RUN_STATUS = {
  EMPTY: 'New',
  RUNNING: 'Running',
  STOPPING: 'Stopping',
  STOPPED: 'Stopped',
  DONE: 'Done'
}

const DTYPE = {
  POINT: 'float',
  FIT: 'float',
  P: 'float',
  STDERR: 'float',
  ANNOTATE: 'string',
  UNC: 'float',
  NUL: 'float',
  WEIGHT: 'float'
}

const SENSITIVITY = {
  F: 'f',
  KS: 'ks',
  AD: 'ad'
}

const sign = 0

export {UNC_TYPE, COLOR_TYPE, VIEW_TYPE, SCHEMA, DTYPE, RUN_STATUS,
  SENSITIVITY, sign}
