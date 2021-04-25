#!/usr/bin/env python
# -*- coding: utf-8 -*-

from setuptools import setup, find_packages

with open("README.rst", "r") as fh:
    readme = fh.read()

with open('HISTORY.rst') as history_file:
    history = history_file.read()

requirements = ['flask>=1.1.1', 'Click>=7.0', 'pandas>=1.0.1', 'scipy>=1.4.1',
    'boba>=1.1.1', 'flask-socketio>=5.0.0', 'apscheduler>=3.7.0',
    'scikit-learn>=0.24.1']

setup_requirements = []

test_requirements = []

setup(
    name='boba-visualizer',
    url='https://github.com/yyyliu/boba-visualizer',
    version='1.1.1',
    author="Yang Liu",
    author_email='yliu0@uw.edu',
    license="BSD license",
    description="Visualize multiverse outcomes",
    keywords='multiverse analysis',
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Intended Audience :: Science/Research',
        'License :: OSI Approved :: BSD License',
        'Natural Language :: English',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.6',
        'Programming Language :: Python :: 3.7',
    ],
    entry_points={
        'console_scripts': [
            'boba-server = bobaserver.run_server:main',
        ],
    },
    install_requires=requirements,
    long_description=readme + '\n\n' + history,
    packages=find_packages(include=['bobaserver', 'bobaserver.*']),
    setup_requires=setup_requirements,
    test_suite='tests',
    tests_require=test_requirements,
    zip_safe=False,
    package_dir={'bobaserver': 'bobaserver/'},
    package_data={'bobaserver': ['./dist/*']},
    include_package_data=True
)
