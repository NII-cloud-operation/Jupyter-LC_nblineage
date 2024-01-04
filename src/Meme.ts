import { ICellModel } from '@jupyterlab/cells';
import { URLExt } from '@jupyterlab/coreutils';
import { INotebookModel } from '@jupyterlab/notebook';
import { ServerConnection } from '@jupyterlab/services';
import {
  ReadonlyPartialJSONObject,
  ReadonlyPartialJSONValue
} from '@lumino/coreutils';

//const CELL_MEME_ATTR_KEY = 'data-nblineage-meme';

interface IMEME {
  uuid: string;
  branch_count: number;
  branch_numbers: string[];
}

interface IMEMEHistory {
  current?: string;
  previous?: string;
  next?: string;
}

export interface ICellMEME {
  execution_end_time?: string;
  current?: string;
  previous?: string;
  next?: string;
  history?: IMEMEHistory[];
}

export interface IServerSignatureRecord {
  notebook_dir?: string;
  notebook_path?: string;
  server_url?: string;
  signature_id?: string;
}

export interface IServerSignature {
  current?: IServerSignatureRecord;
  history?: IServerSignatureRecord[];
}

export interface INotebookMEME {
  current?: string;
  lc_server_signature?: IServerSignature;
}

interface IUUIDResult {
  uuid: string[];
}

interface IGeneratedMEME {
  meme_count: number;
  cell_history_count: number;
}

export function isNotebookMEME(
  meme: ReadonlyPartialJSONValue | undefined | null
): boolean {
  if (!meme) {
    return false;
  }
  if (typeof meme !== 'object' && typeof meme !== 'function') {
    return false;
  }
  return 'current' in meme || 'lc_server_signature' in meme;
}

export function isCellMEME(
  meme: ReadonlyPartialJSONValue | undefined | null
): boolean {
  if (!meme) {
    return false;
  }
  if (typeof meme !== 'object' && typeof meme !== 'function') {
    return false;
  }
  return 'current' in meme || 'execution_end_time' in meme;
}

export async function generateUUID(count: number): Promise<string[]> {
  if (count === 0) {
    return [];
  }
  const settings = ServerConnection.makeSettings();
  const requestUrl = URLExt.join(
    settings.baseUrl,
    'nblineage', // API Namespace
    'uuid/v1/' + count
  );
  let response: Response;
  try {
    response = await ServerConnection.makeRequest(requestUrl, {}, settings);
  } catch (error) {
    throw new ServerConnection.NetworkError(error as any);
  }
  const data: IUUIDResult = await response.json();
  return data.uuid;
}

function generateNotebookMEME(
  notebook: INotebookModel,
  uuids: string[] | null
) {
  let counter = 0;
  const memeobj = notebook.getMetadata('lc_notebook_meme');
  const meme: INotebookMEME = isNotebookMEME(memeobj)
    ? (memeobj as INotebookMEME)
    : {};
  if (!meme.current) {
    if (uuids) {
      if (uuids.length <= 0) {
        throw new Error('too few generated UUIDs');
      }
      meme.current = uuids.shift();
    }
    counter++;
  }
  notebook.setMetadata('lc_notebook_meme', meme as ReadonlyPartialJSONObject);

  const cells = notebook.cells;
  for (let i = 0; i < cells.length; ++i) {
    counter += generateCellMEME(cells.get(i), uuids);
  }
  return counter;
}

function generateCellMEME(cell: ICellModel, uuids: string[] | null) {
  let counter = 0;
  const memeobj = cell.getMetadata('lc_cell_meme');
  const meme: ICellMEME = isCellMEME(memeobj) ? (memeobj as ICellMEME) : {};
  if (!meme.current) {
    if (uuids) {
      if (uuids.length <= 0) {
        throw new Error('too few generated UUIDs');
      }
      meme.current = uuids.shift();
      cell.setMetadata('lc_cell_meme', meme as ReadonlyPartialJSONObject);
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
    const next_cell = i < cells.length - 1 ? cells.get(i + 1) : null;
    updatePrevNextCellMEME(cells.get(i), prev_cell, next_cell);
  }
}

function updatePrevNextCellMEME(
  cell: ICellModel,
  prevCell: ICellModel | null,
  nextCell: ICellModel | null
) {
  const memeobj = cell.getMetadata('lc_cell_meme');
  const meme: ICellMEME = isCellMEME(memeobj) ? (memeobj as ICellMEME) : {};
  const prevMemeobj = prevCell ? prevCell.getMetadata('lc_cell_meme') : null;
  const nextMemeobj = nextCell ? nextCell.getMetadata('lc_cell_meme') : null;

  const previous = prevMemeobj
    ? isCellMEME(prevMemeobj)
      ? (prevMemeobj as ICellMEME).current
      : null
    : null;
  const next = nextMemeobj
    ? isCellMEME(nextMemeobj)
      ? (nextMemeobj as ICellMEME).current
      : null
    : null;
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
  cell.setMetadata('lc_cell_meme', meme as ReadonlyPartialJSONObject);
}

function updatePrevNextHistory(notebook: INotebookModel) {
  let counter = 0;
  const cells = notebook.cells;
  for (let i = 0; i < cells.length; ++i) {
    const prev_cell = i > 0 ? cells.get(i - 1) : null;
    const next_cell = i < cells.length - 1 ? cells.get(i + 1) : null;
    counter += updatePrevNextCellHistory(cells.get(i), prev_cell, next_cell);
  }
  return counter;
}

function updatePrevNextCellHistory(
  cell: ICellModel,
  prevCell: ICellModel | null,
  nextCell: ICellModel | null
) {
  const memeobj = cell.getMetadata('lc_cell_meme');
  if (!isCellMEME(memeobj)) {
    return 0;
  }
  const meme = memeobj as ICellMEME;
  if (
    typeof meme.current === 'undefined' ||
    typeof meme.previous === 'undefined' ||
    typeof meme.next === 'undefined'
  ) {
    return 0;
  }

  const prev_meme = meme.previous;
  const next_meme = meme.next;
  const prevMemeobj = prevCell ? prevCell.getMetadata('lc_cell_meme') : null;
  const nextMemeobj = nextCell ? nextCell.getMetadata('lc_cell_meme') : null;
  const previous = prevMemeobj
    ? isCellMEME(prevMemeobj)
      ? (prevMemeobj as ICellMEME)
      : null
    : null;
  const next = nextMemeobj
    ? isCellMEME(nextMemeobj)
      ? (nextMemeobj as ICellMEME)
      : null
    : null;

  if (
    (previous && previous.current !== prev_meme) ||
    (prevCell && !previous) ||
    (next && next.current !== next_meme) ||
    (nextCell && !next)
  ) {
    let history = meme.history;
    if (!history) {
      history = meme.history = [];
    }
    history.push({
      current: meme.current,
      previous: meme.previous,
      next: meme.next
    });
    cell.setMetadata('lc_cell_meme', meme as ReadonlyPartialJSONObject);
    return 1;
  }
  return 0;
}

export async function generateMEME(
  notebook: INotebookModel
): Promise<IGeneratedMEME> {
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

function parseCellMEME(meme: string): IMEME {
  const ids = meme.split('-');
  const uuid = ids.slice(0, 5).join('-');
  const branch_count = ids.length > 5 ? parseInt(ids[5]) : 0;
  const branch_numbers = ids.slice(6);
  return { uuid, branch_count, branch_numbers };
}

function combineCellMEME(parts: IMEME) {
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

export function generateBranchNumber(cell: ICellModel): void {
  const meme = cell.getMetadata('lc_cell_meme');
  if (!isCellMEME(meme)) {
    return;
  }
  const newMeme = Object.assign({}, meme) as ICellMEME;
  if (!newMeme.current) {
    return;
  }
  newMeme.current = addBranchNumber(newMeme.current);
  cell.setMetadata('lc_cell_meme', newMeme as ReadonlyPartialJSONObject);
  updateCellElemAttr(cell);
}

export function generateBranchNumberAll(notebook: INotebookModel): void {
  for (let i = 0; i < notebook.cells.length; i++) {
    const cell = notebook.cells.get(i);
    generateBranchNumber(cell);
  }
}

export function updateCellElemAttr(cell: ICellModel): void {
  /*
  const current = cell.metadata['lc_cell_meme'] && cell.metadata['lc_cell_meme']['current'] || '';
  cell.element.attr(CELL_MEME_ATTR_KEY, current);
  */
}
