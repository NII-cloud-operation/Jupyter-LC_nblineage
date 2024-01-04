import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the nblineage extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'nblineage:plugin',
  description: 'lineage extension for Jupyter Notebook',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension nblineage is activated!');
  }
};

export default plugin;
