// Regression coverage for the item-11 i18n extraction: the generic fetch-error fallback (fires
// whenever a request errors with no `.error()` callback registered -- the app-wide catch-all,
// hit by nearly every component via `api.set()`) used to hardcode French regardless of
// `i18n.language`. Also fixes a typo ("cod suivant" -> "code suivant") along the way.

import i18n from "../i18n";
import * as api from "./api";

vi.mock("sweetalert2", () => ({ default: { fire: vi.fn() } }));

import swal from "sweetalert2";

const errorJson = (body) =>
    vi.fn().mockResolvedValue({
        ok: false,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve(body),
    });

afterEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("fr");
});

describe("api.set() generic error fallback follows the active UI language", () => {
    test.each(["fr", "en"])(
        "titles the swal with the resolved unexpectedTitle in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            global.fetch = errorJson({ code: "E42", message: "boom" });

            await api.set().get("/whatever");

            expect(swal.fire).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: i18n.getFixedT(
                        lng,
                        "common"
                    )("apiErrors.unexpectedTitle"),
                })
            );
        }
    );

    test("interpolates {{message}}/{{code}} when the error has a message (fr)", async () => {
        await i18n.changeLanguage("fr");
        global.fetch = errorJson({ code: "E42", message: "boom" });

        await api.set().get("/whatever");

        expect(swal.fire).toHaveBeenCalledWith(
            expect.objectContaining({ text: "boom (E42)" })
        );
    });

    test("falls back to the code-only copy (typo-free) when there's no message (fr)", async () => {
        await i18n.changeLanguage("fr");
        global.fetch = errorJson({ code: "E42" });

        await api.set().get("/whatever");

        expect(swal.fire).toHaveBeenCalledWith(
            expect.objectContaining({
                text: "Veuillez contacter l'administrateur du site pour plus d'informations et lui donner le code suivant : E42",
            })
        );
    });

    test("does not swal when a .error() callback is registered instead", async () => {
        await i18n.changeLanguage("fr");
        global.fetch = errorJson({ code: "E42" });
        const onError = vi.fn();

        await api.set().error(onError).get("/whatever");

        expect(swal.fire).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith({ code: "E42" });
    });
});
