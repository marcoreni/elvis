// Coverage for GeneralInfos.jsx's national-ID masked field (react-input-mask ->
// @react-input/mask migration). No test existed for this field before. GeneralInfos needs a
// react-final-form <Form> context for its <Field>s, so it's rendered inside
// <Form onSubmit render={() => <GeneralInfos .../>} />, same pattern as
// activityRef/ActivityRefBasics.test.jsx.

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Form } from "react-final-form";
import { MESSAGES } from "../../tools/constants";
import GeneralInfos from "./GeneralInfos";

// @react-input/mask needs real ticks between keystrokes to validate the input's
// selection state (it polls via setTimeout while focused) -- userEvent.type's
// default zero-delay firing races that and only the first character "sticks".
const TYPE_OPTIONS = { delay: 10 };

const baseProps = {
    displayIdentificationNumber: true,
    ignoreValidate: false,
    mutators: { changeBirthDate: () => {} },
    formValues: {},
    formErrors: {},
};

function renderForm(props = {}) {
    render(
        <Form
            onSubmit={() => {}}
            render={() => <GeneralInfos {...baseProps} {...props} />}
        />
    );
    return screen.getByPlaceholderText("85 07 30 033 28");
}

describe("GeneralInfos identification number mask", () => {
    test("typing a full national ID formats it with the mask's literal spaces", async () => {
        const input = renderForm();
        await userEvent.type(input, "85073003328", TYPE_OPTIONS);

        expect(input.value).toBe("85 07 30 033 28");
    });

    test("a full, correctly formatted national ID passes isValidNN", async () => {
        const input = renderForm();
        await userEvent.type(input, "85073003328", TYPE_OPTIONS);
        fireEvent.blur(input);

        expect(
            screen.queryByText(MESSAGES["err_invalid_NN"])
        ).not.toBeInTheDocument();
    });

    test("an incomplete national ID fails isValidNN once touched", async () => {
        const input = renderForm();
        await userEvent.type(input, "8507", TYPE_OPTIONS);
        fireEvent.blur(input);

        expect(
            screen.getByText(MESSAGES["err_invalid_NN"])
        ).toBeInTheDocument();
    });
});
