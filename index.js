const argv = require('argv');
const assert = require('assert');
const moment = require('moment');
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '.env')
});

const transfer = require('./transfer');

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
}]);

const args = argv.run();

let since;
let until;

const today = moment();

if(args.options.yesterday) {
  const yesterday = today.subtract(1, 'day');
  since = moment(yesterday.format('YYYY-MM-DD'));
  until = moment(yesterday.format('YYYY-MM-DD'));
} else if (args.options.until) {
  until = moment(args.options.until);
} else {
  until = today;
}

if(!since && args.options.since) {
  since = moment(args.options.since);
} else if (!since) {
  throw new Error('Missing the --since runtime argument');
}

transfer(since, until, credentials);
