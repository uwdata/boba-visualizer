import pandas as pd
import numpy as np
import os
from bobaserver import app
from .bobastats import sensitivity
from .util import print_warn, remove_na


def get_decision_list ():
  # get a list of decision names
  return sorted([d['var'] for d in app.decisions])


def get_decision_df ():
  # get the summary.csv without any non-decision columns
  dec = [d['var'] for d in app.decisions]
  return read_summary()[dec]


def get_field_name (field):
  # get the column name of the field in df
  return app.schema[field]['field']


def read_summary ():
  """ read summary.csv """
  if hasattr(app, 'summary'):
    return app.summary

  fn = os.path.join(app.data_folder, 'summary.csv')
  smr = pd.read_csv(fn, na_filter=False)
  smr['uid'] = smr.apply(lambda r: r.name + 1, axis=1).astype(int)
  return smr


def read_results (field, dtype=str):
  """ read a result field """
  # read the result file
  info = app.schema[field]
  fn = os.path.join(app.data_folder, info['file'])
  df = pd.read_csv(fn, na_filter=False)
  col = info['field']
  return df[['uid', col]]


def read_results_with_summary (field, dtype=str, diagnostics=True):
  """ read a result field and join with summary """
  # read results and join with summary
  smr = read_summary()
  results = read_results(field, dtype)
  col = app.schema[field]['field']
  df = pd.merge(smr, results, on='uid')

  # convert data type, remove Inf and NA
  n_df = df.shape[0]
  df = remove_na(df, col, dtype)

  # print warning messages
  if diagnostics:
    total = smr.shape[0]
    n_failed = total - n_df
    n_na = n_df - df.shape[0]
    if n_failed > 0 or n_na > 0:
      print_warn(f'Data quality warning: out of {total} universes, ')
      if n_failed > 0:
        percent = round(n_failed / total * 100, 1)
        print_warn(f' * {n_failed} universes ({percent}%) failed to run')
      if n_na > 0:
        percent = round(n_na / total * 100, 1)
        print_warn(f' * {n_na} {field} ({percent}%) contains Inf or NaN value')

  return df


def sensitivity_f_test (df, col):
    """ Compute one-way F-test to estimate decision sensitivity """
    # compute one-way F-test
    res = {d['var']: sensitivity.sensitivity_f(df, d['var'], d['options'],
        col) for d in app.decisions}

    # check NaN
    for d in res:
        if np.isnan(res[d]):
            print_fail('ERROR: cannot compute sensitivity')
            print(f'F-test returns NaN value for decision "{d}"')
            exit(1)

    return res


def sensitivity_ks (df, col):
    """ compute Kolmogorov-Smirnov statistic """
    return {d['var']: sensitivity.sensitivity_ks(df, d['var'], d['options'],
        col) for d in app.decisions}


def sensitivity_ad (df, col):
    """ use k-samples Anderson-Darling test to compute sensitivity """
    return {d['var']: sensitivity.sensitivity_ad(df, d['var'], d['options'],
         col)[0] for d in app.decisions}


def ad_wrapper (df, dec, col):
  """
  Compute sensitvity for a given decision, while checking for minimum sample
  size requirements. Returns NaN if the check or the AD test fails.

  Returns: (test statistics, p-value)
  """
  # each option should have some samples for the k-samples AD test to work
  min_group_size = 3

  # ensure that each level has at least n samples
  groups = df.groupby(dec).count()
  n_pass = groups[groups[col] >= min_group_size].shape[0]
  if n_pass < groups.shape[0]:
    return np.nan, np.nan

  # we are using the options in the current df, ignoring missing levels
  options = df.groupby(dec).groups.keys()
  try:
    s, p = sensitivity.sensitivity_ad(df, dec, options, col)
    return s, p
  except (ValueError, IndexError):
    return np.nan, np.nan


def cal_sensitivity(df=None):
    """ Compute sensitivity """
    # read the prediction and join with summary
    if df is None:
      df = read_results_with_summary('point_estimate', dtype=float)
    col = app.schema['point_estimate']['field']
    method = app.visualizer['sensitivity']

    if method == 'f':
        # one-way F-test
        score = sensitivity_f_test(df, col)
    if method == 'ks':
        # Kolmogorov-Smirnov statistic
        score = sensitivity_ks(df, col)
    if method == 'ad':
        # k-samples Anderson-Darling test
        score = sensitivity_ad(df, col)

    return score
