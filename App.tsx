
import React, { useState, useEffect, useCallback } from 'react';
import { GameStatus, KeyStatus, TileStatus } from './types';
import { MAX_TRIES, WORD_LENGTH } from './constants';
import { wordService } from './services/wordService';

// --- Helper Functions ---
const normalizeString = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

const getGuessStatuses = (guess: string, solution: string): KeyStatus[] => {
  const normalizedSolution = normalizeString(solution);
  const guessLetters = guess.toUpperCase().split('');

  const statuses: KeyStatus[] = Array(WORD_LENGTH).fill(TileStatus.Absent);
  const letterCounts: { [key: string]: number } = {};

  normalizedSolution.split('').forEach(letter => {
    letterCounts[letter] = (letterCounts[letter] || 0) + 1;
  });

  // 1ª passada: Letras corretas (verde)
  guessLetters.forEach((letter, i) => {
    if (normalizedSolution[i] === letter) {
      statuses[i] = TileStatus.Correct;
      letterCounts[letter]--;
    }
  });

  // 2ª passada: Letras presentes (amarelo)
  guessLetters.forEach((letter, i) => {
    if (statuses[i] === TileStatus.Correct) return;

    if (letterCounts[letter] > 0) {
      statuses[i] = TileStatus.Present;
      letterCounts[letter]--;
    }
  });

  return statuses;
};


// --- Components ---

const Tile: React.FC<{ letter?: string; status: TileStatus; isRevealed?: boolean; revealDelay?: number }> = ({ letter, status, isRevealed, revealDelay = 0 }) => {
  const baseStyle = 'w-16 h-16 sm:w-14 sm:h-14 border-2 flex items-center justify-center text-3xl font-bold uppercase transition-all duration-500 transform-style-preserve-3d rounded-md';
  const statusStyles = {
    [TileStatus.Empty]: 'bg-transparent border-gray-300 dark:border-gray-600 text-black dark:text-white',
    [TileStatus.Typing]: 'bg-transparent border-gray-400 dark:border-gray-500 text-black dark:text-white scale-105',
    [TileStatus.Correct]: 'bg-green-500 border-green-500 text-white',
    [TileStatus.Present]: 'bg-yellow-500 border-yellow-500 text-white',
    [TileStatus.Absent]: 'bg-gray-500 border-gray-500 text-white dark:bg-gray-700 dark:border-gray-700',
  };

  const revealedStyle = isRevealed ? 'rotate-x-180' : '';
  const frontStyle = statusStyles[isRevealed ? TileStatus.Empty : status];
  const backStyle = `${statusStyles[status]} rotate-x-180`;
  
  const transitionStyle = {
      transitionDelay: `${isRevealed ? revealDelay : 0}ms`,
  };

  return (
    <div className={`${baseStyle} ${revealedStyle}`} style={transitionStyle}>
       <div className={`absolute w-full h-full backface-hidden ${frontStyle} flex items-center justify-center rounded-md`}>
        {isRevealed ? '' : letter}
      </div>
       <div className={`absolute w-full h-full backface-hidden ${backStyle} flex items-center justify-center rounded-md`}>
        {letter}
      </div>
    </div>
  );
};

const Row: React.FC<{ guess?: string; currentGuess?: string; solution: string; isCompleted?: boolean }> = ({ guess, currentGuess, solution, isCompleted }) => {
  const letters = (guess || currentGuess || '').padEnd(WORD_LENGTH, ' ').split('');
  const statuses = isCompleted && guess ? getGuessStatuses(guess, solution) : [];
  
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {letters.map((letter, i) => (
        <Tile 
          key={i} 
          letter={isCompleted ? guess?.charAt(i) : letter.trim()} 
          status={isCompleted ? statuses[i] : (letter.trim() ? TileStatus.Typing : TileStatus.Empty)}
          isRevealed={isCompleted}
          revealDelay={i * 100}
        />
      ))}
    </div>
  );
};

const Keyboard: React.FC<{ onKey: (key: string) => void; keyStatuses: { [key: string]: KeyStatus } }> = ({ onKey, keyStatuses }) => {
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENVIAR', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'APAGAR'],
  ];

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-1.5 w-full">
          {row.map(key => {
            const status = keyStatuses[key] || TileStatus.Empty;
            const statusStyles = {
              [TileStatus.Empty]: 'bg-gray-200 dark:bg-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600',
              [TileStatus.Correct]: 'bg-green-500 text-white',
              [TileStatus.Present]: 'bg-yellow-500 text-white',
              [TileStatus.Absent]: 'bg-gray-400 dark:bg-gray-700 text-white',
            };
            const isSpecialKey = key === 'ENVIAR' || key === 'APAGAR';
            const buttonStyle = `h-14 rounded font-bold uppercase flex items-center justify-center cursor-pointer transition-colors ${statusStyles[status]} ${isSpecialKey ? 'px-4 text-xs flex-grow' : 'flex-1'}`;
            
            return (
                <button key={key} onClick={() => onKey(key)} className={buttonStyle} aria-label={`Tecla ${key}`}>
                    {key}
                </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const Toast: React.FC<{ message: string }> = ({ message }) => {
    return (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-white text-white dark:text-black text-lg font-semibold px-6 py-3 rounded-md shadow-lg animate-fade-in-out">
            {message}
        </div>
    );
};

const Modal: React.FC<{ title: string; children: React.ReactNode; isOpen: boolean; onClose: () => void }> = ({ title, children, isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md mx-4 text-gray-800 dark:text-gray-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b pb-3 mb-4 border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold">{title}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-white" aria-label="Fechar modal">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

// --- Main App Component ---

export default function App() {
  const [solution, setSolution] = useState('');
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState<GameStatus>('PLAYING');
  const [keyStatuses, setKeyStatuses] = useState<{ [key: string]: KeyStatus }>({});
  const [toastMessage, setToastMessage] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initGame = async () => {
        try {
            await wordService.initialize();
            const word = await wordService.fetchWordOfTheDay();
            setSolution(word);
        } catch (err) {
            setError('Não foi possível carregar o jogo. Tente novamente mais tarde.');
        } finally {
            setIsLoading(false);
        }
    };
    
    initGame();
    
    const hasPlayedBefore = localStorage.getItem('playedBefore');
    if (!hasPlayedBefore) {
        setShowHelp(true);
        localStorage.setItem('playedBefore', 'true');
    }
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 2000);
  };

  const handleKeyInput = useCallback((key: string) => {
    if (gameStatus !== 'PLAYING') return;

    if (key === 'ENVIAR' || key === 'ENTER') {
      if (currentGuess.length !== WORD_LENGTH) {
        showToast('Letras insuficientes');
        return;
      }
      if (!wordService.isValidWord(currentGuess)) {
        showToast('Palavra não encontrada');
        return;
      }
      
      const newGuesses = [...guesses, currentGuess];
      setGuesses(newGuesses);

      const newKeyStatuses = { ...keyStatuses };
      const statuses = getGuessStatuses(currentGuess, solution);
      currentGuess.split('').forEach((letter, i) => {
          const currentStatus = newKeyStatuses[letter];
          const newStatus = statuses[i];
          if (currentStatus !== TileStatus.Correct) {
              if (currentStatus === TileStatus.Present && newStatus === TileStatus.Absent) return;
              newKeyStatuses[letter] = newStatus;
          }
      });
      setKeyStatuses(newKeyStatuses);
      
      setCurrentGuess('');

      if (normalizeString(currentGuess) === normalizeString(solution)) {
        setGameStatus('WON');
        setTimeout(() => setShowStats(true), 1000);
      } else if (newGuesses.length === MAX_TRIES) {
        setGameStatus('LOST');
        setTimeout(() => setShowStats(true), 1000);
      }
      return;
    }

    if (key === 'APAGAR' || key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
      return;
    }

    if (currentGuess.length < WORD_LENGTH && /^[A-Z]$/.test(key)) {
      setCurrentGuess(prev => prev + key);
    }
  }, [currentGuess, guesses, gameStatus, solution, keyStatuses]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let key = e.key.toUpperCase();
      if (key === 'BACKSPACE' || key === 'ENTER' || (key.length === 1 && key >= 'A' && key <= 'Z')) {
        handleKeyInput(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyInput]);

  const shareResult = () => {
    const title = gameStatus === 'WON' ? `PALAVRE ${guesses.length}/${MAX_TRIES}` : `PALAVRE X/${MAX_TRIES}`;
    const emojiGrid = guesses.map(guess => {
        return getGuessStatuses(guess, solution).map(status => {
            if (status === TileStatus.Correct) return '🟩';
            if (status === TileStatus.Present) return '🟨';
            return '⬛';
        }).join('');
    }).join('\n');
    
    const textToShare = `${title}\n\n${emojiGrid}`;
    navigator.clipboard.writeText(textToShare).then(() => showToast('Resultado copiado!'));
  };
  
  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-screen text-2xl font-bold text-gray-600 dark:text-gray-300">
            Carregando...
        </div>
    );
  }

  if (error) {
    return (
        <div className="flex justify-center items-center h-screen text-xl text-center text-red-500 p-4">
            {error}
        </div>
    );
  }

  const emptyRows = Array(gameStatus === 'PLAYING' ? MAX_TRIES - guesses.length - 1 : MAX_TRIES - guesses.length).fill('');

  return (
    <div className="flex flex-col h-screen max-h-[100dvh] text-center text-black dark:text-white p-4">
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 mb-4">
          <button onClick={() => setShowHelp(true)} aria-label="Ajuda">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4 0 2.21-1.79 4-4 4-1.742 0-3.223-.835-3.772-2M12 18v.01" /></svg>
          </button>
          <h1 className="text-4xl font-bold tracking-wider uppercase">PALAVRE</h1>
          <button onClick={() => setShowStats(true)} aria-label="Estatísticas">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </button>
      </header>
      
      {toastMessage && <Toast message={toastMessage} />}
      
      <main className="flex flex-col flex-grow items-center justify-center gap-4">
        <div className="grid grid-rows-6 gap-1.5">
          {guesses.map((guess, i) => (
            <Row key={i} guess={guess} solution={solution} isCompleted={true} />
          ))}
          {gameStatus === 'PLAYING' && (
            <Row currentGuess={currentGuess} solution={solution} />
          )}
          {emptyRows.map((_, i) => (
            <Row key={i} solution={solution} />
          ))}
        </div>
        
        <div className="w-full max-w-lg mt-4">
          <Keyboard onKey={handleKeyInput} keyStatuses={keyStatuses} />
        </div>
      </main>

      <Modal title="Como Jogar" isOpen={showHelp} onClose={() => setShowHelp(false)}>
        <div className="space-y-4 text-left">
          <p>Adivinhe a palavra em 6 tentativas.</p>
          <p>Cada palpite deve ser uma palavra de 5 letras válida. Pressione Enviar para submeter.</p>
          <p>Após cada tentativa, as cores dos blocos mudarão para mostrar o quão perto você está da palavra.</p>
          <hr className="dark:border-gray-600"/>
          <p className="font-bold">Exemplos</p>
          <div className="flex items-center gap-2">
            <Tile letter="S" status={TileStatus.Correct} isRevealed={true} />
            <Tile letter="A" status={TileStatus.Empty} isRevealed={true} />
            <Tile letter="G" status={TileStatus.Empty} isRevealed={true} />
            <Tile letter="A" status={TileStatus.Empty} isRevealed={true} />
            <Tile letter="Z" status={TileStatus.Empty} isRevealed={true} />
          </div>
          <p>A letra <span className="font-bold">S</span> está na palavra e na posição correta.</p>
          <div className="flex items-center gap-2">
            <Tile letter="V" status={TileStatus.Empty} isRevealed={true} />
            <Tile letter="I" status={TileStatus.Present} isRevealed={true} />
            <Tile letter="G" status={TileStatus.Empty} isRevealed={true} />
            <Tile letter="O" status={TileStatus.Empty} isRevealed={true} />
            <Tile letter="R" status={TileStatus.Empty} isRevealed={true} />
          </div>
          <p>A letra <span className="font-bold">I</span> está na palavra, mas na posição errada.</p>
          <div className="flex items-center gap-2">
            <Tile letter="M" status={TileStatus.Empty} isRevealed={true} />
            <Tile letter="U" status={TileStatus.Empty} isRevealed={true} />
            <Tile letter="T" status={TileStatus.Empty} isRevealed={true} />
            <Tile letter="U" status={TileStatus.Absent} isRevealed={true} />
            <Tile letter="A" status={TileStatus.Empty} isRevealed={true} />
          </div>
          <p>A letra <span className="font-bold">U</span> não está na palavra.</p>
        </div>
      </Modal>

      <Modal title={gameStatus === 'WON' ? 'Você Venceu!' : 'Fim de Jogo'} isOpen={showStats} onClose={() => setShowStats(false)}>
        <div className="space-y-4 text-center">
            {gameStatus !== 'WON' && (
                <p>A palavra era: <span className="font-bold text-xl tracking-widest">{solution}</span></p>
            )}
            <p className="text-lg">Compartilhe seu resultado!</p>
            <button 
                onClick={shareResult} 
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
                Copiar Resultado
            </button>
        </div>
      </Modal>

    </div>
  );
}