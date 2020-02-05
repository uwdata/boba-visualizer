# -*- coding: utf-8 -*-

import click
import os
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


@click.command()
@click.option('--in', '-i', 'input', default='.', show_default=True,
              help='Path to the input directory')
def main(input):
    check_path(input)
    app.data_folder = os.path.realpath(input)
    read_meta()

    msg = """\033[92m
    Server started!
    Navigate to http://127.0.0.1:8080/ in your browser
    Press CTRL+C to stop\033[0m"""
    print(msg)

    app.run(host= '0.0.0.0', port='8080')


if __name__ == '__main__':
    main()
