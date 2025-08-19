const normalizeString = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

class WordService {
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
        // Usando um CDN para maior confiabilidade
        const response = await fetch('https://cdn.jsdelivr.net/gh/fserb/pt-br@master/palavras');
        if (!response.ok) {
            throw new Error(`Erro ao buscar a lista de palavras: ${response.statusText}`);
        }
        const text = await response.text();
        const words = text.split('\n');
        
        words
          .map(word => word.trim().toLowerCase())
          .filter(word => word.length === 5)
          .forEach(word => {
            this.validGuessesWithAccents.add(word);
            this.validGuessesNormalized.add(normalizeString(word));
          });
        
        console.log(`Serviço inicializado com ${this.validGuessesWithAccents.size} palavras válidas.`);
      } catch (error) {
        console.error("Não foi possível inicializar o WordService:", error);
        // Propaga o erro para que a UI possa lidar com isso
        throw error;
      }
    })();
    return this.isInitializedPromise;
  }

  public async fetchWordOfTheDay(): Promise<string> {
    // Em uma aplicação real, esta seria uma chamada de API para um backend/CMS.
    // Ex: const response = await fetch('/api/palavra-do-dia');
    //     const { word } = await response.json();
    //     return word.toUpperCase();
    
    // Simula a chamada de API com um pequeno atraso.
    await new Promise(resolve => setTimeout(resolve, 150));
    // A palavra pode ser definida aqui, simulando a resposta do CMS.
    return 'HÁBIL'.toUpperCase();
  }

  public isValidWord(word: string): boolean {
    // A entrada do usuário (teclado virtual) não tem acentos, 
    // então comparamos com a lista normalizada.
    return this.validGuessesNormalized.has(word.toLowerCase());
  }
}

export const wordService = new WordService();