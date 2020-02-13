from .utils import parse_cell_meme


NOT_IN = '___not_in___'


def assert_json(data, expected, key=None):
    if key is not None:
        if expected is NOT_IN:
            assert key not in data
            return
        else:
            assert key in data
            data = data[key]

    if type(expected) is dict:
        assert type(data) is dict
        for k, v in expected.items():
            assert_json(data, v, key=k)
    elif type(expected) is list:
        assert type(data) is list
        assert len(data) == len(expected)
        for i in range(len(data)):
            assert_json(data[i], expected[i])
    elif expected is None:
        assert data is None
    elif type(expected) is type:
        assert type(data) is expected
    elif callable(expected):
        assert expected(data)
    else:
        assert data == expected


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


def assert_cell_meme_branch_number(meme, count):
    parts = parse_cell_meme(meme)
    nums = parts['branch_numbers']
    assert parts['branch_count'] == count
    assert len(nums) == min(10, count)
    for num in nums:
        assert len(num) == 4
    assert is_unique_list(nums)


def is_same_cell_meme_uuid(meme1, meme2):
    return parse_cell_meme(meme1)['uuid'] == parse_cell_meme(meme2)['uuid']


def is_unique_list(data):
    data = list(data)
    return len(set(data)) == len(data)
