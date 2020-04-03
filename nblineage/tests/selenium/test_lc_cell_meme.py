from nbformat.v4 import new_code_cell

from .utils import *
from .asserts import *


def test_lc_cell_meme_initialized(prefill_notebook):
    initial_cells = ['print("a")', 'print("b")', 'print("c")']
    notebook = prefill_notebook(initial_cells)

    metadata_list = get_cell_metadata_list(notebook)
    for metadata in metadata_list:
        assert_json(metadata, {
            'lc_cell_meme': NOT_IN
        })


def test_lc_cell_meme_initialized_cells_with_meme(prefill_notebook):
    initial_codes = ['print("{}")'.format(i) for i in range(1000)]
    initial_cells = [new_code_cell(c) for c in initial_codes]
    for cell in initial_cells:
        cell['metadata']['lc_cell_meme'] = {'current': '0825aaee-48b9-11ea-9b81-0242ac120002'}
    notebook = prefill_notebook(initial_cells)

    metadata_list = get_cell_metadata_list(notebook)
    for metadata in metadata_list:
        assert_json(metadata, {
            'lc_cell_meme': {'current': '0825aaee-48b9-11ea-9b81-0242ac120002'}
        })
    validate_cell_current_attr(notebook)


def test_lc_cell_meme_execution_end_time(prefill_notebook):
    initial_cells = ['print("a")', 'print("b")', 'print("c")']
    notebook = prefill_notebook(initial_cells)

    for i in range(len(initial_cells)):
        execute_cell(notebook, i)

    metadata_list = get_cell_metadata_list(notebook)
    for metadata in metadata_list:
        assert_json(metadata, {
            'lc_cell_meme': {
                'execution_end_time': str,
            }
        })


def test_lc_cell_meme_first(notebook):
    notebook.edit_cell(index=0, content='print()')
    save_notebook(notebook)

    metadata = get_cell_metadata(notebook, index=0)
    assert_json(metadata, {
        'lc_cell_meme': {
            'current': str,
            'history': NOT_IN
        }
    })
    meme = metadata['lc_cell_meme']['current']
    assert_cell_meme_branch_number(meme, 0)
    validate_cell_current_attr(notebook)


def test_lc_cell_meme_order(notebook):
    notebook.edit_cell(index=0, content='print()')
    insert_cell_below(notebook, base_index=0, content='print()')
    insert_cell_below(notebook, base_index=1, content='print()')
    save_notebook(notebook)

    metadata_list = get_cell_metadata_list(notebook)
    meme_obj_list = list(map(lambda x: x['lc_cell_meme'], metadata_list))
    current_meme_list = list(map(lambda x: x['current'], meme_obj_list))
    assert_json(meme_obj_list, [
        {
            'previous': None,
            'next': current_meme_list[1]
        },
        {
            'previous': current_meme_list[0],
            'next': current_meme_list[2]
        },
        {
            'previous': current_meme_list[1],
            'next': None
        }
    ])
    validate_cell_current_attr(notebook)


def test_lc_cell_meme_history(notebook):
    notebook.edit_cell(index=0, content='print()')
    insert_cell_below(notebook, base_index=0, content='print()')
    insert_cell_below(notebook, base_index=1, content='print()')
    insert_cell_below(notebook, base_index=2, content='print()')
    save_notebook(notebook)
    metadata_list = get_cell_metadata_list(notebook)
    meme_obj_list = list(map(lambda x: x['lc_cell_meme'], metadata_list))
    before_history_list = [
        [{
            'current': meme_obj['current'],
            'next': meme_obj['next'],
            'previous': meme_obj['previous'],
        }]
        for meme_obj in meme_obj_list[:3]
    ]

    for i in range(5):
        if i % 2 == 0:
            move_up_cells(notebook, 1)
        else:
            move_down_cells(notebook, 0)
        save_notebook(notebook)

        metadata_list = get_cell_metadata_list(notebook)
        updated_metadata_list = metadata_list[:3]
        not_updated_metadata = metadata_list[3]
        assert 'history' not in not_updated_metadata['lc_cell_meme']

        if i % 2 == 0:
            updated_metadata_list[0], updated_metadata_list[1] = \
                updated_metadata_list[1], updated_metadata_list[0]
        updated_meme_obj_list = list(map(lambda x: x['lc_cell_meme'], updated_metadata_list))
        for meme_obj, history in zip(updated_meme_obj_list, before_history_list):
            assert meme_obj['history'] == history
            history.append({
                'current': meme_obj['current'],
                'next': meme_obj['next'],
                'previous': meme_obj['previous'],
            })

    validate_cell_current_attr(notebook)


def test_lc_cell_meme_unique1(notebook):
    notebook.edit_cell(index=0, content='print()')
    insert_cell_below(notebook, base_index=0, content='print()')
    insert_cell_below(notebook, base_index=1, content='print()')
    save_notebook(notebook)

    metadata_list = get_cell_metadata_list(notebook)
    current_meme_list = map(lambda x: x['lc_cell_meme']['current'], metadata_list)
    assert is_unique_list(current_meme_list)
    current_meme_uuid_list = map(lambda x: parse_cell_meme(x)['uuid'], current_meme_list)
    assert is_unique_list(current_meme_uuid_list)
    validate_cell_current_attr(notebook)


def test_lc_cell_meme_unique2(notebook):
    notebook.edit_cell(index=0, content='print()')
    save_notebook(notebook)
    insert_cell_below(notebook, base_index=0, content='print()')
    insert_cell_below(notebook, base_index=1, content='print()')
    save_notebook(notebook)

    metadata_list = get_cell_metadata_list(notebook)
    current_meme_list = map(lambda x: x['lc_cell_meme']['current'], metadata_list)
    assert is_unique_list(current_meme_list)
    current_meme_uuid_list = map(lambda x: parse_cell_meme(x)['uuid'], current_meme_list)
    assert is_unique_list(current_meme_uuid_list)
    validate_cell_current_attr(notebook)


def test_lc_cell_meme_copy_below(notebook):
    notebook.edit_cell(index=0, content='print()')
    insert_cell_below(notebook, base_index=0, content='print()')
    save_notebook(notebook)
    metadata_list = get_cell_metadata_list(notebook)
    before_meme_list = list(map(lambda x: x['lc_cell_meme']['current'], metadata_list))

    copy_cells(notebook, 1)
    paste_cells_below(notebook, base_index=1)
    save_notebook(notebook)

    metadata_list = get_cell_metadata_list(notebook)
    current_meme_list = list(map(lambda x: x['lc_cell_meme']['current'], metadata_list))
    assert current_meme_list[1] == before_meme_list[1]
    assert is_same_cell_meme_uuid(current_meme_list[2], current_meme_list[1])
    assert not is_same_cell_meme_uuid(current_meme_list[2], current_meme_list[0])
    assert_cell_meme_branch_number(current_meme_list[1], 0)
    assert_cell_meme_branch_number(current_meme_list[2], 1)
    validate_cell_current_attr(notebook)


def test_lc_cell_meme_copy_below_from_menu(notebook):
    notebook.edit_cell(index=0, content='print()')
    insert_cell_below(notebook, base_index=0, content='print()')
    save_notebook(notebook)

    copy_cells(notebook, 1)
    paste_cells_below_from_menu(notebook, base_index=1)
    save_notebook(notebook)

    metadata_list = get_cell_metadata_list(notebook)
    current_meme_list = list(map(lambda x: x['lc_cell_meme']['current'], metadata_list))
    assert is_same_cell_meme_uuid(current_meme_list[2], current_meme_list[1])
    assert not is_same_cell_meme_uuid(current_meme_list[2], current_meme_list[0])
    assert_cell_meme_branch_number(current_meme_list[1], 0)
    assert_cell_meme_branch_number(current_meme_list[2], 1)
    validate_cell_current_attr(notebook)


def test_lc_cell_meme_copy_above_from_menu(notebook):
    notebook.edit_cell(index=0, content='print()')
    insert_cell_below(notebook, base_index=0, content='print()')
    save_notebook(notebook)

    copy_cells(notebook, 1)
    paste_cells_above_from_menu(notebook, base_index=1)
    save_notebook(notebook)

    metadata_list = get_cell_metadata_list(notebook)
    current_meme_list = list(map(lambda x: x['lc_cell_meme']['current'], metadata_list))
    assert is_same_cell_meme_uuid(current_meme_list[1], current_meme_list[2])
    assert not is_same_cell_meme_uuid(current_meme_list[1], current_meme_list[0])
    assert_cell_meme_branch_number(current_meme_list[2], 0)
    assert_cell_meme_branch_number(current_meme_list[1], 1)
    validate_cell_current_attr(notebook)


def test_lc_cell_meme_copy_replace_from_menu(notebook):
    notebook.edit_cell(index=0, content='print()')
    insert_cell_below(notebook, base_index=0, content='print()')
    save_notebook(notebook)

    copy_cells(notebook, 0)
    paste_cells_replace_from_menu(notebook, base_index=1)
    save_notebook(notebook)

    metadata_list = get_cell_metadata_list(notebook)
    current_meme_list = list(map(lambda x: x['lc_cell_meme']['current'], metadata_list))
    assert is_same_cell_meme_uuid(current_meme_list[1], current_meme_list[0])
    assert_cell_meme_branch_number(current_meme_list[0], 0)
    assert_cell_meme_branch_number(current_meme_list[1], 1)
    validate_cell_current_attr(notebook)


def test_lc_cell_meme_split_cell_from_menu(notebook):
    notebook.edit_cell(index=0, content='print()')
    insert_cell_below(notebook, base_index=0, content='print()')
    save_notebook(notebook)

    split_cell_from_menu(notebook, index=1)
    save_notebook(notebook)

    # same as paste_cells_above
    metadata_list = get_cell_metadata_list(notebook)
    current_meme_list = list(map(lambda x: x['lc_cell_meme']['current'], metadata_list))
    assert is_same_cell_meme_uuid(current_meme_list[1], current_meme_list[2])
    assert not is_same_cell_meme_uuid(current_meme_list[1], current_meme_list[0])
    assert_cell_meme_branch_number(current_meme_list[2], 0)
    assert_cell_meme_branch_number(current_meme_list[1], 1)
    validate_cell_current_attr(notebook)


def test_lc_cell_meme_merge_cells_above_from_menu(notebook):
    notebook.edit_cell(index=0, content='print()')
    insert_cell_below(notebook, base_index=0, content='print()')
    save_notebook(notebook)

    merge_cells_above_from_menu(notebook, index=0, to_index=1)
    save_notebook(notebook)

    metadata = get_cell_metadata(notebook, 0)
    assert_cell_meme_branch_number(metadata['lc_cell_meme']['current'], 0)
    validate_cell_current_attr(notebook)


def test_lc_cell_meme_merge_cells_below_from_menu(notebook):
    notebook.edit_cell(index=0, content='print()')
    insert_cell_below(notebook, base_index=0, content='print()')
    save_notebook(notebook)

    merge_cells_below_from_menu(notebook, index=0, to_index=1)
    save_notebook(notebook)

    metadata = get_cell_metadata(notebook, 0)
    assert_cell_meme_branch_number(metadata['lc_cell_meme']['current'], 0)
    validate_cell_current_attr(notebook)


def test_lc_cell_meme_copy_multiple_times(notebook):
    notebook.edit_cell(index=0, content='print()')
    save_notebook(notebook)

    for i in range(10):
        copy_cells(notebook, i)
        paste_cells_below(notebook, base_index=i)
        save_notebook(notebook)

        metadata_list = get_cell_metadata_list(notebook)
        current_meme_list = list(map(lambda x: x['lc_cell_meme']['current'], metadata_list))
        assert is_same_cell_meme_uuid(current_meme_list[i + 1], current_meme_list[i])
        assert_cell_meme_branch_number(current_meme_list[i + 1], i + 1)
        before_meme = parse_cell_meme(current_meme_list[i])
        current_meme = parse_cell_meme(current_meme_list[i + 1])
        assert current_meme['branch_numbers'][:-1] == before_meme['branch_numbers']

    validate_cell_current_attr(notebook)


def test_lc_cell_meme_copy_multiple_times_from_same_cell_before_save(notebook):
    notebook.edit_cell(index=0, content='print()')
    copy_cells(notebook, 0)
    for i in range(10):
        paste_cells_below(notebook, base_index=i)
    save_notebook(notebook)

    metadata_list = get_cell_metadata_list(notebook)
    current_meme_list = list(map(lambda x: x['lc_cell_meme']['current'], metadata_list))
    for i in range(10):
        assert_cell_meme_branch_number(current_meme_list[i + 1], 0)
        before_meme = parse_cell_meme(current_meme_list[i])
        current_meme = parse_cell_meme(current_meme_list[i + 1])
        assert current_meme['uuid'] != before_meme['uuid']
        assert metadata_list[i + 1]['lc_cell_meme']['previous'] == current_meme_list[i]
        if i < 9:
            next_meme = parse_cell_meme(current_meme_list[i + 2])
            assert current_meme['uuid'] != next_meme['uuid']
            assert metadata_list[i + 1]['lc_cell_meme']['next'] == current_meme_list[i + 2]


def test_lc_cell_meme_copy_multiple_times_from_same_cell(notebook):
    notebook.edit_cell(index=0, content='print()')
    save_notebook(notebook)
    copy_cells(notebook, 0)
    for i in range(10):
        paste_cells_below(notebook, base_index=i)
        save_notebook(notebook)

    metadata_list = get_cell_metadata_list(notebook)
    current_meme_list = list(map(lambda x: x['lc_cell_meme']['current'], metadata_list))
    for i in range(10):
        assert_cell_meme_branch_number(current_meme_list[i + 1], 1)
        before_meme = parse_cell_meme(current_meme_list[i])
        current_meme = parse_cell_meme(current_meme_list[i + 1])
        assert current_meme['uuid'] == before_meme['uuid']
        assert current_meme['branch_numbers'] != before_meme['branch_numbers']
        assert metadata_list[i + 1]['lc_cell_meme']['previous'] == current_meme_list[i]
        if i < 9:
            next_meme = parse_cell_meme(current_meme_list[i + 2])
            assert current_meme['uuid'] == next_meme['uuid']
            assert before_meme['branch_numbers'] != next_meme['branch_numbers']
            assert metadata_list[i + 1]['lc_cell_meme']['next'] == current_meme_list[i + 2]


def test_lc_cell_meme_copy_multiple_times_over_10(notebook):
    notebook.edit_cell(index=0, content='print()')
    save_notebook(notebook)
    for i in range(10):
        copy_cells(notebook, i)
        paste_cells_below(notebook, base_index=i)
        save_notebook(notebook)

    for i in range(10, 13):
        copy_cells(notebook, i)
        paste_cells_below(notebook, base_index=i)
        save_notebook(notebook)

        metadata_list = get_cell_metadata_list(notebook)
        current_meme_list = list(map(lambda x: x['lc_cell_meme']['current'], metadata_list))
        assert is_same_cell_meme_uuid(current_meme_list[i + 1], current_meme_list[i])
        assert_cell_meme_branch_number(current_meme_list[i + 1], i + 1)
        before_meme = parse_cell_meme(current_meme_list[i])
        current_meme = parse_cell_meme(current_meme_list[i + 1])
        assert current_meme['branch_numbers'][:-1] == before_meme['branch_numbers'][1:]


def test_lc_cell_meme_history_and_order_with_branch_number(notebook):
    notebook.edit_cell(index=0, content='print()')
    save_notebook(notebook)
    before_metadata_list = get_cell_metadata_list(notebook)
    before_meme_obj_list = list(map(lambda x: x['lc_cell_meme'], before_metadata_list))

    copy_cells(notebook, 0)
    paste_cells_below(notebook, base_index=0)
    save_notebook(notebook)

    metadata_list = get_cell_metadata_list(notebook)
    meme_obj_list = list(map(lambda x: x['lc_cell_meme'], metadata_list))
    assert_json(meme_obj_list, [
        {
            'current': before_meme_obj_list[0]['current'],
            'previous': None,
            'next': str,
            'history': [
                {
                    'current': before_meme_obj_list[0]['current'],
                    'previous': None,
                    'next': None,
                }
            ]
        },
        {
            'current': str,
            'previous': before_meme_obj_list[0]['current'],
            'next': None,
            'history': [
                {
                    'current': str,
                    'previous': None,
                    'next': None,
                }
            ]
        }
    ])
    assert parse_cell_meme(meme_obj_list[1]['current'])['uuid'] == before_meme_obj_list[0]['current']
    assert parse_cell_meme(meme_obj_list[1]['current'])['branch_count'] == 1
    assert meme_obj_list[1]['history'][0]['current'] == meme_obj_list[1]['current']


def test_lc_cell_meme_all_updated_with_different_server_signature(notebook):
    notebook.edit_cell(index=0, content='print()')
    insert_cell_below(notebook, base_index=0, content='print()')
    save_notebook(notebook)
    copy_cells(notebook, 1)
    paste_cells_below(notebook, base_index=1)
    save_notebook(notebook)
    metadata_list = get_cell_metadata_list(notebook)
    meme_list = list(map(lambda x: x['lc_cell_meme']['current'], metadata_list))
    branch_count_list = list(map(lambda x: parse_cell_meme(x)['branch_count'], meme_list))
    assert branch_count_list == [0, 0, 1]

    nb_metadata = get_notebook_metadata(notebook)
    nb_metadata['lc_notebook_meme']['lc_server_signature']['current']['notebook_path'] = '/aaa/bbb'
    set_notebook_metadata(notebook, nb_metadata)
    save_notebook(notebook)

    metadata_list = get_cell_metadata_list(notebook)
    meme_list = list(map(lambda x: x['lc_cell_meme']['current'], metadata_list))
    branch_count_list = list(map(lambda x: parse_cell_meme(x)['branch_count'], meme_list))
    assert branch_count_list == [1, 1, 2]


def test_lc_cell_meme_with_error_fetch_server_signature(patched_without_server_signature_api_notebook):
    notebook = patched_without_server_signature_api_notebook
    notebook.edit_cell(index=0, content='print()')
    insert_cell_below(notebook, base_index=0, content='print()')
    save_notebook(notebook)

    # notebook is saved
    # memes are generated
    notebook.browser.refresh()
    notebook._wait_for_start()
    metadata = get_cell_metadata(notebook, 0)
    assert_json(metadata, {
        'lc_cell_meme': {
            'current': str,
            'history': NOT_IN
        }
    })
    assert_cell_meme_branch_number(metadata['lc_cell_meme']['current'], 0)

    nb_metadata = get_notebook_metadata(notebook)
    nb_metadata['lc_notebook_meme'] = {
        'lc_server_signature': {
            'current': '/aaa/bbb'
        }
    }
    set_notebook_metadata(notebook, nb_metadata)
    save_notebook(notebook)

    # branch number is not changed
    notebook.browser.refresh()
    notebook._wait_for_start()
    metadata = get_cell_metadata(notebook, 0)
    assert_cell_meme_branch_number(metadata['lc_cell_meme']['current'], 0)
