<template>
    <div class="home">
        <md-content class="content">
            <h1>Share screen!</h1>
            <div class="network-controls">
                <md-field>
                    <label>Add new server</label>
                    <md-input v-model="serverIp"></md-input>
                </md-field>
                <md-button class="md-raised" @click="addServer(serverIp)">Add server</md-button>
            </div>


            <md-list class="server-list">
                <md-list-item v-for="server in servers" :key="server.ip">
                    <md-icon v-if="server.loading" class="rotate">cached</md-icon>
                    <md-icon v-else-if="server.online"
                             :class="server.ip === connectedServer.ip?'md-primary' : ''">rss_feed
                    </md-icon>
                    <md-icon v-else>error_outline</md-icon>
                    <div class="md-list-item-text">
                        <span>{{ server.ip }}</span>
                        <span
                            v-if="server.online">Users online: {{ server.rooms.map(r => r.userCount).reduce((a, b) => a + b, 0) }}</span>
                    </div>
                    <md-button v-if="server.online && server.ip!==connectedServer.ip"
                               class="md-dense md-primary md-raised"
                               @click="connectServer(server)">
                        Connect
                    </md-button>
                    <md-button v-else-if="server.online" disabled class="md-dense md-primary md-raised">
                        Connected
                    </md-button>
                    <md-button class="md-dense md-primary" @click="removeServer(server.ip)">Remove</md-button>
                </md-list-item>
            </md-list>

            <div>
                <div class="video-stream" v-for="videoStream in videoStreams" :key="videoStream.title">
                    <h3>{{ videoStream.title }}</h3>
                    <div class="video-grid">
                        <video v-for="video in videoStream.videos" :key="video.id" autoplay
                               :srcObject.prop="video" controls muted></video>
                    </div>
                </div>
            </div>

            <div class="sources-grid" v-if="showSourceGrid">
                <md-card class="source"
                         v-for="source in sources"
                         @click="showSource(source)"
                         :title="source.name"
                         :active="activeSources.find(s=>s.id===source.id)">
                    <md-card-media-cover md-text-scrim>
                        <md-card-media md-ratio="16:9">
                            <img :src="source.thumbnail.toDataURL()" :alt="source.name + 'thumbnail'">
                        </md-card-media>

                        <md-card-area>
                            <md-card-header>
                                <span class="md-subhead">{{ source.name }}</span>
                            </md-card-header>

                            <md-card-actions>
                                <md-button v-if="activeSources.find(s=>s.id===source.id)" @click="stopSource(source)">
                                    Deselect screen
                                </md-button>
                                <md-button v-else @click="showSource(source)">Select screen</md-button>
                            </md-card-actions>
                        </md-card-area>
                    </md-card-media-cover>
                </md-card>
            </div>
        </md-content>
    </div>
</template>

<script>
const {desktopCapturer} = require('electron');
import MultiPeerMesh from 'multi-peer-mesh'
import ServerInfo from '../js/ServerInfo';

export default {
    name: 'home',
    components: {},
    data() {
        return {
            showSourceGrid: false,
            serverIp: 'https://api.ruurd.dev',
            sources: [],
            activeSources: [],
            connectedServer: new ServerInfo('-1'),
            sourceUpdater: false,
            serverUserCountUpdater: false,
            servers: [],
            meshNetwork: null,
            videoStreams: [],
        }
    },
    async mounted() {
        this.meshNetwork = new MultiPeerMesh('ScreenShare');
        if (localStorage.getItem('servers') !== null) {
            JSON.parse(localStorage.servers).forEach(ip => {
                let info = new ServerInfo(ip);
                this.servers.push(info);
                this.updateServerInfo(ip, info)
            })
        }

        this.serverUserCountUpdater = setInterval(async () => {
            this.servers.forEach(s => this.updateServerInfo(s.ip, s));
        }, 2000);

        this.sourceUpdater = setInterval(async () => {
            if (this.showSourceGrid) {
                this.sources = await this.getSources()
            }
        }, 2000);
        this.sources = await this.getSources()
    },
    methods: {
        async connectServer(server) {
            if (this.meshNetwork) {
                this.meshNetwork.destroy()
            }

            this.meshNetwork.printDebug = true;
            console.log('Trying to connect to ', server.ip, this.meshNetwork);
            await this.meshNetwork.connect(server.ip, true);
            await this.meshNetwork.join('default');

            this.connectedServer = server;

            this.meshNetwork.on('connect', id => console.log('Connect', id));
            this.meshNetwork.on('disconnect', id => console.log('Disconnect', id));
            this.meshNetwork.on('error', (id, err) => console.log('Error', err));

            this.meshNetwork.on('data', (id, data) => console.log(data.toString()));
            this.meshNetwork.on('stream', (id, stream) => {
                console.log({stream, id});
                this.addStream(stream, id)
            });
            this.meshNetwork.on('track', (id, track) => console.log({track}));

            this.showSourceGrid = true;
            console.log('Connected to mesh network', this.meshNetwork)
        },
        async updateServerInfo(ip, refObj = false) {
            let rooms = await this.meshNetwork.getServerRooms(ip);
            let online = rooms !== null;
            // console.log('Updating server user count', ip, rooms);
            rooms = rooms || [];
            if (refObj !== false) {
                refObj.online = online;
                refObj.rooms = rooms;
                refObj.loading = false
            }
            return new ServerInfo(ip, online, rooms, false);
        },
        removeServer(ip) {
            if (this.servers.find(s => s.ip === ip)) {
                this.servers.splice(this.servers.findIndex(s => s.ip === ip), 1);
                localStorage.servers = JSON.stringify(this.servers.map(s => s.ip));
            }
        },
        async addServer(ip) {
            console.log("adding server", ip);
            if (this.servers.find(s => s.ip === ip))
                return;
            let serverInfo = new ServerInfo(ip);
            this.servers.push(serverInfo);
            this.updateServerInfo(ip, serverInfo);
            console.log("Server info: ", serverInfo);
            localStorage.servers = JSON.stringify(this.servers.map(s => s.ip))
        },
        stopSource(source) {
            this.activeSources.splice(this.activeSources.findIndex(s => s.id === source.id), 1)
        },
        async showSource(source) {
            console.log(source);
            if (this.activeSources.find(s => s.id === source.id)) {
                return
            }
            this.activeSources.push(source);
            let stream = await this.getStream(source);
            // this.addStream(stream, 'Me - ' + source.name)
            this.meshNetwork.broadcastStream(stream)
        },
        addStream(stream, title) {
            let existingVideos = this.videoStreams.find(v => v.title === title);
            if (existingVideos) {
                existingVideos.videos.push(stream);
            } else {
                this.videoStreams.push({
                    title, videos: [stream]
                })
            }
            console.log("Added video stream", stream, title, this.videoStreams);
        },
        async getStream(source) {
            try {
                return await navigator.mediaDevices.getUserMedia({
                    audio: {
                        mandatory: {
                            chromeMediaSource: 'desktop'
                        }
                    },
                    video: {
                        mandatory: {
                            chromeMediaSource: 'desktop',
                            chromeMediaSourceId: source.id,
                            minWidth: 1280,
                            maxWidth: 3840,
                            minHeight: 720,
                            maxHeight: 2160
                        }
                    }
                })
            } catch (e) {
                console.log('Get stream error', e)
            }
        },
        getSources() {
            return new Promise((resolve, reject) => {
                desktopCapturer.getSources({types: ['window', 'screen']}, (error, sources) => {
                    if (error) {
                        reject(error)
                    } else {
                        resolve(sources)
                    }
                })
            })
        },
        open(link) {
            this.$electron.shell.openExternal(link)
        },
    },
    beforeDestroy() {
        clearInterval(this.sourceUpdater);
        clearInterval(this.serverUserCountUpdater);
    },
}
</script>

<style scoped>
.content {
    padding: 25px;
}

.landing-page {
    background: radial-gradient(
        ellipse at top left,
        rgba(255, 255, 255, 1) 40%,
        rgba(229, 229, 229, .9) 100%
    );
    padding: 60px 80px;
}

.sources-grid {
    display: grid;
    -webkit-box-align: start;
    -ms-flex-align: start;
    align-items: flex-start;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.video-grid {
    display: grid;
    -webkit-box-align: start;
    -ms-flex-align: start;
    align-items: flex-start;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.source {
    margin: 15px;
}

.source[active] {
    box-shadow: 0 0 50px 5px rgba(0, 0, 0, 0.7);
}

video {
    max-width: 100%;
    margin: 20px 0;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

.rotate {
    animation: spin 1s infinite linear reverse;
}

.md-card-media.md-ratio-16-9 img {
    filter: blur(2px) !important;
}
</style>
