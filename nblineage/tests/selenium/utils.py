from notebook.tests.selenium.utils import wait_for_selector


promise_js = """
var done = arguments[arguments.length - 1];
%s.then(
    data => { done(["success", data]); },
    error => { done(["error", error]); }
);
"""


def execute_promise(js, browser):
    state, data = browser.execute_async_script(promise_js % js)
    if state == 'success':
        return data
    raise Exception(data)


def get_notebook_metadata(notebook):
    return notebook.browser.execute_script('return Jupyter.notebook.metadata;')


def set_notebook_metadata(notebook, metadata):
    notebook.browser.execute_script('Jupyter.notebook.metadata = {}'.format(metadata))


def get_cell_metadata(notebook, index):
    return notebook.browser.execute_script('return Jupyter.notebook.get_cell({}).metadata;'.format(index))


def get_cell_metadata_list(notebook):
    return notebook.browser.execute_script('return Jupyter.notebook.get_cells().map(function(c) {return c.metadata;});')


def get_cell_current_meme_from_attr(notebook):
    return notebook.browser.execute_script(
        'return Jupyter.notebook.get_cells().map(function(c) {return c.element.attr("data-nblineage-meme");});'
    )


def execute_cell(notebook, index):
    notebook.browser.execute_script('Jupyter.notebook.get_cell({}).execute();'.format(index))
    notebook.wait_for_cell_output(index)


def save_notebook(notebook):
    execute_promise("Jupyter.notebook.save_notebook()", notebook.browser)


def focus_cells(notebook, index, to_index=None):
    if to_index is not None:
        notebook.select_cell_range(index, to_index)
    notebook.focus_cell(index)


def insert_cell_below(notebook, base_index, content=None):
    notebook.focus_cell(base_index)
    notebook.browser.find_element_by_css_selector(
        "button[data-jupyter-action='jupyter-notebook:insert-cell-below']"
    ).click()
    if content is not None:
        notebook.edit_cell(index=base_index + 1, content=content)


def copy_cells(notebook, index, to_index=None):
    focus_cells(notebook, index, to_index)
    notebook.browser.find_element_by_css_selector(
        "button[data-jupyter-action='jupyter-notebook:copy-cell']"
    ).click()


def paste_cells_below(notebook, base_index, to_base_index=None):
    focus_cells(notebook, base_index, to_base_index)
    notebook.browser.find_element_by_css_selector(
        "button[data-jupyter-action='jupyter-notebook:paste-cell-below']"
    ).click()


def click_menu_item(notebook, menu_id, item_id):
    notebook.browser.find_element_by_id(menu_id).find_element_by_xpath('..').click()
    wait_for_selector(notebook.browser, '#{}'.format(item_id), visible=True)
    notebook.browser.find_element_by_id(item_id).click()


def paste_cells_below_from_menu(notebook, base_index, to_base_index=None):
    focus_cells(notebook, base_index, to_base_index)
    click_menu_item(notebook, 'edit_menu', 'paste_cell_below')


def paste_cells_above_from_menu(notebook, base_index, to_base_index=None):
    focus_cells(notebook, base_index, to_base_index)
    click_menu_item(notebook, 'edit_menu', 'paste_cell_above')


def paste_cells_replace_from_menu(notebook, base_index, to_base_index=None):
    focus_cells(notebook, base_index, to_base_index)
    click_menu_item(notebook, 'edit_menu', 'paste_cell_replace')


def split_cell_from_menu(notebook, index):
    focus_cells(notebook, index)
    click_menu_item(notebook, 'edit_menu', 'split_cell')


def merge_cells_above_from_menu(notebook, index, to_index):
    focus_cells(notebook, index, to_index)
    click_menu_item(notebook, 'edit_menu', 'merge_cell_above')


def merge_cells_below_from_menu(notebook, index, to_index):
    focus_cells(notebook, index, to_index)
    click_menu_item(notebook, 'edit_menu', 'merge_cell_below')


def move_up_cells(notebook, index, to_index=None):
    focus_cells(notebook, index, to_index)
    notebook.browser.find_element_by_css_selector(
        "button[data-jupyter-action='jupyter-notebook:move-cell-up']"
    ).click()


def move_down_cells(notebook, index, to_index=None):
    focus_cells(notebook, index, to_index)
    notebook.browser.find_element_by_css_selector(
        "button[data-jupyter-action='jupyter-notebook:move-cell-down']"
    ).click()


def parse_cell_meme(meme):
    ids = meme.split('-')
    uuid = '-'.join(ids[:5])
    if len(ids) > 5:
        return {
            'uuid': uuid,
            'branch_count': int(ids[5]),
            'branch_numbers': ids[6:]
        }
    else:
        return {
            'uuid': uuid,
            'branch_count': 0,
            'branch_numbers': []
        }
