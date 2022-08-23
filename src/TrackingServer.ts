import { INotebookModel, NotebookPanel } from "@jupyterlab/notebook";
import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { isNotebookMEME, NotebookMEME, ServerSignatureRecord } from "./Meme";
import { ReadonlyPartialJSONObject } from "@lumino/coreutils";

interface ServerEnv extends ServerSignatureRecord {

}

export class TrackingServer {
    serverEnv: ServerEnv | null = null;

    async trackServer(panel: NotebookPanel, notebook: INotebookModel) {
      console.log('[nblineage] tracking the notebook server environment');

      const memeobj = notebook.metadata.get('lc_notebook_meme');
      const meme: NotebookMEME = isNotebookMEME(memeobj) ? (memeobj as NotebookMEME) : {};

      if (!meme.lc_server_signature) {
        meme.lc_server_signature = {};
      }
      const trackingMetadata = meme.lc_server_signature;

      var serverSignature = await this.getServerSignature(panel, notebook);
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
        notebook.metadata.set('lc_notebook_meme', meme as ReadonlyPartialJSONObject);
        return true;
      } else {
        return false;
      }
    }

    equalsSignature(a: ServerSignatureRecord | undefined, b: ServerSignatureRecord | undefined) {
      if (a === undefined && b === undefined) {
        return true;
      }
      if (a === undefined || b === undefined) {
        return false;
      }
      return this.equalsProperty(a, b, 'signature_id') &&
        this.equalsProperty(a, b, 'server_url') &&
        this.equalsProperty(a, b, 'notebook_dir') &&
        this.equalsProperty(a, b, 'notebook_path');
    }

    equalsProperty(a: any, b: any, name: string) {
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

    async getServerSignature(panel: NotebookPanel, notebook: INotebookModel) {
      const serverEnv = await this.initServerEnv();
      const serverSignature: ServerSignatureRecord = {};

      serverSignature.notebook_path = panel.title.caption;
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
      'lc/server_signature',
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
