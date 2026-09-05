import type { Moment } from "moment";

export function range(start: number, stop?: number, step?: number): number[] {
    if (stop == undefined) {
        stop = start || 0;
        start = 0;
    }
    step = step || 1;

    const length = Math.max(Math.ceil((stop - start) / step), 0);
    const range: number[] = [];

    for (let idx = 0; idx < length; idx++, start += step) {
        range.push(start);
    }

    return range;
}

export type CustomClasses =
    | Record<
          string,
          | string
          | string[]
          | ((day: Moment) => boolean)
          | { start: string; end: string }
          | undefined
      >
    | ((day: Moment) => string[]);
