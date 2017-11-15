export default function(name, datetime, ip) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8"> <!-- utf-8 works for most cases -->
    <meta name="viewport" content="width=device-width"> <!-- Forcing initial-scale shouldn't be necessary -->
    <meta http-equiv="X-UA-Compatible" content="IE=edge"> <!-- Use the latest (edge) version of IE rendering engine -->
    <meta name="x-apple-disable-message-reformatting">  <!-- Disable auto-scale in iOS 10 Mail entirely -->
    <title></title> <!-- The title tag shows in email notifications, like Android 4.4. -->

    <!-- CSS Reset : BEGIN -->
    <style>

        /* What it does: Remove spaces around the email design added by some email clients. */
        /* Beware: It can remove the padding / margin and add a background color to the compose a reply window. */
        html,
        body {
            margin: 0 auto !important;
            padding: 0 0 !important;
            height: 100% !important;
            width: 100% !important;
        }

        /* What it does: Stops email clients resizing small text. */
        * {
            -ms-text-size-adjust: 100%;
            -webkit-text-size-adjust: 100%;
        }

        /* What it does: Centers email on Android 4.4 */
        div[style*="margin: 16px 0"] {
            margin: 0 !important;
        }

        /* What it does: Stops Outlook from adding extra spacing to tables. */
        table,
        td {
            mso-table-lspace: 0pt !important;
            mso-table-rspace: 0pt !important;
        }

        /* What it does: Fixes webkit padding issue. Fix for Yahoo mail table alignment bug. Applies table-layout to the first 2 tables then removes for anything nested deeper. */
        table {
            border-spacing: 0 !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            margin: 0 auto !important;
        }
        table table table {
            table-layout: auto;
        }

        /* What it does: Uses a better rendering method when resizing images in IE. */
        img {
            -ms-interpolation-mode:bicubic;
        }

        /* What it does: A work-around for email clients meddling in triggered links. */
        *[x-apple-data-detectors],  /* iOS */
        .x-gmail-data-detectors,    /* Gmail */
        .x-gmail-data-detectors *,
        .aBn {
            border-bottom: 0 !important;
            cursor: default !important;
            color: inherit !important;
            text-decoration: none !important;
            font-size: inherit !important;
            font-family: inherit !important;
            font-weight: inherit !important;
            line-height: inherit !important;
        }

        /* What it does: Prevents Gmail from displaying an download button on large, non-linked images. */
        .a6S {
           display: none !important;
           opacity: 0.01 !important;
       }
       /* If the above doesn't work, add a .g-img class to any image in question. */
       img.g-img + div {
           display: none !important;
       }

       /* What it does: Prevents underlining the button text in Windows 10 */
        .button-link {
            text-decoration: none !important;
        }

        /* What it does: Removes right gutter in Gmail iOS app: https://github.com/TedGoas/Cerberus/issues/89  */
        /* Create one of these media queries for each additional viewport size you'd like to fix */
        /* Thanks to Eric Lepetit (@ericlepetitsf) for help troubleshooting */
        @media only screen and (min-device-width: 375px) and (max-device-width: 413px) { /* iPhone 6 and 6+ */
            .email-container {
                min-width: 375px !important;
            }
        }

    </style>
    <!-- CSS Reset : END -->

    <!-- Progressive Enhancements : BEGIN -->
    <style>

        /* What it does: Hover styles for buttons */
        .button-td,
        .button-a {
            transition: all 100ms ease-in;
        }
        .button-td:hover,
        .button-a:hover {
            background: #555555 !important;
            border-color: #555555 !important;
        }

        /* Media Queries */
        @media screen and (max-width: 560px) {

            body {
              padding: 0 !important;
            }

            .container {
              padding: 0 !important;
            }

            .email-container {
                width: 100% !important;
                margin: auto !important;
            }

            /* What it does: Forces elements to resize to the full width of their container. Useful for resizing images beyond their max-width. */
            .fluid {
                max-width: 100% !important;
                height: auto !important;
                margin-left: auto !important;
                margin-right: auto !important;
            }

            /* What it does: Forces table cells into full-width rows. */
            .stack-column,
            .stack-column-center {
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                direction: ltr !important;
            }
            /* And center justify these ones. */
            .stack-column-center {
                text-align: center !important;
            }

            /* What it does: Generic utility class for centering. Useful for images, buttons, and nested tables. */
            .center-on-narrow {
                text-align: center !important;
                display: block !important;
                margin-left: auto !important;
                margin-right: auto !important;
                float: none !important;
            }
            table.center-on-narrow {
                display: inline-block !important;
            }

            /* What it does: Adjust typography on small screens to improve readability */
            .email-container p {
                font-size: 17px !important;
                line-height: 22px !important;
            }
        }

    </style>
    <!-- Progressive Enhancements : END -->

    <!-- What it does: Makes background images in 72ppi Outlook render at correct size. -->
    <!--[if gte mso 9]>
    <xml>
        <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->

</head>
<body width="100%" bgcolor="#fbfbfb" style="margin: 0; padding: 0 0 0 0; mso-line-height-rule: exactly;">
  <center style="width: 100%; background: #fbfbfb; text-align: left; padding: 60px 0;" class="container">

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="560" style="margin: auto;" class="email-container">

      <tr>
        <td bgcolor="transparent" align="center">
          <img src="https://s3.eu-west-2.amazonaws.com/jincor-ico/email-assets/jincor_notification_header.png" width="560" height="" alt="Jincor newsletter header" border="0" align="center" style="width: 100%; max-width: 767px; height: auto; background: #a7d9fb; font-family: sans-serif; font-size: 15px; line-height: 20px; color: #555555; margin: auto;" class="g-img">
        </td>
      </tr>

      <tr>
        <td bgcolor="#ffffff" style="padding: 20px; text-align: center;"></td>
      </tr>

      <tr>
        <td bgcolor="#ffffff" style="padding: 0 20px 20px; font-family: sans-serif; font-size: 17px; line-height: 30px; color: #111111; text-align: left; font-weight: 300;">
          <p style="margin: 0;">Hello ${ name },</p>
        </td>
      </tr>

      <tr>
        <td bgcolor="#ffffff" style="padding: 0 20px 40px; font-family: sans-serif; font-size: 17px; line-height: 30px; color: #111111; text-align: left; font-weight: 300;">
          <p style="margin: 0;">
            You (or someone who looks exactly like you) requested login verification code at <b>${ datetime }</b><br/>
            The attempt was made from the following IP address: <b>${ ip }</b><br/>
            Login operation verification code is: <b>{{{CODE}}}</b>
          </p>
        </td>
      </tr>

      <tr>
        <td bgcolor="#ffffff" style="padding: 0 20px 40px; font-family: sans-serif; font-size: 17px; line-height: 30px; color: #111111; text-align: left; font-weight: 300;">
          <p style="margin: 0;">If this was not you, please contact us immediately at <a href="mailto:support@jincor.com">support@jincor.com</a></p>
        </td>
      </tr>

      <tr>
        <td bgcolor="#ffffff" style="padding: 0 20px 20px; font-family: sans-serif; font-size: 13px; line-height: 22px; color: #111111; text-align: left; font-weight: 300;">
          <p style="margin: 0;">Stay safe,<br/>Jincor Team</p>
        </td>
      </tr>

      <tr>
        <td bgcolor="#ffffff" style="padding: 0 35px; font-family: Helvetica, Arial, sans-serif; font-size: 15px; color: #111111">
          <hr style="margin: 0; border: 1px solid #e0e0e0; border-top: 0;"/>
        </td>
      </tr>

      <tr>
        <td bgcolor="#ffffff" style="padding: 30px 20px 30px; font-family: Helvetica, Arial, sans-serif; font-size: 17px; line-height: 27px; color: #111111; text-align: center; font-weight: 400;">
          <h5 style="margin: 0; text-align: center; color: #111111; font-family: Helvetica, Arial, sans-serif; font-size: 17px; line-height: 27px; font-weight: 400;">Have a question?</h5>
          <a style="display: block; text-decoration: none; text-align: center; color: #0080ff; font-family: Helvetica, Arial, sans-serif; font-size: 17px; line-height: 27px; font-weight: 400;" href="mailto:info@jincor.com">info@jincor.com</a>
        </td>
      </tr>
		</table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="560" style="margin: auto;" class="email-container">
      <!-- 3 Even Columns : BEGIN -->
			<tr>
				<td bgcolor="#111111" align="center" valign="top" style="padding: 50px 10px 50px;">
					<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
						<tr>
							<!-- Column : BEGIN -->
							<td width="14.2%" class="social">
								<table role="presentation" cellspacing="0" cellpadding="0" border="0">
									<tr>
										<td style="text-align: center">
											<a href="https://t.me/JincorICOeng">
												<img src="https://s3.eu-west-2.amazonaws.com/jincor-ico/email-assets/telegram.png" width="50" height="50" alt="alt_text" border="0" class="fluid" style="height: auto; background: transparent; font-family: sans-serif; font-size: 15px; line-height: 20px; color: transparent;">
											</a>
										</td>
									</tr>
								</table>
							</td>
							<!-- Column : END -->
							<!-- Column : BEGIN -->
							<td width="14.2%" class="social">
								<table role="presentation" cellspacing="0" cellpadding="0" border="0">
									<tr>
										<td style="text-align: center">
											<a href="https://twitter.com/jincor_ico">
												<img src="https://s3.eu-west-2.amazonaws.com/jincor-ico/email-assets/twitter.png" width="50" height="50" alt="alt_text" border="0" class="fluid" style="height: auto; background: transparent; font-family: sans-serif; font-size: 15px; line-height: 20px; color: transparent;">
											</a>
										</td>
									</tr>
								</table>
							</td>
							<!-- Column : END -->
							<!-- Column : BEGIN -->
							<td width="14.2%" class="social">
								<table role="presentation" cellspacing="0" cellpadding="0" border="0">
									<tr>
										<td style="text-align: center">
											<a href="https://www.reddit.com/r/Jincor/">
												<img src="https://s3.eu-west-2.amazonaws.com/jincor-ico/email-assets/reddit.png" width="50" height="50" alt="alt_text" border="0" class="fluid" style="height: auto; background: transparent; font-family: sans-serif; font-size: 15px; line-height: 20px; color: transparent;">
											</a>
										</td>
									</tr>
								</table>
							</td>
							<!-- Column : END -->
							<!-- Column : BEGIN -->
							<td width="14.2%" class="social">
								<table role="presentation" cellspacing="0" cellpadding="0" border="0">
									<tr>
										<td style="text-align: center">
											<a href="https://blog.jincor.com">
												<img src="https://s3.eu-west-2.amazonaws.com/jincor-ico/email-assets/medium.png" width="50" height="50" alt="alt_text" border="0" class="fluid" style="height: auto; background: transparent; font-family: sans-serif; font-size: 15px; line-height: 20px; color: transparent;">
											</a>
										</td>
									</tr>
								</table>
							</td>
							<!-- Column : END -->
							<!-- Column : BEGIN -->
							<td width="14.2%" class="social">
								<table role="presentation" cellspacing="0" cellpadding="0" border="0">
									<tr>
										<td style="text-align: center">
											<a href="https://www.facebook.com/jincorlimited">
												<img src="https://s3.eu-west-2.amazonaws.com/jincor-ico/email-assets/facebook.png" width="50" height="50" alt="alt_text" border="0" class="fluid" style="height: auto; background: transparent; font-family: sans-serif; font-size: 15px; line-height: 20px; color: transparent;">
											</a>
										</td>
									</tr>
								</table>
							</td>
							<!-- Column : END -->
							<!-- Column : BEGIN -->
							<td width="14.2%" class="social">
								<table role="presentation" cellspacing="0" cellpadding="0" border="0">
									<tr>
										<td style="text-align: center">
											<a href="https://www.instagram.com/jincorlimited/">
												<img src="https://s3.eu-west-2.amazonaws.com/jincor-ico/email-assets/instagram.png" width="50" height="50" alt="alt_text" border="0" class="fluid" style="height: auto; background: transparent; font-family: sans-serif; font-size: 15px; line-height: 20px; color: transparent;">
											</a>
										</td>
									</tr>
								</table>
							</td>
							<!-- Column : END -->
							<!-- Column : BEGIN -->
							<td width="14.2%" class="social">
								<table role="presentation" cellspacing="0" cellpadding="0" border="0">
									<tr>
										<td style="text-align: center">
											<a href="https://github.com/jincortech">
												<img src="https://s3.eu-west-2.amazonaws.com/jincor-ico/email-assets/github.png" width="50" height="50" alt="alt_text" border="0" class="fluid" style="height: auto; background: transparent; font-family: sans-serif; font-size: 15px; line-height: 20px; color: transparent;">
											</a>
										</td>
									</tr>
								</table>
							</td>
							<!-- Column : END -->
						</tr>
					</table>
				</td>
			</tr>
			<!-- 3 Even Columns : END -->
    </table>

    </center>
</body>
</html>`;
}
