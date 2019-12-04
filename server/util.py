# -*- coding: utf-8 -*-
import os
import csv


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


def read_csv(fn, row_start=1):
    """ Read csv, discarding (optionally) the first row """
    res = []
    if not os.path.exists(fn):
        return res
    with open(fn, newline='') as f:
        reader = csv.reader(f, delimiter=',')
        for row in reader:
            res.append(row)
    return res[row_start:]
