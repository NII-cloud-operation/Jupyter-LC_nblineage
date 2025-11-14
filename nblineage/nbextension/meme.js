define([
    'jquery',
    'base/js/namespace',
], function($, Jupyter) {
    'use strict';

    const CELL_MEME_ATTR_KEY = 'data-nblineage-meme';

    function generate_uuid(count) {
        if (count == 0) {
            return [];
        }
        var url = Jupyter.notebook.base_url + 'nblineage/uuid/v1/' + count
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
        const new_metadata = $.extend(true, {}, notebook.metadata);
        let memeobj = new_metadata['lc_notebook_meme'];
        if (!memeobj) {
            memeobj = new_metadata['lc_notebook_meme'] = {};
        }
        if (!memeobj['current']) {
            if(uuids) {
                if (uuids.length <= 0) {
                    throw new Error('too few generated UUIDs');
                }
                memeobj['current'] = uuids.shift();
            }
            counter++;
        }
        notebook.metadata = new_metadata;

        var cells = notebook.get_cells()
        for (var i=0; i<cells.length; ++i) {
            counter += generate_cell_meme(cells[i], uuids)
        }
        return counter;
    }

    function generate_cell_meme(cell, uuids) {
        var counter = 0;
        const new_metadata = $.extend(true, {}, cell.metadata);
        let memeobj = new_metadata['lc_cell_meme'];
        if(!memeobj) {
            memeobj = new_metadata['lc_cell_meme'] = {}
        }
        if(!memeobj['current']) {
            if(uuids) {
                if (uuids.length <= 0) {
                    throw new Error('too few generated UUIDs');
                }
                memeobj['current'] = uuids.shift()
                cell.metadata = new_metadata;
                update_cell_elem_attr(cell);
            }
            counter++;
        }
        return counter;
    }

    function update_prev_next_meme(notebook) {
        var cells = notebook.get_cells()
        for (var i=0; i<cells.length; ++i) {
            var prev_cell = i > 0 ? cells[i-1] : null;
            var next_cell = i <　cells.length-1 ? cells[i+1] : null;
            update_prev_next_cell_meme(cells[i], prev_cell, next_cell);
        }
    }

    function update_prev_next_cell_meme(cell, prev_cell, next_cell) {
        const new_metadata = $.extend(true, {}, cell.metadata);
        let memeobj = new_metadata['lc_cell_meme'];
        if(!memeobj) {
            memeobj = new_metadata['lc_cell_meme'] = {}
        }
        memeobj['previous'] = prev_cell ? prev_cell.metadata['lc_cell_meme']['current'] : null;
        memeobj['next']     = next_cell ? next_cell.metadata['lc_cell_meme']['current'] : null;
        cell.metadata = new_metadata;
    }

    function update_prev_next_history(notebook) {
        var counter = 0;
        const cells = notebook.get_cells();
        for (var i=0; i<cells.length; ++i) {
            var prev_cell = i > 0 ? cells[i-1] : null;
            var next_cell = i <　cells.length-1 ? cells[i+1] : null;
            counter += update_prev_next_cell_history(cells[i], prev_cell, next_cell);
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

        if ((prev_memeobj && prev_memeobj['current'] != prev_meme)
            || (prev_cell && !prev_memeobj)
            || (next_memeobj && next_memeobj['current'] != next_meme)
            || (next_cell && !next_memeobj)) {
            const new_metadata = $.extend(true, {}, cell.metadata);
            memeobj = new_metadata['lc_cell_meme'];
            var history = memeobj['history'];
            if (!history) {
                history = memeobj['history'] = [];
            }
            history.push({
                'current': memeobj['current'],
                'previous': memeobj['previous'],
                'next': memeobj['next']
            });
            cell.metadata = new_metadata;
            return 1;
        }
        return 0;
    }

    function generate_meme(notebook) {
        var history_count = update_prev_next_history(notebook);
        var meme_count = generate_notebook_meme(notebook, null);
        var uuids = generate_uuid(meme_count);
        if (!uuids) {
            throw new Error('Failed to get UUIDs from server');
        }
        meme_count = generate_notebook_meme(notebook, uuids);
        update_prev_next_meme(notebook);

        return {
            meme_count : meme_count,
            cell_history_count : history_count
        }
    }

    function create_branch_number() {
        const num = Math.random() * 0xffff;
        return Math.floor(num).toString(16).padStart(4, '0');
    }

    function parse_cell_meme(meme) {
        const ids = meme.split('-');
        const uuid = ids.slice(0, 5).join('-');
        const branch_count = ids.slice(5, 6) || 0;
        const branch_numbers = ids.slice(6);
        return {uuid, branch_count, branch_numbers};
    }

    function combine_cell_meme(parts) {
        let meme = parts.uuid;
        if (parts.branch_count > 0) {
            meme += '-' + parts.branch_count;
            meme += '-' + parts.branch_numbers.join('-');
        }
        return meme;
    }

    function add_branch_number(meme) {
        const parts = parse_cell_meme(meme);
        const new_branch = create_branch_number();
        parts.branch_numbers.push(new_branch);
        if (parts.branch_numbers.length > 10) {
            parts.branch_numbers.shift();
        }
        ++parts.branch_count;
        return combine_cell_meme(parts);
    }

    function generate_branch_number(cell) {
        if (!cell.metadata['lc_cell_meme'] || !cell.metadata['lc_cell_meme']['current']) {
            return;
        }
        const new_memeobj = $.extend(true, {}, cell.metadata);
        new_memeobj['lc_cell_meme']['current'] = add_branch_number(new_memeobj['lc_cell_meme']['current']);
        cell.metadata = new_memeobj;
        update_cell_elem_attr(cell);
    }

    function generate_branch_number_all(notebook) {
        const cells = notebook.get_cells();
        for (const cell of cells) {
            generate_branch_number(cell);
        }
    }

    function update_cell_elem_attr(cell) {
        const current = cell.metadata['lc_cell_meme'] && cell.metadata['lc_cell_meme']['current'] || '';
        cell.element.attr(CELL_MEME_ATTR_KEY, current);
    }

    return {
        generate_uuid: generate_uuid,
        generate_meme: generate_meme,
        generate_branch_number: generate_branch_number,
        generate_branch_number_all: generate_branch_number_all,
        update_cell_elem_attr: update_cell_elem_attr
    };
})
