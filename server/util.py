# -*- coding: utf-8 -*-
import os
import csv
import json


class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def print_fail(msg):
    print(Colors.FAIL + msg + Colors.ENDC)


def print_warn(msg):
    print(Colors.WARNING + msg + Colors.ENDC)


def check_path(fn):
    """ Check if path exists """
    if not os.path.exists(fn):
        msg = 'Error: {} does not exist.'.format(fn)
        print_fail(msg)
        return {'status': 'fail', 'message': msg}


def read_csv(fn, row_start=1):
    """ Read csv with path check, discarding (optionally) the first row """
    err = check_path(fn)
    if err:
        return err, None

    res = []
    with open(fn, newline='') as f:
        reader = csv.reader(f, delimiter=',')
        for row in reader:
            res.append(row)
    return err, res[row_start:]


def read_json(fn):
    """ Read a JSON file with path check"""
    err = check_path(fn)
    if err:
        return err, None

    with open(fn, 'rb') as f:
        res = json.load(f)

    return err, res
