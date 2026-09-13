import { csrfToken } from "../components/utils";
import { API_ERRORS_MESSAGES } from "./constants";
import swal from "sweetalert2";

/**
 * Handle API response
 * @param {*} response
 */
export const handleResponse = (response: Response) => {
    if (!response.ok) {
        const errorData = response.json() || Promise.resolve(false);

        return errorData.then((error) =>
            Promise.reject(
                Array.isArray(error.errors)
                    ? error.errors.map(
                          (err: any) => API_ERRORS_MESSAGES[err] || err
                      )
                    : error
            )
        );
    }

    const contentType = response.headers.get("Content-type");

    if (!contentType) {
        return Promise.resolve(null);
    } else if (contentType.indexOf("application/json") !== -1) {
        return response.json();
    }
    return response.blob();
};

interface Callbacks {
    before?: () => void;
    success?: (data: any) => void;
    error?: (error: any) => void;
    loading?: boolean;
}

// Any JSON-serializable value — request bodies commonly nest numbers/booleans/null
// (e.g. `{ comment: { user_id: 3, ... } }`), not just strings.
export type JSONValue =
    | string
    | number
    | boolean
    | null
    | JSONValue[]
    | { [key: string]: JSONValue };

export type RequestData = Record<string, JSONValue> | string[][] | undefined;

// GET has no body — its `data` becomes the query string instead. URLSearchParams only accepts
// flat string values at the type level, but coerces non-string values to strings at runtime the
// same way this does explicitly, so this doesn't change behavior for existing callers.
const toSearchParams = (data: RequestData): URLSearchParams => {
    if (Array.isArray(data)) return new URLSearchParams(data);

    const flat: Record<string, string> = {};
    if (data) {
        Object.entries(data).forEach(([key, value]) => {
            if (value === null || value === undefined) return;
            flat[key] =
                typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value);
        });
    }
    return new URLSearchParams(flat);
};

// API REQUESTS
const request =
    (method: string) =>
    async (
        url: string | undefined = undefined,
        data: RequestData = undefined,
        callbacks: Callbacks = {},
        additionalHeaders: Record<string, string> = {}
    ) => {
        if (callbacks.before) {
            callbacks.before();
        }

        let body = undefined;
        if (data) {
            if (method === "GET") {
                const searchParams = toSearchParams(data);
                url = `${url}?${searchParams.toString()}`;
                body = {};
            } else {
                body = { body: JSON.stringify(data) };
            }
        }

        if (callbacks.loading) {
            window.dispatchEvent(new Event("loadingStart"));
        }

        return fetch(url ? `${url}` : "", {
            method,
            ...body,
            credentials: "same-origin",
            headers: {
                Accept: "application/json",
                "Accept-Encoding": "gzip, deflate, br",
                "X-Csrf-Token": csrfToken,
                "Content-Type": "application/json",
                ...additionalHeaders,
            },
        })
            .then(handleResponse)
            .then((data) => {
                if (callbacks.loading)
                    window.dispatchEvent(new Event("loadingEnd"));

                return callbacks.success ? callbacks.success(data) : { data };
            })
            .catch((error) => {
                if (callbacks.loading)
                    window.dispatchEvent(new Event("loadingEnd"));

                if (callbacks.error) return callbacks.error(error);

                if (error.code) {
                    swal({
                        type: "error",
                        title: "Oops... une erreur est survenue",
                        text: error.message
                            ? `${error.message} (${error.code})`
                            : `Veuillez contacter l'administrateur du site pour plus d'informations et lui donner le cod suivant : ${error.code}`,
                    });
                }

                return { error };
            });
    };

export const get = request("GET");
export const post = request("POST");
export const put = request("PUT");
export const patch = request("PATCH");
export const del = request("DELETE");

export const set = (callbacks: Callbacks = {}) => ({
    useLoading: () => set({ ...callbacks, loading: true }),
    before: (func: Callbacks["before"]) => set({ ...callbacks, before: func }),
    success: (func: Callbacks["success"]) =>
        set({ ...callbacks, success: func }),
    error: (func: Callbacks["error"]) => set({ ...callbacks, error: func }),
    get: (
        url: string,
        data?: RequestData,
        additionalHeaders: Record<string, string> = {}
    ) => get(url, data, callbacks, additionalHeaders),
    post: (
        url: string,
        data?: RequestData,
        additionalHeaders: Record<string, string> = {}
    ) => post(url, data, callbacks, additionalHeaders),
    put: (
        url: string,
        data?: RequestData,
        additionalHeaders: Record<string, string> = {}
    ) => put(url, data, callbacks, additionalHeaders),
    patch: (
        url: string,
        data?: RequestData,
        additionalHeaders: Record<string, string> = {}
    ) => patch(url, data, callbacks, additionalHeaders),
    del: (
        url: string,
        data?: RequestData,
        additionalHeaders: Record<string, string> = {}
    ) => del(url, data, callbacks, additionalHeaders),
});
