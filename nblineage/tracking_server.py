import io
import os
from uuid import uuid1

from jupyter_core.application import JupyterApp

from traitlets.config import LoggingConfigurable, MultipleInstanceError
from traitlets import (
    Unicode, default
)

class TrackingServer(LoggingConfigurable):

    def __init__(self, **kwargs):
        super(TrackingServer, self).__init__(**kwargs)

    data_dir = Unicode()
    @default('data_dir')
    def _data_dir_default(self):
        app = None
        try:
            if JupyterApp.initialized():
                app = JupyterApp.instance()
        except MultipleInstanceError:
            pass
        if app is None:
            # create an app, without the global instance
            app = JupyterApp()
            app.initialize(argv=[])
        return app.data_dir

    server_signature_file = Unicode(
        help="""The file where the server signature is stored."""
    ).tag(config=True)
    @default('server_signature_file')
    def _server_signature_file_default(self):
        if not self.data_dir:
            return ''
        return os.path.join(self.data_dir, 'server_signature')

    def _write_server_signature_file(self, sign_id):
        self.log.info("Writing server signature to %s", self.server_signature_file)
        with io.open(self.server_signature_file, 'w') as f:
            f.write(sign_id)
        return sign_id

    server_signature = Unicode(
        help="""The server signature for Literate Computing"""
    ).tag(config=True)
    @default('server_signature')
    def _server_signature_default(self):
        if os.path.exists(self.server_signature_file):
            with io.open(self.server_signature_file, 'r') as f:
                return f.read()
        else:
            sign_id = u'%s' % str(uuid1())
            self._write_server_signature_file(sign_id)
            return sign_id
