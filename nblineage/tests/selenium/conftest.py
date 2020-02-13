import os
import pytest
import requests
from subprocess import Popen
import sys
from testpath.tempdir import TemporaryDirectory
from urllib.parse import urljoin
import json
import shutil

from notebook.tests.selenium.conftest import (
    _wait_for_server,
    make_sauce_driver,
    selenium_driver,
    authenticated_browser,
    notebook,
    prefill_notebook,
)

from notebook.tests.selenium.utils import Notebook

pjoin = os.path.join


@pytest.fixture(scope='session')
def notebook_server():
    with TemporaryDirectory() as td:
        info = _start_notebook_server(td)
        yield info

    _shutdown_notebook_server(info)


@pytest.fixture
def patched_without_server_signature_api_notebook(selenium_driver,
                                                  patched_without_server_signature_api_notebook_server):
    info = patched_without_server_signature_api_notebook_server
    selenium_driver.jupyter_server_info = info
    selenium_driver.get("{url}?token={token}".format(**info))
    tree_wh = selenium_driver.current_window_handle
    yield Notebook.new_notebook(selenium_driver)
    selenium_driver.switch_to.window(tree_wh)


@pytest.fixture(scope='session')
def patched_without_server_signature_api_notebook_server():
    with TemporaryDirectory() as td:
        info = _start_notebook_server(td, patch_without_server_signature_api)
        yield info

    _shutdown_notebook_server(info)


def patch_without_server_signature_api(info):
    shutil.copy(
        os.path.abspath(pjoin(os.path.dirname(__file__), '..', 'fixture', 'init_without_server_signature_api.py')),
        pjoin(info['extra_env']['PYTHONPATH'], 'nblineage', '__init__.py')
    )


def _start_notebook_server(td, patch=None):
    info = {}

    nbdir = info['nbdir'] = pjoin(td, 'notebooks')
    os.makedirs(pjoin(nbdir, u'sub ∂ir1', u'sub ∂ir 1a'))
    os.makedirs(pjoin(nbdir, u'sub ∂ir2', u'sub ∂ir 1b'))

    server_extension_dir = pjoin(td, 'jupyter_config', 'jupyter_notebook_config.d')
    os.makedirs(server_extension_dir)
    client_extension_dir = pjoin(td, 'jupyter_config', 'nbconfig', 'notebook.d')
    os.makedirs(client_extension_dir)

    # enable server extensions
    with open(pjoin(server_extension_dir, 'lc_nblineage_module.json'), mode='w') as f:
        f.write(json.dumps({
            'NotebookApp': {
                'nbserver_extensions': {
                    'nblineage': True
                }
            }
        }))

    # enable nbextensions
    with open(pjoin(client_extension_dir, 'lc_nblineage_module.json'), mode='w') as f:
        f.write(json.dumps({
            'load_extensions': {
                'nblineage/main': True
            }
        }))

    # install nbextensions
    shutil.copytree(
        os.path.abspath(pjoin(os.path.dirname(__file__), '..', '..', 'nbextension')),
        pjoin(td, 'ipython', 'nbextensions', 'nblineage')
    )

    # install server extension
    python_path_dir = pjoin(td, 'python_path')
    os.makedirs(pjoin(python_path_dir))
    shutil.copytree(
        os.path.abspath(pjoin(os.path.dirname(__file__), '..', '..')),
        pjoin(python_path_dir, 'nblineage')
    )

    info['extra_env'] = {
        'JUPYTER_CONFIG_DIR': pjoin(td, 'jupyter_config'),
        'JUPYTER_RUNTIME_DIR': pjoin(td, 'jupyter_runtime'),
        'IPYTHONDIR': pjoin(td, 'ipython'),
        'PYTHONPATH': python_path_dir,
    }

    env = os.environ.copy()
    env.update(info['extra_env'])

    if callable(patch):
        patch(info)

    command = [sys.executable, '-m', 'notebook',
               '--no-browser',
               '--notebook-dir', nbdir,
               # run with a base URL that would be escaped,
               # to test that we don't double-escape URLs
               '--NotebookApp.base_url=/a@b/',
               '--ip=0.0.0.0',
               ]
    print("command=", command)
    proc = info['popen'] = Popen(command, cwd=nbdir, env=env)
    info_file_path = pjoin(td, 'jupyter_runtime',
                           'nbserver-%i.json' % proc.pid)
    info.update(_wait_for_server(proc, info_file_path))

    print("Notebook server info:", info)

    return info


def _shutdown_notebook_server(info):
    requests.post(urljoin(info['url'], 'api/shutdown'),
                  headers={'Authorization': 'token '+info['token']})