import unittest
import os.path
import io
import nbformat
try:
    from exceptions import SystemExit
except ImportError:
    # in Python 3
    pass

import nblineage
import nblineage.extensionapp
import nblineage.meme as meme

class TestNbLineageApp(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        pass

    @classmethod
    def tearDownClass(cls):
        pass

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def _get_filepath(self, name):
        path = os.path.dirname(nblineage.__file__)
        path = os.path.abspath(path)
        path = os.path.normpath(path)
        return os.path.join(path, name)

    def _read_notebook(self, name):
        with io.open(self._get_filepath(name)) as f:
            return self._read_notebook_from_stream(f)

    def _read_notebook_from_stream(self, stream):
        return nbformat.read(stream, as_version=4)

    def _enum_prev_next_items(self, items):
        if len(items) == 0:
            return []
        prev_items = items[0:-1]
        prev_items.insert(0, None)
        next_items = items[1:]
        next_items.append(None)
        return zip(prev_items, items, next_items)

    def test_generate_meme_from_filename(self):
        gen = meme.MemeGenerator()
        nb = gen.from_filename(self._get_filepath('tests/notebooks/notebook.ipynb'))
        srcnb = self._read_notebook('tests/notebooks/notebook.ipynb')
        self.assertEqual(srcnb, nb)

    def test_generate_meme_from_notebook_node(self):
        nb = self._read_notebook('tests/notebooks/notebook.ipynb')
        gen = meme.MemeGenerator()
        newnb = gen.from_notebook_node(nb, copy=True)
        self.assertIsNot(nb, newnb)
        self.assertEqual(nb, newnb)

    def test_generate_meme_from_notebook_node_not_copy(self):
        nb = self._read_notebook('tests/notebooks/notebook-nomeme.ipynb')
        gen = meme.MemeGenerator()
        oldnb = nbformat.notebooknode.from_dict(nb.copy())
        newnb = gen.from_notebook_node(nb)
        self.assertIs(nb, newnb)

    def test_generate_meme_first(self):
        nb = self._read_notebook('tests/notebooks/notebook-nomeme.ipynb')
        gen = meme.MemeGenerator()
        newnb = gen.from_notebook_node(nb, copy=True)

        self.assertIsNot(nb, newnb)
        self.assertNotEqual(nb, newnb)
        self.assertTrue('current' in newnb.metadata['lc_notebook_meme'])
        self.assertFalse('history' in newnb.metadata['lc_notebook_meme'])
        self.assertFalse('root_cells' in newnb.metadata['lc_notebook_meme'])

        for cell in nb.cells:
            self.assertFalse('lc_cell_meme' in cell.metadata)

        for prev_cell, cell, next_cell in self._enum_prev_next_items(newnb.cells):
            self.assertTrue('current' in cell.metadata['lc_cell_meme'])
            self.assertFalse('history' in cell.metadata['lc_cell_meme'])
            if prev_cell is not None:
                self.assertEqual(
                    prev_cell.metadata['lc_cell_meme']['current'],
                    cell.metadata['lc_cell_meme']['previous'])
            else:
                self.assertIsNone(cell.metadata['lc_cell_meme']['previous'])
            if next_cell is not None:
                self.assertEqual(
                    next_cell.metadata['lc_cell_meme']['current'],
                    cell.metadata['lc_cell_meme']['next'])
            else:
                self.assertIsNone(cell.metadata['lc_cell_meme']['next'])

    def test_generate_meme_append_cell(self):
        nb = self._read_notebook('tests/notebooks/notebook.ipynb')

        newcell = {
            "cell_type": "markdown",
            "metadata": {
            },
            "source": [
                "new cell"
            ]
        }
        nb.cells.insert(2, newcell)

        gen = meme.MemeGenerator()
        newnb = gen.from_notebook_node(nb, copy=True)

        self.assertTrue('current' in newnb.cells[2].metadata['lc_cell_meme'])
        self.assertFalse('history' in newnb.cells[2].metadata['lc_cell_meme'])
        self.assertEqual(
            newnb.cells[2].metadata['lc_cell_meme']['current'],
            newnb.cells[1].metadata['lc_cell_meme']['next'])
        self.assertEqual(
            newnb.cells[2].metadata['lc_cell_meme']['current'],
            newnb.cells[3].metadata['lc_cell_meme']['previous'])
        self.assertEqual(1, len(newnb.cells[1].metadata['lc_cell_meme']['history']))
        self.assertEqual(1, len(newnb.cells[3].metadata['lc_cell_meme']['history']))
        self.assertEqual(
            newnb.cells[1].metadata['lc_cell_meme']['current'],
            newnb.cells[1].metadata['lc_cell_meme']['history'][0]['current'])
        self.assertEqual(
            newnb.cells[3].metadata['lc_cell_meme']['current'],
            newnb.cells[1].metadata['lc_cell_meme']['history'][0]['next'])
        self.assertEqual(
            newnb.cells[1].metadata['lc_cell_meme']['current'],
            newnb.cells[3].metadata['lc_cell_meme']['history'][0]['previous'])

    def test_generate_meme_append_2_cell(self):
        nb = self._read_notebook('tests/notebooks/notebook.ipynb')

        newcell = {
            "cell_type": "markdown",
            "metadata": {
            },
            "source": [
                "new cell 1"
            ]
        }
        nb.cells.insert(2, newcell)
        newcell = {
            "cell_type": "markdown",
            "metadata": {
            },
            "source": [
                "new cell 2"
            ]
        }
        nb.cells.insert(3, newcell)

        gen = meme.MemeGenerator()
        newnb = gen.from_notebook_node(nb, copy=True)

        self.assertTrue('current' in newnb.cells[2].metadata['lc_cell_meme'])
        self.assertTrue('current' in newnb.cells[3].metadata['lc_cell_meme'])
        self.assertFalse('history' in newnb.cells[2].metadata['lc_cell_meme'])
        self.assertFalse('history' in newnb.cells[3].metadata['lc_cell_meme'])
        self.assertEqual(
            newnb.cells[2].metadata['lc_cell_meme']['current'],
            newnb.cells[1].metadata['lc_cell_meme']['next'])
        self.assertEqual(
            newnb.cells[3].metadata['lc_cell_meme']['current'],
            newnb.cells[4].metadata['lc_cell_meme']['previous'])
        self.assertEqual(1, len(newnb.cells[1].metadata['lc_cell_meme']['history']))
        self.assertEqual(1, len(newnb.cells[4].metadata['lc_cell_meme']['history']))
        self.assertEqual(
            newnb.cells[1].metadata['lc_cell_meme']['current'],
            newnb.cells[1].metadata['lc_cell_meme']['history'][0]['current'])
        self.assertEqual(
            newnb.cells[4].metadata['lc_cell_meme']['current'],
            newnb.cells[4].metadata['lc_cell_meme']['history'][0]['current'])
        self.assertEqual(
            newnb.cells[4].metadata['lc_cell_meme']['current'],
            newnb.cells[1].metadata['lc_cell_meme']['history'][0]['next'])
        self.assertEqual(
            newnb.cells[1].metadata['lc_cell_meme']['current'],
            newnb.cells[4].metadata['lc_cell_meme']['history'][0]['previous'])

    def test_generate_meme_delete_cell(self):
        nb = self._read_notebook('tests/notebooks/notebook.ipynb')
        removed_cell = nb.cells[1]
        nb.cells.remove(removed_cell)

        gen = meme.MemeGenerator()
        newnb = gen.from_notebook_node(nb, copy=True)

        self.assertTrue('history' in newnb.cells[0].metadata['lc_cell_meme'])
        self.assertTrue('history' in newnb.cells[1].metadata['lc_cell_meme'])
        self.assertEqual(
            newnb.cells[1].metadata['lc_cell_meme']['current'],
            newnb.cells[0].metadata['lc_cell_meme']['next'])
        self.assertEqual(
            newnb.cells[0].metadata['lc_cell_meme']['current'],
            newnb.cells[1].metadata['lc_cell_meme']['previous'])
        self.assertEqual(1, len(newnb.cells[0].metadata['lc_cell_meme']['history']))
        self.assertEqual(1, len(newnb.cells[1].metadata['lc_cell_meme']['history']))
        self.assertEqual(
            newnb.cells[0].metadata['lc_cell_meme']['current'],
            newnb.cells[0].metadata['lc_cell_meme']['history'][0]['current'])
        self.assertEqual(
            newnb.cells[1].metadata['lc_cell_meme']['current'],
            newnb.cells[1].metadata['lc_cell_meme']['history'][0]['current'])
        self.assertEqual(
            removed_cell.metadata['lc_cell_meme']['current'],
            newnb.cells[0].metadata['lc_cell_meme']['history'][0]['next'])
        self.assertEqual(
            removed_cell.metadata['lc_cell_meme']['current'],
            newnb.cells[1].metadata['lc_cell_meme']['history'][0]['previous'])

    def test_new_root_meme(self):
        nb = self._read_notebook('tests/notebooks/notebook.ipynb')

        newroot_gen = meme.NewRootMemeGenerator()
        newnb = newroot_gen.from_notebook_node(nb, copy=True)

        self.assertNotEqual(
            nb.metadata['lc_notebook_meme']['current'],
            newnb.metadata['lc_notebook_meme']['current'])
        self.assertEqual(1, len(newnb.metadata['lc_notebook_meme']['history']))

        self.assertEqual(1, len(newnb.cells[0].metadata['lc_cell_meme']['history']))
        self.assertEqual(1, len(newnb.cells[1].metadata['lc_cell_meme']['history']))
        self.assertEqual(1, len(newnb.cells[2].metadata['lc_cell_meme']['history']))

        self.assertNotEqual(
            newnb.cells[0].metadata['lc_cell_meme']['current'],
            newnb.cells[0].metadata['lc_cell_meme']['history'][0]['current'])
        self.assertNotEqual(
            newnb.cells[1].metadata['lc_cell_meme']['current'],
            newnb.cells[1].metadata['lc_cell_meme']['history'][0]['current'])
        self.assertNotEqual(
            newnb.cells[2].metadata['lc_cell_meme']['current'],
            newnb.cells[2].metadata['lc_cell_meme']['history'][0]['current'])

        self.assertIsNone(
            newnb.cells[0].metadata['lc_cell_meme']['history'][0]['previous'])
        self.assertEqual(
            newnb.cells[1].metadata['lc_cell_meme']['history'][0]['current'],
            newnb.cells[0].metadata['lc_cell_meme']['history'][0]['next'])
        self.assertEqual(
            newnb.cells[0].metadata['lc_cell_meme']['history'][0]['current'],
            newnb.cells[1].metadata['lc_cell_meme']['history'][0]['previous'])
        self.assertEqual(
            newnb.cells[2].metadata['lc_cell_meme']['history'][0]['current'],
            newnb.cells[1].metadata['lc_cell_meme']['history'][0]['next'])
        self.assertEqual(
            newnb.cells[1].metadata['lc_cell_meme']['history'][0]['current'],
            newnb.cells[2].metadata['lc_cell_meme']['history'][0]['previous'])
        self.assertIsNone(
            newnb.cells[2].metadata['lc_cell_meme']['history'][0]['next'])

    def test_new_root_meme_trim_history_0(self):
        nb = self._read_notebook('tests/notebooks/notebook.ipynb')

        newroot_gen = meme.NewRootMemeGenerator()
        newroot_gen.trim_history = 0
        newnb = newroot_gen.from_notebook_node(nb, copy=True)

        self.assertNotEqual(
            nb.metadata['lc_notebook_meme']['current'],
            newnb.metadata['lc_notebook_meme']['current'])
        self.assertEqual(0, len(newnb.metadata['lc_notebook_meme']['history']))

        self.assertEqual(0, len(newnb.cells[0].metadata['lc_cell_meme']['history']))
        self.assertEqual(0, len(newnb.cells[1].metadata['lc_cell_meme']['history']))
        self.assertEqual(0, len(newnb.cells[2].metadata['lc_cell_meme']['history']))

        self.assertNotEqual(
            nb.cells[0].metadata['lc_cell_meme']['current'],
            newnb.cells[0].metadata['lc_cell_meme']['current'])
        self.assertNotEqual(
            nb.cells[1].metadata['lc_cell_meme']['current'],
            newnb.cells[1].metadata['lc_cell_meme']['current'])
        self.assertNotEqual(
            nb.cells[2].metadata['lc_cell_meme']['current'],
            newnb.cells[2].metadata['lc_cell_meme']['current'])

    def test_new_root_meme_trim_history_n(self):
        nb = self._read_notebook('tests/notebooks/notebook.ipynb')

        newroot_gen = meme.NewRootMemeGenerator()
        newroot_gen.trim_history = 2

        # 1st
        newnb1 = newroot_gen.from_notebook_node(nb, copy=True)

        self.assertNotEqual(
            nb.metadata['lc_notebook_meme']['current'],
            newnb1.metadata['lc_notebook_meme']['current'])
        self.assertEqual(1, len(newnb1.metadata['lc_notebook_meme']['history']))

        self.assertEqual(1, len(newnb1.cells[0].metadata['lc_cell_meme']['history']))
        self.assertEqual(1, len(newnb1.cells[1].metadata['lc_cell_meme']['history']))
        self.assertEqual(1, len(newnb1.cells[2].metadata['lc_cell_meme']['history']))

        self.assertNotEqual(
            nb.cells[0].metadata['lc_cell_meme']['current'],
            newnb1.cells[0].metadata['lc_cell_meme']['current'])
        self.assertNotEqual(
            nb.cells[1].metadata['lc_cell_meme']['current'],
            newnb1.cells[1].metadata['lc_cell_meme']['current'])
        self.assertNotEqual(
            nb.cells[2].metadata['lc_cell_meme']['current'],
            newnb1.cells[2].metadata['lc_cell_meme']['current'])

        # 2nd
        newnb2 = newroot_gen.from_notebook_node(newnb1, copy=True)
        self.assertNotEqual(
            newnb1.metadata['lc_notebook_meme']['current'],
            newnb2.metadata['lc_notebook_meme']['current'])
        self.assertEqual(2, len(newnb2.metadata['lc_notebook_meme']['history']))

        self.assertEqual(2, len(newnb2.cells[0].metadata['lc_cell_meme']['history']))
        self.assertEqual(2, len(newnb2.cells[1].metadata['lc_cell_meme']['history']))
        self.assertEqual(2, len(newnb2.cells[2].metadata['lc_cell_meme']['history']))

        self.assertNotEqual(
            newnb1.cells[0].metadata['lc_cell_meme']['current'],
            newnb2.cells[0].metadata['lc_cell_meme']['current'])
        self.assertNotEqual(
            newnb1.cells[1].metadata['lc_cell_meme']['current'],
            newnb2.cells[1].metadata['lc_cell_meme']['current'])
        self.assertNotEqual(
            newnb1.cells[2].metadata['lc_cell_meme']['current'],
            newnb2.cells[2].metadata['lc_cell_meme']['current'])

        # 3rd
        newnb3 = newroot_gen.from_notebook_node(newnb2, copy=True)
        self.assertNotEqual(
            newnb2.metadata['lc_notebook_meme']['current'],
            newnb3.metadata['lc_notebook_meme']['current'])
        self.assertEqual(2, len(newnb3.metadata['lc_notebook_meme']['history']))

        self.assertEqual(2, len(newnb3.cells[0].metadata['lc_cell_meme']['history']))
        self.assertEqual(2, len(newnb3.cells[1].metadata['lc_cell_meme']['history']))
        self.assertEqual(2, len(newnb3.cells[2].metadata['lc_cell_meme']['history']))

        self.assertNotEqual(
            newnb2.cells[0].metadata['lc_cell_meme']['current'],
            newnb3.cells[0].metadata['lc_cell_meme']['current'])
        self.assertNotEqual(
            newnb2.cells[1].metadata['lc_cell_meme']['current'],
            newnb3.cells[1].metadata['lc_cell_meme']['current'])
        self.assertNotEqual(
            newnb2.cells[2].metadata['lc_cell_meme']['current'],
            newnb3.cells[2].metadata['lc_cell_meme']['current'])

    def test_generate_and_new_root_meme(self):
        nb = self._read_notebook('tests/notebooks/notebook-nomeme.ipynb')

        newroot_gen = meme.NewRootMemeGenerator()
        newnb = newroot_gen.from_notebook_node(nb, copy=True)

        self.assertEqual(1, len(newnb.cells[0].metadata['lc_cell_meme']['history']))
        self.assertEqual(1, len(newnb.cells[1].metadata['lc_cell_meme']['history']))
        self.assertEqual(1, len(newnb.cells[2].metadata['lc_cell_meme']['history']))

        self.assertNotEqual(
            newnb.cells[0].metadata['lc_cell_meme']['current'],
            newnb.cells[0].metadata['lc_cell_meme']['history'][0]['current'])
        self.assertNotEqual(
            newnb.cells[1].metadata['lc_cell_meme']['current'],
            newnb.cells[1].metadata['lc_cell_meme']['history'][0]['current'])
        self.assertNotEqual(
            newnb.cells[2].metadata['lc_cell_meme']['current'],
            newnb.cells[2].metadata['lc_cell_meme']['history'][0]['current'])

        self.assertIsNone(
            newnb.cells[0].metadata['lc_cell_meme']['history'][0]['previous'])
        self.assertEqual(
            newnb.cells[1].metadata['lc_cell_meme']['history'][0]['current'],
            newnb.cells[0].metadata['lc_cell_meme']['history'][0]['next'])
        self.assertEqual(
            newnb.cells[0].metadata['lc_cell_meme']['history'][0]['current'],
            newnb.cells[1].metadata['lc_cell_meme']['history'][0]['previous'])
        self.assertEqual(
            newnb.cells[2].metadata['lc_cell_meme']['history'][0]['current'],
            newnb.cells[1].metadata['lc_cell_meme']['history'][0]['next'])
        self.assertEqual(
            newnb.cells[1].metadata['lc_cell_meme']['history'][0]['current'],
            newnb.cells[2].metadata['lc_cell_meme']['history'][0]['previous'])
        self.assertIsNone(
            newnb.cells[2].metadata['lc_cell_meme']['history'][0]['next'])

    def test_cli(self):
        from testpath.tempdir import TemporaryWorkingDirectory

        source_path = self._get_filepath('tests/notebooks/notebook.ipynb')

        with TemporaryWorkingDirectory():
            app = nblineage.extensionapp.ExtensionApp()
            app.initialize(['new-root-meme', source_path, 'output.ipynb'])
            app.start()

            with io.open('output.ipynb') as f:
                newnb = self._read_notebook_from_stream(f)

            self.assertEqual(1, len(newnb.cells[0].metadata['lc_cell_meme']['history']))
            self.assertEqual(1, len(newnb.cells[1].metadata['lc_cell_meme']['history']))
            self.assertEqual(1, len(newnb.cells[2].metadata['lc_cell_meme']['history']))

            self.assertNotEqual(
                newnb.cells[0].metadata['lc_cell_meme']['current'],
                newnb.cells[0].metadata['lc_cell_meme']['history'][0]['current'])
            self.assertNotEqual(
                newnb.cells[1].metadata['lc_cell_meme']['current'],
                newnb.cells[1].metadata['lc_cell_meme']['history'][0]['current'])
            self.assertNotEqual(
                newnb.cells[2].metadata['lc_cell_meme']['current'],
                newnb.cells[2].metadata['lc_cell_meme']['history'][0]['current'])

            self.assertIsNone(
                newnb.cells[0].metadata['lc_cell_meme']['history'][0]['previous'])
            self.assertEqual(
                newnb.cells[1].metadata['lc_cell_meme']['history'][0]['current'],
                newnb.cells[0].metadata['lc_cell_meme']['history'][0]['next'])
            self.assertEqual(
                newnb.cells[0].metadata['lc_cell_meme']['history'][0]['current'],
                newnb.cells[1].metadata['lc_cell_meme']['history'][0]['previous'])
            self.assertEqual(
                newnb.cells[2].metadata['lc_cell_meme']['history'][0]['current'],
                newnb.cells[1].metadata['lc_cell_meme']['history'][0]['next'])
            self.assertEqual(
                newnb.cells[1].metadata['lc_cell_meme']['history'][0]['current'],
                newnb.cells[2].metadata['lc_cell_meme']['history'][0]['previous'])
            self.assertIsNone(
                newnb.cells[2].metadata['lc_cell_meme']['history'][0]['next'])

    def test_cli_file_already_exists(self):
        from testpath.tempdir import TemporaryWorkingDirectory

        source_path = self._get_filepath('tests/notebooks/notebook.ipynb')

        with TemporaryWorkingDirectory():
            with io.open('output.ipynb', 'w') as f:
                pass

            app = nblineage.extensionapp.ExtensionApp()
            app.initialize(['new-root-meme', source_path, 'output.ipynb'])

            with self.assertRaises(SystemExit):
                app.start()

if __name__ == '__main__':
    unittest.main()
