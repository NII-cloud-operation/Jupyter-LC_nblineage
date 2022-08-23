import { ICellModel } from "@jupyterlab/cells";
import { URLExt } from '@jupyterlab/coreutils';
import { INotebookModel } from "@jupyterlab/notebook";
import { ServerConnection } from '@jupyterlab/services';
import { ReadonlyPartialJSONObject, ReadonlyPartialJSONValue } from '@lumino/coreutils';

//const CELL_MEME_ATTR_KEY = 'data-nblineage-meme';

interface MEME {
  uuid: string;
  branch_count: number;
  branch_numbers: string[];
}

interface MEMEHistory {
  current?: string;
  previous?: string;
  next?: string;
}

export interface CellMEME {
  execution_end_time?: string;
  current?: string;
  previous?: string;
  next?: string;
  history?: MEMEHistory[];
}

export interface ServerSignatureRecord {
  notebook_dir?: string;
  notebook_path?: string;
  server_url?: string;
  signature_id?: string;
}

export interface ServerSignature {
  current?: ServerSignatureRecord;
  history?: ServerSignatureRecord[];
}

export interface NotebookMEME {
  current?: string;
  lc_server_signature?: ServerSignature;
}

interface UUIDResult {
  uuid: string[];
}

export function isNotebookMEME(meme: ReadonlyPartialJSONValue | undefined | null) {
  if (!meme) {
    return false;
  }
  if (typeof meme !== 'object' && typeof meme !== 'function') {
    return false;
  }
  return 'current' in meme || 'lc_server_signature' in meme;
}

export function isCellMEME(meme: ReadonlyPartialJSONValue | undefined | null) {
  if (!meme) {
    return false;
  }
  if (typeof meme !== 'object' && typeof meme !== 'function') {
    return false;
  }
  return 'current' in meme || 'execution_end_time' in meme;
}

export async function generateUUID(count: number) {
  if (count === 0) {
    return [];
  }
  const settings = ServerConnection.makeSettings();
  const requestUrl = URLExt.join(
    settings.baseUrl,
    'nblineage', // API Namespace
    'uuid/v1/' + count,
  );
  let response: Response;
  try {
    response = await ServerConnection.makeRequest(requestUrl, {}, settings);
  } catch (error) {
    throw new ServerConnection.NetworkError(error as any);
  }
  const data: UUIDResult = await response.json();
  return data.uuid;
}

function generateNotebookMEME(notebook: INotebookModel, uuids: string[] | null) {
    let counter = 0;
    const memeobj = notebook.metadata.get('lc_notebook_meme');
    const meme: NotebookMEME = isNotebookMEME(memeobj) ? (memeobj as NotebookMEME) : {};
    if (!meme.current) {
      if(uuids) {
        if (uuids.length <= 0) {
          throw new Error('too few generated UUIDs');
        }
        meme.current = uuids.shift();
      }
      counter++;
    }
    notebook.metadata.set('lc_notebook_meme', meme as ReadonlyPartialJSONObject);

    const cells = notebook.cells;
    for (let i = 0; i < cells.length; ++ i) {
      counter += generateCellMEME(cells.get(i), uuids);
    }
    return counter;
}

function generateCellMEME(cell: ICellModel, uuids: string[] | null) {
    let counter = 0;
    const memeobj = cell.metadata.get('lc_cell_meme');
    const meme: CellMEME = isCellMEME(memeobj) ? (memeobj as CellMEME) : {};
    if(!meme.current) {
      if(uuids) {
        if (uuids.length <= 0) {
          throw new Error('too few generated UUIDs');
        }
        meme.current = uuids.shift()
        cell.metadata.set('lc_cell_meme', meme as ReadonlyPartialJSONObject);
        updateCellElemAttr(cell);
      }
      counter++;
    }
    return counter;
}

function updatePrevNextMEME(notebook: INotebookModel) {
  const cells = notebook.cells;
  for (let i = 0; i < cells.length; ++i) {
    const prev_cell = i > 0 ? cells.get(i - 1) : null;
    const next_cell = i <　cells.length - 1 ? cells.get(i + 1) : null;
    updatePrevNextCellMEME(cells.get(i), prev_cell, next_cell);
  }
}

function updatePrevNextCellMEME(cell: ICellModel, prevCell: ICellModel | null, nextCell: ICellModel | null) {
  const memeobj = cell.metadata.get('lc_cell_meme');
  const meme: CellMEME = isCellMEME(memeobj) ? (memeobj as CellMEME) : {};
  const prevMemeobj = prevCell ? prevCell.metadata.get('lc_cell_meme') : null;
  const nextMemeobj = nextCell ? nextCell.metadata.get('lc_cell_meme') : null;

  const previous = prevMemeobj ? (isCellMEME(prevMemeobj) ? (prevMemeobj as CellMEME).current : null) : null;
  const next = nextMemeobj ? (isCellMEME(nextMemeobj) ? (nextMemeobj as CellMEME).current : null) : null;
  if (previous) {
    meme.previous = previous;
  } else {
    delete meme.previous;
  }
  if (next) {
    meme.next = next;
  } else {
    delete meme.next;
  }
  cell.metadata.set('lc_cell_meme', meme as ReadonlyPartialJSONObject);
}

function updatePrevNextHistory(notebook: INotebookModel) {
  let counter = 0;
  const cells = notebook.cells;
  for (let i = 0; i < cells.length; ++i) {
    const prev_cell = i > 0 ? cells.get(i-1) : null;
    const next_cell = i <　cells.length-1 ? cells.get(i+1) : null;
    counter += updatePrevNextCellHistory(cells.get(i), prev_cell, next_cell);
  }
  return counter;
}

function updatePrevNextCellHistory(cell: ICellModel, prevCell: ICellModel | null, nextCell: ICellModel | null) {
  const memeobj = cell.metadata.get('lc_cell_meme');
  if (!isCellMEME(memeobj)) {
    return 0;
  }
  const meme = memeobj as CellMEME;
  if (typeof meme.current === "undefined"
    || typeof meme.previous === "undefined"
    || typeof meme.next === "undefined") {
    return 0;
  }

  const prev_meme = meme.previous;
  const next_meme = meme.next;
  const prevMemeobj = prevCell ? prevCell.metadata.get('lc_cell_meme') : null;
  const nextMemeobj = nextCell ? nextCell.metadata.get('lc_cell_meme') : null;
  const previous = prevMemeobj ? (isCellMEME(prevMemeobj) ? (prevMemeobj as CellMEME) : null) : null;
  const next = nextMemeobj ? (isCellMEME(nextMemeobj) ? (nextMemeobj as CellMEME) : null) : null;

  if ((previous && previous.current !== prev_meme)
    || (prevCell && !previous)
    || (next && next.current != next_meme)
    || (nextCell && !next)) {
    let history = meme.history;
    if (!history) {
      history = meme.history = [];
    }
    history.push({
      current: meme.current,
      previous: meme.previous,
      next: meme.next,
    });
    cell.metadata.set('lc_cell_meme', meme as ReadonlyPartialJSONObject);
    return 1;
  }
  return 0;
}

export async function generateMEME(notebook: INotebookModel) {
  const history_count = updatePrevNextHistory(notebook);
  let meme_count = generateNotebookMEME(notebook, null);
  const uuids = await generateUUID(meme_count);
  if (!uuids) {
    throw new Error('Failed to get UUIDs from server');
  }
  meme_count = generateNotebookMEME(notebook, uuids);
  updatePrevNextMEME(notebook);

  return {
    meme_count: meme_count,
    cell_history_count: history_count
  };
}

function createBranchNumber() {
  const num = Math.random() * 0xffff;
  return Math.floor(num).toString(16).padStart(4, '0');
}

function parseCellMEME(meme: string): MEME {
  const ids = meme.split('-');
  const uuid = ids.slice(0, 5).join('-');
  const branch_count = ids.length > 5 ? parseInt(ids[5]) : 0;
  const branch_numbers = ids.slice(6);
  return {uuid, branch_count, branch_numbers};
}

function combineCellMEME(parts: MEME) {
  let meme = parts.uuid;
  if (parts.branch_count > 0) {
    meme += '-' + parts.branch_count;
    meme += '-' + parts.branch_numbers.join('-');
  }
  return meme;
}

function addBranchNumber(meme: string) {
  const parts = parseCellMEME(meme);
  const new_branch = createBranchNumber();
  parts.branch_numbers.push(new_branch);
  if (parts.branch_numbers.length > 10) {
    parts.branch_numbers.shift();
  }
  ++parts.branch_count;
  return combineCellMEME(parts);
}

export function generateBranchNumber(cell: ICellModel) {
  const meme = cell.metadata.get('lc_cell_meme');
  if (!isCellMEME(meme)) {
    return;
  }
  const newMeme = Object.assign({}, meme) as CellMEME;
  if (!newMeme.current) {
    return;
  }
  newMeme.current = addBranchNumber(newMeme.current);
  cell.metadata.set('lc_cell_meme', newMeme as ReadonlyPartialJSONObject);
  updateCellElemAttr(cell);
}

export function generateBranchNumberAll(notebook: INotebookModel) {
  for (let i = 0; i < notebook.cells.length; i ++) {
    const cell = notebook.cells.get(i);
    generateBranchNumber(cell);
  }
}

export function updateCellElemAttr(cell: ICellModel) {
  /*
  const current = cell.metadata['lc_cell_meme'] && cell.metadata['lc_cell_meme']['current'] || '';
  cell.element.attr(CELL_MEME_ATTR_KEY, current);
  */
}
