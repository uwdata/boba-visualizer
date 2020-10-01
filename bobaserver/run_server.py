# -*- coding: utf-8 -*-

import click
import os
import pandas as pd
import numpy as np
from scipy import stats
from bobaserver import app
from .util import read_json, read_key_safe


def check_path(p, more=''):
    """Check if the path exists"""
    if not os.path.exists(p):
        msg = 'Error: {} does not exist.'.format(p)
        print_help(msg + more)


def check_required_field(obj, key, prefix=''):
    """Check if a required field is in obj."""
    if key not in obj:
        err = 'Error: cannot find required field "{}" in {}'.format(key, obj)
        print_help(prefix + err)

def print_help(err=''):
    """Show help message and exit."""
    ctx = click.get_current_context()
    click.echo(ctx.get_help())

    if err:
        click.secho('\n' + err, fg='red')
    ctx.exit()


def read_meta():
    """ Read overview.json, verify, and store the meta data. """
    fn = os.path.join(app.data_folder, 'overview.json')
    err, res = read_json(fn)
    if (err):
        print_help(err['message'])
    
    # check summary.csv
    fn = os.path.join(app.data_folder, 'summary.csv')
    check_path(fn)

    # check if files exist in visualizer
    vis = read_key_safe(res, ['visualizer'], {})
    fs = read_key_safe(vis, ['files'], [])
    lookup = {}
    prefix = 'In parsing visualizer.files in overview.json:\n'
    for f in fs:
        check_required_field(f, 'id', prefix)
        check_required_field(f, 'path', prefix)
        f['multi'] = read_key_safe(f, ['multi'], False)
        if not f['multi']:
            check_path(os.path.join(app.data_folder, f['path']))
        lookup[f['id']] = f

    # read schema and join file
    schema = read_key_safe(vis, ['schema'], {})
    prefix = 'In parsing visualizer.schema in overview.json:\n'
    check_required_field(schema, 'point_estimate', prefix)
    for key in schema:
        s = schema[key]
        check_required_field(s, 'file', prefix)
        # check_required_field(s, 'field', prefix)
        # todo: verify if file is valid CSV and if field exist in file
        fid = s['file']
        if fid not in lookup:
            msg = 'In parsing visualizer.schema in overview.json:\n'
            msg += '{}\n'.format(s)
            msg += 'Error: file id "{}" is not defined.'.format(fid)
            print_help(msg)
        s['file'] = lookup[fid]['path']
        s['multi'] = lookup[fid]['multi']
        s['name'] = key

    # store meta data
    app.schema = schema
    app.decisions = read_key_safe(res, ['decisions'], {})
    app.visualizer = {
        "labels": read_key_safe(vis, ['labels'], {}),
        "graph": read_key_safe(res, ['graph'], {})
    }


def cal_sensitivity():
    """ Compute sensitivity """
    # read summary.csv
    fn = os.path.join(app.data_folder, 'summary.csv')
    smr = pd.read_csv(fn, na_filter=False)
    smr['uid'] = smr.apply(lambda r: r.name + 1, axis=1).astype(int)

    # read the prediction and join with summary
    info = app.schema['point_estimate']
    fn = os.path.join(app.data_folder, info['file'])
    df = pd.read_csv(fn, na_filter=False)
    col = info['field']
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
