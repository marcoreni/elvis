import React from "react";
import { withTranslation } from "react-i18next";
import { csrfToken } from "./utils";
import swal from "sweetalert2";

// Column headers + role values ("administrateur"/"professeur") are a data contract with the
// Rails CSV importer (app/services), which matches on these exact strings — deliberately NOT
// translated.
const CSV_TEMPLATE_ROWS = [
    [
        "Prenom",
        "Nom",
        "Date de naissance",
        "Email",
        "Adresse",
        "Code postal",
        "Ville",
        "Telephone",
        "Role",
    ],
    [
        "John",
        "Doe",
        "25/04/1964",
        "john.doe@gmail.com",
        "18 rue des navets",
        "76600",
        "Le Havre",
        "0625334455",
        "administrateur",
    ],
    [
        "Jane",
        "Doe",
        "25/04/1969",
        "jane.doe@gmail.com",
        "18 rue des navets",
        "76600",
        "Le Havre",
        "0622334455",
        "professeur",
    ],
    [
        "Jack",
        "Doe",
        "25/04/1999",
        "jack.doe@gmail.com",
        "18 rue des navets",
        "76600",
        "Le Havre",
        "0626336455",
        "",
    ],
];

// separator=";" preserved; \uFEFF BOM so Excel handles accents correctly
const CSV_TEMPLATE_URI =
    "data:text/csv;charset=utf-8,\uFEFF" +
    encodeURIComponent(
        CSV_TEMPLATE_ROWS.map(row => row.join(";")).join("\r\n")
    );

class ImportCsv extends React.Component {
    constructor(props) {
        super(props);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.state = { import_report: null };
    }

    handleSubmit(event) {
        const { t } = this.props;

        if (event.target.csv_file && event.target.csv_file.files.length > 0) {
            this.setState({ submitting: true });
            event.preventDefault();

            var formData = new FormData();
            formData.append("csv_file", event.target.csv_file.files[0]);

            fetch(`/import_users?auth_token=${csrfToken}`, {
                method: "POST",
                headers: {
                    "X-CSRF-Token": csrfToken,
                },
                body: formData,
            })
                .then(res => {
                    this.setState({ submitting: false });

                    if (res.ok) {
                        res.json().then(json => {
                            const import_report = json.import_report;
                            console.log(import_report);
                            if (Object.keys(import_report.errors).length > 0) {
                                this.setState({
                                    import_report: json.import_report,
                                });
                            } else {
                                swal({
                                    title: t("users:importCsv.successTitle"),
                                    html: t("users:importCsv.successBody"),
                                    type: "success",
                                    timer: 10000,
                                    allowOutsideClick: false,
                                }).then(
                                    () =>
                                        (window.location.href = `/users?auth_token=${csrfToken}`)
                                );
                            }
                        });
                    }
                })
                .catch(error => {
                    this.setState({ submitting: false });
                    console.error(error);
                    swal({
                        title: t("users:importCsv.errorTitle"),
                        html: t("users:importCsv.errorBody"),
                        type: "error",
                        timer: 10000,
                    });
                });
        }
    }

    formatData(report) {
        let format = [];
        if (report) {
            Object.keys(report).map(key =>
                format.push({
                    type: key,
                    message: report[key]["message"],
                    lines: this.organizeLines(report[key]["lines"]),
                })
            );
        }

        return format;
    }

    organizeLines(lines) {
        let organized = "";

        for (let i = 0; i < lines.length; i++) {
            organized += lines[i];
            if (i != lines.length - 1) organized += ", ";
        }

        return organized;
    }

    display_row_numbers(lines) {
        const { t } = this.props;

        switch (lines.length) {
            case 0:
                return "";
            case 1:
                return t("users:importCsv.rowNumberSingle", { lines });
            default:
                return t("users:importCsv.rowNumberMultiple", { lines });
        }
    }

    render() {
        const { t } = this.props;
        const import_report = this.state.import_report;

        const data =
            import_report && import_report.errors != null
                ? this.formatData(import_report.errors)
                : [];

        const { submitting } = this.state;

        return (
            <div className="row p-w-xl">
                <div className="row m-b-md">
                    <h4>{t("users:importCsv.stepsIntro")}</h4>
                </div>
                <div className="row m-b-md">
                    <h3>
                        <span
                            className="text-white bg-primary text-center b-r-md m-r-sm"
                            style={{ padding: "3px 8px" }}
                        >
                            1
                        </span>
                        {t("users:importCsv.step1Title")}
                    </h3>
                    <br />
                    <p className="m-b-md">{t("users:importCsv.step1Body")}</p>

                    <a
                        className="btn btn-primary m-b-md"
                        href={CSV_TEMPLATE_URI}
                        download="import_users.csv"
                    >
                        <i className="fas fa-download"></i>{" "}
                        {t("users:importCsv.downloadTemplate")}
                    </a>
                </div>
                <div className="row m-b-md">
                    <h3>
                        <span
                            className="text-white bg-primary text-center b-r-md m-r-sm"
                            style={{ padding: "3px 8px" }}
                        >
                            2
                        </span>
                        {t("users:importCsv.step2Title")}
                    </h3>
                    <br />
                    <p>
                        {t("users:importCsv.step2IntroPrefix")}
                        <span className="font-bold">
                            {t("users:importCsv.step2GoldRule")}
                        </span>
                    </p>
                    <p>
                        {t("users:importCsv.step2RequiredPrefix")}
                        <span className="font-bold">
                            {t("users:importCsv.step2RequiredFields")}
                        </span>
                    </p>
                    <p>{t("users:importCsv.step2Roles")}</p>
                </div>
                <div className="row m-b-md">
                    <h3>
                        <span
                            className="text-white bg-primary text-center b-r-md m-r-sm"
                            style={{ padding: "3px 8px" }}
                        >
                            3
                        </span>
                        {t("users:importCsv.step3Title")}
                    </h3>
                    <br />
                    <p>{t("users:importCsv.step3Body")}</p>

                    <form
                        encType="multipart/form-data"
                        action="/import_users"
                        acceptCharset="UTF-8"
                        data-remote="true"
                        method="post"
                        onSubmit={this.handleSubmit}
                    >
                        <div
                            className="col-lg-5 fileinput fileinput-new input-group m-b-md"
                            data-provides="fileinput"
                        >
                            <div
                                className="form-control"
                                data-trigger="fileinput"
                            >
                                <i className="glyphicon glyphicon-file fileinput-exists"></i>
                                <span className="fileinput-filename"></span>
                            </div>
                            <span className="input-group-addon btn btn-default btn-file">
                                <span className="fileinput-new">
                                    {t("users:importCsv.chooseFile")}
                                </span>
                                <span className="fileinput-exists">
                                    {t("users:importCsv.change")}
                                </span>
                                <input
                                    accept="text/csv"
                                    type="file"
                                    name="csv_file"
                                />
                            </span>
                            <a
                                href="#"
                                className="input-group-addon btn btn-default fileinput-exists"
                                data-dismiss="fileinput"
                            >
                                {t("users:importCsv.remove")}
                            </a>
                        </div>
                        <input
                            type="hidden"
                            name="authenticity_token"
                            value={csrfToken}
                        />

                        <div className="form-group">
                            <button
                                className="btn btn-primary btn-md"
                                disabled={submitting}
                            >
                                <i className="fas fa-upload"></i>{" "}
                                {t("users:importCsv.import")}
                                &nbsp;
                                {submitting && (
                                    <i className="fas fa-circle-notch fa-spin" />
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {import_report && import_report.lines_imported > 0 && (
                    <div className="row">
                        <div className="alert alert-success">
                            <p>
                                {t("users:importCsv.importedAlert", {
                                    count: import_report.lines_imported,
                                })}
                            </p>
                        </div>
                    </div>
                )}

                {import_report && import_report.errors && (
                    <div className="row">
                        <div className="alert alert-danger">
                            <h4>{t("users:importCsv.warning")}</h4>
                            {data.map(row => {
                                return (
                                    <p key={row.lines}>
                                        {`${this.display_row_numbers(
                                            row.lines
                                        )}${row.message}`}
                                        .
                                    </p>
                                );
                            })}
                            <hr />
                            <p>{t("users:importCsv.fixAndRetry")}</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }
}

export default withTranslation("users")(ImportCsv);
