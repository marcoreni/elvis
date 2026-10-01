import React from "react";
import { ToastContainer, toast } from "react-toastify";

class Toaster extends React.Component {
    render() {
        // closeOnClick/theme/icon pin the pre-v10/v8 react-toastify defaults so
        // upgrading the library doesn't change existing toast look/behavior.
        return (
            <ToastContainer
                className="toast-container"
                autoClose={false}
                draggable={false}
                closeOnClick
                theme="colored"
                icon={false}
            />
        );
    }
}

export default Toaster;
