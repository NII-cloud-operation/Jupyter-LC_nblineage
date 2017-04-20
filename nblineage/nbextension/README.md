nblineage extension for Literate Computing
=========

This extension generates meme metadata for tracking lineage of a notebook when it is saved.

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
