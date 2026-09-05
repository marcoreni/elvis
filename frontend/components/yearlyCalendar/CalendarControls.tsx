import React from "react";

interface CalendarControlsProps {
    year: number;
    onPrevYear?: () => void;
    onNextYear?: () => void;
    goToToday?: () => void;
    showTodayButton?: boolean;
}

const CalendarControls: React.FC<CalendarControlsProps> = ({
    year,
    showTodayButton = false,
    goToToday,
    onPrevYear,
    onNextYear,
}) => {
    const todayButton = showTodayButton ? (
        <div className="control today" onClick={() => goToToday?.()}>
            Today
        </div>
    ) : null;

    return (
        <div className="calendar-controls">
            <div className="control" onClick={() => onPrevYear?.()}>
                &laquo;
            </div>
            <div className="current-year">{year}</div>
            <div className="control" onClick={() => onNextYear?.()}>
                &raquo;
            </div>
            {todayButton}
        </div>
    );
};

export default CalendarControls;
