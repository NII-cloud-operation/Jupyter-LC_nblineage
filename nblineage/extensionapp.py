import os.path
import sys
import io

from ._version import __version__

from notebook.nbextensions import (InstallNBExtensionApp, EnableNBExtensionApp,
    DisableNBExtensionApp, flags, aliases)

from jupyter_core.application import JupyterApp
try:
    from notebook.extensions import BaseExtensionApp
except ImportError:
    from notebook.nbextensions import BaseNBExtensionApp
    BaseExtensionApp = BaseNBExtensionApp

from notebook import nbextensions
from notebook import serverextensions

from traitlets.config.application import catch_config_error
from traitlets.config.application import Application
from traitlets import Unicode

import nbformat
from . import meme

class ExtensionQuickSetupApp(BaseExtensionApp):
    """Installs and enables all parts of this extension"""
    name = "jupyter nblineage quick-setup"
    version = __version__
    description = "Installs and enables all features of the nblineage extension"

    def start(self):
        self.argv.extend(['--py', 'nblineage'])

        install = serverextensions.EnableServerExtensionApp()
        install.initialize(self.argv)
        install.start()
        install = nbextensions.InstallNBExtensionApp()
        install.initialize(self.argv)
        install.start()
        enable = nbextensions.EnableNBExtensionApp()
        enable.initialize(self.argv)
        enable.start()

class ExtensionQuickRemovalApp(BaseExtensionApp):
    """Disables and uninstalls all parts of this extension"""
    name = "jupyter nblineage quick-remove"
    version = __version__
    description = "Disables and removes all features of the nblineage extension"

    def start(self):
        self.argv.extend(['--py', 'nblineage'])

        disable = nbextensions.DisableNBExtensionApp()
        disable.initialize(self.argv)
        disable.start()
        uninstall = nbextensions.UninstallNBExtensionApp()
        uninstall.initialize(self.argv)
        uninstall.start()
        uninstall = serverextensions.DisableServerExtensionApp()
        uninstall.initialize(self.argv)
        uninstall.start()

class NewRootMemeApp(Application):
    """Generate a new root meme notebook"""
    name = "jupyter nblinage new-root-meme"
    description = "Generate a new root meme notebook"
    version = __version__

    examples = """
        jupyter nblineage new-root-meme <source.ipynb> <output.ipynb>
    """

    def start(self):
        if len(self.extra_args) != 2:
            self.print_help()
            sys.exit(-1)
        src = self.extra_args[0]
        dest = self.extra_args[1]
        src = os.path.normcase(os.path.normpath(src))
        dest = os.path.normcase(os.path.normpath(dest))

        # check: Does a destination file exist?
        if os.path.exists(dest):
            sys.stderr.write('{} already exists\n'.format(dest))
            sys.exit(-1)

        newroot = meme.NewRootMemeGenerator()
        nb = newroot.from_filename(src)

        with io.open(dest, 'w', encoding='utf-8') as f:
            nbformat.write(nb, f)

class ExtensionApp(Application):
    '''CLI for extension management.'''
    name = u'jupyter_nblineage extension'
    description = u'Utilities for managing the jupyter_nblineage extension'
    examples = ""
    version = __version__

    subcommands = dict()

    subcommands.update({
        "quick-setup": (
            ExtensionQuickSetupApp,
            "Install and enable everything in the package"
        ),
        "quick-remove": (
            ExtensionQuickRemovalApp,
            "Disable and uninstall everything in the package"
        ),
        "new-root-meme": (
            NewRootMemeApp,
            "Generate a new root meme notebook"
        ),
    })

    def _classes_default(self):
        classes = super(ExtensionApp, self)._classes_default()

        # include all the apps that have configurable options
        for appname, (app, help) in self.subcommands.items():
            if len(app.class_traits(config=True)) > 0:
                classes.append(app)

    @catch_config_error
    def initialize(self, argv=None):
        super(ExtensionApp, self).initialize(argv)

    def start(self):
        # check: is there a subapp given?
        if self.subapp is None:
            self.print_help()
            sys.exit(1)

        # This starts subapps
        super(ExtensionApp, self).start()

def main():
    ExtensionApp.launch_instance()
