define([
    'jquery',
    'base/js/namespace',
    'base/js/events',
    'notebook/js/codecell',
    './meme',
    './tracking_server'
], function($, Jupyter, events, codecell, meme, tracking_server) {
    'use strict';

    const notification_area = Jupyter.notification_area.widget('nblineage');

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
                    cell.metadata = $.extend(true, {}, cell.metadata, {
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
                const new_cell_metadata = $.extend(true, {}, this.metadata);
                delete new_cell_metadata['lc_cell_meme']['execution_end_time'];
                this.metadata = new_cell_metadata
            }
            return ret;
        };
    }

    function init_handler() {
        console.log('[nblineage] initializing create.Cell handler');
        events.on('create.Cell', function (e, data) {
            setTimeout(function() {
                if (data.cell.metadata['lc_cell_meme']) {
                    meme.generate_branch_number(data.cell);
                }
            }, 0);
        });
    }

    function load_extension() {
        events.on('before_save.Notebook', function(event, data) {
            const notebook = Jupyter.notebook;
            let is_changed_server_signature = false;
            try {
                is_changed_server_signature = tracking_server.track_server(notebook);
            } catch (e) {
                notification_area.danger('[nblineage] Server error', undefined, undefined, {
                    title: e.message
                });
                console.error('[nblineage]', e);
            }
            if (is_changed_server_signature) {
                meme.generate_branch_number_all(Jupyter.notebook);
            }

            let result;
            try {
                result = meme.generate_meme(Jupyter.notebook);
            } catch (e) {
                notification_area.danger('[nblineage] Server error', undefined, undefined, {
                    title: e.message
                });
                console.error('[nblineage]', e);
            }
            if (result) {
                console.log('[nblineage] Generated meme: path=%s, cell_history_count=%d, meme_count=%d',
                    notebook.notebook_path,
                    result.cell_history_count,
                    result.meme_count);
            }
        });

        events.on("notebook_loaded.Notebook", init_handler);
        if (Jupyter.notebook !== undefined && Jupyter.notebook._fully_loaded) {
            init_handler();
        }

        tracking_server.init_server_env();

        patch_CodeCell_get_callbacks();
        patch_CodeCell_clear_output();
    }

    return {
        load_ipython_extension: load_extension,
        load_jupyter_extension: load_extension
    };
});
