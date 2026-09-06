import moment from "moment";
import type { Entity, User } from "../evaluation/types";
import {
    DEFAULT_LABEL_ACCESSOR,
    DEFAULT_VALUE_ACCESSOR,
} from "../evaluation/question/select_targets";
import get from "lodash/get";

export const ISO_DATE_FORMAT = "YYYY-MM-DD";
export const FR_DATE_FORMAT = "DD/MM/YYYY";

export const csrfToken =
    document
        ?.querySelector('meta[name="csrf-token"]')
        ?.getAttribute("content") ?? "";

const keyBy = (array: any[], key: string) =>
    (array || []).reduce((r, x) => ({ ...r, [key ? x[key] : x]: x }), {});

export function indexById<T>(arr: T[]): Record<string, T> {
    return keyBy(arr, "id");
}

interface CreatorOptions<T extends Entity> {
    id?: (d: T, i: number, arr: T[]) => string;
    label?: (d: T, i: number, arr: T[]) => string;
}

// DRY option creator
// Function creating an option element with a given data
// Takes two arguments:
//  - the actual data that will be queried to output the option's
//    options (key, value, label)
//  - an options object specifying what information will be extracted,
//    this parameter has defaults which represent the most frequent use cases
function optionCreator<T extends Entity>(
    data: T,
    i: number,
    arr: T[],
    {
        id = DEFAULT_VALUE_ACCESSOR,
        label = DEFAULT_LABEL_ACCESSOR,
    }: CreatorOptions<T>
) {
    return (
        <option key={id(data, i, arr)} value={id(data, i, arr)}>
            {label(data, i, arr)}
        </option>
    );
}

// This is a preparation function, which in advance gives the options object
// which will be used to create the options
// This is so we don't have to pass a lambda to the map call, and so
// that everything stays "simple" enough
export function optionMapper<T extends Entity>(options: CreatorOptions<T>) {
    return (data: T, i: number, arr: T[]) =>
        optionCreator(data, i, arr, options);
}

export function reactOptionCreator<T extends Entity>(
    data: T,
    i: number,
    arr: T[],
    {
        id = DEFAULT_VALUE_ACCESSOR,
        label = DEFAULT_LABEL_ACCESSOR,
    }: CreatorOptions<T>
) {
    return { value: id(data, i, arr), label: label(data, i, arr) };
}

export function reactOptionMapper<T extends Entity>(
    options: CreatorOptions<T>
) {
    return (data: T, i: number, arr: T[]) =>
        reactOptionCreator(data, i, arr, options);
}

export const USER_OPTIONS = {
    label: (d: User) => `${d.first_name} ${d.last_name}`,
};
export const USER_OPTIONS_SHORT = {
    label: (d: User) => `${d.first_name} ${d.last_name.charAt(0)}.`,
};

export function hasKeys<T extends Record<string, unknown>>(
    o: T,
    keys: string[]
): boolean {
    return keys.filter((k) => !!o[k]).length === 0;
    // return keys.reduce((acc, k) => acc && _.has(o, k), true);
}

export function findAndGet<T>(
    data: T[],
    f: (d: T) => boolean,
    path: string,
    def?: T
) {
    return get(data.find(f), path, def);
}

export function isRadioTrue(v: string | boolean): boolean {
    return v === true || v === "true";
}

function downloadFile({
    url,
    format = "csv",
    fileName = moment().format("DD_MM_YYYY-HH_mm_ss"),
}: {
    url: string;
    format?: string;
    fileName?: string;
}) {
    fetch(url, {
        method: "GET",
        headers: {
            "X-Csrf-Token": csrfToken,
        },
    })
        .then((res) => res.blob())
        .then((file) => {
            const download = document.createElement("a");
            download.download = `${fileName}.${format}`;
            download.href = URL.createObjectURL(file);
            document.body.appendChild(download);
            download.click();
            document.body.removeChild(download);
        });
}

export function DownloadButton({
    url,
    format,
    fileName,
    children,
    ...passProps
}: {
    url: string;
    format?: string;
    fileName?: string;
    children: React.ReactNode;
}) {
    return (
        <button
            className="btn btn-sm btn-primary"
            {...passProps}
            onClick={() =>
                downloadFile({
                    url,
                    format,
                    fileName,
                })
            }
        >
            {children}
        </button>
    );
}

export function displayGenitiveName(name: string): string {
    return name ? `${name.match(/^[aeiou]/i) ? "d'" : "de "}${name}` : "de";
}

export function displayInlineAddress(a: {
    street_address: string;
    postcode: string;
    city: string;
}): string {
    return `${a.street_address}, ${a.postcode} ${a.city}`;
}

export function frenchEnumeration(list: string[]): string {
    if (list.length === 0) {
        return "";
    } else if (list.length === 1) {
        return list[0];
    } else {
        const withoutLast = list.slice(0, list.length - 1).join(", ");
        const last = list[list.length - 1];
        return `${withoutLast} et ${last}`;
    }
}
