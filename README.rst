===============
boba-visualizer
===============

The Boba Visualizer is a visual analysis interface for exploring multiverse outcomes.
It helps users explore how analytic decisions impact statistical estimates, inferential uncertainty, and model fit.
Watch the visualizer in action in this `video`_.

.. image:: https://yangliu.life/build/images/vis20-boba.png
  :alt: Teaser image

.. _video: https://youtu.be/NtHrUm4_kyw

Installation
============

You might download and install the latest version of this software from the
Python package index (PyPI)::

  pip install --upgrade boba-visualizer


Usage
=====

To start the visualizer, use the following command::

  boba-visualizer -i /path/to/file

You will need to supply your own file path, which contains your multiverse outcomes and
accompanying meta data. Learn more about the appropriate file format here_.

After running the above command in your console, open your browser and navigate to
http://127.0.0.1:8080/ to start the user interface.

.. _Boba DSL: https://github.com/uwdata/boba
.. _here: https://github.com/uwdata/boba-visualizer/tree/master/doc/format.md
