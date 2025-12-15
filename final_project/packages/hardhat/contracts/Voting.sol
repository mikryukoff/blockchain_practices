// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Контракт системы голосования
contract SimpleVoting {
    // Структура для хранения информации об опросе
    struct Poll {
        string question;               // Вопрос опроса
        string[] options;              // Варианты ответов
        uint256[] votes;               // Количество голосов за каждый вариант
        address creator;               // Адрес создателя
        uint256 endTime;               // Время окончания опроса
        bool isActive;                 // Активен ли опрос
        mapping(address => bool) hasVoted; // Отслеживание голосовавших адресов
    }

    // Массив всех опросов
    Poll[] public polls;
    
    // События для отслеживания активности
    event PollCreated(uint256 pollId, string question, address creator);
    event Voted(uint256 pollId, uint256 optionIndex, address voter);
    event PollEnded(uint256 pollId, uint256 winningOption);

    // Функция создания нового опроса
    function createPoll(
        string memory _question, 
        string[] memory _options, 
        uint256 _durationInMinutes
    ) external returns (uint256) {
        // Проверка, что минимум 2 варианта
        require(_options.length >= 2, "At least 2 options required");
        
        uint256 pollId = polls.length;
        
        // Создаем новый опрос
        Poll storage newPoll = polls.push();
        newPoll.question = _question;
        newPoll.creator = msg.sender;
        newPoll.endTime = block.timestamp + (_durationInMinutes * 1 minutes);
        newPoll.isActive = true;
        
        // Инициализируем варианты и голоса
        for (uint i = 0; i < _options.length; i++) {
            newPoll.options.push(_options[i]);
            newPoll.votes.push(0);
        }
        
        // Генерируем событие
        emit PollCreated(pollId, _question, msg.sender);
        return pollId;
    }

    // Функция голосования
    function vote(uint256 _pollId, uint256 _optionIndex) external {
        // Проверка существования опроса
        require(_pollId < polls.length, "Poll does not exist");
        Poll storage poll = polls[_pollId];
        
        // Проверки условий голосования
        require(poll.isActive, "Poll is not active");
        require(block.timestamp < poll.endTime, "Poll has ended");
        require(!poll.hasVoted[msg.sender], "Already voted");
        require(_optionIndex < poll.options.length, "Invalid option");
        
        // Увеличиваем счетчик голосов
        poll.votes[_optionIndex] += 1;
        poll.hasVoted[msg.sender] = true;
        
        // Генерируем событие
        emit Voted(_pollId, _optionIndex, msg.sender);
    }

    // Функция завершения опроса
    function endPoll(uint256 _pollId) external {
        // Проверка существования опроса
        require(_pollId < polls.length, "Poll does not exist");
        Poll storage poll = polls[_pollId];
        
        // Проверки возможности завершения
        require(poll.isActive, "Poll already ended");
        // Только создатель может завершить до истечения времени
        // После истечения времени может любой
        require(msg.sender == poll.creator || block.timestamp >= poll.endTime, "Not authorized");
        
        // Деактивируем опрос
        poll.isActive = false;
        
        // Находим победителя
        uint256 winningOption = 0;
        uint256 maxVotes = 0;
        
        // Проходим по всем вариантам и ищем максимальное количество голосов
        for (uint256 i = 0; i < poll.votes.length; i++) {
            // Используем строгое неравенство, поэтому при равных голосах
            // побеждает первый вариант (с наименьшим индексом)
            if (poll.votes[i] > maxVotes) {
                maxVotes = poll.votes[i];
                winningOption = i;
            }
        }
        
        // Генерируем событие с ID победившего варианта
        emit PollEnded(_pollId, winningOption);
    }

    // Функция получения информации об опросе
    function getPollInfo(uint256 _pollId) external view returns (
        string memory question,
        string[] memory options,
        uint256[] memory votes,
        address creator,
        uint256 endTime,
        bool isActive,
        uint256 totalVotes
    ) {
        // Проверка существования опроса
        require(_pollId < polls.length, "Poll does not exist");
        Poll storage poll = polls[_pollId];
        
        // Подсчет общего количества голосов
        uint256 total = 0;
        for (uint256 i = 0; i < poll.votes.length; i++) {
            total += poll.votes[i];
        }
        
        // Возвращаем всю информацию об опросе
        return (
            poll.question,
            poll.options,
            poll.votes,
            poll.creator,
            poll.endTime,
            poll.isActive,
            total
        );
    }

    // Функция проверки, голосовал ли адрес в определенном опросе
    function hasAddressVoted(uint256 _pollId, address _voter) external view returns (bool) {
        // Проверка существования опроса
        require(_pollId < polls.length, "Poll does not exist");
        return polls[_pollId].hasVoted[_voter];
    }

    // Функция получения количества опросов
    function getPollsCount() external view returns (uint256) {
        return polls.length;
    }
}