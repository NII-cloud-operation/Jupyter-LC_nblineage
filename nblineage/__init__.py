from notebook.base.handlers import IPythonHandler
from notebook.utils import url_path_join
from .tracking_server import TrackingServer
from . import handler

# nbextension
def _jupyter_nbextension_paths():
    return [dict(
        section="notebook",
        src="nbextension",
        dest="nblineage",
        require="nblineage/main")]

# server extension
def _jupyter_server_extension_paths():
    return [dict(
        module= "nblineage"
    )]

def load_jupyter_server_extension(nb_app):
    nb_app.log.info('Loaded server extension nblineage')

    tracking_server = TrackingServer()
    sign_uuid = tracking_server.server_signature
    nb_app.log.info('Server Signature UUID = {}'.format(sign_uuid))

    web_app = nb_app.web_app
    host_pattern = '.*$'
    count_regex = r'(?P<count>[0-9]+)'
    uuid_route_pattern = url_path_join(web_app.settings['base_url'],
                                  '/uuid/v1/%s' % count_regex)
    signature_route_pattern = url_path_join(web_app.settings['base_url'], '/lc/server_signature')

    web_app.add_handlers(host_pattern, [
        (uuid_route_pattern, handler.UUIDv1Handler, {}),
        (signature_route_pattern, handler.ServerSignatureHandler, dict(nb_app=nb_app))
    ])
