const mailBody = {
  getResetPasswordBody: (payload) => {
    const { name, link } = payload;

    return `<div>
                <h1>Hey ${name},</h1><br/>
                <h3>This is link for reset your password and it will be valid for 10 min</h3>
                <a href="${link}">Click Here</a>
                <h3><b>DevCode</b></h3>
            </div>`;
  },
};

module.exports = mailBody;
