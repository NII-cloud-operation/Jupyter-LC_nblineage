//import { Widget } from '@lumino/widgets';
import { INotebookModel, Notebook, NotebookPanel } from '@jupyterlab/notebook';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IDisposable } from '@lumino/disposable';
import { ICodeCellModel, isCodeCellModel } from '@jupyterlab/cells';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import {
  ICellMEME,
  isCellMEME,
  generateBranchNumber,
  generateBranchNumberAll,
  generateMEME
} from './Meme';
import { TrackingServer } from './TrackingServer';

function getCellByModelId(notebook: Notebook, cellModelId: string) {
  return notebook.widgets.find(c => c.model.id === cellModelId);
}

export class NblineageExtension
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel>
{
  trackingServer = new TrackingServer();

  createNew(
    panel: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ): void | IDisposable {
    let nblineageAttached = false;
    panel.content.model?.stateChanged.connect((self, changes) => {
      if (changes.name !== 'dirty' || !changes.newValue) {
        return;
      }
      if (nblineageAttached) {
        return;
      }
      nblineageAttached = true;
      this.initBranchUpdater(panel);
      this.initExecutionEndTimeUpdater(panel);
      this.addBranchNumbers(panel)
        .then(() => {
          this.initMEMEGenerator(panel);
        })
        .catch(error => {
          /*notification_area.danger('[nblineage] Server error', undefined, undefined, {
            title: e.message
          });*/
          console.error('[nblineage]', error);
        });
    });
  }

  initBranchUpdater(panel: NotebookPanel): void {
    panel.content.model?.cells.changed.connect((_, change) => {
      if (change.type === 'add') {
        change.newValues.forEach(cellModel => {
          const cell = getCellByModelId(panel.content, cellModel.id);
          if (!cell) {
            return;
          }
          generateBranchNumber(cell.model);
        });
      }
    });
  }

  initMEMEGenerator(panel: NotebookPanel): void {
    panel.content.model?.cells.changed.connect((_, change) => {
      if (!panel.content.model) {
        return;
      }
      generateMEME(panel.content.model)
        .then(result => {
          console.log(
            '[nblineage] Generated meme: path=%s, cell_history_count=%d, meme_count=%d',
            panel.title,
            result.cell_history_count,
            result.meme_count
          );
        })
        .catch(error => {
          /*notification_area.danger('[nblineage] Server error', undefined, undefined, {
            title: e.message
          });*/
          console.error('[nblineage]', error);
        });
    });
  }

  initExecutionEndTimeUpdater(panel: NotebookPanel): void {
    panel.content.model?.cells.changed.connect((_, change) => {
      if (change.type === 'add') {
        change.newValues.forEach(cellModel => {
          const cell = getCellByModelId(panel.content, cellModel.id);
          if (!cell || !isCodeCellModel(cell.model)) {
            return;
          }
          this.connectExecutionEndTimeUpdater(cell.model as ICodeCellModel);
        });
      }
    });
  }

  connectExecutionEndTimeUpdater(codeCell: ICodeCellModel): void {
    codeCell.outputs.changed.connect((_, changed) => {
      if (changed.type === 'add') {
        // Executed
        const meme = codeCell.getMetadata('lc_cell_meme') || {};
        const time = new Date().toISOString();
        const newMeme = Object.assign(meme, {
          execution_end_time: time
        });
        codeCell.setMetadata('lc_cell_meme', newMeme);
      } else if (changed.type === 'remove' && codeCell.outputs.length === 0) {
        // Clear Outputs
        const meme = codeCell.getMetadata('lc_cell_meme') || {};
        if (!isCellMEME(meme)) {
          return;
        }
        const newMeme = meme as ICellMEME;
        delete newMeme.execution_end_time;
        codeCell.setMetadata(
          'lc_cell_meme',
          newMeme as ReadonlyPartialJSONObject
        );
      }
    });
  }

  async addBranchNumbers(panel: NotebookPanel): Promise<void> {
    if (!panel.model) {
      return;
    }
    let is_changed_server_signature = false;
    try {
      is_changed_server_signature = await this.trackingServer.trackServer(
        panel,
        panel.model
      );
    } catch (e) {
      /*notification_area.danger('[nblineage] Server error', undefined, undefined, {
            title: e.message
        });*/
      console.error('[nblineage]', e);
    }
    if (!is_changed_server_signature) {
      return;
    }
    generateBranchNumberAll(panel.model);
  }
}
