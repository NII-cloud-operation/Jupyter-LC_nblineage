from .utils import *


def test_lc_notebook_meme_cell(prefill_notebook):
    initial_cells = ['print("a")', 'print("b")', 'print("c")']
    notebook = prefill_notebook(initial_cells)

    metadata = get_notebook_metadata(notebook)
    assert 'lc_notebook_meme' not in metadata

    save_notebook(notebook)
    metadata = get_notebook_metadata(notebook)
    assert_json(metadata, {
        'lc_notebook_meme': {
            'current': str,
            'lc_server_signature': {
                'current': {
                    'notebook_dir': str,
                    'notebook_path': str,
                    'server_url': str,
                    'signature_id': str
                },
                'history': []
            }
        }
    })
    before_metadata = metadata

    save_notebook(notebook)
    metadata = get_notebook_metadata(notebook)
    assert before_metadata['lc_notebook_meme'] == metadata['lc_notebook_meme']
