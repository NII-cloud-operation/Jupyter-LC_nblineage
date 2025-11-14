# Jupyter-LC\_nblineage [![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/NII-cloud-operation/Jupyter-LC_nblineage/feature/lab)

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

### MEME Branching Feature

The nblineage extension supports MEME branching to track cell lineage when cells are copied or when the notebook environment changes.

#### MEME ID Structure with Branches

The MEME ID can be extended with branch information:
- Basic format: `UUID` (e.g., `8f5c5fe2-71cc-11e7-9abe-02420aff0008`)
- With branches: `UUID-branch_count-branch1-branch2-...` (e.g., `8f5c5fe2-71cc-11e7-9abe-02420aff0008-3-a3f2-bc1e-9d4a`)
  - `branch_count`: Number of times this MEME has been branched
  - `branch1, branch2, ...`: 4-digit hexadecimal branch numbers (max 10 kept, oldest removed when exceeded)

#### When Branching Occurs

1. **Cell Creation/Copy**: When a cell with an existing MEME is duplicated, the new cell gets a branch number added to differentiate it from the original
2. **Server Environment Change**: When the notebook server environment changes (detected via `lc_server_signature`), all cells receive new branch numbers

#### Server Environment Tracking

The extension tracks the notebook server environment and detects changes:
- Monitored properties: `server_url`, `notebook_dir`, `notebook_path`, `signature_id`
- When a change is detected:
  - The previous signature is moved to history
  - All cells in the notebook receive new branch numbers
  - This helps track when notebooks are moved between different Jupyter environments
- The extension automatically manages MEME generation and branching during notebook save events

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

## Development

### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the nblineage directory
# Install package in development mode
pip install -e "."
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
jupyter server extension enable nblineage
# Rebuild extension Typescript source after making changes
jlpm build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

### Development uninstall

```bash
pip uninstall nblineage
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `nblineage` within that folder.
