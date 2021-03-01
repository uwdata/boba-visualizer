import numpy as np
from scipy import stats
from time import perf_counter

class bootstrap():
  """ 
  This class implements the bootstrap procedure and offers 3 type of CIs:
  basic, percentile, and bias-corrected and accelerated (BCa).
  """

  def __init__(self, func, ci_type='percentile', n=200, verbose=False):
    """
    Parameters:
     - n: bootstrap how many times
     - func: function to compute the statistic of interest
     - ci_type: one of ['basic', 'percentile', 'bca', 'bc']
     - verbose: if true, print elapsed time
    """
    self.n = n
    self.stat = func
    self.ci_type = ci_type
    self.verbose = verbose


  def fit(self, data, *args, **kwargs):
    self.fit_with_probability(data, None, *args, **kwargs)


  def fit_with_probability(self, data, p, *args, **kwargs):
    """
    Parameters:
     - data: the sample array to perform bootstrap on
     - p: probilities associated with each entry in data. If unspecified, draw
       uniformly when resampling.
    """
    time_start = perf_counter()

    # sample statistics
    self.sample_stat = self.stat(data, *args, **kwargs)

    # fit bootstrap
    self.bootstrap_stats = []
    for i in range(self.n):
      d = np.random.choice(data, size=len(data), replace=True, p=p)
      self.bootstrap_stats.append(self.stat(d, *args, **kwargs))

    # jackknife
    self.jack_stats = []
    if self.ci_type == 'bca':
      for i in range(len(data)):
        d = np.delete(data, i)
        self.jack_stats.append(self.stat(d, *args, **kwargs))

    # elapsed time
    if self.verbose:
      print(f'Bootstrap time: {perf_counter() - time_start} seconds')


  def get_ci(self, alpha=0.05):
    """ Get the 100(1 - alpha)% confidence interval"""
    # drop NaN in the bootstrap statistics array
    arr = self._handle_null(self.bootstrap_stats)
    if not len(arr):
      return np.nan, np.nan

    if self.ci_type == 'basic':
      return self._get_ci_basic(arr, alpha)
    elif self.ci_type == 'bca':
      return self._get_ci_bca(arr, alpha)
    elif self.ci_type == 'bc':
      return self._get_ci_bc(arr, alpha)
    else:
      return self._get_ci_percentile(arr, alpha)


  def _get_ci_bc(self, arr, alpha):
    """ BCa bootstrap CI with the acceleration term set to 0 """
    # bias-correction factor
    z0 = stats.norm.ppf(np.mean(np.asarray(arr) < self.sample_stat))

    # the CI
    ql, qu = stats.norm.ppf(alpha / 2), stats.norm.ppf(1 - alpha / 2)
    a1 = stats.norm.cdf(z0 * 2 + ql)
    a2 = stats.norm.cdf(z0 * 2 + qu)
    return np.quantile(arr, a1), np.quantile(arr, a2)


  def _get_ci_bca(self, arr, alpha):
    """ Bias corrected and accelerated bootstrap CI """
    # bias-correction factor
    z0 = stats.norm.ppf(np.mean(np.asarray(arr) < self.sample_stat))
    z0 = np.sign(z0) * 5 if np.isinf(z0) else z0  # handle infinity

    # acceleration factor
    jack = np.asarray(self._handle_null(self.jack_stats))
    if not len(jack):
      a_hat = 0
    else:
      nom = np.sum((jack.mean() - jack)**3)
      denom = 6 * np.sum((jack.mean() - jack)**2)**1.5
      a_hat = nom / denom

    # the CI
    ql, qu = stats.norm.ppf(alpha / 2), stats.norm.ppf(1 - alpha / 2)
    a1 = stats.norm.cdf(z0 + (z0 + ql) / (1 - a_hat * (z0 + ql)))
    a2 = stats.norm.cdf(z0 + (z0 + qu) / (1 - a_hat * (z0 + qu)))
    return np.quantile(arr, a1), np.quantile(arr, a2)


  def _get_ci_basic(self, arr, alpha):
    # basic CI
    lower = 2 * self.sample_stat - np.quantile(arr, 1 - alpha / 2)
    upper = 2 * self.sample_stat -np.quantile(arr, alpha / 2)
    return lower, upper


  def _get_ci_percentile(self, arr, alpha):
    # percentile based CI
    lower = np.quantile(arr, alpha / 2)
    upper = np.quantile(arr, 1 - alpha / 2)
    return lower, upper


  def _handle_null (self, arr):
    # drop NaN in the bootstrap/jackknife statistics array
    return [t for t in arr if not np.isnan(t)]
