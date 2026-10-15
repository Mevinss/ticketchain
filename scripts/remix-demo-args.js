// Read-only helper. Run in Remix after selecting the target environment.
// Replace the example metadata URLs with your published site's URLs before createEvent.
(async () => {
  const latest = await web3.eth.getBlock('latest');
  const now = Number(latest.timestamp);
  console.log('Current chain timestamp:', now);
  console.log('Entry demo — createEvent arguments:');
  console.log(JSON.stringify(['Entry Demo','https://YOUR-SITE/metadata/night.json',now+1800,now+9000,'1000000000000000',40]));
  console.log('Refund demo — createEvent arguments:');
  console.log(JSON.stringify(['Refund Demo','https://YOUR-SITE/metadata/cinema.json',now+86400,now+93600,'1000000000000000',40]));
  console.log('Use separate events. Entry demo is already inside the admission window and cannot be cancelled. Value = 0 for createEvent. Value = 0.001 ether only for buyTicket.');
})();
