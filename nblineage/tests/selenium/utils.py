
promise_js = """
var done = arguments[arguments.length - 1];
%s.then(
    data => { done(["success", data]); },
    error => { done(["error", error]); }
);
"""


def execute_promise(js, browser):
    state, data = browser.execute_async_script(promise_js % js)
    if state == 'success':
        return data
    raise Exception(data)
