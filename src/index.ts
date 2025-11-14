import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { NblineageExtension } from './NblineageExtension';

/**
 * Initialization data for the nblineage extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'nblineage:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension nblineage is activated!');
    app.docRegistry.addWidgetExtension('Notebook', new NblineageExtension());
  }
};
export default plugin;
