import * as io from 'socket.io-client'

// "undefined" means the URL will be computed from the `window.location` object
const URL = process.env.REACT_APP_ENVIRONMENT === 'production' ? 'https://server.illusiumgame.com' : 'http://localhost:9000';

export const socket = io(URL);