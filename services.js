const uuid = require('uuid/v4');

const lsb = require('lsb-client')();
const ynab = require('ynab-client');

const services = {
  initializeYNAB: credentials => {
    console.log('Initializing YNAB client');

    const YNAB_DEVICE_ID = uuid();

    const email = credentials.email;
    const password = credentials.password;
    const accountId = credentials.accountId;

    ynab.setDeviceId(YNAB_DEVICE_ID);
    ynab.setBudgetVersionId(credentials.budgetVersionId);

    return ynab.loginUser({
      email, password
    }).then(response => {
      return ynab.getInitialUserData();
    });
  },
  initializeLSB: credentials => {
    console.log('Initializing LSB client');

    return lsb.logon.logonpin({
      userId: credentials.userId,
      pin: credentials.pin
    })
    .then(logonResponse => {
      return lsb.logon.selectagreement({
        agreementNumber: credentials.agreementNumber,
        userNumber: credentials.userNumber
      });
    });
  },
  initialize: credentials => {
    return Promise.all([
      services.initializeYNAB(credentials.ynab),
      services.initializeLSB(credentials.lsb)
    ]);
  },
  ynab,
  lsb
};

module.exports = services;
