import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

// Описание тестового набора для контракта SimpleVoting
describe("SimpleVoting Contract", function () {
  // Объявление переменных для контракта и аккаунтов
  let SimpleVoting: any;
  let simpleVoting: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  // Перед каждым тестом инициализируем контракт и аккаунты
  beforeEach(async function () {
    // Получаем тестовые аккаунты
    [owner, addr1, addr2] = await ethers.getSigners();
    // Получаем фабрику контракта
    SimpleVoting = await ethers.getContractFactory("SimpleVoting");
    // Развертываем контракт
    simpleVoting = await SimpleVoting.deploy();
  });

  // Тестирование создания опросов
  describe("Poll Creation", function () {
    // Тест: должен создавать новый опрос
    it("Should create a new poll", async function () {
      const question = "Favorite color?";
      const options = ["Red", "Blue", "Green"];

      // Проверяем, что событие PollCreated вызывается с правильными аргументами
      await expect(simpleVoting.createPoll(question, options, 10))
        .to.emit(simpleVoting, "PollCreated")
        .withArgs(0, question, owner.address);

      // Получаем информацию о созданном опросе
      const pollInfo = await simpleVoting.getPollInfo(0);
      // Проверяем, что все поля заполнены правильно
      expect(pollInfo.question).to.equal(question);
      expect(pollInfo.options).to.deep.equal(options);
      expect(pollInfo.votes).to.deep.equal([0, 0, 0]);
      expect(pollInfo.creator).to.equal(owner.address);
      expect(pollInfo.isActive).to.equal(true);
      expect(pollInfo.totalVotes).to.equal(0);
    });

    // Тест: должен требовать минимум 2 варианта ответа
    it("Should require at least 2 options", async function () {
      const question = "Test question";
      const options = ["Only one option"];

      // Ожидаем, что транзакция будет отклонена с указанной ошибкой
      await expect(simpleVoting.createPoll(question, options, 10)).to.be.revertedWith("At least 2 options required");
    });

    // Тест: должен возвращать правильное количество опросов
    it("Should return correct poll count", async function () {
      // Проверяем начальное количество опросов
      expect(await simpleVoting.getPollsCount()).to.equal(0);

      // Создаем первый опрос
      await simpleVoting.createPoll("Q1", ["A", "B"], 10);
      expect(await simpleVoting.getPollsCount()).to.equal(1);

      // Создаем второй опрос
      await simpleVoting.createPoll("Q2", ["C", "D"], 20);
      expect(await simpleVoting.getPollsCount()).to.equal(2);
    });
  });

  // Тестирование процесса голосования
  describe("Voting", function () {
    // Перед каждым тестом создаем тестовый опрос
    beforeEach(async function () {
      await simpleVoting.createPoll("Test Poll", ["Option 1", "Option 2", "Option 3"], 10);
    });

    // Тест: должен разрешать голосование
    it("Should allow voting", async function () {
      // Проверяем событие голосования
      await expect(simpleVoting.connect(addr1).vote(0, 0)).to.emit(simpleVoting, "Voted").withArgs(0, 0, addr1.address);

      // Проверяем, что голос учтен
      const pollInfo = await simpleVoting.getPollInfo(0);
      expect(pollInfo.votes[0]).to.equal(1);
      expect(pollInfo.totalVotes).to.equal(1);
      expect(await simpleVoting.hasAddressVoted(0, addr1.address)).to.equal(true);
    });

    // Тест: должен предотвращать повторное голосование
    it("Should prevent double voting", async function () {
      // Первое голосование
      await simpleVoting.connect(addr1).vote(0, 0);

      // Ожидаем ошибку при попытке проголосовать снова
      await expect(simpleVoting.connect(addr1).vote(0, 1)).to.be.revertedWith("Already voted");
    });

    // Тест: должен предотвращать голосование после окончания времени
    it("Should prevent voting after poll end time", async function () {
      // Ускоряем время на 11 минут (больше чем длительность опроса 10 минут)
      await time.increase(11 * 60);

      // Ожидаем ошибку при попытке проголосовать
      await expect(simpleVoting.connect(addr1).vote(0, 0)).to.be.revertedWith("Poll has ended");
    });

    // Тест: должен предотвращать голосование в неактивном опросе
    it("Should prevent voting on inactive poll", async function () {
      // Завершаем опрос как создатель
      await simpleVoting.endPoll(0);

      // Ожидаем ошибку при попытке проголосовать
      await expect(simpleVoting.connect(addr1).vote(0, 0)).to.be.revertedWith("Poll is not active");
    });

    // Тест: должен предотвращать голосование за несуществующий вариант
    it("Should prevent voting with invalid option index", async function () {
      // Ожидаем ошибку при попытке проголосовать за несуществующий вариант
      await expect(simpleVoting.connect(addr1).vote(0, 5)).to.be.revertedWith("Invalid option");
    });

    // Тест: должен правильно подсчитывать общее количество голосов
    it("Should calculate total votes correctly with multiple voters", async function () {
      // Голосуют два разных пользователя
      await simpleVoting.connect(addr1).vote(0, 0);
      await simpleVoting.connect(addr2).vote(0, 1);

      // Проверяем распределение голосов
      const pollInfo = await simpleVoting.getPollInfo(0);
      expect(pollInfo.votes[0]).to.equal(1);
      expect(pollInfo.votes[1]).to.equal(1);
      expect(pollInfo.votes[2]).to.equal(0);
      expect(pollInfo.totalVotes).to.equal(2);
    });
  });

  // Тестирование завершения опросов
  describe("Ending Poll", function () {
    // Перед каждым тестом создаем тестовый опрос
    beforeEach(async function () {
      await simpleVoting.createPoll("Test Poll", ["A", "B", "C"], 10);
    });

    // Тест: должен позволять создателю завершить опрос в любое время
    it("Should allow creator to end poll anytime", async function () {
      // Проверяем событие завершения опроса
      await expect(simpleVoting.endPoll(0)).to.emit(simpleVoting, "PollEnded").withArgs(0, 0); // При отсутствии голосов победителем считается первый вариант

      // Проверяем, что опрос деактивирован
      const pollInfo = await simpleVoting.getPollInfo(0);
      expect(pollInfo.isActive).to.equal(false);
    });

    // Тест: должен позволять любому завершить опрос после истечения времени
    it("Should allow anyone to end poll after time expires", async function () {
      // Ускоряем время на 11 минут
      await time.increase(11 * 60);

      // Проверяем, что не-создатель может завершить опрос
      await expect(simpleVoting.connect(addr1).endPoll(0)).to.emit(simpleVoting, "PollEnded").withArgs(0, 0);

      // Проверяем, что опрос деактивирован
      const pollInfo = await simpleVoting.getPollInfo(0);
      expect(pollInfo.isActive).to.equal(false);
    });

    // Тест: должен предотвращать завершение опроса не-создателем до истечения времени
    it("Should prevent non-creator from ending poll before time", async function () {
      // Ожидаем ошибку при попытке завершить опрос
      await expect(simpleVoting.connect(addr1).endPoll(0)).to.be.revertedWith("Not authorized");
    });

    // Тест: должен предотвращать повторное завершение уже завершенного опроса
    it("Should prevent ending already ended poll", async function () {
      // Завершаем опрос
      await simpleVoting.endPoll(0);

      // Ожидаем ошибку при попытке завершить опрос снова
      await expect(simpleVoting.endPoll(0)).to.be.revertedWith("Poll already ended");
    });

    // Тест: должен правильно определять победивший вариант
    it("Should calculate winning option correctly", async function () {
      // Голосуем так, чтобы Option C получила больше голосов
      await simpleVoting.connect(addr1).vote(0, 0); // Option A - 1 голос
      await simpleVoting.connect(addr2).vote(0, 2); // Option C - 1 голос
      // Добавляем еще голос за Option C, чтобы она явно победила
      await simpleVoting.connect(owner).vote(0, 2); // Option C - теперь 2 голоса

      // Создаем второй опрос (чтобы показать независимость опросов)
      await simpleVoting.createPoll("Another Poll", ["X", "Y"], 10);
      // Голосуем во втором опросе за допустимый вариант
      await simpleVoting.connect(addr1).vote(1, 0);

      // Создатель завершает первый опрос
      // Ожидаем, что победителем будет Option C (индекс 2)
      await expect(simpleVoting.endPoll(0)).to.emit(simpleVoting, "PollEnded").withArgs(0, 2);

      // Проверяем, что опрос деактивирован
      const pollInfo = await simpleVoting.getPollInfo(0);
      expect(pollInfo.isActive).to.equal(false);
    });

    // Тест: должен обрабатывать ничью (побеждает первый вариант с максимальными голосами)
    it("Should handle tie in votes (first option with max votes wins)", async function () {
      // Голосуем так, чтобы было ничья между Option A и Option B
      await simpleVoting.connect(addr1).vote(0, 0); // Option A - 1 голос
      await simpleVoting.connect(addr2).vote(0, 1); // Option B - 1 голос

      // Из-за использования строгого неравенства в контракте,
      // при равных голосах побеждает первый вариант
      await expect(simpleVoting.endPoll(0)).to.emit(simpleVoting, "PollEnded").withArgs(0, 0); // Option A (индекс 0) побеждает
    });
  });

  // Тестирование получения информации об опросе
  describe("Poll Information", function () {
    // Тест: должен возвращать правильную информацию об опросе
    it("Should return correct poll info", async function () {
      const question = "What is your favorite programming language?";
      const options = ["JavaScript", "TypeScript", "Solidity", "Rust"];
      const duration = 30;

      // Создаем опрос
      await simpleVoting.createPoll(question, options, duration);

      // Получаем информацию об опросе
      const pollInfo = await simpleVoting.getPollInfo(0);
      // Проверяем все поля
      expect(pollInfo.question).to.equal(question);
      expect(pollInfo.options).to.deep.equal(options);
      expect(pollInfo.votes).to.deep.equal([0, 0, 0, 0]);
      expect(pollInfo.creator).to.equal(owner.address);
      expect(pollInfo.isActive).to.equal(true);
      expect(pollInfo.totalVotes).to.equal(0);

      // Проверяем время окончания (должно быть примерно текущее время + длительность)
      const blockTime = await time.latest();
      expect(pollInfo.endTime).to.be.closeTo(blockTime + duration * 60, 10);
    });

    // Тест: должен отклонять запросы для несуществующего опроса
    it("Should revert for non-existent poll", async function () {
      // Проверяем все функции на несуществующем опросе
      await expect(simpleVoting.getPollInfo(999)).to.be.revertedWith("Poll does not exist");

      await expect(simpleVoting.hasAddressVoted(999, addr1.address)).to.be.revertedWith("Poll does not exist");

      await expect(simpleVoting.vote(999, 0)).to.be.revertedWith("Poll does not exist");

      await expect(simpleVoting.endPoll(999)).to.be.revertedWith("Poll does not exist");
    });
  });

  // Интеграционные тесты
  describe("Integration Tests", function () {
    // Тест: должен обрабатывать несколько опросов независимо
    it("Should handle multiple polls independently", async function () {
      // Создаем несколько опросов
      await simpleVoting.createPoll("Poll 1", ["A1", "B1"], 10);
      await simpleVoting.createPoll("Poll 2", ["A2", "B2", "C2"], 20);

      // Голосуем в разных опросах
      await simpleVoting.connect(addr1).vote(0, 0); // Poll 1, Option 0
      await simpleVoting.connect(addr2).vote(0, 1); // Poll 1, Option 1
      await simpleVoting.connect(addr1).vote(1, 2); // Poll 2, Option 2

      // Проверяем Poll 1
      const poll1Info = await simpleVoting.getPollInfo(0);
      expect(poll1Info.totalVotes).to.equal(2);
      expect(poll1Info.votes[0]).to.equal(1);
      expect(poll1Info.votes[1]).to.equal(1);

      // Проверяем Poll 2
      const poll2Info = await simpleVoting.getPollInfo(1);
      expect(poll2Info.totalVotes).to.equal(1);
      expect(poll2Info.votes[2]).to.equal(1);

      // Проверяем статус голосования для разных опросов
      expect(await simpleVoting.hasAddressVoted(0, addr1.address)).to.equal(true);
      expect(await simpleVoting.hasAddressVoted(0, addr2.address)).to.equal(true);
      expect(await simpleVoting.hasAddressVoted(1, addr1.address)).to.equal(true);
      expect(await simpleVoting.hasAddressVoted(1, addr2.address)).to.equal(false);
    });

    // Тест: должен позволять голосовать, завершать и проверять статус последовательно
    it("Should allow voting, ending, and checking status in sequence", async function () {
      // Создаем опрос
      await simpleVoting.createPoll("Sequential Test", ["Yes", "No"], 5);

      // Проверяем начальное состояние
      expect(await simpleVoting.hasAddressVoted(0, addr1.address)).to.equal(false);

      // Голосуем
      await simpleVoting.connect(addr1).vote(0, 0);
      expect(await simpleVoting.hasAddressVoted(0, addr1.address)).to.equal(true);

      // Ускоряем время
      await time.increase(6 * 60);

      // Завершаем опрос (теперь может любой)
      await simpleVoting.connect(addr2).endPoll(0);

      // Проверяем, что опрос завершен
      const pollInfo = await simpleVoting.getPollInfo(0);
      expect(pollInfo.isActive).to.equal(false);

      // Нельзя голосовать в завершенном опросе
      await expect(simpleVoting.connect(addr2).vote(0, 1)).to.be.revertedWith("Poll is not active");
    });
  });
});
