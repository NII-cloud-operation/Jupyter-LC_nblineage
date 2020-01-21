from .utils import *


# TODO: test meme history
# TODO: test merge and split cells operation
# TODO: test copying multiple cells operation
# TODO: test move and delete cells operation (validate changed order)
# TODO: test branch number > 10
# TODO: test adding branch when different server signature
# TODO: test server error


def assert_cell_meme_order(current_meme_list, metadata_list):
    n = len(current_meme_list)
    assert n == len(metadata_list)
    for i in range(n):
        assert metadata_list[i]['lc_cell_meme']['current'] == current_meme_list[i]
    for i in range(n):
        expected_previous_meme = current_meme_list[i - 1] if i > 0 else None
        expected_next_meme = current_meme_list[i + 1] if i + 1 < n else None
        assert metadata_list[i]['lc_cell_meme']['previous'] == expected_previous_meme
        assert metadata_list[i]['lc_cell_meme']['next'] == expected_next_meme


def assert_same_cell_meme_uuid(meme1, meme2):
    assert parse_cell_meme(meme1)['uuid'] == parse_cell_meme(meme2)['uuid']


def assert_cell_meme_branch_number(meme, branch_count):
    parts = parse_cell_meme(meme)
    assert parts['branch_count'] == branch_count
    for i in range(parts['branch_count']):
        assert len(parts['branch_numbers'][i]) == 4
    assert len(set(parts['branch_numbers'])) == len(parts['branch_numbers'])


def test_lc_cell_initialized(prefill_notebook):
    initial_cells = ['print("a")', 'print("b")', 'print("c")']
    notebook = prefill_notebook(initial_cells)

    metadata_list = get_cell_metadata_list(notebook)
    for metadata in metadata_list:
        assert 'lc_cell_meme' not in metadata


def test_lc_cell_meme_execution_end_time(prefill_notebook):
    initial_cells = ['print("a")', 'print("b")', 'print("c")']
    notebook = prefill_notebook(initial_cells)

    for i in range(len(initial_cells)):
        execute_cell(notebook, i)
    metadata_list = get_cell_metadata_list(notebook)
    for metadata in metadata_list:
        assert 'lc_cell_meme' in metadata
        assert 'execution_end_time' in metadata['lc_cell_meme']
        assert type(metadata['lc_cell_meme']['execution_end_time']) is str


def test_lc_cell_meme(notebook):
    current_meme_list = []

    # edit cell(0)
    index = 0
    notebook.edit_cell(index=index, content='print()')
    save_notebook(notebook)

    metadata = get_cell_metadata(notebook, index=index)
    assert_json(metadata, {
        'lc_cell_meme': {
            'current': str,
            'history': NOT_IN
        }
    })
    meme = metadata['lc_cell_meme']['current']
    assert meme not in current_meme_list
    assert_cell_meme_branch_number(meme, 0)

    current_meme_list.append(meme)
    assert_cell_meme_order(current_meme_list, get_cell_metadata_list(notebook))

    # add cell(1)
    base_index = 0
    index = 1
    insert_cell_below(notebook, base_index=base_index, content='print()')
    save_notebook(notebook)

    metadata = get_cell_metadata(notebook, index=index)
    assert_json(metadata, {
        'lc_cell_meme': {
            'current': str,
            'history': NOT_IN
        }
    })
    meme = metadata['lc_cell_meme']['current']
    assert meme not in current_meme_list
    assert_cell_meme_branch_number(meme, 0)

    current_meme_list.append(meme)
    assert_cell_meme_order(current_meme_list, get_cell_metadata_list(notebook))

    # add cell(2)
    base_index = 1
    index = 2
    insert_cell_below(notebook, base_index=base_index, content='print()')
    save_notebook(notebook)

    metadata = get_cell_metadata(notebook, index=index)
    assert_json(metadata, {
        'lc_cell_meme': {
            'current': str,
            'history': NOT_IN
        }
    })
    meme = metadata['lc_cell_meme']['current']
    assert meme not in current_meme_list
    assert_cell_meme_branch_number(meme, 0)

    current_meme_list.append(meme)
    assert_cell_meme_order(current_meme_list, get_cell_metadata_list(notebook))

    # copy and paste(below) from cell(2) to cell(3)
    base_index = 2
    index = 3
    copy_cells(notebook, base_index)
    paste_cells_below(notebook, base_index=index - 1)
    save_notebook(notebook)

    metadata = get_cell_metadata(notebook, index=index)
    assert_json(metadata, {
        'lc_cell_meme': {
            'current': str,
            'history': list
        }
    })
    meme = metadata['lc_cell_meme']['current']
    assert meme not in current_meme_list

    base_meme = get_cell_metadata(notebook, index=base_index)['lc_cell_meme']['current']
    assert_same_cell_meme_uuid(meme, base_meme)
    assert_cell_meme_branch_number(meme, 1)

    current_meme_list.append(meme)
    assert_cell_meme_order(current_meme_list, get_cell_metadata_list(notebook))

    # copy and paste(below) from cell(2) to cell(4)
    base_index = 2
    index = 4
    copy_cells(notebook, base_index)
    paste_cells_below_from_menu(notebook, base_index=index - 1)
    save_notebook(notebook)

    metadata = get_cell_metadata(notebook, index=index)
    assert_json(metadata, {
        'lc_cell_meme': {
            'current': str,
            'history': list
        }
    })
    meme = metadata['lc_cell_meme']['current']
    assert meme not in current_meme_list

    base_meme = get_cell_metadata(notebook, index=base_index)['lc_cell_meme']['current']
    assert_same_cell_meme_uuid(meme, base_meme)
    assert_cell_meme_branch_number(meme, 1)

    current_meme_list.append(meme)
    assert_cell_meme_order(current_meme_list, get_cell_metadata_list(notebook))

    # copy and paste(above) from cell(4) to cell(5)
    # pasted index is 4, base index is 5
    base_index = 4
    index = 4
    copy_cells(notebook, base_index)
    paste_cells_above_from_menu(notebook, base_index=index)
    save_notebook(notebook)
    base_index += 1

    metadata = get_cell_metadata(notebook, index=index)
    assert_json(metadata, {
        'lc_cell_meme': {
            'current': str,
            'history': list
        }
    })
    meme = metadata['lc_cell_meme']['current']
    assert meme not in current_meme_list

    base_meme = get_cell_metadata(notebook, index=base_index)['lc_cell_meme']['current']
    assert_same_cell_meme_uuid(meme, base_meme)
    assert_cell_meme_branch_number(meme, 2)

    current_meme_list.insert(index, meme)
    assert_cell_meme_order(current_meme_list, get_cell_metadata_list(notebook))

    # copy and paste(replace) from cell(4) to cell(0)
    base_index = 4
    index = 0
    copy_cells(notebook, base_index)
    paste_cells_replace_from_menu(notebook, base_index=index)
    save_notebook(notebook)

    metadata = get_cell_metadata(notebook, index=index)
    assert_json(metadata, {
        'lc_cell_meme': {
            'current': str,
            'history': list
        }
    })
    meme = metadata['lc_cell_meme']['current']
    assert meme not in current_meme_list

    base_meme = get_cell_metadata(notebook, index=base_index)['lc_cell_meme']['current']
    assert_same_cell_meme_uuid(meme, base_meme)
    assert_cell_meme_branch_number(meme, 3)

    current_meme_list[index] = meme
    assert_cell_meme_order(current_meme_list, get_cell_metadata_list(notebook))
