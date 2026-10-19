import React, { useEffect, useRef, useState } from "react";

interface BaseParametersProps {
    // Every real caller supplies both (`this.state.tabsNames.length`/`.map()` below crash
    // otherwise) -- the old `PropTypes.array` (no `.isRequired`) undersold that.
    tabsNames: string[];
    divObjects: React.ReactNode[];
}

/**
 * Renders a tabbed chrome around `divObjects`, each paired with a label from `tabsNames`.
 * Pass `tabsNames`/`divObjects` as props (no longer `extends`able now that this is a function
 * component -- see docs/KnownIssues.md's "propTypes declarations are dead weight" entry).
 */
export default function BaseParameters({
    tabsNames,
    divObjects: divObjectsProp,
}: BaseParametersProps) {
    const [activeTab, setActiveTab] = useState(-1);
    // The class only had `componentDidUpdate` as a way to notice `props.divObjects` changing, so
    // it mirrored it into state. A function component can just read the prop fresh every render
    // instead -- behaviorally identical, one fewer render per prop change, no stale-frame window.
    // (Still deliberately asymmetric with `tabsNamesRef` below -- see docs/KnownIssues.md's
    // "Translated UI frozen at construct/mount time" entry.)
    const divObjects = divObjectsProp;

    // tabsNames was only ever read from props in the constructor, never re-synced on prop
    // changes (componentDidUpdate only reacted to divObjects) -- a `useRef` initializer
    // preserves that "computed once" semantics; a `useMemo` would re-run on every tabsNames
    // identity change, which is not what the class did.
    const tabsNamesRef = useRef(tabsNames);

    // not in state because it's not a react variable && it's not a variable that we want to
    // manually update
    const showedTabsRef = useRef<number[]>([]);

    useEffect(() => {
        for (let i = 0; i < tabsNamesRef.current.length; i++) {
            if (location.hash.includes("#tab-" + i)) {
                setActiveTab(i);
                return;
            }
        }

        setActiveTab(0);
        // componentDidMount-only: deliberately not re-run on tabsNames changes (see tabsNamesRef).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (activeTab !== -1) {
            window.location.href = "#tab-" + activeTab;
        }
    }, [activeTab]);

    const jumpto = (index: number) => setActiveTab(index);

    return (
        <React.Fragment>
            <div className="tabs-container">
                <ul className="nav nav-tabs flex" role="tablist">
                    {tabsNamesRef.current.map((tabName, i) => {
                        return (
                            <li
                                id={"tab-" + i}
                                key={"li-" + i}
                                style={{ height: "auto" }}
                                className={activeTab === i ? "active" : ""}
                            >
                                <a
                                    key={"a-" + i}
                                    data-toggle="tab"
                                    href={"#tab-" + i}
                                    className={
                                        "nav-link " +
                                        (activeTab === i ? "active show" : "")
                                    }
                                    aria-expanded={
                                        activeTab === i ? "true" : "false"
                                    }
                                    onClick={() => jumpto(i)}
                                >
                                    {tabName}
                                </a>
                            </li>
                        );
                    })}
                </ul>

                {/* Content */}
                <div className="tab-content">
                    {divObjects.map((divObj, i) => {
                        if (
                            !showedTabsRef.current.includes(i) &&
                            activeTab === i
                        ) {
                            showedTabsRef.current.push(i);
                        }

                        return (
                            <div
                                key={"div-" + i}
                                className={
                                    "tab-pane " +
                                    (activeTab === i ? "active" : "")
                                }
                            >
                                <div className="panel-body">
                                    {activeTab === i ||
                                    showedTabsRef.current.includes(i)
                                        ? divObj
                                        : ""}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </React.Fragment>
    );
}
