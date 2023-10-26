# Jupyter-LC\_nblineage

Jupyter-LC\_nblineage is an extension that put tracking ID, which we call *meme*, to every notebook and every cell in it.
* The meme will be newly assigned as UUID1 when a cell or a notebook has been created and saved at first time
* Each meme is stored in metadata, thus it would be inherited into diverged notebooks and copied cells
* `new-root-meme` subcommand will make a copy of a notebook and reassign new memes to a duplicated notebook and to cells within it 

## Requirements

* JupyterLab >= 4.0.0

## Install

        $ pip install git+https://github.com/NII-cloud-operation/Jupyter-LC_nblineage

To use nblineage extension you will also need to install and enable, you can use Jupyter subcommand:

        $ jupyter nblineage quick-setup

then restart Jupyter notebook.

To disable and uninstall this extension, use:

        $ jupyter nblineage quick-remove

## Usage

Jupyter-LC\_nblineage includes an extension and a command line tool.

### extension

The extension generates meme metadata in order to track lineage of notebooks and cells.

Example of notebook's meme at `lc\_notebook\_meme` in notebook metadata.

```
{
  "lc_notebook_meme": {
    "current": "1904d564-71c6-11e7-8369-0242ac110002",         ## The meme id for this notebook
    "lc_server_signature": {
      "current": {
        "server_url": "https://xxxxx.nii.ac.jp/user/xxxx/",    ## The current notebook server infomation is also stored
        "notebook_path": "/",
        "notebook_dir": "/notebooks",
        "signature_id": "034b406c-71c8-11e7-a8bf-02420aff0008"
      },
      "history": [
        {                                                      ## Travel history where this notebook has been executed
          "notebook_dir": "/notebooks",
          "notebook_path": "/",
          "server_url": "http://localhost:8888/",
          "signature_id": "dc3b0162-71bb-11e7-8369-0242ac110002"
        }
      ]
    },
  ...
}
```

Example of cell's meme at `lc\_cell\_meme` in cell metadata.

```
{
  "lc_cell_meme": {
    "current": "8f5c5fe2-71cc-11e7-9abe-02420aff0008",         ## The meme id for this cell
    "previous": "8f5c5cea-71cc-11e7-9abe-02420aff0008",        ## The context of this cell as reference to the previous and the next cells
    "next": "f2125b84-4669-11e7-958b-02420aff0006",
    "execution_end_time": "2019-07-25T09:53:13.857572Z",       ## The end time of execution
    "history": [                                               ## The history of this notebook's context
      {
        "current": "8f5c5fe2-71cc-11e7-9abe-02420aff0008",
        "previous": "8f5c5ee8-71cc-11e7-9abe-02420aff0008",
        "next": "8f5c60aa-71cc-11e7-9abe-02420aff0008"
      },
      {
        "current": "8f5c5fe2-71cc-11e7-9abe-02420aff0008",
        "previous": "f2125b84-4669-11e7-958b-02420aff0006",
        "next": "8f5c5ee8-71cc-11e7-9abe-02420aff0008"
      }
    ]
  },
...
}
```

### new-root-meme command line tool

This subcommand will make a copy of a notebook and reassign new meme IDs to the duplicated notebook and to the cells within it.

        $ jupyter nblineage new-root-meme <source.ipynb> <reassigned.ipynb>

Example of notebook's meme in <reassigned.ipynb>

```
{
  "kernelspec": {
    "name": "python2-wrapper",
    "display_name": "Python 2 (LC_wrapper)",
    "language": "python"
  },
  "lc_notebook_meme": {
    "current": "5fb59a5c-71d0-11e7-9acc-0242ac110002",         ## newly assigned notebook's meme id
    "lc_server_signature": {
      "current": {
      "signature_id": "dc3b0162-71bb-11e7-8369-0242ac110002",  ## In this case the subcommand executed on a different notebook server
      "server_url": "http://localhost:8888/",                  ##   <source.ipynb> was created on "b9498142-71ca-11e7-9abe-02420aff0008"
      "notebook_path": "/",                                                                                         ^
      "notebook_dir": "/notebooks"                                                                                  ^
    },                                                                                                              |
    "history": [                                                                                                    |
      {                                                                                                             |
        "signature_id": "b9498142-71ca-11e7-9abe-02420aff0008",  <<-------------------------------------------------+
        "server_url": "https://XXXXXX.nii.ac.jp/user/XX/",
        "notebook_path": "/",
        "notebook_dir": "/notebooks"
        }
      ]
    },
    "root_cells": [
      "5fb59caa-71d0-11e7-9acc-0242ac110002",           ## The list of cells' meme IDs in this notebook after reasignment
      "5fb59dfe-71d0-11e7-9acc-0242ac110002",            # In this case there are 6 cells in this notebook
      "5fb59f2a-71d0-11e7-9acc-0242ac110002",
      "5fb5a042-71d0-11e7-9acc-0242ac110002",
      "5fb5a150-71d0-11e7-9acc-0242ac110002",
      "5fb5a25e-71d0-11e7-9acc-0242ac110002"
    ],
    "history": [
      "1904d564-71c6-11e7-8369-0242ac110002"             ## old meme id of this notebook that was <source.ipynb>
    ]
  },
  ...
}
```

Example of cell's meme metadata in <reassigned.ipynb>

```
{
  "lc_cell_meme": {
    "current": "5fb59f2a-71d0-11e7-9acc-0242ac110002",      ## newly reassigned cell's meme id
    "previous": "5fb59dfe-71d0-11e7-9acc-0242ac110002",
    "next": "5fb5a042-71d0-11e7-9acc-0242ac110002",
    "history": [
      {
        "current": "8f5c5fe2-71cc-11e7-9abe-02420aff0008",  ## old meme id of this cell before reassignment, i.e <source.ipynb>
        "previous": "8f5c5ee8-71cc-11e7-9abe-02420aff0008",
        "next": "8f5c60aa-71cc-11e7-9abe-02420aff0008"
      },
      {
        "current": "8f5c5fe2-71cc-11e7-9abe-02420aff0008",
        "previous": "8f5c5cea-71cc-11e7-9abe-02420aff0008",
        "next": "f2125b84-4669-11e7-958b-02420aff0006"
      }
    ]
  },
... 
}
```
