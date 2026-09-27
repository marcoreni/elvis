// Regression test for `deleteDocument`'s list-corrupting delete.
//
// `deleteDocument` used to do `setDocuments(documents.splice(index, index))` on a successful
// delete. `Array.prototype.splice(start, deleteCount)` called this way removes `index` elements
// starting at `index` (not just the one target document) AND returns the *removed* elements, not
// the remainder -- so the document list got replaced with garbage instead of the correctly
// filtered remainder. Deleting the very first document (index 0) makes this obvious:
// `splice(0, 0)` removes nothing and returns `[]`, wiping the whole list. Fixed with
// `documents.filter((doc) => doc.id !== documentId)`.
//
// `global.fetch` is stubbed directly (not `tools/api`, since `api.set()` is a thin builder around
// the real `fetch` call -- mocking the module would bypass its own request-building logic). Only
// the *first* GET to `/consent_documents` resolves; every later one (the component's own
// `useEffect(didMount, [documents.length])` re-fetches whenever the list's length changes, which
// would otherwise silently self-heal a corrupted list moments later and mask the bug) is left
// pending forever, so the assertions see exactly what `deleteDocument`'s own state update produced.

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ConsentDocumentsList from "./ConsentDocumentsList";

vi.mock("sweetalert2", () => ({ default: { fire: vi.fn() } }));
vi.mock("react-modal", () => ({
    default: Object.assign(() => null, { setAppElement: vi.fn() }),
}));

const jsonResponse = (body) => ({
    ok: true,
    headers: { get: (h) => (h === "Content-type" ? "application/json" : null) },
    json: () => Promise.resolve(body),
});

const initialDocs = [
    { id: 1, title: "Doc 1", index: 1 },
    { id: 2, title: "Doc 2", index: 2 },
    { id: 3, title: "Doc 3", index: 3 },
];

beforeEach(() => {
    let getCallCount = 0;
    global.fetch = vi.fn((url, options = {}) => {
        const method = (options.method || "GET").toUpperCase();

        if (method === "GET" && String(url).includes("/consent_documents")) {
            getCallCount += 1;
            // Only the very first fetch (the initial mount) resolves; later ones (triggered by
            // the component's own length-keyed useEffect after the delete) hang forever so they
            // can't mask a corrupted local state with a fresh, correct one from the server.
            return getCallCount === 1
                ? Promise.resolve(jsonResponse(initialDocs))
                : new Promise(() => {});
        }

        const deleteMatch = String(url).match(/\/consent_documents\/(\d+)$/);
        if (method === "DELETE" && deleteMatch) {
            return Promise.resolve(jsonResponse(null));
        }

        return Promise.resolve(jsonResponse([]));
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

test("deleting the first document removes only that document, keeping the others", async () => {
    const { container } = render(<ConsentDocumentsList />);

    await screen.findByText("Doc 1");
    expect(screen.getByText("Doc 2")).toBeInTheDocument();
    expect(screen.getByText("Doc 3")).toBeInTheDocument();

    const deleteButtons = container.querySelectorAll(".fa-times");
    expect(deleteButtons).toHaveLength(3);
    fireEvent.click(deleteButtons[0]); // deletes "Doc 1", the id at array index 0

    await waitFor(() => {
        expect(screen.queryByText("Doc 1")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Doc 2")).toBeInTheDocument();
    expect(screen.getByText("Doc 3")).toBeInTheDocument();
});
