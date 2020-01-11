define([
    'jquery',
    'base/js/namespace',
    'base/js/events',
    'notebook/js/codecell',
    './meme',
    './tracking_server'
], function($, Jupyter, events, codecell, meme, tracking_server) {
    'use strict';

    function patch_CodeCell_get_callbacks() {
        console.log('[nblineage] patching CodeCell.prototype.get_callbacks');
        var previous_get_callbacks = codecell.CodeCell.prototype.get_callbacks;
        codecell.CodeCell.prototype.get_callbacks = function() {
            var callbacks = previous_get_callbacks.apply(this, arguments);
            var cell = this;
            var prev_reply_callback = callbacks.shell.reply;
            callbacks.shell.reply = function (msg) {
                if (msg.msg_type === 'execute_reply') {
                    console.log('[nblineage] execution end time', msg.header.date);
                    $.extend(true, cell.metadata, {
                        lc_cell_meme: {
                            execution_end_time: msg.header.date
                        }
                    });
                }
                return prev_reply_callback(msg);
            };
            return callbacks;
        };
    }

    function patch_CodeCell_clear_output() {
        console.log('[nblineage] patching CodeCell.prototype.clear_output');
        var previous_clear_output = codecell.CodeCell.prototype.clear_output;
        codecell.CodeCell.prototype.clear_output = function () {
            var ret = previous_clear_output.apply(this, arguments);
            if (this.output_area.outputs.length === 0 && this.metadata['lc_cell_meme']){
                delete this.metadata['lc_cell_meme']['execution_end_time'];
            }
            return ret;
        };
    }

    function patch_Notebook_paste_cell_replace() {
        console.log('[nblineage] patching CodeCell.prototype.paste_cell_replace');
        var previous_paste_cell_replace = Jupyter.notebook.constructor.prototype.paste_cell_replace;
        Jupyter.notebook.constructor.prototype.paste_cell_replace = function () {
            if (!(this.clipboard !== null && this.paste_enabled)) {
                return previous_paste_cell_replace.apply(this, arguments);
            }
            var selected =  this.get_selected_cells_indices();
            var index = selected[0];
            var ret = previous_paste_cell_replace.apply(this, arguments);
            for (var i = 0; i < this.clipboard.length; i++) {
                var cell = this.get_cell(index + i);
                meme.generate_branch_number(cell);
            }
            return ret;
        };
    }

    function patch_Notebook_paste_cell_above() {
        console.log('[nblineage] patching CodeCell.prototype.paste_cell_above');
        var previous_paste_cell_above = Jupyter.notebook.constructor.prototype.paste_cell_above;
        Jupyter.notebook.constructor.prototype.paste_cell_above = function () {
            if (!(this.clipboard !== null && this.paste_enabled)) {
                return previous_paste_cell_above.apply(this, arguments);
            }
            var index = Math.min(this.get_selected_index(), this.get_anchor_index());
            var ret = previous_paste_cell_above.apply(this, arguments);
            for (var i = 0; i < this.clipboard.length; i++) {
                var cell = this.get_cell(index - i - 1);
                meme.generate_branch_number(cell);
            }
            return ret;
        };
    }

    function patch_Notebook_paste_cell_below() {
        console.log('[nblineage] patching CodeCell.prototype.paste_cell_below');
        var previous_paste_cell_below = Jupyter.notebook.constructor.prototype.paste_cell_below;
        Jupyter.notebook.constructor.prototype.paste_cell_below = function () {
            if (!(this.clipboard !== null && this.paste_enabled)) {
                return previous_paste_cell_below.apply(this, arguments);
            }
            var index = Math.min(this.get_selected_index(), this.get_anchor_index());
            var ret = previous_paste_cell_below.apply(this, arguments);
            for (var i = 0; i < this.clipboard.length; i++) {
                var cell = this.get_cell(index + i + 1);
                meme.generate_branch_number(cell);
            }
            return ret;
        };
    }

    function patch_Notebook_insert_cell_above() {
        console.log('[nblineage] patching CodeCell.prototype.insert_cell_above');
        var previous_insert_cell_above = Jupyter.notebook.constructor.prototype.insert_cell_above;
        Jupyter.notebook.constructor.prototype.insert_cell_above = function () {
            var cell = previous_insert_cell_above.apply(this, arguments);
            meme.generate_branch_number(cell);
            return cell;
        };
    }

    function patch_Notebook_insert_cell_below() {
        console.log('[nblineage] patching CodeCell.prototype.insert_cell_below');
        var previous_insert_cell_below = Jupyter.notebook.constructor.prototype.insert_cell_below;
        Jupyter.notebook.constructor.prototype.insert_cell_below = function () {
            var cell = previous_insert_cell_below.apply(this, arguments);
            meme.generate_branch_number(cell);
            return cell;
        };
    }

    function patch_Notebook_insert_cell_at_bottom() {
        console.log('[nblineage] patching CodeCell.prototype.insert_cell_at_bottom');
        var previous_insert_cell_at_bottom = Jupyter.notebook.constructor.prototype.insert_cell_at_bottom;
        Jupyter.notebook.constructor.prototype.insert_cell_at_bottom = function () {
            var cell = previous_insert_cell_at_bottom.apply(this, arguments);
            meme.generate_branch_number(cell);
            return cell;
        };
    }

    function patch_Notebook_split_cell() {
        console.log('[nblineage] patching CodeCell.prototype.split_cell');
        var previous_split_cell = Jupyter.notebook.constructor.prototype.split_cell;
        Jupyter.notebook.constructor.prototype.split_cell = function () {
            var cell = this.get_selected_cell();
            var index = this.get_selected_index();
            if (!cell.is_splittable()) {
                return previous_split_cell.apply(this, arguments);
            }
            var ret = previous_split_cell.apply(this, arguments);
            var cella = this.get_cell(index);
            var cellb = this.get_cell(index + 1);
            meme.generate_branch_number(cella);
            meme.generate_branch_number(cellb);
            return ret;
        };
    }

    function patch_Notebook_merge_cells() {
        console.log('[nblineage] patching CodeCell.prototype.merge_cells');
        var previous_merge_cells = Jupyter.notebook.constructor.prototype.merge_cells;
        Jupyter.notebook.constructor.prototype.merge_cells = function (indices, into_last) {
            if (indices.length <= 1) {
                return previous_merge_cells.apply(this, arguments);
            }
            if (indices.filter(function(item) {return item < 0;}).length > 0) {
                return previous_merge_cells.apply(this, arguments);
            }
            for (var i = 0; i < indices.length; i++) {
                if (!this.get_cell(indices[i]).is_mergeable()) {
                    return previous_merge_cells.apply(this, arguments);
                }
            }
            var ret = previous_merge_cells.apply(this, arguments);
            var cell = this.get_selected_cell();
            meme.generate_branch_number(cell);
            return ret;
        };
    }

    function load_extension() {
        events.on('before_save.Notebook', function(event, data) {
            var notebook = Jupyter.notebook;
            var result = meme.generate_meme(Jupyter.notebook);
            if (!result) {
                console.error('[nblineage] Failed to generate meme');
                return;
            }
            console.log('[nblineage] Generated meme: path=%s, cell_history_count=%d, meme_count=%d',
                        notebook.notebook_path,
                        result.cell_history_count,
                        result.meme_count);

            tracking_server.track_server(notebook);
        });

        tracking_server.init_server_env();

        patch_CodeCell_get_callbacks();
        patch_CodeCell_clear_output();
        patch_Notebook_paste_cell_replace();
        patch_Notebook_paste_cell_above();
        patch_Notebook_paste_cell_below();
        patch_Notebook_insert_cell_above();
        patch_Notebook_insert_cell_below();
        patch_Notebook_insert_cell_at_bottom();
        patch_Notebook_split_cell();
        patch_Notebook_merge_cells();
    }

    return {
        load_ipython_extension: load_extension,
        load_jupyter_extension: load_extension
    };
});
