# TicketChain Remix және Sepolia нұсқаулығы

Бұл нұсқаулық репозиторийдегі нақты TicketChain.sol файлына арналған. Deploy кезінде параметр енгізілмейді. Admin — deploy жасаған аккаунт.

## 1 Компиляция

1. Remix File Explorer → contracts/TicketChain.sol ашыңыз.
2. Solidity Compiler → compiler **0.8.24**.
3. Advanced Configurations → EVM Version **london**.
4. Optimization **өшірулі**. Runs 200, optimization өшкенде қолданылмайды.
5. Compile TicketChain.sol басыңыз. Қызыл error болмауы керек.
6. Compilation Details → ABI арқылы ABI алыңыз. Реподағы жаңартылған ABI осы компилятордан алынған.

## 2 Remix VM deploy

Deploy & Run Transactions бөлімінде:

| Өріс | Не таңдау/жазу керек |
|---|---|
| Environment | Remix VM (қолжетімді VM нұсқасы) |
| Account | Бірінші тест аккаунт — admin |
| Value | 0 Wei |
| Contract | TicketChain — contracts/TicketChain.sol |
| Constructor arguments | Бос: аргумент жоқ |
| Gas limit | Remix бағалауы; өзгерту қажет болса транзакция бағалауына сүйеніңіз |

Deploy басыңыз. Deployed Contracts ішінен TicketChain ашыңыз. `admin()` басқанда deploy жасаған Account адресі шығуы тиіс. `eventCount()` бастапқыда 0.

Account рөлдерін жазып алыңыз: A=admin, B=buyer, C=checker. Remix VM тест аккаунттарын Sepolia-ға импорттамаңыз.

## 3 Нақты уақыттарды алу

scripts/remix-demo-args.js файлын Remix ішінде ашып, Run орындаңыз. Бұл тек соңғы блок уақытын оқып, createEvent аргументтерін шығарады; транзакция жібермейді. Үлгідегі https://YOUR-SITE URL-ін нақты metadata URL-імен ауыстырыңыз.

Қолмен Remix terminal JavaScript арқылы да алуға болады:

```javascript
Number((await web3.eth.getBlock('latest')).timestamp)
```

Нәтижені T деп белгілеңіз. Өрістерге T+1800 деген формула емес, есептелген бүтін сан енгізіңіз. Баға төменде wei түрінде берілген: 1000000000000000 wei = 0.001 ETH. Timestamp — секунд, миллисекунд емес.

## 4 Сатып алу және кіру сценарийі

Admin Account A таңдап, Value=0 қалдырыңыз. createEvent жебесін ашып, әр өрісті толтырыңыз:

| Өріс | Мән |
|---|---|
| title | Entry Demo |
| metadataURI | Сіздің HTTPS metadata URL: .../metadata/night.json |
| startsAt | T + 1800 есебінің нәтижесі |
| endsAt | T + 9000 есебінің нәтижесі |
| ticketPrice | 1000000000000000 |
| capacity | 40 |

Transact басыңыз. Жаңа контрактта eventId=1. Басқа оқиғалар бар болса, EventCreated log немесе eventCount() бойынша ID алыңыз.

1. Account B таңдаңыз.
2. Deploy панелінің Value өрісі: **0.001**, бірлігі **ether**.
3. buyTicket: eventId=1, seatNumber=1 → Transact.
4. Value өрісін қайтадан **0 Wei** етіңіз. Басқа функциялар payable емес.
5. getTicket(1): owner B, used=false. Жаңа контракт болмаса TicketPurchased log ішінен нақты ticketId қолданыңыз.
6. Account C → checkIn(1): NotAuthorized қатесі күтіледі.
7. Account A → setChecker: eventId=1, checker=C толық адресі, allowed=true.
8. Account C → checkIn(1): сәтті. startsAt=T+1800 болғандықтан кіру терезесі қазірдің өзінде ашық.
9. C қайта checkIn(1): TicketAlreadyUsed қатесі күтіледі.

Сол орынға екінші сатып алушы buyTicket жіберсе SeatAlreadySold болады. Егер әзірге орын бос болса, басқа орын нөмірімен тексеріңіз. Күтілетін revert — дұрыс қорғаныс нәтижесі.

## 5 Тоқтату және қайтару сценарийі

Кіру сценарийіндегі іс-шараны тоқтата алмайсыз: кіру терезесі ашық. Бөлек іс-шара жасаңыз.

Жаңа T алып, Account A, Value=0:

- title: Refund Demo
- metadataURI: нақты .../metadata/cinema.json
- startsAt: T+86400
- endsAt: T+93600
- ticketPrice: 1000000000000000
- capacity: 40

Жаңа контрактта eventId=2. Account B, Value=0.001 ether → buyTicket(2,1). TicketPurchased ішінен жаңа ticketId алыңыз (алдыңғы сценарийде бір билет болса 2).

Value=0 → Account A → cancelEvent(2).
Account B → refundTicket(2).
getTicket(2): refunded=true. getEvent(2): escrowBalance=0, refundedCount=1.
Қайта refundTicket(2) шақыруы TicketAlreadyRefunded қатесін беруі керек. Қайтарылатын сома — билет бағасы; gas қайтарылмайды.

## 6 Sepolia deploy

1. MetaMask ішінде жеке оқу аккаунтын таңдаңыз және **Sepolia** желісіне ауысыңыз. Test networks көрсету қажет болуы мүмкін.
2. Сол аккаунтта тестілік Sepolia ETH болуы керек. Ethereum ресми желілер бетінде faucet сілтемелері бар: https://ethereum.org/developers/docs/networks/
3. Remix → Deploy & Run → **Browser Extension** → MetaMask. Ескі интерфейсте Injected Provider атауы болуы мүмкін.
4. Көрсетілген желіні тексеріңіз: Sepolia, chain ID **11155111**. Account — өзіңіздің admin әмияныңыз.
5. Contract TicketChain, Value **0 Wei**, constructor arguments бос.
6. Deploy басыңыз → MetaMask транзакциясын қарап, өзіңіз растаңыз.
7. Расталғаннан кейін contract address пен transaction hash сақтаңыз. admin() аккаунтыңызға сәйкес келетінін тексеріңіз.

Deploy тек контрактты жасайды. Remix VM-дегі іс-шаралар/билеттер Sepolia-ға көшпейді. Іс-шараларды қайта жасаңыз.

## 7 Сайтты қосу және metadata

frontend/.env:

```dotenv
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_CONTRACT_ADDRESS=ОСЫНДА_DEPLOY_АДРЕСІ
VITE_EXPLORER_URL=https://sepolia.etherscan.io
```

RPC қолжетімсіз болса басқа Sepolia RPC көрсетіңіз. Vite env мәндері браузерге ашық, құпия кілт жазбаңыз. Локал тесттен қалған frontend/.env.local басымдық алады — Sepolia конфигурациясына ауысқанда оны алып тастаңыз немесе жаңартыңыз.

npm run dev қайта іске қосыңыз. Жариялау кезінде npm run build орындап, dist каталогын статикалық хостингке орналастырыңыз. SPA fallback қажет. metadata URL-і жарияланған сайттан ашылатынын тексеріңіз: https://САЙТ/metadata/night.json.

Сайтта admin әмиянын қосыңыз → Организатор → Metadata URL тексеру → Жаңа іс-шара → Create. Бұл операцияға MetaMask қол қоюын сұрайды. Сатып алушы мен checker үшін бөлек өз аккаунттарыңызды қолданыңыз. Олардың транзакция жасауға тестілік ETH-і болуы керек.

## 8 Қандай мәліметті қайтару керек

- Chain ID: 11155111
- Contract address: 0x...
- Deploy transaction hash: 0x...
- Admin public address: 0x...
- Solidity 0.8.24, EVM London, optimizer off
- Deploy жасаған source commit

Private key мен seed phrase жіберілмейді. Frontend-ті аяқтау/тексеру үшін ашық адрес пен deploy hash жеткілікті.

## Тексеру мәртебесі

Жергілікті автоматтандырылған тесттер Ganache EVM-де орындалады. Remix VM мен Sepolia қадамдары осы нұсқаулық бойынша бөлек орындалады; олардың сәтті өткенін жергілікті тест нәтижесінен қорытындылауға болмайды.

Ресми Remix нұсқаулығы: https://remix-ide.readthedocs.io/en/latest/run.html
