export default class ServerInfo {
    constructor(ip, online = false, rooms = [], loading = true) {
        this.ip = ip;
        this.online = online;
        this.rooms = rooms;
        this.loading = loading;
    }
}
