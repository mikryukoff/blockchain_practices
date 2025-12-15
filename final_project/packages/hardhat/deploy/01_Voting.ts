import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

// Функция развертывания контракта голосования
const deployVoting: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // Получаем аккаунт развертывающего из конфигурации
  const { deployer } = await hre.getNamedAccounts();
  // Получаем функцию развертывания из hardhat-deploy
  const { deploy } = hre.deployments;

  // Развертываем контракт SimpleVoting
  await deploy("SimpleVoting", {
    from: deployer, // Аккаунт, который развертывает контракт
    args: [], // Конструктор контракта не принимает аргументов
    log: true, // Включить логирование процесса развертывания
    autoMine: true, // Автоматически майнить транзакцию в локальной сети
  });

  // Получаем экземпляр развернутого контракта
  const voting = await hre.ethers.getContract("SimpleVoting", deployer);
  // Выводим адрес развернутого контракта
  console.log("✅ Voting contract deployed at:", await voting.getAddress());

  // Создаем тестовый опрос при развертывании для демонстрации работы
  console.log("📝 Creating sample poll...");
  const tx = await voting.createPoll(
    "Which blockchain has the best developer experience?", // Вопрос опроса
    ["Ethereum", "Solana", "Polygon", "Arbitrum"], // Варианты ответов
    60, // Длительность: 60 минут
  );
  // Ждем подтверждения транзакции
  await tx.wait();
  console.log("✅ Sample poll created!");
};

// Экспортируем функцию развертывания по умолчанию
export default deployVoting;
// Устанавливаем тег для функции развертывания (позволяет запускать отдельно)
deployVoting.tags = ["SimpleVoting"];
