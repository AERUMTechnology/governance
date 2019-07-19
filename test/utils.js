let contractAt = function (contract, address) {
  return new Promise(function (resolve, reject) {
    contract.at(address).then(function (instance) {
      resolve(instance);
    }).catch(function (error) {
      reject(error);
    });
  });
};

let getEventArg = function (tx, event, arg) {
  for (let i = 0; i < tx.logs.length; i++) {
    const log = tx.logs[i];
    if (log.event === event) {
      return log.args[arg];
    }
  }
  return null;
};

let blockTime = function () {
  return new Promise((resolve, reject) => {
    web3.eth.getBlock('latest', (error, block) => {
      if(error) {
        reject(error);
      } else {
        resolve(block.timestamp);
      }
    });
  })
};

let increaseTime = function (duration) {
  const id = Date.now();

  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [duration],
      id: id,
    }, err => {
      if (err) {
        return reject(err);
      }
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: id + 1,
      }, (err, res) => {
        return err ? reject(err) : resolve(res);
      });
    });
  });
};

let assertVMError = function (error) {
  if (error.message.search('VM Exception') === -1) {
    console.log(error);
  }
  assert.isAbove(error.message.search('VM Exception'), -1, 'Error should have been caused by EVM');
};

let epoch = function () {
  return Math.ceil((new Date).getTime() / 1000);
};

function isException(error) {
  let strError = error.toString();
  return strError.includes('invalid opcode') || strError.includes('invalid JUMP') || strError.includes('revert');
}

function ensureException(error) {
  assert(isException(error), error.toString());
}

function asciiToHex(value) {
  return web3.utils.asciiToHex(value);
}

module.exports = {
  contractAt,
  getEventArg,
  blockTime,
  increaseTime,
  assertVMError,
  epoch,
  asciiToHex,
  zeroAddress: '0x0000000000000000000000000000000000000000',
  ensureException: ensureException
};
