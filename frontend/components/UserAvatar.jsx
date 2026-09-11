import React from "react";
import { useTranslation } from "react-i18next";

export default function UserAvatar({ user, size }) {
    const { t } = useTranslation("common");
    const userFullName = user.full_name
        ? user.full_name
        : `${user.first_name} ${user.last_name}`;
    const userInitials = userFullName
        .split(" ")
        .map(name => name[0])
        .join("");
    return user.avatar ? (
        <img
            src={user.avatar}
            alt={t("common:userAvatar.alt")}
            style={{
                borderRadius: "50%",
                width: `${size}px`,
                height: `${size}px`,
                margin: "10px 10px 10px 0",
                objectFit: "cover",
            }}
        />
    ) : (
        <div
            style={{
                backgroundColor: "#fac5c7",
                borderRadius: "50%",
                width: `${size}px`,
                height: `${size}px`,
                margin: "10px 10px 10px 0",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "#FF6066",
                fontWeight: "bold",
                fontSize: "26px",
                objectFit: "cover",
            }}
        >
            {userInitials}
        </div>
    );
}
