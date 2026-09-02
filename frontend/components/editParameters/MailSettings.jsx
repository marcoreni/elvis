import React, {useState} from 'react';
import {useForm} from "react-hook-form";
import {csrfToken} from "../utils";
import swal from "sweetalert2";
import {useTranslation} from "react-i18next";

export default function MailSettings(props) {
    const {t} = useTranslation("parameters");
    const {register, formState: {errors}, handleSubmit} = useForm();

    function onSubmit(data) {
        fetch('/parameters/mails', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-CSRF-TOKEN': csrfToken,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                mail_settings: {
                    from: data.from,
                    address: data.address,
                    authentication: data.authentication,
                    domain: data.domain,
                    password: data.password,
                    port: data.port,
                    redirect: data.redirect.split('\n'),
                    ssl_tls: data.sslTls,
                    user_name: data.user_name,
                }
            })
        }).then(response => {
            if (response.ok) {
                swal({
                    title: t("editParameters.mail.saveSuccessTitle"),
                    text: t("editParameters.settingsApplied"),
                    icon: 'success'
                });
            } else {
                swal({
                    title: t("editParameters.mail.errorTitle"),
                    text: t("editParameters.mail.genericError"),
                    icon: 'error'
                });
            }
        });
    }

    return <form onSubmit={handleSubmit(onSubmit)}>
        <div className="col-md-6 col-xs-12">
            <div>
                <label>{t("editParameters.mail.smtpAddressLabel")}</label>
                <input className="form-control" type="text" {...register("address", {required: true})}
                       defaultValue={props.mail_settings.address}/>
                <p className="text-danger">{errors.address && t("editParameters.mail.smtpAddressRequired")}</p>
            </div>

            <div>
                <label>{t("editParameters.mail.smtpPortLabel")}</label>
                <input className="form-control" type="number" {...register("port", {required: true})}
                       defaultValue={props.mail_settings.port}/>
                <p className="text-danger">{errors.port && t("editParameters.mail.portRequired")}</p>
            </div>

            <div>
                <label>{t("editParameters.mail.domainLabel")}</label>
                <input className="form-control" type="text" {...register("domain", {required: false})}
                       defaultValue={props.mail_settings.domain}/>
            </div>


            <div className="mt-2 mb-2">
                <label>{t("editParameters.mail.sslTlsLabel")}</label><br/>
                <input className="m-2" type="checkbox" {...register("sslTls", {})}
                       defaultChecked={props.mail_settings.sslTls}/>

            </div>

            <div>
                <label>{t("editParameters.mail.authLabel")}</label>
                <select className="form-control" type="select" {...register("authentication", {required: true})}
                        defaultValue={props.mail_settings.authentication}>
                    <option value="login">login</option>
                    <option value="plain">plain</option>
                </select>
                <p className="text-danger">{errors.authentication && t("editParameters.mail.authRequired")}</p>
            </div>

            <div>
                <label>{t("editParameters.mail.usernameLabel")}</label>
                <input className="form-control" type="text" {...register("user_name", {required: true})}
                       defaultValue={props.mail_settings.user_name}/>
                <p className="text-danger">{errors.user_name && t("editParameters.mail.usernameRequired")}</p>
            </div>

            <div>
                <label>{t("editParameters.mail.passwordLabel")}</label>
                <input className="form-control"
                       type="password" {...register("password", {required: props.mail_settings.password == ""})} />
                <p className="text-danger">{errors.password && t("editParameters.mail.passwordRequired")}</p>
            </div>

            <div>
                <label>{t("editParameters.mail.redirectLabel")}</label>
                <textarea className="form-control" {...register("redirect")}>
                    {(props.mail_settings.redirect || []).join('\n')}
                </textarea>
                <p>{t("editParameters.mail.redirectHint")}</p>
            </div>

            <div>
                <label>{t("editParameters.mail.fromLabel")}</label>
                <input type="email" className="form-control" {...register("from", {required: true})}
                       defaultValue={props.mail_settings.from}/>
            </div>

            <div className="text-right mt-5">
                <input type="submit" value={t("common:actions.save")} className="btn btn-primary"/>
            </div>
        </div>

    </form>
}