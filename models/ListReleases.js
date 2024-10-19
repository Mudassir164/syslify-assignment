class ListReleases {
    constructor({ limit = 10, offset = 0 }) {
        this.limit = parseInt(limit, 10);
        this.offset = parseInt(offset, 10);
    }
}

module.exports = ListReleases;