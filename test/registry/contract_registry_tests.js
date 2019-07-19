const ContractRegistry = artifacts.require('../registry/ContractRegistry.sol');
const utils = require('../utils.js');

contract('contract registry', function (accounts) {
    let contractRegistry;

    const owner = accounts[0];
    const user = accounts[1];
    const name = 'test_contract';
    const nameByte32 = '0x746573745f636f6e747261637400000000000000000000000000000000000000';
    const newNameByte32 = '0x746573745f636f6e74726163745f310000000000000000000000000000000000';

    const addContract = async (contractRegistry, from) => {
        const startDate = new Date();
        const cliffDate =  new Date(startDate.getTime() + 86400000);
        const durationDate =  new Date(cliffDate.getTime() + 86400000);
        
        const startTimestamp = Math.round(startDate.getTime()/1000);
        const cliffTimestamp = Math.round(cliffDate.getTime()/1000);
        const durationTimestamp = Math.round(durationDate.getTime()/1000);
        
        await contractRegistry.addContract(name, startTimestamp, cliffTimestamp, durationTimestamp, true, {from: from});
    };

    beforeEach(async () => {
        contractRegistry = await ContractRegistry.new('0x0009');
    });

    it('should allow contract adding', async () => {
        await addContract(contractRegistry, owner);
        const result = await contractRegistry.getContractByName(name, {from: user});
        const names = await contractRegistry.getContractNames({from: user});
        
        assert.equal(result[1], nameByte32);
        assert.equal(names[0], nameByte32);
    });

    it('should prohibit adding contract with the same name', async () => {
        try {
            await addContract(contractRegistry, owner);
            await addContract(contractRegistry, owner);
        } catch (error) {
            return utils.ensureException(error);
        }
        assert.fail('transfer did not fail');
    });

    it('should allow contract disabling', async () => {
        await addContract(contractRegistry, owner);
        await contractRegistry.setEnabled(name, false, {from: owner});
        
        const result = await contractRegistry.getContractByName(name, {from: user});
        const names = await contractRegistry.getContractNames({from: user});

        assert.equal(result[0], '0x0000000000000000000000000000000000000000');
        assert.equal(names.length, 0);
    });

    it('should prohibit contract disabling by none owner', async () => {
        try {
            await addContract(contractRegistry, owner);
            await contractRegistry.setEnabled(name, false, {from: user});
        } catch (error) {
            return utils.ensureException(error);
        }
        assert.fail('transfer did not fail');
    });


    it('should allow setting new name for contract', async () => {
        await addContract(contractRegistry, owner);
        await contractRegistry.setNewName(nameByte32, newNameByte32, {from: owner});

        const result = await contractRegistry.getContractByName(newNameByte32, {from: user});
        const names = await contractRegistry.getContractNames({from: user});

        assert.equal(result[1], newNameByte32);
        assert.equal(names.length, 1);
    });

    it('should prohibit setting new name if it already used', async () => {
        try {
            await addContract(contractRegistry, owner);
            await contractRegistry.setNewName(nameByte32, nameByte32, {from: owner});
        } catch (error) {
            return utils.ensureException(error);
        }
        assert.fail('transfer did not fail');
    });
});
