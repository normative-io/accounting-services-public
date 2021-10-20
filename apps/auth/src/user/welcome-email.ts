// Copyright 2022 Meta Mind AB
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { IUser } from '@normative/utils';

const FRIENDLY_NAME = 'Normative';
const LOGO_URL = 'https://s3.eu-central-1.amazonaws.com/normative.io/assets/images/favicon/apple-icon-57x57.png';

export function getWelcomeEmail(
  user: IUser,
  applicationName = 'Normative',
  locale = 'en',
  supportEmail = 'support@normative.io',
  callbackSite = 'https://businesscarboncalculator.normative.io',
) {
  let localeContent = getEnEmail(user, applicationName, supportEmail, callbackSite);
  if (locale === 'sv') {
    localeContent = getSvEmail(user, applicationName, supportEmail, callbackSite);
  } else if (locale === 'de') {
    localeContent = getDeEmail(user, applicationName, supportEmail, callbackSite);
  }

  const email = `
  <html>
  <head>
    <style type="text/css">
      .ExternalClass,
      .ExternalClass div,
      .ExternalClass font,
      .ExternalClass p,
      .ExternalClass span,
      .ExternalClass td,
      img {
        line-height: 100%;
      }
      #outlook a {
        padding: 0;
      }
      .ExternalClass,
      .ReadMsgBody {
        width: 100%;
      }
      a,
      blockquote,
      body,
      li,
      p,
      table,
      td {
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
      }
      table,
      td {
        mso-table-lspace: 0;
        mso-table-rspace: 0;
      }
      img {
        -ms-interpolation-mode: bicubic;
        border: 0;
        height: auto;
        outline: 0;
        text-decoration: none;
      }
      table {
        border-collapse: collapse !important;
      }
      #bodyCell,
      #bodyTable,
      body {
        height: 100% !important;
        margin: 0;
        padding: 0;
        font-family: ProximaNova, sans-serif;
      }
      #bodyCell {
        padding: 20px;
      }
      #bodyTable {
        width: 600px;
      }
      @font-face {
        font-family: ProximaNova;
        src: url(https://cdn.auth0.com/fonts/proxima-nova/proximanova-regular-webfont-webfont.eot);
        src: url(https://cdn.auth0.com/fonts/proxima-nova/proximanova-regular-webfont-webfont.eot?#iefix)
            format('embedded-opentype'),
          url(https://cdn.auth0.com/fonts/proxima-nova/proximanova-regular-webfont-webfont.woff)
            format('woff');
        font-weight: 400;
        font-style: normal;
      }
      @font-face {
        font-family: ProximaNova;
        src: url(https://cdn.auth0.com/fonts/proxima-nova/proximanova-semibold-webfont-webfont.eot);
        src: url(https://cdn.auth0.com/fonts/proxima-nova/proximanova-semibold-webfont-webfont.eot?#iefix)
            format('embedded-opentype'),
          url(https://cdn.auth0.com/fonts/proxima-nova/proximanova-semibold-webfont-webfont.woff)
            format('woff');
        font-weight: 600;
        font-style: normal;
      }
      @media only screen and (max-width: 480px) {
        #bodyTable,
        body {
          width: 100% !important;
        }
        a,
        blockquote,
        body,
        li,
        p,
        table,
        td {
          -webkit-text-size-adjust: none !important;
        }
        body {
          min-width: 100% !important;
        }
        #bodyTable {
          max-width: 600px !important;
        }
        #signIn {
          max-width: 280px !important;
        }
      }
    </style>
  </head>
  <body>
    <center>
      <table
        style='width: 600px;-webkit-text-size-adjust: 100%;-ms-text-size-adjust: 100%;mso-table-lspace: 0pt;mso-table-rspace: 0pt;margin: 0;padding: 0;font-family: "ProximaNova", sans-serif;border-collapse: collapse !important;height: 100% !important;'
        align="center"
        border="0"
        cellpadding="0"
        cellspacing="0"
        height="100%"
        width="100%"
        id="bodyTable"
      >
        <tr>
          <td
            align="center"
            valign="top"
            id="bodyCell"
            style='-webkit-text-size-adjust: 100%;-ms-text-size-adjust: 100%;mso-table-lspace: 0pt;mso-table-rspace: 0pt;margin: 0;padding: 20px;font-family: "ProximaNova", sans-serif;height: 100% !important;'
          >
            <div class="main">
              <p
                style="text-align: center;-webkit-text-size-adjust: 100%;-ms-text-size-adjust: 100%; margin-bottom: 30px;"
              >
                <img
                  src="${LOGO_URL}"
                  width="50"
                  alt="Normative"
                  style="-ms-interpolation-mode: bicubic;border: 0;height: auto;line-height: 100%;outline: none;text-decoration: none;"
                />
              </p>
              ${localeContent}
            </div>
          </td>
        </tr>
      </table>
    </center>
  </body>
</html>

  `;

  return email;
}

function getSvEmail(user: IUser, applicationName = 'Normative', supportEmail: string, callbackSite: string) {
  return `
  <h1>Välkommen till ${applicationName}!</h1>
  <p>
    Om du har några problem med ditt konto, tveka inte att kontakta
    oss på ${supportEmail}.

    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%;border-collapse: collapse">
    <tr>
        <td style="padding-top: 0;padding-bottom: 0px;" valign="top" align="center">
            <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate!important;background-color: #000">
                <tbody>
                    <tr>
                        <td align="center" valign="middle" style="font-size: 14px;padding-top: 13px;padding-right: 18px;padding-bottom: 13px;padding-left: 18px">
                          <a style="display: block;color: #fff;display: inline-block;font-size: 14px;line-height: 1;text-decoration: none" href="${callbackSite}">
                            Logga in
                          </a>
                        </td>
                    </tr>
                </tbody>
            </table>
        </td>
    </tr>
</table>
  </p>
  <br />
  Tack!
  <br />
  <strong>${FRIENDLY_NAME}</strong>
  <br /><br />
  <hr
    style="border: 2px solid #EAEEF3; border-bottom: 0; margin: 20px 0;"
  />
  <p
    style="text-align: center;color: #A9B3BC;-webkit-text-size-adjust: 100%;-ms-text-size-adjust: 100%;"
  >
    Om du inte gjorde denna förfrågan, kontakta oss på
    ${supportEmail}.
  </p>`;
}

function getEnEmail(user: IUser, applicationName = 'Normative', supportEmail: string, callbackSite: string) {
  return `
  <h1>Welcome to ${applicationName}!</h1>
              <p>
								If you have any problems with your account, please do not hesitate to contact us at ${supportEmail}
								<table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%;border-collapse: collapse">
                  <tr>
                      <td style="padding-top: 0;padding-bottom: 0px;" valign="top" align="center">
                          <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate!important;background-color: #000">
                              <tbody>
                                  <tr>
                                      <td align="center" valign="middle" style="font-size: 14px;padding-top: 13px;padding-right: 18px;padding-bottom: 13px;padding-left: 18px">
                                        <a style="display: block;color: #fff;display: inline-block;font-size: 14px;line-height: 1;text-decoration: none" href="${callbackSite}">
                                          Log in
                                        </a>
                                      </td>
                                  </tr>
                              </tbody>
                          </table>
                      </td>
                  </tr>
              </table>

              </p>
              <br />
              Thanks!
              <br />
              <strong>${FRIENDLY_NAME}</strong>
              <br /><br />
              <hr
                style="border: 2px solid #EAEEF3; border-bottom: 0; margin: 20px 0;"
              />
              <p
                style="text-align: center;color: #A9B3BC;-webkit-text-size-adjust: 100%;-ms-text-size-adjust: 100%;"
              >
                If you did not make this request, please contact us at
                ${supportEmail}.
              </p>
  `;
}

function getDeEmail(user: IUser, applicationName = 'Normative', supportEmail: string, callbackSite: string) {
  return `
  <h1>Willkommen bei ${applicationName}!</h1>
  <p>
    Wenn Sie Probleme mit Ihrem Konto haben, zögern Sie bitte nicht,
    uns unter ${supportEmail} oder über den Chat innerhalb der
    Plattform zu kontaktieren.
  </p>
  <br />
  Vielen Dank!
  <br />
  <strong>${FRIENDLY_NAME}</strong>
  <br /><br />
  <hr
    style="border: 2px solid #EAEEF3; border-bottom: 0; margin: 20px 0;"
  />
  <p
    style="text-align: center;color: #A9B3BC;-webkit-text-size-adjust: 100%;-ms-text-size-adjust: 100%;"
  >
    Wenn Sie diese Anfrage nicht gestellt haben, kontaktieren Sie
    uns bitte unter ${supportEmail}.
  </p>`;
}
