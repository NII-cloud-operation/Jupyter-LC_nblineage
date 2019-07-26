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
            var prev_reply_callback = callbacks.shell.reply
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

    function patch_CodeCell_clear_output () {
        console.log('[nblineage] patching CodeCell.prototype.clear_output');
        var previous_clear_output = codecell.CodeCell.prototype.clear_output;
        codecell.CodeCell.prototype.clear_output = function () {
            var ret = previous_clear_output.apply(this, arguments);
            if (this.output_area.outputs.length === 0 && this.metadata['lc_cell_meme']){
                delete this.metadata['lc_cell_meme']['execution_end_time']
            }
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
    }

    return {
        load_ipython_extension: load_extension,
        load_jupyter_extension: load_extension
    };
});
