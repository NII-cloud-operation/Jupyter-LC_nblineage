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

pjoin = os.path.join


@pytest.fixture(scope='session')
def notebook_server():
    info = {}
    with TemporaryDirectory() as td:
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

        info['extra_env'] = {
            'JUPYTER_CONFIG_DIR': pjoin(td, 'jupyter_config'),
            'JUPYTER_RUNTIME_DIR': pjoin(td, 'jupyter_runtime'),
            'IPYTHONDIR': pjoin(td, 'ipython'),
            'PYTHONPATH': os.path.abspath(pjoin(os.path.dirname(__file__), '..', '..', '..')),
        }

        env = os.environ.copy()
        env.update(info['extra_env'])

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
        yield info

    # Shut the server down
    requests.post(urljoin(info['url'], 'api/shutdown'),
                  headers={'Authorization': 'token '+info['token']})
