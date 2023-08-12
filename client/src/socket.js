import * as io from 'socket.io-client'

// "undefined" means the URL will be computed from the `window.location` object
const URL = process.env.REACT_APP_ENVIRONMENT === 'production' ? '191.101.2.121:443' : 'http://localhost:443';
console.log(process.env, URL)

export const socket = io(URL);