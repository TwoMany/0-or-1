import * as io from 'socket.io-client'

// "undefined" means the URL will be computed from the `window.location` object
const URL = process.env.REACT_APP_ENVIRONMENT === 'production' ? '191.101.2.121:10000' : 'http://localhost:10000';
console.log(process.env, URL)

export const socket = io(URL);