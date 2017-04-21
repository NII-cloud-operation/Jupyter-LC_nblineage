# Jupyter-LC_nblineage

Jupyter-LC_nblineage is a extension that assigns ID(meme) to notebooks and cells to track lineage for Literate Computing.

## Prerequisite

* Jupyter Notebook 4.2.x or 5.x

##  Install

    $ pip install git+https://github.com/NII-cloud-operation/Jupyter-LC_nblineage

## Usage

Jupyter-nblineage includes the extension and the command line tool.

### extension

The extension generates meme metadata for tracking lineage of a notebook when it is saved.

Install and enable the extension

    $ jupyter nblineage quick-setup

Restart Jupyter notebook after .

Disable and uninstall the extension

    $ jupyter nblineage quick-remove

Example of notebook meme metadata

```
{
  "kernelspec": {
    "name": "python2",
    "display_name": "Python 2",
    "language": "python"
  },
  "lc_notebook_meme": {
    "current": "62947f06-07ac-11e7-8c9a-0242ac110002"
  },
  ...
}
```

Example of cell meme metadata

```
{
  "lc_cell_meme": {
    "current": "62948500-07ac-11e7-8c9a-0242ac110002",
    "previous": "62948366-07ac-11e7-8c9a-0242ac110002",
    "next": "6294865e-07ac-11e7-8c9a-0242ac110002"
  },
  "collapsed": true,
  "trusted": true
}
```

### new-root-meme command line tool

The command line tool re-assigns ID(meme) to a notebook and its cells, writes it to a new file.

    $ jupyter nblineage new-root-meme <source.ipynb> <output.ipynb>

Example of notebook meme metadata

```
{
  "kernelspec": {
    "name": "python2",
    "display_name": "Python 2",
    "language": "python"
  },
  "lc_notebook_meme": {
    "current": "62947f06-07ac-11e7-8c9a-0242ac110002",
    "root_cells": [
      "224e203c-09ff-11e7-8364-0242ac110002",
      "224e21fe-09ff-11e7-8364-0242ac110002",
      "224e2302-09ff-11e7-8364-0242ac110002",
      "224e23de-09ff-11e7-8364-0242ac110002",
      "224e24b0-09ff-11e7-8364-0242ac110002",
      "224e2582-09ff-11e7-8364-0242ac110002",
      "224e264a-09ff-11e7-8364-0242ac110002",
      "224e271c-09ff-11e7-8364-0242ac110002",
      "224e27e4-09ff-11e7-8364-0242ac110002",
      "224e28b6-09ff-11e7-8364-0242ac110002",
      "224e297e-09ff-11e7-8364-0242ac110002"
    ],
    "history": [
      "62947f06-07ac-11e7-8c9a-0242ac110002"
    ]
  },
  ...
}
```

Example of cell meme metadata

```
{
  "lc_cell_meme": {
    "current": "224e2302-09ff-11e7-8364-0242ac110002",
    "previous": "224e21fe-09ff-11e7-8364-0242ac110002",
    "history": [
      {
        "current": "62948500-07ac-11e7-8c9a-0242ac110002",
        "previous": "62948366-07ac-11e7-8c9a-0242ac110002",
        "next": "6294865e-07ac-11e7-8c9a-0242ac110002"
      }
    ],
    "next": "224e23de-09ff-11e7-8364-0242ac110002"
  },
  "collapsed": true,
  "trusted": false
}
```
