# -*- coding: utf-8 -*-

import click
import os
import pandas as pd
import numpy as np
from scipy import stats
from server import app
from .util import read_json, read_key_safe


def check_path(p):
    """Check if the path exists"""
    if not os.path.exists(p):
        msg = 'Error: Path "{}" does not exist.'.format(p)
        print_help(msg)


def print_help(err=''):
    """Show help message and exit."""
    ctx = click.get_current_context()
    click.echo(ctx.get_help())

    if err:
        click.echo('\n' + err)
    ctx.exit()


def read_meta():
    """ Read overview.json and store the meta data. """
    fn = os.path.join(app.data_folder, 'overview.json')
    err, res = read_json(fn)
    if (err):
        print_help(err)
    app.visualizer = read_key_safe(res, ['visualizer'], {})
    app.decisions = read_key_safe(res, ['decisions'], {})


def cal_sensitivity():
    """ Compute sensitivity """
    # read summary.csv
    fn = os.path.join(app.data_folder, 'summary.csv')
    smr = pd.read_csv(fn, na_filter=False)
    smr['uid'] = smr.apply(lambda r: r.name + 1, axis=1).astype(int)

    # read the prediction and join with summary
    fn = read_key_safe(app.visualizer, ['agg_plot', 'data'], 'pred.csv')
    fn = os.path.join(app.data_folder, fn)
    df = pd.read_csv(fn, na_filter=False)
    col = read_key_safe(app.visualizer, ['agg_plot', 'x_field'], 'diff')
    df = pd.merge(smr, df[['uid', col]], on='uid')

    # compute one-way F-test
    res = {}
    x_mean = df[col].mean()
    for d in app.decisions:
        dec = d['var']
        groups = []
        for opt in d['options']:
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

        res[dec] = ms_b / ms_w

    app.sensitivity_f = res

    # compute Kolmogorov-Smirnov statistic
    res = {}
    for d in app.decisions:
        dec = d['var']
        groups = []
        for opt in d['options']:
            groups.append(df.loc[df[dec] == opt][col].to_numpy())

        kss = []
        for i in range(len(groups)):
            for j in range(i + 1, len(groups)):
                ks = stats.ks_2samp(groups[i], groups[j])
                kss.append(ks.statistic)  # ks.pvalue gives p-value

        res[dec] = np.median(kss)  # median KS stat

    app.sensitivity_ks = res


@click.command()
@click.option('--in', '-i', 'input', default='.', show_default=True,
              help='Path to the input directory')
def main(input):
    check_path(input)
    app.data_folder = os.path.realpath(input)
    read_meta()
    cal_sensitivity()

    msg = """\033[92m
    Server started!
    Navigate to http://127.0.0.1:8080/ in your browser
    Press CTRL+C to stop\033[0m"""
    print(msg)

    app.run(host= '0.0.0.0', port='8080')


if __name__ == '__main__':
    main()
