import React from "react";
import { MESSAGES } from "../../tools/constants";
import { InputMask } from "@react-input/mask";

// @react-input/mask has no built-in placeholder token: any mask character
// not listed here is treated as a literal, and any TYPED character that
// matches one of these keys is swallowed as a reserved token rather than
// treated as literal input. So these keys must be characters that can never
// appear in real data -- digits/letters are NOT safe choices (e.g. a key of
// "9" would eat every literal "9" the user types). "#"/"@"/"~" can't appear
// in any mask's actual input, so they're always safe replacement tokens.
const MASK_REPLACEMENT = {
    "#": /\d/,
    "@": /[A-Za-z]/,
    "~": /[A-Za-z0-9]/,
};

const Input = (props) => {
    const {
        label,
        input,
        htmlOptions,
        meta,
        required,
        maxLength,
        help,
        tooltip,
        disabled,
        isArea,
        placeholder,
        mask,
    } = props;

    const hasError = meta.error && meta.touched;

    function renderInput() {
        if (isArea) {
            return (
                <textarea
                    className="form-control"
                    style={{
                        minHeight: "100px",
                        borderRadius: "8px",
                        resize: "vertical",
                    }}
                    {...input}
                    {...htmlOptions}
                    maxLength={maxLength}
                    disabled={disabled}
                    placeholder={placeholder}
                />
            );
        } else if (mask) {
            return (
                <InputMask
                    className="form-control"
                    {...input}
                    {...htmlOptions}
                    mask={mask}
                    replacement={MASK_REPLACEMENT}
                    maxLength={maxLength}
                    disabled={disabled}
                    placeholder={placeholder}
                />
            );
        } else {
            return (
                <input
                    className="form-control"
                    style={{ borderRadius: "8px", color: "#00283B" }}
                    {...input}
                    {...htmlOptions}
                    maxLength={maxLength}
                    disabled={disabled}
                    placeholder={placeholder}
                />
            );
        }
    }

    return (
        <div className={`form-group ${hasError ? "has-error" : ""}`}>
            {label && (
                <label
                    htmlFor={name}
                    className="small"
                    style={{ color: "#003E5C" }}
                >
                    {label}
                    {required && <span className="text-danger">{" *"}</span>}
                </label>
            )}
            {tooltip
                ? tooltip && (
                      <div className="input-group">
                          <div className="input-group-addon">
                              <i
                                  className="fa fa-exclamation-circle"
                                  data-tippy-content={tooltip}
                              ></i>
                          </div>
                          {renderInput()}
                      </div>
                  )
                : renderInput()}

            {help && !hasError ? <p className="help-block">{help}</p> : ""}
            {hasError ? (
                <p className="help-block">
                    {MESSAGES[meta.error] || meta.error}
                </p>
            ) : (
                ""
            )}
        </div>
    );
};

export default Input;
