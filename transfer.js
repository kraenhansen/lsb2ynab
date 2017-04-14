const assert = require('assert');
const lsb = require('lsb-client')();
const moment = require('moment');
const Promise = require('bluebird');
const uuid = require('uuid/v4');
const ynab = require('ynab-client');

const exportTransactions = (since, until, credentials) => {
  return lsb.logon.logonpin({
    userId: credentials.lsb.userId,
    pin: credentials.lsb.pin
  })
  .then(logonResponse => {
    return lsb.logon.selectagreement({
      agreementNumber: credentials.lsb.agreementNumber,
      userNumber: credentials.lsb.userNumber
    });
  })
  .then(agreementResponse => {
    // TODO: Consider getting the accountId from the agreementResponse
    return lsb.accounts.transactions.search({
      accountId: credentials.lsb.accountId,
      agreementId: credentials.lsb.agreementNumber,
      includeReservations: true,
      transactionsFrom: since.format('YYYY-MM-DD'),
      transactionsTo: until.format('YYYY-MM-DD')
    });
  })
  .then(transactionsResponse => {
    return transactionsResponse.transactions;
  });
};

const importTransactions = (transactions, credentials) => {
  const YNAB_DEVICE_ID = uuid();

  const email = credentials.ynab.email;
  const password = credentials.ynab.password;
  const accountId = credentials.ynab.accountId;

  ynab.setDeviceId(YNAB_DEVICE_ID);
  ynab.setBudgetVersionId(credentials.ynab.budgetVersionId);

  const today = moment().format('YYYY-MM-DD');
  // Create these entries in YNAB
  const transactionsTransformed = transactions.map(transaction => {
    const amountValue = transaction.amount.value;
    const amountScale = transaction.amount.scale;
    const amount = amountValue / Math.pow(10, amountScale);
    const dueDate = transaction.dueDate;
    return {
      accepted: false,
      amount: Math.round(amount * 1000),
      cleared: 'Cleared',
      date: moment(dueDate).format('YYYY-MM-DD'),
      entities_account_id: accountId,
      imported_date: today,
      memo: transaction.label
    };
  });

  return ynab.loginUser({
    email, password
  }).then(response => {
    return ynab.getInitialUserData();
  })
  .then(response => {
    // When logged in - add the transactions, one by one
    return Promise.each(transactionsTransformed, transaction => {
      return ynab.addTransaction(transaction);
    });
  });
};

const transfer = (since, until, credentials) => {
  // Print to the user that we are starting the import
  const when = [
    'since',
    since.format('YYYY-MM-DD'),
    'until',
    until.format('YYYY-MM-DD')
  ].join(' ');
  console.log('Transfering LSB ➜ YNAB (' + when + ')');

  exportTransactions(since, until, credentials)
  .then(transactions => {
    console.log('Found', transactions.length, 'transactions');
    return transactions;
  })
  .then(transactions => {
    return importTransactions(transactions, credentials);
  })
  .then(() => {
    console.log('All done ...');
  });
};

module.exports = transfer;
