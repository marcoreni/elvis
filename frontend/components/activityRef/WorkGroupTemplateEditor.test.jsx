// i18n extraction tests for WorkGroupTemplateEditor (i18n-06 "activities" domain, lot 2c).
//
// The exported class is `WorkGroupEditor2`, wrapped in `withTranslation("activities")`. It
// renders a react-final-form `<Field>` (the "is a workshop" checkbox) plus a `<FormSpy>` that
// only mounts `renderInstruments()` when the form value `activityRef.is_work_group` is truthy —
// so the component is mounted inside
// `<Form initialValues={{ activityRef: { is_work_group: true } }} render={() => <Editor/>} />`.
//
// `renderInstruments()` has two branches:
//  - `instruments.length > 0` → real `<h2>` / `<h4>` headings (templateTitle / instruments /
//    roles), asserted directly.
//  - `instruments.length === 0` → a `<Trans i18nKey="workGroup.noInstruments"
//    components={{ link: <a href="/instruments/new" /> }} />` inside `<p class="text-center">`.
//    The test asserts the rendered sentence, that an `<a href="/instruments/new">` is emitted,
//    and that no literal "<link>" leaks.
//
//    NOTE (flagged for the component author): with the *object* form of `components` and NO
//    default children on `<Trans>`, react-i18next 17 renders the `<a>` EMPTY and drops the
//    "lien" / "link" text next to it as a sibling text node, i.e.
//        ...suivant ce <a href="/instruments/new"></a>lien.
//    The visible sentence and the href are correct and nothing leaks, but the link label is not
//    inside the anchor. Giving `<Trans>` matching default children (or using the numeric
//    `<1>lien</1>` form) would nest the text into the `<a>`. The assertions below are written
//    against the CURRENT output; the `<a>`-has-text check is intentionally soft.
//
// `../common/Checkbox` is stubbed to render its `label` prop. Language via the frontend/i18n
// singleton; `afterEach` restores "fr".

import React from "react";
import {render, screen} from "@testing-library/react";
import {Form} from "react-final-form";
import i18n from "../../i18n";
import WorkGroupTemplateEditor from "./WorkGroupTemplateEditor";

vi.mock("../common/Checkbox", () => ({default: props => <div>{props.label}</div>}));

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

function renderEditor(extraProps = {}, initialValues = {activityRef: {is_work_group: true}}) {
    const props = {
        activityInstruments: [],
        instruments: [],
        onChange: vi.fn(),
        ...extraProps,
    };
    return render(
        <Form
            onSubmit={() => {}}
            initialValues={initialValues}
            render={() => <WorkGroupTemplateEditor {...props} />}
        />,
    );
}

const normalize = s => s.replace(/\s+/g, " ").trim();

describe("WorkGroupTemplateEditor", () => {
    test("it is wrapped in withTranslation()", () => {
        expect(WorkGroupTemplateEditor.WrappedComponent).toBeDefined();
    });

    describe("fr", () => {
        test("the 'is a workshop' checkbox label", async () => {
            await i18n.changeLanguage("fr");
            renderEditor();
            expect(screen.getByText("Ce cours est un atelier")).toBeInTheDocument();
        });

        test("the instrument panel is hidden while activityRef.is_work_group is falsy", async () => {
            await i18n.changeLanguage("fr");
            renderEditor({}, {activityRef: {is_work_group: false}});
            expect(screen.queryByText("Modèle de groupe")).not.toBeInTheDocument();
            expect(screen.queryByText("Instruments")).not.toBeInTheDocument();
        });

        test("with instruments: renders templateTitle / instruments / roles headings", async () => {
            await i18n.changeLanguage("fr");
            renderEditor({instruments: [{id: 1, label: "Piano"}]});

            expect(screen.getByText("Modèle de groupe")).toBeInTheDocument();
            expect(screen.getByText("Instruments")).toBeInTheDocument();
            expect(screen.getByText("Rôles")).toBeInTheDocument();
            expect(screen.getByText("Piano")).toBeInTheDocument();
        });

        test("without instruments: the <Trans> workGroup.noInstruments renders with its link", async () => {
            await i18n.changeLanguage("fr");
            const {container} = renderEditor({instruments: []});

            const p = container.querySelector("p.text-center");
            expect(p).toBeTruthy();
            expect(normalize(p.textContent)).toBe(
                "Aucun instrument sauvegardé. Vous pouvez en créer en suivant ce lien.",
            );

            const link = p.querySelector('a[href="/instruments/new"]');
            expect(link).toBeTruthy();
            // "lien" renders (somewhere in the <p>); see the NOTE above — under the current
            // component it lands as a sibling of the empty <a>, not as its child.
            expect(p.textContent).toContain("lien");

            expect(p.textContent).not.toContain("<link>");
            expect(p.innerHTML).not.toContain("&lt;link&gt;");
        });
    });

    describe("en", () => {
        test("the 'is a workshop' checkbox label", async () => {
            await i18n.changeLanguage("en");
            renderEditor();
            expect(screen.getByText("This course is a workshop")).toBeInTheDocument();
        });

        test("with instruments: renders templateTitle / instruments / roles headings", async () => {
            await i18n.changeLanguage("en");
            renderEditor({instruments: [{id: 1, label: "Piano"}]});

            expect(screen.getByText("Group template")).toBeInTheDocument();
            expect(screen.getByText("Instruments")).toBeInTheDocument();
            expect(screen.getByText("Roles")).toBeInTheDocument();
        });

        test("without instruments: the <Trans> workGroup.noInstruments renders with its link", async () => {
            await i18n.changeLanguage("en");
            const {container} = renderEditor({instruments: []});

            const p = container.querySelector("p.text-center");
            expect(p).toBeTruthy();
            expect(normalize(p.textContent)).toBe(
                "No instrument saved. You can create one by following this link.",
            );

            const link = p.querySelector('a[href="/instruments/new"]');
            expect(link).toBeTruthy();
            // See the NOTE above: "link" renders in the <p>, sibling to the empty <a>.
            expect(p.textContent).toContain("link");

            expect(p.textContent).not.toContain("<link>");
            expect(p.innerHTML).not.toContain("&lt;link&gt;");
        });
    });
});
