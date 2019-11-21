import io
import nbformat
from nbformat import notebooknode
from uuid import uuid1

from traitlets.config.configurable import LoggingConfigurable
from traitlets import Int, Bool

def enum_prev_next_items(items):
    if len(items) == 0:
        return []
    prev_items = items[0:-1]
    prev_items.insert(0, None)
    next_items = items[1:]
    next_items.append(None)
    return zip(prev_items, items, next_items)

def get_or_create(d, name, init):
    if name not in d:
        d[name] = init()
    return d[name]

class MemeGenerator(LoggingConfigurable):

    def __init__(self, **kwargs):
        super(MemeGenerator, self).__init__(**kwargs)

    def from_filename(self, notebook_filename):
        self.log.debug('Read notebook file: {}'.format(notebook_filename))
        with io.open(notebook_filename, encoding='utf-8') as f:
            return self.from_stream(f)

    def from_stream(self, notebook_file_stream):
        return self.from_notebook_node(nbformat.read(notebook_file_stream, as_version=4))

    def from_notebook_node(self, nb, copy=False):
        if copy:
            nb = notebooknode.from_dict(nb.copy())

        self._update_prev_next_history(nb)
        self._generate_notebook_meme(nb)
        self._generate_cell_meme(nb)
        self._update_prev_next_meme(nb)

        return nb

    def _update_prev_next_history(self, nb):
        for prev_cell, cell, next_cell in enum_prev_next_items(nb.cells):
            if 'lc_cell_meme' not in cell.metadata:
                continue
            memeobj = cell.metadata['lc_cell_meme']

            if 'current' not in memeobj:
                continue
            if 'previous' not in memeobj:
                continue
            if 'next' not in memeobj:
                continue

            prev_meme = memeobj['previous'];
            next_meme = memeobj['next'];
            prev_memeobj = None
            if prev_cell is not None:
                prev_memeobj = prev_cell.metadata.get('lc_cell_meme', None)
            next_memeobj = None
            if next_cell is not None:
                next_memeobj = next_cell.metadata.get('lc_cell_meme', None)

            prev_changed = prev_memeobj is not None and prev_memeobj['current'] != prev_meme
            prev_changed = prev_changed or (prev_cell is not None and prev_memeobj is None)
            next_changed = next_memeobj is not None and next_memeobj['current'] != next_meme
            next_changed = next_changed or (next_cell is not None and next_memeobj is None)

            if prev_changed or next_changed:
                history = get_or_create(memeobj, 'history', lambda: list())
                history.append({
                    'current': memeobj['current'],
                    'previous': memeobj['previous'],
                    'next': memeobj['next']
                })

    def _generate_notebook_meme(self, nb):
        memeobj = get_or_create(nb.metadata, 'lc_notebook_meme', lambda: dict())
        if 'current' not in memeobj:
            memeobj['current'] = str(uuid1())

    def _generate_cell_meme(self, nb):
        for cell in nb.cells:
            memeobj = get_or_create(cell.metadata, 'lc_cell_meme', lambda: dict())
            if 'current' not in memeobj:
                memeobj['current'] = str(uuid1())

    def _update_prev_next_meme(self, nb):
        for prev_cell, cell, next_cell in enum_prev_next_items(nb.cells):
            memeobj = get_or_create(cell.metadata, 'lc_cell_meme', lambda: dict())
            prev_meme = None
            if prev_cell is not None:
                prev_meme = prev_cell.metadata['lc_cell_meme']['current']
            memeobj['previous'] = prev_meme
            next_meme = None
            if next_cell is not None:
                next_meme = next_cell.metadata['lc_cell_meme']['current']
            memeobj['next'] = next_meme

class NewRootMemeGenerator(LoggingConfigurable):

    trim_history = Int(None, min=0, allow_none=True,
                       help='Max size of history for trimming, by default do nothing'
                      ).tag(config=True)

    clear_server_signature = Bool(False, allow_none=False,
                       help='If True, clear server signature metadata'
                      ).tag(config=True)

    def __init__(self, **kwargs):
        super(NewRootMemeGenerator, self).__init__(**kwargs)

    def from_filename(self, notebook_filename):
        self.log.debug('Read notebook file: {}'.format(notebook_filename))
        with io.open(notebook_filename, encoding='utf-8') as f:
            return self.from_stream(f)

    def from_stream(self, notebook_file_stream):
        return self.from_notebook_node(nbformat.read(notebook_file_stream, as_version=4))

    def from_notebook_node(self, nb, copy=False):
        if copy:
            nb = notebooknode.from_dict(nb.copy())

        MemeGenerator().from_notebook_node(nb)
        self._update_prev_next_history(nb)
        self._update_notebook_meme(nb)
        self._update_cell_meme(nb)
        self._update_prev_next_cell_meme(nb)
        self._update_root_cells(nb)

        if self.clear_server_signature:
            self.log.debug('Clear server signature metadata')
            if 'lc_server_signature' in nb.metadata['lc_notebook_meme']:
                del nb.metadata['lc_notebook_meme']['lc_server_signature']

        return nb

    def _update_prev_next_history(self, nb):
        for prev_cell, cell, next_cell in enum_prev_next_items(nb.cells):
            prev_memeobj = None
            if prev_cell is not None:
                prev_memeobj = prev_cell.metadata['lc_cell_meme']
            next_memeobj = None
            if next_cell is not None:
                next_memeobj = next_cell.metadata['lc_cell_meme']

            memeobj = cell.metadata['lc_cell_meme']
            meme = memeobj['current']

            prev_meme = None
            if prev_memeobj is not None:
                prev_meme = prev_memeobj['current']
            next_meme = None
            if next_memeobj is not None:
                next_meme = next_memeobj['current']

            history = get_or_create(memeobj, 'history', lambda: list())
            history.append({
                'current': meme,
                'previous': prev_meme,
                'next': next_meme
            })
            if self.trim_history is not None:
                size = self.trim_history
                if size == 0:
                    history = list()
                else:
                    history = history[-size:]
                memeobj['history'] = history

    def _update_notebook_meme(self, nb):
        memeobj = nb.metadata['lc_notebook_meme']
        history = get_or_create(memeobj, 'history', lambda: list())
        history.append(memeobj['current'])
        if self.trim_history is not None:
            size = self.trim_history
            if size == 0:
                history = list()
            else:
                history = history[-size:]
            memeobj['history'] = history
        memeobj['current'] = str(uuid1())

    def _update_cell_meme(self, nb):
        for cell in nb.cells:
            cell.metadata['lc_cell_meme']['current'] = str(uuid1())

    def _update_prev_next_cell_meme(self, nb):
        for prev_cell, cell, next_cell in enum_prev_next_items(nb.cells):
            prev_memeobj = None
            if prev_cell is not None:
                prev_memeobj = prev_cell.metadata['lc_cell_meme']
            next_memeobj = None
            if next_cell is not None:
                next_memeobj = next_cell.metadata['lc_cell_meme']

            memeobj = cell.metadata['lc_cell_meme']

            if prev_memeobj is None:
                memeobj['previous'] = None
            else:
                memeobj['previous'] = prev_memeobj['current']
            if next_memeobj is None:
                memeobj['next'] = None
            else:
                memeobj['next'] = next_memeobj['current']

    def _update_root_cells(self, nb):
        root_cells = [x.metadata['lc_cell_meme']['current'] for x in nb.cells]
        nb.metadata['lc_notebook_meme']['root_cells']= root_cells

