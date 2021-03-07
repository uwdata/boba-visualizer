import numpy as np
import pandas as pd
import itertools
from sklearn.linear_model import LinearRegression
from .bootstrap import bootstrap
from .sensitivity import ad_wrapper


def round_robin (df, n=50):
  """
  Round robin baseline (similar to stratified sampling).
  """
  df_snapshot = df
  df = df.copy()
  decs = list(df.columns)

  # weights
  weights = round_robin_weights(df)

  indices = []
  while len(indices) < n and df.shape[0] > 0:
    # in each round, go over each decision
    for dec in decs:
      gp = df.groupby(dec)
      # go over each option
      for opt in gp.groups.keys():
        # draw an index from all rows of the option
        row_ids = gp.groups[opt]
        drawn_id = row_ids[np.random.choice(len(row_ids))]
        indices.append(drawn_id)

        # remove from df so we are sampling without replacement
        df = df.drop(index=drawn_id)

  # convert to position-based index (iloc)
  indices = df_snapshot.index.get_indexer(indices)
  return indices, weights


def uniform (df, n=50):
  """
  Sample universes uniformly and return the sketching indices
  """
  indices = np.random.choice(df.shape[0], n, False)
  return indices, None


def sketching (df, n=50, interact=False):
  """
  Use a random sampling-based sketching algorithm without rescaling; 
  It is algorithm 2 on page 8. Return the normalized leverage scores
  and the sketching indices.
  """
  # one hot encoding
  X = one_hot_encode(df, interact=interact)

  # calculate leverage scores
  U, s, V = np.linalg.svd(X, full_matrices=False)
  l = np.dot(U, np.transpose(U)).diagonal()

  # get distribution and sample
  p = X.shape[1]
  dist = l / p
  indices = np.random.choice(X.shape[0], n, False, dist)

  return indices, dist


def round_robin_weights (df):
  """
  Compute the probability of drawing each universe in the first round of round
  robin. The probability is normalized (the sum of all universes is 1).

  Returns: a numpy array with the probability of drawing the universe where the
    index matches the index in the input df.
  """
  # a list of decisions
  decs = df.columns.tolist()
  df = df.copy().fillna('')
  df['dummy'] = 0

  # construct a lookup table for marginal probabilities
  lookup = {}
  for d in decs:
    gp = df.groupby(d)
    options = gp.groups.keys()
    lookup[d] = {opt: 1 / gp.count()['dummy'].loc[opt] for opt in options}

  # probability for a universe to be drawn in the first round
  def compute_prob (row):
    marginal = [lookup[d][row[d]] for d in decs]
    p = 0
    for i in range(1, len(decs)):
      v = np.sum([np.prod(c) for c in itertools.combinations(marginal, i)])
      p += v if i % 2 else (-v)
    return p

  weights = df.apply(compute_prob, axis=1).to_numpy()
  weights = weights / np.sum(weights) # normalize
  return weights


def get_outcome_mean (y, indices, weights=None, ignore_na=True):
  """
  Estimate outcome mean from sample.
    - weights: likelihood ratio f(x)/g(x) for importance sampling
  """
  arr = y[indices]
  if weights is not None:
    arr = weights[indices] * arr
  if ignore_na:
    arr = arr[~np.isnan(arr)]

  return np.mean(arr)


def bootstrap_outcome (df, COL, indices, weights=None, ignore_na=True):
  """
  Given a sample, compute the bootstrapped CI around outcome mean.

  Parameters:
   - df: multiverse dataframe
   - COL: the column in df
   - indices: sample index into the multiverse df
   - weights: importance sampling weights, if applicable
  """
  y = df[COL].to_numpy()
  mean = get_outcome_mean(y, indices, weights)

  # we will pass the index array to bootstrap, so here we adjust the func API
  stat = lambda idx, w: get_outcome_mean(y, idx, w)

  # bootstrap
  bs = bootstrap(stat, ci_type='percentile', n=200)
  bs.fit(indices, weights)  # sample uniformly, weighted mean
  lower, upper = bs.get_ci()

  return [mean, lower, upper]


def bootstrap_sensitivity (df, COL, indices, decs=None):
  """ Sensitivity and bootstrapped CI for all decisions. """
  if decs is None:
    # assuming all columns except "outcome" is a decision
    decs = list(df.columns)
    decs.remove(COL)

  # prep work
  out = []
  header = ['decision', 'score', 'p', 'score_lower', 'score_upper']
  # our bootstrap statisitc is the AD score of a decision
  stat = lambda idx, d: ad_wrapper(df.iloc[idx], d, COL)[0]

  # loop over all decisions
  for d in decs:
    # sample stats
    score, pval = ad_wrapper(df.iloc[indices], d, COL)
    row = [d, score, pval]

    # bootstrap
    if not np.isnan(score):
      bs = bootstrap(stat, ci_type='bc', n=200)
      bs.fit(indices, d)
      lower, upper = bs.get_ci()
      row += [lower, upper]

    # pad with NaN if we did not bootstrap
    row += [np.nan] * (len(header) - len(row))
    out.append(row)

  return pd.DataFrame(out, columns = header)


def one_hot_encode (df, interact=False):
  """
  Convert data into dummy coding for linear regression.
  Parameter:
   - interact: whether to add all possible two-way interactions
  """
  # a list of decisions
  decisions = df.columns.tolist()

  # helper function to create interaction terms
  REF_LEVEL = 'reference_level'
  ref = df.iloc[0]
  def add_interaction (row):
    # first manually replace reference level
    for dec in decisions:
      row[dec] = REF_LEVEL if row[dec] == ref[dec] else row[dec]

    # now add all two-way interactions
    for i in range(0, len(decisions)):
      for j in range(i + 1, len(decisions)):
        d1 = decisions[i]
        d2 = decisions[j]
        val = REF_LEVEL if (row[d1] == REF_LEVEL or row[d2] == REF_LEVEL) \
          else f'{row[d1]}_{row[d2]}'
        row[f'{d1}_{d2}'] = val

    return row

  # one-hot encoding
  if not interact:
    df = pd.get_dummies(df, columns = decisions, drop_first=True)
  else:
    df = df.apply(add_interaction, axis=1)
    cols = df.columns.tolist()
    df = pd.get_dummies(df, columns=cols)
    # now manually remove any columns with ref level
    cols = df.columns.tolist()
    cols = [c for c in cols if REF_LEVEL in c]
    df = df.drop(columns=cols, axis=1)

  # get X
  X = df.to_numpy()
  return X
