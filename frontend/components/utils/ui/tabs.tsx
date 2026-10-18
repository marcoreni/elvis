import React, { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export interface Tab {
    id: string;
    header: React.ReactNode;
    active?: boolean;
    headerHandler?: React.MouseEventHandler<HTMLLIElement>;
    headerStyle?: React.CSSProperties;
    isInError?: boolean;
    // `any` here (rather than `unknown`, @types/react 19's default) is deliberate: `body` is
    // polymorphic across every real tab (a different component each time), and TabbedComponent
    // clones it with an extra `setTabError` prop below -- there's no single real prop shape to
    // name, so this is the same kind of permissive library-boundary typing React's own
    // `cloneElement` overloads expect for that pattern.
    body: React.ReactElement<any>;
}

interface TabbedComponentProps {
    tabs: Tab[];
    mode?: "classic" | "buttons";
    defaultActiveTab?: number;
}

export default function TabbedComponent({
    tabs: tabsProps,
    mode: modeProps,
    defaultActiveTab = 0,
}: TabbedComponentProps) {
    const { t } = useTranslation("common");
    const tabs = tabsProps.filter((tab) => tab != undefined);

    const [active, setActive] = useState(defaultActiveTab);

    const tmp = tabs.reduce<Record<string, boolean>>(
        (acc, tab) => ({ ...acc, [tab.id]: false }),
        {}
    );

    const [tabErrorState, setTabErrorState] = useState(tmp);

    const propsActivated = tabs.findIndex((tab) => tab.active);

    useEffect(() => {
        if (propsActivated !== -1) setActive(propsActivated);
    }, [propsActivated]);

    const handleTabClick = (idx: number) => {
        setActive(idx);
    };

    const mode = modeProps || "classic";

    return (
        <Fragment>
            <div className={`${mode === "classic" ? "tabs-container" : ""}`}>
                <ul
                    className={`flex ${mode === "classic" ? "nav nav-tabs" : "bg-light-blue flex no-padding"}`}
                    role="tablist"
                >
                    {tabs.map((tab, i) => (
                        <li
                            key={i}
                            style={{ height: "auto" }}
                            className={`${mode === "classic" ? "" : "btn btn-primary btn_slider"} ${active === i ? "active" : ""}`}
                            onClick={tab.headerHandler || (() => {})}
                            {...(tabErrorState[tab.id] || tab.isInError
                                ? { title: t("tabs.incomplete") }
                                : {})}
                        >
                            <a
                                className={`${mode === "classic" ? "nav-link " : "text-"} ${active === i ? "active" : ""}`}
                                data-toggle={!tab.headerHandler && "tab"}
                                onClick={() => handleTabClick(i)}
                                style={{
                                    ...(tab.headerStyle || {}),
                                }}
                                href={`#${tab.id}`}
                            >
                                {tab.header}{" "}
                                {tabErrorState[tab.id] || tab.isInError ? (
                                    <i className="fa fa-exclamation-circle text-danger" />
                                ) : (
                                    <i className=" fa fa-check-circle text-success" />
                                )}
                            </a>
                        </li>
                    ))}
                </ul>
                <div className="tab-content">
                    {tabs.map((tab, i) => (
                        <div
                            key={i}
                            id={tab.id}
                            className={`tab-pane ${active === i ? "active" : ""}`}
                            role="tabpanel"
                        >
                            <div
                                className={`panel-body ${mode === "classic" ? "" : "no-padding"}`}
                            >
                                {active === i &&
                                    (typeof tab.body.type === "function"
                                        ? React.cloneElement(tab.body, {
                                              setTabError: (isError: boolean) =>
                                                  setTabErrorState(
                                                      (tabErrorState) => ({
                                                          ...tabErrorState,
                                                          [tab.id]: isError,
                                                      })
                                                  ),
                                          })
                                        : tab.body)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Fragment>
    );
}
