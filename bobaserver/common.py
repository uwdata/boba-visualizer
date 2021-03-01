import pandas as pd
import os
from bobaserver import app
from .util import print_warn, remove_na


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
