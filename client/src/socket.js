import * as io from 'socket.io-client'

// "undefined" means the URL will be computed from the `window.location` object
const URL = process.env.REACT_APP_ENVIRONMENT === 'production' ? 'http://191.101.2.121:9000' : 'http://localhost:9000';
console.log(process.env, URL)

export const socket = io(URL);