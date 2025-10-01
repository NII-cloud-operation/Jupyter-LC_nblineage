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
  generateMEME,
  updatePrevNextMEME
} from './Meme';
import { TrackingServer } from './TrackingServer';

function getCellByModelId(notebook: Notebook, cellModelId: string) {
  return notebook.widgets.find(c => c.model.id === cellModelId);
}

export class NblineageExtension
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel>
{
  trackingServer = new TrackingServer();
  private isGeneratingMeme = false;

  createNew(
    panel: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ): void | IDisposable {
    // Initialize execution time handler immediately (doesn't affect MEMEs)
    this.initExecutionEndTimeUpdater(panel);

    // Check server signature once after the notebook is fully loaded
    context.ready.then(async () => {
      console.log('[nblineage] Notebook ready, checking server signature');
      try {
        await this.addBranchNumbers(panel);
      } catch (error) {
        console.error('[nblineage] Failed to check server signature:', error);
      }

      // Initialize branch updater AFTER initial load to avoid adding branches to existing cells
      this.initBranchUpdater(panel);

      // Also connect execution time updater for existing cells
      this.initExistingCellsExecutionUpdater(panel);

      // Generate MEME when content changes
      // This ensures MEME exists when the actual save happens
      // Set up AFTER addBranchNumbers to avoid triggering on branch number additions
      context.model.contentChanged.connect(async () => {
        // Prevent infinite loop: skip if we're already generating MEME
        if (this.isGeneratingMeme) {
          return;
        }
        const model = context.model;
        if (!model) {
          return;
        }
        this.isGeneratingMeme = true;
        try {
          // Generate MEME for new cells and update prev/next relationships
          const result = await generateMEME(model);
          if (result.meme_count > 0) {
            console.log(
              '[nblineage] Generated %d new MEMEs for %s',
              result.meme_count,
              panel.context.localPath
            );
          }
        } catch (error) {
          console.error(
            '[nblineage] Error generating MEME on content change:',
            error
          );
        } finally {
          this.isGeneratingMeme = false;
        }
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
        // Update prev/next relationships after all branch numbers are generated
        if (panel.content.model) {
          updatePrevNextMEME(panel.content.model);
          console.log('[nblineage] initBranchUpdater: Updated prev/next relationships after branch generation');
        }
      }
    });
  }

  initExistingCellsExecutionUpdater(panel: NotebookPanel): void {
    // Connect execution time updater for all existing code cells
    if (!panel.content.model) {
      return;
    }
    for (let i = 0; i < panel.content.model.cells.length; i++) {
      const cellModel = panel.content.model.cells.get(i);
      const cell = getCellByModelId(panel.content, cellModel.id);
      if (cell && isCodeCellModel(cell.model)) {
        this.connectExecutionEndTimeUpdater(cell.model as ICodeCellModel);
      }
    }
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
    console.log(
      '[nblineage] Server signature changed, regenerating branch numbers for %s',
      panel.context.localPath
    );
    generateBranchNumberAll(panel.model);
    updatePrevNextMEME(panel.model);
  }
}
