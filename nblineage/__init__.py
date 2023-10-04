import json
from pathlib import Path
# from notebook.base.handlers import IPythonHandler
from jupyter_server.utils import url_path_join
from .tracking_server import TrackingServer
from . import handler

# JupyterLab extension
def _jupyter_labextension_paths():
    return [{
        "src": "labextension",
        "dest": "nblineage"
    }]

# nbextension
def _jupyter_nbextension_paths():
    return [dict(
        section="notebook",
        src="nbextension",
        dest="nblineage",
        require="nblineage/main")]

# server extension
def _jupyter_server_extension_points():
    return [dict(
        module="nblineage"
    )]

def _jupyter_server_extension_paths():
    return _jupyter_server_extension_points()

def _load_jupyter_server_extension(nb_app):
    nb_app.log.info('Loaded server extension nblineage')

    tracking_server = TrackingServer()
    sign_uuid = tracking_server.server_signature
    nb_app.log.info('Server Signature UUID = {}'.format(sign_uuid))

    web_app = nb_app.web_app
    host_pattern = '.*$'
    count_regex = r'(?P<count>[0-9]+)'
    base_url = web_app.settings['base_url']
    uuid_route_pattern = url_path_join(base_url, '/nblineage/uuid/v1/%s' % count_regex)
    signature_route_pattern = url_path_join(base_url, '/nblineage/lc/server_signature')

    web_app.add_handlers(host_pattern, [
        (uuid_route_pattern, handler.UUIDv1Handler, {}),
        (signature_route_pattern, handler.ServerSignatureHandler, dict(nb_app=nb_app))
    ])

# For backward compatibility with notebook server - useful for Binder/JupyterHub
load_jupyter_server_extension = _load_jupyter_server_extension