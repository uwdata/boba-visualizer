from scipy import stats
import numpy as np
import warnings


def sensitivity_ad (df, dec, options, col):
  """ use the k-sample Anderson-Darling test to compute sensitivity """
  if len(options) < 2:
    return 0, 1

  groups = []
  for opt in options:
      groups.append(df.loc[df[dec] == opt][col].tolist())

  # groupby is incorrect because a decision can be omitted due to dependency
  # the decision column would have empty value in summary.csv
  # groups = df.groupby(dec)[col].apply(list).tolist()

  with warnings.catch_warnings():
    # suppress the warning "p-value capped: true value larger than 0.25"
    warnings.simplefilter('ignore')

    # run the test
    ad = stats.anderson_ksamp(groups)

  # normalized test statistics and p-value
  return ad.statistic, ad.significance_level


def sensitivity_ks (df, dec, options, col):
  """ compute Kolmogorov-Smirnov statistic """
  if len(options) < 2:
    return 0

  groups = []
  for opt in options:
      groups.append(df.loc[df[dec] == opt][col].to_numpy())

  kss = []
  for i in range(len(groups)):
      for j in range(i + 1, len(groups)):
          ks = stats.ks_2samp(groups[i], groups[j])
          kss.append(ks.statistic)  # ks.pvalue gives p-value

  # median KS stat
  return np.median(kss)


def sensitivity_f (df, dec, options, col):
  """ Compute one-way F-test to estimate decision sensitivity """
  if len(options) < 2:
    return 0

  x_mean = df[col].mean()

  groups = []
  for opt in options:
      groups.append(df.loc[df[dec] == opt][['uid', col]])

  # ms between
  ms_b = 0
  for g in groups:
      ms_b += len(g) * (g[col].mean() - x_mean)**2
  ms_b /= len(groups) - 1

  # ms within
  ms_w = 0
  for g in groups:
      g_mean = g[col].mean()
      ms_w += sum((g[col] - g_mean)**2)
  ms_w /= len(df) - len(groups)

  return ms_b / ms_w
