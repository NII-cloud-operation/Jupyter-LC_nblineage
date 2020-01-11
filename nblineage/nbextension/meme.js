define([
    'jquery',
    'base/js/namespace',
], function($, Jupyter) {
    'use strict';

    function generate_uuid(count) {
        if (count == 0) {
            return [];
        }
        var url = Jupyter.notebook.base_url + 'uuid/v1/' + count
        var uuids;
        $.ajax({
            url: url,
            dataType: 'json',
            async: false,
            success: function (json) {
                uuids = json.uuid;
            }
        })
        return uuids;
    }

    function generate_notebook_meme(notebook, uuids) {
        var counter = 0;
        var memeobj = notebook.metadata['lc_notebook_meme'];
        if (!memeobj) {
            memeobj = notebook.metadata['lc_notebook_meme'] = {};
        }
        if (!memeobj['current']) {
            if(uuids) {
                if (uuids.length <= 0) {
                    throw "too few generated UUIDs"
                }
                memeobj['current'] = uuids.shift();
            }
            counter++;
        }

        var cells = notebook.get_cells()
        for (var i=0; i<cells.length; ++i) {
            var cell = cells[i]
            counter += generate_cell_meme(cells[i], uuids)
        }
        return counter;
    }

    function generate_cell_meme(cell, uuids) {
        var counter = 0;
        var memeobj = cell.metadata['lc_cell_meme'];
        if(!memeobj) {
            memeobj = cell.metadata['lc_cell_meme'] = {}
        }
        if(memeobj['_new_current']) {
            memeobj['current'] = memeobj['_new_current'];
            delete memeobj['_new_current'];
        } else if(!memeobj['current']) {
            if(uuids) {
                if (uuids.length <= 0) {
                    throw "too few generated UUIDs"
                }
                memeobj['current'] = uuids.shift()
            }
            counter++;
        }
        return counter;
    }

    function update_prev_next_meme(notebook)
    {
        var cells = notebook.get_cells()
        for (var i=0; i<cells.length; ++i) {
            var cell = cells[i]
            var prev_cell = i > 0 ? cells[i-1] : null;
            var next_cell = i <　cells.length-1 ? cells[i+1] : null;
            update_prev_next_cell_meme(cell, prev_cell, next_cell)
        }
    }

    function update_prev_next_cell_meme(cell, prev_cell, next_cell)
    {
        var memeobj = cell.metadata['lc_cell_meme'];
        if(!memeobj) {
            memeobj = cell.metadata['lc_cell_meme'] = {}
        }
        memeobj['previous'] = prev_cell ? prev_cell.metadata['lc_cell_meme']['current'] : null;
        memeobj['next']     = next_cell ? next_cell.metadata['lc_cell_meme']['current'] : null;
    }

    function update_prev_next_history(notebook)
    {
        var counter = 0;
        var cells = notebook.get_cells();
        for (var i=0; i<cells.length; ++i) {
            var cell = cells[i];
            var prev_cell = i > 0 ? cells[i-1] : null;
            var next_cell = i <　cells.length-1 ? cells[i+1] : null;

            counter += update_prev_next_cell_history(cell, prev_cell, next_cell);
        }
        return counter;
    }

    function update_prev_next_cell_history(cell, prev_cell, next_cell) {
        var memeobj = cell.metadata['lc_cell_meme']

        if (!memeobj) {
            return 0;
        }
        if (typeof memeobj['current'] === "undefined"
            || typeof memeobj['previous'] === "undefined"
            || typeof memeobj['next'] === "undefined") {
            return 0;
        }

        var prev_meme = memeobj['previous'];
        var next_meme = memeobj['next'];
        var prev_memeobj = prev_cell ? prev_cell.metadata['lc_cell_meme'] : null;
        var next_memeobj = next_cell ? next_cell.metadata['lc_cell_meme'] : null;
        var current_meme = memeobj['current'];
        var new_current_meme = memeobj['_new_current'];

        if ((prev_memeobj && prev_memeobj['current'] != prev_meme)
            || (prev_cell && !prev_memeobj)
            || (next_memeobj && next_memeobj['current'] != next_meme)
            || (next_cell && !next_memeobj)
            || (new_current_meme && current_meme != new_current_meme)) {
            var history = memeobj['history'];
            if (!history) {
                history = memeobj['history'] = [];
            }
            history.push({
                'current': memeobj['current'],
                'previous': memeobj['previous'],
                'next': memeobj['next']
            });
            return 1;
        }
        return 0;
    }

    function generate_meme(notebook) {
        var history_count = update_prev_next_history(notebook);
        var meme_count = generate_notebook_meme(notebook, null);
        var uuids = generate_uuid(meme_count);
        if (!uuids) {
            console.error('Failed to get UUIDs from server');
            return;
        }
        meme_count = generate_notebook_meme(notebook, uuids);
        update_prev_next_meme(notebook);

        return {
            meme_count : meme_count,
            cell_history_count : history_count
        }
    }

    function create_branch_number() {
        var num = Math.random() * 0xffff;
        return ('000' + Math.floor(num).toString(16)).slice(-4);
    }

    function parse_cell_meme(meme) {
        var ids = meme.split('-');
        var uuid = ids.slice(0, 5).join('-');
        var branch_count = ids.slice(5, 6);
        var branch_numbers = ids.slice(6);
        return {
            uuid: uuid,
            branch_count: branch_count || 0,
            branch_numbers: branch_numbers
        };
    }

    function combine_cell_meme(parts) {
        var meme = parts.uuid;
        if (parts.branch_count > 0) {
            meme += '-' + parts.branch_count;
            meme += '-' + parts.branch_numbers.join('-');
        }
        return meme;
    }

    function add_branch_number(meme) {
        var parts = parse_cell_meme(meme);
        var new_branch = create_branch_number();
        parts.branch_numbers.push(new_branch);
        if (parts.branch_numbers.length > 10) {
            parts.branch_numbers.shift();
        }
        ++parts.branch_count;
        return combine_cell_meme(parts);
    }

    function generate_branch_number(cell) {
        var memeobj = cell.metadata['lc_cell_meme'];
        if (!memeobj) {
            memeobj = cell.metadata['lc_cell_meme'] = {}
        }

        var meme = memeobj['_new_current'] || memeobj['current'];
        if (meme) {
            memeobj['_new_current'] = add_branch_number(meme);
        } else {
            var uuids = generate_uuid(1);
            memeobj['_new_current'] = uuids[0];
        }
    }

    return {
        generate_uuid: generate_uuid,
        generate_meme: generate_meme,
        generate_branch_number: generate_branch_number
    };
})
