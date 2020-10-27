===============
boba-visualizer
===============

The Boba Visualizer is a visual analysis interface for exploring multiverse outcomes.
It helps users explore how analytic decisions impact statistical estimates, inferential uncertainty, and model fit.
Watch the visualizer in action in this `video`_.

.. image:: https://yangliu.life/build/images/boba-teaser.png
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

  boba-server -i /path/to/file

You will need to supply your own file path, which contains your multiverse outcomes and
accompanying meta data. Learn more about the appropriate file format here_. This repository
also include an `example folder`_ with the outcomes from the `mortgage multiverse`_. You
could explore the example by cloning this repo and::

  boba-server -i ./example/mortgage

After running the above command in your console, open your browser and navigate to
http://127.0.0.1:8080/ to start the user interface.

You might also use a `configuration file`_ to control various aspects of the visualizer,
and use `CLI options`_ to change the behavior of the server.

.. _Boba DSL: https://github.com/uwdata/boba
.. _here: https://github.com/uwdata/boba-visualizer/tree/master/doc/format.md
.. _configuration file: https://github.com/uwdata/boba-visualizer/tree/master/doc/visualizer_config.md
.. _CLI options: https://github.com/uwdata/boba-visualizer/blob/master/doc/CLI.rst
.. _example folder: https://github.com/uwdata/boba-visualizer/tree/master/example/mortgage
.. _mortgage multiverse: https://github.com/uwdata/boba/tree/master/example/mortgage
