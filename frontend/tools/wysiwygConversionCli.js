// Standalone Node CLI bridge for the Phase 4d one-time Rails migration. Invoked via Open3 by the
// `elvis:migrate_wysiwyg_content` rake task (lib/tasks/elvis.rake), through Elvis::WysiwygConverter
// (lib/elvis/wysiwyg_converter.rb). Invoked from Rails.root as:
//
//     node frontend/tools/wysiwygConversionCli.js
//
// Contract (must match the backend-specialist's rake task exactly):
//   stdin:  the Parameter row's raw `value` string, as raw UTF-8 -- not JSON-wrapped, not an
//           argv argument. Never blank/nil (the Ruby side filters that out before invoking).
//   stdout: exactly one JSON object, nothing else:
//             {"isDraftJs": false, "html": "<input unchanged>", "failed": false}
//             {"isDraftJs": true,  "html": "<converted HTML>",  "failed": false}
//             {"isDraftJs": true,  "failed": true}
//   exit code: 0 for all three verdicts above (including failed:true -- that's a per-row result,
//           not an infrastructure failure). Non-zero only if the bridge itself is broken (module
//           failed to load, no stdin, bad invocation).
//   stderr: free-form; carries the underlying console.warn from a genuine double-conversion
//           failure, which Ruby logs alongside the failed:true verdict.
//
// This file intentionally does not transform/trim stdin, and does not reimplement Draft.js
// detection or conversion -- it only calls frontend/tools/wysiwygConversion.js, the exact module
// the frontend itself uses, so the HTML written to the DB is byte-identical to what the frontend
// would render from the same input.
//
// IMPORTANT: this script never calls `process.exit()`. When stdout/stderr is a pipe (exactly
// what Ruby's Open3.capture3 gives it), writes to it are asynchronous; calling `process.exit()`
// right after `.write()` can terminate the process before the write actually flushes, silently
// truncating output larger than the pipe buffer (observed: exactly 65536 bytes) while still
// reporting exit code 0. Setting `process.exitCode` and letting the process exit naturally once
// the event loop drains (i.e. once the write finishes) avoids this.

function main() {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => {
        const input = Buffer.concat(chunks).toString("utf8");
        run(input);
    });
    process.stdin.on("error", (err) => {
        process.stderr.write(`wysiwygConversionCli: stdin error: ${err}\n`);
        process.exitCode = 1;
    });
}

function run(input) {
    let wysiwygConversion;
    try {
        wysiwygConversion = require("./wysiwygConversion");
    } catch (err) {
        process.stderr.write(
            `wysiwygConversionCli: failed to load wysiwygConversion module: ${err}\n`
        );
        process.exitCode = 1;
        return;
    }

    const { isDraftJsRaw, convertWysiwyg } = wysiwygConversion;
    const isDraftJs = isDraftJsRaw(input);
    const result = convertWysiwyg(input);

    let output;
    if (result.failed) {
        output = { isDraftJs: true, failed: true };
    } else {
        output = { isDraftJs, html: result.html, failed: false };
    }

    process.stdout.write(JSON.stringify(output));
    // No process.exit(0) here -- see header comment. exitCode defaults to 0.
}

main();
