const CronJob = require('cron').CronJob;
const { startGame, gameDate } = require('./server.js');
const {
    gameStartHour,
    gameStartMinutes
  } = await gameDate();

const job = new CronJob(`* ${gameStartMinutes} ${gameStartHour} * * *`,
    async () => {
            await startGame();
        },
        null,
        true,
        'Europe/Riga'
  )

job.start();
    
 

