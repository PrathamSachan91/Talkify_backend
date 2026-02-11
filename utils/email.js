import fs from "fs";
import path from "path";

export const getOtpEmailHtml = (otp) => {
  const templatePath = path.join(
    process.cwd(),
    "template",
    "otpmail.html"
  );

  let html = fs.readFileSync(templatePath, "utf-8");

  html = html.replace("{{OTP}}", otp);
  html = html.replace("{{YEAR}}", new Date().getFullYear());

  return html;
};
