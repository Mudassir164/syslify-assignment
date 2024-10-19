class CreateRelease {
    constructor({ name, version, account, region }) {
        if (!name || !version || !account || !region) {
            throw new Error('All fields are required: name, version, account, region.');
        }

        this.name = name;
        this.version = version;
        this.account = account;
        this.region = region;
    }
}

module.exports = CreateRelease;