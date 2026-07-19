// Thin wrapper around Pyodide: boots the WASM Python runtime and exposes
// runChallenge(userCode, testCode) -> {success, output, error}

const PyRunner = (() => {
  let pyodide = null;
  let ready = false;

  async function init(onProgress) {
    onProgress && onProgress("Downloading Python runtime…", 15);
    pyodide = await loadPyodide();

    onProgress && onProgress("Preparing the challenge engine…", 70);
    pyodide.runPython(`
import io, contextlib

def __run_challenge(user_code, test_code):
    ns = {}
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            exec(user_code, ns)
        ns['__output__'] = buf.getvalue()
        exec(test_code, ns)
        return {"success": True, "output": buf.getvalue(), "error": None}
    except AssertionError as e:
        return {"success": False, "output": buf.getvalue(), "error": str(e) or "One of the checks failed."}
    except SyntaxError as e:
        return {"success": False, "output": buf.getvalue(), "error": f"SyntaxError: {e.msg} (line {e.lineno})"}
    except Exception as e:
        return {"success": False, "output": buf.getvalue(), "error": f"{type(e).__name__}: {e}"}
`);
    ready = true;
    onProgress && onProgress("Ready!", 100);
  }

  async function runChallenge(userCode, testCode) {
    if (!ready) throw new Error("Python engine is not ready yet.");
    const fn = pyodide.globals.get("__run_challenge");
    const resultPy = fn(userCode, testCode);
    const result = resultPy.toJs({ dict_converter: Object.fromEntries });
    resultPy.destroy();
    return result;
  }

  return { init, runChallenge, isReady: () => ready };
})();
