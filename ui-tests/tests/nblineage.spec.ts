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

test.use({ autoGoto: true, viewport: {width: 1600, height: 1200} });
test('should generate unique MEMEs when cells are added', async ({ page, baseURL, tmpPath }) => {
  const fileName = "branch_test.ipynb";
  await page.notebook.createNew(fileName);
  await page.waitForSelector(`[role="main"] >> text=${fileName}`);

  // Ensure we have a cell with content - use existing cell or add new one
  const cellCount = await page.notebook.getCellCount();
  if (cellCount === 0) {
    await page.notebook.addCell('code', 'print("first cell")');
  } else {
    await page.notebook.setCell(0, 'code', 'print("first cell")');
  }
  await page.notebook.save();

  // Get initial state
  let content = await fetch(`${baseURL}/files/${tmpPath}/${fileName}`);
  let json = await content.json();

  // Check that notebook MEME is generated
  expect(json["metadata"]["lc_notebook_meme"]).toBeTruthy();

  const originalMeme = json["cells"][0]["metadata"]["lc_cell_meme"]["current"];
  expect(originalMeme).toBeTruthy();
  expect(originalMeme).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

  // Add second cell - this should generate a new MEME for the second cell
  // Ensure the notebook is ready by activating the first cell
  await page.notebook.selectCells(0);
  await page.notebook.addCell('code', 'print("second cell")');
  await page.notebook.save();

  // Check if second cell got its own MEME
  content = await fetch(`${baseURL}/files/${tmpPath}/${fileName}`);
  json = await content.json();

  const firstCellMeme = json["cells"][0]["metadata"]["lc_cell_meme"]["current"];
  const secondCellMeme = json["cells"][1]["metadata"]["lc_cell_meme"]["current"];

  // First cell should keep the original MEME
  expect(firstCellMeme).toBe(originalMeme);

  // Second cell should have its own unique MEME
  expect(secondCellMeme).toBeTruthy();
  expect(secondCellMeme).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  expect(secondCellMeme).not.toBe(originalMeme);

  // Both cells should have proper prev/next relationships
  expect(json["cells"][0]["metadata"]["lc_cell_meme"]["next"]).toBe(secondCellMeme);
  expect(json["cells"][1]["metadata"]["lc_cell_meme"]["previous"]).toBe(firstCellMeme);
});

test('should generate branch numbers when cells are copied', async ({ page, baseURL, tmpPath }) => {
  const fileName = "copy_branch_test.ipynb";
  await page.notebook.createNew(fileName);
  await page.waitForSelector(`[role="main"] >> text=${fileName}`);

  // Ensure we have a cell with content - use existing cell or add new one
  const cellCount = await page.notebook.getCellCount();
  if (cellCount === 0) {
    await page.notebook.addCell('code', 'print("original cell")');
  } else {
    await page.notebook.setCell(0, 'code', 'print("original cell")');
  }
  await page.notebook.save();

  // Get original MEME
  let content = await fetch(`${baseURL}/files/${tmpPath}/${fileName}`);
  let json = await content.json();
  const originalMeme = json["cells"][0]["metadata"]["lc_cell_meme"]["current"];
  expect(originalMeme).toBeTruthy();
  expect(originalMeme).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

  // Select the first cell and copy it using menu commands
  await page.notebook.selectCells(0);
  await page.menu.clickMenuItem('Edit>Copy Cell');
  await page.menu.clickMenuItem('Edit>Paste Cell Below');

  // Wait for branch number generation to complete
  await page.notebook.save();

  // Check if branch numbers were generated
  content = await fetch(`${baseURL}/files/${tmpPath}/${fileName}`);
  json = await content.json();

  expect(json["cells"]).toHaveLength(2);

  const firstCellMeme = json["cells"][0]["metadata"]["lc_cell_meme"]["current"];
  const copiedCellMeme = json["cells"][1]["metadata"]["lc_cell_meme"]["current"];

  // Both cells should have MEME IDs
  expect(firstCellMeme).toBeTruthy();
  expect(copiedCellMeme).toBeTruthy();

  // Original cell should keep its original MEME
  expect(firstCellMeme).toBe(originalMeme);

  // Copied cell should have a branch number: originalUUID-1-xxxx format
  const originalUUID = originalMeme;
  expect(copiedCellMeme).toMatch(new RegExp(`^${originalUUID}-1-[0-9a-f]{4}$`));

  // Check prev/next relationships
  expect(json["cells"][0]["metadata"]["lc_cell_meme"]["next"]).toBe(copiedCellMeme);
  expect(json["cells"][1]["metadata"]["lc_cell_meme"]["previous"]).toBe(firstCellMeme);
});

test('should generate branch numbers when server URL changes', async ({ page, baseURL, tmpPath }) => {
  const fileName = "server_change_test.ipynb";
  await page.notebook.createNew(fileName);
  await page.waitForSelector(`[role="main"] >> text=${fileName}`);

  // Ensure we have cells with content - create 2 cells to test prev/next relationships
  const cellCount = await page.notebook.getCellCount();
  if (cellCount === 0) {
    await page.notebook.addCell('code', 'print("first cell")');
  } else {
    await page.notebook.setCell(0, 'code', 'print("first cell")');
  }
  await page.notebook.addCell('code', 'print("second cell")');
  await page.notebook.save();

  // Get initial state and store original values
  let content = await fetch(`${baseURL}/files/${tmpPath}/${fileName}`);
  let json = await content.json();

  // Should have 2 cells initially
  expect(json["cells"]).toHaveLength(2);

  const originalMeme = json["cells"][0]["metadata"]["lc_cell_meme"]["current"];
  const originalSecondMeme = json["cells"][1]["metadata"]["lc_cell_meme"]["current"];
  expect(originalMeme).toBeTruthy();
  expect(originalSecondMeme).toBeTruthy();
  expect(originalMeme).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  expect(originalSecondMeme).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

  // Check initial prev/next relationships
  expect(json["cells"][0]["metadata"]["lc_cell_meme"]["next"]).toBe(originalSecondMeme);
  expect(json["cells"][1]["metadata"]["lc_cell_meme"]["previous"]).toBe(originalMeme);

  const originalServerSignature = json["metadata"]["lc_notebook_meme"]["lc_server_signature"]["current"];
  expect(originalServerSignature).toBeTruthy();

  // Close the notebook
  await page.notebook.close();

  // Manually modify the notebook file to simulate it being saved on a different server
  // Update the server_url in the notebook metadata
  const modifiedServerSignature = {
    ...originalServerSignature,
    server_url: 'http://different-server:8888/',
    signature_id: 'different-signature-id'
  };

  json["metadata"]["lc_notebook_meme"]["lc_server_signature"]["current"] = modifiedServerSignature;

  // Write the modified notebook back
  const modifiedContent = JSON.stringify(json, null, 2);
  await fetch(`${baseURL}/api/contents/${tmpPath}/${fileName}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'file',
      format: 'text',
      content: modifiedContent
    })
  });

  // Reopen the notebook (this simulates opening a notebook that was saved on a different server)
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);
  await page.waitForSelector(`[role="main"] >> text=${fileName}`);

  // Save the notebook - this should trigger branch number generation due to server signature change
  await page.notebook.save();

  // Check if branch numbers were generated
  content = await fetch(`${baseURL}/files/${tmpPath}/${fileName}`);
  json = await content.json();

  // Should have exactly 2 cells as we created them
  expect(json["cells"]).toHaveLength(2);

  const firstCellUpdatedMeme = json["cells"][0]["metadata"]["lc_cell_meme"]["current"];
  const secondCellUpdatedMeme = json["cells"][1]["metadata"]["lc_cell_meme"]["current"];

  expect(firstCellUpdatedMeme).toBeTruthy();
  expect(secondCellUpdatedMeme).toBeTruthy();

  // Both cells should now have branch numbers due to server change
  // Format should be: originalUUID-1-xxxx
  const originalFirstUUID = originalMeme;
  const originalSecondUUID = originalSecondMeme;
  expect(firstCellUpdatedMeme).toMatch(new RegExp(`^${originalFirstUUID}-1-[0-9a-f]{4}$`));
  expect(secondCellUpdatedMeme).toMatch(new RegExp(`^${originalSecondUUID}-1-[0-9a-f]{4}$`));

  // Check that prev/next relationships are correctly maintained after server change and branch generation
  expect(json["cells"][0]["metadata"]["lc_cell_meme"]["next"]).toBe(secondCellUpdatedMeme);
  expect(json["cells"][1]["metadata"]["lc_cell_meme"]["previous"]).toBe(firstCellUpdatedMeme);

  // First cell should not have previous, second cell should not have next
  expect(json["cells"][0]["metadata"]["lc_cell_meme"]["previous"]).toBeUndefined();
  expect(json["cells"][1]["metadata"]["lc_cell_meme"]["next"]).toBeUndefined();

  // Server signature should be updated with the current server
  const finalServerSignature = json["metadata"]["lc_notebook_meme"]["lc_server_signature"]["current"];
  expect(finalServerSignature).toBeTruthy();
  // Should be back to the current server URL (not the modified one)
  expect(finalServerSignature.server_url).toMatch(/^http:\/\/localhost:\d+\/$/);

  // History should contain the modified signature
  const signatureHistory = json["metadata"]["lc_notebook_meme"]["lc_server_signature"]["history"];
  expect(signatureHistory).toBeTruthy();
  expect(signatureHistory.length).toBeGreaterThan(0);
});

test('should not change branch numbers on simple resave', async ({ page, baseURL, tmpPath }) => {
  const fileName = "resave_test.ipynb";
  await page.notebook.createNew(fileName);
  await page.waitForSelector(`[role="main"] >> text=${fileName}`);

  // Create initial cells
  const cellCount = await page.notebook.getCellCount();
  if (cellCount === 0) {
    await page.notebook.addCell('code', 'print("first cell")');
  } else {
    await page.notebook.setCell(0, 'code', 'print("first cell")');
  }
  await page.notebook.addCell('code', 'print("second cell")');
  await page.notebook.save();

  // Generate branch numbers by copying a cell
  await page.notebook.selectCells(0);
  await page.menu.clickMenuItem('Edit>Copy Cell');
  await page.menu.clickMenuItem('Edit>Paste Cell Below');
  await page.notebook.save();

  // Get state after branch numbers are generated
  let content = await fetch(`${baseURL}/files/${tmpPath}/${fileName}`);
  let json = await content.json();

  // Should have 3 cells now (original + 1 copy + 1 normal)
  expect(json["cells"]).toHaveLength(3);

  // Store all the MEME IDs after branch generation
  const originalFirstMeme = json["cells"][0]["metadata"]["lc_cell_meme"]["current"];
  const copiedCellMeme = json["cells"][1]["metadata"]["lc_cell_meme"]["current"];  // Should have branch number
  const secondCellMeme = json["cells"][2]["metadata"]["lc_cell_meme"]["current"];

  // Verify one of them has a branch number
  const originalUUID = originalFirstMeme;
  expect(copiedCellMeme).toMatch(new RegExp(`^${originalUUID}-1-[0-9a-f]{4}$`));

  // Store prev/next relationships
  const originalPrevNext = {
    cell0_next: json["cells"][0]["metadata"]["lc_cell_meme"]["next"],
    cell1_prev: json["cells"][1]["metadata"]["lc_cell_meme"]["previous"],
    cell1_next: json["cells"][1]["metadata"]["lc_cell_meme"]["next"],
    cell2_prev: json["cells"][2]["metadata"]["lc_cell_meme"]["previous"]
  };

  // Make a simple change that should not affect MEME IDs (e.g., edit cell content)
  await page.notebook.setCell(0, 'code', 'print("modified first cell")');
  await page.notebook.save();

  // Check that MEME IDs haven't changed after resave
  content = await fetch(`${baseURL}/files/${tmpPath}/${fileName}`);
  json = await content.json();

  // Should still have 3 cells
  expect(json["cells"]).toHaveLength(3);

  // MEME IDs should be identical
  expect(json["cells"][0]["metadata"]["lc_cell_meme"]["current"]).toBe(originalFirstMeme);
  expect(json["cells"][1]["metadata"]["lc_cell_meme"]["current"]).toBe(copiedCellMeme);
  expect(json["cells"][2]["metadata"]["lc_cell_meme"]["current"]).toBe(secondCellMeme);

  // prev/next relationships should also be unchanged
  expect(json["cells"][0]["metadata"]["lc_cell_meme"]["next"]).toBe(originalPrevNext.cell0_next);
  expect(json["cells"][1]["metadata"]["lc_cell_meme"]["previous"]).toBe(originalPrevNext.cell1_prev);
  expect(json["cells"][1]["metadata"]["lc_cell_meme"]["next"]).toBe(originalPrevNext.cell1_next);
  expect(json["cells"][2]["metadata"]["lc_cell_meme"]["previous"]).toBe(originalPrevNext.cell2_prev);

  // Additional resave to double-check stability
  await page.notebook.save();

  content = await fetch(`${baseURL}/files/${tmpPath}/${fileName}`);
  json = await content.json();

  // MEME IDs should still be identical after second resave
  expect(json["cells"][0]["metadata"]["lc_cell_meme"]["current"]).toBe(originalFirstMeme);
  expect(json["cells"][1]["metadata"]["lc_cell_meme"]["current"]).toBe(copiedCellMeme);
  expect(json["cells"][2]["metadata"]["lc_cell_meme"]["current"]).toBe(secondCellMeme);
});

test('should update prev/next relationships when cell is deleted', async ({ page, baseURL, tmpPath }) => {
  const fileName = "delete_test.ipynb";
  await page.notebook.createNew(fileName);
  await page.waitForSelector(`[role="main"] >> text=${fileName}`);

  // Create 3 cells with content
  const cellCount = await page.notebook.getCellCount();
  if (cellCount === 0) {
    await page.notebook.addCell('code', 'print("first cell")');
  } else {
    await page.notebook.setCell(0, 'code', 'print("first cell")');
  }
  await page.notebook.addCell('code', 'print("second cell")');
  await page.notebook.addCell('code', 'print("third cell")');
  await page.notebook.save();

  // Get initial state - should have 3 cells with proper prev/next relationships
  let content = await fetch(`${baseURL}/files/${tmpPath}/${fileName}`);
  let json = await content.json();

  expect(json["cells"]).toHaveLength(3);

  const firstMeme = json["cells"][0]["metadata"]["lc_cell_meme"]["current"];
  const secondMeme = json["cells"][1]["metadata"]["lc_cell_meme"]["current"];
  const thirdMeme = json["cells"][2]["metadata"]["lc_cell_meme"]["current"];

  // Verify initial prev/next relationships: first <-> second <-> third
  expect(json["cells"][0]["metadata"]["lc_cell_meme"]["previous"]).toBeUndefined();
  expect(json["cells"][0]["metadata"]["lc_cell_meme"]["next"]).toBe(secondMeme);
  expect(json["cells"][1]["metadata"]["lc_cell_meme"]["previous"]).toBe(firstMeme);
  expect(json["cells"][1]["metadata"]["lc_cell_meme"]["next"]).toBe(thirdMeme);
  expect(json["cells"][2]["metadata"]["lc_cell_meme"]["previous"]).toBe(secondMeme);
  expect(json["cells"][2]["metadata"]["lc_cell_meme"]["next"]).toBeUndefined();

  // Delete the middle cell (index 1)
  await page.notebook.selectCells(1);
  await page.notebook.deleteCells();
  await page.notebook.save();

  // Check state after deletion - should have 2 cells with updated prev/next
  content = await fetch(`${baseURL}/files/${tmpPath}/${fileName}`);
  json = await content.json();

  expect(json["cells"]).toHaveLength(2);

  // MEME IDs should remain the same for remaining cells
  expect(json["cells"][0]["metadata"]["lc_cell_meme"]["current"]).toBe(firstMeme);
  expect(json["cells"][1]["metadata"]["lc_cell_meme"]["current"]).toBe(thirdMeme);

  // prev/next relationships should be updated: first <-> third (second is gone)
  expect(json["cells"][0]["metadata"]["lc_cell_meme"]["previous"]).toBeUndefined();
  expect(json["cells"][0]["metadata"]["lc_cell_meme"]["next"]).toBe(thirdMeme);
  expect(json["cells"][1]["metadata"]["lc_cell_meme"]["previous"]).toBe(firstMeme);
  expect(json["cells"][1]["metadata"]["lc_cell_meme"]["next"]).toBeUndefined();
});