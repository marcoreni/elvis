// Coverage for Input.jsx's masked branch (react-input-mask -> @react-input/mask migration).
// No test existed for this branch before; it's exercised indirectly by
// PayerPaymentTerms.jsx and userForm/GeneralInfos.jsx, both using the Belgian
// national-ID mask "99 99 99 999 99".

import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Input from "./Input";
import { MESSAGES } from "../../tools/constants";

// @react-input/mask needs real ticks between keystrokes to validate the input's
// selection state (it polls via setTimeout while focused) -- userEvent.type's
// default zero-delay firing races that and only the first character "sticks".
const TYPE_OPTIONS = { delay: 10 };

const NN_MASK = "99 99 99 999 99";

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
        await userEvent.type(input, "85073003328", TYPE_OPTIONS);

        expect(input.value).toBe("85 07 30 033 28");
    });

    test("an empty/untouched masked input has no placeholder fill characters", () => {
        const input = renderMasked();

        expect(input.value).toBe("");
    });

    test("a partially typed value is truncated, not padded with a fill char", async () => {
        const input = renderMasked();
        await userEvent.type(input, "8507", TYPE_OPTIONS);

        expect(input.value).toBe("85 07");
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
