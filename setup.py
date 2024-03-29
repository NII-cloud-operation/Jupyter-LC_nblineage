#!/usr/bin/env python

from setuptools import setup
import os
import sys

HERE = os.path.abspath(os.path.dirname(__file__))
VERSION_NS = {}
with open(os.path.join(HERE, 'nblineage', '_version.py')) as f:
    exec(f.read(), {}, VERSION_NS)

setup_args = dict (name='lc-nblineage',
      version=VERSION_NS['__version__'],
      description='lineage extension for Jupyter Notebook',
      packages=['nblineage'],
      package_dir={'nblineage': 'nblineage'},
      package_data={'nblineage': ['nbextension/*']},
      include_package_data=True,
      platforms=['Jupyter Notebook 6.5.x'],
      zip_safe=False,
      install_requires=[
          'notebook>=6.5.4',
      ],
      entry_points={
          'console_scripts': [
              'jupyter-nblineage = nblineage.extensionapp:main'
          ]
      }
)

if __name__ == '__main__':
    setup(**setup_args)
