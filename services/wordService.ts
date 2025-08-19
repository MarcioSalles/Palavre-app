import { WORD_LENGTH } from '../constants';

const normalizeString = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

class WordService {
  // Armazena palavras que podem ser a solução do dia
  private solutions: string[] = [];
  // Armazena palavras originais com acentos
  private validGuessesWithAccents: Set<string> = new Set();
  // Armazena palavras normalizadas (sem acentos) para validação rápida
  private validGuessesNormalized: Set<string> = new Set();
  
  private isInitializedPromise: Promise<void> | null = null;

  public initialize(): Promise<void> {
    if (this.isInitializedPromise) {
      return this.isInitializedPromise;
    }

    this.isInitializedPromise = (async () => {
      try {
        // Use jsDelivr to fetch word lists from a reliable GitHub repository.
        // This source provides the necessary CORS headers to avoid fetch errors in the browser.
        const solutionsUrl = 'https://cdn.jsdelivr.net/gh/fserb/pt-br-wordlist@latest/palavras.txt';
        const validGuessesUrl = 'https://cdn.jsdelivr.net/gh/fserb/pt-br-wordlist@latest/validas.txt';

        const [solutionsResponse, validGuessesResponse] = await Promise.all([
          fetch(solutionsUrl),
          fetch(validGuessesUrl),
        ]);

        if (!solutionsResponse.ok || !validGuessesResponse.ok) {
            throw new Error(`Erro ao buscar a lista de palavras.`);
        }
        
        const solutionsText = await solutionsResponse.text();
        const validGuessesText = await validGuessesResponse.text();
        
        // The solutions list (`palavras.txt`) contains the possible words of the day.
        this.solutions = solutionsText.split('\n').map(word => word.trim().toLowerCase()).filter(word => word.length === WORD_LENGTH);
        
        // The valid guesses list (`validas.txt`) contains all acceptable words for guessing.
        const allValidWords = new Set(validGuessesText.split('\n').map(word => word.trim().toLowerCase()).filter(word => word.length > 0));

        // Add solutions to the valid words list as well, as `validas.txt` might not contain them all.
        this.solutions.forEach(word => allValidWords.add(word));
        
        allValidWords.forEach(word => {
            if (word.length === WORD_LENGTH) { 
                this.validGuessesWithAccents.add(word);
                this.validGuessesNormalized.add(normalizeString(word));
            }
        });
        
        console.log(`Serviço inicializado com ${this.solutions.length} soluções e ${this.validGuessesWithAccents.size} palavras válidas.`);
      } catch (error) {
        console.error("Não foi possível inicializar o WordService:", error);
        // Propaga o erro para que a UI possa lidar com isso
        throw error;
      }
    })();
    return this.isInitializedPromise;
  }

  public async fetchWordOfTheDay(): Promise<string> {
    await this.initialize(); // Garante que a lista de palavras foi carregada.
    
    // Lógica para obter a palavra do dia, similar ao term.ooo e outros jogos do gênero.
    // Isso garante uma palavra diferente a cada dia para todos os jogadores.
    const startDate = new Date(2022, 0, 2); // 2 de Janeiro de 2022, data de início do term.ooo.
    const today = new Date();
    
    // Usar UTC para evitar problemas com fuso horário e horário de verão.
    const startUTC = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
    const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

    const diffDays = Math.floor((todayUTC - startUTC) / (1000 * 60 * 60 * 24));
    
    const wordIndex = diffDays % this.solutions.length;
    const wordOfTheDay = this.solutions[wordIndex];
    
    return wordOfTheDay.toUpperCase();
  }

  public isValidWord(word: string): boolean {
    // A entrada do usuário (teclado virtual) não tem acentos, 
    // então comparamos com a lista normalizada para validação.
    return this.validGuessesNormalized.has(word.toLowerCase());
  }
}

export const wordService = new WordService();