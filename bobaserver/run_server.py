# -*- coding: utf-8 -*-

import click
import os
import pandas as pd
import numpy as np
from boba.bobarun import BobaRun
from bobaserver import app, socketio, scheduler
from .util import read_json, write_json, read_key_safe, print_fail
import bobaserver.common as common


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

    # check file definition
    vis = read_key_safe(res, ['visualizer'], {})
    fs = read_key_safe(vis, ['files'], [])
    lookup = {}
    prefix = 'In parsing visualizer.files in overview.json:\n'
    for f in fs:
        check_required_field(f, 'id', prefix)
        check_required_field(f, 'path', prefix)
        f['multi'] = read_key_safe(f, ['multi'], False)
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
    sen = read_key_safe(vis, ['sensitivity'], 'ad')
    if sen not in ('f', 'ks', 'ad'):
        msg = f'Invalid sensitivity flag "{sen}". Available values:\n'
        msg += ' - "f": algorithm based on the F-test\n'
        msg += ' - "ks": algorithm based on Kolmogorov–Smirnov statistic'
        msg += ' - "ad": k-samples Anderson-Darling test'
        print_help(msg)

    # store meta data
    app.schema = schema
    app.summary = common.read_summary()
    app.decisions = read_key_safe(res, ['decisions'], {})
    app.visualizer = {
        "sensitivity": sen,
        "labels": read_key_safe(vis, ['labels'], {}),
        "graph": read_key_safe(res, ['graph'], {})
    }


def check_result_files ():
    """ check if result files exists """
    fn = os.path.join(app.data_folder, 'overview.json')
    err, res = read_json(fn)
    vis = read_key_safe(res, ['visualizer'], {})
    fs = read_key_safe(vis, ['files'], [])

    prefix = 'In parsing visualizer.files in overview.json:\n'
    for f in fs:
        multi = read_key_safe(f, ['multi'], False)
        if not multi:
            check_path(os.path.join(app.data_folder, f['path']))


@click.command()
@click.option('--in', '-i', 'input', default='.', show_default=True,
              help='Path to the input directory')
@click.option('--port', default=8080, show_default=True,
              help='The port to bind the server to')
@click.option('--host', default='0.0.0.0', show_default=True,
              help='The interface to bind the server to')
@click.option('--monitor', is_flag=True, help='Allow boba monitor')
@click.version_option()
def main(input, port, host, monitor):
    check_path(input)
    app.data_folder = os.path.realpath(input)

    read_meta()
    app.bobarun = BobaRun(app.data_folder)
    if not monitor:
        check_result_files()

        # compute sensitivity and write scores to file
        app.sensitivity = common.cal_sensitivity()
        d = {'method': app.visualizer['sensitivity'], 'scores': app.sensitivity}
        write_json(d, os.path.join(input, 'sensitivity.json'), nice=True)

    # print starting message
    s_host = '127.0.0.1' if host == '0.0.0.0' else host
    msg = """\033[92m
    Server started!
    Navigate to http://{0}:{1}/ in your browser
    Press CTRL+C to stop\033[0m""".format(s_host, port)
    print(msg)

    # start server
    scheduler.start()
    if monitor:
        socketio.run(app, host= host, port=f'{port}')
    else:
        app.run(host= host, port=f'{port}')


if __name__ == '__main__':
    main()
