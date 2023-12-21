import { INotebookModel, NotebookPanel } from '@jupyterlab/notebook';
import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { isNotebookMEME, INotebookMEME, IServerSignatureRecord } from './Meme';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';

type ServerEnv = IServerSignatureRecord;

export class TrackingServer {
  serverEnv: ServerEnv | null = null;

  async trackServer(
    panel: NotebookPanel,
    notebook: INotebookModel
  ): Promise<boolean> {
    console.log('[nblineage] tracking the notebook server environment');

    const memeobj = notebook.getMetadata('lc_notebook_meme');
    const meme: INotebookMEME = isNotebookMEME(memeobj)
      ? (memeobj as INotebookMEME)
      : {};

    if (!meme.lc_server_signature) {
      meme.lc_server_signature = {};
    }
    const trackingMetadata = meme.lc_server_signature;

    const serverSignature = await this.getServerSignature(panel, notebook);
    console.log('[nblineage] server_signature = %o', serverSignature);

    if (!this.equalsSignature(trackingMetadata.current, serverSignature)) {
      console.log('[nblineage] detected the notebook server was changed');

      if (trackingMetadata.history === undefined) {
        trackingMetadata.history = [];
      }

      if (trackingMetadata.current) {
        trackingMetadata.history.push(trackingMetadata.current);
      }
      trackingMetadata.current = serverSignature;
      notebook.setMetadata(
        'lc_notebook_meme',
        meme as ReadonlyPartialJSONObject
      );
      return true;
    } else {
      return false;
    }
  }

  equalsSignature(
    a: IServerSignatureRecord | undefined,
    b: IServerSignatureRecord | undefined
  ): boolean {
    if (a === undefined && b === undefined) {
      return true;
    }
    if (a === undefined || b === undefined) {
      return false;
    }
    return (
      this.equalsProperty(a, b, 'signature_id') &&
      this.equalsProperty(a, b, 'server_url') &&
      this.equalsProperty(a, b, 'notebook_dir') &&
      this.equalsProperty(a, b, 'notebook_path')
    );
  }

  equalsProperty(
    a: IServerSignatureRecord,
    b: IServerSignatureRecord,
    name: 'signature_id' | 'server_url' | 'notebook_dir' | 'notebook_path'
  ): boolean {
    const va = a[name];
    const vb = b[name];
    if (va === undefined && vb === undefined) {
      return true;
    }
    if (va === undefined || vb === undefined) {
      return false;
    }
    return va === vb;
  }

  async getServerSignature(
    panel: NotebookPanel,
    notebook: INotebookModel
  ): Promise<IServerSignatureRecord> {
    const serverEnv = await this.initServerEnv();
    const serverSignature: IServerSignatureRecord = {};

    let path = panel.context.contentsModel?.path;
    if (path && path.charAt(0) !== '/') {
      path = '/' + path;
    }
    serverSignature.notebook_path = path;
    console.log(serverSignature.notebook_path);
    /*
      notebook.
        server_signature['server_url'] = window.location.protocol + "//" + window.location.host + notebook.base_url;
        var path = notebook.notebook_path;
        if (path) {
            var slash_index = path.lastIndexOf('/');
            if (slash_index >= 0) {
                path = path.substring(0, slash_index);
            } else {
                path = '/';
            }
        }
        if (path.charAt(0) !== '/') {
            path = '/' + path;
        }
        server_signature['notebook_path'] = path;
      */
    return Object.assign(serverSignature, serverEnv);
  }

  async initServerEnv(): Promise<ServerEnv> {
    if (this.serverEnv) {
      return this.serverEnv;
    }
    const settings = ServerConnection.makeSettings();
    const requestUrl = URLExt.join(
      settings.baseUrl,
      'nblineage', // API Namespace
      'lc/server_signature'
    );
    let response: Response;
    try {
      response = await ServerConnection.makeRequest(requestUrl, {}, settings);
    } catch (error) {
      throw new ServerConnection.NetworkError(error as any);
    }
    const serverEnv = await response.json();
    this.serverEnv = serverEnv;
    return serverEnv;
  }
}
