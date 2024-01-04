import { expect, test } from '@jupyterlab/galata';

/**
 * Don't load JupyterLab webpage before running the tests.
 * This is required to ensure we capture all log messages.
 */
test.use({ autoGoto: false });
test('should emit an activation console message', async ({ page }) => {
  const logs: string[] = [];

  page.on('console', message => {
    logs.push(message.text());
  });
  // load jupyter lab
  await page.goto();

  expect(
    logs.filter(s => s === 'JupyterLab extension nblineage is activated!')
  ).toHaveLength(1);
});

test.use({ autoGoto: true });
test('should store meme in metadata of notebook', async ({ page, baseURL, tmpPath }) => {
  // create new notebook
  const fileName = "nblineage_test.ipynb";
  await page.notebook.createNew(fileName);
  await page.waitForSelector(`[role="main"] >> text=${fileName}`);
  await page.notebook.addCell('code', 'print("test")');
  // save notebook
  await page.notebook.save();
  // get saved notebook as json
  let content = await fetch(`${baseURL}/files/${tmpPath}/${fileName}`);
  let json = await content.json();
  // check lc_notebook_meme
  expect(json["metadata"]["lc_notebook_meme"]).toBeTruthy();
  // check lc_cell_meme
  expect(json["cells"][0]["metadata"]["lc_cell_meme"]).toBeTruthy();
});