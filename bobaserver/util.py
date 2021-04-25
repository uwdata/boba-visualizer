# -*- coding: utf-8 -*-
import os
import csv
import json
import pandas as pd
import numpy as np


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
    print(Colors.OKBLUE + msg + Colors.ENDC)


def check_path(fn):
    """ Check if path exists """
    if not os.path.exists(fn):
        msg = 'Error: {} does not exist.'.format(fn)
        return {'status': 'fail', 'message': msg}


def read_csv(fn, row_start=1):
    """ Read csv with path check, discarding (optionally) the first row """
    err = check_path(fn)
    if err:
        return err, None

    res = []
    with open(fn, 'r', newline='') as f:
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
        try:
            res = json.load(f)
            return None, res
        except json.JSONDecodeError:
            msg = 'Cannot parse the JSON file {}'.format(fn)
            err = {'status': 'fail', 'message': msg}
            return err, None

def write_json(data, fn, nice=False):
    param = {'indent': 4, 'sort_keys': True} if nice else {}
    with open(fn, 'w', encoding='utf-8') as f:
        json.dump(data, f, **param)


def read_key_safe(obj, keys, default):
    """ Recursively check if key is in obj and return the value.
    Otherwise, return default. """
    for key in keys:
        if key in obj:
            obj = obj[key]
        else:
            return default
    
    return obj

def group_by(lst, func):
    res = {}
    for item in lst:
        k = func(item)
        if k in res:
            res[k].append(item)
        else:
            res[k] = [item]
    return res

def remove_na (df, col, dtype=str):
    """ convert a column in a dataframe to a data type, and remove any rows
    with Inf or NA values in this column"""

    if dtype != str:
        dc = 'float' if dtype == float else 'integer'
        df[col] = pd.to_numeric(df[col], errors='coerce', downcast=dc)

    # remove Inf and NA
    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.dropna(subset=[col])

    return df
