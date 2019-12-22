from .utils import execute_promise

INITIAL_CELLS = ['print("a")', 'print("b")', 'print("c")']


def test_lc_notebook_meme_cell(prefill_notebook):
    notebook = prefill_notebook(INITIAL_CELLS)
    browser = notebook.browser

    metadata = browser.execute_script('return Jupyter.notebook.metadata;')
    assert 'lc_notebook_meme' not in metadata

    # meme
    execute_promise("Jupyter.notebook.save_notebook()", browser)
    metadata = browser.execute_script('return Jupyter.notebook.metadata;')
    assert 'lc_notebook_meme' in metadata
    assert 'current' in metadata['lc_notebook_meme']
    assert type(metadata['lc_notebook_meme']['current']) is str
    assert 'lc_server_signature' in metadata['lc_notebook_meme']
    assert 'current' in metadata['lc_notebook_meme']['lc_server_signature']
    assert 'notebook_dir' in metadata['lc_notebook_meme']['lc_server_signature']['current']
    assert type(metadata['lc_notebook_meme']['lc_server_signature']['current']['notebook_dir']) is str
    assert 'notebook_path' in metadata['lc_notebook_meme']['lc_server_signature']['current']
    assert type(metadata['lc_notebook_meme']['lc_server_signature']['current']['notebook_path']) is str
    assert 'server_url' in metadata['lc_notebook_meme']['lc_server_signature']['current']
    assert type(metadata['lc_notebook_meme']['lc_server_signature']['current']['server_url']) is str
    assert 'signature_id' in metadata['lc_notebook_meme']['lc_server_signature']['current']
    assert type(metadata['lc_notebook_meme']['lc_server_signature']['current']['signature_id']) is str
    assert 'history' in metadata['lc_notebook_meme']['lc_server_signature']
    assert len(metadata['lc_notebook_meme']['lc_server_signature']['history']) == 0

    before_metadata = metadata
    execute_promise("Jupyter.notebook.save_notebook()", browser)
    metadata = browser.execute_script('return Jupyter.notebook.metadata;')
    assert before_metadata['lc_notebook_meme'] == metadata['lc_notebook_meme']
