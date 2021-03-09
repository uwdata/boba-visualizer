import pandas as pd
import numpy as np
import os
import re
from bobaserver import app
from .bobastats import sensitivity
from .util import print_warn, remove_na, group_by


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


def read_results_batch (field_list):
  """ read multiple fields at once, minimizing file IO """
  fields = [app.schema[f] for f in field_list if f in app.schema]
  groups = group_by(fields, lambda x: x['file'])

  res = None
  for fn in groups:
    df = pd.read_csv(os.path.join(app.data_folder, fn), na_filter=False)
    names = ['uid'] + [d['name'] for d in groups[fn]]
    cols = ['uid'] + [d['field'] for d in groups[fn]]
    df = df[cols].rename(columns=dict(zip(cols, names)))
    res = df if res is None else pd.merge(res, df, on='uid')

  return res


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


def cluster_error (df):
  """ Cluster the error messages based on heuristics """
  if df.shape[0] < 1:
    df['group'] = pd.Series(dtype=str)
    return df

  # regex
  pt_skip = r'^(there were|warning message)'
  pt_err = r'^error'

  # row-wise function
  def process_row (row):
    sentences = row['message'].split('\n')
    first = ''
    i = 0
    while i < len(sentences):
      # skip the rows with uninformative message, and group by the first row
      if re.search(pt_skip, sentences[i], flags=re.IGNORECASE) is None:
        first = sentences[i]
        break
      i += 1
    
    # look for 'error' if the exit code is non-zero
    if row['exit_code'] > 0:
      while i < len(sentences): # start from where we left off
        if re.search(pt_err, sentences[i], flags=re.IGNORECASE) is not None:
          first = sentences[i]
          break
        i += 1

    return first

  df['group'] = df.apply(process_row, axis=1)
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
