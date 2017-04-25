const assert = require('assert');
const moment = require('moment');
const Promise = require('bluebird');

const {
  ynab,
  lsb
} = require('./services');

const exportTransactions = (since, until, credentials) => {
  // TODO: Consider getting the accountId from the agreementResponse
  return lsb.accounts.transactions.search({
    accountId: credentials.lsb.accountId,
    agreementId: credentials.lsb.agreementNumber,
    includeReservations: true,
    transactionsFrom: since.format('YYYY-MM-DD'),
    transactionsTo: until.format('YYYY-MM-DD')
  })
  .then(transactionsResponse => {
    return transactionsResponse.transactions;
  });
};

const importTransactions = (transactions, credentials) => {
  const accountId = credentials.ynab.accountId;
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
  // Add the transactions, one by one
  return Promise.each(transactionsTransformed, transaction => {
    return ynab.addTransaction(transaction);
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

  assert(since.isSameOrBefore(until),
         '`since` should be same or before ´until´: ' + when);

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
