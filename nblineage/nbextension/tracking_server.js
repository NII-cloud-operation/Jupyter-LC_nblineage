define([
    'jquery',
    'base/js/namespace',
], function($, Jupyter) {
    'use strict';

    var server_env;

    function track_server(notebook) {
        console.log('[nblineage] tracking the notebook server environment');

        if (!server_env) {
            throw new Error('server information is not yet initialized');
        }

        if (notebook.metadata['lc_notebook_meme'] === undefined) {
            notebook.metadata['lc_notebook_meme'] = {};
        }

        if (notebook.metadata['lc_notebook_meme']['lc_server_signature'] === undefined) {
            notebook.metadata['lc_notebook_meme']['lc_server_signature'] = {};
        }

        var tracking_metadata = notebook.metadata['lc_notebook_meme']['lc_server_signature'];

        var server_signature = get_server_signature(notebook);
        console.log('[nblineage] server_signature = %o', server_signature);

        if (!equals_signature(tracking_metadata['current'], server_signature)) {
            console.log('[nblineage] detected the notebook server was changed');

            if (tracking_metadata['history'] === undefined) {
                tracking_metadata['history'] = [];
            }

            if (tracking_metadata['current']) {
                tracking_metadata['history'].push(tracking_metadata['current']);
            }
            tracking_metadata['current'] = server_signature;

            return true;
        } else {
            return false;
        }
    }

    function equals_signature(a, b) {
        if (a === undefined && b === undefined) {
            return true;
        }
        if (a === undefined || b === undefined) {
            return false;
        }
        return equals_property(a, b, 'signature_id') &&
            equals_property(a, b, 'server_url') &&
            equals_property(a, b, 'notebook_dir') &&
            equals_property(a, b, 'notebook_path');
    }

    function equals_property(a, b, name) {
        var va = a[name];
        var vb = b[name];
        if (va === undefined && vb === undefined) {
            return true;
        }
        if (va === undefined || vb === undefined) {
            return false;
        }
        return va === vb;
    }

    function get_server_signature(notebook) {
        var server_signature = {};

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

        $.extend(true, server_signature, server_env);

        return server_signature;
    }

    function init_server_env() {
        var url = Jupyter.notebook.base_url + 'nblineage/lc/server_signature'
        var res;
        $.ajax({
            url: url,
            dataType: 'json',
            success: function (json) {
                server_env = json;
            }
        })
        return res;
    }

    return {
        track_server: track_server,
        init_server_env: init_server_env
    };
})
