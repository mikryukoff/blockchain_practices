# Elleptic Curve Digital Signature Node

В этом проекте представлен пример того, как клиент взаимодействует с сервером при совершении транзакции между двумя адресами. 
Серверная часть состоит из одного узла, вопросы достижения консенсуса не рассматриваются.  

Основная цель проекта - отработать на практике криптографию с открытым ключом, которая обеспечивает безопасность транзакций в блокчейне. 
Цифровая подпись на эллиптических кривых (Elliptic Curve Digital Signatures Algorithm, ECDSA) позволяет совершать транзакции только тому, кто владеет закрытым ключом.  

Перед выполнением проекта установите [nodejs](https://nodejs.org/) и [git](https://git-scm.com/book/ru/).
Клонируйте репозиторий на свою машину и перейдите в папку проекта. 

```bash
git clone https://github.com/labintsev/ecdsa-node.git
cd ecdsa-node
```

### Client

Папка `client` содержит приложение на базе [react](https://reactjs.org/) и [vite](https://vitejs.dev/). 
Инструкция для запуска клиента: 

1. Открыть в терминале папку `client`
2. Установить зависимости с помощью команды `npm install`
3. Запустить клиент в режиме разработчика `npm run dev` 
4. Убедиться что приложение запущено, перейдя по ссылке http://127.0.0.1:5173/

### Server
Папка `server` содержит логику сервера на базе [express](https://expressjs.com/). 
Инструкция для запуска сервера:

1. Открыть в терминале папку `server` 
2. Установить зависимости с помощью команды `npm install`  
3. Запустить сервер командой `node index` 

Клиентская часть приложения автоматически подключится к серверу на порту 3042.  
Для автоматической перезагрузки сервера при любом изменении исходного кода можно использовать команду [nodemon](https://www.npmjs.com/package/nodemon) вместо `node`. 

## Задания 

Для решения заданий понадобится понимание того, как работают приложения на React, а также сервер Node Express. 
Рекомендуемый редактор - VSCode. 

Запустите клиент и сервер в двух отдельных терминалах. 
Протестируйте UI: 
- ввести адреса из server/index.js balances в Wallet
- Отправить 1 монету из Send Transaction

Сейчас приложение работает так, что любой желающий может перевести монеты, зная адрес владельца этих монет. 
Как можно улучшить приложение с помощью криптографии?

Решение заключается в использовании алгоритма цифровой подписи для совершения транзакций. 
Мы рассмотрим, как для использовать алгоритм на эллиптических кривых (ECDSA) библиотеки `ethereum-cryptography`.  

Содержимое транзакции не является секретом и свободно отправляется по сети на сервер. 
Отправитель транзакции владеет приватным ключом, который хранится в тайне. 
Публичный ключ связан с приватным, и используется как общедоступный адрес владельца.  
При отправке транзакции с помощью приватного ключа создается цифровая подпись. 
Цифровая подпись содержит информацию о хеше отправляемой транзакции и о публичном адресе отправителя.  
Публичный ключ общедоступен, и с его помощью любой желающий может извлечь из цифровой подписи хеш транзакции. 
Так как сама транзакция передается в открытом виде, то любой желающий так же может самостоятельно вычислить ее хеш. 
Если расшифрованный хеш совпадает с хешем, который получатель вычислил самостоятельно, значит это сообщение действительно подписал владельц публичного ключа. 
С одной стороны, никто кроме владельца приватного ключа, не сможет создать такую цифровую подпись, из которой можно расшифровать правильный хеш транзакции. 
С другой стороны, если из цифровой подписи с помощью публичного ключа извлекается правильный хеш транзакции, значит эту цифровую подпись создал владелец этого публичного ключа и никто иной. 

Откройте новый терминал, для клиента и сервера и установите пакет криптографии 

```sh
npm i ethereum-cryptography
``` 

На стороне клиента создайте папку `private`, а в ней скрипт генерации пары ключей `private/generate.cjs`.  

```js
const secp = require("ethereum-cryptography/secp256k1");
const {toHex} = require("ethereum-cryptography/utils");

const privateKey = secp.secp256k1.utils.randomPrivateKey();
console.log("private key: ", toHex(privateKey));
const publicKey = secp.secp256k1.getPublicKey(privateKey);
console.log("public key: ", toHex(publicKey));
```

Сгенерируйте три пары ключей и сохраните в папке `private/keys.txt`. 

!! Важно !! 
> Никогда не храните приватные ключи на диске в незашифрованном виде! 
> Для хранения приватных ключей есть специальные программы.
> Это учебный проект, поэтому здесь мы допускаем такое упрощение.

Измените адреса на публичные ключи в файле `server/index.js`

В браузере протестируйте отправку по новым публичным адресам. 

Добавьте переменную состояния `privateKey` в файле `client/src/App.jsx`

```js
const [privateKey, setPrivateKey] = useState("");
```

Добавьте передачу `privateKey, setPrivateKey` в свойства компонента `Wallet`

```js
<Wallet
    balance={balance}
    setBalance={setBalance}
    address={address}
    setAddress={setAddress}
    privateKey={privateKey}
    setPrivateKey={setPrivateKey}
/>
```

!! Важно !! 
> Никогда не вводите приватные ключи в формах браузера!
> В реальных проектах для передачи данных используются только цифровые подписи.
> Это учебный кошелек, поэтому здесь мы допускаем указание приватного ключа прямо в браузере.

В компоненте `Wallet` замените публичный адрес на приватный ключ:  
```js
<label>
    Private Key
    <input placeholder="Type your private key" value={privateKey} onChange={onChange}></input>
</label>
```

В компоненте `Wallet` измените логику метода `onChange`  
Теперь вместо публичного адреса для доступа к кошельку используется приватный ключ. 
Публичный ключ `address` вычисляется на стороне клиента.  
Далее он используется в запросе `server.get("balance/${address}")`.
Информация о состоянии балансов всех аккаунтов по-прежнему хранится на сервере. 

```js
import * as secp from "ethereum-cryptography/secp256k1";
import { toHex } from "ethereum-cryptography/utils"

function Wallet({ address, setAddress, balance, setBalance, privateKey, setPrivateKey }) {
  
  async function onChange(evt) {
    const privateKey = evt.target.value;
    setPrivateKey(privateKey);
    const address = toHex(secp.secp256k1.getPublicKey(privateKey));
    setAddress(address);
    if (address) {
      const {
        data: { balance },
      } = await server.get(`balance/${address}`);
      setBalance(balance);
    } else {
      setBalance(0);
    }
  }
}
```

Для передачи монет используется реакт компонент `Transfer`. 
Сейчас в его `props` содержится одна переменная `address`, которая используется для отправки запроса на сервер.
Количество монет и адрес получателя пользователь вводит в поля `Send Amount` и `Recipient` соответственно. 
Проблема заключается в том, что для совершения транзакции используется публично доступный адрес отправителя. 
Любой желающий может отправить монет, передав в поле `sender` адрес отправителя. 

Чтобы исключить эту возможность, нужно в методе `/send` на сервере получать не адрес, а цифровую подпись. 
Адрес должен быть извлечен из этой цифровой подписи. 

В файле `Transfer.jsx` импортируем нужные функции: 
```js
import { keccak256 } from "ethereum-cryptography/keccak.js"
import * as secp from "ethereum-cryptography/secp256k1";
```

В функции `transfer(evt)` вычислим хэш публичного адреса отправителя и его подпись `hexSign`: 

```js
evt.preventDefault();
const senderHash = keccak256(Uint8Array.from(address));
const signature = secp.secp256k1.sign(senderHash, privateKey);
const transaction = {
  sender: address,
  amount: parseInt(sendAmount),
  recipient: recipient,
  hexSign: signature.toCompactHex()
}
console.log("trx: ", transaction);
```

На сервере в файле `index.js` обработаем транзакцию таким образом, что списание баланса проходило только при истинном значении `isSigned`:

```js
const keccak256 = require("ethereum-cryptography/keccak.js").keccak256;
const secp256k1 = require("ethereum-cryptography/secp256k1").secp256k1;

app.post("/send", (req, res) => {
  const transaction = req.body;
  console.log(transaction);
  const { sender, recipient, amount, hexSign } = transaction;
  const senderHash = keccak256(Uint8Array.from(sender));
  const isSigned = secp256k1.verify(hexSign, senderHash, sender);
  console.log("Is signed: ", isSigned);
  if (isSigned){
    setInitialBalance(sender);
    setInitialBalance(recipient);
  
    if (balances[sender] < amount) {
      res.status(400).send({ message: "Not enough funds!" });
    } else {
      balances[sender] -= amount;
      balances[recipient] += amount;
      res.send({ balance: balances[sender] });
    }
  }
  else {
    res.status(400).send({ message: "Not signed!" });
  }
});
```

## Домашнее задание
Сейчас подписывается только адрес отправителя. 
Сделайте цифровую подпись для всех полей транзакции: отправителя, количества монет и получателя.
