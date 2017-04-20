define([
    'jquery',
    'base/js/namespace',
    'base/js/events',
    './meme',
    './tracking_server'
], function($, Jupyter, events, meme, tracking_server) {
    'use strict';

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
    }

    return {
        load_ipython_extension: load_extension,
        load_jupyter_extension: load_extension
    };
});
