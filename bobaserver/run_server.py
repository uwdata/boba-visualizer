# -*- coding: utf-8 -*-

import click
import os
import pandas as pd
import numpy as np
from scipy import stats
from bobaserver import app
from .util import read_json, read_key_safe, print_fail, print_warn, remove_na


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

    # check sensitivity flag
    sen = read_key_safe(vis, ['sensitivity'], 'ks')
    if sen not in ('f', 'ks'):
        msg = f'Invalid sensitivity flag "{sen}". Available values:\n'
        msg += ' - "f": algorithm based on the F-test\n'
        msg += ' - "ks": algorithm based on Kolmogorov–Smirnov statistic'
        print_help(msg)

    # store meta data
    app.schema = schema
    app.decisions = read_key_safe(res, ['decisions'], {})
    app.visualizer = {
        "sensitivity": sen,
        "labels": read_key_safe(vis, ['labels'], {}),
        "graph": read_key_safe(res, ['graph'], {})
    }


def read_summary ():
    """ read summary.csv """
    fn = os.path.join(app.data_folder, 'summary.csv')
    smr = pd.read_csv(fn, na_filter=False)
    smr['uid'] = smr.apply(lambda r: r.name + 1, axis=1).astype(int)
    return smr


def read_results (field, dtype=str, diagnostics=True):
    """ read a result field and join with summary """
    # read summary.csv
    smr = read_summary()

    # read the result file
    info = app.schema[field]
    fn = os.path.join(app.data_folder, info['file'])
    df = pd.read_csv(fn, na_filter=False)
    col = info['field']

    # join
    df = pd.merge(smr, df[['uid', col]], on='uid')

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

    # check NaN
    for d in res:
        if np.isnan(res[d]):
            print_fail('ERROR: cannot compute sensitivity')
            print(f'F-test returns NaN value for decision "{d}"')
            exit(1)

    return res


def sensitivity_ks (df, col):
    """ compute Kolmogorov-Smirnov statistic """
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
    return res


def cal_sensitivity():
    """ Compute sensitivity """
    # read the prediction and join with summary
    df = read_results('point_estimate', dtype=float)
    col = app.schema['point_estimate']['field']

    # compute one-way F-test
    f = sensitivity_f_test(df, col)

    # compute Kolmogorov-Smirnov statistic
    ks = sensitivity_ks(df, col)

    # save
    app.sensitivity = {'f': f, 'ks': ks}


@click.command()
@click.option('--in', '-i', 'input', default='.', show_default=True,
              help='Path to the input directory')
@click.option('--port', default=8080, show_default=True,
              help='The port to bind the server to')
@click.option('--host', default='0.0.0.0', show_default=True,
              help='The interface to bind the server to')
@click.version_option()
def main(input, port, host):
    check_path(input)
    app.data_folder = os.path.realpath(input)
    read_meta()
    cal_sensitivity()

    s_host = '127.0.0.1' if host == '0.0.0.0' else host
    msg = """\033[92m
    Server started!
    Navigate to http://{0}:{1}/ in your browser
    Press CTRL+C to stop\033[0m""".format(s_host, port)
    print(msg)

    app.run(host= host, port=f'{port}')


if __name__ == '__main__':
    main()
