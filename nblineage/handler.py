from notebook.base.handlers import IPythonHandler
from tornado import web
from uuid import uuid1
from .tracking_server import TrackingServer
import itertools

class UUIDv1Handler(IPythonHandler):
    def initialize(self):
        pass

    @web.authenticated
    def get(self, count):
        count = int(count)
        uuids = [str(uuid1()) for x in itertools.repeat(None, count)]
        self.finish(dict(uuid=uuids))

class ServerSignatureHandler(IPythonHandler):
    def initialize(self, nb_app):
        self.tracking_server = TrackingServer()
        self.nb_app = nb_app

    @web.authenticated
    def get(self):
        response = dict(
            signature_id=self.tracking_server.server_signature,
            notebook_dir=self.nb_app.notebook_dir
        )
        self.finish(response)
