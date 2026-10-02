// Coverage for Input.jsx's masked branch (react-input-mask -> @react-input/mask migration).
// No test existed for this branch before; it's exercised indirectly by
// PayerPaymentTerms.jsx and userForm/GeneralInfos.jsx, both using the Belgian
// national-ID mask "## ## ## ### ##". Fixtures here deliberately include a
// "9" (MASK_REPLACEMENT's digit token used to be "9" itself, which silently
// swallowed every literal "9" typed -- see Input.jsx's comment).

import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Input from "./Input";
import { MESSAGES } from "../../tools/constants";

// @react-input/mask needs real ticks between keystrokes to validate the input's
// selection state (it polls via setTimeout while focused) -- userEvent.type's
// default zero-delay firing races that and only the first character "sticks".
const TYPE_OPTIONS = { delay: 10 };

// @react-input/core's focus listener starts a self-rescheduling setTimeout
// loop that only `clearTimeout`s on blur, not on unmount. A test that types
// into the masked input and never blurs it leaves that loop rescheduling
// past the test's end; if it's still mid-flight when Vitest tears down this
// file's jsdom window, the next tick throws into a dead environment
// ("window is not defined"), an unhandled error that can fail the overall
// `vitest run` exit code. Always blur after typing into a masked input.

const NN_MASK = "## ## ## ### ##";

// A controlled Input needs a real onChange that updates state: React resyncs a
// controlled input's DOM value to its `value` prop right after every change
// event, so a no-op onChange would stomp the mask's own formatting back out.
function ControlledInput(extraProps) {
    const [value, setValue] = useState("");
    return (
        <Input
            name="identification_number"
            input={{ value, onChange: (e) => setValue(e.target.value) }}
            meta={{}}
            mask={NN_MASK}
            placeholder="85 07 30 033 28"
            {...extraProps}
        />
    );
}

function renderMasked(extraProps = {}) {
    render(<ControlledInput {...extraProps} />);

    return screen.getByPlaceholderText("85 07 30 033 28");
}

describe("Input masked branch", () => {
    test("formats a fully typed national ID with mask literal spaces", async () => {
        const input = renderMasked();
        await userEvent.type(input, "97012312345", TYPE_OPTIONS);

        expect(input.value).toBe("97 01 23 123 45");
        fireEvent.blur(input);
    });

    test("an empty/untouched masked input has no placeholder fill characters", () => {
        const input = renderMasked();

        expect(input.value).toBe("");
    });

    test("a partially typed value is truncated, not padded with a fill char", async () => {
        const input = renderMasked();
        await userEvent.type(input, "9701", TYPE_OPTIONS);

        expect(input.value).toBe("97 01");
        fireEvent.blur(input);
    });

    test("passes maxLength, disabled and placeholder through to the input", () => {
        const input = renderMasked({ maxLength: 20, disabled: true });

        expect(input).toHaveAttribute("maxLength", "20");
        expect(input).toBeDisabled();
        expect(input).toHaveAttribute("placeholder", "85 07 30 033 28");
    });

    test("shows the meta error when touched", () => {
        render(
            <Input
                name="identification_number"
                input={{ value: "", onChange: () => {} }}
                meta={{ error: "err_required", touched: true }}
                mask={NN_MASK}
            />
        );

        expect(screen.getByText(MESSAGES["err_required"])).toBeInTheDocument();
    });
});
