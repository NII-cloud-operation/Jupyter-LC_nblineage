from .utils import execute_promise

INITIAL_CELLS = ['print("a")', 'print("b")', 'print("c")']


def test_lc_cell_meme_cell(prefill_notebook):
    notebook = prefill_notebook(INITIAL_CELLS)
    browser = notebook.browser
    n = len(INITIAL_CELLS)

    metadata_list = browser.execute_script('return Jupyter.notebook.get_cells().map(function(c) {return c.metadata;})')
    for metadata in metadata_list:
        assert 'lc_cell_meme' not in metadata

    # execution_end_time
    for i in range(n):
        browser.execute_script('Jupyter.notebook.get_cell({}).execute();'.format(i))
    for i in range(n):
        notebook.wait_for_cell_output(i)
    metadata_list = browser.execute_script('return Jupyter.notebook.get_cells().map(function(c) {return c.metadata;})')
    for metadata in metadata_list:
        assert 'lc_cell_meme' in metadata
        assert 'execution_end_time' in metadata['lc_cell_meme']
        assert type(metadata['lc_cell_meme']['execution_end_time']) is str

    # meme
    execute_promise("Jupyter.notebook.save_notebook()", browser)
    metadata_list = browser.execute_script('return Jupyter.notebook.get_cells().map(function(c) {return c.metadata;})')
    # check meme properties
    for metadata in metadata_list:
        assert 'lc_cell_meme' in metadata
        assert 'current' in metadata['lc_cell_meme']
        assert 'next' in metadata['lc_cell_meme']
        assert 'previous' in metadata['lc_cell_meme']
        assert type(metadata['lc_cell_meme']['current']) is str
    # check meme is unique
    assert len(set(map(lambda meta: meta['lc_cell_meme']['current'], metadata_list))) == len(metadata_list)
    # check next and previous meme
    for i in range(n):
        if i - 1 >= 0:
            assert metadata_list[i]['lc_cell_meme']['previous'] == metadata_list[i - 1]['lc_cell_meme']['current']
        else:
            assert metadata_list[i]['lc_cell_meme']['previous'] is None
        if i + 1 < n:
            assert metadata_list[i]['lc_cell_meme']['next'] == metadata_list[i + 1]['lc_cell_meme']['current']
        else:
            assert metadata_list[i]['lc_cell_meme']['next'] is None

    before_metadata_list = metadata_list
    execute_promise("Jupyter.notebook.save_notebook()", browser)
    metadata_list = browser.execute_script('return Jupyter.notebook.get_cells().map(function(c) {return c.metadata;})')
    assert list(map(lambda meta: meta['lc_cell_meme'], before_metadata_list)) == \
           list(map(lambda meta: meta['lc_cell_meme'], metadata_list))
