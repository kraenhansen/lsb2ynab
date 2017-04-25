const argv = require('argv');
const assert = require('assert');
const moment = require('moment');
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '.env'),
  silent: true
});

const transfer = require('./transfer');
const services = require('./services');

const credentials = {
  lsb: {
    userId: process.env.LSB_USER_ID,
    pin: process.env.LSB_PIN,
    agreementNumber: process.env.LSB_AGREEMENT_NUMBER,
    userNumber: process.env.LSB_USER_NUMBER,
    accountId: process.env.LSB_ACCOUNT_ID,
  },
  ynab: {
    email: process.env.YNAB_EMAIL,
    password: process.env.YNAB_PASSWORD,
    accountId: process.env.YNAB_ACCOUNT_ID,
    budgetVersionId: process.env.YNAB_BUDGET_VERSION_ID
  }
};

argv.option([{
  name: 'since',
  type: 'string'
}, {
  name: 'until',
  type: 'string'
}, {
  name: 'yesterday',
  type: 'boolean'
}, {
  name: 'latest',
  type: 'boolean'
}]);

const args = argv.run();

const today = moment();
const yesterday = today.subtract(1, 'day');

if(args.options.latest) {
  // Determine when the latest transaction was performed
  services.initialize(credentials).then(() => {
    services.ynab.getTransactions().then(transactions => {
      // Filter out tombstones / deleted transactions
      transactions = transactions.filter(t => !t.is_tombstone);
      // Determine the latest transaction
      if(transactions.length >= 1) {
        // Sort by military date - which is lexicographical order
        transactions.sort((a, b) => b.date.localeCompare(a.date));
        // Return the latest
        return transactions[0];
      } else {
        throw new Error('Expected at least one transaction');
      }
    }).then(latestTransaction => {
      // Transfer from the day after the latest transaction until yesterday
      const since = moment(latestTransaction.date).add(1, 'day');
      const until = yesterday;
      transfer(since, until, credentials);
    });
  });
} else if (args.options.yesterday) {
  const since = moment(yesterday.format('YYYY-MM-DD'));
  const until = moment(yesterday.format('YYYY-MM-DD'));
  // Initialize clients for the services and perform the transfer
  services.initialize(credentials).then(() => {
    transfer(since, until, credentials);
  });
} else if(args.options.since) {
  const since = moment(args.options.since);
  const until = args.options.until ? moment(args.options.until) : today;
  // Initialize clients for the services and perform the transfer
  services.initialize(credentials).then(() => {
    transfer(since, until, credentials);
  });
} else {
  throw new Error('Missing the --latest, --yesterday or --since argument');
}
