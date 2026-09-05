import type React from "react";
import type { Moment } from "moment";

interface DayProps {
    classes?: string;
    dayClicked: (day: Moment | null) => void;
    dayHovered: (day: Moment | null) => void;
    day?: Moment | null;
}

const Day: React.FC<DayProps> = ({
    classes = "",
    dayClicked,
    dayHovered,
    day = null,
}) => {
    const onClick = () => dayClicked(day);
    const onHover = () => dayHovered(day);

    return (
        <td onClick={onClick} onMouseEnter={onHover} className={classes}>
            <span className="day-number">{day === null ? "" : day.date()}</span>
        </td>
    );
};

export default Day;
