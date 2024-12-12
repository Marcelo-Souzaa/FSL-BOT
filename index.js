const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const util = require('util');
require('dotenv').config();



// Configurando o cliente do bot
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
});

// Lista de jogadores
let listaJogadores = [];
let paginaAtual = 1;
const jogadoresPorPagina = 10; // Número de jogadores por página

// Lista de times e jogadores
let times = {
    'botafogo': { jogadores: [], overall: 0 },
    'corinthians': { jogadores: [], overall: 0 },
    'barcelona': { jogadores: [], overall: 0 },
    'real madrid': { jogadores: [], overall: 0 },
    'flamengo': { jogadores: [], overall: 0 },
    'liverpool': { jogadores: [], overall: 0 },
    'brighton': { jogadores: [], overall: 0 },
    'leicester': { jogadores: [], overall: 0 }
};

let jogadoresPorTime = 6; // Número de jogadores por time
const arquivoJogadores = './jogadores.json';
const arquivoTimes = './times.json'; // Arquivo para salvar a configuração dos times

// Token do bot
const TOKEN = process.env.DISCORD_BOT_TOKEN;

// Função para salvar os dados dos jogadores e dos times no arquivo JSON
function salvarDados() {
    // Salvar os jogadores
    const dadosJogadores = JSON.stringify(listaJogadores, null, 2); // Formatação para ficar bonito no arquivo
    fs.writeFileSync('./jogadores.json', dadosJogadores, 'utf8');

    // Salvar os times
    const dadosTimes = JSON.stringify(times, null, 2); // Formatação para ficar bonito no arquivo
    fs.writeFileSync('./times.json', dadosTimes, 'utf8');
}

// Função para carregar dados de jogadores e times
function carregarDados() {
    try {
        // Carregar os jogadores
        const jogadoresData = fs.readFileSync('./jogadores.json', 'utf8');
        listaJogadores = JSON.parse(jogadoresData);
        console.log('Jogadores carregados com sucesso!');

        // Carregar os times (se houver um arquivo separado para times, por exemplo)
        const timesData = fs.readFileSync('./times.json', 'utf8');
        times = JSON.parse(timesData);
        console.log('Times carregados com sucesso!');
    } catch (err) {
        console.error('Erro ao carregar os dados:', err);
    }
}

// Função para calcular o valor do time
function calcularValorTime(nomeTime) {
    let valorTotal = 0;

    // Verifica se o time existe
    if (times[nomeTime]) {
        // Soma o preço de cada jogador no time
        times[nomeTime].jogadores.forEach(jogador => {
            valorTotal += jogador.preco;
        });
    }

    return valorTotal;
}


// Função para calcular o overall de um time com arredondamento
function calcularOverallTime(time) {
    if (times[time].jogadores.length === 0) return 0;
    
    const totalOverall = times[time].jogadores.reduce((acc, jogador) => acc + jogador.overall, 0);
    let mediaOverall = totalOverall / times[time].jogadores.length;
    
    // Arredondamento conforme a média
    if (mediaOverall % 1 < 0.75) {
        mediaOverall = Math.floor(mediaOverall); // Arredonda para baixo
    } else {
        mediaOverall = Math.ceil(mediaOverall); // Arredonda para cima
    }
    
    return mediaOverall;
}

// Evento: Quando o bot estiver online
client.once('ready', () => {
    console.log(`Bot conectado como ${client.user.tag}`);
    carregarDados(); // Carregar dados ao iniciar
});

// Função para gerar a lista formatada de jogadores
function gerarListaFormatada() {
    const inicio = (paginaAtual - 1) * jogadoresPorPagina;
    const fim = inicio + jogadoresPorPagina;
    const jogadoresNaPagina = listaJogadores.slice(inicio, fim);

    const listaFormatada = jogadoresNaPagina
        .map((jogador, index) =>
            `\`\`\`NOME: ${jogador.nome}\nPOSIÇÃO: ${jogador.posicao}\nOVERALL: ${jogador.overall}\nPREÇO: ${jogador.preco}K FSC\`\`\``)
        .join('\n');

    // Calcular o total de páginas
    const totalPaginas = Math.ceil(listaJogadores.length / jogadoresPorPagina);

    return {
        listaFormatada,
        totalPaginas
    };
}

// Comandos do bot
client.on('messageCreate', async (message) => {
    // Ignorar mensagens de bots
    if (message.author.bot) return;

    if (message.content.toLowerCase().startsWith('!addplayer')) {
        if (!message.member.permissions.has('Administrator')) {
            message.reply('Apenas administradores podem adicionar jogadores.');
            return;
        }
    
        const args = message.content.slice(10).split('$');
        const nome = args[0]?.trim();
        const posicaoAbrev = args[1]?.trim().toUpperCase();
        const overall = parseInt(args[2]?.trim(), 10);
        const preco = parseInt(args[3]?.trim(), 10);
    
        if (!nome || !posicaoAbrev || isNaN(overall) || isNaN(preco)) {
            message.reply('Formato inválido! Use: !addplayer NOME$CATEGORIA$OVERALL$PREÇO (ex.: !addplayer GALARK$ATA$85$10)');
            return;
        }
    
        const categorias = {
            ATA: 'Atacante',
            MC: 'Meio Campista',
            ZAG: 'Zagueiro',
            GK: 'Goleiro',
        };
    
        const posicao = categorias[posicaoAbrev];
        if (!posicao) {
            message.reply('Categoria inválida! Use: ATA, MC, ZAG ou GK.');
            return;
        }
    
        // Verificar se o jogador já existe na lista
        const jogadorExistente = listaJogadores.some(jogador => jogador.nome.toLowerCase() === nome.toLowerCase());
        if (jogadorExistente) {
            message.reply(`O jogador **${nome}** já está cadastrado.`);
            return;
        }
    
        // Adicionar o novo jogador
        listaJogadores.push({ nome, posicao, overall, preco });
        salvarDados(); // Salvar os dados no arquivo jogadores.json
        message.reply(`Jogador ${nome} (${posicao}, Overall: ${overall}, Preço: ${preco}k FSC) foi adicionado à lista!`);
    }
    

    // Comando para exibir a lista atual (!lista)
if (message.content.toLowerCase() === '!lista') {
    if (!message.member.permissions.has('Administrator')) {
        message.reply('Apenas administradores podem adicionar jogadores.');
        return;
    }
    // Lê o arquivo jogadores.json para obter o número total de jogadores
    const jogadoresData = fs.readFileSync('./jogadores.json', 'utf8');
    const jogadoresJSON = JSON.parse(jogadoresData);
    const totalJogadores = jogadoresJSON.length; // Total de jogadores no arquivo

    if (listaJogadores.length === 0) {
        message.reply('Nenhum jogador foi adicionado ainda.');
    } else {
        // Ordena a lista de jogadores por Overall em ordem decrescente
        const listaOrdenada = [...listaJogadores].sort((a, b) => b.overall - a.overall);

        // Gera a lista formatada com o mesmo padrão anterior
        const jogadoresPorPagina = 10; // Número de jogadores por página
        const inicio = (paginaAtual - 1) * jogadoresPorPagina;
        const fim = inicio + jogadoresPorPagina;
        const jogadoresPagina = listaOrdenada.slice(inicio, fim);

        const listaFormatada = jogadoresPagina
            .map(jogador => `\`\`\`NOME: ${jogador.nome}\nPOSIÇÃO: ${jogador.posicao}\nOVERALL: ${jogador.overall}\nPREÇO: ${jogador.preco}K FSC\`\`\``)
            .join('\n');

        const totalPaginas = Math.ceil(listaOrdenada.length / jogadoresPorPagina);

        // Adiciona o total de jogadores ao título
        const listaMensagem = `**Lista de Jogadores (Total de Jogadores: ${totalJogadores})**\n\n${listaFormatada}\n\nPágina ${paginaAtual} de ${totalPaginas}`;

        const sentMessage = await message.reply(listaMensagem);

        await message.delete(); // Apaga a mensagem que contém o comando
    }
}

    // Comando para adicionar jogador ao time (!get Jogador$Time)
    if (message.content.toLowerCase().startsWith('!get')) {
        if (!message.member.permissions.has('Administrator')) {
            message.reply('Apenas administradores podem adicionar jogadores.');
            return;
        }
        const args = message.content.slice(4).split('$');
        const nomeJogador = args[0]?.trim();
        const time = args[1]?.trim().toLowerCase();

        if (!nomeJogador || !time || !times[time]) {
            message.reply('Formato inválido! Use: !get NOME$TIME (ex.: !get Sativa$Flamengo)');
            return;
        }

        const jogadorIndex = listaJogadores.findIndex(jogador => jogador.nome.toLowerCase() === nomeJogador.toLowerCase());
        if (jogadorIndex === -1) {
            message.reply('Jogador não encontrado na lista.');
            return;
        }

        const jogador = listaJogadores.splice(jogadorIndex, 1)[0];
        times[time].jogadores.push(jogador);

        // Recalcular o overall do time
        times[time].overall = calcularOverallTime(time);
        salvarDados(); // Salvar os dados

        message.reply(`${jogador.nome} foi adicionado ao time ${time}`);
    }

    // Comando para remover jogador do time e colocá-lo de volta na lista (!rt Jogador$Time)
    if (message.content.toLowerCase().startsWith('!rt')) {
        if (!message.member.permissions.has('Administrator')) {
            message.reply('Apenas administradores podem adicionar jogadores.');
            return;
        }
        const args = message.content.slice(4).split('$');
        const nomeJogador = args[0]?.trim();
        const time = args[1]?.trim().toLowerCase();

        if (!nomeJogador || !time || !times[time]) {
            message.reply('Formato inválido! Use: !rt NOME$TIME (ex.: !rt Sativa$Flamengo)');
            return;
        }

        const jogadorIndex = times[time].jogadores.findIndex(jogador => jogador.nome.toLowerCase() === nomeJogador.toLowerCase());
        if (jogadorIndex === -1) {
            message.reply(`${nomeJogador} não está no time ${time}.`);
            return;
        }

        // Remover o jogador do time
        const jogador = times[time].jogadores.splice(jogadorIndex, 1)[0];

        // Adicionar o jogador de volta à lista
        listaJogadores.push(jogador);

        // Recalcular o overall do time
        times[time].overall = calcularOverallTime(time);
        salvarDados(); // Salvar os dados

        message.reply(`${jogador.nome} foi removido do time ${time} e retornou à lista.`);
    }

    // Comando para remover jogador da lista e do time (!remove Jogador)
    if (message.content.toLowerCase().startsWith('!remove')) {
        const nomeJogador = message.content.slice(8).trim();

        if (!nomeJogador) {
            message.reply('Você deve especificar o nome do jogador para remover.');
            return;
        }

        // Verificar se o jogador está na lista de jogadores
        const jogadorIndexLista = listaJogadores.findIndex(jogador => jogador.nome.toLowerCase() === nomeJogador.toLowerCase());
        if (jogadorIndexLista !== -1) {
            listaJogadores.splice(jogadorIndexLista, 1); // Remover da lista
        }

        // Remover o jogador de todos os times
        for (let time in times) {
            const jogadorIndexTime = times[time].jogadores.findIndex(jogador => jogador.nome.toLowerCase() === nomeJogador.toLowerCase());
            if (jogadorIndexTime !== -1) {
                times[time].jogadores.splice(jogadorIndexTime, 1); // Remover do time
            }
        }

        salvarDados(); // Salvar os dados

        message.reply(`${nomeJogador} foi removido da lista e de todos os times.`);
    }

    // Comando para exibir todos os times e seus overais médios (!times)
    if (message.content.toLowerCase() === '!times') {
        let mensagemTimes = '**Times**\n\n\`\`\`| Time | Overall Médio | Valor do Elenco (k FSC) |\`\`\`\n';
        
        for (const [nomeTime, time] of Object.entries(times)) {
            const overallMedio = calcularOverallTime(nomeTime); // Já existente
            const valorElenco = calcularValorTime(nomeTime); // Nova função para calcular o valor total do time
            mensagemTimes += `\`\`\`
    **${nomeTime.toUpperCase()}**
    Overall Médio: ${overallMedio}
    Valor do Elenco: ${valorElenco}k FSC\`\`\`\ `;
        }
    
        message.reply(mensagemTimes);
    }
    
// Comando para ver os jogadores de um time específico (!botafogo, !flamengo, etc.)
const timesNomes = Object.keys(times);
timesNomes.forEach((time) => {
    if (message.content.toLowerCase() === `!${time}`) {
        let jogadoresTime = times[time].jogadores;

        // Ordenar jogadores pela posição (Atacante > Meio Campista > Zagueiro > Goleiro)
        const ordemPosicoes = { 'Atacante': 1, 'Meio Campista': 2, 'Zagueiro': 3, 'Goleiro': 4 };
        jogadoresTime = jogadoresTime.sort((a, b) => ordemPosicoes[a.posicao] - ordemPosicoes[b.posicao]);

        let jogadoresListados = `**${time.toUpperCase()}**\n`;

        // Mostrar até 6 jogadores
        for (let i = 0; i < jogadoresPorTime; i++) {
            if (jogadoresTime[i]) {
                jogadoresListados += `\`\`\`JOGADOR ${i + 1}: ${jogadoresTime[i].nome} | POSIÇÃO: ${jogadoresTime[i].posicao} | OVERALL: ${jogadoresTime[i].overall}\`\`\``;
            } else {
                jogadoresListados += `\`\`\`JOGADOR ${i + 1}: Não Adicionado\`\`\``;
            }
        }

        // Adicionar o overall do time
        const overallDoTime = calcularOverallTime(time);
        jogadoresListados += `\`\`\`*OVERALL DO TIME: ${overallDoTime}*\`\`\``;

        // Utilizar a nova função calcularValorTime para mostrar o valor do elenco
        const valorElenco = calcularValorTime(time); // Alterado para calcularValorTime
        jogadoresListados += `\`\`\`*VALOR DO ELENCO: ${valorElenco}k FSC*\`\`\``;

        message.reply(jogadoresListados);
    }
});


    // Comando para remover todos os jogadores da lista (!removeall)
    if (message.content.toLowerCase() === '!removeall') {
        listaJogadores = []; // Limpar a lista de jogadores
        if (!message.member.permissions.has('Administrator')) {
            message.reply('Apenas administradores podem adicionar jogadores.');
            return;
        }
        for (let time in times) {
            times[time].jogadores = []; // Limpar os jogadores de todos os times
            times[time].overall = 0; // Resetar o overall
        }
        salvarDados(); // Salvar a alteração
        message.reply('Todos os jogadores foram removidos da lista e dos times.');
    }

    // Comando para ir para a próxima página (!next)
    if (message.content.toLowerCase() === '!next') {
        const { listaFormatada, totalPaginas } = gerarListaFormatada();
        if (paginaAtual < totalPaginas) {
            paginaAtual++;
            const listaMensagem = `**Lista de Jogadores**\n\n${listaFormatada}\n\nPágina ${paginaAtual} de ${totalPaginas}`;
            message.reply(listaMensagem);
        } else {
            message.reply('Você já está na última página.');
        }
    }

    // Comando para voltar para a página anterior (!previous)
    if (message.content.toLowerCase() === '!previous') {
        if (paginaAtual > 1) {
            paginaAtual--;
            const { listaFormatada, totalPaginas } = gerarListaFormatada();
            const listaMensagem = `**Lista de Jogadores**\n\n${listaFormatada}\n\nPágina ${paginaAtual} de ${totalPaginas}`;
            message.reply(listaMensagem);
        } else {
            message.reply('Você já está na primeira página.');
        }
    }
});

client.on('messageCreate', async (message) => {
    // Ignorar mensagens de bots
    if (message.author.bot) return;

    // Comando para navegar diretamente para uma página específica (!page <número da página>)
    if (message.content.toLowerCase().startsWith('!page')) {
        const args = message.content.split(' ');
        const paginaSolicitada = parseInt(args[1]);

        if (isNaN(paginaSolicitada)) {
            message.reply('Por favor, insira um número válido. Exemplo: !page 3');
            return;
        }

        const { totalPaginas } = gerarListaFormatada(); // Obtém o total de páginas

        if (paginaSolicitada < 1 || paginaSolicitada > totalPaginas) {
            message.reply(`A página solicitada está fora do alcance. Escolha um número entre 1 e ${totalPaginas}.`);
            return;
        }

        // Atualiza a página atual para a solicitada
        paginaAtual = paginaSolicitada;

        // Gera a lista formatada para a página especificada
        const { listaFormatada } = gerarListaFormatada();
        const listaMensagem = `**Lista de Jogadores**\n\n${listaFormatada}\n\nPágina ${paginaAtual} de ${totalPaginas}`;

        // Envia a mensagem com a nova página
        message.reply(listaMensagem);
    }
});


// comando !perfil
client.on('messageCreate', async (message) => {
    // Ignorar mensagens de bots
    if (message.author.bot) return;

    // Comando para exibir o perfil de um jogador (!perfil jogador)
    if (message.content.toLowerCase().startsWith('!perfil')) {
        const nomeJogador = message.content.slice(8).trim().toLowerCase();

        if (!nomeJogador) {
            message.reply('VOCÊ DEVE INFORMAR O NOME DE UM JOGADOR PARA VER O PERFIL. EXEMPLO: !PERFIL SATIVA');
            return;
        }

        // Procurar o jogador na lista principal e nos times
        let jogador = listaJogadores.find(j => j.nome.toLowerCase() === nomeJogador);
        let time = 'AINDA NÃO ESCALADO';

        if (!jogador) {
            for (const [nomeTime, dadosTime] of Object.entries(times)) {
                jogador = dadosTime.jogadores.find(j => j.nome.toLowerCase() === nomeJogador);
                if (jogador) {
                    time = nomeTime.toUpperCase();
                    break;
                }
            }
        }

        if (!jogador) {
            message.reply('JOGADOR NÃO ENCONTRADO.');
            return;
        }

        // Exibir o perfil formatado
        const perfilJogador = `
        **PERFIL DO JOGADOR**

        \`\`\`NOME: ${jogador.nome.toUpperCase()}
TIME: ${time}
POSIÇÃO: ${jogador.posicao.toUpperCase()}
OVERALL: ${jogador.overall}
MVP's: ${jogador.mvps || 0}
GOLS: ${jogador.gols || 0}
PREÇO: ${jogador.preco}K FSC\`\`\``;

        message.reply(perfilJogador);
    }

    
    // Comando para adicionar 1 MVP ao jogador (!mvp jogador)
    if (message.content.toLowerCase().startsWith('!mvp')) {
        if (!message.member.permissions.has('Administrator')) {
            message.reply('Apenas administradores podem adicionar jogadores.');
            return;
        }
        const nomeJogador = message.content.slice(5).trim().toLowerCase();

        if (!nomeJogador) {
            message.reply('VOCÊ DEVE INFORMAR O NOME DE UM JOGADOR PARA ADICIONAR UM MVP. EXEMPLO: !MVP SATIVA');
            return;
        }

        // Procurar o jogador na lista principal e nos times
        let jogador = listaJogadores.find(j => j.nome.toLowerCase() === nomeJogador);
        if (!jogador) {
            for (const [nomeTime, dadosTime] of Object.entries(times)) {
                jogador = dadosTime.jogadores.find(j => j.nome.toLowerCase() === nomeJogador);
                if (jogador) break;
            }
        }

        if (!jogador) {
            message.reply('JOGADOR NÃO ENCONTRADO.');
            return;
        }

        // Adicionar 1 MVP
        jogador.mvps = jogador.mvps ? jogador.mvps + 1 : 1;

        salvarDados(); // Salvar os dados após a alteração

        message.reply(`1 MVP foi adicionado ao jogador ${jogador.nome}.`);
    }

    // Comando para remover MVP de um jogador (!tirarmvp numero$jogador)
    if (message.content.toLowerCase().startsWith('!tirarmvp')) {
        const args = message.content.slice(10).split('$');
        const numeroMVPs = parseInt(args[0]?.trim(), 10);
        const nomeJogador = args[1]?.trim().toLowerCase();

        if (!numeroMVPs || !nomeJogador) {
            message.reply('FORMATO INVÁLIDO! USE: !TIRARMVP NUMERO$JOGADOR. EXEMPLO: !TIRARMVP 2$SATIVA');
            return;
        }

        // Procurar o jogador na lista principal e nos times
        let jogador = listaJogadores.find(j => j.nome.toLowerCase() === nomeJogador);
        if (!jogador) {
            for (const [nomeTime, dadosTime] of Object.entries(times)) {
                jogador = dadosTime.jogadores.find(j => j.nome.toLowerCase() === nomeJogador);
                if (jogador) break;
            }
        }

        if (!jogador) {
            message.reply('JOGADOR NÃO ENCONTRADO.');
            return;
        }

        // Remover MVPs
        if (jogador.mvps) {
            if (jogador.mvps >= numeroMVPs) {
                jogador.mvps -= numeroMVPs;
                message.reply(`${numeroMVPs} MVP(s) foram removidos de ${jogador.nome}.`);
            } else {
                message.reply(`O jogador ${jogador.nome} não tem MVPs suficientes para remover.`);
            }
        } else {
            message.reply(`O jogador ${jogador.nome} não tem MVPs.`);
        }

        salvarDados(); // Salvar os dados após a alteração
    }
});

// Comando para mudar o overall de um jogador (!mudarover)
client.on('messageCreate', async (message) => {
    // ... (outros comandos)

    if (message.content.toLowerCase().startsWith('!mudarover')) {
        if (!message.member.permissions.has('Administrator')) {
            message.reply('Apenas administradores podem mudar o overall dos jogadores.');
            return;
        }

        const args = message.content.slice(10).split('$');
        const nomeJogador = args[0]?.trim().toLowerCase();
        const novoOverall = parseInt(args[1]?.trim());

        if (!nomeJogador || isNaN(novoOverall)) {
            message.reply('Formato inválido! Use: !mudarover NomeDoJogador$NovoOverall (ex: !mudarover sativa$91)');
            return;
        }

        // Função para encontrar o jogador em qualquer lugar (lista principal ou times)
        function encontrarJogador(nomeJogador) {
            // Buscar na lista principal
            const jogadorNaLista = listaJogadores.find(jogador => jogador.nome.toLowerCase() === nomeJogador.toLowerCase());

            // Buscar nos times
            if (!jogadorNaLista) {
                for (const time in times) {
                    const jogadorNoTime = times[time].jogadores.find(jogador => jogador.nome.toLowerCase() === nomeJogador.toLowerCase());
                    if (jogadorNoTime) {
                        return jogadorNoTime;
                    }
                }
            }

            return jogadorNaLista;
        }

        // Encontrar o jogador
        const jogador = encontrarJogador(nomeJogador);

        if (!jogador) {
            message.reply('Jogador não encontrado.');
            return;
        }

        // Atualizar o overall do jogador
        jogador.overall = novoOverall;

        // Salvar as alterações no arquivo JSON
        salvarDados();

        message.reply(`O overall do jogador ${nomeJogador} foi atualizado para ${novoOverall}.`);
    }


});

// comandos de ajuda
client.on('messageCreate', (message) => {
    // Ignorar mensagens de bots
    if (message.author.bot) return;

    // Comando para exibir ajuda (!help)
    if (message.content.toLowerCase() === '!help') {
        // Mensagem de ajuda com os comandos disponíveis
        const ajuda = `
        **Lista de Comandos Disponíveis:**

        **!perfil**  
        - Descrição: Mostra o perfil completo de um jogador específico.
        - Exemplo de uso: \`!perfil sativa\`

        **!times**  
        - Descrição: Exibe a lista completa de todos os times disponíveis no sistema.
        - Exemplo de uso: \`!times\`

        **!nome do time**  
        - Descrição: Mostra os jogadores pertencentes a um time específico. Substitua "nome do time" pelo nome real do time.
        - Exemplo de uso: \`!Real Madrid\`

        Caso tenha dúvidas ou problemas, entre em contato com o administrador do bot!
        `;

        // Enviar a mensagem de ajuda ao usuário
        message.reply(ajuda);
    }
});
 
//
client.on('messageCreate', (message) => {
    // Ignorar mensagens de bots
    if (message.author.bot) return;

    if (message.content.toLowerCase() === '!sativa') {
    // Mensagem de ajuda com os comandos disponíveis
        const EGG = `**O MELHOR DA LIGA**`;



    message.reply(EGG);
    }
});

//

client.on('messageCreate', (message) => {
    // Ignorar mensagens de bots
    if (message.author.bot) return;

    if (message.content.toLowerCase() === '!dark') {
    // Mensagem de ajuda com os comandos disponíveis
        const çapo = `m!p jocelyn flores - xxxtentacion`;



    message.reply(çapo);
    }
});

// Comando para mudar o preço de um jogador (!mudarpreço)
client.on('messageCreate', async (message) => {
    // ... (outros comandos)

    if (message.content.toLowerCase().startsWith('!mudarpreço')) {
        if (!message.member.permissions.has('Administrator')) {
            message.reply('Apenas administradores podem mudar o preço dos jogadores.');
            return;
        }

        const args = message.content.slice(12).split('$');
        const nomeJogador = args[0]?.trim().toLowerCase();
        const novoPreco = parseInt(args[1]?.trim());

        if (!nomeJogador || isNaN(novoPreco)) {
            message.reply('Formato inválido! Use: !mudarpreço NomeDoJogador$NovoPreço (ex: !mudarpreço sativa$50)');
            return;
        }

        // Função para encontrar o jogador em qualquer lugar (lista principal ou times)
        function encontrarJogador(nomeJogador) {
            // Buscar na lista principal
            const jogadorNaLista = listaJogadores.find(jogador => jogador.nome.toLowerCase() === nomeJogador.toLowerCase());

            // Buscar nos times
            if (!jogadorNaLista) {
                for (const time in times) {
                    const jogadorNoTime = times[time].jogadores.find(jogador => jogador.nome.toLowerCase() === nomeJogador.toLowerCase());
                    if (jogadorNoTime) {
                        return jogadorNoTime;
                    }
                }
            }

            return jogadorNaLista;
        }

        // Encontrar o jogador
        const jogador = encontrarJogador(nomeJogador);

        if (!jogador) {
            message.reply('Jogador não encontrado.');
            return;
        }

        // Atualizar o preço do jogador
        jogador.preco = novoPreco;

        // Salvar as alterações no arquivo JSON
        salvarDados();

        message.reply(`O preço do jogador ${nomeJogador} foi atualizado para ${novoPreco}K FSC.`);
    }
});

// Comando para tirar um cara ou coroa (!flipcoin)
client.on('messageCreate', (message) => {
    if (message.content.toLowerCase() === '!flipcoin') {
        // Gera aleatoriamente "Cara" ou "Coroa"
        const resultado = Math.random() < 0.5 ? 'Cara' : 'Coroa';

        // Responde com o resultado
        message.reply(`O resultado do lançamento foi: **${resultado}**!`);
    }
});

client.on('messageCreate', (message) => {
    // Ignorar mensagens de bots
    if (message.author.bot) return;

    if (message.content.toLowerCase() === '!confrontos') {
    // Mensagem de ajuda com os comandos disponíveis
        const CONFRONTO= `
        *PROXIMOS CONFRONTOS CONFIRMADOS!!*
    \`\`10/12 às 17h30\`\`
    
    Teremos...
    
    **BARCELONA X FLAMENGO PELO GRUPO A!**
    
    ---------------------------------------

    \`\`10/12 às 19:30\`\`
    
    Teremos...

    **LIVERPOOL X REAL MADRID PELO GRUPO B!!**`;


    message.reply(CONFRONTO);
    }
});

client.on('messageCreate', (message) => {
    // Ignorar mensagens de bots
    if (message.author.bot) return;

    if (message.content.toLowerCase() === '!fsl') {
    // Mensagem de ajuda com os comandos disponíveis
        const EFISEI= `*FSL CARALHO*`;


    message.reply(EFISEI);
    }
});

// proxima etapa do codigo corrigir as paginas e criar um local com o nome Paginas.json que cria e armazena cada pagina
//Resolver isso até quarta !next !previous !page (num)
const { EventEmitter } = require('events');
EventEmitter.defaultMaxListeners = 20; // Ajuste conforme necessário

// Função para encontrar um jogador e atualizar seus gols
function encontrarJogadorEAtualizar(nomeJogador, quantidade, operacao) {
    // Procurar na lista principal
    const jogadorLista = listaJogadores.find(jogador => jogador.nome.toLowerCase() === nomeJogador.toLowerCase());

    if (jogadorLista) {
        if (!jogadorLista.gols) jogadorLista.gols = 0; // Inicializa os gols caso não exista
        jogadorLista.gols = operacao === 'adicionar' 
            ? jogadorLista.gols + quantidade 
            : Math.max(jogadorLista.gols - quantidade, 0); // Gols não podem ser negativos
        salvarDados();
        return { nome: jogadorLista.nome, gols: jogadorLista.gols };
    }

    // Procurar nos times
    for (const time in times) {
        const jogadorTime = times[time].jogadores.find(jogador => jogador.nome.toLowerCase() === nomeJogador.toLowerCase());
        if (jogadorTime) {
            if (!jogadorTime.gols) jogadorTime.gols = 0; // Inicializa os gols caso não exista
            jogadorTime.gols = operacao === 'adicionar' 
                ? jogadorTime.gols + quantidade 
                : Math.max(jogadorTime.gols - quantidade, 0); // Gols não podem ser negativos
            salvarDados();
            return { nome: jogadorTime.nome, gols: jogadorTime.gols };
        }
    }

    return null; // Jogador não encontrado
}

// Comando para adicionar gols (!addgol)
client.on('messageCreate', async (message) => {
    if (message.content.toLowerCase().startsWith('!addgol')) {
        if (!message.member.permissions.has('Administrator')) {
            message.reply('Apenas administradores podem adicionar gols.');
            return;
        }

        const args = message.content.slice(8).split('$');
        const nomeJogador = args[0]?.trim().toLowerCase();
        const quantidade = parseInt(args[1]?.trim());

        if (!nomeJogador || isNaN(quantidade) || quantidade <= 0) {
            message.reply('Formato inválido! Use: !addgol NomeDoJogador$Quantidade (ex: !addgol Sativa$5)');
            return;
        }

        const resultado = encontrarJogadorEAtualizar(nomeJogador, quantidade, 'adicionar');

        if (resultado) {
            message.reply(`Foram adicionados ${quantidade} gols ao jogador ${resultado.nome}. Total de gols: ${resultado.gols}.`);
        } else {
            message.reply('Jogador não encontrado.');
        }
    }
});

// Comando para remover gols (!tirargol)
client.on('messageCreate', async (message) => {
    if (message.content.toLowerCase().startsWith('!tirargol')) {
        if (!message.member.permissions.has('Administrator')) {
            message.reply('Apenas administradores podem remover gols.');
            return;
        }

        const args = message.content.slice(10).split('$');
        const nomeJogador = args[0]?.trim().toLowerCase();
        const quantidade = parseInt(args[1]?.trim());

        if (!nomeJogador || isNaN(quantidade) || quantidade <= 0) {
            message.reply('Formato inválido! Use: !tirargol NomeDoJogador$Quantidade (ex: !tirargol Sativa$3)');
            return;
        }

        const resultado = encontrarJogadorEAtualizar(nomeJogador, quantidade, 'remover');

        if (resultado) {
            message.reply(`Foram removidos ${quantidade} gols do jogador ${resultado.nome}. Total de gols: ${resultado.gols}.`);
        } else {
            message.reply('Jogador não encontrado.');
        }
    }
});


const VARS_FILE = './vars.json';
const TREINADOR_ROLE_ID = '1314016732704145459'; // Define o ID do cargo aqui
const ORGANIZADOR_ROLE_ID = '1314014961311158356'; // Define o ID do cargo aqui
const JOGOS_CATEGORY_ID = '1314034200818483301'; // Define o ID da categoria aqui

function lerVars() {
    try {
        const data = fs.readFileSync(VARS_FILE);
        return JSON.parse(data);
    } catch (error) {
        console.error("Erro ao ler vars.json:", error);
        return { treinadores: {} };
    }
}

function salvarVars(data) {
    try {
        fs.writeFileSync(VARS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Erro ao salvar vars.json:", error);
    }
}

client.on('messageCreate', async message => {
    // Comando !var
    if (message.content.startsWith('!var')) {
        const varsData = lerVars();
        const treinadorId = message.author.id;
        const treinador = varsData.treinadores[treinadorId];

        // Verificação de permissão CORRIGIDA e OTIMIZADA:
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && !message.member.roles.cache.has(TREINADOR_ROLE_ID)) {
            return message.reply('Você não tem permissão para usar este comando.');
        }

        if (!treinador || treinador.vars <= 0) {
            return message.reply('Você não tem vars disponíveis.');
        }

        const jogosCategory = message.guild.channels.cache.get(JOGOS_CATEGORY_ID);
        if (!jogosCategory || jogosCategory.type !== 4) {
            return message.reply('A categoria "Jogos" não foi encontrada ou não é uma categoria válida.');
        }

        try {
            const newChannel = await message.guild.channels.create({
                name: `ticket-${message.author.username}`,
                parent: jogosCategory,
                type: 0,
                permissionOverwrites: [
                    {
                        id: message.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: message.author.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
                    },
                    {
                       id: message.guild.roles.cache.find(role => role.permissions.has(PermissionsBitField.Flags.Administrator)),
                      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
                    }
                ],
            });
            await newChannel.send(`<@&${ORGANIZADOR_ROLE_ID}> Ticket criado por <@${message.author.id}>.`);
            treinador.vars--;
            salvarVars(varsData);
            message.reply(`Seu ticket foi criado em ${newChannel}. Você agora tem ${treinador.vars} vars.`);
        } catch (error) {
            console.error('Erro ao criar o canal:', error);
            message.reply('Ocorreu um erro ao criar o ticket.');
        }
    }

    // Comando !addvar (mesmo código)
    if (message.content.startsWith('!addvar')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('Apenas administradores podem usar este comando.');
        }

        const args = message.content.split(' ');
        if (args.length !== 3) {
            return message.reply('Use: !addvar <@usuário> <quantidade>');
        }

        const targetUser = message.mentions.users.first();
        const quantidade = parseInt(args[2]);

        if (!targetUser || isNaN(quantidade) || quantidade < 0) {
            return message.reply('Usuário ou quantidade inválidos.');
        }

        const varsData = lerVars();
        if (!varsData.treinadores[targetUser.id]) {
            varsData.treinadores[targetUser.id] = { nome: targetUser.username, vars: 0 };
        }
        varsData.treinadores[targetUser.id].vars += quantidade;
        salvarVars(varsData);

        message.reply(`Adicionados ${quantidade} vars para ${targetUser.username}.`);
    }

    // Comando !encerrar (mesmo código com verificação corrigida)
     if (message.content.startsWith('!encerrar')) {
        if (message.channel.name.startsWith('ticket-')) {
              if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && !message.member.roles.cache.has(TREINADOR_ROLE_ID)) {
            return message.reply('Você não tem permissão para usar este comando aqui.');
        }
            try {
                await message.channel.delete();
            } catch (error) {
                console.error('Erro ao excluir o canal:', error);
                message.reply('Ocorreu um erro ao encerrar o ticket.');
            }
        } else {
            message.reply('Este comando só pode ser usado em um canal de ticket.');
        }
    }

    // Comando !meusvars (mesmo código)
    if (message.content.startsWith('!meusvars')) {
        const varsData = lerVars();
        const treinadorId = message.author.id;
        const treinador = varsData.treinadores[treinadorId];

        if (!treinador) {
            return message.reply('Você ainda não possui vars registrados.');
        }

        message.reply(`Você tem ${treinador.vars} vars.`);
    }
});

// Comando !roll
client.on('messageCreate', async (message) => {
    // Ignorar mensagens de bots
    if (message.author.bot) return;

    if (message.content.toLowerCase().startsWith('!roll')) {
        const args = message.content.slice(6).trim(); // Remove o prefixo '!roll' e obtém o resto do texto
        const regex = /^(\d+)d(\d+)$/; // Expressão regular para validar o formato (ex: 2d5)
        const match = args.match(regex);

        if (!match) {
            message.reply('Formato inválido! Use: !roll XdY, onde X é o número de dados e Y é o número de lados. Exemplo: !roll 2d6');
            return;
        }

        const numDados = parseInt(match[1], 10); // Quantidade de dados
        const numLados = parseInt(match[2], 10); // Quantidade de lados em cada dado

        if (numDados < 1 || numLados < 1) {
            message.reply('O número de dados e o número de lados devem ser maiores que 0.');
            return;
        }

        // Gerar os resultados aleatórios
        const resultados = [];
        for (let i = 0; i < numDados; i++) {
            resultados.push(Math.floor(Math.random() * numLados) + 1);
        }

        // Responder com os resultados
        const somaTotal = resultados.reduce((acc, num) => acc + num, 0);
        message.reply(`Você rolou ${numDados} dado(s) de ${numLados} lados.\nResultados: ${resultados.join(', ')}\nSoma total: ${somaTotal}`);
    }
});


// Login do bot com o token
client.login(TOKEN);

