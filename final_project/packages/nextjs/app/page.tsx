"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

// 🔧 Компонент для отображения адреса Ethereum в сокращенном формате
const AddressComponent = ({ address }: { address: string }) => (
  <span className="font-mono text-sm bg-base-200 px-2 py-1 rounded">
    {address?.slice(0, 6)}...{address?.slice(-4)}
  </span>
);

// 🔧 Функция для форматирования оставшегося времени в читаемый вид
const formatTimeLeft = (seconds: number) => {
  if (seconds <= 0) return "Expired";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

// Основной компонент страницы голосования
export default function Home() {
  // Хуки для работы с кошельком и состоянием
  const { address, isConnected } = useAccount();
  const [pollId, setPollId] = useState<number>(0); // ID текущего опроса
  const [newQuestion, setNewQuestion] = useState(""); // Вопрос нового опроса
  const [newOptionInput, setNewOptionInput] = useState(""); // Ввод нового варианта ответа
  const [optionsList, setOptionsList] = useState<string[]>(["Option 1", "Option 2"]); // Список вариантов для нового опроса
  const [duration, setDuration] = useState(10); // Длительность опроса в минутах
  const [selectedOption, setSelectedOption] = useState<number>(-1); // Выбранный вариант для голосования
  const [isCreatingPoll, setIsCreatingPoll] = useState(false); // Флаг создания опроса
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000)); // Текущее время в секундах
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(
    null,
  ); // Уведомления

  // Получаем информацию о развернутом контракте SimpleVoting
  const { data: deployedContractData, isLoading: isLoadingContract } = useDeployedContractInfo("SimpleVoting");

  // Обновляем текущее время каждую секунду для корректного отображения таймера
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Автоматически скрываем уведомления через 3 секунды
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Чтение данных: получаем общее количество опросов
  const { data: pollsCount, refetch: refetchCount } = useReadContract({
    address: deployedContractData?.address,
    abi: deployedContractData?.abi,
    functionName: "getPollsCount",
  });

  // Чтение данных: получаем информацию о текущем опросе
  const { data: pollInfo, refetch: refetchPoll } = useReadContract({
    address: deployedContractData?.address,
    abi: deployedContractData?.abi,
    functionName: "getPollInfo",
    args: pollId !== undefined ? [BigInt(pollId)] : undefined,
  });

  // 🔧 Функция для парсинга данных из контракта в удобный формат
  const parsePollInfo = (info: any) => {
    if (!info || !Array.isArray(info) || info.length < 7) return null;

    return {
      question: String(info[0] || ""),
      options: Array.isArray(info[1]) ? info[1].map((o: any) => String(o)) : [],
      votes: Array.isArray(info[2]) ? info[2].map((v: any) => Number(v) || 0) : [],
      creator: String(info[3] || "0x0"),
      endTime: Number(info[4] || 0),
      isActive: Boolean(info[5]),
      totalVotes: Number(info[6] || 0),
    };
  };

  const parsedPollInfo = parsePollInfo(pollInfo);

  // Рассчитываем оставшееся время для текущего опроса
  const timeLeft = parsedPollInfo ? Math.max(0, parsedPollInfo.endTime - currentTime) : 0;
  const isTimeExpired = timeLeft <= 0;

  // Хуки для записи в контракт (вызов функций)
  const { writeContractAsync: createPoll, data: createPollHash } = useWriteContract();
  const { writeContractAsync: vote, data: voteHash } = useWriteContract();
  const { writeContractAsync: endPoll, data: endPollHash } = useWriteContract();

  // Хуки для ожидания подтверждения транзакций
  const { isLoading: isConfirmingCreate, isSuccess: isCreated } = useWaitForTransactionReceipt({
    hash: createPollHash,
  });

  const { isLoading: isConfirmingVote, isSuccess: isVoted } = useWaitForTransactionReceipt({
    hash: voteHash,
  });

  const { isLoading: isConfirmingEnd, isSuccess: isEnded } = useWaitForTransactionReceipt({
    hash: endPollHash,
  });

  // Обновляем данные после успешных транзакций с небольшой задержкой
  useEffect(() => {
    if (isCreated || isVoted || isEnded) {
      setTimeout(() => {
        refetchCount();
        refetchPoll();
      }, 2000);
    }
  }, [isCreated, isVoted, isEnded]);

  // 🔧 Функция для добавления нового варианта ответа при создании опроса
  const addOption = () => {
    if (newOptionInput.trim() === "") {
      setNotification({ message: "Please enter an option!", type: "error" });
      return;
    }

    if (optionsList.includes(newOptionInput.trim())) {
      setNotification({ message: "This option already exists!", type: "error" });
      return;
    }

    setOptionsList([...optionsList, newOptionInput.trim()]);
    setNewOptionInput("");
  };

  // 🔧 Функция для удаления варианта ответа при создании опроса
  const removeOption = (index: number) => {
    const newOptions = [...optionsList];
    newOptions.splice(index, 1);
    setOptionsList(newOptions);
  };

  // 🔧 Функция создания нового опроса
  const handleCreatePoll = async () => {
    if (!newQuestion) {
      setNotification({ message: "Please enter a question!", type: "error" });
      return;
    }

    if (!deployedContractData?.address) {
      setNotification({ message: "Contract not deployed!", type: "error" });
      return;
    }

    if (optionsList.length < 2) {
      setNotification({ message: "Please add at least 2 options!", type: "error" });
      return;
    }

    setIsCreatingPoll(true);

    try {
      console.log("Creating poll with:", {
        address: deployedContractData.address,
        question: newQuestion,
        options: optionsList,
        duration: duration,
      });

      // Вызов функции createPoll контракта
      await createPoll({
        address: deployedContractData.address,
        abi: deployedContractData.abi,
        functionName: "createPoll",
        args: [newQuestion, optionsList, BigInt(duration)],
      });

      setNotification({ message: "Creating poll...", type: "info" });
    } catch (error: any) {
      console.error("Error creating poll:", error);
      setNotification({
        message: `Error: ${error.shortMessage || error.message}`,
        type: "error",
      });
      setIsCreatingPoll(false);
    }
  };

  // Сброс полей формы после успешного создания опроса
  useEffect(() => {
    if (isCreated) {
      setNewQuestion("");
      setOptionsList(["Option 1", "Option 2"]);
      setNewOptionInput("");
      setIsCreatingPoll(false);
      setNotification({ message: "✅ Poll created successfully!", type: "success" });

      // Переключаемся на только что созданный опрос
      if (pollsCount) {
        setTimeout(() => {
          setPollId(Number(pollsCount) - 1);
        }, 1000);
      }
    }
  }, [isCreated, pollsCount]);

  // 🔧 Функция для отправки голоса
  const handleVote = async () => {
    if (!isConnected) {
      setNotification({ message: "Please connect your wallet first!", type: "error" });
      return;
    }

    if (!deployedContractData?.address) {
      setNotification({ message: "Contract not deployed!", type: "error" });
      return;
    }

    if (selectedOption === -1) {
      setNotification({ message: "Please select an option to vote!", type: "error" });
      return;
    }

    try {
      console.log("Voting with:", {
        address: deployedContractData.address,
        pollId: pollId,
        option: selectedOption,
      });

      // Вызов функции vote контракта
      await vote({
        address: deployedContractData.address,
        abi: deployedContractData.abi,
        functionName: "vote",
        args: [BigInt(pollId), BigInt(selectedOption)],
      });
      setNotification({ message: "Vote submitted! Waiting for confirmation...", type: "info" });
    } catch (error: any) {
      console.error("Error voting:", error);
      setNotification({
        message: `Error: ${error.shortMessage || error.message}`,
        type: "error",
      });
    }
  };

  // 🔧 Функция для завершения опроса
  const handleEndPoll = async () => {
    if (!parsedPollInfo || !deployedContractData?.address) return;

    try {
      console.log("Ending poll with:", {
        address: deployedContractData.address,
        pollId: pollId,
      });

      // Вызов функции endPoll контракта
      await endPoll({
        address: deployedContractData.address,
        abi: deployedContractData.abi,
        functionName: "endPoll",
        args: [BigInt(pollId)],
      });
      setNotification({ message: "Ending poll...", type: "info" });
    } catch (error: any) {
      console.error("Error ending poll:", error);
      setNotification({
        message: `Error: ${error.shortMessage || error.message}`,
        type: "error",
      });
    }
  };

  // 🔧 Функция для проверки активности опроса
  const isPollActive = () => {
    if (!parsedPollInfo) return false;

    // Проверяем, активен ли опрос по времени и статусу
    const isTimeActive = parsedPollInfo.endTime > currentTime;

    return parsedPollInfo.isActive && isTimeActive;
  };

  // 🔧 Функция для расчета процентного соотношения голосов для каждого варианта
  const getOptionPercentage = (votes: number) => {
    if (!parsedPollInfo || parsedPollInfo.totalVotes === 0) return 0;
    return (votes / parsedPollInfo.totalVotes) * 100;
  };

  // 🔧 Функция для проверки, может ли пользователь завершить опрос
  const canEndPoll = () => {
    if (!parsedPollInfo || !address) return false;

    const isCreator = parsedPollInfo.creator.toLowerCase() === address.toLowerCase();
    return isCreator || isTimeExpired;
  };

  // 🔧 Функция для определения роли пользователя (создатель или участник)
  const getUserStatus = () => {
    if (!parsedPollInfo || !address) return "Unknown";

    const isCreator = parsedPollInfo.creator.toLowerCase() === address.toLowerCase();
    return isCreator ? "Creator" : "Voter";
  };

  // Показываем индикатор загрузки при загрузке контракта
  if (isLoadingContract) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">🗳️ Decentralized Voting System</h1>

      {/* 🔧 Компонент для отображения уведомлений */}
      {notification && (
        <div className="toast toast-top toast-end z-50">
          <div
            className={`alert ${notification.type === "error" ? "alert-error" : notification.type === "success" ? "alert-success" : "alert-info"}`}
          >
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {!isConnected ? (
        // Показать сообщение, если кошелек не подключен
        <div className="text-center p-8 bg-base-200 rounded-xl">
          <p className="text-xl mb-4">Please connect your wallet to interact with the voting system</p>
        </div>
      ) : (
        <>
          {/* Кнопка для ручного обновления данных */}
          <div className="flex justify-end mb-6">
            <button
              className="btn btn-sm btn-outline"
              onClick={() => {
                refetchCount();
                refetchPoll();
              }}
            >
              🔄 Refresh Data
            </button>
          </div>

          {/* Карточка создания нового опроса */}
          <div className="card bg-base-100 shadow-xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Create New Poll</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Poll question"
                className="input input-bordered w-full"
                value={newQuestion}
                onChange={e => setNewQuestion(e.target.value)}
              />

              {/* Динамическое добавление вариантов ответов */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter option"
                    className="input input-bordered flex-1"
                    value={newOptionInput}
                    onChange={e => setNewOptionInput(e.target.value)}
                    onKeyPress={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOption();
                      }
                    }}
                  />
                  <button className="btn btn-primary" onClick={addOption} type="button">
                    +
                  </button>
                </div>

                {/* Список уже добавленных вариантов */}
                {optionsList.length > 0 && (
                  <div className="space-y-2">
                    <label className="label">
                      <span className="label-text">Options ({optionsList.length})</span>
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                      {optionsList.map((option, index) => (
                        <div key={index} className="flex justify-between items-center bg-base-200 p-2 rounded">
                          <span>{option}</span>
                          <button className="btn btn-xs btn-error" onClick={() => removeOption(index)} type="button">
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Выбор длительности опроса */}
              <div className="flex items-center gap-4">
                <span>Duration (minutes):</span>
                <input
                  type="range"
                  min="1"
                  max="1440"
                  value={duration}
                  onChange={e => setDuration(parseInt(e.target.value))}
                  className="range range-primary"
                />
                <span>{duration} min</span>
              </div>
              <button
                className={`btn btn-primary w-full ${isCreatingPoll ? "loading" : ""}`}
                onClick={handleCreatePoll}
                disabled={isCreatingPoll || isConfirmingCreate || !deployedContractData}
              >
                {isCreatingPoll || isConfirmingCreate ? "Creating..." : "Create Poll"}
              </button>
            </div>
          </div>

          {/* Навигация между существующими опросами */}
          {pollsCount && Number(pollsCount) > 0 ? (
            <div className="card bg-base-100 shadow-xl p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4">Browse Polls ({Number(pollsCount || 0)} total)</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {Array.from({ length: Number(pollsCount) }).map((_, idx) => (
                  <button
                    key={idx}
                    className={`btn ${pollId === idx ? "btn-primary" : "btn-outline"}`}
                    onClick={() => setPollId(idx)}
                  >
                    Poll #{idx}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="card bg-base-100 shadow-xl p-6 mb-8">
              <p className="text-center text-gray-500">No polls created yet. Create the first one!</p>
            </div>
          )}

          {/* Отображение информации о текущем опросе */}
          {parsedPollInfo ? (
            <div className="card bg-base-100 shadow-xl p-6 mb-8">
              <h2 className="text-2xl font-bold mb-2">{parsedPollInfo.question}</h2>
              <div className="text-sm text-gray-500 mb-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span>Created by:</span>
                  <AddressComponent address={parsedPollInfo.creator} />
                  {isPollActive() ? (
                    <span className="badge badge-success">Active</span>
                  ) : (
                    <span className="badge badge-error">Ended</span>
                  )}
                  {parsedPollInfo.creator.toLowerCase() === address?.toLowerCase() && (
                    <span className="badge badge-info">You created this</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-xs">
                  <span>Ends: {new Date(parsedPollInfo.endTime * 1000).toLocaleString()}</span>
                  {isPollActive() ? (
                    <span className="text-warning">Time left: {formatTimeLeft(timeLeft)}</span>
                  ) : (
                    <span className="text-error">Poll ended</span>
                  )}
                </div>
              </div>

              {/* Отображение вариантов ответов с прогресс-барами */}
              <div className="space-y-4 mb-6">
                {parsedPollInfo.options.map((option: string, idx: number) => {
                  const voteCount = parsedPollInfo.votes[idx] || 0;
                  const percentage = getOptionPercentage(voteCount);

                  return (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{option}</span>
                        <span className="badge badge-primary">{voteCount} votes</span>
                      </div>
                      {parsedPollInfo.totalVotes > 0 && (
                        <>
                          <progress className="progress progress-primary w-full" value={percentage} max="100" />
                          <div className="text-xs text-right mt-1">{percentage.toFixed(1)}%</div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Статистика опроса */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-title">Total Votes</div>
                  <div className="stat-value text-lg">{parsedPollInfo.totalVotes}</div>
                </div>
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-title">Options</div>
                  <div className="stat-value text-lg">{parsedPollInfo.options.length}</div>
                </div>
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-title">Status</div>
                  <div className="stat-value text-lg">{isPollActive() ? "Active" : "Ended"}</div>
                </div>
              </div>

              {/* Кнопки действий: голосование и завершение опроса */}
              <div className="flex flex-col gap-4">
                {/* Блок голосования (только для активных опросов) */}
                {isPollActive() && (
                  <div className="flex gap-4">
                    <select
                      className="select select-bordered flex-1"
                      value={selectedOption}
                      onChange={e => setSelectedOption(parseInt(e.target.value))}
                    >
                      <option value={-1}>Select an option</option>
                      {parsedPollInfo.options.map((option: string, idx: number) => (
                        <option key={idx} value={idx}>
                          {option}
                        </option>
                      ))}
                    </select>

                    <button
                      className={`btn btn-success`}
                      onClick={handleVote}
                      disabled={isConfirmingVote || !deployedContractData || selectedOption === -1}
                    >
                      {isConfirmingVote ? "Voting..." : "Vote"}
                    </button>
                  </div>
                )}

                {/* Блок завершения опроса (только для активных опросов) */}
                {parsedPollInfo.isActive && (
                  <div className="flex gap-2">
                    <button
                      className={`btn ${canEndPoll() ? "btn-warning" : "btn-disabled"} flex-1`}
                      onClick={handleEndPoll}
                      disabled={isConfirmingEnd || !deployedContractData || !canEndPoll()}
                    >
                      {isConfirmingEnd ? "Ending..." : "End Poll"}
                    </button>

                    {/* Информация о правах завершения опроса */}
                    <div className="text-xs text-gray-500 self-center">
                      {parsedPollInfo.creator.toLowerCase() === address?.toLowerCase()
                        ? "You created this poll - can end anytime"
                        : isTimeExpired
                          ? "Time expired - you can end poll"
                          : "Only creator can end before time expires"}
                      {!canEndPoll() && " (cannot end yet)"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : pollsCount && Number(pollsCount) > 0 ? (
            // Сообщение о загрузке опроса
            <div className="card bg-base-100 shadow-xl p-6 mb-8">
              <p className="text-center text-gray-500">Loading poll #{pollId}...</p>
            </div>
          ) : null}

          {/* Общая статистика */}
          <div className="stats shadow">
            <div className="stat">
              <div className="stat-title">Total Polls</div>
              <div className="stat-value">{Number(pollsCount || 0)}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Current Poll Votes</div>
              <div className="stat-value">{parsedPollInfo ? parsedPollInfo.totalVotes : 0}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Your Role</div>
              <div className="stat-value">{getUserStatus()}</div>
            </div>
          </div>

          {/* Отладочная информация (можно скрыть в продакшене) */}
          <div className="mt-8 p-4 bg-base-200 rounded-lg">
            <details>
              <summary className="cursor-pointer font-bold">Debug Information</summary>
              <pre className="text-xs mt-2">
                {JSON.stringify(
                  {
                    pollId,
                    pollsCount: Number(pollsCount || 0),
                    parsedPollInfo: parsedPollInfo
                      ? {
                          ...parsedPollInfo,
                          creator: parsedPollInfo.creator,
                          isActive: parsedPollInfo.isActive,
                        }
                      : null,
                    address,
                    currentTime,
                    contractAddress: deployedContractData?.address,
                    isCreator: parsedPollInfo?.creator.toLowerCase() === address?.toLowerCase(),
                    selectedOption,
                    timeLeft,
                    isTimeExpired,
                    canEndPoll: canEndPoll(),
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
          </div>
        </>
      )}
    </div>
  );
}
